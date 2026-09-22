import os
import sys
import argparse

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
from .pipeline import PodcastPipeline
from .tts_synthesizer import SPEAKERS

def main():
    parser = argparse.ArgumentParser(
        description="Aurora Podcast Engine: Chuyển đổi file PDF thành Podcast hoàn chỉnh với giọng đọc tiếng Việt Valtec-TTS và nhạc nền."
    )
    parser.add_argument("pdf_path", help="Đường dẫn tới file PDF cần chuyển đổi")
    parser.add_argument(
        "--speaker",
        choices=list(SPEAKERS.keys()),
        default="NF",
        help="Chọn giọng đọc: NF (Nữ Bắc), SF (Nữ Nam), NM1 (Nam Bắc 1), SM (Nam Nam), NM2 (Nam Bắc 2) [Mặc định: NF]"
    )
    parser.add_argument(
        "--bgm",
        default=None,
        help="Đường dẫn file nhạc nền tùy chỉnh (MP3/WAV). Bỏ trống để dùng bản ambient mẫu có sẵn."
    )
    parser.add_argument(
        "--no-bgm",
        action="store_true",
        help="Tắt hoàn toàn nhạc nền, chỉ giữ lại giọng đọc và âm hiệu chuyển chương."
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Thư mục xuất file MP3 và manifest (mặc định: public/podcasts/)"
    )
    parser.add_argument(
        "--book-id",
        default=None,
        help="Mã nhận diện sách (tùy chọn). Nếu không nhập, sẽ lấy theo tên file PDF."
    )

    args = parser.parse_args()

    if not os.path.exists(args.pdf_path):
        print(f"Lỗi: Không tìm thấy file PDF tại: {args.pdf_path}")
        sys.exit(1)

    print("=" * 65)
    print("AURORA SMART PDF-TO-PODCAST ENGINE")
    print(f"File PDF   : {args.pdf_path}")
    print(f"Giọng đọc  : {args.speaker} ({SPEAKERS[args.speaker]['name']})")
    print(f"Nhạc nền   : {'Tắt' if args.no_bgm else ('Tùy chỉnh' if args.bgm else 'Mẫu ambient lo-fi')}")
    print("=" * 65)

    pipeline = PodcastPipeline(
        output_dir=args.output,
        speaker=args.speaker,
        enable_bgm=not args.no_bgm,
        bgm_path=args.bgm
    )

    def print_progress(event):
        stage = event["stage"]
        pct = event["percent"]
        msg = event["message"]
        print(f"[{pct:3d}%] [{stage:<12}] {msg}")

    try:
        manifest = pipeline.run(
            pdf_path=args.pdf_path,
            book_id=args.book_id,
            progress_callback=print_progress
        )
        print("\n" + "=" * 65)
        print("🎉 CHÚC MỪNG: PODCAST ĐÃ ĐƯỢC TẠO THÀNH CÔNG!")
        print(f"Tựa đề Sách     : {manifest['title']}")
        print(f"Tổng số Chương  : {manifest['total_chapters']}")
        print(f"Tổng Thời lượng : {manifest['total_duration_formatted']}")
        print(f"Danh sách file  :")
        for ch in manifest["chapters"]:
            print(f"  • {ch['title']}: {ch['audio_url']} ({ch['duration_formatted']})")
        print("=" * 65)
    except Exception as e:
        print(f"\n❌ Lỗi trong quá trình xử lý: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
