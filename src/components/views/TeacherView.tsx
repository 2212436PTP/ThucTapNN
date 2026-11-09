import React, { useState, useMemo } from 'react';
import { Icons } from '../ui/Icons';
import { ConfigureSurveyModal } from '../modals/ConfigureSurveyModal';
import { classifyFeedback, FeedbackCategory, FEEDBACK_CATEGORIES } from '../../lib/sentimentClassifier';

export const TeacherView = ({ 
    currentUserRole, 
    teachers, 
    selectedTeacherId, 
    setSelectedTeacherId, 
    classes, 
    reviews, 
    criteriaList, 
    stats, 
    onUpdateTeacherNote, 
    onEscalateReview 
}: any) => {
    const [configuringSurveyClass, setConfiguringSurveyClass] = useState<any>(null);

    // Filters for teacher view
    const [filterCourseId, setFilterCourseId] = useState('ALL');
    const [filterAcademicYear, setFilterAcademicYear] = useState('ALL');
    const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState<string>('ALL');

    // Tính toán chỉ số đối chuẩn (Benchmark) theo từng môn học trên toàn trung tâm
    const courseBenchmarks = useMemo(() => {
        const benchmarks: Record<string, number> = {};
        const courseGroups: Record<string, number[]> = {};

        classes.forEach((c: any) => {
            const cm = stats?.classMetrics?.[c.id];
            if (cm && cm.count > 0 && parseFloat(cm.overallAvg) > 0) {
                const cId = c.courseId || c.course_id || 'general';
                if (!courseGroups[cId]) courseGroups[cId] = [];
                courseGroups[cId].push(parseFloat(cm.overallAvg));
            }
        });

        Object.keys(courseGroups).forEach(cId => {
            const arr = courseGroups[cId];
            benchmarks[cId] = Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
        });

        return benchmarks;
    }, [classes, stats]);

    // Filter classes where this teacher is assigned (supports multi-teacher assignment)
    const teacherClasses = useMemo(() => {
        return classes.filter((c: any) => {
            const assignedIds = c.teacherIds && c.teacherIds.length > 0 ? c.teacherIds : [c.teacherId];
            const isAssigned = assignedIds.includes(selectedTeacherId);
            if (!isAssigned) return false;

            if (filterCourseId !== 'ALL' && c.courseId !== filterCourseId) return false;
            if (filterAcademicYear !== 'ALL' && (c.academicYear || '2026') !== filterAcademicYear) return false;

            return true;
        });
    }, [classes, selectedTeacherId, filterCourseId, filterAcademicYear]);

    // Unique academic years
    const academicYears = useMemo(() => {
        const years = new Set<string>();
        classes.forEach((c: any) => {
            if (c.academicYear) years.add(c.academicYear);
        });
        if (years.size === 0) years.add('2026');
        return Array.from(years);
    }, [classes]);

    // Unique courses taught by this teacher
    const teacherCourses = useMemo(() => {
        const cIds = new Set(classes.filter((c: any) => {
            const assignedIds = c.teacherIds && c.teacherIds.length > 0 ? c.teacherIds : [c.teacherId];
            return assignedIds.includes(selectedTeacherId);
        }).map((c: any) => c.courseId));
        return Array.from(cIds);
    }, [classes, selectedTeacherId]);

    // Helper: format all teacher names
    const getTeacherNames = (cls: any) => {
        const assignedIds = cls.teacherIds || (cls.teacherId ? [cls.teacherId] : []);
        const assignedTeachers = teachers.filter((t: any) => assignedIds.includes(t.id));
        if (assignedTeachers.length > 0) {
            return assignedTeachers.map((t: any) => t.name).join(', ');
        }
        return 'Chưa phân công';
    };

    return (
        <div className="flex-1 bg-slate-50 p-4 lg:p-6 font-sans">
            <div className="max-w-4xl mx-auto space-y-5">
                {/* Teacher Profile Banner */}
                <div className="soft-card p-5 rounded-2xl flex flex-wrap justify-between items-center gap-4 border-l-4 border-l-itc-800 bg-white shadow-2xs">
                    <div>
                        <h2 className="text-base font-black text-itc-900">Góc Giảng viên ITC - ĐH Đà Lạt</h2>
                        <p className="text-xs text-slate-500">Theo dõi kết quả đánh giá chất lượng giảng dạy và đóng góp ý kiến từ sinh viên.</p>
                    </div>

                    <div className="flex items-center gap-2">
                        {currentUserRole === 'ADMIN' ? (
                            <>
                                <label className="text-xs font-bold text-slate-600">Chọn Giảng viên:</label>
                                <select 
                                    value={selectedTeacherId}
                                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                                    className="border border-slate-200 rounded-xl text-xs p-2 font-bold text-itc-900 bg-slate-50 focus:outline-none"
                                >
                                    {teachers.map((t: any) => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                                    ))}
                                </select>
                            </>
                        ) : (
                            <span className="bg-itc-100 text-itc-800 px-4 py-2 rounded-xl text-sm font-black shadow-2xs border border-itc-200">
                                {teachers.find((t: any) => t.id === selectedTeacherId)?.name || 'Chưa xác định'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Filter Bar for Teacher */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-600">Niên khóa:</span>
                            <select 
                                value={filterAcademicYear}
                                onChange={(e) => setFilterAcademicYear(e.target.value)}
                                className="border border-slate-200 rounded-lg text-xs p-1.5 font-bold text-slate-800 bg-slate-50 focus:outline-none"
                            >
                                <option value="ALL">Tất cả niên khóa</option>
                                {academicYears.map((yr: string) => (
                                    <option key={yr} value={yr}>{yr}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                        {teacherClasses.length} lớp học phụ trách
                    </span>
                </div>

                {/* Teacher Classes List */}
                <div className="space-y-4">
                    {teacherClasses.length === 0 ? (
                        <div className="soft-card p-10 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs">
                            Không có lớp học nào được phân công cho giảng viên này khớp với bộ lọc.
                        </div>
                    ) : (
                        teacherClasses.map((cls: any) => {
                            const cm = stats.classMetrics[cls.id];
                            if (!cm) return null;
                            const allTeachers = getTeacherNames(cls);
                            const academicYear = cls.academicYear || '2026';

                            const percent = Math.min(100, Math.round(((cm.count || 0) / (cls.studentsCount || 30)) * 100));

                            return (
                                <div key={cls.id} className="soft-card p-5 sm:p-6 rounded-2xl space-y-4 bg-white border border-slate-200 shadow-xs hover:shadow-md transition">
                                    <div className="flex justify-between items-start gap-4 flex-wrap">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-base font-black text-itc-900">{cls.code} - {cm.courseName}</h3>
                                                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">Niên khóa: {academicYear}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Phòng: <b>{cls.room}</b> | GV phụ trách: <b className="text-slate-800">{allTeachers}</b>
                                            </p>

                                            {/* TIẾN ĐỘ THỜI GIAN THỰC CHO GIẢNG VIÊN */}
                                            <div className="mt-2.5 max-w-sm">
                                                <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                                                    <span>Tiến độ khảo sát của học viên:</span>
                                                    <span className="font-bold text-slate-800">{cm.count} / {cls.studentsCount || 30} HV</span>
                                                </div>
                                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full transition-all duration-300 ${percent >= 80 ? 'bg-emerald-500' : percent >= 50 ? 'bg-itc-600' : 'bg-amber-500'}`}
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 mt-3.5 flex-wrap">
                                                {/* CONFIGURE SURVEY QUESTIONS FOR TEACHER */}
                                                <button 
                                                    onClick={() => setConfiguringSurveyClass(cls)}
                                                    className="text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
                                                    title="Tùy chọn câu hỏi hoặc soạn câu hỏi mới cho lớp này"
                                                >
                                                    <Icons.BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Cấu hình Đề KS
                                                </button>

                                                <span className="text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs ml-1">
                                                    <Icons.Comments className="w-3.5 h-3.5 text-slate-400" /> {cm.count} phiếu đánh giá
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="flex items-baseline justify-end gap-1">
                                                <span className="text-2xl font-black text-itc-800">{cm.overallAvg}</span>
                                                <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-medium block">Điểm TB Lớp</span>

                                            {/* CHỈ SỐ ĐỐI CHUẨN BENCHMARK */}
                                            {(() => {
                                                const courseBenchmark = courseBenchmarks[cls.courseId || cls.course_id] || 4.3;
                                                const classAvg = parseFloat(cm.overallAvg) || 0;
                                                const delta = classAvg > 0 ? (classAvg - courseBenchmark) : 0;

                                                return (
                                                    <div className="mt-1.5 flex items-center justify-end gap-1 text-[11px] bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200" title="So sánh với điểm trung bình của toàn bộ môn này trong hệ thống">
                                                        <span className="text-slate-500 font-medium text-[10px]">Đ/chuẩn môn: <b>{courseBenchmark.toFixed(1)}</b></span>
                                                        {classAvg > 0 && (
                                                            <span className={`px-1 py-0.2 rounded text-[10px] font-black ${
                                                                delta >= 0 
                                                                    ? 'bg-emerald-100 text-emerald-800' 
                                                                    : 'bg-rose-100 text-rose-800'
                                                            }`}>
                                                                {delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Criteria Averages Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                        {criteriaList.map((crit: any) => (
                                            <div key={crit.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                                                <p className="text-[11px] font-medium text-slate-500">{crit.name}</p>
                                                <p className="text-xs font-black text-slate-800 mt-0.5">{cm.criteriaAvgs[crit.id] || 0} / 5.0</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* PHÂN NHÓM NHẬN XÉT TỰ ĐỘNG & Ý KIẾN HỌC VIÊN */}
                                    <div className="bg-itc-50/60 rounded-xl p-3.5 border border-itc-100 space-y-3">
                                        <div className="flex flex-wrap justify-between items-center gap-2">
                                            <h4 className="text-xs font-black text-itc-900 uppercase flex items-center gap-1.5">
                                                <Icons.Comments className="w-4 h-4" /> Ý kiến đóng góp & phản hồi từ Học viên:
                                            </h4>

                                            {/* Bộ lọc phân nhóm nhận xét tự động */}
                                            {cm.badComments && cm.badComments.length > 0 && (
                                                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[10px]">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFeedbackCategoryFilter('ALL')}
                                                        className={`px-2 py-0.5 rounded font-bold transition ${
                                                            feedbackCategoryFilter === 'ALL' ? 'bg-itc-800 text-white' : 'text-slate-600 hover:text-slate-900'
                                                        }`}
                                                    >
                                                        Tất cả ({cm.badComments.length})
                                                    </button>
                                                    {(['TEACHING_METHOD', 'TEACHER_ATTITUDE', 'FACILITIES'] as FeedbackCategory[]).map(catKey => {
                                                        const catMeta = FEEDBACK_CATEGORIES[catKey];
                                                        const count = cm.badComments.filter((r: any) => classifyFeedback(r.comment).category === catKey).length;
                                                        if (count === 0) return null;

                                                        return (
                                                            <button
                                                                key={catKey}
                                                                type="button"
                                                                onClick={() => setFeedbackCategoryFilter(catKey)}
                                                                className={`px-2 py-0.5 rounded font-bold transition ${
                                                                    feedbackCategoryFilter === catKey ? 'bg-itc-800 text-white' : 'text-slate-600 hover:text-slate-900'
                                                                }`}
                                                            >
                                                                {catMeta.label.split('&')[0]} ({count})
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {cm.badComments && cm.badComments.length > 0 ? (
                                            <div className="space-y-2">
                                                {cm.badComments
                                                    .filter((rev: any) => {
                                                        if (feedbackCategoryFilter === 'ALL') return true;
                                                        return classifyFeedback(rev.comment).category === feedbackCategoryFilter;
                                                    })
                                                    .map((rev: any, i: number) => {
                                                        const feedbackClass = classifyFeedback(rev.comment);

                                                        return (
                                                            <div key={i} className={`bg-white p-3 rounded-xl text-xs font-medium shadow-2xs border ${rev.isEscalated ? 'border-red-400 bg-red-50/20' : 'border-itc-100'}`}>
                                                                {/* Thẻ phân loại nhận xét tự động */}
                                                                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${feedbackClass.badgeClass}`}>
                                                                            {feedbackClass.label}
                                                                        </span>
                                                                        {rev.assetLocation && (
                                                                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                                                                Vị trí máy: {rev.assetLocation}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {!rev.isEscalated ? (
                                                                        <button 
                                                                            onClick={() => onEscalateReview(rev.id)}
                                                                            title="Báo cáo cho Admin xử lý"
                                                                            className="shrink-0 bg-red-50 text-red-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold hover:bg-red-100 transition-colors flex items-center gap-1 border border-red-100"
                                                                        >
                                                                            <Icons.AlertTriangle className="w-3 h-3" /> Báo cáo Admin
                                                                        </button>
                                                                    ) : (
                                                                        <span className="shrink-0 text-red-600 px-2 py-0.5 text-[10px] uppercase font-bold flex items-center gap-1 bg-red-100 rounded border border-red-200">
                                                                            <Icons.AlertTriangle className="w-3 h-3" /> Đã báo cáo
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="text-slate-800 text-xs leading-relaxed">
                                                                    "{rev.comment}"
                                                                </div>
                                                                
                                                                {/* Teacher Note Input */}
                                                                <div className="mt-2.5 pt-2 border-t border-slate-100">
                                                                    {rev.teacherNote ? (
                                                                        <div className="text-itc-blue-700 italic">
                                                                            <span className="font-bold">Ghi chú của bạn:</span> {rev.teacherNote}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex gap-2">
                                                                            <input 
                                                                                type="text" 
                                                                                placeholder="Thêm ghi chú cá nhân / giải trình gửi Admin..."
                                                                                className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-itc-500 focus:ring-1 focus:ring-itc-500 bg-slate-50"
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                                                                        onUpdateTeacherNote(rev.id, e.currentTarget.value.trim());
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <button 
                                                                                className="bg-itc-800 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-itc-900 transition-colors" 
                                                                                onClick={(e) => {
                                                                                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                                                    if (input.value.trim()) onUpdateTeacherNote(rev.id, input.value.trim());
                                                                                }}
                                                                            >
                                                                                Lưu
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 italic">Chưa có ý kiến phàn nàn/góp ý nào.</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* CONFIGURE SURVEY MODAL FOR TEACHER */}
            {configuringSurveyClass && (
                <ConfigureSurveyModal 
                    classItem={configuringSurveyClass}
                    currentUserRole="TEACHER"
                    onClose={() => setConfiguringSurveyClass(null)}
                />
            )}
        </div>
    );
};
