import { AlertItem, RoomFacilitySummary } from '../types';
import { OFFICIAL_SURVEY_SECTIONS } from './surveyQuestions';

export interface QuestionMeta {
    id: string;
    numId?: number;
    title: string;
    fullQuestion: string;
    category: 'FACILITY' | 'TEACHING' | 'CURRICULUM' | 'SERVICE' | 'GENERAL';
    isMaintenance: boolean;
    equipmentType?: 'PC' | 'WIFI' | 'AC' | 'ROOM' | 'GENERAL';
}

// Built-in metadata dictionary for all 30 survey questions and group keys
export const QUESTIONS_META_MAP: Record<string, QuestionMeta> = {
    // SECTION I: MỤC TIÊU VÀ NỘI DUNG (Q1 - Q6)
    "1": { id: "1", numId: 1, title: "Mục tiêu khóa học rõ ràng", fullQuestion: "Mục tiêu của khóa học được xác định rõ ràng và phù hợp với nhu cầu học tập của sinh viên.", category: 'CURRICULUM', isMaintenance: false },
    "2": { id: "2", numId: 2, title: "Nội dung khóa học phù hợp", fullQuestion: "Nội dung khóa học phù hợp với mục tiêu và kiến thức, kỹ năng cần đạt được sau khi hoàn thành khóa học.", category: 'CURRICULUM', isMaintenance: false },
    "3": { id: "3", numId: 3, title: "Cập nhật công nghệ thực tế", fullQuestion: "Nội dung khóa học được cập nhật, phù hợp với sự phát triển của công nghệ và nhu cầu thực tế.", category: 'CURRICULUM', isMaintenance: false },
    "4": { id: "4", numId: 4, title: "Trình tự nội dung hợp lý", fullQuestion: "Cấu trúc và trình tự các nội dung trong khóa học được sắp xếp hợp lý, logic và dễ theo dõi.", category: 'CURRICULUM', isMaintenance: false },
    "5": { id: "5", numId: 5, title: "Tỷ lệ lý thuyết & thực hành", fullQuestion: "Tỷ lệ giữa lý thuyết và thực hành trong khóa học phù hợp với đặc điểm và mục tiêu đào tạo.", category: 'CURRICULUM', isMaintenance: false },
    "6": { id: "6", numId: 6, title: "Thông tin lịch học & yêu cầu", fullQuestion: "Sinh viên được cung cấp đầy đủ thông tin về nội dung, lịch học, yêu cầu và kết quả cần đạt của khóa học.", category: 'SERVICE', isMaintenance: false },

    // SECTION II: GIẢNG DẠY VÀ ĐÁNH GIÁ (Q7 - Q12)
    "7": { id: "7", numId: 7, title: "Kiến thức chuyên môn giảng viên", fullQuestion: "Giảng viên có kiến thức chuyên môn tốt và nắm vững nội dung của khóa học.", category: 'TEACHING', isMaintenance: false },
    "8": { id: "8", numId: 8, title: "Phương pháp giảng dạy dễ hiểu", fullQuestion: "Giảng viên trình bày nội dung rõ ràng, dễ hiểu và phù hợp với trình độ của sinh viên.", category: 'TEACHING', isMaintenance: false },
    "9": { id: "9", numId: 9, title: "Kết hợp lý thuyết và thực hành", fullQuestion: "Giảng viên kết hợp hiệu quả giữa kiến thức lý thuyết và thực hành trong quá trình giảng dạy.", category: 'TEACHING', isMaintenance: false },
    "10": { id: "10", numId: 10, title: "Tương tác & Thực hành trên lớp", fullQuestion: "Phương pháp giảng dạy tạo điều kiện cho sinh viên chủ động thực hành, trao đổi và giải quyết vấn đề.", category: 'TEACHING', isMaintenance: false },
    "11": { id: "11", numId: 11, title: "Kiểm tra đánh giá công bằng", fullQuestion: "Nội dung và phương pháp kiểm tra, đánh giá phù hợp với nội dung đã được học và mục tiêu của khóa học.", category: 'TEACHING', isMaintenance: false },
    "12": { id: "12", numId: 12, title: "Giải đáp & Hỗ trợ sinh viên", fullQuestion: "Giảng viên phản hồi, giải đáp thắc mắc và hỗ trợ sinh viên kịp thời trong quá trình học tập.", category: 'TEACHING', isMaintenance: false },

    // SECTION III: CƠ SỞ VẬT CHẤT & THIẾT BỊ PHÒNG MÁY (Q13 - Q18) - PRIMARY MAINTENANCE TARGETS
    "13": { id: "13", numId: 13, title: "Phòng học & Phòng thực hành", fullQuestion: "Phòng học và phòng thực hành đáp ứng tốt nhu cầu học tập của sinh viên.", category: 'FACILITY', isMaintenance: true, equipmentType: 'ROOM' },
    "14": { id: "14", numId: 14, title: "Máy tính, thiết bị & phần mềm thực hành", fullQuestion: "Máy tính, thiết bị và phần mềm phục vụ khóa học đáp ứng yêu cầu học tập và thực hành.", category: 'FACILITY', isMaintenance: true, equipmentType: 'PC' },
    "15": { id: "15", numId: 15, title: "Hệ thống Mạng Internet / Wi-Fi", fullQuestion: "Hệ thống mạng Internet/Wi-Fi đáp ứng tốt nhu cầu học tập và thực hành của sinh viên.", category: 'FACILITY', isMaintenance: true, equipmentType: 'WIFI' },
    "16": { id: "16", numId: 16, title: "Giáo trình & Tài liệu học tập", fullQuestion: "Giáo trình, tài liệu học tập và tài liệu tham khảo được cung cấp đầy đủ và phù hợp với nội dung khóa học.", category: 'CURRICULUM', isMaintenance: false },
    "17": { id: "17", numId: 17, title: "Điều hòa, nhiệt độ & Môi trường phòng học", fullQuestion: "Môi trường học tập tại Trung tâm sạch sẽ, an toàn, thuận tiện và tạo điều kiện cho sinh viên học tập.", category: 'FACILITY', isMaintenance: true, equipmentType: 'AC' },
    "18": { id: "18", numId: 18, title: "Bảo trì & Hỗ trợ kỹ thuật thiết bị", fullQuestion: "Các trang thiết bị và cơ sở vật chất phục vụ khóa học được duy trì và hỗ trợ kịp thời khi có vấn đề.", category: 'FACILITY', isMaintenance: true, equipmentType: 'GENERAL' },

    // SECTION IV: CÔNG TÁC QUẢN LÝ VÀ HỖ TRỢ (Q19 - Q24)
    "19": { id: "19", numId: 19, title: "Thông báo lịch học & phòng học", fullQuestion: "Thông tin về lịch học, phòng học và các thay đổi liên quan đến khóa học được thông báo đầy đủ, chính xác và kịp thời.", category: 'SERVICE', isMaintenance: false },
    "20": { id: "20", numId: 20, title: "Quy trình đăng ký & hoàn thành", fullQuestion: "Quy trình đăng ký, tham gia và hoàn thành khóa học được tổ chức rõ ràng, thuận tiện cho sinh viên.", category: 'SERVICE', isMaintenance: false },
    "21": { id: "21", numId: 21, title: "Giải đáp thắc mắc từ Trung tâm", fullQuestion: "Trung tâm hỗ trợ và giải đáp các thắc mắc của sinh viên về khóa học một cách kịp thời.", category: 'SERVICE', isMaintenance: false },
    "22": { id: "22", numId: 22, title: "Thủ tục học phí, điểm, chứng chỉ", fullQuestion: "Các thủ tục liên quan đến học phí, đăng ký, điểm, kết quả học tập và chứng chỉ được thực hiện rõ ràng, thuận tiện.", category: 'SERVICE', isMaintenance: false },
    "23": { id: "23", numId: 23, title: "Kênh liên hệ & Hỗ trợ kỹ thuật", fullQuestion: "Sinh viên dễ dàng tiếp cận các kênh thông tin và liên hệ với Trung tâm khi cần hỗ trợ.", category: 'SERVICE', isMaintenance: false },
    "24": { id: "24", numId: 24, title: "Tiếp nhận ý kiến đóng góp", fullQuestion: "Trung tâm tiếp nhận và phản hồi ý kiến góp ý của sinh viên nhằm cải thiện chất lượng khóa học.", category: 'SERVICE', isMaintenance: false },

    // SECTION V: KẾT QUẢ & ĐỘ HÀI LÒNG (Q25 - Q30)
    "25": { id: "25", numId: 25, title: "Nâng cao kiến thức & kỹ năng", fullQuestion: "Khóa học giúp tôi nâng cao kiến thức và kỹ năng công nghệ thông tin cần thiết.", category: 'GENERAL', isMaintenance: false },
    "26": { id: "26", numId: 26, title: "Khả năng ứng dụng thực tế", fullQuestion: "Những kiến thức và kỹ năng được học có khả năng ứng dụng vào học tập và công việc thực tế.", category: 'GENERAL', isMaintenance: false },
    "27": { id: "27", numId: 27, title: "Sự tự tin sau khóa học", fullQuestion: "Sau khóa học, tôi tự tin hơn trong việc sử dụng và ứng dụng các kiến thức, kỹ năng đã được đào tạo.", category: 'GENERAL', isMaintenance: false },
    "28": { id: "28", numId: 28, title: "Đáp ứng kỳ vọng học viên", fullQuestion: "Khóa học đáp ứng được kỳ vọng và nhu cầu học tập của tôi.", category: 'GENERAL', isMaintenance: false },
    "29": { id: "29", numId: 29, title: "Độ hài lòng chung khóa học", fullQuestion: "Tôi hài lòng với chất lượng giảng dạy và các điều kiện hỗ trợ của khóa học.", category: 'GENERAL', isMaintenance: false },
    "30": { id: "30", numId: 30, title: "Sẵn sàng giới thiệu ITC", fullQuestion: "Tôi sẵn sàng giới thiệu khóa học tại Trung tâm CNTT – ITC cho sinh viên có nhu cầu học tập tương tự.", category: 'GENERAL', isMaintenance: false },

    // GROUP KEYS
    "group_1": { id: "group_1", title: "Mục tiêu & Nội dung khóa học", fullQuestion: "Tổng hợp đánh giá về mục tiêu, chương trình và cấu trúc đào tạo.", category: 'CURRICULUM', isMaintenance: false },
    "group_2": { id: "group_2", title: "Hoạt động giảng dạy & Đánh giá", fullQuestion: "Tổng hợp đánh giá về kiến thức, phương pháp và sự hỗ trợ của giảng viên.", category: 'TEACHING', isMaintenance: false },
    "group_3": { id: "group_3", title: "Cơ sở vật chất & Thiết bị phòng máy", fullQuestion: "Tổng hợp đánh giá máy móc, phòng thực hành, mạng Wi-Fi và điều hòa.", category: 'FACILITY', isMaintenance: true, equipmentType: 'GENERAL' },
    "group_4": { id: "group_4", title: "Công tác quản lý & Hỗ trợ sinh viên", fullQuestion: "Tổng hợp đánh giá dịch vụ hỗ trợ, thủ tục và thông báo từ Trung tâm.", category: 'SERVICE', isMaintenance: false },
    "group_5": { id: "group_5", title: "Kết quả học tập & Mức độ hài lòng", fullQuestion: "Tổng hợp độ hài lòng và tính ứng dụng của khóa học.", category: 'GENERAL', isMaintenance: false },

    // LEGACY CRITERIA KEYS
    "facility": { id: "facility", title: "Máy tính & Trang thiết bị phòng máy", fullQuestion: "Máy tính, cấu hình máy, bàn phím và thiết bị thực hành.", category: 'FACILITY', isMaintenance: true, equipmentType: 'PC' },
    "environment": { id: "environment", title: "Điều hòa, nhiệt độ & Phòng học", fullQuestion: "Hệ thống điều hòa làm mát, ánh sáng và vệ sinh phòng học.", category: 'FACILITY', isMaintenance: true, equipmentType: 'AC' },
    "curriculum": { id: "curriculum", title: "Chương trình & Giáo trình học", fullQuestion: "Giáo trình và tài liệu tham khảo của khóa học.", category: 'CURRICULUM', isMaintenance: false },
    "teaching_method": { id: "teaching_method", title: "Phương pháp giảng dạy", fullQuestion: "Kỹ năng truyền đạt và hướng dẫn thực hành của giảng viên.", category: 'TEACHING', isMaintenance: false },
    "teaching_attitude": { id: "teaching_attitude", title: "Thái độ & Trách nhiệm giảng viên", fullQuestion: "Sự nhiệt tình và hỗ trợ sinh viên của giảng viên.", category: 'TEACHING', isMaintenance: false },
    "center_service": { id: "center_service", title: "Dịch vụ & Hỗ trợ kỹ thuật Trung tâm", fullQuestion: "Công tác phục vụ và tiếp nhận giải quyết thắc mắc học viên.", category: 'SERVICE', isMaintenance: false }
};

