# Aurora Smart Podcast Engine 🎙️

Hệ thống chuyển đổi tài liệu và sách PDF sang Audio Podcast hoàn chỉnh, tối ưu cho tiếng Việt với mô hình thần kinh **Valtec-TTS (v-tts)** và công nghệ xử lý âm thanh tự động.

---

## 1. Tính năng Nổi bật

1. **Trích xuất Cấu trúc Bằng PyMuPDF & pymupdf4llm**:
   - Nhận diện tiêu đề chương (`# Chapter`, `## Section`) và cấu trúc đoạn văn bản.
   - Bóc tách mục lục gốc (Table of Contents / Bookmarks) từ PDF.
2. **Bộ Làm sạch Văn bản Chuyên sâu (Text Cleaner)**:
   - Tự động thống kê và loại bỏ Running Header / Footer lặp lại qua các trang.
   - Lọc bỏ số trang (`Trang 12`, `12 / 100`, v.v.).
   - Hàn gắn câu đứt đoạn giữa chừng và khử gạch nối ngắt từ (`de-hyphenation`).
3. **Phân đoạn Câu Thông minh (Semantic Chunker)**:
   - Cắt văn bản theo từng chương riêng biệt.
   - Chia nhỏ văn bản thành các khối tối ưu cho Valtec-TTS (150 – 350 ký tự), ngắt theo dấu chấm, phẩy, ba chấm tự nhiên.
   - Gắn metadata thời gian nhịp nghỉ (1100ms sau tiêu đề, 650ms cuối đoạn, 280ms cuối câu).
4. **Động cơ Giọng đọc Valtec-TTS (v-tts)**:
   - 5 giọng đọc chuẩn vùng miền:
     - `NF`: Nữ miền Bắc (Chuẩn)
     - `SF`: Nữ miền Nam (Truyền cảm)
     - `NM1`: Nam miền Bắc 1 (Trầm ấm)
     - `SM`: Nam miền Nam (Tự nhiên)
     - `NM2`: Nam miền Bắc 2 (Sâu lắng)
   - Tích hợp bộ nhớ tạm (Chunk Hash Cache) trong `.cache/audio_chunks/`: Tái sử dụng ngay lập tức các đoạn đã sinh, cho phép tiếp tục công việc nếu bị gián đoạn.
5. **Hậu kỳ Sản xuất Podcast (Audio Assembler & ffmpeg)**:
   - Chèn nhạc dạo đầu (Intro Jingle) và âm chuyển chương (Chapter Transition).
   - Nhạc nền (BGM) ambient nhẹ nhàng kèm kỹ thuật **Voice Ducking** (tự hạ âm lượng BGM xuống -22dB khi có lời đọc).
   - Chuẩn hóa âm lượng Podcast Quốc tế (-16 LUFS).
   - Xuất file `.mp3` 192kbps kèm tệp chỉ mục `podcast_manifest.json`.

---

## 2. Cách Chạy Qua CLI (Dòng Lệnh)

```bash
# Cú pháp cơ bản
python -m podcast_engine.cli "duong_dan/den_sach.pdf" --speaker NF

# Tùy chọn giọng Nam miền Nam và tắt nhạc nền
python -m podcast_engine.cli "duong_dan/den_sach.pdf" --speaker SM --no-bgm

# Chỉ định thư mục xuất kết quả
python -m podcast_engine.cli "duong_dan/den_sach.pdf" --output "public/podcasts/my_book"
```

---

## 3. Khởi Chạy FastAPI Local Worker (Tích hợp Web)

```bash
python -m uvicorn podcast_engine.server:app --host 127.0.0.1 --port 8765
```

### Các Endpoint API:
- `GET /api/health`: Kiểm tra trạng thái server.
- `GET /api/speakers`: Lấy danh sách 5 giọng đọc tiếng Việt.
- `POST /api/convert`: Nhận PDF và chạy tiến trình sinh podcast ngầm.
- `GET /api/status/{job_id}`: Polling tiến độ theo thời gian thực (0% -> 100%).
- `GET /api/podcasts`: Liệt kê tất cả podcast đã tạo trong hệ thống.
- `GET /podcasts/{book_id}/{filename}`: Stream file MP3 trực tiếp.
