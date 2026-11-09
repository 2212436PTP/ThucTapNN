import { OFFICIAL_SURVEY_SECTIONS, ALL_QUESTIONS, QuestionItem } from './surveyQuestions';
import { supabase } from './supabaseClient';

export interface CustomQuestion {
    id: number;
    text: string;
    group: string;
    authorRole?: 'ADMIN' | 'TEACHER';
    createdAt?: string;
}

export interface ClassMeta {
    academicYear: string;
    teacherIds: string[];
    surveyConfig: {
        mode: 'DEFAULT_30' | 'CUSTOM';
        selectedQuestionIds: number[];
        customQuestions: CustomQuestion[];
    };
}

const STORAGE_KEY_CLASS_META = 'itc_class_meta_map';
const STORAGE_KEY_CUSTOM_QUESTIONS = 'itc_custom_questions_bank';

// Đồng bộ toàn bộ dữ liệu cấu hình & danh sách lớp từ Supabase Cloud về máy khách
export async function syncFromCloudToLocal() {
    if (typeof window === 'undefined') return;
    try {
        const { data: configs } = await supabase.from('reviews').select('*').like('id', 'cfg_%');
        if (!configs || configs.length === 0) return;

        configs.forEach((cfg: any) => {
            const ratings = cfg.ratings || {};
            if (ratings._type === 'GLOBAL_CLASS_META' && ratings.metaMap) {
                localStorage.setItem(STORAGE_KEY_CLASS_META, JSON.stringify(ratings.metaMap));
            }
            if (ratings._type === 'GLOBAL_QUESTION_BANK' && ratings.customBank) {
                localStorage.setItem(STORAGE_KEY_CUSTOM_QUESTIONS, JSON.stringify(ratings.customBank));
            }
            if (ratings._type === 'CLASS_ROSTER' && ratings.roster && cfg.class_id) {
                localStorage.setItem(`itc_class_students_${cfg.class_id}`, JSON.stringify(ratings.roster));
            }
        });
        window.dispatchEvent(new Event('class_meta_updated'));
        window.dispatchEvent(new Event('class_students_updated'));
    } catch (e) {
        console.error('Lỗi đồng bộ dữ liệu từ Cloud:', e);
    }
}

// Helper to get raw meta map
function getMetaMap(): Record<string, ClassMeta> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(STORAGE_KEY_CLASS_META);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveMetaMap(map: Record<string, ClassMeta>) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY_CLASS_META, JSON.stringify(map));
        // Trigger event so other tabs or views update immediately
        window.dispatchEvent(new Event('class_meta_updated'));

        // Cloud sync to Supabase
        const targetClassId = Object.keys(map)[0];
        if (targetClassId) {
            supabase.from('reviews').upsert({
                id: 'cfg_global_class_meta',
                class_id: targetClassId,
                status: 'RESOLVED',
                ratings: { _type: 'GLOBAL_CLASS_META', metaMap: map }
            }).then();
        }
    } catch (e) {
        console.error('Failed to save class meta:', e);
    }
}

// Get Question Bank (Official 30 + any newly created questions)
export function getQuestionBank(): { official: typeof OFFICIAL_SURVEY_SECTIONS; custom: CustomQuestion[] } {
    let custom: CustomQuestion[] = [];
    if (typeof window !== 'undefined') {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_QUESTIONS);
            if (raw) custom = JSON.parse(raw);
        } catch {
            custom = [];
        }
    }
    return {
        official: OFFICIAL_SURVEY_SECTIONS,
        custom
    };
}

