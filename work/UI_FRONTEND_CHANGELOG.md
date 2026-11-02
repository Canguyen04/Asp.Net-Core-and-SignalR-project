# MoveFlow – Frontend redesign

**Nguồn:** `work.zip` do người dùng cung cấp. **Phạm vi:** thay đổi React frontend; backend ASP.NET Core 8, EF Core SQLite và SignalR giữ nguyên source.

## Thay đổi

- Thống nhất nhận diện MoveFlow (cam/trắng/xám) và các token màu, font, border, responsive trong `frontend/src/index.css`.
- Layout chung `AppShell`: sidebar theo vai trò, topbar, tài khoản và điều hướng trên điện thoại. Giữ các URL gốc để không ảnh hưởng API/luồng demo.
- Bộ UI tái sử dụng `src/ui/kit.jsx`: icon SVG, thẻ KPI, bảng đơn, nhãn trạng thái, format tiền, trạng thái trống, xuất CSV.
- Dashboard khách hàng: KPI, bảng đơn, tìm kiếm/trạng thái, CTA tạo đơn, popup hỗ trợ.
- Dashboard tài xế: bật/tắt nhận chuyến dựa vào GPS, lọc đơn, danh sách chuyến, nhận đơn và thu nhập dự kiến.
- Dashboard admin: thống kê 7 ngày, phân bố trạng thái, quản lý vận đơn/người dùng, tìm kiếm, lọc, xuất CSV.
- Trang đặt hàng: quy trình 4 mục (loại xe, địa chỉ, liên hệ, thanh toán), bản đồ và phiếu phí kèm mã khuyến mãi. Ước tính cước dùng công thức tương ứng `LogisticsServices.Quote` từ backend; số cuối cùng do backend xác nhận.
- Chi tiết đơn: timeline, lộ trình, liên hệ tài xế, chat, đánh giá và POD. Chức năng tài xế chuyển trạng thái vẫn gọi API cũ.
- Trang ví: số dư, nạp/rút mô phỏng, lịch sử và quản lý ví tài xế.
- Đăng nhập/đăng ký dạng split layout, nhãn rõ ràng, favicon và title mới.
- Widget chat hỗ trợ chuẩn hóa UI, giữ SignalR và API.
- Không thêm thư viện frontend mới. Cùng các dependencies `package.json` gốc.

## Chạy chương trình trên Windows (PowerShell)

### Backend – Terminal 1
```powershell
cd backend
$env:ASPNETCORE_ENVIRONMENT='Development'
$env:JWT_SECRET='replace-this-with-at-least-32-random-characters-for-local-demo'
dotnet restore
dotnet run
```

### Frontend – Terminal 2
```powershell
cd frontend
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Mở `http://localhost:5173` (hoặc địa chỉ Vite hiển thị). Nếu backend chạy cổng khác, chỉnh `VITE_API_URL` trong `frontend/.env.local`.

### Tài khoản demo
- Admin: `admin@demo.local` / `Demo@12345`
- Customer: `customer@demo.local` / `Demo@12345`
- Driver: `driver@demo.local` / `Demo@12345`

### Các bước kiểm thử quan trọng
1. Customer đăng nhập, tạo đơn với hai địa chỉ và gói xe máy.
2. Driver đăng nhập ở profile trình duyệt khác, bật Online/cấp GPS và nhận đơn.
3. Driver chuyển trạng thái qua các bước; kiểm tra Customer/Admin nhận cập nhật không cần F5.
4. Chat giữa Customer/Driver; hoàn thành rồi đánh giá, tải POD (nếu cần).
5. Admin lọc đơn, xuất CSV, xem tài xế; Driver kiểm tra ví demo.
6. Chạy `npm run build` và `npm run lint` trên Windows, `dotnet test` nếu có .NET SDK.

**Lưu ý:** Trong môi trường tạo bản sửa đổi, đã kiểm tra cú pháp 26 JS/JSX và CSS nhưng không thể chạy Vite build vì `node_modules` của ZIP gốc chứa native binary dành cho Windows, không hoạt động trên Linux. Hãy chạy `npm ci` ở máy Windows để khôi phục đúng package native. Chưa xác nhận kiểm thử tích hợp end-to-end với backend đang chạy.

## Phạm vi không làm
- Chưa bổ sung quy trình giao thất bại, hoàn hàng, đối soát COD, GPS live-tracking liên tục ở backend.
- Không sao chép logo, hình ảnh thương hiệu hay mã nguồn của Ahamove. Chỉ tham khảo cấu trúc giao diện portal logistics.
- Không đổi ASP.NET Core, API, database, SignalR hoặc tên đề tài.
- Dọn các màn hình/component thử nghiệm cũ không còn được import (Dashboard cũ, Skeleton, widget chat cũ, icon/assets Vite).
