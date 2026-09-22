FROM python:3.11-slim

# 1. Cài đặt các gói hệ thống cần thiết (ffmpeg, git, build-essential)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    build-essential \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 2. Tạo user không quyền root theo tiêu chuẩn bảo mật của Hugging Face Spaces (UID 1000)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PORT=7860

WORKDIR $HOME/app

# 3. Cài đặt các thư viện Python
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Clone mã nguồn lõi v-tts
RUN git clone --depth 1 https://github.com/tronghieuit/v-tts.git podcast_engine/v_tts_src

# 5. Copy toàn bộ package podcast_engine vào container
COPY --chown=user:user podcast_engine/ ./podcast_engine/

# 6. Tạo thư mục lưu trữ dữ liệu podcast tĩnh và cache
RUN mkdir -p public/podcasts podcast_engine/.cache/uploads podcast_engine/.cache/audio_chunks

# 7. Khởi tạo tài nguyên âm thanh mẫu
RUN python -m podcast_engine.generate_sample_assets

# 8. Mở cổng 7860 (chuẩn của Hugging Face)
EXPOSE 7860

# 9. Khởi chạy FastAPI Worker
CMD ["uvicorn", "podcast_engine.server:app", "--host", "0.0.0.0", "--port", "7860"]
