# BẢNG PHÂN CÔNG NHIỆM VỤ & KHỐI LƯỢNG CÔNG VIỆC THỰC HIỆN ĐỀ TÀI
## ĐỀ TÀI: HỆ THỐNG KHẢO SÁT & ĐÁNH GIÁ CHẤT LƯỢNG ĐÀO TẠO (ITC QUALITY DASHBOARD)
**Đơn vị thực hiện:** Trung tâm Công nghệ Thông tin – Trường Đại học Đà Lạt (ITC - DLU)  
**Công nghệ:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS, Supabase (PostgreSQL, RLS)

---

## 1. BẢNG TỔNG HỢP PHÂN CÔNG THEO THÀNH VIÊN

| STT | MSSV | Họ và Tên | Vai trò chính | Mảng phụ trách chính | Sản phẩm bàn giao & Kết quả | Tỷ lệ đóng góp |
| :---: | :---: | :--- | :--- | :--- | :--- | :---: |
| **1** | **2212436** | **Phan Thành Phát** | **Nhóm trưởng**<br/>(Project Lead & Full-stack) | • Quản lý chung tiến độ đề tài & kiến trúc hệ thống<br/>• Phân hệ Quản trị viên (Admin Dashboard)<br/>• Sơ đồ Ma trận Phòng máy (Interactive Seat Map)<br/>• Báo cáo tóm tắt điều hành 1 trang (One-Pager)<br/>• Quản trị Git, CI/CD và triển khai | • Kiến trúc dự án Next.js 16 + Supabase<br/>• Dashboard Admin đa chức năng<br/>• Modal Sơ đồ 32 máy Lab 5 & CSVC<br/>• Màn hình Báo cáo One-Pager<br/>• Kho mã nguồn GitHub chuẩn hóa | **100%**<br/>*(Hoàn thành tốt)* |
| **2** | **2212398** | **Nguyễn Hoàng Kiệt** | **Thành viên**<br/>(Frontend Developer / UI-UX) | • Cổng khảo sát sinh viên trực tiếp (`/survey`)<br/>• Tối ưu trải nghiệm làm bài (Phím tắt 1-5, Auto-jump)<br/>• Phân hệ Giảng viên (Teacher Dashboard)<br/>• Tích hợp Chỉ số Đối chuẩn môn học (Benchmark)<br/>• Chuẩn hóa giao diện người dùng, loại bỏ icon thừa | • Giao diện làm bài khảo sát chuẩn Likert<br/>• Bộ xử lý phím tắt số 1 - 5 (< 2 phút)<br/>• Dashboard Giảng viên theo môn & lớp<br/>• Hiển thị so sánh đối chuẩn (± delta)<br/>• Thiết kế UI hiện đại, chuẩn Responsive | **100%**<br/>*(Hoàn thành tốt)* |
| **3** | **2212430** | **Nguyễn Thành Nhân** | **Thành viên**<br/>(Backend & Database Developer) | • Thiết kế CSDL PostgreSQL trên Supabase<br/>• Xây dựng các API Route Handlers (Auth, Courses, Paginate)<br/>• Thuật toán phân loại nhận xét tự động (NLP)<br/>• Luồng xử lý phàn nàn & biên bản giải trình<br/>• Thiết lập chính sách bảo mật dữ liệu RLS | • Lược đồ CSDL `supabase_schema.sql`<br/>• Bộ API backend xử lý bất đồng bộ<br/>• Module phân loại 3 nhóm NLP nhận xét<br/>• Workflow xử lý sự cố 3 trạng thái<br/>• Bảo mật dữ liệu & ẩn danh khảo sát | **100%**<br/>*(Hoàn thành tốt)* |
| **4** | **2212386** | **Phan Thanh Khải** | **Thành viên**<br/>(QA / Tester & Documentation) | • Xây dựng bộ dữ liệu mẫu (50 SV, 30 câu hỏi, GV)<br/>• Lập kế hoạch & kịch bản kiểm thử (Test Cases)<br/>• Kiểm thử chức năng, giao diện và hiệu năng build<br/>• Soạn thảo tài liệu thuyết minh đồ án / báo cáo<br/>• Chuẩn bị slide thuyết trình và kịch bản demo | • Bộ file dữ liệu mẫu (.csv, .xlsx)<br/>• Bảng kịch bản kiểm thử toàn diện<br/>• File thuyết minh báo cáo đồ án (.md/.docx)<br/>• Bộ Slide thuyết trình đề tài<br/>• Video / Kịch bản demo hệ thống | **100%**<br/>*(Hoàn thành tốt)* |

