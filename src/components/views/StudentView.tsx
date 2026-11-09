"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Icons } from '../ui/Icons';
import { getClassStudents } from '../../lib/classMetaStorage';

interface StudentViewProps {
    currentUser: any;
    classes: any[];
    courses: any[];
    teachers: any[];
    reviews: any[];
    appUsers: any[];
}

export const StudentView: React.FC<StudentViewProps> = ({
    currentUser,
    classes,
    courses,
    teachers,
    reviews,
    appUsers
}) => {
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

    // Tìm tất cả các lớp học có mặt sinh viên hiện tại
    const enrolledClasses = useMemo(() => {
        if (!currentUser?.code) return [];

        const myCode = currentUser.code.trim().toLowerCase();
        const myEmail = (currentUser.email || '').trim().toLowerCase();

        return classes.map(c => {
            const course = courses.find(cr => cr.id === c.courseId || cr.id === c.course_id);
            const assignedIds = c.teacherIds && c.teacherIds.length > 0 ? c.teacherIds : (c.teacherId ? [c.teacherId] : []);
            const assignedTeachers = teachers.filter((t: any) => assignedIds.includes(t.id));
            const teacherNames = assignedTeachers.length > 0 
                ? assignedTeachers.map((t: any) => t.name).join(', ') 
                : 'Giảng viên ITC';

            // Lấy danh sách sinh viên lớp để kiểm tra sinh viên có trong lớp không và đã nộp chưa
            const classRev = reviews.filter(r => r.classId === c.id || r.class_id === c.id);
            const studentUsers = appUsers.filter(u => u.role === 'STUDENT');
            const roster = getClassStudents(c.id, c.studentsCount || 30, studentUsers, classRev);

            // Kiểm tra sinh viên có trong roster không
            const myRecord = roster.find(s => 
                s.code.toLowerCase() === myCode || 
                (s.email && s.email.toLowerCase() === myEmail)
            );

            // Kiểm tra thêm trực tiếp từ reviews của lớp
            const hasInReviewsDirectly = classRev.some(r => r.ratings?.student_code?.toLowerCase() === myCode);
            const isEnrolled = Boolean(myRecord);
            const hasSubmitted = Boolean(myRecord?.hasSubmitted) || hasInReviewsDirectly;
            const submittedAt = myRecord?.submittedAt;
            const score = myRecord?.score;
            const isSurveyOpen = c.status === 'OPEN' || c.status === 'OPEN_SURVEY';

            return {
                ...c,
                courseName: course?.name || 'Học phần Công nghệ Thông tin',
                teacherNames,
                isEnrolled,
                hasSubmitted,
                submittedAt,
                score,
                isSurveyOpen
            };
        }).filter(c => c.isEnrolled);
    }, [classes, courses, teachers, reviews, appUsers, currentUser]);

    // Thống kê tiến độ cá nhân của sinh viên
    const stats = useMemo(() => {
        const total = enrolledClasses.length;
        const pending = enrolledClasses.filter(c => c.isSurveyOpen && !c.hasSubmitted).length;
        const completed = enrolledClasses.filter(c => c.hasSubmitted).length;
        return { total, pending, completed };
    }, [enrolledClasses]);

    // Lọc danh sách lớp hiển thị
    const filteredClasses = useMemo(() => {
        return enrolledClasses.filter(c => {
            if (filterTab === 'PENDING' && (!c.isSurveyOpen || c.hasSubmitted)) return false;
            if (filterTab === 'COMPLETED' && !c.hasSubmitted) return false;

            if (searchKeyword.trim()) {
                const kw = searchKeyword.toLowerCase().trim();
                const matchName = c.courseName.toLowerCase().includes(kw);
                const matchCode = c.code.toLowerCase().includes(kw);
                const matchRoom = (c.room || '').toLowerCase().includes(kw);
                const matchTeacher = c.teacherNames.toLowerCase().includes(kw);
                if (!matchName && !matchCode && !matchRoom && !matchTeacher) return false;
            }

            return true;
        });
    }, [enrolledClasses, filterTab, searchKeyword]);

    return (
        <div className="flex-1 bg-slate-50 p-4 sm:p-6 lg:p-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Banner Chào mừng & Thông tin Sinh viên */}
                <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-lg border border-slate-800">
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                                <span className="text-xl font-black text-amber-300">
                                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'S'}
                                </span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                                        Cổng Sinh viên Chính quy
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        Niên khóa 2025 - 2026
                                    </span>
                                </div>
                                <h1 className="text-xl sm:text-2xl font-black mt-1 text-white">
                                    Xin chào, {currentUser?.name || 'Sinh viên'}!
                                </h1>
                                <p className="text-xs text-slate-300 mt-0.5">
                                    MSSV: <b className="text-amber-300 font-mono text-sm">{currentUser?.code || '---'}</b> | Email: <b>{currentUser?.email || '---'}</b>
                                </p>
                            </div>
                        </div>

                        {/* Thống kê nhanh */}
                        <div className="grid grid-cols-3 gap-3 w-full md:w-auto shrink-0 text-center">
                            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                                <span className="text-[10px] text-slate-300 block font-medium">Lớp theo học</span>
                                <span className="text-lg font-black text-white">{stats.total}</span>
                            </div>
                            <div className="bg-amber-500/10 rounded-2xl p-3 border border-amber-400/20">
                                <span className="text-[10px] text-amber-300 block font-medium">Cần khảo sát</span>
                                <span className="text-lg font-black text-amber-300">{stats.pending}</span>
                            </div>
                            <div className="bg-emerald-500/10 rounded-2xl p-3 border border-emerald-400/20">
                                <span className="text-[10px] text-emerald-300 block font-medium">Đã hoàn thành</span>
                                <span className="text-lg font-black text-emerald-300">{stats.completed}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Thanh điều khiển & Tìm kiếm */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                    {/* Tabs Lọc */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setFilterTab('ALL')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                filterTab === 'ALL' ? 'bg-white text-itc-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Tất cả thời khóa biểu ({stats.total})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterTab('PENDING')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                filterTab === 'PENDING' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Cần làm khảo sát ({stats.pending})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterTab('COMPLETED')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                filterTab === 'COMPLETED' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Đã đánh giá ({stats.completed})
                        </button>
                    </div>

                    {/* Ô Tìm kiếm môn học / mã lớp */}
                    <div className="relative w-full sm:w-72">
                        <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchKeyword}
                            onChange={e => setSearchKeyword(e.target.value)}
                            placeholder="Tìm môn học, mã lớp, GV, phòng..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-itc-500"
                        />
                    </div>
                </div>

                {/* Banner trạng thái: Khi sinh viên đã hoàn thành tất cả hoặc sau khi F5 / Reload */}
                {stats.pending === 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-emerald-900 shadow-2xs animate-fadeIn">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                                <Icons.CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-xs sm:text-sm font-bold">
                                    Bạn đã hoàn tất toàn bộ khảo sát học kỳ!
                                </h4>
                                <p className="text-[11px] text-emerald-700 mt-0.5">
                                    Thời khóa biểu hiển thị ở trạng thái chuẩn. Khi Trung tâm ITC mở đợt khảo sát mới cho lớp của bạn, thông báo sẽ được gửi qua chuông thông báo.
                                </p>
                            </div>
                        </div>
                        <span className="hidden sm:inline-flex px-2.5 py-1 bg-white text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-200">
                            Thời khóa biểu chuẩn
                        </span>
                    </div>
                )}

                {/* Danh sách Lớp học & Thời khóa biểu */}
                <div className="space-y-4">
                    {filteredClasses.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-2xs space-y-3">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                                <Icons.BookOpen className="w-8 h-8 opacity-60" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-700">Không tìm thấy lớp học nào</h3>
                            <p className="text-xs text-slate-400 max-w-md mx-auto">
                                Không có lớp học nào phù hợp với bộ lọc hoặc sinh viên chưa được xếp vào danh sách lớp của học kỳ này.
                            </p>
                        </div>
                    ) : (
                        filteredClasses.map(cls => {
                            const needsSurvey = cls.isSurveyOpen && !cls.hasSubmitted;
                            const isCompleted = cls.hasSubmitted;

                            return (
                                <div
                                    key={cls.id}
                                    className={`bg-white rounded-3xl p-6 border transition-all duration-200 shadow-xs hover:shadow-md ${
                                        needsSurvey 
                                            ? 'border-amber-300 ring-2 ring-amber-400/20 bg-gradient-to-r from-amber-50/30 via-white to-white' 
                                            : isCompleted 
                                            ? 'border-emerald-200' 
                                            : 'border-slate-200'
                                    }`}
                                >
                                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
                                        {/* Cột 1: Thông tin Lớp học & Thời khóa biểu */}
                                        <div className="space-y-3 flex-1">
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-itc-50 text-itc-800 border border-itc-200">
                                                    {cls.code}
                                                </span>
                                                <h3 className="text-base sm:text-lg font-black text-slate-900">
                                                    {cls.courseName}
                                                </h3>
                                                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                    {cls.academicYear || '2025-2026 - HK1'}
                                                </span>
                                            </div>

                                            {/* Bảng Chi tiết Thời khóa biểu */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Lịch học trong tuần:</span>
                                                    <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-1">
                                                        <Icons.Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span>{cls.schedule || 'Thứ 2 - 4 - 6'}</span>
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Phòng máy / Lab:</span>
                                                    <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-1">
                                                        <Icons.Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span>{cls.room || 'Phòng Lab'}</span>
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Giảng viên:</span>
                                                    <span className="font-bold text-itc-800 flex items-center gap-1.5 mt-1 truncate">
                                                        <Icons.GraduationCap className="w-3.5 h-3.5 text-itc-600 shrink-0" />
                                                        <span className="truncate">{cls.teacherNames}</span>
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Sĩ số lớp:</span>
                                                    <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-1">
                                                        <Icons.Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span>{cls.studentsCount || 30} học viên</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Cột 2: Trạng thái & Nút Hành Động Khảo Sát */}
                                        <div className="shrink-0 w-full lg:w-auto flex flex-col items-start lg:items-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                                            {needsSurvey ? (
                                                <div className="w-full lg:w-auto text-left lg:text-right space-y-2">
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
                                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                                        Đợt khảo sát đang mở
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 font-medium max-w-xs">
                                                        Vui lòng thực hiện đánh giá chất lượng khóa học và cơ sở vật chất phòng máy.
                                                    </p>
                                                    <Link
                                                        href={`/survey?classId=${cls.id}&studentCode=${currentUser.code}&studentName=${encodeURIComponent(currentUser.name || '')}`}
                                                        target="_blank"
                                                        className="inline-flex items-center justify-center gap-2 w-full lg:w-auto px-5 py-2.5 bg-itc-800 hover:bg-itc-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                                                    >
                                                        <Icons.FileText className="w-4 h-4" /> Làm khảo sát ngay
                                                    </Link>
                                                </div>
                                            ) : isCompleted ? (
                                                <div className="w-full lg:w-auto text-left lg:text-right space-y-1.5">
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
                                                        <Icons.CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                        Đã hoàn thành đánh giá
                                                    </div>
                                                    <p className="text-[11px] text-slate-500">
                                                        {cls.submittedAt ? `Nộp ngày: ${new Date(cls.submittedAt).toLocaleDateString('vi-VN')}` : 'Đã ghi nhận trên hệ thống'}
                                                        {cls.score ? ` • Điểm TB: ${cls.score} / 5.0` : ''}
                                                    </p>
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 font-medium">
                                                        <Icons.Check className="w-3 h-3 text-emerald-600" /> Đã xác thực MSSV {currentUser.code}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="w-full lg:w-auto text-left lg:text-right space-y-1">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-medium">
                                                        <Icons.Calendar className="w-3.5 h-3.5 text-slate-500" /> Thời khóa biểu học kỳ
                                                    </span>
                                                    <p className="text-[11px] text-slate-400">
                                                        Khảo sát sẽ mở vào 2 tuần cuối của đợt đào tạo.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

            </div>
        </div>
    );
};

