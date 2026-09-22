# Hướng dẫn Triển khai Backend lên Hugging Face Spaces (Miễn phí 100%)

Tài liệu này hướng dẫn bạn đưa toàn bộ backend **FastAPI + Valtec-TTS** lên **Hugging Face Spaces** với phần cứng miễn phí (**2 vCPU + 16GB RAM**) và kết nối với frontend trên **Vercel**.

---

## BƯỚC 1: Tạo Space Mới Trên Hugging Face (1 Phút)

1. Đăng nhập vào [Hugging Face](https://huggingface.co/) (nếu chưa có tài khoản, đăng ký miễn phí).
2. Truy cập: [https://huggingface.co/new-space](https://huggingface.co/new-space)
3. Điền thông tin:
   - **Space name**: `aurora-podcast-worker`
   - **License**: `mit`
   - **Select the Space SDK**: Chọn **Docker** 🐳
   - **Choose a Docker template**: Chọn **Blank**
   - **Space Hardware**: Giữ mặc định **CPU basic • 2 vCPU • 16GB RAM • Free**
   - **Privacy**: Chọn **Public** (để frontend Vercel có thể gọi API)
4. Bấm nút **Create Space**.

---

## BƯỚC 2: Đẩy Code Lên Hugging Face Space

Bạn có thể chọn 1 trong 2 cách sau:

### Cách A: Tải file trực tiếp trên giao diện web (Dễ nhất)
1. Trong trang Space vừa tạo, nhấp vào tab **Files and versions** -> **Add file** -> **Upload files**.
2. Tải các file sau lên:
   - `Dockerfile` (nằm trong thư mục `hf_space/Dockerfile`)
   - `README.md` (nằm trong thư mục `hf_space/README.md`)
   - `requirements.txt` (nằm trong thư mục `hf_space/requirements.txt`)
   - Toàn bộ thư mục `podcast_engine/` từ dự án của bạn (bao gồm các file `.py` và `assets/`).
3. Bấm **Commit changes to main**.

### Cách B: Đẩy qua Git (Khuyên dùng cho lập trình viên)
1. Trong terminal tại máy tính của bạn:
   ```bash
   # Clone repo của Space về một thư mục tạm
   git clone https://huggingface.co/spaces/YOUR_USERNAME/aurora-podcast-worker temp_hf_space

   # Copy các file cấu hình và code vào
   copy hf_space\Dockerfile temp_hf_space\
   copy hf_space\README.md temp_hf_space\
   copy hf_space\requirements.txt temp_hf_space\
   xcopy /E /I podcast_engine temp_hf_space\podcast_engine\

   # Commit và push lên Space
   cd temp_hf_space
   git add .
   git commit -m "deploy podcast worker"
   git push
   ```

2. Hugging Face sẽ tự động build Docker container (khoảng 2–3 phút). Khi thấy trạng thái chuyển sang màu xanh lá **Running**, backend của bạn đã hoạt động!

---

## BƯỚC 3: Lấy Đường Dẫn API Public Của Space

1. Tại trang Space của bạn trên Hugging Face, nhìn góc trên bên phải (cạnh nút Like), bấm vào biểu tượng **ba chấm (`...`)** -> Chọn **Embed this Space**.
2. Bạn sẽ thấy mục **Direct URL**, ví dụ:
   ```text
   https://YOUR_USERNAME-aurora-podcast-worker.hf.space
   ```
3. Bạn có thể kiểm tra API bằng cách mở URL đó trên trình duyệt hoặc thêm `/docs` vào cuối (ví dụ: `https://YOUR_USERNAME-aurora-podcast-worker.hf.space/docs`) để xem giao diện Swagger UI.

---

## BƯỚC 4: Kết Nối Vào Vercel (Frontend)

1. Mở trang quản trị dự án trên [Vercel Dashboard](https://vercel.com/dashboard).
2. Vào **Settings** -> **Environment Variables**.
3. Thêm biến môi trường mới:
   - **Key**: `VITE_PODCAST_API_URL`
   - **Value**: `https://YOUR_USERNAME-aurora-podcast-worker.hf.space` (thay bằng URL ở Bước 3, không có dấu gạch chéo `/` ở cuối)
4. Bấm **Save**.
5. Vào tab **Deployments** trên Vercel, bấm vào lần deploy gần nhất -> Chọn **Redeploy** để Vercel nạp biến môi trường mới.

---

## 🎉 Hoàn tất!
Bây giờ, khi bạn hoặc bất kỳ ai truy cập vào trang web của bạn trên Vercel:
- Người dùng có thể nhấn **"Tạo Podcast AI"** cho bất kỳ cuốn sách nào.
- Yêu cầu sẽ được gửi tới Hugging Face Space để xử lý và sinh giọng đọc Valtec-TTS tiếng Việt hoàn toàn miễn phí.
- Sau khi hoàn thành, âm thanh Podcast sẽ tự động phát trực tiếp trên thanh `PodcastPlayer` nổi của web!