// Add a new question to the bank
export function addQuestionToBank(text: string, group: string, authorRole: 'ADMIN' | 'TEACHER' = 'ADMIN'): CustomQuestion {
    const { custom } = getQuestionBank();
    const newId = 1000 + Date.now() % 100000;
    const newQ: CustomQuestion = {
        id: newId,
        text: text.trim(),
        group: group || 'VI. CÂU HỎI BỔ SUNG',
        authorRole,
        createdAt: new Date().toISOString()
    };
    const updated = [...custom, newQ];
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_CUSTOM_QUESTIONS, JSON.stringify(updated));
        window.dispatchEvent(new Event('question_bank_updated'));

        // Cloud sync
        supabase.from('classes').select('id').limit(1).then(({ data }) => {
            const firstClassId = data?.[0]?.id;
            if (firstClassId) {
                supabase.from('reviews').upsert({
                    id: 'cfg_global_question_bank',
                    class_id: firstClassId,
                    status: 'RESOLVED',
                    ratings: { _type: 'GLOBAL_QUESTION_BANK', customBank: updated }
                }).then();
            }
        });
    }
    return newQ;
}

// Add multiple new questions to the bank in bulk
export function addQuestionsToBank(questions: Array<{ text: string; group?: string }>, authorRole: 'ADMIN' | 'TEACHER' = 'ADMIN'): CustomQuestion[] {
    const { custom } = getQuestionBank();
    const now = Date.now();
    const created: CustomQuestion[] = [];
    questions.forEach((q, idx) => {
        created.push({
            id: 2000 + ((now + idx * 7) % 500000),
            text: q.text.trim(),
            group: q.group?.trim() || 'VI. CÂU HỎI BỔ SUNG (THEO LỚP)',
            authorRole,
            createdAt: new Date().toISOString()
        });
    });
    const updated = [...custom, ...created];
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_CUSTOM_QUESTIONS, JSON.stringify(updated));
        window.dispatchEvent(new Event('question_bank_updated'));

        supabase.from('classes').select('id').limit(1).then(({ data }) => {
            const firstClassId = data?.[0]?.id;
            if (firstClassId) {
                supabase.from('reviews').upsert({
                    id: 'cfg_global_question_bank',
                    class_id: firstClassId,
                    status: 'RESOLVED',
                    ratings: { _type: 'GLOBAL_QUESTION_BANK', customBank: updated }
                }).then();
            }
        });
    }
    return created;
}

// Delete a question from the bank
export function deleteQuestionFromBank(id: number) {
    const { custom } = getQuestionBank();
    const updated = custom.filter(q => q.id !== id);
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_CUSTOM_QUESTIONS, JSON.stringify(updated));
        window.dispatchEvent(new Event('question_bank_updated'));

        // Cloud sync
        supabase.from('classes').select('id').limit(1).then(({ data }) => {
            const firstClassId = data?.[0]?.id;
            if (firstClassId) {
                supabase.from('reviews').upsert({
                    id: 'cfg_global_question_bank',
                    class_id: firstClassId,
                    status: 'RESOLVED',
                    ratings: { _type: 'GLOBAL_QUESTION_BANK', customBank: updated }
                }).then();
            }
        });
    }
}

// Update a question in the bank
export function updateQuestionInBank(id: number, newText: string) {
    const { custom } = getQuestionBank();
    const updated = custom.map(q => q.id === id ? { ...q, text: newText } : q);
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_CUSTOM_QUESTIONS, JSON.stringify(updated));
        window.dispatchEvent(new Event('question_bank_updated'));

        // Cloud sync
        supabase.from('classes').select('id').limit(1).then(({ data }) => {
            const firstClassId = data?.[0]?.id;
            if (firstClassId) {
                supabase.from('reviews').upsert({
                    id: 'cfg_global_question_bank',
                    class_id: firstClassId,
                    status: 'RESOLVED',
                    ratings: { _type: 'GLOBAL_QUESTION_BANK', customBank: updated }
                }).then();
            }
        });
    }
}

