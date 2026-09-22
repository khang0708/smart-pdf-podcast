import os
import sys
import uuid
import threading
import shutil
from typing import Dict, Any, Optional

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .pipeline import PodcastPipeline
from .tts_synthesizer import SPEAKERS

app = FastAPI(
    title="Aurora Podcast Engine API",
    description="Local Worker chuyển đổi PDF sang Audio Podcast hoàn chỉnh",
    version="1.0.0"
)

# Kích hoạt CORS cho Frontend (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_PODCASTS_DIR = os.path.join(BASE_DIR, "public", "podcasts")
UPLOAD_TMP_DIR = os.path.join(BASE_DIR, "podcast_engine", ".cache", "uploads")
os.makedirs(PUBLIC_PODCASTS_DIR, exist_ok=True)
os.makedirs(UPLOAD_TMP_DIR, exist_ok=True)

# Mount thư mục podcast tĩnh để web client có thể phát âm thanh trực tiếp
app.mount("/podcasts", StaticFiles(directory=PUBLIC_PODCASTS_DIR), name="podcasts")

# Quản lý trạng thái các Job đang xử lý trong RAM
JOB_REGISTRY: Dict[str, Dict[str, Any]] = {}

class ConvertRequest(BaseModel):
    pdf_path: Optional[str] = None
    book_id: Optional[str] = None
    speaker: str = "NF"
    enable_bgm: bool = True

@app.get("/api/health")
def get_health():
    return {
        "status": "healthy",
        "service": "Aurora Podcast Worker",
        "available_speakers": list(SPEAKERS.keys()),
        "output_dir": PUBLIC_PODCASTS_DIR
    }

@app.get("/api/speakers")
def get_speakers():
    """
    Trả về danh sách 5 giọng đọc có sẵn.
    """
    return [
        {
            "id": spk_id,
            "name": info["name"],
            "gender": info["gender"],
            "region": info["region"],
            "is_default": spk_id == "NF"
        }
        for spk_id, info in SPEAKERS.items()
    ]

def _run_pipeline_job(job_id: str, pdf_path: str, book_id: str, speaker: str, enable_bgm: bool, custom_title: Optional[str] = None):
    try:
        JOB_REGISTRY[job_id]["status"] = "processing"

        def on_progress(event):
            JOB_REGISTRY[job_id]["percent"] = event["percent"]
            JOB_REGISTRY[job_id]["stage"] = event["stage"]
            JOB_REGISTRY[job_id]["message"] = event["message"]
            JOB_REGISTRY[job_id]["detail"] = event.get("detail", {})

        pipeline = PodcastPipeline(
            output_dir=PUBLIC_PODCASTS_DIR,
            speaker=speaker,
            enable_bgm=enable_bgm
        )

        manifest = pipeline.run(
            pdf_path=pdf_path,
            book_id=book_id,
            custom_title=custom_title,
            progress_callback=on_progress
        )

        JOB_REGISTRY[job_id]["status"] = "completed"
        JOB_REGISTRY[job_id]["percent"] = 100
        JOB_REGISTRY[job_id]["manifest"] = manifest
        JOB_REGISTRY[job_id]["message"] = "Đã hoàn thành sản xuất Podcast!"

    except Exception as e:
        import traceback
        traceback.print_exc()
        JOB_REGISTRY[job_id]["status"] = "failed"
        JOB_REGISTRY[job_id]["error"] = str(e)
        JOB_REGISTRY[job_id]["message"] = f"Lỗi xử lý: {e}"

@app.post("/api/convert")
async def start_conversion(
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(None),
    pdf_path: Optional[str] = Form(None),
    book_id: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    speaker: str = Form("NF"),
    enable_bgm: bool = Form(True)
):
    """
    Tiếp nhận file PDF (upload hoặc đường dẫn cục bộ) và khởi tạo tiến trình sinh podcast.
    """
    target_pdf_path = ""
    target_book_id = book_id or "podcast_" + uuid.uuid4().hex[:8]
    derived_title = title

    if file:
        file_ext = os.path.splitext(file.filename)[1] or ".pdf"
        target_pdf_path = os.path.join(UPLOAD_TMP_DIR, f"{target_book_id}{file_ext}")
        with open(target_pdf_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        if not derived_title and file.filename:
            derived_title = os.path.splitext(file.filename)[0].replace("-", " ").replace("_", " ")
    elif pdf_path and os.path.exists(pdf_path):
        target_pdf_path = pdf_path
    elif target_book_id:
        # Kiểm tra file đã upload trước đó trong cache
        cached_pdf = os.path.join(UPLOAD_TMP_DIR, f"{target_book_id}.pdf")
        sample_path = os.path.join(BASE_DIR, "public", "sample-book.pdf")
        if os.path.exists(cached_pdf):
            target_pdf_path = cached_pdf
        elif os.path.exists(sample_path):
            target_pdf_path = sample_path
        else:
            raise HTTPException(status_code=400, detail="Vui lòng tải lên file PDF của cuốn sách này.")
    else:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp file PDF hợp lệ.")

    job_id = "job_" + uuid.uuid4().hex[:10]
    JOB_REGISTRY[job_id] = {
        "job_id": job_id,
        "book_id": target_book_id,
        "title": derived_title or target_book_id,
        "status": "pending",
        "percent": 0,
        "stage": "INITIALIZING",
        "message": "Đang khởi tạo pipeline...",
        "speaker": speaker,
        "manifest": None,
        "error": None
    }

    # Chạy ngầm qua background thread để không block API
    thread = threading.Thread(
        target=_run_pipeline_job,
        args=(job_id, target_pdf_path, target_book_id, speaker, enable_bgm, derived_title)
    )
    thread.daemon = True
    thread.start()

    return {
        "job_id": job_id,
        "book_id": target_book_id,
        "title": derived_title,
        "status": "started",
        "message": "Tiến trình chuyển đổi đã bắt đầu chạy ngầm."
    }

@app.get("/api/status/{job_id}")
def get_job_status(job_id: str):
    """
    Truy vấn tiến độ chuyển đổi theo thời gian thực (Polling).
    """
    job = JOB_REGISTRY.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy job_id này.")
    return job

@app.get("/api/podcasts/{book_id}")
def get_podcast_manifest(book_id: str):
    """
    Lấy thông tin danh sách các tập Podcast đã tạo cho cuốn sách.
    """
    import json
    manifest_file = os.path.join(PUBLIC_PODCASTS_DIR, book_id, "podcast_manifest.json")
    if not os.path.exists(manifest_file):
        raise HTTPException(status_code=404, detail=f"Chưa có bản podcast cho sách {book_id}")
    with open(manifest_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data

@app.get("/api/podcasts")
def list_all_podcasts():
    """
    Liệt kê tất cả các sách đã có podcast trong hệ thống.
    """
    import json
    results = []
    if os.path.exists(PUBLIC_PODCASTS_DIR):
        for entry in os.listdir(PUBLIC_PODCASTS_DIR):
            manifest_file = os.path.join(PUBLIC_PODCASTS_DIR, entry, "podcast_manifest.json")
            if os.path.exists(manifest_file):
                try:
                    with open(manifest_file, "r", encoding="utf-8") as f:
                        results.append(json.load(f))
                except Exception:
                    pass
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8765)
