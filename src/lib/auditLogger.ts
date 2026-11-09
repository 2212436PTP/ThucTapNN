/**
 * Module quản lý Nhật ký Thao tác Hệ thống (System Audit Logs)
 * Ghi vết toàn bộ hành vi quản trị: cấu hình đề khảo sát, thêm/sửa sinh viên,
 * giải trình giảng viên, biên bản kỹ thuật viên phòng máy.
 */

export interface AuditLogItem {
    id: string;
    timestamp: string;
    actor: string;
    role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'SYSTEM';
    action: string;
    actionLabel: string;
    target: string;
    details: string;
    badgeClass?: string;
}

const STORAGE_KEY = 'itc_audit_logs';

const INITIAL_LOGS: AuditLogItem[] = [
    {
        id: 'log_001',
        timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        actor: 'Ban Quản Trị ITC (admin@dlu.edu.vn)',
        role: 'ADMIN',
        action: 'UPDATE_MAINTENANCE_STATUS',
        actionLabel: 'Xử lý sự cố phòng máy',
        target: 'Máy 14 - Phòng Lab 5',
        details: 'Kỹ thuật viên đã thay chuột quang và kiểm tra lại cáp mạng RJ45, máy hoạt động ổn định.',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    },
    {
        id: 'log_002',
        timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        actor: 'PGS. TS. Nguyễn Thanh Tùng (gv.tungnt@dlu.edu.vn)',
        role: 'TEACHER',
        action: 'UPDATE_TEACHER_NOTE',
        actionLabel: 'Ghi chú giải trình GV',
        target: 'Lớp 2027 (Tin học cơ bản)',
        details: 'Đã giải thích với học viên về phương pháp tính điểm thực hành và tăng cường bài tập nhóm.',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200'
    },
    {
        id: 'log_003',
        timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        actor: 'Ban Quản Trị ITC (admin@dlu.edu.vn)',
        role: 'ADMIN',
        action: 'UPDATE_STUDENTS_COUNT',
        actionLabel: 'Cập nhật sĩ số lớp',
        target: 'Lớp ITC_2026 (Tin học cơ bản)',
        details: 'Điều chỉnh sĩ số lớp học lên 30 học viên theo quy chế HK1 2025-2026.',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-200'
    },
    {
        id: 'log_004',
        timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
        actor: 'ThS. Nguyễn Ngọc Hà (gv.hannt@dlu.edu.vn)',
        role: 'TEACHER',
        action: 'CONFIG_SURVEY_QUESTIONS',
        actionLabel: 'Cấu hình đề khảo sát',
        target: 'Lớp ITC_2025 (Tin học cơ bản)',
        details: 'Kích hoạt bộ câu hỏi tiêu chuẩn 30 câu bao gồm đánh giá phòng máy thực hành.',
        badgeClass: 'bg-purple-50 text-purple-800 border-purple-200'
    },
    {
        id: 'log_005',
        timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        actor: 'Ban Quản Trị ITC (admin@dlu.edu.vn)',
        role: 'ADMIN',
        action: 'EXPORT_REPORT',
        actionLabel: 'Xuất báo cáo định kỳ',
        target: 'Toàn bộ các lớp HK1 2025-2026',
        details: 'Xuất báo cáo PDF chi tiết đánh giá chất lượng gửi Ban Giám hiệu Trường ĐH Đà Lạt.',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200'
    }
];

export function getAuditLogs(): AuditLogItem[] {
    if (typeof window === 'undefined') return INITIAL_LOGS;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_LOGS));
            return INITIAL_LOGS;
        }
        return JSON.parse(stored);
    } catch (e) {
        console.error('Lỗi đọc audit logs:', e);
        return INITIAL_LOGS;
    }
}

export function addAuditLog(entry: {
    actor: string;
    role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'SYSTEM';
    action: string;
    actionLabel: string;
    target: string;
    details: string;
}): AuditLogItem {
    const newItem: AuditLogItem = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toISOString(),
        ...entry,
        badgeClass: entry.role === 'ADMIN' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : entry.role === 'TEACHER'
            ? 'bg-blue-50 text-blue-800 border-blue-200'
            : 'bg-slate-100 text-slate-800 border-slate-200'
    };

    if (typeof window !== 'undefined') {
        try {
            const current = getAuditLogs();
            const updated = [newItem, ...current].slice(0, 100); // giữ 100 log mới nhất
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
            console.error('Lỗi ghi audit log:', e);
        }
    }

    return newItem;
}

export function clearAuditLogs(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
    }
}

