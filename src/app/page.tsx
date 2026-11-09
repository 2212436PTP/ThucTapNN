"use client";
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Icons } from '../components/ui/Icons';
import { AdminView } from '../components/views/AdminView';
import { TeacherView } from '../components/views/TeacherView';
import { StudentView } from '../components/views/StudentView';
import { LoginView } from '../components/views/LoginView';
import { NotificationBell } from '../components/ui/NotificationBell';
import { ReportModal } from '../components/modals/ReportModal';
import { ChangePasswordModal } from '../components/modals/ChangePasswordModal';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_CRITERIA_LIST } from '../lib/surveyQuestions';
import { getClassMeta, saveClassMeta, syncFromCloudToLocal } from '../lib/classMetaStorage';
import { computeMaintenanceAlerts, computeRoomFacilitySummaries } from '../lib/maintenanceAlerts';
import { addAuditLog } from '../lib/auditLogger';

export default function App() {
    const [courses, setCourses] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [criteriaList, setCriteriaList] = useState<any[]>([]);
    const [appUsers, setAppUsers] = useState<any[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    
    const [role, setRole] = useState('ADMIN'); // ADMIN, TEACHER
    const [warningThreshold, setWarningThreshold] = useState(3.0);
    const [toastMessage, setToastMessage] = useState('');
    const [showReport, setShowReport] = useState(false);

    // Auth & Context States
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

    // Toast logic
    const triggerToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    };

    // Fetch Initial Data
    const fetchData = async (isInitial = false) => {
        if (isInitial) setIsLoading(true);
        try {
            // Tự động đồng bộ dữ liệu cấu hình & danh sách lớp từ Supabase Cloud
            await syncFromCloudToLocal();

            const { data: cData } = await supabase.from('courses').select('*');
            const { data: uData } = await supabase.from('app_users').select('*');
            const { data: clsData } = await supabase.from('classes').select('*');
            const { data: revData } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
            const { data: critData } = await supabase.from('survey_criteria').select('*').order('order_index', { ascending: true });

            const teacherList = uData?.filter(u => u.role === 'TEACHER') || [];
            
            // Map snake_case from DB to camelCase for React
            const mappedClasses = clsData?.map(c => {
                const meta = getClassMeta(c.id, c.teacher_id, c.code);
                return {
                    id: c.id,
                    code: c.code,
                    courseId: c.course_id,
                    teacherId: c.teacher_id,
                    teacherIds: meta.teacherIds && meta.teacherIds.length > 0 ? meta.teacherIds : (c.teacher_id ? [c.teacher_id] : []),
                    academicYear: meta.academicYear || '2026',
                    schedule: c.schedule,
                    room: c.room,
                    studentsCount: c.students_count,
                    status: c.status,
                    surveyConfig: meta.surveyConfig
                };
            }) || [];

            // Lọc bỏ các bản ghi lưu cấu hình cloud, chỉ giữ lại các đánh giá thật của học viên
            const mappedReviews = revData
                ?.filter(r => !r.id.startsWith('cfg_'))
                .map(r => ({
                    id: r.id,
                    classId: r.class_id,
                    ratings: r.ratings,
                    comment: r.comment,
                    status: r.status,
                    actionNote: r.action_note,
                    teacherNote: r.teacher_note,
                    isEscalated: r.is_escalated,
                    createdAt: r.created_at
                })) || [];

            setCourses(cData || []);
            setTeachers(teacherList);
            setAppUsers(uData || []);
            setClasses(mappedClasses);
            setReviews(mappedReviews);
            setCriteriaList((critData && critData.length > 0) ? critData : DEFAULT_CRITERIA_LIST);

            if (teacherList.length > 0) setSelectedTeacherId(teacherList[0].id);
        } catch (error) {
            console.error('Error fetching data:', error);
            triggerToast('Lỗi tải dữ liệu từ máy chủ!');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data } = await supabase.from('app_users').select('*').eq('id', session.user.id).single();
                if (data) {
                    setCurrentUser(data);
                    setRole(data.role);
                    if (data.role === 'TEACHER') setSelectedTeacherId(data.id);
                }
                
                // Kích hoạt popup đổi mật khẩu nếu phát hiện truy cập từ link Invite / Recovery
                if (window.location.hash.includes('type=invite') || window.location.hash.includes('type=recovery')) {
                    setShowChangePasswordModal(true);
                    // Clear hash so it doesn't trigger again on reload
                    window.history.replaceState(null, '', window.location.pathname);
                }
            }
            fetchData(true);
        };
        initAuth();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                const { data } = await supabase.from('app_users').select('*').eq('id', session.user.id).single();
                if (data) {
                    setCurrentUser(data);
                    setRole(data.role);
                    if (data.role === 'TEACHER') setSelectedTeacherId(data.id);
                }
            } else {
                setCurrentUser(null);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // Derived States (Data Analytics Engine)
    const stats = useMemo(() => {
        const totalSubmissions = reviews.length;
        let sumAllRatings = 0;
        let countAllRatings = 0;
        const classMetrics: Record<string, any> = {};

        // Initialize classMetrics
        classes.forEach(c => {
            const course = courses.find(cr => cr.id === c.courseId);
            const teacher = teachers.find(t => t.id === c.teacherId);
            classMetrics[c.id] = {
                classInfo: c,
                courseName: course ? course.name : '',
                teacherName: teacher ? teacher.name : '',
                count: 0,
                criteriaSums: {},
                criteriaAvgs: {},
                overallAvg: 0,
                badComments: []
            };
        });

        reviews.forEach(r => {
            const cm = classMetrics[r.classId];
            if (!cm) return;

            cm.count++;
            let rSum = 0;
            criteriaList.forEach(crit => {
                if (cm.criteriaSums[crit.id] === undefined) cm.criteriaSums[crit.id] = 0;
                const score = r.ratings?.[crit.id] || 0;
                cm.criteriaSums[crit.id] += score;
                sumAllRatings += score;
                countAllRatings++;
                rSum += score;
            });

            const hasComment = r.comment && r.comment.trim().length > 0;
            if (hasComment) {
                cm.badComments.push({ id: r.id, comment: r.comment, status: r.status, teacherNote: r.teacherNote, isEscalated: r.isEscalated });
            }
        });

        // Calculate averages for each class
        Object.values(classMetrics).forEach(cm => {
            if (cm.count > 0) {
                let totalScore = 0;
                criteriaList.forEach(crit => {
                    const sum = cm.criteriaSums[crit.id] || 0;
                    const avg = sum / cm.count;
                    cm.criteriaAvgs[crit.id] = avg.toFixed(1);
                    totalScore += avg;
                });
                cm.overallAvg = criteriaList.length > 0 ? (totalScore / criteriaList.length).toFixed(1) : 0;
            } else {
                criteriaList.forEach(crit => { cm.criteriaAvgs[crit.id] = 0; });
                cm.overallAvg = 0;
            }
        });

        const centerAvgSatisfaction = countAllRatings > 0 ? (sumAllRatings / countAllRatings).toFixed(1) : 0;

        // Compute granular alerts and room facility health
        const alertList = computeMaintenanceAlerts(reviews, classes, courses, teachers, warningThreshold);
        const maintenanceCount = alertList.filter(a => a.isMaintenance).length;
        const roomFacilitySummaries = computeRoomFacilitySummaries(reviews, classes, courses);

        return {
            totalSubmissions,
            centerAvgSatisfaction,
            alertList,
            maintenanceCount,
            roomFacilitySummaries,
            classMetrics
        };
    }, [reviews, classes, courses, teachers, warningThreshold, criteriaList]);

    const handleUpdateTeacherNote = async (reviewId: string, note: string) => {
        const { error } = await supabase.from('reviews').update({ teacher_note: note }).eq('id', reviewId);
        if (!error) {
            fetchData();
            triggerToast('Đã lưu ghi chú thành công!');
        }
    };

    const handleEscalateReview = async (reviewId: string) => {
        const { error } = await supabase.from('reviews').update({ is_escalated: true }).eq('id', reviewId);
        if (!error) {
            fetchData();
            triggerToast('Đã báo cáo Admin khẩn cấp!');
        }
    };

    const handleUpdateAction = async (reviewId: string, newStatus: string, newNote: string) => {
        const { error } = await supabase.from('reviews').update({ status: newStatus, action_note: newNote }).eq('id', reviewId);
        if (!error) {
            fetchData();
            triggerToast('Đã cập nhật tiến độ khắc phục!');
        }
    };

    const handleAddClass = async (newClass: any) => {
        // Lưu metadata mở rộng (nhiều giảng viên, niên khóa)
        saveClassMeta(newClass.id, {
            academicYear: newClass.academicYear || '2026',
            teacherIds: newClass.teacherIds || [newClass.teacherId],
            surveyConfig: newClass.surveyConfig || {
                mode: 'DEFAULT_30',
                selectedQuestionIds: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],
                customQuestions: []
            }
        }, newClass.teacherId, newClass.code);

        const { error } = await supabase.from('classes').insert([{
            id: newClass.id,
            code: newClass.code,
            course_id: newClass.courseId,
            teacher_id: newClass.teacherId,
            schedule: newClass.schedule,
            room: newClass.room,
            students_count: newClass.studentsCount,
            status: newClass.status
        }]);
        if (!error) {
            fetchData();
            triggerToast('Tạo lớp thành công!');
        } else {
            console.error('Lỗi khi tạo lớp:', error);
            triggerToast('Lỗi: Không thể lưu vào Database!');
        }
    };

    const handleUpdateClass = async (classId: string, updatedClass: any) => {
        const { error } = await supabase.from('classes').update({
            code: updatedClass.code,
            course_id: updatedClass.courseId,
            teacher_id: updatedClass.teacherId,
            room: updatedClass.room,
            schedule: updatedClass.schedule,
            students_count: updatedClass.studentsCount
        }).eq('id', classId);

        // Lưu metadata bổ sung (niên khóa, giảng viên kèm theo)
        const meta = getClassMeta(classId, updatedClass.teacherId, updatedClass.code);
        saveClassMeta(classId, {
            ...meta,
            academicYear: updatedClass.academicYear || meta.academicYear,
            teacherIds: updatedClass.teacherIds || meta.teacherIds
        });

        addAuditLog({
            actor: 'Ban Quản Trị ITC (admin@dlu.edu.vn)',
            role: 'ADMIN',
            action: 'UPDATE_CLASS',
            actionLabel: 'Chỉnh sửa thông tin lớp',
            target: `Lớp ${updatedClass.code}`,
            details: `Cập nhật phòng ${updatedClass.room}, lịch học ${updatedClass.schedule}`
        });

        fetchData();
        triggerToast('Cập nhật thông tin lớp học thành công!');
    };

    const handleToggleClassStatus = async (classId: string, currentStatus: string) => {
        const isOpen = currentStatus === 'OPEN_SURVEY' || currentStatus === 'OPEN';
        const newStatus = isOpen ? 'CLOSED_SURVEY' : 'OPEN_SURVEY';
        const { error } = await supabase.from('classes').update({ status: newStatus }).eq('id', classId);
        if (!error) {
            const cls = classes.find(c => c.id === classId);
            addAuditLog({
                actor: 'Ban Quản Trị ITC (admin@dlu.edu.vn)',
                role: 'ADMIN',
                action: isOpen ? 'CLOSE_SURVEY_CLASS' : 'OPEN_SURVEY_CLASS',
                actionLabel: isOpen ? 'Đóng đợt khảo sát' : 'Mở đợt khảo sát',
                target: `Lớp ${cls ? cls.code : classId}`,
                details: isOpen ? 'Đã đóng khảo sát lớp học. Sinh viên không thể làm bài khảo sát nữa.' : 'Đã mở đợt khảo sát lớp học cho sinh viên.'
            });

            fetchData();
            triggerToast(isOpen ? 'Đã đóng đợt khảo sát cho lớp!' : 'Đã mở đợt khảo sát cho lớp!');
        }
    };

    const handleDeleteClass = async (classId: string) => {
        // Xóa reviews trước (ràng buộc khóa ngoại)
        const { error: revError } = await supabase.from('reviews').delete().eq('class_id', classId);
        if (revError) {
            console.error('Lỗi khi xóa dữ liệu:', revError);
            triggerToast('Lỗi: Không thể xóa dữ liệu khảo sát!');
            return;
        }

        // Sau đó xóa lớp
        const { error: clsError } = await supabase.from('classes').delete().eq('id', classId);
        if (!clsError) {
            setClasses(prev => prev.filter(c => c.id !== classId));
            setReviews(prev => prev.filter(r => r.classId !== classId));
            triggerToast('Đã xóa đợt khảo sát (lớp học) thành công!');
        } else {
            console.error('Lỗi khi xóa lớp:', clsError);
            triggerToast('Lỗi: Không thể xóa đợt khảo sát!');
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
    };

    const handleDeleteTeacher = async (teacherId: string) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/delete-teacher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teacherId })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Lỗi không xác định');
            
            triggerToast('Đã xóa giảng viên thành công');
            fetchData(false);
        } catch (error: any) {
            console.error('Lỗi khi xóa giảng viên:', error);
            triggerToast(`Lỗi: ${error.message}`);
            setIsLoading(false);
        }
    };

    const handleUpdateTeacher = async (teacherId: string, updatedData: any) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.from('app_users').update({
                name: updatedData.name,
                email: updatedData.email,
                code: updatedData.code
            }).eq('id', teacherId);

            if (error) throw error;

            addAuditLog({
                actor: 'Ban Quản Trị ITC (admin@dlu.edu.vn)',
                role: 'ADMIN',
                action: 'UPDATE_TEACHER',
                actionLabel: 'Chỉnh sửa giảng viên',
                target: `GV ${updatedData.name}`,
                details: `Cập nhật thông tin giảng viên ${updatedData.name} (${updatedData.code})`
            });

            triggerToast('Cập nhật thông tin giảng viên thành công!');
            fetchData(false);
        } catch (error: any) {
            console.error('Lỗi khi cập nhật giảng viên:', error);
            triggerToast(`Lỗi: ${error.message}`);
            setIsLoading(false);
        }
    };

    if (!currentUser) {
        return <LoginView onLoginSuccess={() => fetchData(true)} />;
    }

    return (
        <div suppressHydrationWarning className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
            {/* Global Toast */}
            {toastMessage && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-full text-xs font-bold shadow-2xl animate-fade-in-down flex items-center gap-2">
                    <Icons.CheckCircle className="w-4 h-4 text-emerald-400" />
                    {toastMessage}
                </div>
            )}

            {/* Header ITC */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
                <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="shrink-0 bg-white rounded-xl overflow-hidden flex items-center justify-center p-1">
                            <img src="/logoitc.jpg" alt="ITC Logo" className="h-10 object-contain" />
                        </div>
                        <div>
                            <h1 className="font-extrabold text-itc-blue-900 text-sm lg:text-base leading-tight tracking-tight uppercase">ITC Quality Dashboard</h1>
                            <p className="text-[10px] lg:text-xs text-slate-500 font-medium">Trung tâm Công nghệ Thông tin - Trường ĐH Đà Lạt</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-3">
                        {/* CHUÔNG THÔNG BÁO CHO TỪNG ROLE (ADMIN / TEACHER / STUDENT) */}
                        <NotificationBell
                            role={role as any}
                            currentUser={currentUser}
                            classes={classes}
                            courses={courses}
                            teachers={teachers}
                            reviews={reviews}
                        />

                        {role === 'ADMIN' && (
                            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                                <Icons.Shield className="w-3.5 h-3.5 text-itc-700" /> Ban Quản Trị ITC
                            </span>
                        )}

                        {role === 'TEACHER' && (
                            <span className="bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold px-3 py-1.5 rounded-lg hidden sm:inline-flex items-center gap-1.5">
                                <Icons.User className="w-3.5 h-3.5 text-blue-600" /> {currentUser?.name || 'Giảng viên'}
                            </span>
                        )}

                        {role === 'STUDENT' && (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-lg hidden sm:inline-flex items-center gap-1.5">
                                <Icons.GraduationCap className="w-3.5 h-3.5 text-emerald-600" /> {currentUser?.name || 'Sinh viên'} ({currentUser?.code || 'MSSV'})
                            </span>
                        )}

                        {role === 'ADMIN' && (
                            <button 
                                onClick={() => setShowReport(true)}
                                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-itc-50 text-itc-800 hover:bg-itc-100 border border-itc-200 rounded-lg text-xs font-bold transition-colors"
                            >
                                <Icons.FileText className="w-4 h-4" /> Xuất Báo Cáo
                            </button>
                        )}

                        <button 
                            onClick={() => setShowChangePasswordModal(true)}
                            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                        >
                            <Icons.Lock className="w-3.5 h-3.5" /> Đổi mật khẩu
                        </button>

                        <button 
                            onClick={handleLogout}
                            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition"
                        >
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative">
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20">
                        <Icons.Loader className="w-10 h-10 text-itc-600 animate-spin mb-4" />
                        <p className="text-sm font-semibold text-slate-500">Đang tải dữ liệu từ Supabase...</p>
                    </div>
                ) : (
                    <>
                        {role === 'ADMIN' && (
                            <AdminView 
                                classes={classes} 
                                courses={courses} 
                                teachers={teachers} 
                                reviews={reviews} 
                                appUsers={appUsers}
                                criteriaList={criteriaList}
                                stats={stats} 
                                warningThreshold={warningThreshold} 
                                setWarningThreshold={setWarningThreshold} 
                                onUpdateAction={handleUpdateAction}
                                onAddClass={handleAddClass}
                                onUpdateClass={handleUpdateClass}
                                onToggleClassStatus={handleToggleClassStatus}
                                onDeleteClass={handleDeleteClass}
                                onRefreshData={() => fetchData(false)}
                                onDeleteTeacher={handleDeleteTeacher}
                                onUpdateTeacher={handleUpdateTeacher}
                            />
                        )}
                        
                        {role === 'TEACHER' && (
                            <TeacherView 
                                currentUserRole={currentUser?.role}
                                teachers={teachers} 
                                selectedTeacherId={selectedTeacherId} 
                                setSelectedTeacherId={setSelectedTeacherId} 
                                classes={classes} 
                                reviews={reviews}
                                criteriaList={criteriaList}
                                stats={stats} 
                                onUpdateTeacherNote={handleUpdateTeacherNote}
                                onEscalateReview={handleEscalateReview}
                            />
                        )}

                        {role === 'STUDENT' && (
                            <StudentView 
                                currentUser={currentUser?.role === 'STUDENT' ? currentUser : (appUsers.find(u => u.role === 'STUDENT') || { ...currentUser, code: '2110452', name: 'Nguyễn Hoàng Minh Châu' })}
                                classes={classes}
                                courses={courses}
                                teachers={teachers}
                                reviews={reviews}
                                appUsers={appUsers}
                            />
                        )}
                    </>
                )}
            </main>

            {/* Modals */}
            {showReport && (
                <ReportModal 
                    stats={stats} 
                    classes={classes}
                    courses={courses}
                    teachers={teachers}
                    reviews={reviews}
                    warningThreshold={warningThreshold} 
                    onClose={() => setShowReport(false)} 
                />
            )}
            
            {showChangePasswordModal && (
                <ChangePasswordModal 
                    onClose={() => setShowChangePasswordModal(false)}
                    onSuccess={() => {
                        setShowChangePasswordModal(false);
                        triggerToast('Đã lưu mật khẩu mới thành công!');
                    }}
                />
            )}
        </div>
    );
}