// Get or initialize Class Meta
export function getClassMeta(classId: string, fallbackTeacherId: string = '', classCode: string = ''): ClassMeta {
    const map = getMetaMap();
    if (map[classId]) {
        return map[classId];
    }

    // Default metadata
    let defaultYear = '2026';
    if (classCode) {
        const match = classCode.match(/(\d{4})/);
        if (match) defaultYear = match[1];
    }

    const defaultMeta: ClassMeta = {
        academicYear: defaultYear,
        teacherIds: fallbackTeacherId ? [fallbackTeacherId] : [],
        surveyConfig: {
            mode: 'DEFAULT_30',
            selectedQuestionIds: ALL_QUESTIONS.map(q => q.id),
            customQuestions: []
        }
    };

    return defaultMeta;
}

// Save Class Meta
export function saveClassMeta(classId: string, meta: Partial<ClassMeta>, fallbackTeacherId: string = '', classCode: string = '') {
    const map = getMetaMap();
    const current = getClassMeta(classId, fallbackTeacherId, classCode);
    const updated: ClassMeta = {
        ...current,
        ...meta,
        surveyConfig: {
            ...current.surveyConfig,
            ...(meta.surveyConfig || {})
        }
    };
    map[classId] = updated;
    saveMetaMap(map);
    return updated;
}

// Resolve the actual list of questions to be displayed in a class survey
export function resolveClassQuestions(classMeta: ClassMeta): {
    sections: Array<{ group: string; questions: Array<{ id: number; text: string }> }>;
    totalQuestions: number;
} {
    const { surveyConfig } = classMeta;

    // Mode 1: Full 30 questions
    if (surveyConfig.mode === 'DEFAULT_30') {
        return {
            sections: OFFICIAL_SURVEY_SECTIONS.map(s => ({
                group: s.group,
                questions: s.questions.map(q => ({ id: q.id, text: q.text }))
            })),
            totalQuestions: 30
        };
    }

    // Mode 2: Custom selection from bank + class-specific custom questions
    const selectedIds = new Set(surveyConfig.selectedQuestionIds || []);
    const { custom: bankCustom } = getQuestionBank();
    const allCustomMap = new Map<number, CustomQuestion>();

    bankCustom.forEach(q => allCustomMap.set(q.id, q));
    (surveyConfig.customQuestions || []).forEach(q => allCustomMap.set(q.id, q));

    const sections: Array<{ group: string; questions: Array<{ id: number; text: string }> }> = [];

    // Filter questions from the 5 official sections
    OFFICIAL_SURVEY_SECTIONS.forEach(s => {
        const matchingQuestions = s.questions.filter(q => selectedIds.has(q.id));
        if (matchingQuestions.length > 0) {
            sections.push({
                group: s.group,
                questions: matchingQuestions.map(q => ({ id: q.id, text: q.text }))
            });
        }
    });

    // Add selected custom questions from bank or class
    const customInSurvey: Array<{ id: number; text: string }> = [];
    allCustomMap.forEach(q => {
        if (selectedIds.has(q.id)) {
            customInSurvey.push({ id: q.id, text: q.text });
        }
    });

    if (customInSurvey.length > 0) {
        sections.push({
            group: 'VI. CÂU HỎI KHẢO SÁT BỔ SUNG (THEO LỚP)',
            questions: customInSurvey
        });
    }

    const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);

    // Fallback if none selected
    if (totalQuestions === 0) {
        return {
            sections: OFFICIAL_SURVEY_SECTIONS.map(s => ({
                group: s.group,
                questions: s.questions.map(q => ({ id: q.id, text: q.text }))
            })),
            totalQuestions: 30
        };
    }

    return {
        sections,
        totalQuestions
    };
}

export interface ClassStudentItem {
    id: string;
    code: string;
    name: string;
    email?: string;
    hasSubmitted: boolean;
    submittedAt?: string;
    score?: number;
}

