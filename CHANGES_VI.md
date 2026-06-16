# Các thay đổi đã thực hiện

1. Hiển thị mô tả của phong cách hỗ trợ đang được chọn trong ngăn cài đặt trò chuyện.
2. Đổi toàn bộ tên hiển thị từ **An Tâm** thành **Bạn đồng hành học đường**.
3. Nâng cấp Teacher Dashboard:
   - Hiển thị điểm trung bình và danh sách chi tiết từng môn/học kỳ.
   - Tìm kiếm theo tên học sinh, lớp và môn học.
   - Xóa từng bản ghi điểm riêng biệt với xác nhận.
   - Giữ nguyên chức năng đặt lại mật khẩu và xóa tài khoản.
4. Thêm mục đánh giá diễn biến tâm lý:
   - Lưu mức `safe`, `distress`, `high_risk` sau mỗi lượt trò chuyện.
   - Hiển thị thời điểm đánh giá, lý do tổng quát và số lần rủi ro cao.
   - Không hiển thị nội dung hội thoại cho giáo viên.
   - Cảnh báo trực tiếp người dùng khi mức rủi ro cao.
5. Khôi phục bộ lọc từ ngữ nhạy cảm:
   - Phát hiện và che từ ngữ xúc phạm trước khi gửi sang mô hình.
   - Hiển thị nhắc nhở ngôn từ trong giao diện.
   - Không chặn các câu chia sẻ cảm xúc hoặc từ khóa khủng hoảng cần đánh giá an toàn.

## Kiểm tra

```bash
npm ci
npm run check
npm test
npm run build
```

Kết quả tại thời điểm đóng gói: 33/33 test vượt qua và production build thành công.

## Xóa đoạn chat

- Thêm nút **Xóa đoạn chat** nổi bật tại phần tiêu đề hội thoại.
- Hiển thị hộp xác nhận trước khi xóa để tránh thao tác nhầm.
- Xóa toàn bộ tin nhắn và dữ liệu ghi nhớ của đúng phiên thuộc người dùng hiện tại.
- Không tự xóa dữ liệu trên giao diện khi API thất bại; người dùng nhận thông báo lỗi rõ ràng.
- Khóa nút trong lúc đang gửi tin nhắn hoặc đang thực hiện xóa.

## Nhập điểm thủ công trên Teacher Dashboard

- Đưa form nhập điểm thủ công thành luồng chính, Excel chỉ còn là tùy chọn nhập hàng loạt.
- Giáo viên chọn học sinh đã được phân công, môn học, học kỳ, loại điểm, lớp, điểm và ghi chú.
- API kiểm tra giáo viên có quyền quản lý học sinh trước khi ghi điểm.
- Điểm chỉ nhận giá trị 0–10; giới hạn độ dài và chuẩn hóa dữ liệu đầu vào.
- Cho phép nhiều loại điểm trong cùng môn/học kỳ. Bản ghi trùng đúng loại điểm được cập nhật thay vì nhân bản.
- Ghi audit log `ACADEMIC_RECORD_MANUAL_UPSERT` nhưng không ghi dữ liệu nhạy cảm.
- Import Excel nay cũng tự gán học sinh cho giáo viên để dữ liệu hiển thị nhất quán.
- Thêm migration `002_manual_academic_entry.sql` và cập nhật trình migration để chạy mọi file migration theo thứ tự.
- Tổng kiểm thử hiện tại: 49 test vượt qua.
