# Smart PDF Reader & Podcast TTS 🎧📚

Ứng dụng đọc sách PDF thông minh kết hợp tính năng nghe âm thanh tự động (Text-to-Speech) chuẩn Podcast, hỗ trợ đầy đủ quản lý file sách, ghi nhớ lịch sử đọc dở để đọc tiếp và có thể cài đặt trực tiếp lên điện thoại (Android & iOS).

🌐 **Trải nghiệm trực tiếp trên Web / Mobile**: [https://smart-pdf-podcast-reader.vercel.app](https://smart-pdf-podcast-reader.vercel.app)  
📦 **Kho lưu trữ GitHub**: [https://github.com/khang0708/smart-pdf-podcast](https://github.com/khang0708/smart-pdf-podcast)

---

## 🌟 Các tính năng nổi bật

### 1. Quản lý thư viện file sách PDF
- **Tải lên linh hoạt**: Kéo thả hoặc chọn file PDF từ bộ nhớ máy tính, điện thoại, iCloud, Google Drive.
- **Tự động tạo ảnh bìa**: Trích xuất bìa sách (trang 1) sắc nét và hiển thị thông tin số trang, dung lượng file.
- **Lưu trữ Offline 100%**: Dữ liệu và nội dung file PDF được lưu trữ bền vững bằng IndexedDB (`localforage`), không cần kết nối mạng.
- **Tìm kiếm & Phân loại**: Tìm kiếm theo tiêu đề, lọc sách "Đang đọc" hoặc "Yêu thích".
- **Thẻ Đọc Tiếp Nhanh (Quick Resume)**: Hiển thị ngay cuốn sách bạn đang đọc dở nhất kèm % hoàn thành để tiếp tục chỉ với 1 click.

### 2. Trình đọc PDF hiện đại
- **Render sắc nét**: Sử dụng thư viện Mozilla PDF.js với cơ chế khử răng cưa và điều chỉnh theo tỷ lệ điểm ảnh màn hình (Retina / High DPI).
- **Tự động lưu tiến độ**: Khi bạn lật trang hoặc đóng app, trang hiện tại sẽ được lưu tự động. Lần sau mở sách là đọc tiếp ngay trang cũ.
- **Chế độ đọc bảo vệ mắt**: 
  - 🌙 Ban đêm (Dark Mode)
  - ☕ Giấy ấm (Sepia Mode)
  - ☀️ Ban ngày (Light Mode)
- **Mục lục & Bookmark**: Xem mục lục sách (Table of Contents) và lưu lại các trang quan trọng (Bookmarks) để tra cứu lại.
- **Điều hướng tiện lợi**: Phóng to / thu nhỏ (Zoom), nhảy nhanh đến trang bất kỳ, hỗ trợ phím mũi tên và cảm ứng.

### 3. Bộ phát Text-to-Speech (TTS) như Podcast
- **Trích xuất văn bản thông minh**: Tự động nhận diện câu văn trên trang PDF và phân đoạn câu hợp lý.
- **Highlight câu đang đọc theo thời gian thực (Karaoke Transcript)**: Khi giọng đọc phát đến câu nào, câu đó sẽ phát sáng trên trang sách và cuộn phụ đề tương ứng.
- **Tự động chuyển trang**: Khi đọc hết trang hiện tại, audio sẽ tự động lật sang trang tiếp theo và đọc liền mạch như một cuốn sách nói / tập podcast.
- **Điều khiển Podcast chuyên nghiệp**:
  - Phát / Tạm dừng (Play / Pause).
  - Tua lùi 15 giây / Tua tới 15 giây.
  - Chuyển câu trước / câu tiếp theo.
  - Tùy chỉnh tốc độ đọc: `0.75x`, `1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x`.
  - Chọn giọng đọc có sẵn trên thiết bị (Tiếng Việt, Tiếng Anh,...).
  - **Hẹn giờ tắt (Sleep Timer)**: 5 phút, 15 phút, 30 phút, 45 phút, 60 phút — cực kỳ tiện lợi khi nghe sách trước khi đi ngủ.

---

## 📱 Hướng dẫn Cài đặt & Chạy trên Điện thoại

Ứng dụng được thiết kế tương thích hoàn hảo cho điện thoại với 2 cách cài đặt:

### Cách 1: Cài đặt ngay qua PWA (Khuyên dùng - Nhanh nhất & Không cần cài Android SDK)
1. Trên máy tính của bạn, khởi động server:
   ```bash
   npm run dev -- --host
   ```
2. Terminal sẽ hiển thị địa chỉ mạng nội bộ dạng: `http://192.168.x.x:5173`.
3. Mở trình duyệt trên điện thoại (kết nối cùng mạng WiFi với máy tính) và truy cập địa chỉ trên:
   - **Trên iPhone (Safari)**: Bấm nút **Chia sẻ (Share)** ở thanh dưới cùng &rarr; Chọn **"Thêm vào MH chính" (Add to Home Screen)**.
   - **Trên Android (Chrome)**: Bấm menu 3 chấm &rarr; Chọn **"Cài đặt ứng dụng"** hoặc **"Thêm vào màn hình chính"**.
4. Biểu tượng ứng dụng **PDF Podcast** sẽ xuất hiện trên màn hình chính của điện thoại. Khi bấm mở, app sẽ chạy toàn màn hình (không có thanh địa chỉ trình duyệt) như một ứng dụng gốc thực thụ!

---

### Cách 2: Đóng gói thành file APK Android với Capacitor
Dự án đã được tích hợp sẵn toàn bộ mã nguồn Android native trong thư mục `android/`:

1. Build mã nguồn web:
   ```bash
   npm run build
   npx cap sync
   ```
2. Mở ứng dụng trong **Android Studio**:
   ```bash
   npx cap open android
   ```
   *(Hoặc mở thư mục `smart-pdf-podcast-reader/android` bằng Android Studio)*.
3. Trong Android Studio:
   - Chọn menu **Build** &rarr; **Build Bundle(s) / APK(s)** &rarr; **Build APK(s)**.
   - Hoặc cắm điện thoại vào máy qua cáp USB và bấm nút **Run ▶** để cài đặt trực tiếp lên điện thoại.
4. Nếu bạn có sẵn Android SDK trong terminal, bạn cũng có thể build nhanh bằng lệnh:
   ```bash
   cd android && ./gradlew assembleDebug
   ```
   File APK sẽ nằm tại: `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 💻 Hướng dẫn chạy thử nghiệm trên máy tính

1. Cài đặt dependencies (nếu chưa):
   ```bash
   npm install
   ```
2. Khởi chạy máy chủ phát triển:
   ```bash
   npm run dev
   ```
3. Mở trình duyệt tại [http://localhost:5173](http://localhost:5173).
4. Bạn có thể bấm nút **"Thêm sách mẫu đọc thử"** để trải nghiệm ngay lập tức các tính năng đọc và podcast TTS!