export const DEFAULT_REAL_STUDENTS = [
    { code: '2110452', name: 'Nguyễn Hoàng Minh Châu', email: '2110452@sinhvien.dlu.edu.vn' },
    { code: '2110389', name: 'Trần Quốc Khánh', email: '2110389@sinhvien.dlu.edu.vn' },
    { code: '2210115', name: 'Lê Phương Uyên', email: '2210115@sinhvien.dlu.edu.vn' },
    { code: '2110502', name: 'Phạm Đức Huy', email: '2110502@sinhvien.dlu.edu.vn' },
    { code: '2210874', name: 'Đặng Quỳnh Như', email: '2210874@sinhvien.dlu.edu.vn' },
    { code: '2110291', name: 'Hoàng Gia Bảo', email: '2110291@sinhvien.dlu.edu.vn' },
    { code: '2210633', name: 'Vũ Nhật Nam', email: '2210633@sinhvien.dlu.edu.vn' },
    { code: '2110147', name: 'Huỳnh Anh Tuấn', email: '2110147@sinhvien.dlu.edu.vn' },
    { code: '2210419', name: 'Bùi Mai Phương', email: '2210419@sinhvien.dlu.edu.vn' },
    { code: '2110780', name: 'Đỗ Tiến Dũng', email: '2110780@sinhvien.dlu.edu.vn' },
    { code: '2210355', name: 'Ngô Cẩm Tiên', email: '2210355@sinhvien.dlu.edu.vn' },
    { code: '2110628', name: 'Dương Thế Kiệt', email: '2110628@sinhvien.dlu.edu.vn' },
    { code: '2210741', name: 'Lý Thanh Trúc', email: '2210741@sinhvien.dlu.edu.vn' },
    { code: '2110892', name: 'Mai Văn Phúc', email: '2110892@sinhvien.dlu.edu.vn' },
    { code: '2210204', name: 'Hồ Thùy Linh', email: '2210204@sinhvien.dlu.edu.vn' },
    { code: '2110567', name: 'Võ Trường Giang', email: '2110567@sinhvien.dlu.edu.vn' },
    { code: '2210819', name: 'Lương Thục Đoan', email: '2210819@sinhvien.dlu.edu.vn' },
    { code: '2110342', name: 'Trương Công Thành', email: '2110342@sinhvien.dlu.edu.vn' },
    { code: '2210963', name: 'Phan Diệu My', email: '2210963@sinhvien.dlu.edu.vn' },
    { code: '2110715', name: 'Đinh Hữu Nghĩa', email: '2110715@sinhvien.dlu.edu.vn' },
    { code: '2210156', name: 'Nguyễn Ngọc Băng Tâm', email: '2210156@sinhvien.dlu.edu.vn' },
    { code: '2110823', name: 'Chu Tuấn Hưng', email: '2110823@sinhvien.dlu.edu.vn' },
    { code: '2210498', name: 'Lâm Mỹ Huyền', email: '2210498@sinhvien.dlu.edu.vn' },
    { code: '2110671', name: 'Quách Đại Dương', email: '2110671@sinhvien.dlu.edu.vn' },
    { code: '2210324', name: 'Tạ Hồng Nhung', email: '2210324@sinhvien.dlu.edu.vn' },
    { code: '2110940', name: 'Khổng Minh Trí', email: '2110940@sinhvien.dlu.edu.vn' },
    { code: '2210678', name: 'Đoàn Ngọc Lan', email: '2210678@sinhvien.dlu.edu.vn' },
    { code: '2110255', name: 'Lưu Đình Sang', email: '2110255@sinhvien.dlu.edu.vn' },
    { code: '2210512', name: 'Nghiêm Tuyết Băng', email: '2210512@sinhvien.dlu.edu.vn' },
    { code: '2110486', name: 'Tô Kiến Quốc', email: '2110486@sinhvien.dlu.edu.vn' },
    { code: '2210433', name: 'Trịnh Bảo Ngọc', email: '2210433@sinhvien.dlu.edu.vn' },
    { code: '2110198', name: 'Phan Văn Hùng', email: '2110198@sinhvien.dlu.edu.vn' },
    { code: '2310122', name: 'Lê Thị Kim Ngân', email: '2310122@sinhvien.dlu.edu.vn' },
    { code: '2210577', name: 'Trần Đăng Khoa', email: '2210577@sinhvien.dlu.edu.vn' },
    { code: '2110845', name: 'Nguyễn Thùy Trang', email: '2110845@sinhvien.dlu.edu.vn' },
    { code: '2310341', name: 'Võ Hoàng Khang', email: '2310341@sinhvien.dlu.edu.vn' },
    { code: '2210289', name: 'Mai Phương Thảo', email: '2210289@sinhvien.dlu.edu.vn' },
    { code: '2110612', name: 'Đào Minh Quân', email: '2110612@sinhvien.dlu.edu.vn' },
    { code: '2310487', name: 'Huỳnh Ngọc Trâm', email: '2310487@sinhvien.dlu.edu.vn' },
    { code: '2210756', name: 'Phạm Quang Khải', email: '2210756@sinhvien.dlu.edu.vn' },
    { code: '2110923', name: 'Dương Diễm Hương', email: '2110923@sinhvien.dlu.edu.vn' },
    { code: '2310219', name: 'Bùi Hữu Phước', email: '2310219@sinhvien.dlu.edu.vn' },
    { code: '2210890', name: 'Hà Mỹ Duyên', email: '2210890@sinhvien.dlu.edu.vn' },
    { code: '2110377', name: 'Vũ Thành Đạt', email: '2110377@sinhvien.dlu.edu.vn' },
    { code: '2310563', name: 'Chung Gia Hân', email: '2310563@sinhvien.dlu.edu.vn' },
    { code: '2210642', name: 'Lâm Trọng Tấn', email: '2210642@sinhvien.dlu.edu.vn' },
    { code: '2110499', name: 'Triệu Yến Nhi', email: '2110499@sinhvien.dlu.edu.vn' },
    { code: '2310705', name: 'Quách Gia Huy', email: '2310705@sinhvien.dlu.edu.vn' },
    { code: '2210188', name: 'Vương Diệu Linh', email: '2210188@sinhvien.dlu.edu.vn' },
    { code: '2110734', name: 'Cao Tuấn Kiệt', email: '2110734@sinhvien.dlu.edu.vn' }
];