export const getQuestionMeta = (key: string): QuestionMeta => {
    if (QUESTIONS_META_MAP[key]) return QUESTIONS_META_MAP[key];
    
    // Check if numeric string
    const num = parseInt(key);
    if (!isNaN(num) && num >= 1 && num <= 30) {
        if (num >= 13 && num <= 18) {
            return {
                id: key,
                numId: num,
                title: `Hạng mục thiết bị / phòng học (Câu ${num})`,
                fullQuestion: `Đánh giá thiết bị cơ sở vật chất câu số ${num}`,
                category: 'FACILITY',
                isMaintenance: true,
                equipmentType: 'GENERAL'
            };
        }
        return {
            id: key,
            numId: num,
            title: `Tiêu chí khảo sát (Câu ${num})`,
            fullQuestion: `Nội dung câu hỏi khảo sát số ${num}`,
            category: 'GENERAL',
            isMaintenance: false
        };
    }

    return {
        id: key,
        title: key,
        fullQuestion: key,
        category: 'GENERAL',
        isMaintenance: false
    };
};

/**
 * Main engine to compute granular alerts and maintenance issues
 */
export function computeMaintenanceAlerts(
    reviews: any[],
    classes: any[],
    courses: any[],
    teachers: any[],
    warningThreshold: number
): AlertItem[] {
    const alerts: AlertItem[] = [];

    // Helper to get teacher name(s)
    const getTeacherNames = (cls: any) => {
        const assignedIds = cls.teacherIds || (cls.teacherId ? [cls.teacherId] : []);
        const assignedTeachers = teachers.filter((t: any) => assignedIds.includes(t.id));
        if (assignedTeachers.length > 0) {
            return assignedTeachers.map((t: any) => t.name).join(', ');
        }
        const single = teachers.find((t: any) => t.id === cls.teacherId);
        return single ? single.name : 'Chưa phân công';
    };

    classes.forEach(c => {
        const course = courses.find((cr: any) => cr.id === c.courseId);
        const teacherName = getTeacherNames(c);
        const classReviews = reviews.filter((r: any) => r.classId === c.id);

        if (classReviews.length === 0) return;

        // Collect all question & criteria ratings in this class
        const ratingsMap: Record<string, { sum: number; count: number; lowest: number; lowCount: number }> = {};
        
        classReviews.forEach(r => {
            const ratings = r.ratings || {};
            Object.entries(ratings).forEach(([key, val]) => {
                const numVal = typeof val === 'number' ? val : parseFloat(val as string);
                if (isNaN(numVal) || numVal <= 0) return;

                if (!ratingsMap[key]) {
                    ratingsMap[key] = { sum: 0, count: 0, lowest: 5, lowCount: 0 };
                }
                ratingsMap[key].sum += numVal;
                ratingsMap[key].count++;
                if (numVal < ratingsMap[key].lowest) {
                    ratingsMap[key].lowest = numVal;
                }
                if (numVal < warningThreshold) {
                    ratingsMap[key].lowCount++;
                }
            });
        });

        // Collect all bad or informative comments from this class
        const classComments = classReviews
            .filter((r: any) => (r.comment && r.comment.trim().length > 0) || r.isEscalated)
            .map((r: any) => ({
                id: r.id,
                comment: r.comment || '(Học viên không để lại lời bình)',
                status: r.status || 'OPEN',
                teacherNote: r.teacherNote,
                isEscalated: r.isEscalated,
                createdAt: r.createdAt,
                actionNote: r.actionNote
            }));

        // Determine which specific questions triggered an alert
        const triggeredKeys: string[] = [];

        // Check each rated item
        Object.entries(ratingsMap).forEach(([key, data]) => {
            if (data.count === 0) return;
            const avg = data.sum / data.count;
            const meta = getQuestionMeta(key);

            // Condition to trigger alert:
            // 1. Average score is below warning threshold: avg < warningThreshold
            // 2. OR for maintenance/facility items, if any student gave a score below threshold (< warningThreshold)
            const isAvgBelow = avg < warningThreshold;
            const isStudentIncident = meta.isMaintenance && data.lowest < warningThreshold;

            if (isAvgBelow || isStudentIncident) {
                triggeredKeys.push(key);
            }
        });

        // Filter out redundant broad group if specific questions triggered
        // E.g., if Q14 or Q17 triggered, we don't need generic group_3 to clutter the list
        const hasGranularFacility = triggeredKeys.some(k => ['13', '14', '15', '16', '17', '18', 'facility', 'environment'].includes(k));
        const filteredKeys = triggeredKeys.filter(k => {
            if (k === 'group_3' && hasGranularFacility) return false;
            return true;
        });

        filteredKeys.forEach(key => {
            const data = ratingsMap[key];
            const avg = Number((data.sum / data.count).toFixed(1));
            const meta = getQuestionMeta(key);

            // Find comments particularly relevant to this room / equipment
            const relevantComments = classComments.filter(cm => {
                const commentText = cm.comment.toLowerCase();
                if (meta.equipmentType === 'PC' && (commentText.includes('máy') || commentText.includes('chuột') || commentText.includes('phím') || commentText.includes('chậm') || commentText.includes('ram'))) return true;
                if (meta.equipmentType === 'AC' && (commentText.includes('điều hòa') || commentText.includes('nóng') || commentText.includes('lạnh') || commentText.includes('máy lạnh') || commentText.includes('ngột'))) return true;
                if (meta.equipmentType === 'WIFI' && (commentText.includes('mạng') || commentText.includes('wifi') || commentText.includes('kết nối') || commentText.includes('lag'))) return true;
                return true; // Include other general comments if present
            });

            alerts.push({
                id: `alert_${c.id}_${key}`,
                classId: c.id,
                classCode: c.code,
                courseName: course ? course.name : '',
                room: c.room || 'Chưa xếp phòng',
                teacherName,
                academicYear: c.academicYear || '2026',
                critId: key,
                critName: meta.title,
                fullQuestion: meta.fullQuestion,
                category: meta.category,
                isMaintenance: meta.isMaintenance,
                score: avg.toFixed(1),
                avgScore: avg,
                lowestScore: data.lowest,
                lowRatingsCount: data.lowCount,
                count: data.count,
                studentComments: relevantComments.length > 0 ? relevantComments : classComments
            });
        });
    });

    // Sort alerts: Maintenance items first, then lowest score first
    alerts.sort((a, b) => {
        if (a.isMaintenance && !b.isMaintenance) return -1;
        if (!a.isMaintenance && b.isMaintenance) return 1;
        const scoreA = a.lowestScore ?? a.avgScore ?? 5;
        const scoreB = b.lowestScore ?? b.avgScore ?? 5;
        return scoreA - scoreB;
    });

    return alerts;
}

