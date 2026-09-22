import os
import sys
import subprocess

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

# 1. Tự động tìm hoặc clone mã nguồn v-tts nếu chưa có
candidate_dirs = [
    os.path.join(CURRENT_DIR, "podcast_engine", "v_tts_src"),
    os.path.join(os.path.dirname(CURRENT_DIR), "podcast_engine", "v_tts_src")
]
v_tts_dir = None
for d in candidate_dirs:
    if os.path.exists(d):
        v_tts_dir = d
        break

if not v_tts_dir:
    v_tts_dir = candidate_dirs[0]
    try:
        print("[HF Space] Đang clone mã nguồn v-tts core...")
        subprocess.run(
            ["git", "clone", "--depth", "1", "https://github.com/tronghieuit/v-tts.git", v_tts_dir],
            check=True
        )
        print("[HF Space] Clone v-tts hoàn tất.")
    except Exception as e:
        print(f"[HF Space] Cảnh báo khi clone v-tts: {e}")

if v_tts_dir and os.path.exists(v_tts_dir) and v_tts_dir not in sys.path:
    sys.path.insert(0, v_tts_dir)

# 2. Khởi tạo tài nguyên âm thanh mẫu (Intro, BGM, Transition)
try:
    from podcast_engine.generate_sample_assets import (
        generate_intro_jingle,
        generate_chapter_transition,
        generate_ambient_bgm,
        ASSETS_DIR
    )
    if not os.path.exists(os.path.join(ASSETS_DIR, "ambient_bgm.wav")):
        print("[HF Space] Đang tạo âm thanh mẫu...")
        generate_intro_jingle()
        generate_chapter_transition()
        generate_ambient_bgm()
except Exception as ex:
    print(f"[HF Space] Lỗi khởi tạo tài nguyên âm thanh: {ex}")

# 3. Nạp ứng dụng FastAPI
from podcast_engine.server import app as fastapi_app
from podcast_engine.tts_synthesizer import SPEAKERS, TTSSynthesizer

# 4. Giao diện Gradio tương tác trực tiếp trên Space
import gradio as gr

syn = TTSSynthesizer()

def test_tts_demo(text: str, speaker_key: str):
    if not text.strip():
        return None, "Vui lòng nhập văn bản tiếng Việt."
    try:
        wav_path = syn.synthesize_chunk(text, speaker=speaker_key)
        return wav_path, f"Đã sinh giọng đọc với {SPEAKERS.get(speaker_key, {}).get('name')}"
    except Exception as e:
        return None, f"Lỗi: {e}"

with gr.Blocks(title="Aurora Smart Podcast Studio") as demo:
    gr.Markdown("# 🎙️ Aurora Smart Podcast Worker")
    gr.Markdown(
        "Backend API hỗ trợ chuyển đổi tài liệu PDF sang Audio Podcast hoàn chỉnh bằng **Valtec-TTS**.<br>"
        "Cung cấp REST API cho ứng dụng đọc sách trên **Vercel** tại các endpoint: `/api/health`, `/api/speakers`, `/api/convert`, `/api/podcasts`."
    )

    with gr.Tab("Thử nghiệm Giọng đọc (Demo)"):
        with gr.Row():
            with gr.Column():
                input_text = gr.Textbox(
                    label="Văn bản tiếng Việt cần đọc thử",
                    placeholder="Xin chào các bạn, đây là hệ thống chuyển đổi sách thành audio podcast tiếng Việt.",
                    lines=3,
                    value="Chào mừng bạn đến với Aurora Podcast Reader. Nơi sách nói được hồi sinh bằng giọng đọc tự nhiên."
                )
                speaker_dropdown = gr.Dropdown(
                    label="Chọn Giọng đọc Valtec-TTS",
                    choices=[(f"{info['name']} ({k})", k) for k, info in SPEAKERS.items()],
                    value="NF"
                )
                btn_speak = gr.Button("Sinh giọng đọc mẫu", variant="primary")

            with gr.Column():
                audio_out = gr.Audio(label="File âm thanh xuất ra", type="filepath")
                status_out = gr.Textbox(label="Trạng thái", lines=1)

        btn_speak.click(
            fn=test_tts_demo,
            inputs=[input_text, speaker_dropdown],
            outputs=[audio_out, status_out]
        )

    with gr.Tab("Thông tin API"):
        gr.Markdown("""
        ### Hướng dẫn kết nối với Web App trên Vercel:
        1. Sao chép Direct URL của Space này (dạng: `https://YOUR_USER-SPACE_NAME.hf.space`)
        2. Thêm vào Vercel Environment Variables:
           - **Key**: `VITE_PODCAST_API_URL`
           - **Value**: `https://YOUR_USER-SPACE_NAME.hf.space`
        3. Xem tài liệu Swagger UI chi tiết tại: [/docs](/docs)
        """)

# Gắn giao diện Gradio vào ứng dụng FastAPI
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
