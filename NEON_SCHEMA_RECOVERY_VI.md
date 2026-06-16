# Khôi phục schema Neon cũ

Các lỗi PostgreSQL `42703` như `column role does not exist` và `column encrypted_state does not exist` nghĩa là mã nguồn mới đã được deploy nhưng database chưa chạy đủ migration.

## Chạy ngay một lần

Dùng cùng `DATABASE_URL` đang cấu hình trên Vercel:

```bash
npm ci
npm run db:migrate
npm run db:check
npm run db:seed:teacher
```

Migration `003_legacy_schema_compatibility.sql` chỉ thêm/backfill cột thiếu, không xóa dữ liệu hiện có. Dòng cũ trong `sessions` chưa mã hóa sẽ được ứng dụng xem như session chưa có memory; khi người dùng gửi tin nhắn mới, state mới sẽ được ghi bằng AES-256-GCM.

Sau đó redeploy Vercel không dùng build cache.
