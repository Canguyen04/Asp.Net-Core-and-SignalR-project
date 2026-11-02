# Tích hợp React với ASP.NET Core 8 + SignalR

Đề tài: **Nghiên cứu ASP.NET Core và SignalR** — ứng dụng quản lý và theo dõi đơn vận chuyển theo thời gian thực.



## Yêu cầu

- Windows 11, **.NET SDK 8** (`dotnet --version`), Node.js >=22, npm, PowerShell.
- Kết nối internet khi chạy `dotnet restore` / `npm install` lần đầu, và để dùng bản đồ ArcGIS/OSRM/Nominatim.

## 1. Chạy Backend (PowerShell, terminal số 1)

```powershell
cd backend
$env:ASPNETCORE_ENVIRONMENT='Development'
$env:JWT_SECRET='replace-this-with-at-least-32-random-characters-for-local-demo'
dotnet restore
dotnet run
```

- API: `http://localhost:5000/health`
- Swagger: `http://localhost:5000/swagger`
- Hub: `http://localhost:5000/hubs/logistics` (JWT bắt buộc)
- Database được tạo tự động ở `backend/logistics-week8.db` trong lần chạy đầu (development demo dùng `EnsureCreated`, **chưa có EF migration**).

## 2. Chạy Frontend (terminal số 2)

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Mở URL Vite hiển thị, thường là `http://localhost:5173`.

> Frontend dùng Axios `/api/...` và thư viện `@microsoft/signalr` kết nối Hub. Giao diện `App.jsx` đã loại `MockRoute`; các dashboard khách, tài xế, admin và OrderDetail dùng dữ liệu Backend.

## Tài khoản thử nghiệm (chỉ seed khi Development)

| Vai trò | Email | Mật khẩu |
|--|--|--|
| Admin | admin@demo.local | Demo@12345 |
| Khách hàng | customer@demo.local | Demo@12345 |
| Tài xế xe máy | driver@demo.local | Demo@12345 |

Đăng ký mới qua giao diện hỗ trợ customer, driver_express, driver_truck, driver_container. Không được đăng ký role admin từ API công khai. Tài xế phải đúng loại phương tiện với đơn.

## Demo hai cửa sổ trình duyệt

1. Cửa sổ A (hoặc profile trình duyệt riêng): `customer@demo.local`, bấm **Đặt giao hàng** rồi chọn 2 điểm bản đồ, nhập thông tin người nhận, bấm đặt. Ghi lại mã đơn.
2. Cửa sổ B: `driver@demo.local`, cho phép trình duyệt truy cập GPS rồi bật **ONLINE**, đơn mới được thông báo qua SignalR, bấm **Nhận đơn**.
3. Tài xế mở chi tiết đơn, chọn **Đã đến điểm lấy**, **Bắt đầu giao**, **Hoàn thành**. Khách thấy trạng thái mới qua SignalR mà không F5.
4. Khách/tài xế có thể chat theo đơn; admin dùng `admin@demo.local` để xem dashboard và dữ liệu thật.
5. Kiểm thử API tự động ở mức smoke: từ thư mục root chạy `powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1` sau khi Backend đã chạy.

## API chính

| Method | Endpoint | Vai trò |
|--|--|--|
| POST | `/api/auth/register`, `/api/auth/login` | Public |
| GET | `/api/users/me` | Đã đăng nhập |
| GET/POST | `/api/orders` | Theo vai trò / Customer |
| GET | `/api/orders/available` | Driver/Admin |
| GET | `/api/orders/{id}`, `/api/orders/{id}/history` | Chủ đơn/được giao/Admin |
| POST | `/api/orders/{id}/accept` | Driver phù hợp |
| PATCH | `/api/orders/{id}/status` | Driver được giao/Customer hủy pending |
| GET/POST | `/api/orders/{id}/messages` | Người liên quan |
| POST | `/api/orders/{id}/reviews` | Customer sau khi hoàn thành |
| POST/GET | `/api/orders/{id}/pod` | Driver upload / người liên quan xem |
| GET | `/api/users/{id}/transactions` | Chủ ví/Admin |
| POST | `/api/users/{id}/topup`, `/withdraw` | Chỉ mô phỏng ở Development |
| GET/POST | `/api/support/...` | Chủ tài khoản/Admin |
| GET | `/api/admin/users`, `/api/admin/summary` | Admin |
| PUT | `/api/admin/drivers/{id}/status` | Admin khóa/mở tài xế |
| GET | `/api/orders/{id}/match-suggestions` | Driver/Admin gợi ý ghép đơn |
| PUT | `/api/drivers/me/location` | Driver |

### SignalR

Hub `/hubs/logistics` sử dụng JWT, `JoinOrder` kiểm tra quyền sở hữu, groups `user_{id}`, `role_{role}`, `order_{id}`. Events: `OrderCreated`, `OrderUpdated`, `NewChatMessage`, `RealtimeEvent`. Client sử dụng `accessTokenFactory` và tự reconnect.

### Bảo mật / giới hạn

- Chưa tích hợp cổng thanh toán: nạp/rút **chỉ mô phỏng Development**, không phải tiền thật.
- Cước phí được Backend tính bằng **Haversine × 1.3**, là khoảng cách ước lượng, không phải khoảng cách OSRM thực tế. Giá trên form chỉ tham khảo; giá lưu đơn là kết quả Backend.
- Trang Admin hiển thị dữ liệu thật. Có chức năng khóa/mở tài khoản tài xế thật (kiểm tra trạng thái mỗi request). Chưa triển khai duyệt hồ sơ mới và quản lý khuyến mãi lưu database.
- Có API gợi ý cặp đơn cùng hướng (điểm lấy và giao cách nhau <=2km) nhưng **chưa triển khai nhận ghép/tối ưu tuyến thực tế**; danh sách đơn được sắp xếp theo khoảng cách GPS của tài xế.
- POD cho phép upload ảnh có phân quyền, nhưng demo **không yêu cầu ảnh để chuyển `completed`**.
- DB demo dùng SQLite/EnsureCreated; muốn production cần migration, PostgreSQL, dịch vụ lưu file bền vững, bổ sung rate limit và xác nhận thanh toán thực.
- Frontend ZIP ban đầu có `node_modules` Windows; bản này loại thư viện đã cài, cần chạy `npm install`. Không bao gồm `.env.local` hay secret.
- Chưa kiểm thử thực thi dotnet hoặc build Vite tại môi trường tạo file (thiếu .NET SDK và kết nối registry); có kiểm tra cú pháp JS/JSX. Có `.github/workflows/ci.yml` (GitHub Actions), `backend/Dockerfile`, `tests/` (xUnit) và `scripts/smoke-test.ps1`, cần chạy trên máy có .NET SDK.

## Cập nhật frontend MoveFlow (giao diện mới)

Frontend đã được thiết kế lại theo hướng cổng quản lý vận chuyển hiện đại với các không gian Customer, Driver và Admin. Xem `UI_FRONTEND_CHANGELOG.md` để biết màn hình, nghiệp vụ giữ nguyên và hướng dẫn chạy/test. Backend ASP.NET Core 8 và SignalR không thay đổi.
