# Triển khai production với Neon

## 1. Tạo Neon database
Tạo project, lấy **pooled connection string** và đặt vào `DATABASE_URL`. Không đưa chuỗi kết nối vào client hoặc biến `NEXT_PUBLIC_*`.

## 2. Sinh khóa
```bash
openssl rand -base64 32   # CHAT_ENCRYPTION_KEY
openssl rand -hex 32      # AUTH_SECRET
openssl rand -hex 32      # IP_HASH_SALT
```

## 3. Migration
```bash
npm ci
npm run db:migrate
```

## 4. Retention
Chạy `npm run data:retention` mỗi ngày bằng Vercel Cron hoặc scheduler riêng. Tin nhắn/session quá 30 ngày bị hard delete; risk assessment 90 ngày; audit log 180 ngày.

## 5. Quyền riêng tư
Chat được mã hóa AES-256-GCM trước khi gửi tới Neon. Giáo viên chỉ nhận mức rủi ro và lý do tổng quát, không có API đọc nội dung chat. Không bật DEBUG_GEMINI trong production.

## 6. Sao lưu
Neon backup/PITR vẫn có thể chứa dữ liệu đã xóa cho tới khi cửa sổ phục hồi kết thúc. Chính sách riêng tư phải nói rõ khoảng thời gian này và cấu hình retention backup ngắn nhất phù hợp.

## Seed tài khoản giáo viên đầu tiên

Sau khi chạy migration, tạo tài khoản giáo viên mặc định:

```bash
npm run db:seed:teacher
```

Thông tin mặc định:

```text
Email: 1@gmail.com
Mật khẩu: 123
```

Tài khoản được tạo với `must_change_password=true`, vì vậy giáo viên phải đổi mật khẩu sau lần đăng nhập đầu tiên. Seed có tính idempotent: chạy lại không tạo tài khoản trùng và không tự ý ghi đè mật khẩu hiện có.

Chạy migration và seed cùng lúc:

```bash
npm run db:setup
```

Khi chạy với `NODE_ENV=production`, vì `123` là mật khẩu yếu, cần xác nhận có chủ đích:

```bash
ALLOW_INSECURE_DEFAULT_TEACHER=true npm run db:seed:teacher
```

Sau khi đăng nhập và đổi mật khẩu, nên xóa biến `ALLOW_INSECURE_DEFAULT_TEACHER` khỏi Vercel/hosting.

Để chủ động đặt lại tài khoản hiện có về mật khẩu seed:

```bash
SEED_RESET_TEACHER_PASSWORD=true \
ALLOW_INSECURE_DEFAULT_TEACHER=true \
npm run db:seed:teacher
```

Có thể thay thông tin mặc định bằng các biến:

```env
SEED_TEACHER_EMAIL=1@gmail.com
SEED_TEACHER_PASSWORD=123
SEED_TEACHER_NAME=Giáo viên
SEED_TEACHER_MUST_CHANGE_PASSWORD=true
```
