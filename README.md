# An Tâm — Neon database edition

This version uses **Neon Postgres** when `DATABASE_URL` is configured. Accounts, password changes, academic records, and chat sessions then persist across browsers and Vercel function instances. Without `DATABASE_URL`, local development falls back to JSON files.

## Teacher workspace

- URL: `/teacher`
- Fixed teacher login: `1@gmail.com` / `123`
- Create one student manually or import the provided Excel template.
- Student default password: `123456`; first-login password change is mandatory.
- Reset or delete student accounts from the teacher page.

## Vercel + Neon setup

1. In Vercel, open **Storage / Marketplace** and install **Neon Postgres** for this project.
2. Neon/Vercel adds `DATABASE_URL` automatically. If not, copy the pooled connection string to the Production environment.
3. Also configure `GEMINI_API_KEY` and a 32+ character `AUTH_SECRET`.
4. Redeploy. The schema is created automatically on the first API request.

# Student Mental Advisor — local-file edition

Ứng dụng cố vấn sức khỏe tinh thần ban đầu cho học sinh/sinh viên Việt Nam. Dự án giữ chế độ **khách vãng lai**, đồng thời có tài khoản **học sinh/sinh viên** và **giáo viên**. Phiên bản này **không cần cơ sở dữ liệu** và phù hợp cho demo, cuộc thi hoặc triển khai trên **một máy chủ**.

## Vai trò và quyền riêng tư

| Chế độ | Chat | Lịch sử | Dữ liệu học tập |
|---|---|---|---|
| Khách | Có | Chỉ phiên khách được cookie ký xác thực | Không |
| Học sinh/sinh viên | Có | Chỉ lịch sử của chính mình | Chỉ bản ghi khớp mã học sinh/sinh viên |
| Giáo viên | Có | Chỉ lịch sử của chính mình | Nhập và xem dữ liệu do chính giáo viên tải lên |

**Giáo viên không thể đọc chat tư vấn riêng của học sinh.** Chat không được dùng làm công cụ kỷ luật, chấm điểm hạnh kiểm hoặc chẩn đoán tâm lý.

## Lưu dữ liệu đơn giản, không dùng database

Dữ liệu được chia thành các file nhỏ:

```text
data/
├── users.json
├── users.json.bak
├── academics/
│   └── <teacher-hash>.json
├── sessions/
│   └── <owner-hash>/
│       └── <session-hash>.json
└── backups/
```

Thiết kế này cải thiện so với một file `app-data.json` duy nhất:

- Mỗi phiên chat được cô lập theo chủ sở hữu.
- Mỗi giáo viên có file học tập riêng.
- Ghi file theo kiểu **temp → fsync → rename** để giảm nguy cơ file ghi dở.
- File cũ được giữ dưới dạng `.bak` và tự dùng để phục hồi khi file chính hỏng.
- Tên file dùng SHA-256, không chứa email, mã học sinh hoặc session ID gốc.
- Có giới hạn số phiên, số tin nhắn và số bản ghi học tập để tránh đầy ổ đĩa.
- Dòng điểm trùng `mã học sinh + môn + học kỳ` được cập nhật thay vì nhân bản.

> Giải pháp này chỉ dành cho **một tiến trình/một máy chủ**. Không chạy nhiều bản sao ứng dụng cùng ghi vào một thư mục dữ liệu chung.

## Quy tắc của mental advisor

Hệ thống được cấu hình để:

- Không tự nhận là bác sĩ, nhà trị liệu hoặc chuyên gia được cấp phép.
- Không chẩn đoán bệnh hoặc khẳng định học sinh mắc rối loạn tâm lý.
- Không suy diễn điểm số thành trí thông minh, giá trị cá nhân hay bệnh lý.
- Chỉ mô tả xu hướng học tập quan sát được và hỏi lại học sinh trước khi kết luận.
- Không khuyến khích phụ thuộc cảm xúc vào chatbot.
- Không tiết lộ chat riêng cho giáo viên hoặc phụ huynh.
- Khi có nguy cơ tức thời, ưu tiên người hỗ trợ thật và dịch vụ khẩn cấp phù hợp.
- Cảnh báo dấu hiệu thể chất nghiêm trọng có thể cần hỗ trợ y tế, thay vì mặc định coi là lo âu.

## Nhập Excel/CSV từ vnEdu

Giáo viên có thể nhập `.xlsx`, `.csv` tối đa 5 MB. Các cột hỗ trợ:

- `studentId`, `Mã học sinh`, `Mã HS`
- `studentName`, `Họ và tên`, `Tên học sinh`
- `className`, `Lớp`
- `subject`, `Môn học`, `Môn`
- `semester`, `Học kỳ`
- `score`, `Điểm`, `Điểm TB`

Khi tạo tài khoản học sinh, nhập đúng **mã học sinh/sinh viên** xuất hiện trong file. Việc ghép dữ liệu không còn dựa vào họ tên, tránh nhầm người trùng tên.

File mẫu: `examples/vnedu_sample.xlsx`.

## Cải tiến giao diện

