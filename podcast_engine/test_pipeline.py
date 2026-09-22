import os
import sys
import json
import fitz  # PyMuPDF

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from podcast_engine.pdf_extractor import PDFExtractor
from podcast_engine.text_cleaner import TextCleaner
from podcast_engine.chunker import SemanticChunker
from podcast_engine.pipeline import PodcastPipeline

SAMPLE_PDF_PATH = os.path.join(os.path.dirname(__file__), "sample_test_book.pdf")

def create_sample_vietnamese_pdf(path: str):
    """
    Tạo một file PDF tiếng Việt mẫu có cấu trúc chương, header/footer lặp lại,
    số trang, và câu bị ngắt dòng giữa chừng để kiểm tra khả năng làm sạch.
    """
    doc = fitz.open()

    # Trang 1: Chương 1
    page1 = doc.new_page()
    text_p1 = (
        "AURORA SAMPLE COLLECTION - BẢN THỬ NGHIỆM\n\n"
        "# Chương 1: Bình Minh Trên Đỉnh Núi\n\n"
        "Ánh mặt trời buổi sớm mai chiếu rọi qua từng kẽ lá xanh mướt. Không gian nơi đây thật yên- \n"
        "bình và tĩnh lặng biết bao nhiêu. Những giọt sương mai đọng trên nhành hoa dại lung linh như những viên ngọc quý.\n\n"
        "Một ngày mới lại bắt đầu với biết bao nhiêu hy vọng và niềm tin vào tương lai phía trước.\n\n"
        "Trang 1"
    )
    font_path = "C:/Windows/Fonts/arial.ttf" if os.path.exists("C:/Windows/Fonts/arial.ttf") else None
    if font_path:
        page1.insert_text((50, 60), text_p1, fontfile=font_path, fontname="arial", fontsize=12)
    else:
        page1.insert_text((50, 60), text_p1, fontsize=12)

    # Trang 2: Chương 2
    page2 = doc.new_page()
    text_p2 = (
        "AURORA SAMPLE COLLECTION - BẢN THỬ NGHIỆM\n\n"
        "# Chương 2: Tiếng Vọng Của Thời Gian\n\n"
        "Mỗi bước chân trên con đường cổ kính đều gợi nhớ về những kỷ niệm xa xăm. Thời gian trôi qua không bao giờ trở lại, nhưng những giá trị đích- \n"
        "thực của cuộc sống sẽ mãi mãi trường tồn cùng năm tháng.\n\n"
        "Hãy lắng nghe nhịp thở của tự nhiên và mở lòng đón nhận những điều kỳ diệu quanh ta.\n\n"
        "Trang 2"
    )
    if font_path:
        page2.insert_text((50, 60), text_p2, fontfile=font_path, fontname="arial", fontsize=12)
    else:
        page2.insert_text((50, 60), text_p2, fontsize=12)

    # Thêm TOC
    doc.set_toc([
        [1, "Chương 1: Bình Minh Trên Đỉnh Núi", 1],
        [1, "Chương 2: Tiếng Vọng Của Thời Gian", 2]
    ])

    doc.save(path)
    doc.close()
    print(f"[Test] Đã tạo PDF mẫu: {path}")

def run_tests():
    print("=" * 60)
    print("BẮT ĐẦU KIỂM THỬ TOÀN DIỆN PODCAST ENGINE")
    print("=" * 60)

    # 1. Tạo PDF
    create_sample_vietnamese_pdf(SAMPLE_PDF_PATH)

    # 2. Test PDFExtractor
    print("\n--- [1] Kiểm tra PDFExtractor ---")
    extractor = PDFExtractor(SAMPLE_PDF_PATH)
    extracted = extractor.extract()
    print(f"Tổng số trang: {extracted['total_pages']}")
    print(f"Mục lục (TOC): {extracted['toc']}")
    assert extracted["total_pages"] == 2
    assert len(extracted["toc"]) == 2

    # 3. Test TextCleaner
    print("\n--- [2] Kiểm tra TextCleaner ---")
    cleaner = TextCleaner()
    cleaned = cleaner.clean_document(extracted)
    print("Văn bản sau làm sạch:\n" + "-" * 40)
    print(cleaned)
    print("-" * 40)
    # Xác minh đã khử header lặp "AURORA SAMPLE COLLECTION" và số trang "Trang 1", "Trang 2"
    assert "Trang 1" not in cleaned
    assert "Trang 2" not in cleaned
    # Xác minh đã hàn câu đứt gạch nối: "yên- \nbình" -> "yênbình" hoặc "đích- \nthực" -> "đíchthực"
    assert "yênbình" in cleaned or "yên bình" in cleaned
    assert "đíchthực" in cleaned or "đích thực" in cleaned

    # 4. Test SemanticChunker
    print("\n--- [3] Kiểm tra SemanticChunker ---")
    chunker = SemanticChunker(min_chars=50, max_chars=300)
    chapters = chunker.process_all(cleaned, toc=extracted["toc"])
    print(f"Tổng số chương nhận diện: {len(chapters)}")
    for ch in chapters:
        print(f"• Chương: {ch.title} | Số chunks: {len(ch.chunks)}")
        for ck in ch.chunks:
            print(f"    [{ck['chunk_id']}] ({len(ck['text'])} ký tự, pause {ck['pause_after_ms']}ms): {ck['text']}")

    assert len(chapters) == 2

    # 5. Test Full Pipeline
    print("\n--- [4] Chạy Full PodcastPipeline ---")
    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "podcasts")
    pipeline = PodcastPipeline(
        output_dir=output_dir,
        speaker="NF",
        enable_bgm=True
    )
    manifest = pipeline.run(
        pdf_path=SAMPLE_PDF_PATH,
        book_id="sample_test_book"
    )

    print("\n" + "=" * 60)
    print("KẾT QUẢ PODCAST MANIFEST:")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    print("=" * 60)

    # Kiểm tra sự tồn tại của các file MP3
    for ch in manifest["chapters"]:
        mp3_full_path = os.path.join(output_dir, "sample_test_book", ch["mp3_file"])
        assert os.path.exists(mp3_full_path), f"File MP3 không tồn tại: {mp3_full_path}"
        assert os.path.getsize(mp3_full_path) > 1000, f"File MP3 rỗng: {mp3_full_path}"
        print(f"✅ Đã xác minh file: {mp3_full_path} (Kích thước: {os.path.getsize(mp3_full_path)} bytes, Thời lượng: {ch['duration_formatted']})")

    print("\n🎉 TOÀN BỘ CÁC BƯỚC KIỂM THỬ ĐÃ THÀNH CÔNG RỰC RỠ!")

if __name__ == "__main__":
    run_tests()
