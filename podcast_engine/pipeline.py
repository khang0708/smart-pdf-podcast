import os
import json
import time
from typing import Dict, Any, Optional, Callable

from .pdf_extractor import PDFExtractor
from .text_cleaner import TextCleaner
from .chunker import SemanticChunker
from .tts_synthesizer import TTSSynthesizer, SPEAKERS
from .audio_assembler import AudioAssembler

class PodcastPipeline:
    """
    Điều phối toàn bộ quy trình chuyển đổi Sách PDF thành Audio Podcast:
    PDF -> Extractor -> Text Cleaner -> Semantic Chunker -> Valtec-TTS -> Audio Assembler -> MP3 & Manifest
    """

    def __init__(
        self,
        output_dir: Optional[str] = None,
        speaker: str = "NF",
        enable_bgm: bool = True,
        bgm_path: Optional[str] = None
    ):
        self.output_dir = output_dir or os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "podcasts")
        self.speaker = speaker if speaker in SPEAKERS else "NF"
        self.enable_bgm = enable_bgm
        self.bgm_path = bgm_path

        self.cleaner = TextCleaner()
        self.chunker = SemanticChunker(min_chars=120, max_chars=350)
        self.synthesizer = TTSSynthesizer(default_speaker=self.speaker)
        self.assembler = AudioAssembler(bgm_path=self.bgm_path)

    def run(
        self,
        pdf_path: str,
        book_id: Optional[str] = None,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        """
        Thực hiện toàn bộ quy trình từ PDF đến các tập Podcast MP3 hoàn chỉnh.
        """
        start_time = time.time()
        book_key = book_id or os.path.splitext(os.path.basename(pdf_path))[0]
        # Thư mục lưu sản phẩm podcast
        book_output_dir = os.path.join(self.output_dir, book_key)
        os.makedirs(book_output_dir, exist_ok=True)

        def notify(stage: str, percent: int, message: str, detail: Optional[Dict[str, Any]] = None):
            print(f"[{percent}%] {stage}: {message}")
            if progress_callback:
                progress_callback({
                    "stage": stage,
                    "percent": percent,
                    "message": message,
                    "detail": detail or {}
                })

        # --- BƯỚC 1: TRÍCH XUẤT PDF & MỤC LỤC ---
        notify("EXTRACTING", 10, f"Đang trích xuất nội dung văn bản từ {os.path.basename(pdf_path)}...")
        extractor = PDFExtractor(pdf_path)
        extracted_doc = extractor.extract()
        title = extracted_doc.get("title") or book_key
        author = extracted_doc.get("author") or "Ẩn danh"
        toc = extracted_doc.get("toc", [])

        # --- BƯỚC 2: LÀM SẠCH VÀ HÀN GẮN CÂU ---
        notify("CLEANING", 25, "Đang khử header/footer, lọc số trang và hàn câu bị đứt đoạn...")
        cleaned_markdown = self.cleaner.clean_document(extracted_doc)

        # Lưu bản text đã làm sạch để kiểm tra/đối chiếu
        cleaned_txt_path = os.path.join(book_output_dir, "cleaned_content.md")
        with open(cleaned_txt_path, "w", encoding="utf-8") as f:
            f.write(cleaned_markdown)

        # --- BƯỚC 3: PHÂN CHIA CHƯƠNG & CHUNK NGẮT CÂU ---
        notify("CHUNKING", 40, "Đang phân tích cấu trúc chương và chia nhỏ câu tối ưu cho Valtec-TTS...")
        chapters = self.chunker.process_all(cleaned_markdown, toc=toc)
        total_chapters = len(chapters)
        total_chunks = sum(len(c.chunks) for c in chapters)

        notify("CHUNKING", 45, f"Đã chia thành {total_chapters} chương với tổng cộng {total_chunks} phân đoạn âm thanh.")

        # --- BƯỚC 4 & 5: SINH GIỌNG ĐỌC VÀ GHÉP TẬP PODCAST ---
        chapter_manifest_list = []
        overall_chunk_index = 0

        for c_idx, chap in enumerate(chapters):
            chap_num = c_idx + 1
            chap_name = chap.title or f"Chương {chap_num}"
            notify(
                "SYNTHESIZING",
                int(45 + (c_idx / max(1, total_chapters)) * 40),
                f"Đang sinh giọng đọc cho {chap_name} ({len(chap.chunks)} đoạn)...",
                {"chapter": chap_name, "chapter_index": chap_num, "total_chapters": total_chapters}
            )

            # 4. Sinh âm thanh từng chunk qua Valtec-TTS
            def chunk_progress(curr, total, text_preview):
                pass  # Có thể gửi log chi tiết nếu cần

            synthesized_chunks = self.synthesizer.synthesize_chapter_chunks(
                chap.chunks,
                speaker=self.speaker,
                progress_callback=chunk_progress
            )

            # 5. Ghép nối thành file MP3 của chương
            output_mp3 = os.path.join(book_output_dir, f"chapter_{chap_num:02d}.mp3")
            chap_result = self.assembler.assemble_chapter(
                chapter_title=chap_name,
                chapter_index=chap_num,
                chunk_wav_paths=synthesized_chunks,
                output_mp3_path=output_mp3,
                enable_bgm=self.enable_bgm
            )

            # URL phục vụ web player
            web_audio_url = f"/podcasts/{book_key}/chapter_{chap_num:02d}.mp3"
            chapter_manifest_list.append({
                "chapter_index": chap_num,
                "title": chap_name,
                "audio_url": web_audio_url,
                "mp3_file": os.path.basename(output_mp3),
                "duration_seconds": chap_result["duration_seconds"],
                "duration_formatted": chap_result["duration_formatted"],
                "total_chunks": len(chap.chunks)
            })

        # --- TỔNG KẾT & XUẤT MANIFEST JSON ---
        total_duration_sec = sum(c["duration_seconds"] for c in chapter_manifest_list)
        manifest_data = {
            "book_id": book_key,
            "title": title,
            "author": author,
            "speaker": self.speaker,
            "speaker_info": SPEAKERS.get(self.speaker, {}),
            "total_chapters": total_chapters,
            "total_duration_seconds": round(total_duration_sec, 2),
            "total_duration_formatted": self.assembler.format_duration(total_duration_sec),
            "chapters": chapter_manifest_list,
            "created_at": int(time.time()),
            "processing_time_sec": round(time.time() - start_time, 2)
        }

        manifest_path = os.path.join(book_output_dir, "podcast_manifest.json")
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f, ensure_ascii=False, indent=2)

        notify("COMPLETED", 100, f"Đã hoàn thành Podcast! Tổng thời lượng: {manifest_data['total_duration_formatted']}", manifest_data)

        return manifest_data