// Lấy danh sách sinh viên của lớp và trạng thái đánh giá
export function getClassStudents(
    classId: string, 
    studentsCount: number = 30, 
    registeredStudents: any[] = [], 
    classReviews: any[] = []
): ClassStudentItem[] {
    const storageKey = `itc_class_students_${classId}`;
    let savedList: ClassStudentItem[] = [];

    if (typeof window !== 'undefined') {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) savedList = JSON.parse(raw);
        } catch {
            savedList = [];
        }
    }

    // Nếu chưa có danh sách lưu hoặc số lượng thay đổi so với sĩ số mới
    const targetCount = Math.min(Math.max(studentsCount, 20), 50); // đảm bảo 20 - 50
    let result: ClassStudentItem[] = [];

    if (savedList.length > 0) {
        result = [...savedList];
    } else {
        // Khởi tạo từ danh sách sinh viên thực tế
        for (let i = 0; i < targetCount; i++) {
            const registered = registeredStudents[i];
            const fallback = DEFAULT_REAL_STUDENTS[i % DEFAULT_REAL_STUDENTS.length];
            const code = registered?.code || fallback.code;
            const name = registered?.name || fallback.name;
            const email = registered?.email || fallback.email;
            const id = registered?.id || `student_${classId}_${code}`;

            result.push({
                id,
                code,
                name,
                email,
                hasSubmitted: false
            });
        }
    }

    // Nếu targetCount lớn hơn độ dài hiện tại, bổ sung thêm
    if (result.length < targetCount) {
        for (let i = result.length; i < targetCount; i++) {
            const registered = registeredStudents[i];
            const fallback = DEFAULT_REAL_STUDENTS[i % DEFAULT_REAL_STUDENTS.length];
            const code = registered?.code || fallback.code;
            const name = registered?.name || fallback.name;
            const email = registered?.email || fallback.email;
            result.push({
                id: registered?.id || `student_${classId}_${code}`,
                code,
                name,
                email,
                hasSubmitted: false
            });
        }
    } else if (result.length > targetCount) {
        result = result.slice(0, targetCount);
    }

    // Đồng bộ trạng thái đánh giá từ bảng reviews của lớp
    // Nếu review có metadata student_code, gán chính xác; nếu không, phân bổ theo số lượng reviews thực tế
    if (classReviews.length > 0) {
        // Sắp xếp reviews theo created_at
        const sortedReviews = [...classReviews].sort((a, b) => 
            new Date(a.createdAt || a.created_at || 0).getTime() - new Date(b.createdAt || b.created_at || 0).getTime()
        );

        // Gán cho các sinh viên tương ứng
        sortedReviews.forEach((rev, idx) => {
            // Tìm theo student_code nếu có
            const studentCode = rev.ratings?.student_code;
            let matchedStudent = studentCode ? result.find(s => s.code === studentCode) : null;
            if (!matchedStudent && idx < result.length) {
                matchedStudent = result[idx];
            }

            if (matchedStudent) {
                matchedStudent.hasSubmitted = true;
                matchedStudent.submittedAt = rev.createdAt || rev.created_at || new Date().toISOString();
                
                // Tính điểm trung bình của review
                const vals = Object.entries(rev.ratings || {})
                    .filter(([k]) => !k.startsWith('group_') && k !== 'student_code' && k !== 'student_name')
                    .map(([, v]) => typeof v === 'number' ? v : parseFloat(v as string))
                    .filter(v => !isNaN(v) && v > 0);
                if (vals.length > 0) {
                    matchedStudent.score = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
                } else {
                    matchedStudent.score = 5.0;
                }
            }
        });
    }

    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem(storageKey, JSON.stringify(result));
        } catch {}
    }

    return result;
}

