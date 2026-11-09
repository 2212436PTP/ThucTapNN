# ITC Quality Dashboard - Hệ thống Đánh giá Chất lượng Giảng dạy & Khảo sát Học viên

> **Đồ án Tốt nghiệp / Dự án Quản lý Chất lượng Đào tạo**  
> **Đơn vị thực hiện**: Trung tâm Công nghệ Thông tin – Trường Đại học Đà Lạt (ITC - DLU)

---

## 📌 Giới thiệu dự án

**ITC Quality Dashboard** là nền tảng quản trị và đánh giá chất lượng đào tạo toàn diện dành cho Trung tâm Tin học. Hệ thống cung cấp giải pháp khép kín từ khâu thu thập ý kiến học viên qua form khảo sát trực tuyến/QR Code đến phân tích dữ liệu đa chiều, cảnh báo điểm nóng bảo trì cơ sở vật chất (máy tính, điều hòa, Wi-Fi) và quản trị quy trình khắc phục ý kiến phản ánh.

---

## 🚀 Công nghệ sử dụng

- **Frontend & Fullstack**: Next.js 16 (App Router, Turbopack), React 19, TypeScript 5
- **Styling & UI**: Tailwind CSS v4, Lucide Icons, Modern Responsive Design
- **Cơ sở dữ liệu & Xác thực**: Supabase (PostgreSQL, Supabase Auth, Row Level Security)
- **Tiện ích mở rộng**: `qrcode.react` (Tạo mã QR khảo sát trực tiếp cho từng phòng/lớp)

---

## 👥 Các phân hệ & Vai trò người dùng

### 1. Học viên (Sinh viên) - Cổng Khảo Sát (`/survey`)
- Quét mã QR hoặc truy cập link khảo sát theo từng lớp học.
- Trả lời phiếu đánh giá theo thang đo Likert (1 - 5 điểm) với 5 nhóm tiêu chuẩn:
  1. Mục tiêu và Nội dung khóa học (Câu 1 - 6)
  2. Hoạt động Giảng dạy và Đánh giá (Câu 7 - 12)
  3. Cơ sở vật chất, Thiết bị & Phòng máy (Câu 13 - 18)
  4. Công tác Quản lý và Hỗ trợ học viên (Câu 19 - 24)
  5. Kết quả học tập và Mức độ hài lòng (Câu 25 - 30)
- Gửi phản ánh cụ thể về sự cố phòng máy, máy móc hỏng, điều hòa, mạng chập chờn.
- Tự động nhảy câu và hỗ trợ phím tắt số 1 - 5 để rút ngắn thời gian làm bài dưới 2 phút.

### 2. Quản lý Trung tâm (Admin Dashboard - `/`)
- **Tổng quan KPI**: Tổng lượt khảo sát, điểm trung bình toàn trung tâm, số lượng sự cố cơ sở vật chất cần xử lý khẩn.
- **Giám sát sức khỏe phòng máy (Room Facility Health)**: Thống kê chi tiết theo từng phòng học (Điểm PC, Wi-Fi, Điều hòa, số sự cố).
- **Hệ thống Cảnh báo Bảo trì & Điểm nóng**: Tự động phát hiện các tiêu chí < ngưỡng cảnh báo (Warning Threshold).
- **Quy trình Xử lý phản hồi (Complaint Workflow)**: Theo dõi tiến độ từ `OPEN` -> `IN_PROGRESS` -> `RESOLVED`.
- **Quản lý Đợt khảo sát & Lớp học**: Tạo lớp mới, gán 1 - 3 giảng viên, quản lý niên khóa, bật/tắt nhận bài khảo sát, tạo mã QR.
- **Cấu hình khảo sát linh hoạt**: Bật/tắt câu hỏi theo lớp, thêm câu hỏi tùy chỉnh vào ngân hàng câu hỏi.
- **Quản lý Môn học & Giảng viên**: Thêm mới, phân quyền, cấp tài khoản truy cập.
- **Xuất Báo cáo**: Xuất báo cáo chất lượng đào tạo và điểm nóng kỹ thuật phục vụ Ban Giám đốc.

### 3. Giảng viên (Teacher Dashboard)
- Giám sát điểm đánh giá các lớp do mình trực tiếp giảng dạy.
- Lọc theo môn học và niên khóa.
- Xem chi tiết phản hồi của học viên.
- Thêm ghi chú xử lý của giảng viên (Teacher Note).
- Chức năng **Báo cáo khẩn cấp lên Admin (Escalate)** đối với các sự cố phòng máy nghiêm trọng.
- Chủ động cấu hình bộ câu hỏi khảo sát bổ sung cho lớp mình.

---

## 🛠️ Hướng dẫn cài đặt & Khởi chạy

### Bước 1: Cài đặt thư viện dependencies
```bash
npm install
```

### Bước 2: Cấu hình biến môi trường
Tạo file `.env.local` tại thư mục gốc của dự án (tham khảo mẫu tại `.env.example`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
```

### Bước 3: Khởi tạo cơ sở dữ liệu trên Supabase
Mở tab **SQL Editor** trên trang quản trị Supabase và chạy nội dung trong file `supabase_schema.sql` đã chuẩn bị sẵn trong mã nguồn.

### Bước 4: Chạy ứng dụng trong môi trường phát triển (Development)
```bash
npm run dev
```
Truy cập: **[http://localhost:3000](http://localhost:3000)**

### Bước 5: Build kiểm tra sản phẩm (Production Build)
```bash
npm run build
npm run start
```

---

## 📂 Cấu trúc thư mục mã nguồn

```
itc-quality-main/
├── src/
│   ├── app/
│   │   ├── api/                    # API Route Handlers (Courses, Auth, Paginate)
│   │   ├── survey/                 # Cổng khảo sát sinh viên trực tiếp
│   │   ├── layout.tsx              # Root Layout
│   │   ├── page.tsx                # Trang chủ điều hướng chính (Admin, Giảng viên, Sinh viên)
│   │   └── globals.css             # CSS toàn cục & Tailwind config
│   ├── components/
│   │   ├── modals/                 # Các cửa sổ chức năng (Báo cáo, Tạo lớp, Sửa môn, v.v.)
│   │   ├── ui/                     # Icons & UI elements
│   │   └── views/                  # Giao diện chính (AdminView, TeacherView, LoginView)
│   ├── data/                       # Dữ liệu khởi tạo & mẫu
│   ├── lib/                        # Thư viện xử lý logic tính toán, Supabase client
│   └── types/                      # Định nghĩa kiểu dữ liệu TypeScript
├── supabase_schema.sql             # Script SQL tạo bảng & phân quyền Supabase
├── .env.example                    # File mẫu cấu hình biến môi trường
└── package.json
```