/**
 * Aggregates room-by-room hardware & facility condition
 */
export function computeRoomFacilitySummaries(
    reviews: any[],
    classes: any[],
    courses: any[]
): RoomFacilitySummary[] {
    const roomMap: Record<string, {
        classes: Set<string>;
        pcScores: number[];
        wifiScores: number[];
        acScores: number[];
        generalScores: number[];
        comments: any[];
    }> = {};

    classes.forEach(c => {
        const roomName = c.room || 'Phòng học mặc định';
        if (!roomMap[roomName]) {
            roomMap[roomName] = {
                classes: new Set(),
                pcScores: [],
                wifiScores: [],
                acScores: [],
                generalScores: [],
                comments: []
            };
        }
        roomMap[roomName].classes.add(c.code);

        const classReviews = reviews.filter((r: any) => r.classId === c.id);
        classReviews.forEach(r => {
            const ratings = r.ratings || {};
            
            // PC: Q14 or 'facility'
            const pc = ratings['14'] ?? ratings['facility'];
            if (pc) roomMap[roomName].pcScores.push(Number(pc));

            // Wi-Fi: Q15
            const wifi = ratings['15'];
            if (wifi) roomMap[roomName].wifiScores.push(Number(wifi));

            // AC: Q17 or 'environment'
            const ac = ratings['17'] ?? ratings['environment'];
            if (ac) roomMap[roomName].acScores.push(Number(ac));

            // General facility: Q13, Q18, group_3
            const gen = ratings['13'] ?? ratings['18'] ?? ratings['group_3'];
            if (gen) roomMap[roomName].generalScores.push(Number(gen));

            if (r.comment && r.comment.trim().length > 0) {
                roomMap[roomName].comments.push(r);
            }
        });
    });

    const avg = (arr: number[]) => arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 5.0;

    return Object.entries(roomMap).map(([room, data]) => {
        const pcScore = avg(data.pcScores);
        const wifiScore = avg(data.wifiScores);
        const acScore = avg(data.acScores);
        const genScore = avg(data.generalScores);
        const allScores = [...data.pcScores, ...data.wifiScores, ...data.acScores, ...data.generalScores];
        const overall = avg(allScores);

        // Count how many issues were rated <= 2.5
        const lowRatings = allScores.filter(s => s <= 2.5).length;

        return {
            room,
            classesCount: data.classes.size,
            classes: Array.from(data.classes),
            pcScore,
            wifiScore,
            acScore,
            overallFacilityScore: overall,
            totalFeedback: data.comments.length,
            maintenanceIssuesCount: lowRatings
        };
    }).sort((a, b) => a.overallFacilityScore - b.overallFacilityScore);
}