---

## 2. CHI TIẾT CÔNG VIỆC CỦA TỪNG THÀNH VIÊN

### 👤 1. Phan Thành Phát (MSSV: 2212436) - Nhóm trưởng
* **Trách nhiệm điều phối:**
  * Khảo sát yêu cầu thực tế từ Trung tâm ITC – Trường Đại học Đà Lạt.
  * Phân chia module công việc, theo dõi tiến độ tuần và hợp nhất mã nguồn (Code Review, Merge).
  * Khởi tạo và quản trị kho lưu trữ GitHub (`https://github.com/2212436PTP/ThucTapNN`).
* **Nhiệm vụ kỹ thuật chuyên trách:**
  * **Kiến trúc ứng dụng:** Xây dựng khung ứng dụng Next.js 16 (App Router), tích hợp TypeScript nghiêm ngặt và Tailwind CSS v4.
  * **Phân hệ Quản trị viên (AdminView):**
    * Bảng điều khiển KPI tổng thể (Tổng phiếu, Điểm hài lòng trung bình, Cảnh báo tiêu chí thấp).
    * Thanh điều hướng 4 Tab chuẩn mực: Bảng điều khiển, Đánh giá & Phàn nàn, Quản lý Lớp học, Quản lý Giảng viên.
    * Quản lý lớp học: Sinh mã lớp ngẫu nhiên (`ITC_YYYY_xxxx`), phân công 1-3 giảng viên, thanh cuộn chọn phòng và lịch học tránh trùng lặp.
  * **Trung tâm Điều hành Phòng máy & Cơ sở vật chất (Lab & Facility Hub):**
    * Xây dựng sơ đồ lưới ma trận 32 máy tính ($4 \text{ dãy} \times 8 \text{ máy}$) cho các phòng Lab 5, Lab 1, Lab 2, Lab 6, A24.
    * Cơ chế cảnh báo màu sắc: Xanh (tốt), Vàng (mạng chập chờn), Đỏ nhấp nháy (hỏng phần cứng).
    * Tích hợp tab Cảnh báo Bảo trì: bộ chỉnh ngưỡng sao (2.0 – 4.0), phân loại vật tư và xuất báo cáo CSV hiện trạng máy tính.
  * **Báo cáo Tóm tắt Điều hành 1 Trang (Executive One-Pager):**
    * Thiết kế màn hình One-Pager mở mặc định khi bấm "Xuất Báo Cáo" với 3 khối: Top 3 Giảng viên xuất sắc, Top 3 lớp cần hỗ trợ, Thiết bị phòng máy cần bảo dưỡng.
  * **Nhật ký Kiểm toán Hệ thống (Audit Logs):**
    * Ghi nhận lịch sử quản trị (sửa cấu hình đề, cập nhật biên bản máy, thêm/xóa lớp).

---

