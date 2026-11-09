import React, { useState, useMemo } from 'react';
import { Icons } from '../ui/Icons';
import { CreateClassModal } from '../modals/CreateClassModal';
import { CreateTeacherModal } from '../modals/CreateTeacherModal';
import { ConfigureSurveyModal } from '../modals/ConfigureSurveyModal';
import { ManageCoursesModal } from '../modals/ManageCoursesModal';
import { StudentManagementModal } from '../modals/StudentManagementModal';
import { LabSeatMapModal } from '../modals/LabSeatMapModal';
import { AuditLogsModal } from '../modals/AuditLogsModal';
import { classifyFeedback } from '../../lib/sentimentClassifier';

export const AdminView = ({ 
    classes, 
    courses, 
    teachers, 
    reviews, 
    appUsers = [],
    criteriaList, 
    stats, 
    warningThreshold, 
    setWarningThreshold, 
    onUpdateAction, 
    onAddClass, 
    onUpdateClass,
    onToggleClassStatus, 
    onDeleteClass, 
    onRefreshData, 
    onDeleteTeacher,
    onUpdateTeacher
}: any) => {
    const [activeTab, setActiveTab] = useState('overview');
    
    // Status and search filter
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // State chỉnh sửa lớp học và giảng viên
    const [editingClass, setEditingClass] = useState<any>(null);
    const [editingTeacher, setEditingTeacher] = useState<any>(null);

    // Nâng cấp bộ lọc chuyên sâu cho Bảng điều khiển & Đánh giá
    const [overviewClassFilter, setOverviewClassFilter] = useState<'ALL' | 'OPEN' | 'WARNING' | 'HIGH_PROGRESS'>('ALL');
    const [reviewsCategoryFilter, setReviewsCategoryFilter] = useState<'ALL' | 'HARDWARE' | 'WARNING' | 'ESCALATED' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
    const [reviewsStarFilter, setReviewsStarFilter] = useState<'ALL' | '1-2' | '3' | '4-5'>('ALL');

    // Multi-criteria filters: Course, Academic Year, Class search
    const [filterCourseId, setFilterCourseId] = useState('ALL');
    const [filterAcademicYear, setFilterAcademicYear] = useState('ALL');
    const [filterClassSearch, setFilterClassSearch] = useState('');

    // Modals
    const [showActionModal, setShowActionModal] = useState<any>(null);
    const [showCreateClassModal, setShowCreateClassModal] = useState(false);
    const [showCreateTeacherModal, setShowCreateTeacherModal] = useState(false);
    const [configuringSurveyClass, setConfiguringSurveyClass] = useState<any>(null);
    const [showCoursesModal, setShowCoursesModal] = useState(false);
    const [managingStudentsClass, setManagingStudentsClass] = useState<any>(null);
    const [showStudentModal, setShowStudentModal] = useState<boolean>(false);
    const [showSeatMapModal, setShowSeatMapModal] = useState<boolean>(false);
    const [seatMapInitialTab, setSeatMapInitialTab] = useState<'SEAT_MAP' | 'ALERTS'>('SEAT_MAP');
    const [showAuditLogsModal, setShowAuditLogsModal] = useState<boolean>(false);

    // Get list of unique academic years from classes
    const academicYears = useMemo(() => {
        const years = new Set<string>();
        classes.forEach((c: any) => {
            if (c.academicYear) years.add(c.academicYear);
        });
        if (years.size === 0) years.add('2026');
        return Array.from(years);
    }, [classes]);

    // Helper: get teacher names string
    const getTeacherNames = (cls: any) => {
        const assignedIds = cls.teacherIds || (cls.teacherId ? [cls.teacherId] : []);
        const assignedTeachers = teachers.filter((t: any) => assignedIds.includes(t.id));
        if (assignedTeachers.length > 0) {
            return assignedTeachers.map((t: any) => t.name).join(', ');
        }
        const single = teachers.find((t: any) => t.id === cls.teacherId);
        return single ? single.name : 'Chưa phân công';
    };

    // Helper: Tính điểm đánh giá trung bình của từng bài review
    const getReviewAvg = (ratings: any): number => {
        const vals = Object.entries(ratings || {})
            .filter(([k]) => !k.startsWith('group_') && k !== 'student_code' && k !== 'student_name' && k !== 'asset_location')
            .map(([, v]) => typeof v === 'number' ? v : parseFloat(v as string))
            .filter(v => !isNaN(v) && v > 0);
        if (vals.length === 0) return 5.0;
        return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
    };

    // Helper: Kiểm tra review có liên quan đến lỗi phòng máy / thiết bị
    const isHardwareReview = (r: any): boolean => {
        const text = (r.comment || '').toLowerCase();
        const asset = (r.ratings?.asset_location || '').toLowerCase();
        return asset.length > 0 || 
               text.includes('chuột') || 
               text.includes('phím') || 
               text.includes('máy') || 
               text.includes('màn hình') || 
               text.includes('lạnh') || 
               text.includes('lab') || 
               text.includes('hỏng') || 
               text.includes('mạng') || 
               text.includes('wifi');
    };

    // Filtered Bad Reviews with multi-filters
    const filteredBadReviews = useMemo(() => {
        return reviews.filter((r: any) => {
            const cls = classes.find((c: any) => c.id === r.classId);
            const rAvg = getReviewAvg(r.ratings);
            const isHard = isHardwareReview(r);

            // Category filter
            if (reviewsCategoryFilter === 'HARDWARE' && !isHard) return false;
            if (reviewsCategoryFilter === 'WARNING' && rAvg > 2.5 && !Object.values(r.ratings || {}).some((s: any) => s <= 2)) return false;
            if (reviewsCategoryFilter === 'ESCALATED' && !r.isEscalated) return false;
            if (reviewsCategoryFilter === 'IN_PROGRESS' && r.status !== 'IN_PROGRESS') return false;
            if (reviewsCategoryFilter === 'RESOLVED' && r.status !== 'RESOLVED') return false;

            // Star rating filter
            if (reviewsStarFilter === '1-2' && rAvg > 2.5) return false;
            if (reviewsStarFilter === '3' && (rAvg <= 2.5 || rAvg > 3.5)) return false;
            if (reviewsStarFilter === '4-5' && rAvg <= 3.5) return false;

            // Lọc cơ bản
            const hasBad = Object.values(r.ratings || {}).some((s: any) => s <= 2);
            const hasComment = r.comment && r.comment.trim().length > 0;
            
            if (reviewsCategoryFilter === 'ALL' && !hasBad && !hasComment && !r.isEscalated && !isHard) return false;
            
            if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
            if (filterCourseId !== 'ALL' && cls?.courseId !== filterCourseId) return false;
            if (filterAcademicYear !== 'ALL' && (cls?.academicYear || '2026') !== filterAcademicYear) return false;
            if (filterClassSearch && !cls?.code.toLowerCase().includes(filterClassSearch.toLowerCase())) return false;
            if (searchTerm && !r.comment?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            
            return true;
        });
    }, [reviews, classes, reviewsCategoryFilter, reviewsStarFilter, filterStatus, filterCourseId, filterAcademicYear, filterClassSearch, searchTerm]);

    const escalatedReviews = useMemo(() => {
        return reviews.filter((r: any) => r.isEscalated && r.status !== 'RESOLVED');
    }, [reviews]);

    // Filtered Class Metrics for Overview tab
    const filteredClassMetrics = useMemo(() => {
        return Object.values(stats.classMetrics).filter((cm: any) => {
            if (filterCourseId !== 'ALL' && cm.classInfo.courseId !== filterCourseId) return false;
            if (filterAcademicYear !== 'ALL' && (cm.classInfo.academicYear || '2026') !== filterAcademicYear) return false;
            if (filterClassSearch) {
                const keyword = filterClassSearch.toLowerCase();
                const matchCode = cm.classInfo.code.toLowerCase().includes(keyword);
                const matchCourse = cm.courseName.toLowerCase().includes(keyword);
                if (!matchCode && !matchCourse) return false;
            }
            return true;
        });
    }, [stats.classMetrics, filterCourseId, filterAcademicYear, filterClassSearch]);

    // Thêm bộ lọc nhanh cho danh sách lớp trong Bảng điều khiển
    const displayClassMetrics = useMemo(() => {
        return filteredClassMetrics.filter((cm: any) => {
            if (overviewClassFilter === 'OPEN') return cm.classInfo.status === 'OPEN';
            if (overviewClassFilter === 'WARNING') return cm.overallAvg > 0 && cm.overallAvg < warningThreshold;
            if (overviewClassFilter === 'HIGH_PROGRESS') {
                const percent = (cm.classInfo.studentsCount || 30) > 0 ? (cm.count / (cm.classInfo.studentsCount || 30)) * 100 : 0;
                return percent >= 70;
            }
            return true;
        });
    }, [filteredClassMetrics, overviewClassFilter, warningThreshold]);

    const handleLocalUpdateAction = (reviewId: string, newStatus: string, newNote: string) => {
        onUpdateAction(reviewId, newStatus, newNote);
        setShowActionModal(null);
    };

    return (
        <div className="flex-1 bg-slate-50 p-4 lg:p-6 font-sans">
            <div className="max-w-6xl mx-auto">
                {/* Navigation Tabs & Quick Action Tools */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div className="flex flex-wrap items-center gap-2">
                        {['overview', 'reviews', 'classes', 'teachers'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    activeTab === tab
                                        ? 'bg-itc-800 text-white shadow-soft scale-102' 
                                        : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                                }`}
                            >
                                {tab === 'overview' && 'Bảng điều khiển'}
                                {tab === 'reviews' && `Xem lại Đánh giá & Phàn nàn (${filteredBadReviews.length})`}
                                {tab === 'classes' && `Quản lý Lớp học (${classes.length})`}
                                {tab === 'teachers' && `Quản lý Giảng viên (${teachers.length})`}
                            </button>
                        ))}
                    </div>

                    {/* Quick Action Tools */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowSeatMapModal(true)}
                            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
                            title="Mở sơ đồ ma trận phòng máy và trạng thái thiết bị 32 máy"
                        >
                            <Icons.Monitor className="w-4 h-4 text-amber-700" />
                            <span>Sơ đồ Ma trận Phòng máy</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowAuditLogsModal(true)}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                            title="Xem nhật ký kiểm toán hành vi quản trị hệ thống"
                        >
                            <Icons.FileText className="w-4 h-4 text-slate-500" />
                            <span>Nhật ký Kiểm toán</span>
                        </button>
                    </div>
                </div>

                {/* SHARED MULTI-CRITERIA FILTER BAR (Dành cho Xem lại đánh giá & Bảng điều khiển) */}
                {(activeTab === 'overview' || activeTab === 'reviews') && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs mb-6 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-600">Khóa / Môn học:</span>
                                <select 
                                    value={filterCourseId} 
                                    onChange={(e) => setFilterCourseId(e.target.value)}
                                    className="border border-slate-200 rounded-lg text-xs p-1.5 font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-itc-500"
                                >
                                    <option value="ALL">Tất cả môn học</option>
                                    {courses.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-600">Niên khóa:</span>
                                <select 
                                    value={filterAcademicYear} 
                                    onChange={(e) => setFilterAcademicYear(e.target.value)}
                                    className="border border-slate-200 rounded-lg text-xs p-1.5 font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-itc-500"
                                >
                                    <option value="ALL">Tất cả niên khóa</option>
                                    {academicYears.map((yr: string) => (
                                        <option key={yr} value={yr}>{yr}</option>
                                    ))}
                                </select>
                            </div>

                            {(filterCourseId !== 'ALL' || filterAcademicYear !== 'ALL' || filterClassSearch) && (
                                <button 
                                    onClick={() => {
                                        setFilterCourseId('ALL');
                                        setFilterAcademicYear('ALL');
                                        setFilterClassSearch('');
                                    }}
                                    className="text-[11px] font-bold text-rose-600 hover:underline"
                                >
                                    Đặt lại bộ lọc
                                </button>
                            )}
                        </div>

                        <div className="relative w-full sm:w-60">
                            <input 
                                type="text" 
                                placeholder="Tìm theo mã lớp, tên môn..."
                                value={filterClassSearch}
                                onChange={(e) => setFilterClassSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-itc-500"
                            />
                            <span className="absolute left-2.5 top-2 text-slate-400">
                                <Icons.Search className="w-3.5 h-3.5" />
                            </span>
                        </div>
                    </div>
                )}

                {/* TAB 1: BẢNG ĐIỀU KHIỂN TỔNG QUAN */}
                {activeTab === 'overview' && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="soft-card p-5 rounded-2xl border-l-4 border-l-sky-500 bg-white">
                                <p className="text-[11px] text-slate-500 font-semibold mb-1">Tổng lượt Khảo sát</p>
                                <p className="text-2xl font-black text-slate-800">{stats.totalSubmissions}</p>
                            </div>
                            <div className="soft-card p-5 rounded-2xl border-l-4 border-l-emerald-500 bg-white">
                                <p className="text-[11px] text-slate-500 font-semibold mb-1">Mức độ Hài lòng chung</p>
                                <p className="text-2xl font-black text-emerald-600">{stats.centerAvgSatisfaction} <span className="text-sm">★</span></p>
                            </div>
                            <div 
                                onClick={() => {
                                    setSeatMapInitialTab('ALERTS');
                                    setShowSeatMapModal(true);
                                }}
                                className="soft-card p-5 rounded-2xl border-l-4 border-l-amber-500 bg-white cursor-pointer hover:shadow-lg hover:border-amber-600 hover:scale-[1.01] transition-all group relative"
                                title="Nhấn để xem chi tiết các tiêu chí và thiết bị cần bảo trì"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-[11px] text-slate-500 font-semibold">Cảnh báo Tiêu chí thấp</p>
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 group-hover:bg-amber-100 transition-colors flex items-center gap-1">
                                        Xem chi tiết &rarr;
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-black text-amber-600">
                                        {stats.alertList.length} <span className="text-sm font-medium text-slate-400">cảnh báo</span>
                                    </p>
                                    {(stats.maintenanceCount ?? 0) > 0 && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 animate-pulse border border-rose-200">
                                            {stats.maintenanceCount} cần bảo trì
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                                    <span>Ngưỡng &lt; {warningThreshold} sao</span>
                                    <span className="text-amber-600 font-bold group-hover:underline">Nhấn xem phòng & sự cố &rarr;</span>
                                </p>
                            </div>
                            <div className="soft-card p-5 rounded-2xl border-l-4 border-l-rose-500 bg-white flex flex-col justify-center">
                                <p className="text-[10px] text-slate-500 font-bold mb-1">NGƯỠNG CẢNH BÁO BẢO TRÌ:</p>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-rose-600">{warningThreshold} Sao</span>
                                    <input 
                                        type="range" 
                                        min="2.0" 
                                        max="4.0" 
                                        step="0.1" 
                                        value={warningThreshold} 
                                        onChange={(e) => setWarningThreshold(parseFloat(e.target.value))}
                                        className="w-32 accent-itc-800 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* BANNER BÁO CÁO KHẨN CẤP TỪ GIẢNG VIÊN - TÍCH HỢP VỚI TAB ĐÁNH GIÁ & PHÀN NÀN */}
                        {escalatedReviews.length > 0 && (
                            <div className="bg-gradient-to-r from-amber-50/90 to-red-50/90 border border-amber-300 rounded-2xl p-5 shadow-xs space-y-4 mb-6">
                                <div className="flex flex-wrap justify-between items-center gap-3 border-b border-amber-200/80 pb-3">
                                    <div className="flex items-center space-x-2.5">
                                        <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                                            <Icons.AlertTriangle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-amber-950 flex items-center gap-2">
                                                YÊU CẦU HỖ TRỢ TỪ GIẢNG VIÊN
                                                <span className="bg-red-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                                                    {escalatedReviews.length} Báo cáo khẩn cấp
                                                </span>
                                            </h3>
                                            <p className="text-xs text-amber-800">
                                                Các vấn đề nghiêm trọng được giảng viên chuyển tiếp lên Admin để phối hợp cùng Kỹ thuật viên xử lý.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setActiveTab('reviews');
                                            setReviewsCategoryFilter('ESCALATED');
                                        }}
                                        className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                                    >
                                        <Icons.Eye className="w-4 h-4" /> Xem tất cả trong Đánh giá & Phàn nàn &rarr;
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {escalatedReviews.slice(0, 3).map((rev: any) => {
                                        const cls = classes.find((c: any) => c.id === rev.classId);
                                        const formattedDate = rev.createdAt 
                                            ? new Date(rev.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                            : 'Gần đây';
                                        return (
                                            <div key={rev.id} className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs space-y-2 flex flex-col justify-between">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-800 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                                                            {cls ? cls.code : 'Lớp học'}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500 font-medium">
                                                            {formattedDate}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-700 italic line-clamp-2">
                                                        "{rev.comment}"
                                                    </p>
                                                    {rev.teacherNote && (
                                                        <p className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200/80 font-medium line-clamp-2">
                                                            <b>Ý kiến GV:</b> {rev.teacherNote}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-100">
                                                    <button 
                                                        onClick={() => setShowActionModal({ reviewId: rev.id, status: rev.status, actionNote: rev.actionNote || '' })}
                                                        className="text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-200 transition flex items-center gap-1"
                                                    >
                                                        <Icons.CheckCircle className="w-3 h-3" /> Cập nhật tiến độ
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Detailed Class Performance List */}
                        <div className="mb-6 flex flex-col gap-5">
                            <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50 flex flex-wrap justify-between items-center gap-3 shadow-xs">
                                <div>
                                    <h3 className="font-bold text-itc-900 text-xs uppercase tracking-wider">
                                        Thống kê chất lượng từng lớp học ({displayClassMetrics.length} / {filteredClassMetrics.length} lớp)
                                    </h3>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Theo dõi tỷ lệ hoàn thành khảo sát, điểm đánh giá và phản hồi của từng lớp</p>
                                </div>

                                {/* BỘ LỌC NHANH CHO LỚP HỌC TRÊN BẢNG ĐIỀU KHIỂN */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => setOverviewClassFilter('ALL')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                            overviewClassFilter === 'ALL' 
                                                ? 'bg-itc-800 text-white shadow-2xs' 
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        Tất cả lớp ({filteredClassMetrics.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOverviewClassFilter('OPEN')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                            overviewClassFilter === 'OPEN' 
                                                ? 'bg-emerald-700 text-white shadow-2xs' 
                                                : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        Đang mở KS ({filteredClassMetrics.filter((m: any) => m.classInfo.status === 'OPEN').length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOverviewClassFilter('WARNING')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                            overviewClassFilter === 'WARNING' 
                                                ? 'bg-rose-700 text-white shadow-2xs' 
                                                : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                                        }`}
                                    >
                                        Điểm thấp (&lt; {warningThreshold} sao)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOverviewClassFilter('HIGH_PROGRESS')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                            overviewClassFilter === 'HIGH_PROGRESS' 
                                                ? 'bg-indigo-700 text-white shadow-2xs' 
                                                : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
                                        }`}
                                    >
                                        Tiến độ cao
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-6">
                                {displayClassMetrics.map((cm: any) => {
                                    const teacherNames = getTeacherNames(cm.classInfo);
                                    const academicYear = cm.classInfo.academicYear || '2026';
                                    const targetCapacity = cm.classInfo.studentsCount || 30;
                                    const percent = Math.min(100, Math.round(((cm.count || 0) / targetCapacity) * 100));

                                    return (
                                        <div key={cm.classInfo.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 hover:border-itc-400 hover:shadow-md transition-all relative">
                                            <div className="flex flex-wrap justify-between items-start gap-4 mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-black text-slate-900 text-base">{cm.classInfo.code} - {cm.courseName}</h4>
                                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-itc-50 text-itc-800 border border-itc-200">{cm.classInfo.room}</span>
                                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">Niên khóa: {academicYear}</span>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                                            cm.classInfo.status === 'OPEN' 
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                                                                : 'bg-slate-100 text-slate-600 border-slate-300'
                                                        }`}>
                                                            {cm.classInfo.status === 'OPEN' ? 'ĐANG MỞ KHẢO SÁT' : 'ĐÃ ĐÓNG'}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* MULTI-TEACHER & SCHEDULE DISPLAY */}
                                                    <p className="text-xs text-slate-600 mt-1">
                                                        Giảng viên: <b className="text-slate-800">{teacherNames}</b> | Lịch: {cm.classInfo.schedule} | Sĩ số: <b>{targetCapacity} SV</b>
                                                    </p>

                                                    {/* TIẾN ĐỘ KHẢO SÁT THỜI GIAN THỰC */}
                                                    <div className="mt-2.5 max-w-md">
                                                        <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                                                            <span>Tiến độ khảo sát sinh viên:</span>
                                                            <span className="font-bold text-slate-800">{cm.count} / {targetCapacity} HV</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full transition-all duration-300 ${percent >= 80 ? 'bg-emerald-500' : percent >= 50 ? 'bg-itc-600' : 'bg-amber-500'}`}
                                                                style={{ width: `${percent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="mt-3.5 flex items-center gap-2 flex-wrap">
                                                        <button 
                                                            onClick={() => {
                                                                setFilterClassSearch(cm.classInfo.code);
                                                                setActiveTab('reviews');
                                                            }}
                                                            className="text-xs font-bold text-itc-700 hover:text-itc-900 underline decoration-itc-300 underline-offset-2 flex items-center gap-1"
                                                        >
                                                            <Icons.Comments className="w-3.5 h-3.5" /> Xem {cm.count} nhận xét &rarr;
                                                        </button>

                                                        {/* NÚT QUẢN LÝ SINH VIÊN TRỰC TIẾP TRÊN CARD */}
                                                        <button
                                                            onClick={() => {
                                                                setManagingStudentsClass(cm.classInfo);
                                                                setShowStudentModal(true);
                                                            }}
                                                            className="text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-lg transition flex items-center gap-1 shadow-2xs"
                                                            title="Xem và quản lý sinh viên của lớp này"
                                                        >
                                                            <Icons.User className="w-3.5 h-3.5 text-slate-700" />
                                                            <span>Quản lý SV ({targetCapacity})</span>
                                                        </button>

                                                        {/* CONFIGURE SURVEY QUESTIONS BUTTON */}
                                                        <button 
                                                            onClick={() => setConfiguringSurveyClass(cm.classInfo)}
                                                            className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1 border border-indigo-200 px-2.5 py-1 rounded-lg transition"
                                                            title="Tùy chọn câu hỏi hoặc tạo câu hỏi mới cho lớp này"
                                                        >
                                                            <Icons.BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Cấu hình Đề KS
                                                        </button>

                                                        {/* BẬT / TẮT TRẠNG THÁI KHẢO SÁT */}
                                                        <button
                                                            onClick={() => onToggleClassStatus(cm.classInfo.id, cm.classInfo.status)}
                                                            className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition flex items-center gap-1 ${
                                                                (cm.classInfo.status === 'OPEN' || cm.classInfo.status === 'OPEN_SURVEY')
                                                                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' 
                                                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                                            }`}
                                                            title="Bật/Tắt đợt khảo sát cho lớp này"
                                                        >
                                                            {(cm.classInfo.status === 'OPEN' || cm.classInfo.status === 'OPEN_SURVEY') ? 'Đóng khảo sát' : 'Mở khảo sát'}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-2xl font-black text-itc-800">{cm.overallAvg}</span>
                                                    <span className="text-xs text-slate-400 font-bold ml-1">/ 5.0</span>
                                                    <span className="text-[10px] text-slate-400 font-medium block">Điểm TB Lớp</span>
                                                </div>
                                            </div>

                                            <div className="bg-itc-50/50 rounded-xl p-3 border border-itc-100 mb-4">
                                                <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-1">Nhận xét mới nhất:</h5>
                                                {cm.badComments && cm.badComments.length > 0 ? (
                                                    <p className="text-xs text-slate-700 italic">"{cm.badComments[0].comment}"</p>
                                                ) : (
                                                    <p className="text-xs text-slate-400 italic">Chưa có nhận xét nào.</p>
                                                )}
                                            </div>

                                            {cm.count > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                                    {criteriaList.map((crit: any) => (
                                                        <div key={crit.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                                                            <p className="text-[11px] font-medium text-slate-500">{crit.name}</p>
                                                            <p className="text-xs font-black text-slate-800 mt-0.5">{cm.criteriaAvgs[crit.id] || 0} / 5.0</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs font-medium">
                                                    Lớp chưa có học viên nào nộp bài khảo sát.
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* TAB 2: XEM LẠI ĐÁNH GIÁ & XỬ LÝ PHÀN NÀN (NÂNG CẤP TOÀN DIỆN) */}
                {activeTab === 'reviews' && (
                    <div className="space-y-4">
                        {/* HERO BANNER: SƠ ĐỒ MA TRẬN PHÒNG MÁY THỰC TẾ */}
                        <div className="bg-gradient-to-r from-slate-900 via-itc-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4 border border-slate-700/60">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                                    <Icons.Monitor className="w-6 h-6 text-amber-400" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-black text-sm text-white">
                                            Sơ Đồ Ma Trận Phòng Máy Thực Tế (Interactive Lab Seat Map)
                                        </h4>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                                            4 Dãy × 8 Máy = 32 Máy/Phòng
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                        Mô phỏng vị trí từng máy tính phòng Lab 5, Lab 1, Lab 2, Lab 6, A24. Máy xanh (tốt), vàng (mạng chập chờn), đỏ nhấp nháy (hỏng phần cứng). Click trực tiếp vào máy để xem phản ánh và cập nhật sửa chữa.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSeatMapModal(true)}
                                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition shadow-md flex items-center gap-2 shrink-0 hover:scale-[1.02]"
                            >
                                <Icons.Monitor className="w-4 h-4 text-slate-950" />
                                <span>Mở Sơ Đồ Ma Trận Phòng Máy &rarr;</span>
                            </button>
                        </div>

                        {/* Thanh lọc phân loại chuyên sâu */}
                        <div className="soft-card p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                            {/* Hàng 1: Filter Chips theo bản chất sự cố */}
                            <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100 text-xs">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-500 mr-1 text-[11px] uppercase tracking-wider">Phân loại:</span>
                                    <button
                                        type="button"
                                        onClick={() => setReviewsCategoryFilter('ALL')}
                                        className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                            reviewsCategoryFilter === 'ALL'
                                                ? 'bg-itc-800 text-white shadow-2xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        Tất cả ({reviews.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReviewsCategoryFilter('HARDWARE')}
                                        className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                                            reviewsCategoryFilter === 'HARDWARE'
                                                ? 'bg-amber-600 text-white shadow-2xs'
                                                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                                        }`}
                                    >
                                        <Icons.Monitor className="w-3.5 h-3.5" /> Sự cố phòng máy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReviewsCategoryFilter('WARNING')}
                                        className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                                            reviewsCategoryFilter === 'WARNING'
                                                ? 'bg-rose-600 text-white shadow-2xs'
                                                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                        }`}
                                    >
                                        <Icons.AlertTriangle className="w-3.5 h-3.5" /> Cảnh báo điểm thấp (&le; 2 sao)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReviewsCategoryFilter('ESCALATED')}
                                        className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                                            reviewsCategoryFilter === 'ESCALATED'
                                                ? 'bg-red-700 text-white shadow-2xs'
                                                : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                                        }`}
                                    >
                                        <Icons.FileText className="w-3.5 h-3.5" /> Giảng viên báo cáo ({escalatedReviews.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReviewsCategoryFilter('IN_PROGRESS')}
                                        className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                            reviewsCategoryFilter === 'IN_PROGRESS'
                                                ? 'bg-sky-700 text-white shadow-2xs'
                                                : 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
                                        }`}
                                    >
                                        Đang kiểm tra
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReviewsCategoryFilter('RESOLVED')}
                                        className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                            reviewsCategoryFilter === 'RESOLVED'
                                                ? 'bg-emerald-700 text-white shadow-2xs'
                                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                        }`}
                                    >
                                        Đã khắc phục xong
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowSeatMapModal(true)}
                                    className="px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 shadow-2xs text-xs shrink-0"
                                    title="Mở sơ đồ lưới ghế ngồi 32 máy tính phòng Lab"
                                >
                                    <Icons.Monitor className="w-3.5 h-3.5 text-amber-700" />
                                    <span>Xem Sơ Đồ 32 Máy (Seat Map)</span>
                                </button>
                            </div>

                            {/* Hàng 2: Bộ lọc Sao, Trạng thái & Ô Tìm kiếm */}
                            <div className="flex flex-wrap justify-between items-center gap-3">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-slate-600">Thang điểm:</span>
                                        <select
                                            value={reviewsStarFilter}
                                            onChange={e => setReviewsStarFilter(e.target.value as any)}
                                            className="border border-slate-200 rounded-lg text-xs p-1.5 font-bold bg-slate-50 focus:outline-none focus:ring-1 focus:ring-itc-600"
                                        >
                                            <option value="ALL">Tất cả số sao</option>
                                            <option value="1-2">1 - 2 Sao (Khẩn cấp)</option>
                                            <option value="3">3 Sao (Trung bình)</option>
                                            <option value="4-5">4 - 5 Sao (Hài lòng)</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-slate-600">Trạng thái:</span>
                                        <select 
                                            value={filterStatus} 
                                            onChange={(e) => setFilterStatus(e.target.value)}
                                            className="border border-slate-200 rounded-lg text-xs p-1.5 font-bold bg-slate-50 focus:outline-none focus:ring-1 focus:ring-itc-600"
                                        >
                                            <option value="ALL">Tất cả trạng thái</option>
                                            <option value="OPEN">Chờ tiếp nhận xử lý</option>
                                            <option value="IN_PROGRESS">Đang kiểm tra / bảo trì</option>
                                            <option value="RESOLVED">Đã khắc phục hoàn tất</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="relative w-full sm:w-72">
                                    <input 
                                        type="text" 
                                        placeholder="Tìm theo ý kiến, thiết bị, phòng máy..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-itc-600 font-medium"
                                    />
                                    <span className="absolute left-2.5 top-2 text-slate-400"><Icons.Search className="w-3.5 h-3.5" /></span>
                                </div>
                            </div>
                        </div>

                        {/* Banner thông báo chế độ Giảng viên báo cáo */}
                        {reviewsCategoryFilter === 'ESCALATED' && (
                            <div className="bg-red-50/90 border border-red-200 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3 shadow-xs">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 text-red-700 rounded-xl">
                                        <Icons.AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-red-950 flex items-center gap-2">
                                            Danh sách Báo cáo do Giảng viên trực tiếp gửi lên Ban Quản trị
                                            <span className="bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                                                {escalatedReviews.length} Phiếu
                                            </span>
                                        </h4>
                                        <p className="text-xs text-red-700 mt-0.5">
                                            Bao gồm các vấn đề nghiêm trọng cần Admin & Kỹ thuật viên ITC xử lý, lập biên bản hoặc phản hồi tiến độ.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setReviewsCategoryFilter('ALL')}
                                    className="text-xs font-bold text-red-700 hover:text-red-900 bg-white px-3 py-1.5 rounded-xl border border-red-200 shadow-2xs hover:bg-red-50 transition"
                                >
                                    Xem tất cả phản hồi &times;
                                </button>
                            </div>
                        )}

                        {/* Danh sách thẻ Đánh giá & Phàn nàn */}
                        <div className="space-y-3">
                            {filteredBadReviews.length > 0 ? (
                                filteredBadReviews.map((rev: any) => {
                                    const cls = classes.find((c: any) => c.id === rev.classId);
                                    const teacherNames = cls ? getTeacherNames(cls) : 'Chưa phân công';
                                    const academicYear = cls?.academicYear || '2026';
                                    const rAvg = getReviewAvg(rev.ratings);
                                    const assetLocation = rev.ratings?.asset_location || rev.ratings?.device_tag;
                                    const studentCode = rev.ratings?.student_code;

                                    return (
                                        <div key={rev.id} className="soft-card p-5 rounded-3xl space-y-3.5 border border-slate-200 bg-white shadow-2xs hover:shadow-md transition">
                                            {/* Tiêu đề thẻ */}
                                            <div className="flex flex-wrap justify-between items-start gap-2.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-black text-itc-900 text-xs px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                                                        {cls ? cls.code : 'Lớp đã đóng'}
                                                    </span>
                                                    <span className="text-xs text-slate-700 font-bold">
                                                        {cls?.room || 'Phòng Lab'}
                                                    </span>
                                                    <span className="text-xs text-slate-500 font-medium">
                                                        ({teacherNames} • Niên khóa {academicYear})
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        • {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                                                    </span>

                                                    {rev.isEscalated && (
                                                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-red-200 shadow-xs animate-pulse">
                                                            <Icons.AlertTriangle className="w-3 h-3" /> GV BÁO CÁO ADMIN
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {/* Điểm số đánh giá */}
                                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border flex items-center gap-1 ${
                                                        rAvg >= 4.0 
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                            : rAvg >= 3.0 
                                                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                                    }`}>
                                                        <Icons.Star className="w-3.5 h-3.5 text-amber-500 inline fill-amber-500 mr-1" /> {rAvg} / 5.0
                                                    </span>

                                                    {/* Trạng thái xử lý */}
                                                    {rev.status === 'OPEN' && <span className="bg-rose-50 text-rose-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-rose-200">Chờ tiếp nhận</span>}
                                                    {rev.status === 'IN_PROGRESS' && <span className="bg-sky-50 text-sky-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-sky-200">Đang kiểm tra</span>}
                                                    {rev.status === 'RESOLVED' && <span className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">Đã khắc phục</span>}
                                                </div>
                                            </div>

                                            {/* Tag phân loại nhận xét & vị trí thiết bị phòng máy (nếu có) */}
                                            {(() => {
                                                const fbCat = rev.comment ? classifyFeedback(rev.comment) : null;
                                                return (
                                                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                                        {fbCat && (
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border font-bold ${fbCat.badgeClass}`}>
                                                                {fbCat.label}
                                                            </span>
                                                        )}
                                                        {assetLocation && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-bold">
                                                                <Icons.Monitor className="w-3 h-3 text-amber-700" /> Vị trí máy: <b>{assetLocation}</b>
                                                            </span>
                                                        )}
                                                        {studentCode && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 font-medium">
                                                                <Icons.User className="w-3 h-3 text-indigo-700" /> MSSV: <b>{studentCode}</b>
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* Nội dung ý kiến học viên */}
                                            <p className="text-xs font-medium text-slate-800 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 leading-relaxed">
                                                "{rev.comment || 'Không để lại lời nhận xét cụ thể.'}"
                                            </p>

                                            {/* Ghi chú giải trình của Giảng viên */}
                                            {rev.teacherNote && (
                                                <div className="text-xs text-itc-800 bg-blue-50/70 p-3 rounded-2xl border border-blue-100 space-y-0.5">
                                                    <span className="font-bold flex items-center gap-1 text-[11px] text-blue-900">
                                                        <Icons.GraduationCap className="w-3.5 h-3.5 text-blue-700" /> Giảng viên giải trình:
                                                    </span>
                                                    <p className="italic text-slate-700">{rev.teacherNote}</p>
                                                </div>
                                            )}

                                            {/* Biên bản xử lý của Trung tâm / Kỹ thuật viên */}
                                            {rev.actionNote && (
                                                <div className="text-xs text-emerald-900 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 space-y-0.5">
                                                    <span className="font-bold flex items-center gap-1 text-[11px] text-emerald-800">
                                                        <Icons.Wrench className="w-3.5 h-3.5 text-emerald-700" /> Kỹ thuật viên ITC đã xử lý:
                                                    </span>
                                                    <p className="text-slate-700">{rev.actionNote}</p>
                                                </div>
                                            )}

                                            {/* Nút hành động nhanh & Chi tiết biên bản */}
                                            <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-100">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Chuyển nhanh:</span>
                                                    {rev.status !== 'IN_PROGRESS' && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => onUpdateAction(rev.id, 'IN_PROGRESS', rev.actionNote || 'Đã tiếp nhận phản hồi, kỹ thuật viên đang kiểm tra.')}
                                                            className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[10px] font-bold rounded-lg transition"
                                                            title="Chuyển trạng thái sang Đang kiểm tra"
                                                        >
                                                            Đang kiểm tra
                                                        </button>
                                                    )}
                                                    {rev.status !== 'RESOLVED' && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => onUpdateAction(rev.id, 'RESOLVED', rev.actionNote || 'Đã khắc phục hoàn tất sự cố thiết bị/phòng máy.')}
                                                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-lg transition"
                                                            title="Đánh dấu đã giải quyết xong"
                                                        >
                                                            <span className="inline-flex items-center gap-1">
                                                                <Icons.Check className="w-3 h-3 text-emerald-600" /> Đã khắc phục xong
                                                            </span>
                                                        </button>
                                                    )}
                                                </div>

                                                <button 
                                                    onClick={() => setShowActionModal({ reviewId: rev.id, status: rev.status, actionNote: rev.actionNote || '' })}
                                                    className="px-3 py-1.5 bg-itc-50 hover:bg-itc-100 text-itc-800 rounded-xl text-xs font-bold border border-itc-200 transition shadow-2xs flex items-center gap-1"
                                                >
                                                    <Icons.FileText className="w-3.5 h-3.5" />
                                                    Biên bản & Giải trình &rarr;
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="soft-card p-12 text-center text-slate-400 rounded-3xl text-xs bg-white border border-slate-200 space-y-2">
                                    <Icons.FileText className="w-8 h-8 text-slate-300 mx-auto" />
                                    <p className="font-bold text-slate-600">Không có bài đánh giá nào khớp với bộ lọc hiện tại.</p>
                                    <p className="text-[11px] text-slate-400">Hãy thử thay đổi tiêu chí phân loại hoặc từ khóa tìm kiếm.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 3: QUẢN LÝ LỚP HỌC (MULTI-TEACHER & ACADEMIC YEAR) */}
                {activeTab === 'classes' && (
                    <div className="soft-card rounded-2xl p-5 border border-slate-200 bg-white">
                        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
                            <div>
                                <h3 className="font-bold text-itc-900 text-sm">Danh sách Lớp Đào tạo tại ITC - Đại học Đà Lạt</h3>
                                <p className="text-xs text-slate-500">Phân công nhiều giảng viên, tự quản lý niên khóa và cấu hình đề khảo sát cho từng lớp</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setShowCoursesModal(true)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 border border-slate-200 transition"
                                >
                                    <Icons.BookOpen className="w-4 h-4 text-slate-600" /> Quản lý Môn học ({courses.length})
                                </button>
                                <button 
                                    onClick={() => setShowCreateClassModal(true)}
                                    className="bg-itc-800 hover:bg-itc-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition"
                                >
                                    <Icons.Plus className="w-4 h-4" /> Mở Lớp Mới (Chọn 2-3 GV)
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600">
                                <thead className="bg-itc-50 text-itc-900 font-bold uppercase border-b border-itc-200">
                                    <tr>
                                        <th className="p-3 w-28 whitespace-nowrap">Mã Lớp</th>
                                        <th className="p-3 min-w-[150px]">Khóa học / Chứng chỉ</th>
                                        <th className="p-3 w-24 text-center whitespace-nowrap">Niên khóa</th>
                                        <th className="p-3 min-w-[170px]">Giảng viên phụ trách</th>
                                        <th className="p-3 min-w-[160px]">Phòng & Lịch học</th>
                                        <th className="p-3 w-28 text-center whitespace-nowrap">Trạng thái</th>
                                        <th className="p-3 min-w-[340px] text-right whitespace-nowrap">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {classes.map((cls: any) => {
                                        const crs = courses.find((c: any) => c.id === cls.courseId);
                                        const teacherNames = getTeacherNames(cls);
                                        const academicYear = cls.academicYear || '2026';
                                        const roomFormatted = cls.room 
                                            ? (String(cls.room).toLowerCase().startsWith('phòng') ? cls.room : `Phòng Lab ${cls.room}`)
                                            : 'Phòng Lab 1';

                                        return (
                                            <tr key={cls.id} className="hover:bg-slate-50/60">
                                                <td className="p-3 font-bold text-itc-900 whitespace-nowrap">{cls.code}</td>
                                                <td className="p-3 font-medium text-slate-800">{crs ? crs.name : ''}</td>
                                                <td className="p-3 text-center whitespace-nowrap">
                                                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                        {academicYear}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <span className="font-semibold text-slate-800">{teacherNames}</span>
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-bold text-slate-800">{roomFormatted}</div>
                                                    <div className="text-[11px] text-slate-400 mt-0.5">{cls.schedule || 'Lịch học tiêu chuẩn'}</div>
                                                </td>
                                                <td className="p-3 text-center whitespace-nowrap">
                                                    {cls.status === 'OPEN_SURVEY' || cls.status === 'OPEN' ? (
                                                        <span className="bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full text-[11px] border border-emerald-200 inline-block whitespace-nowrap shadow-2xs">
                                                            Đang mở KS
                                                        </span>
                                                    ) : (
                                                        <span className="bg-slate-100 text-slate-500 font-bold px-2.5 py-1 rounded-full text-[11px] border border-slate-200 inline-block whitespace-nowrap">
                                                            Đã khóa form
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5 flex-nowrap whitespace-nowrap">
                                                        {/* STUDENT MANAGEMENT MODAL BUTTON */}
                                                        <button 
                                                            onClick={() => {
                                                                setManagingStudentsClass(cls);
                                                                setShowStudentModal(true);
                                                            }}
                                                            className="text-amber-800 hover:text-amber-900 font-bold flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg border border-amber-200 text-xs transition shrink-0"
                                                            title="Quản lý danh sách sinh viên & Theo dõi tiến độ đánh giá"
                                                        >
                                                            <Icons.User className="w-3.5 h-3.5" /> SV ({cls.studentsCount || cls.students_count || 30})
                                                        </button>

                                                        {/* CONFIGURE SURVEY MODAL BUTTON */}
                                                        <button 
                                                            onClick={() => setConfiguringSurveyClass(cls)}
                                                            className="text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg border border-indigo-200 text-xs transition shrink-0"
                                                            title="Tùy chọn câu hỏi hoặc soạn câu hỏi mới cho lớp này"
                                                        >
                                                            <Icons.BookOpen className="w-3.5 h-3.5" /> Đề KS
                                                        </button>

                                                        {/* SỬA THÔNG TIN LỚP HỌC */}
                                                        <button 
                                                            onClick={() => setEditingClass(cls)}
                                                            className="text-slate-700 hover:text-itc-800 font-bold flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg border border-slate-200 text-xs transition shrink-0"
                                                            title="Chỉnh sửa thông tin lớp học"
                                                        >
                                                            <Icons.Edit className="w-3.5 h-3.5 text-slate-600" /> Sửa
                                                        </button>

                                                        <button 
                                                            onClick={() => onToggleClassStatus(cls.id, cls.status)}
                                                            className={`font-bold px-2 py-1 rounded-lg text-xs transition border shrink-0 whitespace-nowrap ${
                                                                (cls.status === 'OPEN_SURVEY' || cls.status === 'OPEN')
                                                                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                                            }`}
                                                            title={(cls.status === 'OPEN_SURVEY' || cls.status === 'OPEN') ? 'Đóng đợt khảo sát lớp này' : 'Mở đợt khảo sát lớp này'}
                                                        >
                                                            {(cls.status === 'OPEN_SURVEY' || cls.status === 'OPEN') ? 'Đóng khảo sát' : 'Mở khảo sát'}
                                                        </button>

                                                        <button 
                                                            onClick={() => {
                                                                if (window.confirm(`Bạn có chắc chắn muốn XÓA LỚP HỌC ${cls.code}?`)) {
                                                                    onDeleteClass(cls.id);
                                                                }
                                                            }}
                                                            className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-1.5 rounded-lg transition shrink-0"
                                                            title="Xóa lớp học"
                                                        >
                                                            <Icons.Trash className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 4: QUẢN LÝ GIẢNG VIÊN */}
                {activeTab === 'teachers' && (
                    <div className="soft-card rounded-2xl p-5 border border-slate-200 bg-white">
                        <div className="flex justify-between items-center mb-5">
                            <div>
                                <h3 className="font-bold text-itc-900 text-sm">Danh sách Giảng viên ITC DLU</h3>
                                <p className="text-xs text-slate-500">Quản lý đội ngũ giảng viên và phân công vào các lớp đào tạo</p>
                            </div>
                            <button 
                                onClick={() => setShowCreateTeacherModal(true)}
                                className="bg-itc-800 hover:bg-itc-900 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 shadow-xs transition"
                            >
                                <Icons.Plus className="w-4 h-4" /> Thêm Giảng viên
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600">
                                <thead className="bg-itc-50 text-itc-900 font-bold uppercase border-b border-itc-200">
                                    <tr>
                                        <th className="p-3">Họ và Tên Giảng viên</th>
                                        <th className="p-3">Mã GV</th>
                                        <th className="p-3">Email liên hệ</th>
                                        <th className="p-3 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {teachers.map((t: any) => (
                                        <tr key={t.id} className="hover:bg-slate-50/60">
                                            <td className="p-3 font-bold text-itc-900">{t.name}</td>
                                            <td className="p-3 font-mono">{t.code}</td>
                                            <td className="p-3">{t.email}</td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button 
                                                        onClick={() => setEditingTeacher(t)}
                                                        className="text-slate-600 hover:text-itc-800 p-1.5 hover:bg-slate-100 rounded-lg transition"
                                                        title="Sửa thông tin giảng viên"
                                                    >
                                                        <Icons.Edit className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            if (confirm(`Bạn có chắc chắn muốn xóa giảng viên ${t.name}?`)) {
                                                                onDeleteTeacher(t.id);
                                                            }
                                                        }}
                                                        className="text-rose-600 hover:text-rose-800 p-1.5 hover:bg-rose-50 rounded-lg transition"
                                                        title="Xóa giảng viên"
                                                    >
                                                        <Icons.Trash className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* MODALS */}
            {showCreateClassModal && (
                <CreateClassModal 
                    courses={courses} 
                    teachers={teachers} 
                    classes={classes}
                    onClose={() => setShowCreateClassModal(false)}
                    onSubmit={(newClass: any) => {
                        onAddClass(newClass);
                        setShowCreateClassModal(false);
                    }}
                />
            )}

            {/* MODAL SỬA LỚP HỌC */}
            {editingClass && (
                <CreateClassModal 
                    courses={courses} 
                    teachers={teachers} 
                    classes={classes}
                    editingClass={editingClass}
                    onClose={() => setEditingClass(null)}
                    onSubmit={(updatedClass: any) => {
                        if (onUpdateClass) onUpdateClass(editingClass.id, updatedClass);
                        setEditingClass(null);
                    }}
                />
            )}

            {/* MODAL SỬA GIẢNG VIÊN */}
            {editingTeacher && (
                <CreateTeacherModal 
                    editingTeacher={editingTeacher}
                    onClose={() => setEditingTeacher(null)}
                    onUpdate={(id: string, updatedData: any) => {
                        if (onUpdateTeacher) onUpdateTeacher(id, updatedData);
                        setEditingTeacher(null);
                    }}
                />
            )}

            {/* CONFIGURE SURVEY QUESTIONS MODAL (REPLACING OLD QR MODAL) */}
            {configuringSurveyClass && (
                <ConfigureSurveyModal 
                    classItem={configuringSurveyClass}
                    currentUserRole="ADMIN"
                    onClose={() => setConfiguringSurveyClass(null)}
                    onSaved={onRefreshData}
                />
            )}

            {/* MANAGE COURSES MODAL */}
            {showCoursesModal && (
                <ManageCoursesModal 
                    courses={courses}
                    classes={classes}
                    onClose={() => setShowCoursesModal(false)}
                    onRefresh={onRefreshData}
                />
            )}

            {showCreateTeacherModal && (
                <CreateTeacherModal 
                    onClose={() => setShowCreateTeacherModal(false)}
                    onSubmit={() => {
                        setShowCreateTeacherModal(false);
                        onRefreshData();
                    }}
                />
            )}

            {/* Action Modal for Reviews */}
            {showActionModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl">
                        <h3 className="font-bold text-slate-900 text-sm mb-3">Cập nhật tiến độ xử lý phàn nàn</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái:</label>
                                <select 
                                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 focus:outline-none"
                                    value={showActionModal.status}
                                    onChange={(e) => setShowActionModal({...showActionModal, status: e.target.value})}
                                >
                                    <option value="OPEN">Chờ tiếp nhận</option>
                                    <option value="IN_PROGRESS">Đang kiểm tra / sửa chữa</option>
                                    <option value="RESOLVED">Đã khắc phục hoàn tất</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú hành động:</label>
                                <textarea 
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 focus:outline-none"
                                    placeholder="VD: Đã thay bàn phím mới..."
                                    value={showActionModal.actionNote}
                                    onChange={(e) => setShowActionModal({...showActionModal, actionNote: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2 justify-end">
                            <button 
                                onClick={() => setShowActionModal(null)}
                                className="px-3 py-1.5 text-slate-500 font-semibold text-xs hover:bg-slate-100 rounded-lg transition"
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={() => handleLocalUpdateAction(showActionModal.reviewId, showActionModal.status, showActionModal.actionNote)}
                                className="px-4 py-2 bg-itc-800 hover:bg-itc-900 text-white rounded-xl text-xs font-bold shadow-xs"
                            >
                                Lưu tiến độ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Student Management Modal */}
            {showStudentModal && (
                <StudentManagementModal 
                    classItem={managingStudentsClass}
                    allClasses={classes}
                    courses={courses}
                    teachers={teachers}
                    reviews={reviews}
                    appUsers={appUsers}
                    onClose={() => {
                        setShowStudentModal(false);
                        setManagingStudentsClass(null);
                    }}
                    onRefreshClassData={onRefreshData}
                />
            )}

            {/* SƠ ĐỒ MA TRẬN PHÒNG MÁY & CẢNH BÁO BẢO TRÌ (UNIFIED MODAL) */}
            {showSeatMapModal && (
                <LabSeatMapModal
                    reviews={reviews}
                    classes={classes}
                    alerts={stats.alertList || []}
                    warningThreshold={warningThreshold}
                    setWarningThreshold={setWarningThreshold}
                    roomSummaries={stats.roomFacilitySummaries || []}
                    initialTab={seatMapInitialTab}
                    initialRoom="Phòng Lab 5"
                    onClose={() => {
                        setShowSeatMapModal(false);
                        setSeatMapInitialTab('SEAT_MAP');
                    }}
                    onUpdateAction={handleLocalUpdateAction}
                    onViewClassReviews={(classId) => {
                        const cls = classes.find((c: any) => c.id === classId);
                        if (cls) {
                            setFilterClassSearch(cls.code);
                        }
                        setActiveTab('reviews');
                        setShowSeatMapModal(false);
                    }}
                />
            )}

            {/* NHẬT KÝ KIỂM TOÁN HỆ THỐNG (AUDIT LOGS MODAL) */}
            {showAuditLogsModal && (
                <AuditLogsModal
                    onClose={() => setShowAuditLogsModal(false)}
                />
            )}
        </div>
    );
};
