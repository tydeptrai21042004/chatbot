# Sửa lỗi CSP và cảnh báo console trình duyệt

## Lỗi thuộc ứng dụng

Các lỗi `Executing inline script violates ... script-src 'self'` xuất hiện vì Next.js cần script hydration do framework sinh ra. Dự án nay tạo nonce ngẫu nhiên cho từng request trong `middleware.ts`, chuyển nonce qua header `x-nonce`, và trả CSP tương ứng trong response.

Không dùng `unsafe-inline` cho `script-src` ở production.

## Cảnh báo không thuộc ứng dụng

Các log có nguồn `contentscript.js`, `ObjectMultiplex`, `app-init-liveness`, `background-liveness` thường do extension trình duyệt (đặc biệt extension ví điện tử/Web3 hoặc extension inject content script). Chúng không đến từ bundle của ứng dụng.

Để xác nhận, mở trang bằng cửa sổ Ẩn danh với extension bị tắt hoặc tạo Chrome profile sạch. Nếu các log biến mất nhưng ứng dụng vẫn hoạt động, không cần sửa mã nguồn ứng dụng cho những cảnh báo đó.