### 👤 2. Nguyễn Hoàng Kiệt (MSSV: 2212398) - Giao diện & Trải nghiệm Người dùng
* **Nhiệm vụ kỹ thuật chuyên trách:**
  * **Cổng Khảo sát Sinh viên (`/survey`):**
    * Thiết kế giao diện form đánh giá Likert 5 mức độ trực quan, thân thiện cho sinh viên trường Đại học Đà Lạt.
    * Bố cục 30 câu hỏi chuẩn kiểm định phân thành 5 nhóm nội dung rõ ràng kèm thanh tiến độ thực tế (ví dụ: `30/30 câu`).
    * Loại bỏ các bước thừa: không cần quét lại mã QR khi sinh viên đã đăng nhập đúng tài khoản lớp học.
  * **Tối ưu hóa Tốc độ Làm bài (UX Optimization):**
    * Lập trình phím tắt bàn phím: bấm phím `1`, `2`, `3`, `4`, `5` để chọn điểm số tương ứng.
    * Cơ chế tự động nhảy sang câu hỏi tiếp theo ngay sau khi bấm chọn điểm, giúp rút ngắn thời gian hoàn thành bài khảo sát xuống dưới 2 phút.
    * Hỗ trợ 2 chế độ xem: Cuộn toàn trang hoặc Từng bước (Wizard).
  * **Phân hệ Giảng viên (TeacherView):**
    * Xây dựng màn hình theo dõi chất lượng giảng dạy dành riêng cho từng thầy/cô.
    * Hiển thị điểm trung bình của lớp theo từng tiêu chí kèm danh sách ý kiến học viên.
    * Tích hợp **Chỉ số Đối chuẩn (Benchmark)**: Tự động so sánh điểm lớp của GV với điểm trung bình của toàn bộ môn học đó trong hệ thống (hiển thị độ lệch $\pm\Delta$ màu xanh/đỏ).
  * **Chuẩn hóa Thẩm mỹ Giao diện (UI Polishing):**
    * Loại bỏ các icon/emoji không cần thiết, chuyển đổi sang phong cách thiết kế phẳng, chuyên nghiệp.
    * Bỏ các ký hiệu `%` phần trăm, thay thế bằng thanh tiến độ và số lượng thực tế.

---

### 👤 3. Nguyễn Thành Nhân (MSSV: 2212430) - Cơ sở Dữ liệu & Xử lý Backend
* **Nhiệm vụ kỹ thuật chuyên trách:**
  * **Thiết kế & Quản trị CSDL (Database Architecture):**
    * Xây dựng lược đồ quan hệ PostgreSQL trên Supabase (`supabase_schema.sql`): các bảng `classes`, `courses`, `teachers`, `surveys`, `survey_reviews`, `app_users`, `survey_criteria`, `audit_logs`.
    * Cài đặt chỉ mục (Indexing) và khóa ngoại để tăng tốc độ truy vấn cho các đợt khảo sát hàng nghìn lượt gửi.
    * Cấu hình chính sách bảo mật cấp hàng (Row Level Security - RLS) để bảo vệ dữ liệu điểm số và đảm bảo tính ẩn danh tuyệt đối cho sinh viên.
  * **Phát triển Backend & API Handlers:**
    * Xây dựng các API Route Server: `/api/auth/create-teacher`, `/api/auth/delete-teacher`, `/api/courses`, `/api/reviews/paginate`.
    * Xử lý đồng bộ dữ liệu Realtime giữa Client và Supabase Cloud.
  * **Module Xử lý Phân loại Nhận xét Tự động (NLP Classifier):**
    * Xây dựng thuật toán phân tích từ khóa và ngữ cảnh tiếng Việt trong ý kiến sinh viên thành 3 nhóm:
      1. *Phương pháp giảng dạy* (dạy nhanh/chậm, dễ hiểu, bài tập, thực hành).
      2. *Thái độ & Tác phong* (nhiệt tình, giải đáp thắc mắc, giờ giấc).
      3. *Cơ sở vật chất & Phòng máy* (máy tính, chuột, bàn phím, điều hòa, Wi-Fi).
  * **Luồng Xử lý Phàn nàn & Báo cáo Khẩn cấp:**
    * Phát triển quy trình xử lý sự cố 3 bước: `Chờ tiếp nhận` $\rightarrow$ `Đang kiểm tra` $\rightarrow$ `Đã khắc phục`.
    * Chức năng Giảng viên báo cáo khẩn cấp lên Admin (`GV BÁO CÁO ADMIN`) kèm biên bản giải trình kỹ thuật.

---

