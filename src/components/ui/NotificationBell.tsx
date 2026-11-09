"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Icons } from './Icons';

export interface NotificationItem {
    id: string;
    type: 'SURVEY_OPEN' | 'CRITICAL_ALERT' | 'REVIEW_RECEIVED' | 'FEEDBACK' | 'SYSTEM';
    title: string;
    content: string;
    timestamp: string;
    isRead: boolean;
    link?: string;
    severity?: 'HIGH' | 'MEDIUM' | 'INFO';
}

interface NotificationBellProps {
    role: 'ADMIN' | 'TEACHER' | 'STUDENT';
    currentUser?: any;
    classes: any[];
    courses: any[];
    teachers: any[];
    reviews: any[];
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
    role,
    currentUser,
    classes = [],
    courses = [],
    teachers = [],
    reviews = []
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [filterMode, setFilterMode] = useState<'ALL' | 'UNREAD'>('ALL');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Đóng dropdown khi click bên ngoài
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Khởi tạo thông báo động theo role
    useEffect(() => {
        const items: NotificationItem[] = [];
        const now = new Date();

        if (role === 'STUDENT' && currentUser) {
            // 1. Thông báo cho Sinh viên
            const myCode = (currentUser.code || '').trim().toLowerCase();

            // Helper kiểm tra sinh viên đã nộp bài lớp này chưa
            const checkIfSubmitted = (classId: string) => {
                const hasInRev = reviews.some(r => 
                    (r.classId === classId || r.class_id === classId) && 
                    (r.ratings?.student_code?.trim().toLowerCase() === myCode)
                );
                if (hasInRev) return true;

                if (typeof window !== 'undefined') {
                    try {
                        const raw = localStorage.getItem(`itc_class_students_${classId}`);
                        if (raw) {
                            const list = JSON.parse(raw);
                            const st = list.find((item: any) => item.code?.trim().toLowerCase() === myCode);
                            if (st?.hasSubmitted) return true;
                        }
                    } catch {}
                }
                return false;
            };

            let pendingCount = 0;

            // Quét các lớp sinh viên theo học
            classes.forEach((c) => {
                const course = courses.find(cr => cr.id === c.courseId || cr.id === c.course_id);
                const courseName = course?.name || 'Học phần CNTT';
                const isClassOpen = c.status === 'OPEN' || c.status === 'OPEN_SURVEY';
                const submitted = checkIfSubmitted(c.id);

                if (isClassOpen && !submitted) {
                    pendingCount++;
                    items.push({
                        id: `notif_st_open_${c.id}`,
                        type: 'SURVEY_OPEN',
                        title: `Khảo sát đang mở: Lớp ${c.code}`,
                        content: `Đợt đánh giá chất lượng học phần "${courseName}" đang mở. Mời bạn vào làm bài khảo sát.`,
                        timestamp: 'Hôm nay',
                        isRead: false,
                        severity: 'HIGH',
                        link: `/survey?classId=${c.id}&studentCode=${currentUser.code}`
                    });
                } else if (submitted) {
                    items.push({
                        id: `notif_st_done_${c.id}`,
                        type: 'FEEDBACK',
                        title: `Đã hoàn thành: Lớp ${c.code}`,
                        content: `Bạn đã hoàn tất phiếu đánh giá học phần "${courseName}". Đánh giá của bạn đã được ghi nhận.`,
                        timestamp: 'Đã hoàn tất',
                        isRead: true,
                        severity: 'INFO'
                    });
                }
            });

            if (pendingCount === 0) {
                items.unshift({
                    id: `notif_st_all_done`,
                    type: 'SYSTEM',
                    title: 'Đã hoàn tất toàn bộ khảo sát học kỳ',
                    content: 'Hiện không có khảo sát nào đang chờ bạn. Khi Trung tâm ITC mở đợt khảo sát mới cho lớp của bạn, chuông thông báo sẽ sáng và gửi tin nhắn mới tại đây.',
                    timestamp: 'Hiện tại',
                    isRead: true,
                    severity: 'INFO'
                });
            } else {
                items.push({
                    id: `notif_st_reminder`,
                    type: 'SYSTEM',
                    title: 'Nhắc nhở khảo sát sinh viên',
                    content: `Bạn còn ${pendingCount} môn học cần thực hiện khảo sát trước khi kết thúc học kỳ.`,
                    timestamp: 'Hôm nay',
                    isRead: false,
                    severity: 'MEDIUM'
                });
            }

        } else if (role === 'TEACHER') {
            // 2. Thông báo cho Giảng viên
            const myTeacherId = currentUser?.id;
            const myClasses = classes.filter(c => {
                const assigned = c.teacherIds && c.teacherIds.length > 0 ? c.teacherIds : [c.teacherId];
                return assigned.includes(myTeacherId);
            });

            myClasses.forEach(c => {
                const classRev = reviews.filter(r => r.classId === c.id || r.class_id === c.id);
                if (classRev.length > 0) {
                    items.push({
                        id: `notif_tc_rev_${c.id}`,
                        type: 'REVIEW_RECEIVED',
                        title: `Nhận ${classRev.length} phiếu đánh giá mới - Lớp ${c.code}`,
                        content: `Sinh viên lớp ${c.code} vừa nộp các đánh giá mới. Bạn có thể xem nhận xét và ghi chú giải trình phản hồi.`,
                        timestamp: 'Hôm nay',
                        isRead: false,
                        severity: 'MEDIUM'
                    });
                }

                // Kiểm tra có phản hồi cần giải trình
                const badComments = classRev.filter(r => (r.comment && r.comment.length > 10) && !r.teacherNote);
                if (badComments.length > 0) {
                    items.push({
                        id: `notif_tc_bad_${c.id}`,
                        type: 'FEEDBACK',
                        title: `Ý kiến học viên cần lưu ý - Lớp ${c.code}`,
                        content: `Có ${badComments.length} ý kiến góp ý của sinh viên tại lớp ${c.code} đang chờ bạn phản hồi.`,
                        timestamp: '1 giờ trước',
                        isRead: false,
                        severity: 'HIGH'
                    });
                }
            });

            items.push({
                id: `notif_tc_maint`,
                type: 'SYSTEM',
                title: 'Bộ phận Kỹ thuật ITC thông báo bảo trì',
                content: 'Các phòng Lab 1, Lab 3 và Lab 5 đã hoàn tất kiểm tra đường truyền mạng và thiết bị chuẩn bị cho đợt thi cuối kỳ.',
                timestamp: 'Hôm qua',
                isRead: true,
                severity: 'INFO'
            });

        } else if (role === 'ADMIN') {
            // 3. Thông báo cho Trung tâm (Admin)
            // Phát hiện đánh giá điểm thấp hoặc phản ánh sự cố phòng máy
            reviews.slice(0, 15).forEach((r, idx) => {
                const isCritical = r.comment && (
                    r.comment.toLowerCase().includes('hỏng') || 
                    r.comment.toLowerCase().includes('chuột') || 
                    r.comment.toLowerCase().includes('máy') ||
                    r.comment.toLowerCase().includes('lạnh') ||
                    r.comment.toLowerCase().includes('yếu')
                );

                const c = classes.find(cls => cls.id === r.classId || cls.id === r.class_id);
                const classCode = c?.code || 'Khóa học';

                if (isCritical && idx < 4) {
                    items.push({
                        id: `notif_ad_crit_${r.id}`,
                        type: 'CRITICAL_ALERT',
                        title: `Sự cố phòng máy báo từ Lớp ${classCode}`,
                        content: `Học viên phản ánh: "${r.comment.slice(0, 80)}..." tại phòng ${c?.room || 'Lab'}. Kỹ thuật viên cần xử lý.`,
                        timestamp: `${(idx + 1) * 15} phút trước`,
                        isRead: false,
                        severity: 'HIGH'
                    });
                }
            });

            // Đánh giá mới nhận
            if (reviews.length > 0) {
                items.push({
                    id: `notif_ad_total_rev`,
                    type: 'REVIEW_RECEIVED',
                    title: `Tổng kết: Đã nhận ${reviews.length} phiếu đánh giá`,
                    content: `Toàn hệ thống trung tâm đã thu thập được ${reviews.length} lượt khảo sát từ các lớp đào tạo trong học kỳ.`,
                    timestamp: 'Hôm nay',
                    isRead: true,
                    severity: 'INFO'
                });
            }

            items.push({
                id: `notif_ad_sync`,
                type: 'SYSTEM',
                title: 'Hệ thống Cloud Supabase đồng bộ thành công',
                content: 'Toàn bộ dữ liệu lớp học, tài khoản sinh viên và đề khảo sát tùy biến đã được lưu trữ an toàn trên máy chủ.',
                timestamp: 'Hôm nay',
                isRead: true,
                severity: 'INFO'
            });
        }

        // Lấy danh sách ID đã đọc từ LocalStorage
        try {
            const storageKey = `itc_read_notifs_${role}_${currentUser?.code || currentUser?.id || 'guest'}`;
            const rawRead = localStorage.getItem(storageKey);
            const readIds: string[] = rawRead ? JSON.parse(rawRead) : [];
            const updated = items.map(it => ({
                ...it,
                isRead: readIds.includes(it.id) || it.isRead
            }));
            setNotifications(updated);
        } catch {
            setNotifications(items);
        }
    }, [role, currentUser, classes, courses, teachers, reviews]);

