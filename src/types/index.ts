export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface Course {
    id: string;
    code?: string;
    name: string;
    duration?: string;
}

export interface Teacher {
    id: string;
    code?: string;
    name: string;
    email?: string;
    dept?: string;
    role?: Role;
}

export interface ClassInfo {
    id: string;
    courseId: string;
    teacherId: string;
    teacherIds?: string[];
    academicYear?: string;
    code: string;
    room: string;
    schedule: string;
    studentsCount: number;
    status: 'OPEN_SURVEY' | 'CLOSED_SURVEY';
    surveyConfig?: {
        mode?: 'DEFAULT_30' | 'CUSTOM';
        selectedQuestionIds?: number[];
        customQuestions?: { id: number; text: string; group: string }[];
    };
}

export interface CriteriaRatings {
    facility: number;
    environment: number;
    curriculum: number;
    teaching_method: number;
    teaching_attitude: number;
    center_service: number;
    [key: string]: number; // index signature for dynamic access
}

export interface Review {
    id: string;
    classId: string;
    ratings: CriteriaRatings;
    comment: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
    actionNote: string;
    createdAt: string;
    teacherNote?: string;
    isEscalated?: boolean;
}

export interface CriteriaCategory {
    id: keyof CriteriaRatings;
    name: string;
    desc: string;
}

export interface AlertItem {
    id: string;
    classId?: string;
    classCode: string;
    courseName?: string;
    room: string;
    teacherName: string;
    academicYear?: string;
    critId?: string;
    critName: string;
    fullQuestion?: string;
    category?: 'FACILITY' | 'TEACHING' | 'CURRICULUM' | 'SERVICE' | 'GENERAL';
    isMaintenance?: boolean;
    score: string; // Keep as string for backward-compat (e.g. "1.8")
    avgScore?: number;
    lowestScore?: number;
    lowRatingsCount?: number;
    count: number;
    studentComments?: Array<{
        id: string;
        comment: string;
        status: string;
        teacherNote?: string;
        isEscalated?: boolean;
        createdAt?: string;
        actionNote?: string;
    }>;
}

export interface RoomFacilitySummary {
    room: string;
    classesCount: number;
    classes: string[];
    pcScore: number;
    wifiScore: number;
    acScore: number;
    overallFacilityScore: number;
    totalFeedback: number;
    maintenanceIssuesCount: number;
}

export interface ClassMetric {
    classInfo: ClassInfo;
    courseName: string;
    teacherName: string;
    count: number;
    criteriaSums: CriteriaRatings;
    criteriaAvgs: Record<string, string | number>;
    overallAvg: string | number;
    badComments: Array<{ id: string; comment: string; status: string; teacherNote?: string; isEscalated?: boolean }>;
}

export interface AppStats {
    totalSubmissions: number;
    centerAvgSatisfaction: string | number;
    alertList: AlertItem[];
    maintenanceCount?: number;
    roomFacilitySummaries?: RoomFacilitySummary[];
    classMetrics: Record<string, ClassMetric>;
}