### 👤 4. Phan Thanh Khải (MSSV: 2212386) - Kiểm thử, Dữ liệu & Tài liệu Báo cáo
* **Nhiệm vụ kỹ thuật chuyên trách:**
  * **Quản trị Dữ liệu Thử nghiệm (Test Data Engineering):**
    * Chuẩn bị danh sách 50 sinh viên mẫu chuẩn định dạng ĐH Đà Lạt (MSSV từ `2110501` đến `2110550`, Họ tên, Email DLU).
    * Chuẩn bị ngân hàng 30 câu hỏi khảo sát chuẩn Likert và các file mẫu import/export định dạng `.csv`, `.xlsx`.
    * Quản lý bộ dữ liệu phòng máy thực tế (Lab 1, Lab 2, Lab 5, Lab 6, A24) phục vụ kiểm thử sơ đồ 32 máy trạm.
  * **Kiểm thử Hệ thống (Quality Assurance & Testing):**
    * Xây dựng Kế hoạch kiểm thử (Test Plan) và Bộ kịch bản kiểm thử chi tiết (Test Cases).
    * Thực hiện kiểm thử toàn diện:
      * *Kiểm thử chức năng (Functional Testing):* Luồng nộp bài khảo sát, luồng tạo lớp ngẫu nhiên mã, phân công giảng viên, chuyển tab và lọc dữ liệu.
      * *Kiểm thử giao diện & thiết bị (Responsive Testing):* Hiển thị tốt trên Laptop, Tablet và Smartphone.
      * *Kiểm thử biên & tính toán (Calculation Testing):* Kiểm tra công thức tính điểm trung bình, độ lệch Benchmark, điểm cơ sở vật chất.
      * *Kiểm tra hiệu năng build:* Xác nhận `next build` Turbopack đạt dưới 2 giây, không có lỗi TypeScript (`0 errors`).
  * **Soạn thảo Hồ sơ Báo cáo Đề tài:**
    * Soạn thảo tài liệu Thuyết minh Đồ án / Báo cáo Thực tập nghề nghiệp.
    * Biên soạn Hướng dẫn cài đặt & triển khai mã nguồn chi tiết cho người dùng và hội đồng chấm thi.
    * Thiết kế slide thuyết trình (NotebookLM / PowerPoint) và xây dựng kịch bản demo trực tiếp các phân hệ Admin, Giảng viên, Sinh viên.

---

## 3. MA TRẬN PHÂN CHIA TRÁCH NHIỆM (RACI MATRIX)

> **Ghi chú:**  
> - **R (Responsible):** Người trực tiếp thực hiện chính.  
> - **A (Accountable):** Người chịu trách nhiệm phê duyệt cuối cùng.  
> - **C (Consulted):** Người đóng góp ý kiến chuyên môn.  
> - **I (Informed):** Người được thông báo kết quả.

| Hạng mục / Module công việc | Phan Thành Phát (Lead) | Nguyễn Hoàng Kiệt | Nguyễn Thành Nhân | Phan Thanh Khải |
| :--- | :---: | :---: | :---: | :---: |
| **1. Khảo sát & Thiết kế kiến trúc tổng thể** | **A / R** | C | C | I |
| **2. Thiết kế CSDL & Viết API Backend** | C | I | **A / R** | C |
| **3. Cổng làm bài Khảo sát & Phím tắt 1-5** | I | **A / R** | C | C |
| **4. Phân hệ Giảng viên & Chỉ số Benchmark** | I | **A / R** | C | C |
| **5. Sơ đồ Ma trận Phòng máy 32 ghế ngồi** | **A / R** | C | C | I |
| **6. Phân nhóm nhận xét NLP & Biên bản sự cố** | C | I | **A / R** | C |
| **7. Quản lý Lớp học, Môn học & 50 Sinh viên** | **A / R** | C | C | I |
| **8. Báo cáo One-Pager & Nhật ký Audit Logs** | **A / R** | I | I | C |
| **9. Kiểm thử (Unit, Integration, System Test)** | C | C | C | **A / R** |
| **10. Báo cáo Thuyết minh, Slide & Video Demo** | A | C | C | **R** |
| **11. Đóng gói mã nguồn Git & Triển khai Host** | **A / R** | I | I | I |

---

## 4. KẾT LUẬN & ĐÁNH GIÁ CHUNG
* Khối lượng công việc được phân chia **cân đối, rõ ràng và đúng chuyên môn** của từng thành viên.
* Toàn bộ 4 thành viên đều tham gia tích cực từ khâu phân tích thiết kế, lập trình đến kiểm thử và đóng gói sản phẩm. Đánh giá hoàn thành: **100% Khối lượng công việc đề ra.**
