import { Course, Teacher, ClassInfo, CriteriaCategory, Review } from '../types';

export const INITIAL_COURSES: Course[] = [
    { id: 'crs_1', code: 'IT-BASIC', name: 'Tin học cơ bản' },
    { id: 'crs_2', code: 'IT-ADV', name: 'Tin học Nâng cao' },
    { id: 'crs_3', code: 'WEB-DEV', name: 'Lập trình Web Frontend' },
    { id: 'crs_4', code: 'DATA-ANALYTICS', name: 'Phân tích dữ liệu với Python' }
];

export const INITIAL_TEACHERS: Teacher[] = [
    { id: 'tch_1', code: 'GV01', name: 'PGS. TS. Nguyễn Thanh Tùng', email: 'thanhtung@dlu.edu.vn' },
    { id: 'tch_2', code: 'GV02', name: 'TS. Lê Hoàng Nam', email: 'hoangnam@dlu.edu.vn' },
    { id: 'tch_3', code: 'GV03', name: 'ThS. Trần Phương Thảo', email: 'phuongthao@dlu.edu.vn' },
    { id: 'tch_4', code: 'GV04', name: 'TS. Huỳnh Minh Trí', email: 'minhtri@dlu.edu.vn' },
    { id: 'tch_5', code: 'GV05', name: 'ThS. Phạm Quỳnh Anh', email: 'quynhanh@dlu.edu.vn' }
];

export const INITIAL_CLASSES: ClassInfo[] = [
    { id: 'cls_1', code: 'ITC_24_01', courseId: 'crs_1', teacherId: 'tch_1', schedule: 'Tối 2-4-6', room: 'Phòng Máy 1', studentsCount: 45, status: 'OPEN_SURVEY' },
    { id: 'cls_2', code: 'ITC_24_02', courseId: 'crs_2', teacherId: 'tch_2', schedule: 'Chiều 3-5', room: 'Phòng Máy 2', studentsCount: 30, status: 'OPEN_SURVEY' },
    { id: 'cls_3', code: 'ITC_24_03', courseId: 'crs_3', teacherId: 'tch_1', schedule: 'Sáng 7-CN', room: 'Phòng Lab 3', studentsCount: 25, status: 'CLOSED_SURVEY' }
];

export const CRITERIA_CATEGORIES: CriteriaCategory[] = [
    { id: 'facility', name: '1. Cơ sở vật chất', desc: 'Máy tính, phần mềm, mạng Internet, điều hòa...' },
    { id: 'environment', name: '2. Môi trường học tập', desc: 'Sự yên tĩnh, vệ sinh phòng máy, ánh sáng...' },
    { id: 'curriculum', name: '3. Tài liệu & Giáo trình', desc: 'Mức độ cập nhật, tính thực tiễn, tính ứng dụng...' },
    { id: 'teaching_method', name: '4. Phương pháp giảng dạy', desc: 'Cách truyền đạt, hướng dẫn thực hành của GV...' },
    { id: 'teaching_attitude', name: '5. Tác phong Giảng viên', desc: 'Sự nhiệt tình, đúng giờ, hỗ trợ học viên...' },
    { id: 'center_service', name: '6. Dịch vụ hỗ trợ ITC', desc: 'Thái độ nhân viên, quy trình thủ tục, giải đáp...' }
];

export const INITIAL_REVIEWS: Review[] = [
    { id: 'rev_1', classId: 'cls_1', ratings: { facility: 4, environment: 5, curriculum: 4, teaching_method: 5, teaching_attitude: 5, center_service: 4 }, comment: '', status: 'RESOLVED', actionNote: '', createdAt: '2024-03-01 14:30' },
    { id: 'rev_2', classId: 'cls_1', ratings: { facility: 2, environment: 4, curriculum: 4, teaching_method: 4, teaching_attitude: 4, center_service: 4 }, comment: 'Máy số 15 bị lỗi màn hình xanh liên tục.', status: 'IN_PROGRESS', actionNote: 'Đã báo KTV kiểm tra lại RAM máy 15', createdAt: '2024-03-02 09:15' },
    { id: 'rev_3', classId: 'cls_2', ratings: { facility: 1, environment: 2, curriculum: 5, teaching_method: 5, teaching_attitude: 5, center_service: 4 }, comment: 'Điều hòa phòng máy 2 hỏng, rất nóng. Mạng chập chờn.', status: 'OPEN', actionNote: '', createdAt: '2024-03-03 18:45' }
];
