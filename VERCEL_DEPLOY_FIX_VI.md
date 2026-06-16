# Khắc phục lỗi npm ETIMEDOUT trên Vercel

## Nguyên nhân

Lockfile cũ chứa URL nội bộ của môi trường tạo mã nguồn cho Playwright. `npm ci` ưu tiên trường `resolved` trong lockfile, vì vậy chỉ đặt `--registry=https://registry.npmjs.org/` chưa đủ.

## Thay đổi trong bản này

- Gỡ `@playwright/test` khỏi `devDependencies` của ứng dụng chính.
- Tách Playwright vào thư mục `e2e/`; Vercel không cài gói này khi deploy.
- Đổi toàn bộ URL nội bộ còn lại trong lockfile sang npm registry công khai.
- Vercel dùng `npm ci --omit=peer` để không cài optional peer Playwright do Next.js khai báo.
- Thêm retry hợp lý trong `.npmrc`.

## Deploy Vercel

Không cần sửa Build Command. Repository đã có:

```json
{
  "installCommand": "npm ci --omit=peer --registry=https://registry.npmjs.org/ --no-audit --no-fund",
  "buildCommand": "npm run build"
}
```

Sau khi đẩy mã nguồn, chọn **Redeploy** và bỏ chọn dùng cache cũ nếu Vercel vẫn tái sử dụng lần cài thất bại.

## Chạy unit test

```bash
npm ci
npm test
npm run check
npm run build
```

## Chạy E2E riêng ở local hoặc CI

Playwright không còn thuộc dependency deploy chính:

```bash
cd e2e
npm install
npx playwright install chromium
npm test
```

Có thể đặt E2E trong một workflow CI riêng; không nên tải browser hoặc Playwright trong Vercel production build.
