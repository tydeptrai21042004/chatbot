# Sửa lỗi Cannot find module @playwright/test trên Vercel

Playwright đã được tách hoàn toàn khỏi TypeScript build của ứng dụng Next.js.

- Không để `playwright.config.ts` ở thư mục gốc.
- E2E dùng `e2e/playwright.config.mjs` và `e2e/tests/*.mjs`.
- `e2e/` bị loại khỏi `tsconfig.json` và `.vercelignore`.
- `npm run build` chạy kiểm tra trước để phát hiện file Playwright bị đặt nhầm vào ứng dụng.

Nếu repository cũ còn file gốc, phải xóa trước khi commit:

```bash
rm -f playwright.config.ts playwright.config.mts
rm -rf tests/e2e
```
