/**
 * Module phân loại nhận xét và phản hồi của sinh viên tự động
 * Phân chia thành 3 nhóm nghiệp vụ:
 * 1. Phương pháp giảng dạy (TEACHING_METHOD)
 * 2. Thái độ & Tác phong (TEACHER_ATTITUDE)
 * 3. Cơ sở vật chất & Phòng máy (FACILITIES)
 */

export type FeedbackCategory = 'TEACHING_METHOD' | 'TEACHER_ATTITUDE' | 'FACILITIES';

export interface ClassificationResult {
    category: FeedbackCategory;
    label: string;
    description: string;
    badgeClass: string;
}

export const FEEDBACK_CATEGORIES: Record<FeedbackCategory, { label: string; description: string; badgeClass: string }> = {
    TEACHING_METHOD: {
        label: 'Phương pháp giảng dạy',
        description: 'Tốc độ giảng, bài tập thực hành, phương pháp truyền đạt kiến thức',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200'
    },
    TEACHER_ATTITUDE: {
        label: 'Thái độ & Tác phong',
        description: 'Độ nhiệt tình, tính đúng giờ, sự thân thiện và giải đáp học viên',
        badgeClass: 'bg-purple-50 text-purple-800 border-purple-200'
    },
    FACILITIES: {
        label: 'Cơ sở vật chất & Lab',
        description: 'Máy tính, chuột, bàn phím, điều hòa, mạng Wi-Fi và máy chiếu',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200'
    }
};

const FACILITIES_KEYWORDS = [
    'máy', 'lab', 'chuột', 'phím', 'bàn phím', 'màn hình', 'mạng', 'wifi', 'wi-fi', 
    'internet', 'điều hòa', 'máy lạnh', 'nóng', 'lạnh', 'máy chiếu', 'phòng', 'loa', 
    'micro', 'mic', 'quạt', 'hỏng', 'liệt', 'chập chờn', 'đứng hình', 'lag', 'chậm chạp',
    'tai nghe', 'ổ cắm', 'điện', 'nguồn', 'máy in', 'cơ sở vật chất', 'phòng học', 'lab 5', 'lab 1'
];

const ATTITUDE_KEYWORDS = [
    'thái độ', 'nhiệt tình', 'tác phong', 'đúng giờ', 'vui vẻ', 'thân thiện', 'tận tâm', 
    'kiên nhẫn', 'giải đáp', 'hỗ trợ', 'gắt gỏng', 'khó tính', 'đi muộn', 'nghiêm khắc', 
    'quan tâm', 'chu đáo', 'tôn trọng', 'lắng nghe', 'sẵn lòng', 'tận tụy'
];

const TEACHING_KEYWORDS = [
    'dạy', 'giảng', 'phương pháp', 'bài tập', 'thực hành', 'lý thuyết', 'dễ hiểu', 
    'khó hiểu', 'nhanh', 'chậm', 'slide', 'giáo trình', 'kiến thức', 'ví dụ', 
    'nội dung', 'truyền đạt', 'dễ tiếp thu', 'mơ hồ', 'bài giảng', 'học phần', 'tài liệu'
];

export function classifyFeedback(comment: string, criteriaId?: string): ClassificationResult {
    if (!comment || typeof comment !== 'string') {
        return {
            category: 'TEACHING_METHOD',
            ...FEEDBACK_CATEGORIES.TEACHING_METHOD
        };
    }

    const lower = comment.toLowerCase();

    // Tính điểm khớp từ khóa (Keyword matching weight)
    let facilityScore = 0;
    let attitudeScore = 0;
    let teachingScore = 0;

    FACILITIES_KEYWORDS.forEach(kw => {
        if (lower.includes(kw)) facilityScore += 1;
    });

    ATTITUDE_KEYWORDS.forEach(kw => {
        if (lower.includes(kw)) attitudeScore += 1;
    });

    TEACHING_KEYWORDS.forEach(kw => {
        if (lower.includes(kw)) teachingScore += 1;
    });

    // Ưu tiên cao nhất cho từ khóa cơ sở vật chất nếu có máy tính/phòng
    if (facilityScore > 0 && facilityScore >= attitudeScore && facilityScore >= teachingScore) {
        return { category: 'FACILITIES', ...FEEDBACK_CATEGORIES.FACILITIES };
    }

    if (attitudeScore > 0 && attitudeScore >= teachingScore) {
        return { category: 'TEACHER_ATTITUDE', ...FEEDBACK_CATEGORIES.TEACHER_ATTITUDE };
    }

    if (teachingScore > 0) {
        return { category: 'TEACHING_METHOD', ...FEEDBACK_CATEGORIES.TEACHING_METHOD };
    }

    // Fallback theo criteriaId nếu có
    if (criteriaId) {
        if (criteriaId.includes('fac') || criteriaId.includes('room') || criteriaId.includes('env') || criteriaId.includes('equip')) {
            return { category: 'FACILITIES', ...FEEDBACK_CATEGORIES.FACILITIES };
        }
        if (criteriaId.includes('att') || criteriaId.includes('interact') || criteriaId.includes('support')) {
            return { category: 'TEACHER_ATTITUDE', ...FEEDBACK_CATEGORIES.TEACHER_ATTITUDE };
        }
    }

    return { category: 'TEACHING_METHOD', ...FEEDBACK_CATEGORIES.TEACHING_METHOD };
}