- Form đăng nhập và tạo tài khoản tách thành tab rõ ràng.
- Nhãn vai trò cho khách, học sinh và giáo viên.
- Thẻ thông tin quyền riêng tư và giới hạn của chatbot.
- Thống kê nhanh số bản ghi, số học sinh/môn học và điểm trung bình.
- Vùng nhập file có trạng thái đang xử lý, kiểm tra dung lượng và thông báo kết quả.
- Danh sách điểm gọn, có empty state và phù hợp màn hình nhỏ.
- Bộ đếm ký tự trong ô chat và nhãn “Riêng tư / Không chẩn đoán”.
- Metadata và nội dung tiếng Việt được chuẩn hóa.

## Cài đặt

```bash
cp .env.example .env.local
npm install
npm run check
npm test
npm run dev
```

Mở `http://localhost:3000`.

Biến môi trường tối thiểu:

```env
GEMINI_API_KEY=your_key
AUTH_SECRET=chuoi-ngau-nhien-toi-thieu-32-ky-tu
DATA_DIR=./data
```

## Chạy production trên một máy chủ

```bash
npm run build
npm start
```

Nên dùng PM2 hoặc systemd với đúng **một instance**. Gắn `DATA_DIR` vào ổ đĩa bền vững nếu chạy trong container.

## Sao lưu và dọn dữ liệu

```bash
npm run data:backup
npm run data:cleanup
```

Có thể chạy dọn phiên mỗi ngày bằng cron:

```cron
0 2 * * * cd /path/student-mental-advisor && npm run data:cleanup
```

Các giới hạn có thể cấu hình:

```env
SESSION_RETENTION_DAYS=90
MAX_SESSIONS_PER_OWNER=30
MAX_MESSAGES_PER_SESSION=300
MAX_ACADEMIC_RECORDS_PER_TEACHER=20000
```

## Kiểm thử

```bash
npm run check
npm test
npm run build
```

Bộ kiểm thử hiện có **35 test case** bao phủ:

- Nguy cơ tức thời, phủ định, ngữ cảnh học thuật/phim truyện và báo cáo nguy cơ của người thứ ba.
- Mật khẩu băm, token ký, dữ liệu xác thực hỏng và mật khẩu sai.
- Rate limit, bucket độc lập và tự đặt lại sau cửa sổ thời gian.
- Quyền sở hữu phiên, xóa file thật, session không tồn tại và cô lập giữa người dùng.
- Phục hồi từ `.bak`, email/mã học sinh trùng, import rỗng và dữ liệu từ nhiều giáo viên.
- Upsert điểm trùng, ghép bằng mã học sinh và phương án dự phòng bằng tiền tố email.

## Giới hạn triển khai thực tế

- Không phù hợp cho nhiều server/instance cùng lúc.
- Rate limit nằm trong RAM và được đặt lại khi ứng dụng khởi động lại.
- Quản trị viên máy chủ vẫn có quyền truy cập file dữ liệu; cần phân quyền thư mục và mã hóa ổ đĩa.
- Trước khi sử dụng với trẻ vị thành niên, cần quy trình đồng ý, thời hạn lưu dữ liệu, người phụ trách xử lý khẩn cấp và chuyên gia tâm lý duyệt nội dung.

## Production-style interface

- `/` is a focused animated landing page with clear positioning and a single primary call to action.
- `/chat` is the distraction-free conversation workspace.
- Account, teacher import, student data, role selection, and persona options are moved into a slide-over settings drawer.
- Motion respects the operating system `prefers-reduced-motion` accessibility setting.

## Vercel deployment

This repository pins Node.js 22 and npm 10.9.2. Vercel installs dependencies with:

```bash
npm ci --no-audit --no-fund
```

Set `GEMINI_API_KEY` and `AUTH_SECRET` in Vercel Project Settings. Do not set `DATA_DIR=./data` on Vercel because the deployed application directory is read-only. When `VERCEL=1` and `DATA_DIR` is unset, the app automatically uses `/tmp/an-tam-data`.

**Important:** Vercel `/tmp` storage is ephemeral. Registration, imported grades, and chat history may disappear after a cold start or run on a different function instance. The local-file mode is durable only on a single server/VPS with a persistent disk.


## Quy trình cấp tài khoản học sinh

- Học sinh **không thể tự đăng ký**.
- Tài khoản giáo viên cố định: `1@gmail.com` / `123`.
- Giáo viên tải file mẫu tại `/mau-import-hoc-sinh.xlsx`, điền dữ liệu rồi nhập lên website.
- Các cột bắt buộc: `Mã học sinh`, `Họ và tên`, `Lớp`, `Gmail`, `Môn học`, `Học kỳ`, `Điểm`.
- Một học sinh có thể xuất hiện ở nhiều dòng cho nhiều môn, nhưng phải dùng cùng mã, họ tên và Gmail.
- Hệ thống tạo tài khoản học sinh với mật khẩu mặc định `123456`.
- Khi đăng nhập lần đầu, học sinh bắt buộc đổi sang mật khẩu mới ít nhất 8 ký tự trước khi chat.
- Import lại cùng học sinh không tạo tài khoản trùng; điểm cùng môn/học kỳ được cập nhật.

> Các mật khẩu cố định trên chỉ phù hợp cho bản trình diễn. Khi triển khai thật, nên đổi mật khẩu giáo viên qua biến môi trường và tạo mật khẩu tạm thời ngẫu nhiên cho từng học sinh.