// Lưu danh sách sinh viên của lớp
export function saveClassStudents(classId: string, students: ClassStudentItem[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(`itc_class_students_${classId}`, JSON.stringify(students));
        window.dispatchEvent(new Event('class_students_updated'));

        // Cloud sync danh sách lớp lên Supabase
        supabase.from('reviews').upsert({
            id: `cfg_roster_${classId}`,
            class_id: classId,
            status: 'RESOLVED',
            ratings: { _type: 'CLASS_ROSTER', roster: students }
        }).then();
    } catch (e) {
        console.error('Lỗi lưu danh sách sinh viên lớp:', e);
    }
}

// Ghi nhận sinh viên hoàn thành bài khảo sát
export function recordStudentSurveySubmission(
    classId: string, 
    studentCode: string, 
    score: number = 5.0, 
    submittedAt?: string
) {
    if (typeof window === 'undefined') return;
    const storageKey = `itc_class_students_${classId}`;
    try {
        const raw = localStorage.getItem(storageKey);
        let list: ClassStudentItem[] = raw ? JSON.parse(raw) : [];
        const student = list.find(s => s.code === studentCode);
        const time = submittedAt || new Date().toISOString();

        if (student) {
            student.hasSubmitted = true;
            student.submittedAt = time;
            student.score = score;
        } else {
            list.push({
                id: `student_${Date.now()}`,
                code: studentCode,
                name: `Học viên ${studentCode}`,
                hasSubmitted: true,
                submittedAt: time,
                score
            });
        }
        localStorage.setItem(storageKey, JSON.stringify(list));
        window.dispatchEvent(new Event('class_students_updated'));
    } catch (e) {
        console.error('Lỗi cập nhật trạng thái khảo sát sinh viên:', e);
    }
}
