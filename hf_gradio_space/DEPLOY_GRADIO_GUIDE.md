# Hướng dẫn Triển khai Hugging Face Space (Gradio SDK - Không cần Thẻ Tín dụng)

Nếu tài khoản Hugging Face của bạn bị ẩn hoặc không thể chọn tùy chọn **Docker** (do yêu cầu thêm thẻ thanh toán), bạn hãy chọn **Gradio SDK** — **Hoàn toàn miễn phí 100% và KHÔNG CẦN nhập thẻ tín dụng**!

Vì Gradio được xây dựng trên nền tảng **FastAPI**, ứng dụng này vừa cung cấp giao diện web thử nghiệm trực quan, vừa cung cấp đầy đủ các API REST cho ứng dụng Vercel kết nối vào.

---

## BƯỚC 1: Tạo Space Mới (Chọn SDK: Gradio)

1. Truy cập: [https://huggingface.co/new-space](https://huggingface.co/new-space)
2. Điền thông tin:
   - **Space name**: `aurora-podcast-worker`
   - **License**: `mit`
   - **Select the Space SDK**: Chọn **Gradio** 🚀 (Nút Gradio luôn mở miễn phí, không yêu cầu thẻ!)
   - **Space Hardware**: Giữ mặc định **CPU basic • 2 vCPU • 16GB RAM • Free**
   - **Privacy**: Chọn **Public**
3. Bấm nút **Create Space**.

---

## BƯỚC 2: Tải Code Lên Space

Bạn có thể tải trực tiếp trên trình duyệt hoặc dùng Git:

### Cách tải trực tiếp qua giao diện Web:
1. Vào tab **Files** trong Space của bạn -> Nhấp **Add file** -> **Upload files**.
2. Tải các file sau lên thư mục gốc của Space:
   - `app.py` (từ thư mục `hf_gradio_space/app.py`)
   - `README.md` (từ thư mục `hf_gradio_space/README.md`)
   - `packages.txt` (từ thư mục `hf_gradio_space/packages.txt` - file này giúp Hugging Face tự động cài `ffmpeg`)
   - `requirements.txt` (từ thư mục `hf_gradio_space/requirements.txt`)
   - Toàn bộ thư mục `podcast_engine/` từ dự án của bạn (chứa các script trích xuất và âm thanh mẫu).
3. Bấm **Commit changes to main**.

Hugging Face sẽ tự động cài đặt `ffmpeg`, `torch`, `v-tts` và khởi chạy backend. Khi thấy trạng thái chuyển sang màu xanh lá **Running**, backend đã sẵn sàng!

---

## BƯỚC 3: Lấy Đường Dẫn API và Kết Nối Vào Vercel

1. Trong Space trên Hugging Face, nhìn góc trên bên phải, bấm vào biểu tượng **ba chấm (`...`)** -> Chọn **Embed this Space**.
2. Sao chép mục **Direct URL**, ví dụ:
   ```text
   https://YOUR_USERNAME-aurora-podcast-worker.hf.space
   ```
3. Mở dự án của bạn trên [Vercel Dashboard](https://vercel.com/dashboard) -> **Settings** -> **Environment Variables**.
4. Thêm biến môi trường:
   - **Key**: `VITE_PODCAST_API_URL`
   - **Value**: `https://YOUR_USERNAME-aurora-podcast-worker.hf.space` (không có dấu gạch chéo `/` ở cuối)
5. Bấm **Save** và vào tab **Deployments** bấm **Redeploy** trên Vercel.

---

## 🎉 Kiểm tra Hoạt động
- Mở trang Vercel của bạn, bấm vào một cuốn sách và chọn **"Tạo Podcast AI"**.
- Trình duyệt sẽ tự động kết nối đến Hugging Face Space để trích xuất PDF và sinh giọng đọc Valtec-TTS tiếng Việt hoàn toàn miễn phí!