    // Số lượng thông báo chưa đọc
    const unreadCount = useMemo(() => {
        return notifications.filter(n => !n.isRead).length;
    }, [notifications]);

    // Đánh dấu 1 thông báo đã đọc
    const handleMarkAsRead = (id: string) => {
        const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
        setNotifications(updated);
        try {
            const storageKey = `itc_read_notifs_${role}_${currentUser?.code || currentUser?.id || 'guest'}`;
            const readIds = updated.filter(n => n.isRead).map(n => n.id);
            localStorage.setItem(storageKey, JSON.stringify(readIds));
        } catch (e) {
            console.error(e);
        }
    };

    // Đánh dấu tất cả đã đọc
    const handleMarkAllAsRead = () => {
        const updated = notifications.map(n => ({ ...n, isRead: true }));
        setNotifications(updated);
        try {
            const storageKey = `itc_read_notifs_${role}_${currentUser?.code || currentUser?.id || 'guest'}`;
            const readIds = updated.map(n => n.id);
            localStorage.setItem(storageKey, JSON.stringify(readIds));
        } catch (e) {
            console.error(e);
        }
    };

    // Lọc danh sách theo tab
    const displayList = useMemo(() => {
        if (filterMode === 'UNREAD') {
            return notifications.filter(n => !n.isRead);
        }
        return notifications;
    }, [notifications, filterMode]);

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            {/* Nút Chuông Thông Báo */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-xl transition flex items-center justify-center ${
                    isOpen 
                        ? 'bg-itc-100 text-itc-900 ring-2 ring-itc-400' 
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
                title={`Thông báo (${unreadCount} chưa đọc)`}
                aria-label="Thông báo hệ thống"
            >
                {/* Biểu tượng chuông SVG */}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>

                {/* Badge số đếm chưa đọc */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white ring-2 ring-white animate-in zoom-in-75">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Bảng Thông Báo */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
                    {/* Header */}
                    <div className="bg-slate-900 text-white p-3.5 px-4 flex items-center justify-between border-b border-slate-800">
                        <div className="flex items-center gap-2">
                            <Icons.Bell className="w-4 h-4 text-itc-300" />
                            <span className="font-bold text-sm">Thông Báo Hệ Thống</span>
                            {unreadCount > 0 && (
                                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                    {unreadCount} mới
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={handleMarkAllAsRead}
                                className="text-[11px] font-medium text-slate-300 hover:text-white underline decoration-slate-400 underline-offset-2 transition"
                            >
                                Đã đọc tất cả
                            </button>
                        )}
                    </div>

                    {/* Filter Mode Tabs */}
                    <div className="flex border-b border-slate-100 bg-slate-50 px-3 pt-2 gap-2 text-[11px]">
                        <button
                            type="button"
                            onClick={() => setFilterMode('ALL')}
                            className={`pb-2 px-2.5 font-bold border-b-2 transition ${
                                filterMode === 'ALL' 
                                    ? 'border-itc-800 text-itc-900' 
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Tất cả ({notifications.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterMode('UNREAD')}
                            className={`pb-2 px-2.5 font-bold border-b-2 transition flex items-center gap-1 ${
                                filterMode === 'UNREAD' 
                                    ? 'border-itc-800 text-itc-900' 
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Chưa đọc ({unreadCount})
                        </button>
                    </div>

                    {/* Danh sách thông báo */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {displayList.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 space-y-2">
                                <Icons.CheckCircle className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                                <p className="font-bold text-slate-600">Không có thông báo mới!</p>
                                <p className="text-[10px]">Bạn đã cập nhật đầy đủ mọi thông tin.</p>
                            </div>
                        ) : (
                            displayList.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => handleMarkAsRead(item.id)}
                                    className={`p-3.5 transition cursor-pointer hover:bg-slate-50 flex items-start gap-3 ${
                                        !item.isRead ? 'bg-indigo-50/40' : 'bg-white'
                                    }`}
                                >
                                    {/* Icon theo loại thông báo */}
                                    <div className="shrink-0 mt-0.5">
                                        {item.severity === 'HIGH' ? (
                                            <span className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs border border-rose-200">
                                                <Icons.AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                            </span>
                                        ) : item.type === 'SURVEY_OPEN' ? (
                                            <span className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs border border-amber-200">
                                                <Icons.FileText className="w-3.5 h-3.5 text-amber-700" />
                                            </span>
                                        ) : (
                                            <span className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-200">
                                                <Icons.Bell className="w-3.5 h-3.5 text-emerald-700" />
                                            </span>
                                        )}
                                    </div>

                                    {/* Nội dung thông báo */}
                                    <div className="flex-1 space-y-0.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className={`font-black text-xs ${!item.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                                                {item.title}
                                            </h4>
                                            {!item.isRead && (
                                                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-600 leading-snug">
                                            {item.content}
                                        </p>
                                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                                            <span>{item.timestamp}</span>
                                            {item.link && (
                                                <a 
                                                    href={item.link} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="font-bold text-itc-700 hover:underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    Thực hiện &rarr;
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
                        Hệ thống thông báo thời gian thực ITC Quality &bull; ĐH Đà Lạt
                    </div>
                </div>
            )}
        </div>
    );
};

