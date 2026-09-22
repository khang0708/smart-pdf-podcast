---
title: Aurora Podcast Worker
emoji: 🎙️
colorFrom: green
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Aurora Smart Podcast Worker API 🎙️

Hệ thống backend xử lý tài liệu PDF sang Audio Podcast hoàn chỉnh, tối ưu cho tiếng Việt với mô hình thần kinh **Valtec-TTS (v-tts)** và công nghệ tự động ghép chương, lọc rác, hòa trộn nhạc nền ducking.

## API Documentation
Sau khi Space khởi động, bạn có thể truy cập tài liệu tương tác Swagger UI tại:
- `https://your-username-space-name.hf.space/docs`

### Các Endpoint chính:
- `GET /api/health`: Kiểm tra tình trạng hoạt động và các giọng đọc.
- `GET /api/speakers`: Danh sách 5 giọng đọc tiếng Việt (Bắc/Nam).
- `POST /api/convert`: Tiếp nhận file PDF để sinh podcast.
- `GET /api/status/{job_id}`: Polling tiến độ chuyển đổi (0 - 100%).
- `GET /api/podcasts`: Danh sách podcast đã xuất bản.
- `GET /podcasts/{book_id}/{filename}`: Stream file MP3 trực tiếp.
