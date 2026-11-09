-- ==============================================================================
-- ITC Quality Dashboard - Supabase Database Schema
-- Trung tâm Công nghệ Thông tin - Trường Đại học Đà Lạt
-- ==============================================================================

-- 1. Bảng app_users (Quản lý Admin và Giảng viên)
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'TEACHER')),
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng courses (Danh mục Môn học / Khóa đào tạo)
CREATE TABLE IF NOT EXISTS public.courses (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng classes (Danh sách Lớp học / Đợt khảo sát)
CREATE TABLE IF NOT EXISTS public.classes (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    course_id VARCHAR(50) REFERENCES public.courses(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    schedule VARCHAR(100),
    room VARCHAR(100),
    students_count INTEGER DEFAULT 0,
    status VARCHAR(30) DEFAULT 'OPEN_SURVEY' CHECK (status IN ('OPEN_SURVEY', 'CLOSED_SURVEY')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng reviews (Ý kiến đánh giá và phản hồi của học viên)
CREATE TABLE IF NOT EXISTS public.reviews (
    id VARCHAR(100) PRIMARY KEY,
    class_id VARCHAR(50) REFERENCES public.classes(id) ON DELETE CASCADE,
    ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
    comment TEXT DEFAULT '',
    status VARCHAR(30) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
    action_note TEXT DEFAULT '',
    teacher_note TEXT DEFAULT '',
    is_escalated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Bảng survey_criteria (Bộ tiêu chí khảo sát mặc định)
CREATE TABLE IF NOT EXISTS public.survey_criteria (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed dữ liệu tiêu chí mặc định (5 nhóm tiêu chuẩn)
INSERT INTO public.survey_criteria (id, name, description, order_index, is_active)
VALUES
    ('group_1', 'Mục tiêu & Nội dung', 'Mục tiêu và nội dung khóa học (Câu 1 - 6)', 1, true),
    ('group_2', 'Giảng dạy & Đánh giá', 'Hoạt động giảng dạy và đánh giá của giảng viên (Câu 7 - 12)', 2, true),
    ('group_3', 'Cơ sở vật chất & Thiết bị', 'Cơ sở vật chất, phòng máy, điều hòa, Internet (Câu 13 - 18)', 3, true),
    ('group_4', 'Quản lý & Hỗ trợ SV', 'Công tác quản lý, thủ tục và hỗ trợ học viên (Câu 19 - 24)', 4, true),
    ('group_5', 'Kết quả & Độ hài lòng', 'Kết quả học tập và độ hài lòng chung (Câu 25 - 30)', 5, true)
ON CONFLICT (id) DO NOTHING;

-- Thiết lập Row Level Security (RLS) cơ bản
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_criteria ENABLE ROW LEVEL SECURITY;

-- Policy cho phép đọc dữ liệu công khai (cho trang khảo sát học viên và trang thông tin)
CREATE POLICY "Public Read Courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Public Read Classes" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Public Read Criteria" ON public.survey_criteria FOR SELECT USING (true);
CREATE POLICY "Public Insert Reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Public Read Users" ON public.app_users FOR SELECT USING (true);

-- Policy cho phép thao tác nếu đã đăng nhập hoặc Service Role
CREATE POLICY "Authenticated Manage Classes" ON public.classes FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated Manage Reviews" ON public.reviews FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated Manage Courses" ON public.courses FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated Manage Criteria" ON public.survey_criteria FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated Manage Users" ON public.app_users FOR ALL TO authenticated USING (true);

