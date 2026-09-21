# 🚀 Cloudflare D1 + R2 Edge Backend cho Aurora Reader SaaS

Hạ tầng Backend đặt tại **300+ trung tâm dữ liệu Cloudflare Edge** (bao gồm các trạm PoP tại **Hà Nội & TP. Hồ Chí Minh**), mang lại:
* **Tốc độ cực nhanh: 5ms - 20ms**.
* **0ms Cold Start**: Không bao giờ bị ngủ đông như Supabase Free.
* **0đ phí băng thông (Zero Egress Fees) với Cloudflare R2**: Tải file PDF không giới hạn không lo chi phí.
* **5 triệu lượt đọc/ngày miễn phí với Cloudflare D1**.

---

## 🛠️ Hướng Dẫn Triển Khai (Chỉ cần 3 lệnh trên Terminal)

### Bước 1: Đăng nhập Cloudflare bằng Wrangler
```bash
npx wrangler login
```

### Bước 2: Tạo Cơ Sở Dữ Liệu D1 SQLite
```bash
# 1. Tạo Database D1 (Miễn phí 5 triệu lượt đọc/ngày, không cần thẻ tín dụng)
npx wrangler d1 create aurora-db

# 2. Sau khi chạy lệnh trên, copy chuỗi database_id dán vào file worker/wrangler.toml:
# database_id = "dán-id-vào-đây"

# 3. Chạy script tạo bảng cơ sở dữ liệu trên D1
npx wrangler d1 execute aurora-db --file=./schema.sql
```

---

### Bước 3: Triển Khai (Chọn 1 trong 2 lựa chọn):

#### 🌟 Lựa chọn 1: Triển khai ngay với D1 (Khuyên dùng - Không cần thẻ tín dụng)
> Toàn bộ tính năng SaaS: Đồng bộ 2 chiều tức thì, Lưu tiến độ đọc (<20ms), Ghép nối thiết bị bằng mã PIN không cần login, Đánh dấu, Ghi chú đều hoạt động 100% trên D1!
> File PDF được lưu trữ sẵn an toàn trong IndexedDB của trình duyệt máy khách hàng.

Bạn chỉ cần chạy:
```bash
npx wrangler deploy
```

#### 🪣 Lựa chọn 2: Sử dụng thêm Cloudflare R2 để lưu cả tệp PDF lên Cloud ($0 Egress Fee)
Nếu gặp thông báo: `Please enable R2 through the Cloudflare Dashboard [code: 10042]`
1. Truy cập [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Ở menu bên trái, chọn **Storage & Databases** -> **R2**
3. Bấm **"Enable R2"** (hoặc "Get Started"). *Cloudflare tặng miễn phí 10GB/tháng và 0đ phí băng thông.*
4. Sau khi bấm bật, quay lại terminal chạy:
   ```bash
   npx wrangler r2 bucket create aurora-pdf-files
   ```
5. Mở file `worker/wrangler.toml` và bỏ dấu `#` (uncomment) ở 3 dòng R2:
   ```toml
   [[r2_buckets]]
   binding = "BUCKET"
   bucket_name = "aurora-pdf-files"
   ```
6. Chạy `npx wrangler deploy`

---

## 🔗 Kết Nối Với Ứng Dụng Frontend Aurora Reader
Sau khi deploy thành công, Cloudflare sẽ in ra URL của Worker, ví dụ:
`https://aurora-reader-api.<subdomain>.workers.dev`

Bạn chỉ cần copy URL đó dán vào file `.env` của thư mục gốc:
```env
VITE_CLOUDFLARE_WORKER_URL=https://aurora-reader-api.<subdomain>.workers.dev
```

Khách hàng của bạn sẽ ngay lập tức được tận hưởng tốc độ tức thì, đồng bộ 2 chiều và mở sách siêu mượt!
