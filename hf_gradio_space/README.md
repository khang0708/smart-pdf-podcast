---
title: Aurora Podcast Worker
emoji: 🎙️
colorFrom: green
colorTo: indigo
sdk: gradio
app_file: app.py
pinned: false
---

# Aurora Smart Podcast Worker (Gradio + FastAPI) 🎙️

Backend chuyển đổi PDF sang Audio Podcast bằng **Valtec-TTS (tiếng Việt)** chạy trực tiếp trên Hugging Face Spaces miễn phí (2 vCPU + 16GB RAM).

Hỗ trợ đồng thời:
- Giao diện trực quan Gradio tại `/`
- Tài liệu API tương tác Swagger UI tại `/docs`
- Toàn bộ REST API: `/api/health`, `/api/speakers`, `/api/convert`, `/api/status/{job_id}`, `/api/podcasts`
