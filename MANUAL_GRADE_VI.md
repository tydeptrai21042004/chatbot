# Nhập điểm thủ công

1. Đăng nhập tài khoản giáo viên và mở `/teacher`.
2. Trong mục **Nhập điểm thủ công**, chọn học sinh.
3. Nhập môn học, học kỳ, loại điểm, lớp và điểm từ 0 đến 10.
4. Ghi chú là tùy chọn, tối đa 300 ký tự và không nên chứa dữ liệu tâm lý nhạy cảm.
5. Nhấn **Lưu điểm**.

Excel/CSV chỉ dành cho trường hợp nhập hàng loạt. Sau khi cập nhật mã nguồn trên Neon đang tồn tại, chạy:

```bash
npm run db:migrate
```

Migration mới cho phép lưu nhiều loại điểm trong cùng môn và học kỳ.
