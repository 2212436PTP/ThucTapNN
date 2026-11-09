"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { Icons } from '../../components/ui/Icons';
import { LIKERT_LABELS } from '../../lib/surveyQuestions';
import { 
    getClassMeta, 
    resolveClassQuestions, 
    getClassStudents, 
    recordStudentSurveySubmission, 
    ClassStudentItem 
} from '../../lib/classMetaStorage';

function SurveyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const queryClassId = searchParams.get('classId');
    const queryStudentCode = searchParams.get('studentCode');
    const queryStudentName = searchParams.get('studentName');

    // Selected class ID (either from query or selected by student)
    const [selectedClassId, setSelectedClassId] = useState<string | null>(queryClassId);

    // List of classes for selection portal
    const [allClasses, setAllClasses] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [studentUsers, setStudentUsers] = useState<any[]>([]);
    const [searchKeyword, setSearchKeyword] = useState('');

    // Active survey state
    const [classData, setClassData] = useState<any>(null);
    const [courseData, setCourseData] = useState<any>(null);
    const [teacherData, setTeacherData] = useState<any>(null);
    const [classReviews, setClassReviews] = useState<any[]>([]);
    const [classStudents, setClassStudents] = useState<ClassStudentItem[]>([]);
    const [selectedStudentCode, setSelectedStudentCode] = useState<string>('');

    // Xác thực danh tính sinh viên tại cổng khảo sát (Chống mạo danh MSSV)
    const [authMode, setAuthMode] = useState<'IDENTIFIED' | 'ANONYMOUS'>('IDENTIFIED');
    const [authMSSV, setAuthMSSV] = useState('');
    const [authPassword, setAuthPassword] = useState('123456');
    const [verifiedStudent, setVerifiedStudent] = useState<ClassStudentItem | null>(null);
    const [authError, setAuthError] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Answers state: key is question id, value is Likert score (1..5)
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // GÓC NHÌN SINH VIÊN: Chế độ khảo sát từng bước (Wizard) vs Cuộn 1 trang (Single Page)
    const [viewMode, setViewMode] = useState<'WIZARD' | 'SINGLE_PAGE'>('WIZARD');
    const [wizardStep, setWizardStep] = useState<number>(0);
    const [assetLocation, setAssetLocation] = useState<string>(''); // Vị trí / Số máy gặp sự cố
    const [draftRestored, setDraftRestored] = useState<boolean>(false);
    const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);

    // Khôi phục bản nháp khảo sát từ LocalStorage nếu có
    useEffect(() => {
        if (!selectedClassId) return;
        try {
            const rawDraft = localStorage.getItem(`survey_draft_${selectedClassId}`);
            if (rawDraft) {
                const parsed = JSON.parse(rawDraft);
                if (parsed.answers && Object.keys(parsed.answers).length > 0) {
                    setAnswers(parsed.answers);
                    if (parsed.comment) setComment(parsed.comment);
                    if (parsed.assetLocation) setAssetLocation(parsed.assetLocation);
                    if (parsed.authMSSV) setAuthMSSV(parsed.authMSSV);
                    setDraftRestored(true);
                }
            }
        } catch (e) {
            console.error('Lỗi khi đọc draft:', e);
        }
    }, [selectedClassId]);

    // Tự động lưu nháp câu trả lời vào LocalStorage
    useEffect(() => {
        if (!selectedClassId || submitted) return;
        if (Object.keys(answers).length === 0 && !comment && !assetLocation) return;

        const draftData = {
            answers,
            comment,
            assetLocation,
            authMSSV,
            updatedAt: new Date().toISOString()
        };
        try {
            localStorage.setItem(`survey_draft_${selectedClassId}`, JSON.stringify(draftData));
        } catch (e) {
            console.error('Lỗi khi lưu draft:', e);
        }
    }, [selectedClassId, answers, comment, assetLocation, authMSSV, submitted]);

    // Xóa bản nháp
    const handleClearDraft = () => {
        if (!selectedClassId) return;
        try {
            localStorage.removeItem(`survey_draft_${selectedClassId}`);
        } catch (e) {
            console.error(e);
        }
        setAnswers({});
        setComment('');
        setAssetLocation('');
        setDraftRestored(false);
    };

    // Sync selectedClassId with URL param if it changes
    useEffect(() => {
        if (queryClassId) {
            setSelectedClassId(queryClassId);
        }
    }, [queryClassId]);

    // Initial load: Fetch all courses, teachers, and classes
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const [cRes, uRes, clsRes] = await Promise.all([
                    supabase.from('courses').select('*'),
                    supabase.from('app_users').select('*'),
                    supabase.from('classes').select('*')
                ]);

                setCourses(cRes.data || []);
                setTeachers(uRes.data?.filter((u: any) => u.role === 'TEACHER') || []);
                setStudentUsers(uRes.data?.filter((u: any) => u.role === 'STUDENT') || []);
                setAllClasses(clsRes.data || []);
            } catch (err: any) {
                console.error('Error loading data:', err);
                setError('Không thể tải danh sách dữ liệu từ máy chủ.');
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, []);

    // Load active class details when selectedClassId changes
    useEffect(() => {
        if (!selectedClassId) {
            setClassData(null);
            setCourseData(null);
            setTeacherData(null);
            setClassReviews([]);
            setClassStudents([]);
            setSelectedStudentCode('');
            setAnswers({});
            setComment('');
            setSubmitted(false);
            return;
        }

        const fetchClassDetail = async () => {
            setIsLoading(true);
            setError('');
            try {
                const { data: cData, error: cErr } = await supabase.from('classes').select('*').eq('id', selectedClassId).single();
                if (cErr || !cData) throw new Error('Không tìm thấy thông tin lớp học này.');

                const [crRes, tRes, revRes] = await Promise.all([
                    supabase.from('courses').select('*').eq('id', cData.course_id).single(),
                    supabase.from('app_users').select('*').eq('id', cData.teacher_id).single(),
                    supabase.from('reviews').select('*').eq('class_id', selectedClassId)
                ]);

                setClassData(cData);
                setCourseData(crRes.data || null);
                setTeacherData(tRes.data || null);
                setClassReviews(revRes.data || []);
                setAnswers({});
                setComment('');
                setSubmitted(false);
            } catch (err: any) {
                setError(err.message || 'Lỗi khi tải chi tiết khảo sát.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchClassDetail();
    }, [selectedClassId]);

    // Đồng bộ danh sách sinh viên lớp & tiến độ đánh giá
    useEffect(() => {
        if (!selectedClassId || !classData) {
            setClassStudents([]);
            return;
        }
        const count = classData.students_count || classData.studentsCount || 30;
        const list = getClassStudents(selectedClassId, count, studentUsers, classReviews);
        setClassStudents(list);

        // Tự động nhận diện sinh viên từ URL query hoặc từ tài khoản đang đăng nhập trong máy
        let currentLoggedInUser: any = null;
        if (typeof window !== 'undefined') {
            try {
                const storedUser = localStorage.getItem('currentUser');
                if (storedUser) currentLoggedInUser = JSON.parse(storedUser);
            } catch {}
        }

        const effectiveCode = (queryStudentCode || (currentLoggedInUser?.role === 'STUDENT' ? currentLoggedInUser.code : ''))?.trim().toLowerCase();
        const effectiveName = queryStudentName || (currentLoggedInUser?.role === 'STUDENT' ? currentLoggedInUser.name : '');

        if (effectiveCode) {
            const found = list.find(s => s.code.toLowerCase() === effectiveCode) || 
                          studentUsers.find(s => s.code?.toLowerCase() === effectiveCode);
            if (found) {
                const item: ClassStudentItem = {
                    id: found.id || `student_${found.code}`,
                    code: found.code,
                    name: found.name || effectiveName || `Sinh viên ${found.code}`,
                    email: found.email || `${found.code}@sinhvien.dlu.edu.vn`,
                    hasSubmitted: Boolean(found.hasSubmitted),
                    submittedAt: found.submittedAt,
                    score: found.score
                };
                setVerifiedStudent(item);
                setSelectedStudentCode(item.code);
                setAuthMSSV(item.code);
            } else {
                const item: ClassStudentItem = {
                    id: `student_${effectiveCode}`,
                    code: effectiveCode,
                    name: effectiveName || `Sinh viên ${effectiveCode}`,
                    email: `${effectiveCode}@sinhvien.dlu.edu.vn`,
                    hasSubmitted: false
                };
                setVerifiedStudent(item);
                setSelectedStudentCode(item.code);
                setAuthMSSV(item.code);
            }
        }
    }, [selectedClassId, classData, studentUsers, classReviews, queryStudentCode, queryStudentName]);

    // Class questions configuration (supports either full 30 questions or customized questions by teacher/admin)
    const classQuestionsConfig = useMemo(() => {
        if (!selectedClassId || !classData) {
            return {
                sections: [],
                totalQuestions: 0
            };
        }
        const meta = getClassMeta(selectedClassId, classData.teacher_id, classData.code);
        return resolveClassQuestions(meta);
    }, [selectedClassId, classData]);

    const activeQuestions = useMemo(() => {
        return classQuestionsConfig.sections.flatMap(s => s.questions);
    }, [classQuestionsConfig]);

    // TỐI ƯU TRẢI NGHIỆM: Hỗ trợ phím tắt số 1, 2, 3, 4, 5 & Tự động nhảy câu tiếp theo
    useEffect(() => {
        if (!selectedClassId || !classData || classData.status === 'CLOSED' || submitted) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }

            const validKeys = ['1', '2', '3', '4', '5'];
            if (!validKeys.includes(e.key)) return;

            const starVal = parseInt(e.key, 10);

            if (viewMode === 'WIZARD') {
                if (wizardStep >= classQuestionsConfig.sections.length) return;
                const currentSec = classQuestionsConfig.sections[wizardStep];
                if (!currentSec || !currentSec.questions.length) return;

                // Tìm câu hỏi đang focus hoặc câu hỏi chưa trả lời đầu tiên
                let targetQ = currentSec.questions.find(q => q.id === activeQuestionId);
                if (!targetQ) {
                    targetQ = currentSec.questions.find(q => answers[q.id] === undefined) || currentSec.questions[0];
                }

                if (targetQ) {
                    e.preventDefault();
                    setAnswers(prev => ({ ...prev, [targetQ.id]: starVal }));

                    const curIdx = currentSec.questions.findIndex(q => q.id === targetQ.id);
                    if (curIdx < currentSec.questions.length - 1) {
                        const nextQ = currentSec.questions[curIdx + 1];
                        setActiveQuestionId(nextQ.id);
                    } else {
                        // Đã trả lời đến câu cuối nhóm -> tự động chuyển nhóm tiếp theo
                        setTimeout(() => {
                            setWizardStep(prev => Math.min(classQuestionsConfig.sections.length, prev + 1));
                            window.scrollTo({ top: 160, behavior: 'smooth' });
                            setActiveQuestionId(null);
                        }, 220);
                    }
                }
            } else {
                // Chế độ xem Cuộn toàn trang (SINGLE_PAGE)
                let targetQ = activeQuestions.find(q => q.id === activeQuestionId);
                if (!targetQ) {
                    targetQ = activeQuestions.find(q => answers[q.id] === undefined) || activeQuestions[0];
                }
                if (targetQ) {
                    e.preventDefault();
                    setAnswers(prev => ({ ...prev, [targetQ.id]: starVal }));

                    const curIdx = activeQuestions.findIndex(q => q.id === targetQ.id);
                    if (curIdx < activeQuestions.length - 1) {
                        const nextQ = activeQuestions[curIdx + 1];
                        setActiveQuestionId(nextQ.id);
                        const nextEl = document.getElementById(`q_item_${nextQ.id}`);
                        if (nextEl) {
                            nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedClassId, classData, submitted, viewMode, wizardStep, classQuestionsConfig, activeQuestions, activeQuestionId, answers]);

    // Get current class meta (teachers list & academic year)
    const currentClassMeta = useMemo(() => {
        if (!selectedClassId || !classData) return null;
        return getClassMeta(selectedClassId, classData.teacher_id, classData.code);
    }, [selectedClassId, classData]);

    const teacherNamesDisplay = useMemo(() => {
        if (!currentClassMeta || teachers.length === 0) return teacherData?.name || 'Chưa cập nhật';
        const assignedTeachers = teachers.filter((t: any) => currentClassMeta.teacherIds.includes(t.id));
        if (assignedTeachers.length > 0) {
            return assignedTeachers.map((t: any) => t.name).join(', ');
        }
        return teacherData?.name || 'Chưa cập nhật';
    }, [currentClassMeta, teachers, teacherData]);

    // Filter open classes for selection portal
    const openClasses = useMemo(() => {
        return allClasses.map(cls => {
            const meta = getClassMeta(cls.id, cls.teacher_id, cls.code);
            const course = courses.find(c => c.id === cls.course_id);
            const assignedTeachers = teachers.filter((t: any) => (meta.teacherIds || [cls.teacher_id]).includes(t.id));
            const teacherNames = assignedTeachers.length > 0 ? assignedTeachers.map((t: any) => t.name).join(', ') : 'Chưa phân công';
            const resolved = resolveClassQuestions(meta);

            return {
                ...cls,
                courseName: course?.name || 'Môn học chưa đặt tên',
                teacherNames,
                academicYear: meta.academicYear || '2026',
                questionCount: resolved.totalQuestions
            };
        }).filter(cls => {
            const keyword = searchKeyword.toLowerCase();
            return (
                cls.courseName.toLowerCase().includes(keyword) ||
                cls.code.toLowerCase().includes(keyword) ||
                cls.teacherNames.toLowerCase().includes(keyword) ||
                cls.academicYear.toLowerCase().includes(keyword)
            );
        });
    }, [allClasses, courses, teachers, searchKeyword]);

    const answeredCount = Object.keys(answers).length;
    const isCompleted = activeQuestions.length > 0 && answeredCount === activeQuestions.length;

    // Sinh viên được chọn để định danh
    const currentStudent = useMemo(() => {
        if (!selectedStudentCode) return null;
        return classStudents.find(s => s.code === selectedStudentCode) || null;
    }, [selectedStudentCode, classStudents]);

    // Xác thực tài khoản học viên (Chống mạo danh MSSV của bạn học)
    const handleVerifyStudent = () => {
        setAuthError('');
        if (!authMSSV.trim()) {
            setAuthError('Vui lòng chọn hoặc nhập Mã Sinh Viên (MSSV)!');
            return;
        }
        if (!authPassword.trim()) {
            setAuthError('Vui lòng nhập mật khẩu xác thực!');
            return;
        }

        const mssvClean = authMSSV.trim().toLowerCase();
        const found = classStudents.find(s => s.code.toLowerCase() === mssvClean) || 
                      studentUsers.find(s => s.code?.toLowerCase() === mssvClean);

        if (!found) {
            setAuthError(`Không tìm thấy sinh viên có MSSV "${authMSSV}" trong danh sách lớp!`);
            return;
        }

        // Mật khẩu sinh viên chuẩn hóa trong hệ thống là 123456
        if (authPassword.trim() !== '123456') {
            setAuthError('Mật khẩu không chính xác! (Mật khẩu cấp phát mặc định: 123456)');
            return;
        }

        const studentItem: ClassStudentItem = {
            id: found.id || `student_${found.code}`,
            code: found.code,
            name: found.name,
            email: found.email,
            hasSubmitted: Boolean(found.hasSubmitted),
            submittedAt: found.submittedAt,
            score: found.score
        };

        setVerifiedStudent(studentItem);
        setSelectedStudentCode(studentItem.code);
        setAuthError('');
    };

    // Quick fill for testing
    const handleQuickFill = (type: 'positive' | 'critical' | 'clear') => {
        if (type === 'clear') {
            setAnswers({});
            setComment('');
            return;
        }

        const newAnswers: Record<number, number> = {};
        activeQuestions.forEach(q => {
            if (type === 'positive') {
                newAnswers[q.id] = Math.random() > 0.3 ? 5 : 4;
            } else {
                newAnswers[q.id] = Math.random() > 0.4 ? 2 : 1;
            }
        });
        setAnswers(newAnswers);

        if (type === 'positive') {
            setComment('Khóa học rất chất lượng, các giảng viên nhiệt tình hỗ trợ và giải đáp thắc mắc.');
        } else {
            setComment('Phòng máy số 3 máy tính cấu hình hơi yếu, máy lạnh đôi khi không mát mong trung tâm bảo trì lại.');
        }
    };

    // Handle submit review
    const handleSubmit = async () => {
        if (!isCompleted) {
            alert(`Bạn mới trả lời ${answeredCount}/${activeQuestions.length} câu. Vui lòng hoàn thành tất cả các câu hỏi trước khi nộp bài!`);
            return;
        }

        const studentToRecord = authMode === 'IDENTIFIED' ? (verifiedStudent || currentStudent) : null;

        if (authMode === 'IDENTIFIED' && !studentToRecord) {
            alert('Vui lòng hoàn tất xác thực MSSV hoặc chọn chế độ Khảo sát Ẩn danh trước khi nộp bài!');
            return;
        }

        if (studentToRecord?.hasSubmitted) {
            alert(`Học viên ${studentToRecord.name} (${studentToRecord.code}) đã gửi đánh giá vào lúc ${new Date(studentToRecord.submittedAt || '').toLocaleString('vi-VN')}. Không thể gửi lại!`);
            return;
        }

        setSubmitting(true);
        try {
            // Tính điểm trung bình cho từng nhóm nội dung
            const groupRatings: Record<string, number> = {};
            classQuestionsConfig.sections.forEach((sec, idx) => {
                const secSum = sec.questions.reduce((acc, q) => acc + (answers[q.id] || 0), 0);
                const secAvg = sec.questions.length > 0 ? Number((secSum / sec.questions.length).toFixed(1)) : 5;
                groupRatings[`group_${idx + 1}`] = secAvg;
            });

            // Tự động kiểm tra tiêu chí cảnh báo: nếu có bất kỳ câu nào <= 2 sao hoặc comment phàn nàn
            const hasLowScore = Object.values(answers).some(val => val <= 2);
            const hasComplaintKeywords = comment && /(kém|tệ|chán|không hiểu|khó hiểu|ồn|chậm|bức xúc|thất vọng|hỏng|yếu|lag)/i.test(comment);
            const isEscalated = hasLowScore || Boolean(hasComplaintKeywords);

            // Tính điểm trung bình toàn bài
            const validVals = Object.values(answers);
            const overallAvg = validVals.length > 0 
                ? Number((validVals.reduce((a, b) => a + b, 0) / validVals.length).toFixed(1)) 
                : 5.0;

            // Xây dựng comment tổng hợp (đính kèm vị trí máy nếu có)
            const cleanComment = comment.trim();
            const formattedComment = assetLocation.trim() 
                ? `[Vị trí thiết bị: ${assetLocation.trim()}] ${cleanComment}`
                : cleanComment;

            const { error: insErr } = await supabase.from('reviews').insert([{
                id: 'rev_' + Date.now(),
                class_id: selectedClassId,
                ratings: {
                    ...answers, // Lưu chi tiết các câu đã chọn
                    ...groupRatings, // Lưu điểm trung bình nhóm
                    ...(assetLocation.trim() ? { asset_location: assetLocation.trim() } : {}),
                    ...(studentToRecord ? {
                        student_code: studentToRecord.code,
                        student_name: studentToRecord.name,
                        is_authenticated: true
                    } : {
                        is_anonymous: true
                    })
                },
                comment: formattedComment,
                status: 'OPEN',
                is_escalated: isEscalated
            }]);

            if (insErr) throw insErr;

            // Xóa bản nháp sau khi nộp thành công
            if (selectedClassId) {
                try {
                    localStorage.removeItem(`survey_draft_${selectedClassId}`);
                } catch (e) {
                    console.error(e);
                }
            }

            // Ghi nhận trạng thái hoàn thành khảo sát cho sinh viên
            if (studentToRecord && selectedClassId) {
                recordStudentSurveySubmission(selectedClassId, studentToRecord.code, overallAvg);
            }

            setSubmitted(true);
        } catch (err: any) {
            console.error('Submit error:', err);
            alert('Đã có lỗi xảy ra khi nộp bài khảo sát. Vui lòng thử lại!');
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
                <Icons.Loader className="w-10 h-10 text-itc-800 animate-spin mb-3" />
                <p className="text-sm font-semibold text-slate-600">Đang tải dữ liệu khảo sát...</p>
            </div>
        );
    }

    // Success Screen
    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/30 flex items-center justify-center p-4 font-sans">
                <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200/80 max-w-md w-full text-center animate-in zoom-in-95 duration-200">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Icons.CheckCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Hoàn Tất Đánh Giá!</h2>
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                        Cảm ơn bạn đã hoàn thành đầy đủ <b className="text-slate-800">{activeQuestions.length} câu hỏi</b> đánh giá cho lớp <b className="text-slate-800">{classData?.code}</b> ({courseData?.name}). Đánh giá của bạn được bảo mật hoàn toàn ẩn danh.
                    </p>

                    <div className="space-y-3">
                        <button 
                            onClick={() => {
                                if (typeof window !== 'undefined' && window.opener) {
                                    window.close();
                                } else {
                                    router.push('/');
                                }
                            }}
                            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-itc-800 hover:bg-itc-900 text-white rounded-xl font-bold text-sm shadow-md transition-all hover:-translate-y-0.5"
                        >
                            <Icons.CheckCircle className="w-4 h-4" /> Đóng khảo sát & Quay về Thời khóa biểu
                        </button>
                        
                        <button 
                            onClick={() => {
                                setSelectedClassId(null);
                                router.push('/survey');
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
                        >
                            <Icons.BookOpen className="w-4 h-4" /> Khảo sát môn học khác
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Active Survey Form for Selected Class
    if (selectedClassId && classData) {
        const isClosed = classData.status === 'CLOSED_SURVEY';
        const academicYear = currentClassMeta?.academicYear || '2026';

        return (
            <div className="min-h-screen bg-slate-50 font-sans pb-28">
                {/* Header */}
                <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 shadow-xs">
                    <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                        <Link 
                            href="/"
                            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-itc-800 transition py-1.5 px-2.5 rounded-lg hover:bg-slate-100"
                        >
                            <Icons.ArrowLeft className="w-4 h-4" /> Quay về Thời khóa biểu
                        </Link>

                        <div className="flex items-center gap-2">
                            <img src="/logoitc.jpg" alt="ITC Logo" className="h-8 object-contain" />
                            <span className="hidden sm:inline-block font-black text-xs text-itc-800 uppercase tracking-wider">CỔNG KHẢO SÁT CHẤT LƯỢNG ĐÀO TẠO</span>
                        </div>

                        <Link 
                            href="/"
                            className="flex items-center gap-1.5 text-xs font-bold text-itc-800 bg-itc-50 hover:bg-itc-100 px-3 py-1.5 rounded-lg border border-itc-200 transition"
                        >
                            <Icons.Monitor className="w-3.5 h-3.5" /> Dashboard
                        </Link>
                    </div>
                </header>

                <main className="max-w-3xl mx-auto py-8 px-4">
                    {/* Class Info Banner */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-7 mb-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-44 h-44 bg-itc-50/80 rounded-bl-full pointer-events-none"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-3 py-1 rounded-full border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Khảo sát môn học ({activeQuestions.length} câu)
                                </span>
                                {verifiedStudent && (
                                    <span className="inline-flex items-center gap-1.5 bg-itc-50 text-itc-900 text-[11px] font-bold px-3 py-1 rounded-full border border-itc-200">
                                        <Icons.User className="w-3.5 h-3.5 text-itc-700" />
                                        Học viên: {verifiedStudent.name} ({verifiedStudent.code})
                                    </span>
                                )}
                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                                    Niên khóa: {academicYear}
                                </span>
                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                    Bảo mật hoàn toàn ẩn danh
                                </span>
                            </div>

                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mb-1">{courseData?.name}</h1>
                            <div className="mb-4">
                                <p className="text-xs sm:text-sm font-bold text-itc-800">Mã lớp: {classData.code}</p>
                            </div>

                            {/* Draft Restored Banner */}
                            {draftRestored && (
                                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in">
                                    <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                                        <Icons.Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>Đã tự động khôi phục các câu trả lời bạn đang làm dở trước đó.</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClearDraft}
                                        className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                                    >
                                        Xóa bản nháp làm lại
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
                                <div className="flex items-center gap-2">
                                    <Icons.User className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>Giảng viên: <b className="text-slate-800">{teacherNamesDisplay}</b></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.Monitor className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>Phòng máy: <b className="text-slate-800">{classData.room || 'Chưa xếp phòng'}</b></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {isClosed ? (
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <Icons.CheckCircle className="w-8 h-8" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 mb-1">Khảo sát đã đóng</h2>
                            <p className="text-slate-500 text-xs leading-relaxed max-w-sm mx-auto mb-6">
                                Đợt khảo sát chất lượng cho lớp <b>{classData.code}</b> đã kết thúc nhận phản hồi.
                            </p>
                            <button 
                                onClick={() => {
                                    setSelectedClassId(null);
                                    router.push('/survey');
                                }}
                                className="px-5 py-2.5 bg-itc-800 text-white rounded-xl font-bold text-xs hover:bg-itc-900 transition"
                            >
                                Chọn môn học khác
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Quick Progress & Demo Helper */}
                            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-700">Tiến độ trả lời:</span>
                                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                            {answeredCount}/{activeQuestions.length} câu
                                        </span>
                                    </div>
                                    <div className="w-48 sm:w-64 bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5">
                                        <div 
                                            className="h-full bg-emerald-500 transition-all duration-300"
                                            style={{ width: `${activeQuestions.length > 0 ? (answeredCount / activeQuestions.length) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Quick fill helper for testers */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <button 
                                        type="button"
                                        onClick={() => handleQuickFill('positive')}
                                        className="text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition"
                                        title="Tự động điền điểm tốt để test nhanh"
                                    >
                                        Điền nhanh (4-5 sao)
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleQuickFill('critical')}
                                        className="text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1.5 rounded-lg transition"
                                        title="Tự động điền điểm thấp & khiếu nại để test cảnh báo"
                                    >
                                        Điền phản ánh (1-2 sao)
                                    </button>
                                    {answeredCount > 0 && (
                                        <button 
                                            type="button"
                                            onClick={() => handleQuickFill('clear')}
                                            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 px-2 py-1.5 rounded-lg transition"
                                        >
                                            Xóa làm lại
                                        </button>
                                    )}

                                    {/* Chuyển đổi chế độ: Từng bước (Wizard) vs Cuộn 1 trang */}
                                    <div className="flex bg-slate-100 p-0.5 rounded-xl ml-auto border border-slate-200">
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('WIZARD')}
                                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                                                viewMode === 'WIZARD' ? 'bg-white text-itc-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                                            }`}
                                            title="Khuyên dùng trên điện thoại: Chia thành từng bước ngắn tránh mỏi tay"
                                        >
                                            Từng bước (Wizard)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('SINGLE_PAGE')}
                                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                                                viewMode === 'SINGLE_PAGE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                                            }`}
                                            title="Xem toàn bộ 30 câu hỏi cuộn trên 1 trang"
                                        >
                                            Cuộn toàn trang
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Thông báo nếu sinh viên đã hoàn thành trước đó */}
                            {verifiedStudent?.hasSubmitted && (
                                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-center space-y-3 shadow-xs">
                                    <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                                        <Icons.CheckCircle className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-base">Bạn đã gửi phiếu khảo sát cho môn học này</h3>
                                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                                        Học viên <b>{verifiedStudent.name}</b> ({verifiedStudent.code}) đã hoàn thành đánh giá vào lúc{' '}
                                        <b>{new Date(verifiedStudent.submittedAt || '').toLocaleString('vi-VN')}</b>. Mỗi sinh viên chỉ gửi khảo sát 1 lần cho lớp này.
                                    </p>
                                    <div className="pt-2">
                                        <Link 
                                            href="/"
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-itc-800 text-white rounded-xl text-xs font-bold hover:bg-itc-900 transition shadow-xs"
                                        >
                                            <Icons.ArrowLeft className="w-4 h-4" /> Quay về Thời khóa biểu
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* CHẾ ĐỘ WIZARD (TỪNG BƯỚC) */}
                            {viewMode === 'WIZARD' ? (
                                <div className="space-y-4">
                                    {/* Mẹo phím tắt làm bài nhanh */}
                                    <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-3 px-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                            <span>
                                                <b>Mẹo hoàn thành bài nhanh:</b> Bấm phím số <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 shadow-2xs">1</kbd> đến <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 shadow-2xs">5</kbd> trên bàn phím để chấm điểm & tự động chuyển câu hỏi tiếp theo (dưới 2 phút).
                                            </span>
                                        </div>
                                    </div>

                                    {/* Stepper Navigation Header */}
                                    <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs overflow-x-auto">
                                        <div className="flex items-center gap-1.5 min-w-max">
                                            {classQuestionsConfig.sections.map((sec, idx) => {
                                                const isCurrent = wizardStep === idx;
                                                const isPassed = wizardStep > idx;
                                                const answeredInSec = sec.questions.filter(q => answers[q.id] !== undefined).length;
                                                const isFull = answeredInSec === sec.questions.length;

                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setWizardStep(idx)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                            isCurrent
                                                                ? 'bg-itc-800 text-white shadow-xs'
                                                                : isPassed
                                                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                                                        }`}
                                                    >
                                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                                            isCurrent ? 'bg-white text-itc-800' : isFull ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                                        }`}>
                                                            {isFull ? <Icons.Check className="w-3 h-3 text-white" /> : idx + 1}
                                                        </span>
                                                        <span className="truncate max-w-[120px]">{sec.group.split('&')[0].trim()}</span>
                                                        <span className="text-[10px] opacity-75 font-normal">({answeredInSec}/{sec.questions.length})</span>
                                                    </button>
                                                );
                                            })}

                                            {/* Final Step Button */}
                                            <button
                                                type="button"
                                                onClick={() => setWizardStep(classQuestionsConfig.sections.length)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                    wizardStep === classQuestionsConfig.sections.length
                                                        ? 'bg-itc-800 text-white shadow-xs'
                                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                                                }`}
                                            >
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                                    wizardStep === classQuestionsConfig.sections.length ? 'bg-white text-itc-800' : 'bg-slate-200 text-slate-700'
                                                }`}>
                                                    <Icons.FileText className="w-3 h-3" />
                                                </span>
                                                <span>Góp ý & Nộp</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Step Body */}
                                    {wizardStep < classQuestionsConfig.sections.length ? (
                                        (() => {
                                            const section = classQuestionsConfig.sections[wizardStep];
                                            const isFacilitySec = wizardStep === 2 || section.group.toLowerCase().includes('cơ sở vật chất') || section.group.toLowerCase().includes('thiết bị');

                                            return (
                                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200/90 overflow-hidden">
                                                    {/* Group Header */}
                                                    <div className="bg-gradient-to-r from-slate-50 to-slate-100/60 p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="w-8 h-8 rounded-xl bg-itc-800 text-white text-sm font-black flex items-center justify-center shrink-0 shadow-2xs">
                                                                {wizardStep + 1}
                                                            </span>
                                                            <div>
                                                                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                                                                    {section.group}
                                                                </h3>
                                                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                                                    Bước {wizardStep + 1} / {classQuestionsConfig.sections.length + 1} • Gồm {section.questions.length} câu hỏi
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                                                            {section.questions.filter(q => answers[q.id] !== undefined).length}/{section.questions.length} câu
                                                        </span>
                                                    </div>

                                                    {/* Questions in group */}
                                                    <div className="divide-y divide-slate-100">
                                                        {section.questions.map((q) => {
                                                            const currentVal = answers[q.id];
                                                            const isTargetActive = (activeQuestionId === q.id) || (!activeQuestionId && currentVal === undefined && section.questions.find(sq => answers[sq.id] === undefined)?.id === q.id);

                                                            return (
                                                                <div 
                                                                    key={q.id} 
                                                                    id={`q_item_${q.id}`}
                                                                    onClick={() => setActiveQuestionId(q.id)}
                                                                    className={`p-4 sm:p-5 transition cursor-pointer rounded-2xl ${
                                                                        isTargetActive 
                                                                            ? 'bg-blue-50/50 ring-2 ring-itc-500/40 shadow-xs' 
                                                                            : 'hover:bg-slate-50/50'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-start justify-between gap-2 mb-3">
                                                                        <div className="flex items-start gap-2">
                                                                            <span className="font-black text-itc-800 text-xs sm:text-sm mt-0.5">{q.id}.</span>
                                                                            <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                                                                                {q.text}
                                                                            </p>
                                                                        </div>
                                                                        {isTargetActive && (
                                                                            <span className="text-[10px] font-bold text-itc-800 bg-itc-100 border border-itc-200 px-2 py-0.5 rounded-md shrink-0">
                                                                                Phím 1-5
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Likert Scale (1 to 5) */}
                                                                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pl-4 sm:pl-6">
                                                                        {[1, 2, 3, 4, 5].map((star) => {
                                                                            const isSelected = currentVal === star;

                                                                            return (
                                                                                <button
                                                                                    key={star}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setAnswers(prev => ({ ...prev, [q.id]: star }));
                                                                                        const curIdx = section.questions.findIndex(sq => sq.id === q.id);
                                                                                        if (curIdx < section.questions.length - 1) {
                                                                                            setActiveQuestionId(section.questions[curIdx + 1].id);
                                                                                        }
                                                                                    }}
                                                                                    className={`flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-xl border text-center transition-all ${
                                                                                        isSelected
                                                                                            ? 'bg-itc-800 text-white border-itc-800 shadow-sm scale-102 font-black'
                                                                                            : 'bg-white hover:bg-slate-100/80 text-slate-700 border-slate-200/90 font-medium'
                                                                                    }`}
                                                                                >
                                                                                    <span className="text-xs sm:text-sm font-bold flex items-center gap-1">
                                                                                        {star} <Icons.Star className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300 fill-amber-300' : 'text-amber-500 fill-amber-500'}`} />
                                                                                    </span>
                                                                                    <span className="text-[9px] sm:text-[10px] line-clamp-1 mt-0.5 opacity-90 hidden sm:block">
                                                                                        {LIKERT_LABELS[star]}
                                                                                    </span>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Asset Tagging (Nhập số máy/vị trí hỏng) */}
                                                    {isFacilitySec && (
                                                        <div className="p-4 bg-amber-50/70 border-t border-amber-200 space-y-1.5">
                                                            <label className="block text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                                                <Icons.Wrench className="w-3.5 h-3.5 text-amber-700" />
                                                                Vị trí / Số máy gặp sự cố (nếu có để Kỹ thuật viên ITC đến kiểm tra):
                                                            </label>
                                                            <input 
                                                                type="text"
                                                                value={assetLocation}
                                                                onChange={(e) => setAssetLocation(e.target.value)}
                                                                placeholder="Ví dụ: Máy 08 phòng Lab 5 chuột chập chờn, Điều hòa 2 phả hơi nóng..."
                                                                className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Wizard Step Navigation Footer */}
                                                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                                                        <button
                                                            type="button"
                                                            disabled={wizardStep === 0}
                                                            onClick={() => { setWizardStep(prev => Math.max(0, prev - 1)); window.scrollTo({ top: 150, behavior: 'smooth' }); }}
                                                            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs text-slate-600 transition"
                                                        >
                                                            ‹ Quay lại nhóm trước
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => { setWizardStep(prev => prev + 1); window.scrollTo({ top: 150, behavior: 'smooth' }); }}
                                                            className="px-5 py-2 rounded-xl bg-itc-800 hover:bg-itc-900 text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5"
                                                        >
                                                            <span>Tiếp theo: {wizardStep + 1 < classQuestionsConfig.sections.length ? `Nhóm ${wizardStep + 2}` : 'Góp ý & Nộp'}</span>
                                                            <Icons.ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        /* FINAL STEP: Ý KIẾN & HOÀN TẤT */
                                        <div className="space-y-4">
                                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/90 p-6 sm:p-7 space-y-4">
                                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                                    <div>
                                                        <h3 className="font-extrabold text-slate-900 text-base">
                                                            Ý KIẾN ĐÓNG GÓP & HOÀN TẤT BÀI ĐÁNH GIÁ
                                                        </h3>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            Bạn đã hoàn thành <b className="text-itc-800">{answeredCount}/{activeQuestions.length}</b> câu hỏi đánh giá.
                                                        </p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                        isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {isCompleted ? 'Đủ điều kiện nộp' : `Thiếu ${activeQuestions.length - answeredCount} câu`}
                                                    </span>
                                                </div>

                                                {/* Asset Location if not filled yet */}
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                                                        <Icons.Wrench className="w-3.5 h-3.5 text-slate-500" />
                                                        Vị trí / Số máy gặp sự cố (Tùy chọn cho Kỹ thuật viên):
                                                    </label>
                                                    <input 
                                                        type="text"
                                                        value={assetLocation}
                                                        onChange={(e) => setAssetLocation(e.target.value)}
                                                        placeholder="Ví dụ: Máy số 08 phòng Lab 5, Điều hòa bên trái..."
                                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-itc-800"
                                                    />
                                                </div>

                                                {/* General Feedback Comment */}
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                                        Ý kiến đóng góp thêm về bài giảng, giảng viên hoặc khóa học:
                                                    </label>
                                                    <textarea 
                                                        rows={4} 
                                                        placeholder="Ví dụ: Thầy dạy rất dễ hiểu và tận tình, bài tập thực hành sát thực tế..."
                                                        className="w-full border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm focus:border-itc-600 focus:ring-2 focus:ring-itc-100 outline-none resize-none bg-slate-50/50 transition text-slate-800"
                                                        value={comment}
                                                        onChange={(e) => setComment(e.target.value)}
                                                    />
                                                </div>

                                                {/* Back button */}
                                                <div className="pt-2 flex justify-start">
                                                    <button
                                                        type="button"
                                                        onClick={() => setWizardStep(classQuestionsConfig.sections.length - 1)}
                                                        className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 font-bold text-xs text-slate-600 transition"
                                                    >
                                                        ‹ Quay lại nhóm câu hỏi
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* CHẾ ĐỘ CUỘN 1 TRANG (TOÀN BỘ CÂU HỎI) */
                                <div className="space-y-6">
                                    {classQuestionsConfig.sections.map((section, sIdx) => {
                                        const isFacilitySec = sIdx === 2 || section.group.toLowerCase().includes('cơ sở vật chất') || section.group.toLowerCase().includes('thiết bị');

                                        return (
                                            <div key={sIdx} className="bg-white rounded-3xl shadow-sm border border-slate-200/90 overflow-hidden">
                                                {/* Group Header */}
                                                <div className="bg-gradient-to-r from-slate-50 to-slate-100/60 p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="w-7 h-7 rounded-xl bg-itc-800 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-2xs">
                                                            {sIdx + 1}
                                                        </span>
                                                        <div>
                                                            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                                                                {section.group}
                                                            </h3>
                                                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                                                Gồm {section.questions.length} câu hỏi
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                                                        {section.questions.filter(q => answers[q.id] !== undefined).length}/{section.questions.length}
                                                    </span>
                                                </div>

                                                {/* Questions in group */}
                                                <div className="divide-y divide-slate-100">
                                                    {section.questions.map((q) => {
                                                        const currentVal = answers[q.id];

                                                        return (
                                                            <div 
                                                                key={q.id} 
                                                                id={`q_item_${q.id}`}
                                                                onClick={() => setActiveQuestionId(q.id)}
                                                                className={`p-4 sm:p-5 transition cursor-pointer rounded-2xl ${
                                                                    activeQuestionId === q.id ? 'bg-blue-50/50 ring-2 ring-itc-500/40 shadow-xs' : 'hover:bg-slate-50/50'
                                                                }`}
                                                            >
                                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                                    <div className="flex items-start gap-2">
                                                                        <span className="font-black text-itc-800 text-xs sm:text-sm mt-0.5">{q.id}.</span>
                                                                        <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                                                                            {q.text}
                                                                        </p>
                                                                    </div>
                                                                    {activeQuestionId === q.id && (
                                                                        <span className="text-[10px] font-bold text-itc-800 bg-itc-100 border border-itc-200 px-2 py-0.5 rounded-md shrink-0">
                                                                            Phím 1-5
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Likert Scale (1 to 5) */}
                                                                <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pl-4 sm:pl-6">
                                                                    {[1, 2, 3, 4, 5].map((star) => {
                                                                        const isSelected = currentVal === star;

                                                                        return (
                                                                            <button
                                                                                key={star}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setAnswers(prev => ({ ...prev, [q.id]: star }));
                                                                                    const curIdx = activeQuestions.findIndex(aq => aq.id === q.id);
                                                                                    if (curIdx < activeQuestions.length - 1) {
                                                                                        setActiveQuestionId(activeQuestions[curIdx + 1].id);
                                                                                    }
                                                                                }}
                                                                                className={`flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-xl border text-center transition-all ${
                                                                                    isSelected
                                                                                        ? 'bg-itc-800 text-white border-itc-800 shadow-sm scale-102 font-black'
                                                                                        : 'bg-white hover:bg-slate-100/80 text-slate-700 border-slate-200/90 font-medium'
                                                                                }`}
                                                                            >
                                                                                <span className="text-xs sm:text-sm font-bold flex items-center gap-1">
                                                                                    {star} <Icons.Star className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300 fill-amber-300' : 'text-amber-500 fill-amber-500'}`} />
                                                                                </span>
                                                                                <span className="text-[9px] sm:text-[10px] line-clamp-1 mt-0.5 opacity-90 hidden sm:block">
                                                                                    {LIKERT_LABELS[star]}
                                                                                </span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Asset Tagging */}
                                                {isFacilitySec && (
                                                    <div className="p-4 bg-amber-50/70 border-t border-amber-200 space-y-1.5">
                                                        <label className="block text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                                            <Icons.Wrench className="w-3.5 h-3.5 text-amber-700" />
                                                            Vị trí / Số máy gặp sự cố (nếu có để Kỹ thuật viên ITC đến kiểm tra):
                                                        </label>
                                                        <input 
                                                            type="text"
                                                            value={assetLocation}
                                                            onChange={(e) => setAssetLocation(e.target.value)}
                                                            placeholder="Ví dụ: Máy 08 phòng Lab 5 chuột chập chờn, Điều hòa 2 phả hơi nóng..."
                                                            className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Section: Ý KIẾN ĐÓNG GÓP THÊM */}
                                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/90 p-6 sm:p-7">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                                                Ý KIẾN ĐÓNG GÓP & PHẢN HỒI THÊM (KHÔNG BẮT BUỘC)
                                            </h3>
                                            <span className="text-[11px] text-slate-400">Tùy chọn</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                                            Nếu có ý kiến về cơ sở vật chất, bài giảng hoặc thái độ giảng viên, bạn vui lòng viết chi tiết tại đây để trung tâm kịp thời xử lý:
                                        </p>
                                        <textarea 
                                            rows={4} 
                                            placeholder="Ví dụ: Giảng viên dạy rất tận tâm, phòng máy cần kiểm tra lại bàn phím..."
                                            className="w-full border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm focus:border-itc-600 focus:ring-2 focus:ring-itc-100 outline-none resize-none bg-slate-50/50 transition text-slate-800"
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>

                {/* Sticky Bottom Submit Bar */}
                {!isClosed && activeQuestions.length > 0 && (
                    <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 px-4 z-30 shadow-lg">
                        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs text-slate-500">Tiến độ:</p>
                                <p className="text-xs sm:text-sm font-black text-slate-800">
                                    <span className={isCompleted ? 'text-emerald-600' : 'text-amber-600'}>
                                        {answeredCount}/{activeQuestions.length}
                                    </span> câu hỏi
                                </p>
                            </div>

                            {(() => {
                                const isWaitingAuth = authMode === 'IDENTIFIED' && !verifiedStudent;
                                const isAlreadySubmitted = authMode === 'IDENTIFIED' && verifiedStudent?.hasSubmitted;
                                const canSubmit = isCompleted && !submitting && !isAlreadySubmitted && !isWaitingAuth;

                                return (
                                    <button 
                                        onClick={handleSubmit}
                                        disabled={!canSubmit}
                                        className={`px-6 sm:px-10 py-3.5 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 ${
                                            canSubmit
                                                ? 'bg-itc-800 hover:bg-itc-900 text-white hover:shadow-lg cursor-pointer'
                                                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                        }`}
                                    >
                                        {submitting ? (
                                            <>
                                                <Icons.Loader className="w-4 h-4 animate-spin" />
                                                <span>Đang gửi đánh giá...</span>
                                            </>
                                        ) : isAlreadySubmitted ? (
                                            <>
                                                <Icons.CheckCircle className="w-4 h-4 text-emerald-600" />
                                                <span>BẠN ĐÃ NỘP ĐÁNH GIÁ TRƯỚC ĐÓ RỒI</span>
                                            </>
                                        ) : isWaitingAuth ? (
                                            <>
                                                <Icons.User className="w-4 h-4 text-amber-500" />
                                                <span>VUI LÒNG XÁC THỰC MSSV TRƯỚC KHI NỘP</span>
                                            </>
                                        ) : (
                                            <>
                                                <Icons.FileText className="w-4 h-4" />
                                                <span>
                                                    {isCompleted 
                                                        ? `NỘP BÀI KHẢO SÁT (${activeQuestions.length} CÂU)` 
                                                        : `Vui lòng làm đủ ${activeQuestions.length} câu (${activeQuestions.length - answeredCount} câu còn lại)`}
                                                </span>
                                            </>
                                        )}
                                    </button>
                                );
                            })()}
                        </div>
                    </footer>
                )}
            </div>
        );
    }

    // Default view: Prompt to use student schedule
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center shadow-xs space-y-4">
                <div className="w-16 h-16 bg-itc-50 text-itc-800 rounded-2xl flex items-center justify-center mx-auto">
                    <Icons.BookOpen className="w-8 h-8 text-itc-800" />
                </div>
                <h2 className="text-lg font-black text-slate-900">Khảo sát theo Thời khóa biểu</h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                    Mỗi học viên có thời khóa biểu và các lớp cần đánh giá riêng trong tài khoản. Vui lòng bấm vào nút <b>"Làm khảo sát ngay"</b> tại môn học tương ứng trên thời khóa biểu của bạn để vào làm bài.
                </p>
                <div className="pt-2">
                    <Link 
                        href="/"
                        className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 bg-itc-800 hover:bg-itc-900 text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                        <Icons.ArrowLeft className="w-4 h-4" /> Quay về Thời khóa biểu sinh viên
                    </Link>
                </div>
            </div>
        </div>
    );
}


export default function SurveyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <Icons.Loader className="w-8 h-8 animate-spin text-itc-800 mb-2" />
                <p className="text-xs font-bold text-slate-500">Đang khởi tạo cổng khảo sát...</p>
            </div>
        }>
            <SurveyContent />
        </Suspense>
    );
}
