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

Bộ test kiểm tra crisis rules, quyền sở hữu phiên, xóa thật, phục hồi `.bak`, chống trùng tài khoản và cập nhật bản ghi điểm trùng.

## Giới hạn triển khai thực tế

- Không phù hợp cho nhiều server/instance cùng lúc.
- Rate limit nằm trong RAM và được đặt lại khi ứng dụng khởi động lại.
- Quản trị viên máy chủ vẫn có quyền truy cập file dữ liệu; cần phân quyền thư mục và mã hóa ổ đĩa.
- Trước khi sử dụng với trẻ vị thành niên, cần quy trình đồng ý, thời hạn lưu dữ liệu, người phụ trách xử lý khẩn cấp và chuyên gia tâm lý duyệt nội dung.
