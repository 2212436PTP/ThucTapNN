"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Icons } from '../ui/Icons';

interface ReportModalProps {
    stats: any;
    classes?: any[];
    courses?: any[];
    teachers?: any[];
    reviews?: any[];
    warningThreshold: number;
    onClose: () => void;
}

export const ReportModal = ({ 
    stats, 
    classes = [], 
    courses = [], 
    teachers = [], 
    reviews = [], 
    warningThreshold, 
    onClose 
}: ReportModalProps) => {
    const [downloading, setDownloading] = useState(false);

    // BỘ LỌC ĐA CHIỀU
    const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('ALL');
    const [selectedRatingFilter, setSelectedRatingFilter] = useState<string>('ALL'); // ALL, ALERT, 1, 2, 3, 4, 5
    const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
    const [startDate, setStartDate] = useState<string>(''); // YYYY-MM-DD
    const [endDate, setEndDate] = useState<string>(''); // YYYY-MM-DD
    const [reportViewMode, setReportViewMode] = useState<'REVIEWS' | 'ALERTS' | 'ONE_PAGER'>('ONE_PAGER'); // Mặc định hiển thị One-Pager điều hành 1 trang

    // PHÂN TRANG (PAGINATION)
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10); // 10, 20, 50, hoặc 0 (Tất cả)

    // Tự động quay về trang 1 khi người dùng đổi tiêu chí lọc
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedClassId, selectedTeacherId, selectedRatingFilter, selectedSemester, startDate, endDate, reportViewMode]);

    // Lấy danh sách Học kỳ / Niên khóa duy nhất
    const semesterOptions = useMemo(() => {
        const set = new Set<string>();
        classes.forEach(c => {
            if (c.academicYear) set.add(c.academicYear);
        });
        if (set.size === 0) {
            set.add('2025-2026 - HK1');
            set.add('2025-2026 - HK2');
        }
        return Array.from(set);
    }, [classes]);

    // Helper: Tìm tên giảng viên phụ trách theo lớp
    const getTeacherNamesByClass = (classItem: any) => {
        if (!classItem) return 'Chưa phân công';
        const assignedIds = classItem.teacherIds || (classItem.teacherId ? [classItem.teacherId] : []);
        const assigned = teachers.filter((t: any) => assignedIds.includes(t.id));
        if (assigned.length > 0) return assigned.map((t: any) => t.name).join(', ');
        const single = teachers.find((t: any) => t.id === classItem.teacherId);
        return single ? single.name : 'Chưa phân công';
    };

    // Helper: Định dạng thời gian dễ đọc (HH:mm ngày DD/MM/YYYY)
    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return 'Mới đây';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    // Helper: Tính điểm trung bình 1 bài review
    const calculateReviewAvg = (ratings: Record<string, any>) => {
        if (!ratings) return 5.0;
        const vals = Object.entries(ratings)
            .filter(([k]) => !k.startsWith('group_'))
            .map(([, v]) => typeof v === 'number' ? v : parseFloat(v))
            .filter(v => !isNaN(v) && v > 0);
        if (vals.length === 0) return 5.0;
        return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
    };

    // DỮ LIỆU ĐÁNH GIÁ (REVIEWS) ĐÃ LỌC
    const filteredReviews = useMemo(() => {
        return reviews.map(r => {
            const cls = classes.find(c => c.id === r.classId);
            const course = courses.find(cr => cr.id === cls?.courseId);
            const teacherName = getTeacherNamesByClass(cls);
            const avg = calculateReviewAvg(r.ratings);
            const assignedTeacherIds = cls?.teacherIds || (cls?.teacherId ? [cls.teacherId] : []);

            return {
                ...r,
                classCode: cls?.code || 'Chưa rõ',
                className: cls?.code || 'Chưa rõ',
                room: cls?.room || 'Phòng học',
                courseName: course?.name || 'Môn học',
                academicYear: cls?.academicYear || '2025-2026 - HK1',
                teacherName,
                assignedTeacherIds,
                avgScore: avg,
                formattedTime: formatDateTime(r.createdAt || r.created_at)
            };
        }).filter(r => {
            // Lọc theo Lớp
            if (selectedClassId !== 'ALL' && r.classId !== selectedClassId) return false;

            // Lọc theo Giảng viên
            if (selectedTeacherId !== 'ALL' && !r.assignedTeacherIds.includes(selectedTeacherId)) return false;

            // Lọc theo Học kỳ
            if (selectedSemester !== 'ALL' && r.academicYear !== selectedSemester) return false;

            // Lọc theo Khoảng thời gian đánh giá (Từ ngày ... Đến ngày ...)
            if (startDate) {
                const revTime = new Date(r.createdAt || r.created_at || 0).getTime();
                const startObj = new Date(startDate + 'T00:00:00');
                if (!isNaN(revTime) && revTime < startObj.getTime()) return false;
            }

            if (endDate) {
                const revTime = new Date(r.createdAt || r.created_at || 0).getTime();
                const endObj = new Date(endDate + 'T23:59:59.999');
                if (!isNaN(revTime) && revTime > endObj.getTime()) return false;
            }

            // Lọc theo Số sao
            if (selectedRatingFilter === 'ALERT') {
                return r.avgScore < warningThreshold || r.isEscalated;
            } else if (selectedRatingFilter !== 'ALL') {
                const targetStar = parseInt(selectedRatingFilter);
                // Ví dụ lọc 1 sao: 1.0 đến 1.9; 2 sao: 2.0 đến 2.9...
                return Math.floor(r.avgScore) === targetStar;
            }

            return true;
        });
    }, [reviews, classes, courses, teachers, selectedClassId, selectedTeacherId, selectedRatingFilter, selectedSemester, startDate, endDate, warningThreshold]);

    // DỮ LIỆU ĐIỂM NÓNG BẢO TRÌ (ALERTS) ĐÃ LỌC
    const filteredAlerts = useMemo(() => {
        const rawAlerts = stats?.alertList || [];
        return rawAlerts.filter((a: any) => {
            const cls = classes.find(c => c.id === a.classId || c.code === a.classCode);
            const assignedTeacherIds = cls?.teacherIds || (cls?.teacherId ? [cls.teacherId] : []);

            if (selectedClassId !== 'ALL' && a.classId && a.classId !== selectedClassId) return false;
            if (selectedTeacherId !== 'ALL' && !assignedTeacherIds.includes(selectedTeacherId)) return false;
            if (selectedSemester !== 'ALL' && a.academicYear && a.academicYear !== selectedSemester) return false;

            // Lọc theo thời gian nếu alert có mốc thời gian
            if (startDate && (a.createdAt || a.created_at)) {
                const alertTime = new Date(a.createdAt || a.created_at).getTime();
                const startObj = new Date(startDate + 'T00:00:00');
                if (!isNaN(alertTime) && alertTime < startObj.getTime()) return false;
            }
            if (endDate && (a.createdAt || a.created_at)) {
                const alertTime = new Date(a.createdAt || a.created_at).getTime();
                const endObj = new Date(endDate + 'T23:59:59.999');
                if (!isNaN(alertTime) && alertTime > endObj.getTime()) return false;
            }

            const score = parseFloat(a.score) || 0;
            if (selectedRatingFilter === 'ALERT') {
                return score < warningThreshold;
            } else if (selectedRatingFilter !== 'ALL') {
                const targetStar = parseInt(selectedRatingFilter);
                return Math.floor(score) === targetStar;
            }

            return true;
        });
    }, [stats?.alertList, classes, selectedClassId, selectedTeacherId, selectedRatingFilter, selectedSemester, startDate, endDate, warningThreshold]);

    // PHÂN TRANG DANH SÁCH KHẢO SÁT & SỰ CỐ
    const totalReviewItems = filteredReviews.length;
    const totalReviewPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(totalReviewItems / pageSize));
    const paginatedReviews = useMemo(() => {
        if (pageSize === 0) return filteredReviews;
        const from = (currentPage - 1) * pageSize;
        return filteredReviews.slice(from, from + pageSize);
    }, [filteredReviews, currentPage, pageSize]);

    const totalAlertItems = filteredAlerts.length;
    const totalAlertPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(totalAlertItems / pageSize));
    const paginatedAlerts = useMemo(() => {
        if (pageSize === 0) return filteredAlerts;
        const from = (currentPage - 1) * pageSize;
        return filteredAlerts.slice(from, from + pageSize);
    }, [filteredAlerts, currentPage, pageSize]);

    // TÍNH TOÁN KPI ĐỘNG THEO BỘ LỌC ĐANG CHỌN
    const activeStats = useMemo(() => {
        const count = filteredReviews.length;
        if (count === 0) {
            return {
                submissions: 0,
                avg: '0.0',
                alertsCount: filteredAlerts.length
            };
        }
        const sum = filteredReviews.reduce((acc, r) => acc + r.avgScore, 0);
        return {
            submissions: count,
            avg: (sum / count).toFixed(1),
            alertsCount: filteredAlerts.length
        };
    }, [filteredReviews, filteredAlerts]);

    // EXECUTIVE ONE-PAGER: KHỐI 1 - TOP 3 GIẢNG VIÊN XUẤT SẮC
    const executiveTopLecturers = useMemo(() => {
        const list: Array<{
            id: string;
            name: string;
            code: string;
            dept: string;
            totalReviews: number;
            classesCount: number;
            avgScore: number;
            praisePct: number;
            comment: string;
        }> = [];

        teachers.forEach(t => {
            const teacherClasses = classes.filter(c => (c.teacherIds && c.teacherIds.includes(t.id)) || c.teacherId === t.id);
            const teacherClassIds = teacherClasses.map(c => c.id);
            const teacherReviews = reviews.filter(r => teacherClassIds.includes(r.classId));

            if (teacherReviews.length > 0) {
                const totalScore = teacherReviews.reduce((sum, r) => sum + calculateReviewAvg(r.ratings), 0);
                const avg = Number((totalScore / teacherReviews.length).toFixed(1));
                const positiveCount = teacherReviews.filter(r => calculateReviewAvg(r.ratings) >= 4.0).length;
                const praisePct = Math.round((positiveCount / teacherReviews.length) * 100);

                const goodComments = teacherReviews
                    .filter(r => r.comment && r.comment.trim().length > 0 && calculateReviewAvg(r.ratings) >= 4.0)
                    .map(r => r.comment);
                const representativeComment = goodComments[0] || 'Giảng dạy tâm huyết, bài giảng sinh động, hướng dẫn thực hành nhiệt tình.';

                list.push({
                    id: t.id,
                    name: t.name,
                    code: t.code || 'GV',
                    dept: t.dept || 'Bộ môn CNTT',
                    totalReviews: teacherReviews.length,
                    classesCount: teacherClasses.length,
                    avgScore: avg,
                    praisePct,
                    comment: representativeComment
                });
            }
        });

        list.sort((a, b) => b.avgScore - a.avgScore || b.totalReviews - a.totalReviews);
        return list.slice(0, 3);
    }, [teachers, classes, reviews]);

    // EXECUTIVE ONE-PAGER: KHỐI 2 - TOP 3 LỚP HỌC CẦN HỖ TRỢ NGHIỆP VỤ
    const executiveSupportClasses = useMemo(() => {
        const list: Array<{
            id: string;
            code: string;
            courseName: string;
            teacherName: string;
            room: string;
            studentsCount: number;
            reviewedCount: number;
            completionRate: number;
            avgScore: number | string;
            issueText: string;
            actionRecommendation: string;
        }> = [];

        classes.forEach(c => {
            const course = courses.find(cr => cr.id === c.courseId);
            const classReviews = reviews.filter(r => r.classId === c.id);
            const studentsCount = c.studentsCount || 30;
            const completionRate = Math.round((classReviews.length / studentsCount) * 100);

            const avgScore = classReviews.length > 0 
                ? Number((classReviews.reduce((sum, r) => sum + calculateReviewAvg(r.ratings), 0) / classReviews.length).toFixed(1))
                : 0;

            const teacherName = getTeacherNamesByClass(c);

            const criticalReview = classReviews.find(r => calculateReviewAvg(r.ratings) <= 2.5 || r.isEscalated);
            const issueText = criticalReview?.comment || (completionRate < 30 ? 'Tỷ lệ sinh viên hoàn thành khảo sát còn rất thấp, cần đôn đốc làm bài.' : 'Cần tăng cường giải đáp thắc mắc và hỗ trợ bài tập nhóm.');

            list.push({
                id: c.id,
                code: c.code,
                courseName: course?.name || 'Môn học',
                teacherName,
                room: c.room || 'Phòng Lab',
                studentsCount,
                reviewedCount: classReviews.length,
                completionRate,
                avgScore: avgScore > 0 ? avgScore : 'Chưa nộp',
                issueText,
                actionRecommendation: (typeof avgScore === 'number' && avgScore > 0 && avgScore < 3.5)
                    ? 'Tổ chức trợ giảng tăng cường giờ thực hành, rà soát lại tiến độ đề cương.' 
                    : 'Gửi thông báo nhắc nhở qua Zalo lớp và email sinh viên để hoàn tất khảo sát.'
            });
        });

        list.sort((a, b) => {
            const scoreA = typeof a.avgScore === 'number' ? a.avgScore : 1;
            const scoreB = typeof b.avgScore === 'number' ? b.avgScore : 1;
            if (scoreA !== scoreB) return scoreA - scoreB;
            return a.completionRate - b.completionRate;
        });

        return list.slice(0, 3);
    }, [classes, courses, reviews, teachers]);

    // EXECUTIVE ONE-PAGER: KHỐI 3 - THIẾT BỊ PHÒNG MÁY CẦN BẢO DƯỠNG ĐỊNH KỲ
    const executiveLabEquipment = useMemo(() => {
        return [
            {
                target: 'Máy 14 & Cụm phím',
                room: 'Phòng Lab 5',
                issueType: 'Phần cứng / Ngoại vi',
                priority: 'KHẨN CẤP' as const,
                details: 'Liệt nút click trái chuột quang, phím Space bị kẹt cơ học.',
                recommendedAction: 'Thay chuột quang mới từ kho linh kiện ITC, vệ sinh bàn phím.'
            },
            {
                target: 'Cổng mạng LAN Máy 08',
                room: 'Phòng Lab 5',
                issueType: 'Hạ tầng Mạng LAN',
                priority: 'KHẨN CẤP' as const,
                details: 'Cáp mạng RJ45 âm sàn gãy ngàm cố định, chập chờn khi nộp bài thi.',
                recommendedAction: 'Bấm lại đầu cáp RJ45 và test thông mạch bằng máy đo mạng.'
            },
            {
                target: 'Hệ thống Dàn lạnh 02',
                room: 'Phòng Lab 1 & Lab 5',
                issueType: 'Điều hòa & Môi trường',
                priority: 'ĐỊNH KỲ' as const,
                details: 'Màng lọc bụi bám dày, phả hơi mát yếu vào khung giờ học trưa (13h-15h).',
                recommendedAction: 'Vệ sinh màng lọc bụi và nạp gas làm mát định kỳ theo lịch bảo dưỡng.'
            },
            {
                target: 'Access Point Wi-Fi ITC_05',
                room: 'Phòng Lab 6',
                issueType: 'Kết nối Không dây',
                priority: 'ĐỊNH KỲ' as const,
                details: 'Bị quá tải kết nối khi trên 40 thiết bị di động truy cập đồng thời.',
                recommendedAction: 'Khởi động lại router và phân tách SSID 5GHz chuyên dụng cho học viên.'
            }
        ];
    }, []);

    // TÊN TIÊU ĐỀ BỘ LỌC HIỆN TẠI (ĐỂ XUẤT FILE VÀ IN)
    const filterTitleText = useMemo(() => {
        const parts: string[] = [];
        if (selectedClassId !== 'ALL') {
            const c = classes.find(cl => cl.id === selectedClassId);
            parts.push(`Lớp: ${c ? c.code : selectedClassId}`);
        } else {
            parts.push('Tất cả các lớp');
        }

        if (selectedTeacherId !== 'ALL') {
            const t = teachers.find(tc => tc.id === selectedTeacherId);
            parts.push(`Giảng viên: ${t ? t.name : selectedTeacherId}`);
        }

        if (selectedSemester !== 'ALL') {
            parts.push(`Học kỳ: ${selectedSemester}`);
        }

        const formatDateInputToDisplay = (dStr: string) => {
            if (!dStr) return '';
            try {
                const [y, m, d] = dStr.split('-');
                if (y && m && d) return `${d}/${m}/${y}`;
                return dStr;
            } catch {
                return dStr;
            }
        };

        if (startDate && endDate) {
            parts.push(`Từ ${formatDateInputToDisplay(startDate)} đến ${formatDateInputToDisplay(endDate)}`);
        } else if (startDate) {
            parts.push(`Từ ngày ${formatDateInputToDisplay(startDate)}`);
        } else if (endDate) {
            parts.push(`Đến ngày ${formatDateInputToDisplay(endDate)}`);
        }

        if (selectedRatingFilter === 'ALERT') {
            parts.push(`Mức đánh giá: Điểm nóng (< ${warningThreshold} sao)`);
        } else if (selectedRatingFilter !== 'ALL') {
            parts.push(`Mức đánh giá: ${selectedRatingFilter} sao`);
        }

        return parts.join(' | ');
    }, [selectedClassId, selectedTeacherId, selectedSemester, selectedRatingFilter, startDate, endDate, classes, teachers, warningThreshold]);

    // 1. XUẤT FILE EXCEL / CSV THEO ĐÚNG BỘ LỌC ĐÃ CHỌN
    const handleExportCSV = () => {
        setDownloading(true);
        try {
            const BOM = "\uFEFF";
            let csv = BOM;

            csv += "TRƯỜNG ĐẠI HỌC ĐÀ LẠT - TRUNG TÂM CÔNG NGHỆ THÔNG TIN (ITC)\n";
            csv += "BÁO CÁO CHI TIẾT ĐÁNH GIÁ CHẤT LƯỢNG ĐÀO TẠO & KHẢO SÁT HỌC VIÊN\n";
            csv += `Tiêu chí bộ lọc:,"${filterTitleText.replace(/"/g, '""')}"\n`;
            csv += `Thời gian xuất báo cáo:,"${new Date().toLocaleString('vi-VN')}"\n`;
            csv += `Tổng số phiếu khảo sát lọc được:,"${activeStats.submissions} lượt"\n`;
            csv += `Điểm hài lòng trung bình bộ lọc:,"${activeStats.avg} / 5.0"\n`;
            csv += `Số lượng cảnh báo sự cố:,"${activeStats.alertsCount} hạng mục"\n\n`;

            if (reportViewMode === 'REVIEWS') {
                csv += "STT,Thời Gian Đánh Giá,Mã Lớp,Khóa Học / Môn Học,Phòng Học,Giảng Viên Phụ Trách,Học Kỳ / Niên Khóa,Điểm Trung Bình (Sao),Trạng Thái Xử Lý,Nhận Xét & Ý Kiến Học Viên\n";
                filteredReviews.forEach((r, idx) => {
                    const comment = (r.comment || '').replace(/"/g, '""');
                    csv += `${idx + 1},"${r.formattedTime}","${r.classCode}","${r.courseName}","${r.room}","${r.teacherName}","${r.academicYear}",${r.avgScore},"${r.status || 'OPEN'}","${comment}"\n`;
                });
            } else {
                csv += "STT,Mã Lớp,Phòng Học,Giảng Viên Phụ Trách,Học Kỳ / Niên Khóa,Tiêu Chí Phàn Nàn,Nội Dung Chi Tiết,Điểm Đánh Giá,Mức Độ Cảnh Báo,Ý Kiến Phản Hồi Học Viên\n";
                filteredAlerts.forEach((a: any, idx: number) => {
                    const score = parseFloat(a.score) || 0;
                    const level = score <= 2.0 ? "Khẩn cấp" : "Cần lưu ý";
                    const comments = (a.studentComments && a.studentComments.length > 0)
                        ? a.studentComments.map((c: any) => c.comment.replace(/"/g, '""')).join('; ')
                        : 'Không có ghi chú thêm';
                    csv += `${idx + 1},"${a.classCode || ''}","${a.room || ''}","${a.teacherName || ''}","${a.academicYear || ''}","${(a.critName || '').replace(/"/g, '""')}","${(a.fullQuestion || a.critName || '').replace(/"/g, '""')}",${a.score},"${level}","${comments}"\n`;
                });
            }

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const cleanName = filterTitleText.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_').slice(0, 40);
            link.href = url;
            link.setAttribute('download', `Bao_Cao_ITC_${cleanName}_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Lỗi khi xuất CSV:', e);
            alert('Không thể tạo file CSV. Vui lòng thử lại!');
        } finally {
            setDownloading(false);
        }
    };

    // 2. IN ẤN / XUẤT FILE PDF THEO BỘ LỌC ĐÃ CHỌN
    const handlePrintOrPDF = () => {
        const printWindow = window.open('', '_blank', 'width=950,height=800');
        if (!printWindow) {
            alert('Trình duyệt đang chặn cửa sổ bật lên (Pop-up). Vui lòng cho phép mở pop-up để xem bản in / lưu PDF.');
            return;
        }

        const dateStr = new Date().toLocaleDateString('vi-VN');
        const timeStr = new Date().toLocaleTimeString('vi-VN');

        // CHẾ ĐỘ ONE-PAGER: IN BÁO CÁO ĐIỀU HÀNH 1 TRANG A4
        if (reportViewMode === 'ONE_PAGER') {
            const onePagerHtml = `
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="utf-8">
                    <title>BÁO CÁO TÓM TẮT ĐIỀU HÀNH 1 TRANG (EXECUTIVE ONE-PAGER) - ITC DLU</title>
                    <style>
                        @page { size: A4 portrait; margin: 8mm 10mm; }
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; font-size: 10.5px; line-height: 1.35; }
                        .no-print { margin-bottom: 12px; padding: 8px 12px; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
                        .header-grid { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px; }
                        .univ-title { font-weight: bold; font-size: 12px; text-transform: uppercase; color: #0f172a; }
                        .univ-center { font-weight: 800; font-size: 13px; color: #991b1b; }
                        .country-title { text-align: right; font-weight: bold; font-size: 11px; }
                        .report-heading { text-align: center; margin: 8px 0 10px 0; }
                        .report-heading h1 { margin: 0; font-size: 16px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
                        .report-filter-badge { display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 2px 10px; border-radius: 9999px; font-size: 10px; font-weight: bold; color: #475569; margin-top: 4px; }
                        .executive-block { margin-bottom: 10px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
                        .block-header { background: #0f172a; color: white; padding: 4px 8px; font-size: 10.5px; font-weight: 800; display: flex; justify-content: space-between; align-items: center; }
                        table { width: 100%; border-collapse: collapse; font-size: 10px; }
                        th { background: #f8fafc; padding: 4px 6px; border: 1px solid #cbd5e1; font-weight: 800; color: #334155; }
                        td { padding: 4px 6px; border: 1px solid #e2e8f0; color: #1e293b; vertical-align: top; }
                        .tag-rank { display: inline-block; width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 50%; font-weight: 900; font-size: 9px; color: white; }
                        .signature-section { display: flex; justify-content: space-between; margin-top: 25px; page-break-inside: avoid; }
                        .sig-block { text-align: center; width: 180px; }
                        .sig-title { font-size: 11px; font-weight: bold; margin-bottom: 45px; }
                        .sig-sub { font-size: 10px; color: #64748b; font-style: italic; }
                        @media print {
                            body { padding: 0; }
                            .no-print { display: none !important; }
                        }
                    </style>
                </head>
                <body>
                    <div class="no-print">
                        <span style="font-weight: bold; color: #0369a1;">Xem trước Bản in Báo Cáo Điều Hành 1 Trang (Executive One-Pager)</span>
                        <button onclick="window.print()" style="padding: 5px 12px; background: #0284c7; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
                            Bấm để In ngay / Lưu PDF
                        </button>
                    </div>

                    <div class="header-grid">
                        <div>
                            <div class="univ-title">TRƯỜNG ĐẠI HỌC ĐÀ LẠT</div>
                            <div class="univ-center">TRUNG TÂM CÔNG NGHỆ THÔNG TIN (ITC)</div>
                            <div style="font-size: 9.5px; color: #64748b;">Số 01 Phù Đổng Thiên Vương, TP. Đà Lạt</div>
                        </div>
                        <div class="country-title">
                            <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                            <div style="font-weight: normal; margin-top: 2px;">Độc lập - Tự do - Hạnh phúc</div>
                            <div style="font-size: 9.5px; color: #64748b; font-weight: normal; margin-top: 3px;">Đà Lạt, ngày ${dateStr}</div>
                        </div>
                    </div>

                    <div class="report-heading">
                        <h1>BÁO CÁO TÓM TẮT ĐIỀU HÀNH THÁNG (EXECUTIVE ONE-PAGER)</h1>
                        <div class="report-filter-badge">HỌC KỲ I - NIÊN KHÓA 2025-2026 | DỮ LIỆU ĐÁNH GIÁ CHẤT LƯỢNG ĐÀO TẠO</div>
                    </div>

                    <!-- KHỐI 1: TOP 3 GIẢNG VIÊN XUẤT SẮC -->
                    <div class="executive-block">
                        <div class="block-header">
                            <span>KHỐI 1: TOP 3 GIẢNG VIÊN XUẤT SẮC NHẤT THÁNG</span>
                            <span style="font-size: 9.5px; font-weight: normal;">Căn cứ điểm đánh giá học viên & tỷ lệ hài lòng cao nhất</span>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 28px; text-align: center;">Hạng</th>
                                    <th style="width: 140px;">Giảng Viên</th>
                                    <th style="width: 80px;">Số Lớp & Phiếu</th>
                                    <th style="width: 70px; text-align: center;">Điểm TB</th>
                                    <th style="width: 80px; text-align: center;">Đánh Giá Tốt</th>
                                    <th>Ý Kiến Khen Ngợi Tiêu Biểu Từ Học Viên</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${executiveTopLecturers.map((t, idx) => `
                                    <tr>
                                        <td style="text-align: center;">
                                            <span class="tag-rank" style="background: ${idx === 0 ? '#eab308' : idx === 1 ? '#94a3b8' : '#b45309'};">
                                                ${idx + 1}
                                            </span>
                                        </td>
                                        <td><b>${t.name}</b><div style="font-size: 9px; color: #64748b;">${t.dept}</div></td>
                                        <td>${t.classesCount} lớp (${t.totalReviews} phiếu)</td>
                                        <td style="text-align: center; font-weight: bold; color: #059669; font-size: 12px;">${t.avgScore} ★</td>
                                        <td style="text-align: center; font-weight: bold; color: #1e3a8a;">${t.totalReviews} phiếu</td>
                                        <td style="font-style: italic; color: #334155;">"${t.comment}"</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- KHỐI 2: TOP 3 LỚP HỌC CẦN HỖ TRỢ NGHIỆP VỤ -->
                    <div class="executive-block">
                        <div class="block-header" style="background: #991b1b;">
                            <span>KHỐI 2: TOP 3 LỚP HỌC CẦN HỖ TRỢ NGHIỆP VỤ & ĐÔN ĐỐC</span>
                            <span style="font-size: 9.5px; font-weight: normal;">Lớp có số lượng nộp bài thấp hoặc điểm dưới chuẩn cần can thiệp</span>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 70px;">Mã Lớp</th>
                                    <th style="width: 110px;">Khóa Học</th>
                                    <th style="width: 100px;">Giảng Viên</th>
                                    <th style="width: 70px; text-align: center;">Đã Nộp</th>
                                    <th style="width: 60px; text-align: center;">Điểm TB</th>
                                    <th style="width: 170px;">Vấn Đề Trọng Tâm Học Viên Nêu</th>
                                    <th>Khuyến Nghị Hành Động Đào Tạo</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${executiveSupportClasses.map(c => `
                                    <tr>
                                        <td style="font-weight: bold; color: #991b1b;">${c.code}</td>
                                        <td>${c.courseName}</td>
                                        <td>${c.teacherName}</td>
                                        <td style="text-align: center; font-weight: bold;">${c.reviewedCount} / ${c.studentsCount} SV</td>
                                        <td style="text-align: center; font-weight: bold; color: ${typeof c.avgScore === 'number' && c.avgScore < 3 ? '#dc2626' : '#64748b'};">${c.avgScore}</td>
                                        <td style="font-size: 9.5px; color: #475569;">${c.issueText}</td>
                                        <td style="font-weight: 600; color: #0f172a;">${c.actionRecommendation}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- KHỐI 3: THIẾT BỊ PHÒNG MÁY CẦN BẢO DƯỠNG ĐỊNH KỲ -->
                    <div class="executive-block">
                        <div class="block-header" style="background: #0369a1;">
                            <span>KHỐI 3: THIẾT BỊ PHÒNG MÁY CẦN BẢO DƯỠNG ĐỊNH KỲ & KHẨN CẤP</span>
                            <span style="font-size: 9.5px; font-weight: normal;">Theo dõi hạ tầng phòng thực hành phục vụ giảng dạy</span>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 130px;">Hạng Mục / Thiết Bị</th>
                                    <th style="width: 85px;">Phòng Máy</th>
                                    <th style="width: 75px; text-align: center;">Mức Độ</th>
                                    <th style="width: 100px;">Phân Loại Sự Cố</th>
                                    <th style="width: 170px;">Hiện Trạng Kỹ Thuật</th>
                                    <th>Biện Pháp Xử Lý Của Kỹ Thuật Viên</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${executiveLabEquipment.map(e => `
                                    <tr>
                                        <td style="font-weight: bold;">${e.target}</td>
                                        <td>${e.room}</td>
                                        <td style="text-align: center;">
                                            <span style="display:inline-block; padding: 1px 6px; border-radius: 4px; font-weight: bold; font-size: 8.5px; background: ${e.priority === 'KHẨN CẤP' ? '#fee2e2' : '#fef3c7'}; color: ${e.priority === 'KHẨN CẤP' ? '#991b1b' : '#92400e'};">
                                                ${e.priority}
                                            </span>
                                        </td>
                                        <td>${e.issueType}</td>
                                        <td style="font-size: 9.5px; color: #475569;">${e.details}</td>
                                        <td style="font-weight: 600; color: #0f172a;">${e.recommendedAction}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="signature-section">
                        <div class="sig-block">
                            <div class="sig-title">Đại diện Tổ Đào tạo</div>
                            <div class="sig-sub">(Ký và ghi rõ họ tên)</div>
                        </div>
                        <div class="sig-block">
                            <div class="sig-title">Tổ trưởng Kỹ thuật Phòng máy</div>
                            <div class="sig-sub">(Ký và ghi rõ họ tên)</div>
                        </div>
                        <div class="sig-block">
                            <div class="sig-title">Ban Giám đốc Trung tâm ITC</div>
                            <div class="sig-sub">(Ký, đóng dấu)</div>
                        </div>
                    </div>

                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                            }, 500);
                        };
                    </script>
                </body>
                </html>
            `;
            printWindow.document.open();
            printWindow.document.write(onePagerHtml);
            printWindow.document.close();
            return;
        }

        let tableHeaderHtml = '';
        let tableRowsHtml = '';

        if (reportViewMode === 'REVIEWS') {
            tableHeaderHtml = `
                <tr>
                    <th style="width: 30px; text-align: center;">STT</th>
                    <th style="width: 100px;">Thời Gian Đánh Giá</th>
                    <th style="width: 70px;">Mã Lớp</th>
                    <th style="width: 120px;">Môn Học / Khóa Học</th>
                    <th style="width: 110px;">Giảng Viên Phụ Trách</th>
                    <th style="width: 55px; text-align: center;">Điểm</th>
                    <th style="width: 75px; text-align: center;">Trạng Thái</th>
                    <th>Ý Kiến / Phản Hồi Học Viên</th>
                </tr>
            `;

            tableRowsHtml = filteredReviews.map((r, idx) => {
                const isLow = r.avgScore <= 2.5;
                return `
                    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                        <td style="padding: 8px; text-align: center; font-weight: bold;">${idx + 1}</td>
                        <td style="padding: 8px; color: #64748b; font-size: 10.5px;">${r.formattedTime}</td>
                        <td style="padding: 8px; font-weight: bold; color: #1e3a8a;">${r.classCode}</td>
                        <td style="padding: 8px;">${r.courseName}</td>
                        <td style="padding: 8px; font-weight: 500;">${r.teacherName}</td>
                        <td style="padding: 8px; text-align: center; font-weight: bold; font-size: 13px; color: ${isLow ? '#dc2626' : '#059669'};">
                            ${r.avgScore} / 5.0
                        </td>
                        <td style="padding: 8px; text-align: center;">
                            <span style="display:inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 10px; background-color: #f1f5f9; color: #334155;">
                                ${r.status || 'OPEN'}
                            </span>
                        </td>
                        <td style="padding: 8px; font-size: 11px; color: #1e293b;">
                            ${r.comment || '<span style="color:#94a3b8;font-style:italic;">(Học viên không để lại lời bình)</span>'}
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tableHeaderHtml = `
                <tr>
                    <th style="width: 30px; text-align: center;">STT</th>
                    <th style="width: 70px;">Mã Lớp</th>
                    <th style="width: 75px;">Phòng</th>
                    <th style="width: 110px;">Giảng Viên</th>
                    <th>Tiêu Chí Phàn Nàn</th>
                    <th style="width: 55px; text-align: center;">Điểm</th>
                    <th style="width: 75px; text-align: center;">Mức Độ</th>
                    <th style="width: 200px;">Ý Kiến Phản Hồi Học Viên</th>
                </tr>
            `;

            tableRowsHtml = filteredAlerts.map((a: any, idx: number) => {
                const score = parseFloat(a.score) || 0;
                const isCritical = score <= 2.0;
                const comment = (a.studentComments && a.studentComments.length > 0)
                    ? a.studentComments.map((c: any) => `<li>${c.comment}</li>`).join('')
                    : '<span style="color:#94a3b8;font-style:italic;">(Không có lời bình)</span>';

                return `
                    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                        <td style="padding: 8px; text-align: center; font-weight: bold;">${idx + 1}</td>
                        <td style="padding: 8px; font-weight: bold; color: #1e3a8a;">${a.classCode}</td>
                        <td style="padding: 8px;">${a.room || 'Phòng học'}</td>
                        <td style="padding: 8px; font-weight: 500;">${a.teacherName || '-'}</td>
                        <td style="padding: 8px;">
                            <b>${a.critName}</b>
                            ${a.fullQuestion ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">${a.fullQuestion}</div>` : ''}
                        </td>
                        <td style="padding: 8px; text-align: center; font-weight: bold; font-size: 13px; color: ${isCritical ? '#dc2626' : '#d97706'};">
                            ${a.score} / 5.0
                        </td>
                        <td style="padding: 8px; text-align: center;">
                            <span style="display:inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 10px; background-color: ${isCritical ? '#fee2e2' : '#fef3c7'}; color: ${isCritical ? '#991b1b' : '#92400e'}; border: 1px solid ${isCritical ? '#fecaca' : '#fde68a'};">
                                ${isCritical ? 'Khẩn cấp' : 'Cần lưu ý'}
                            </span>
                        </td>
                        <td style="padding: 8px; font-size: 10.5px; color: #334155;">
                            <ul style="margin: 0; padding-left: 14px;">${comment}</ul>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="utf-8">
                <title>BÁO CÁO ĐÁNH GIÁ CHẤT LƯỢNG ĐÀO TẠO - ITC DLU</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        color: #1e293b;
                        margin: 0;
                        padding: 30px;
                        background: #fff;
                    }
                    .header-grid {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        border-bottom: 2px solid #0284c7;
                        padding-bottom: 12px;
                        margin-bottom: 20px;
                    }
                    .univ-title {
                        font-size: 12px;
                        font-weight: bold;
                        text-transform: uppercase;
                        color: #334155;
                        line-height: 1.4;
                    }
                    .univ-center {
                        font-size: 13px;
                        font-weight: 800;
                        color: #0369a1;
                    }
                    .country-title {
                        text-align: right;
                        font-size: 12px;
                        font-weight: bold;
                        line-height: 1.4;
                    }
                    .report-heading {
                        text-align: center;
                        margin: 15px 0 15px 0;
                    }
                    .report-heading h1 {
                        font-size: 18px;
                        font-weight: 900;
                        color: #0f172a;
                        margin: 0 0 6px 0;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .report-filter-badge {
                        display: inline-block;
                        padding: 4px 12px;
                        background: #f1f5f9;
                        border: 1px solid #cbd5e1;
                        border-radius: 6px;
                        font-size: 12px;
                        font-weight: bold;
                        color: #0f172a;
                        margin-top: 4px;
                    }
                    .kpi-container {
                        display: flex;
                        gap: 15px;
                        margin: 15px 0 20px 0;
                    }
                    .kpi-card {
                        flex: 1;
                        padding: 10px 14px;
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                    }
                    .kpi-label {
                        font-size: 11px;
                        color: #64748b;
                        display: block;
                    }
                    .kpi-value {
                        font-size: 18px;
                        font-weight: 800;
                        color: #0f172a;
                        margin-top: 2px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 30px;
                    }
                    th {
                        background-color: #f1f5f9;
                        color: #334155;
                        font-size: 11px;
                        font-weight: bold;
                        text-align: left;
                        padding: 8px;
                        border-top: 1px solid #cbd5e1;
                        border-bottom: 2px solid #cbd5e1;
                        text-transform: uppercase;
                    }
                    .signature-section {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 40px;
                        page-break-inside: avoid;
                    }
                    .sig-block {
                        text-align: center;
                        width: 200px;
                    }
                    .sig-title {
                        font-size: 12px;
                        font-weight: bold;
                        margin-bottom: 60px;
                    }
                    .sig-sub {
                        font-size: 11px;
                        color: #64748b;
                        font-style: italic;
                    }
                    @media print {
                        body { padding: 10mm; }
                        .no-print { display: none; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="no-print" style="margin-bottom: 15px; padding: 10px; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; font-weight: bold; color: #0369a1;">Xem trước Bản in A4 / Lưu file PDF theo bộ lọc</span>
                    <button onclick="window.print()" style="padding: 6px 14px; background: #0284c7; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
                        Bấm để In ngay / Lưu PDF
                    </button>
                </div>

                <div class="header-grid">
                    <div>
                        <div class="univ-title">TRƯỜNG ĐẠI HỌC ĐÀ LẠT</div>
                        <div class="univ-center">TRUNG TÂM CÔNG NGHỆ THÔNG TIN (ITC)</div>
                        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Số 01 Phù Đổng Thiên Vương, TP. Đà Lạt</div>
                    </div>
                    <div class="country-title">
                        <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                        <div style="font-size: 11px; font-weight: normal; margin-top: 2px;">Độc lập - Tự do - Hạnh phúc</div>
                        <div style="font-size: 10px; color: #64748b; font-weight: normal; margin-top: 4px;">Đà Lạt, ngày ${dateStr}</div>
                    </div>
                </div>

                <div class="report-heading">
                    <h1>BÁO CÁO ĐÁNH GIÁ CHẤT LƯỢNG ĐÀO TẠO</h1>
                    <div class="report-filter-badge">${filterTitleText}</div>
                    <p style="margin-top: 6px;">Thời điểm xuất báo cáo: ${timeStr} ${dateStr}</p>
                </div>

                <div class="kpi-container">
                    <div class="kpi-card">
                        <span class="kpi-label">Tổng lượt phiếu theo bộ lọc</span>
                        <div class="kpi-value">${activeStats.submissions} <span style="font-size: 12px; font-weight: normal; color: #64748b;">lượt</span></div>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Điểm hài lòng trung bình</span>
                        <div class="kpi-value" style="color: #059669;">${activeStats.avg} <span style="font-size: 12px; font-weight: normal; color: #64748b;">/ 5.0</span></div>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Số cảnh báo cần bảo trì</span>
                        <div class="kpi-value" style="color: #dc2626;">${activeStats.alertsCount} <span style="font-size: 12px; font-weight: normal; color: #64748b;">hạng mục</span></div>
                    </div>
                </div>

                <div style="margin-bottom: 8px; font-weight: bold; font-size: 12px; color: #0f172a;">
                    DANH SÁCH CHI TIẾT BẢNG SỐ LIỆU ĐÁNH GIÁ:
                </div>

                <table>
                    <thead>
                        ${tableHeaderHtml}
                    </thead>
                    <tbody>
                        ${tableRowsHtml || '<tr><td colspan="8" style="padding: 16px; text-align: center; color: #64748b;">Không tìm thấy dữ liệu phù hợp với bộ lọc đã chọn.</td></tr>'}
                    </tbody>
                </table>

                <div class="signature-section">
                    <div class="sig-block">
                        <div class="sig-title">Người lập báo cáo</div>
                        <div class="sig-sub">(Ký và ghi rõ họ tên)</div>
                    </div>
                    <div class="sig-block">
                        <div class="sig-title">Bộ phận Kỹ thuật & Bảo trì</div>
                        <div class="sig-sub">(Ký và ghi rõ họ tên)</div>
                    </div>
                    <div class="sig-block">
                        <div class="sig-title">Ban Giám đốc Trung tâm ITC</div>
                        <div class="sig-sub">(Ký, đóng dấu)</div>
                    </div>
                </div>

                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-200 text-xs text-slate-700 animate-in zoom-in-95 duration-200">
                
                {/* Header (Cố định ở trên) */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-itc-50 border border-itc-100 flex items-center justify-center shrink-0">
                            <Icons.FileText className="w-5 h-5 text-itc-800" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold text-itc-800 uppercase tracking-widest bg-itc-50 px-2.5 py-0.5 rounded-full border border-itc-100">
                                    BÁO CÁO NỘI BỘ DLU
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium">Trung tâm Công nghệ Thông tin</span>
                            </div>
                            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-0.5 leading-tight">
                                BÁO CÁO CHẤT LƯỢNG ĐÀO TẠO & KHẢO SÁT HỌC VIÊN
                            </h2>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors font-bold text-sm"
                        title="Đóng (Esc)"
                    >
                        <Icons.X className="w-5 h-5" />
                    </button>
                </div>

                {/* THANH BỘ LỌC ĐA TIÊU CHÍ & KHOẢNG THỜI GIAN ĐÁNH GIÁ */}
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 shrink-0 space-y-2.5">
                    {/* Hàng 1: Lớp, Giảng viên, Đánh giá sao, Học kỳ */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-center">
                        {/* 1. Lọc theo Lớp */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Lọc theo Lớp học:</label>
                            <select
                                value={selectedClassId}
                                onChange={e => setSelectedClassId(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-itc-500 outline-none"
                            >
                                <option value="ALL">Tất cả các lớp ({classes.length})</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>Lớp {c.code}</option>
                                ))}
                            </select>
                        </div>

                        {/* 2. Lọc theo Giảng viên */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Lọc theo Giảng viên:</label>
                            <select
                                value={selectedTeacherId}
                                onChange={e => setSelectedTeacherId(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-itc-500 outline-none"
                            >
                                <option value="ALL">Tất cả giảng viên ({teachers.length})</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.code || 'GV'})</option>
                                ))}
                            </select>
                        </div>

                        {/* 3. Lọc theo Mức sao (1-5 sao hoặc Điểm nóng) */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Đánh giá số sao:</label>
                            <select
                                value={selectedRatingFilter}
                                onChange={e => setSelectedRatingFilter(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-itc-500 outline-none"
                            >
                                <option value="ALL">Tất cả mức đánh giá (1 - 5 sao)</option>
                                <option value="ALERT">Dưới ngưỡng cảnh báo (&lt; {warningThreshold} sao)</option>
                                <option value="1">1 Sao (Cần cải thiện)</option>
                                <option value="2">2 Sao (Dưới chuẩn)</option>
                                <option value="3">3 Sao (Đạt yêu cầu)</option>
                                <option value="4">4 Sao (Tốt)</option>
                                <option value="5">5 Sao (Rất tốt / Xuất sắc)</option>
                            </select>
                        </div>

                        {/* 4. Lọc theo Học kỳ & Niên khóa */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Học kỳ / Niên khóa:</label>
                            <select
                                value={selectedSemester}
                                onChange={e => setSelectedSemester(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-itc-500 outline-none"
                            >
                                <option value="ALL">Tất cả học kỳ</option>
                                {semesterOptions.map(sem => (
                                    <option key={sem} value={sem}>{sem}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Hàng 2: Tìm kiếm ngày đánh giá (Từ ngày -> Đến ngày) & Chế độ xem */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-end pt-1.5 border-t border-slate-200/70">
                        {/* Từ ngày */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center justify-between mb-1">
                                <span className="flex items-center gap-1">
                                    <Icons.Clock className="w-3 h-3 text-itc-800" /> Từ ngày đánh giá:
                                </span>
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-itc-500 outline-none"
                            />
                        </div>

                        {/* Đến ngày */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center justify-between mb-1">
                                <span className="flex items-center gap-1">
                                    <Icons.Clock className="w-3 h-3 text-itc-800" /> Đến ngày đánh giá:
                                </span>
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-itc-500 outline-none"
                            />
                        </div>

                        {/* Nút reset ngày hoặc ghi chú */}
                        <div className="flex items-center">
                            {(startDate || endDate) ? (
                                <button
                                    type="button"
                                    onClick={() => { setStartDate(''); setEndDate(''); }}
                                    className="w-full py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                                    title="Xóa bộ lọc khoảng ngày để xem toàn bộ"
                                >
                                    <span className="flex items-center justify-center gap-1">
                                        <Icons.X className="w-3.5 h-3.5" /> Xóa lọc ngày
                                    </span>
                                </button>
                            ) : (
                                <div className="text-[11px] text-slate-400 italic py-1.5">
                                    (Hiển thị toàn bộ các mốc thời gian)
                                </div>
                            )}
                        </div>

                        {/* Chế độ xem: One-Pager điều hành vs Phiếu khảo sát vs Điểm nóng bảo trì */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Chế độ hiển thị:</label>
                            <div className="flex bg-slate-200/80 p-0.5 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setReportViewMode('ONE_PAGER')}
                                    className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                                        reportViewMode === 'ONE_PAGER' ? 'bg-white text-emerald-800 shadow-xs font-black' : 'text-slate-600'
                                    }`}
                                    title="Xem Báo cáo tóm tắt điều hành 1 trang gồm 3 khối trọng tâm"
                                >
                                    One-Pager (1 Trang)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReportViewMode('REVIEWS')}
                                    className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                                        reportViewMode === 'REVIEWS' ? 'bg-white text-itc-900 shadow-xs' : 'text-slate-600'
                                    }`}
                                >
                                    Phiếu ({filteredReviews.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReportViewMode('ALERTS')}
                                    className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                                        reportViewMode === 'ALERTS' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600'
                                    }`}
                                >
                                    Sự cố ({filteredAlerts.length})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body (Cuộn mượt mà bên trong, không tràn màn hình) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                    
                    {/* Thẻ KPI Tổng quan theo Bộ lọc */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                            <span className="text-slate-500 block text-[11px] font-medium">Lượt khảo sát (theo bộ lọc)</span>
                            <div className="flex items-baseline gap-1.5 mt-1">
                                <b className="text-xl font-extrabold text-itc-900">{activeStats.submissions}</b>
                                <span className="text-slate-400 text-xs">phiếu nộp</span>
                            </div>
                        </div>

                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                            <span className="text-slate-500 block text-[11px] font-medium">Điểm hài lòng trung bình</span>
                            <div className="flex items-baseline gap-1.5 mt-1">
                                <b className="text-xl font-extrabold text-emerald-600">{activeStats.avg}</b>
                                <span className="text-slate-400 text-xs">/ 5.0</span>
                            </div>
                        </div>

                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                            <span className="text-slate-500 block text-[11px] font-medium">Cảnh báo sự cố điểm nóng</span>
                            <div className="flex items-baseline gap-1.5 mt-1">
                                <b className="text-xl font-extrabold text-rose-600">{activeStats.alertsCount}</b>
                                <span className="text-slate-400 text-xs">hạng mục (&lt; {warningThreshold} sao)</span>
                            </div>
                        </div>
                    </div>

                    {/* BÁO CÁO ONE-PAGER vs BẢNG CHI TIẾT */}
                    {reportViewMode === 'ONE_PAGER' ? (
                        <div className="space-y-4">
                            {/* Banner One-Pager */}
                            <div className="bg-gradient-to-r from-slate-900 via-itc-900 to-slate-800 text-white p-4 sm:p-5 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                                            EXECUTIVE ONE-PAGER
                                        </span>
                                        <span className="text-xs text-slate-300">Học kỳ I - Niên khóa 2025-2026</span>
                                    </div>
                                    <h3 className="text-base sm:text-lg font-black text-white">
                                        BÁO CÁO TÓM TẮT ĐIỀU HÀNH 1 TRANG (ONE-PAGER)
                                    </h3>
                                    <p className="text-xs text-slate-300 max-w-xl">
                                        Trang bìa tóm tắt điều hành gồm 3 khối cốt lõi: Khen thưởng Top 3 Giảng viên xuất sắc, Hỗ trợ Top 3 Lớp khó khăn, và Kế hoạch bảo trì phòng máy thực hành.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handlePrintOrPDF}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                                >
                                    <Icons.Printer className="w-4 h-4" /> In Báo Cáo 1 Trang (PDF)
                                </button>
                            </div>

                            {/* KHỐI 1: TOP 3 GIẢNG VIÊN XUẤT SẮC */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                                <div className="px-5 py-3.5 bg-gradient-to-r from-amber-50 to-amber-100/50 border-b border-amber-200/80 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                                            1
                                        </div>
                                        <div>
                                            <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                                                KHỐI 1: TOP 3 GIẢNG VIÊN XUẤT SẮC NHẤT THÁNG
                                            </h4>
                                            <p className="text-[11px] text-slate-500">Căn cứ điểm đánh giá học viên và tỷ lệ phản hồi tích cực nhất</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-amber-800 bg-white px-2.5 py-1 rounded-lg border border-amber-200">
                                        Khen thưởng thi đua
                                    </span>
                                </div>

                                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {executiveTopLecturers.map((t, idx) => (
                                        <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3 relative hover:shadow-xs transition">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1.5 ${
                                                        idx === 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                                        idx === 1 ? 'bg-slate-200 text-slate-800 border border-slate-300' :
                                                        'bg-amber-50 text-amber-800 border border-amber-200'
                                                    }`}>
                                                        Hạng {idx + 1} • {idx === 0 ? 'Xuất Sắc Nhất' : idx === 1 ? 'Hạng Nhì' : 'Hạng Ba'}
                                                    </span>
                                                    <h5 className="font-bold text-slate-900 text-sm leading-tight">{t.name}</h5>
                                                    <span className="text-[11px] text-slate-500">{t.dept}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-lg font-black text-emerald-600 block">{t.avgScore} ★</span>
                                                    <span className="text-[10px] text-slate-400 font-semibold">{t.totalReviews} phiếu</span>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex items-center justify-between text-[11px] text-slate-600">
                                                    <span>Số lượt đánh giá tốt:</span>
                                                    <b className="text-slate-900">{t.totalReviews} phiếu</b>
                                                </div>
                                                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 text-[11px] text-slate-600 italic">
                                                    "{t.comment}"
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* KHỐI 2: TOP 3 LỚP HỌC CẦN HỖ TRỢ NGHIỆP VỤ */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                                <div className="px-5 py-3.5 bg-gradient-to-r from-rose-50 to-rose-100/50 border-b border-rose-200/80 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                                            2
                                        </div>
                                        <div>
                                            <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                                                KHỐI 2: TOP 3 LỚP HỌC CẦN HỖ TRỢ NGHIỆP VỤ & ĐÔN ĐỐC
                                            </h4>
                                            <p className="text-[11px] text-slate-500">Lớp có tiến độ khảo sát thấp hoặc nhiều phàn nàn cần giải trình</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-rose-800 bg-white px-2.5 py-1 rounded-lg border border-rose-200">
                                        Cần can thiệp
                                    </span>
                                </div>

                                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {executiveSupportClasses.map((c) => (
                                        <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3 hover:shadow-xs transition">
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                                        Lớp {c.code}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-600">
                                                        Điểm TB: <b className="text-rose-600">{c.avgScore}</b>
                                                    </span>
                                                </div>
                                                <h5 className="font-bold text-slate-900 text-xs">{c.courseName}</h5>
                                                <p className="text-[11px] text-slate-500 mt-0.5">GV: {c.teacherName} • {c.room}</p>
                                            </div>

                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex items-center justify-between text-[11px] text-slate-600">
                                                    <span>Số lượng đã nộp:</span>
                                                    <b className="text-slate-800">{c.reviewedCount} / {c.studentsCount} SV</b>
                                                </div>
                                                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${c.completionRate < 30 ? 'bg-rose-500' : 'bg-amber-500'}`} 
                                                        style={{ width: `${c.completionRate}%` }}
                                                    ></div>
                                                </div>
                                                <div className="p-2 bg-rose-50/70 rounded-lg border border-rose-100 text-[11px] text-slate-700">
                                                    <b>Vấn đề:</b> {c.issueText}
                                                </div>
                                                <div className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-800 font-semibold">
                                                    <b>Khuyến nghị:</b> {c.actionRecommendation}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* KHỐI 3: THIẾT BỊ PHÒNG MÁY CẦN BẢO DƯỠNG ĐỊNH KỲ */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                                <div className="px-5 py-3.5 bg-gradient-to-r from-sky-50 to-sky-100/50 border-b border-sky-200/80 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                                            3
                                        </div>
                                        <div>
                                            <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                                                KHỐI 3: THIẾT BỊ PHÒNG MÁY CẦN BẢO DƯỠNG ĐỊNH KỲ & KHẨN CẤP
                                            </h4>
                                            <p className="text-[11px] text-slate-500">Phân công kỹ thuật viên kiểm tra linh kiện và hạ tầng mạng</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-sky-800 bg-white px-2.5 py-1 rounded-lg border border-sky-200">
                                        Kỹ thuật & Lab
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                                <th className="py-2.5 px-4 w-44">Vị Trí / Thiết Bị</th>
                                                <th className="py-2.5 px-3 w-32">Phòng Thực Hành</th>
                                                <th className="py-2.5 px-3 w-28 text-center">Mức Độ</th>
                                                <th className="py-2.5 px-3 w-36">Phân Loại Sự Cố</th>
                                                <th className="py-2.5 px-4">Hiện Trạng Kỹ Thuật</th>
                                                <th className="py-2.5 px-4">Đề Xuất Hành Động Kỹ Thuật Viên</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {executiveLabEquipment.map((e, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="py-3 px-4 font-bold text-slate-900">
                                                        {e.target}
                                                    </td>
                                                    <td className="py-3 px-3 text-slate-600 font-semibold">
                                                        {e.room}
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                            e.priority === 'KHẨN CẤP' 
                                                                ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                                                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                                                        }`}>
                                                            {e.priority}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-slate-500 font-medium">
                                                        {e.issueType}
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-700">
                                                        {e.details}
                                                    </td>
                                                    <td className="py-3 px-4 font-semibold text-slate-900">
                                                        {e.recommendedAction}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                    /* Bảng chi tiết */
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
                            <div>
                                <h4 className="font-bold text-slate-800 text-xs sm:text-sm">
                                    {reportViewMode === 'REVIEWS' 
                                        ? `Danh sách Phiếu khảo sát học viên (${filteredReviews.length} lượt)`
                                        : `Danh sách Điểm nóng & Cảnh báo bảo trì (${filteredAlerts.length} hạng mục)`
                                    }
                                </h4>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Đang lọc: <span className="font-semibold text-itc-900">{filterTitleText}</span>
                                </p>
                            </div>
                        </div>

                        {/* BẢNG CHẾ ĐỘ 1: XEM CHI TIẾT CÁC PHIẾU ĐÁNH GIÁ (KÈM NGÀY GIỜ, GIẢNG VIÊN, LỚP) */}
                        {reportViewMode === 'REVIEWS' ? (
                            filteredReviews.length > 0 ? (
                                <div className="max-h-[380px] overflow-y-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-100/90 sticky top-0 z-10 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                                            <tr>
                                                <th className="p-3 w-36">Thời gian đánh giá</th>
                                                <th className="p-3 w-28">Mã Lớp</th>
                                                <th className="p-3 w-40">Giảng viên</th>
                                                <th className="p-3">Khóa học / Nhận xét học viên</th>
                                                <th className="p-3 text-center w-24">Trạng thái</th>
                                                <th className="p-3 text-right w-24">Điểm TB</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {paginatedReviews.map((r, idx) => {
                                                const isLow = r.avgScore <= 2.5;
                                                return (
                                                    <tr key={r.id || idx} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-3 text-slate-500 font-medium text-[11px]">
                                                            <div className="flex items-center gap-1.5">
                                                                <Icons.Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                <span>{r.formattedTime}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3 font-bold text-itc-900">
                                                            {r.classCode}
                                                            <div className="text-[10px] text-slate-400 font-normal">{r.room}</div>
                                                        </td>
                                                        <td className="p-3 font-semibold text-slate-800">
                                                            {r.teacherName}
                                                        </td>
                                                        <td className="p-3 text-slate-700">
                                                            <div className="font-bold text-[11px] text-slate-900 mb-0.5">{r.courseName}</div>
                                                            {r.comment ? (
                                                                <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100 italic">
                                                                    "{r.comment}"
                                                                </p>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-400 italic">(Không để lại bình luận)</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                r.status === 'RESOLVED' 
                                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                                    : r.status === 'IN_PROGRESS'
                                                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                            }`}>
                                                                {r.status === 'RESOLVED' ? 'Đã giải quyết' : r.status === 'IN_PROGRESS' ? 'Đang xử lý' : 'Mới tiếp nhận'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right font-black text-sm" style={{ color: isLow ? '#dc2626' : '#059669' }}>
                                                            {r.avgScore} / 5.0
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-slate-400 italic">
                                    <Icons.Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="font-semibold text-slate-600">Không có phiếu khảo sát nào khớp với bộ lọc đã chọn.</p>
                                    <p className="text-[11px] text-slate-400 mt-1">Hãy thử đổi tiêu chí lớp, giảng viên hoặc mức sao ở thanh công cụ trên.</p>
                                </div>
                            )
                        ) : (
                            /* BẢNG CHẾ ĐỘ 2: XEM DANH SÁCH ĐIỂM NÓNG BẢO TRÌ */
                            filteredAlerts.length > 0 ? (
                                <div className="max-h-[380px] overflow-y-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-100/90 sticky top-0 z-10 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                                            <tr>
                                                <th className="p-3 w-28">Mã Lớp</th>
                                                <th className="p-3 w-28">Phòng học</th>
                                                <th className="p-3 w-36">Giảng viên</th>
                                                <th className="p-3">Tiêu chí phàn nàn & Ý kiến</th>
                                                <th className="p-3 text-center w-28">Mức độ</th>
                                                <th className="p-3 text-right w-24">Điểm TB</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {paginatedAlerts.map((a: any, idx: number) => {
                                                const numScore = parseFloat(a.score) || 0;
                                                const isCritical = numScore <= 2.0;
                                                return (
                                                    <tr key={a.id || idx} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-3 font-bold text-itc-900">{a.classCode}</td>
                                                        <td className="p-3 text-slate-600 font-medium">{a.room || 'Phòng học'}</td>
                                                        <td className="p-3 font-semibold text-slate-800">{a.teacherName || '-'}</td>
                                                        <td className="p-3 font-medium text-slate-800">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                                                                <span className="font-bold">{a.critName}</span>
                                                            </div>
                                                            {a.fullQuestion && (
                                                                <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-md font-normal">
                                                                    {a.fullQuestion}
                                                                </p>
                                                            )}
                                                            {a.studentComments && a.studentComments.length > 0 && (
                                                                <div className="mt-1 text-[11px] text-slate-600 bg-rose-50/50 p-1.5 rounded-lg border border-rose-100 flex items-start gap-1.5">
                                                                    <Icons.Comments className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                                                    <i>{a.studentComments[0].comment}</i>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                isCritical 
                                                                    ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                                                                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                                                            }`}>
                                                                {isCritical ? 'Khẩn cấp' : 'Cần lưu ý'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right font-black text-rose-600 text-sm">
                                                            {a.score} / 5.0
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-slate-400 italic">
                                    <Icons.CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                                    <p className="font-semibold text-slate-600">Tuyệt vời! Không có sự cố điểm nóng nào khớp với bộ lọc này.</p>
                                </div>
                            )
                        )}

                        {/* THANH ĐIỀU HƯỚNG PHÂN TRANG (PAGINATION CONTROLS) */}
                        {((reportViewMode === 'REVIEWS' && totalReviewItems > 0) || (reportViewMode === 'ALERTS' && totalAlertItems > 0)) && (
                            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-3">
                                    <span className="text-slate-500 font-medium">
                                        Hiển thị{' '}
                                        <b className="text-slate-800">
                                            {reportViewMode === 'REVIEWS'
                                                ? (pageSize === 0 ? totalReviewItems : Math.min((currentPage - 1) * pageSize + 1, totalReviewItems))
                                                : (pageSize === 0 ? totalAlertItems : Math.min((currentPage - 1) * pageSize + 1, totalAlertItems))}
                                        </b>
                                        {' - '}
                                        <b className="text-slate-800">
                                            {reportViewMode === 'REVIEWS'
                                                ? (pageSize === 0 ? totalReviewItems : Math.min(currentPage * pageSize, totalReviewItems))
                                                : (pageSize === 0 ? totalAlertItems : Math.min(currentPage * pageSize, totalAlertItems))}
                                        </b>
                                        {' / '}
                                        <span className="text-itc-800 font-bold">
                                            {reportViewMode === 'REVIEWS' ? totalReviewItems : totalAlertItems}
                                        </span>{' '}
                                        bản ghi
                                    </span>

                                    {/* Dropdown chọn số dòng / trang */}
                                    <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                                        <span className="text-slate-500 text-[11px]">Mỗi trang:</span>
                                        <select
                                            value={pageSize}
                                            onChange={e => {
                                                setPageSize(parseInt(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:border-itc-500 cursor-pointer"
                                        >
                                            <option value={10}>10 dòng</option>
                                            <option value={20}>20 dòng</option>
                                            <option value={50}>50 dòng</option>
                                            <option value={0}>Tất cả</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Nút chuyển trang */}
                                {pageSize !== 0 && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            disabled={currentPage <= 1}
                                            onClick={() => setCurrentPage(1)}
                                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-600 transition"
                                            title="Về trang đầu"
                                        >
                                            «
                                        </button>
                                        <button
                                            type="button"
                                            disabled={currentPage <= 1}
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-600 transition"
                                            title="Trang trước"
                                        >
                                            ‹ Trước
                                        </button>

                                        <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold text-[11px]">
                                            Trang <span className="text-itc-800">{currentPage}</span> /{' '}
                                            <span>{reportViewMode === 'REVIEWS' ? totalReviewPages : totalAlertPages}</span>
                                        </div>

                                        <button
                                            type="button"
                                            disabled={currentPage >= (reportViewMode === 'REVIEWS' ? totalReviewPages : totalAlertPages)}
                                            onClick={() => setCurrentPage(prev => Math.min(reportViewMode === 'REVIEWS' ? totalReviewPages : totalAlertPages, prev + 1))}
                                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-600 transition"
                                            title="Trang sau"
                                        >
                                            Sau ›
                                        </button>
                                        <button
                                            type="button"
                                            disabled={currentPage >= (reportViewMode === 'REVIEWS' ? totalReviewPages : totalAlertPages)}
                                            onClick={() => setCurrentPage(reportViewMode === 'REVIEWS' ? totalReviewPages : totalAlertPages)}
                                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-600 transition"
                                            title="Đến trang cuối"
                                        >
                                            »
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    )}
                </div>

                {/* Footer (Cố định ở dưới) */}
                <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex flex-wrap justify-between items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                        <Icons.Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Thời gian: <b>{new Date().toLocaleString('vi-VN')}</b></span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                        >
                            Đóng
                        </button>

                        {/* NÚT 1: XUẤT FILE EXCEL / CSV THEO BỘ LỌC */}
                        <button 
                            type="button"
                            onClick={handleExportCSV}
                            disabled={downloading}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-emerald-700/15 active:scale-95 disabled:opacity-50"
                            title="Tải về file Excel / CSV theo đúng các tiêu chí bộ lọc đã chọn"
                        >
                            <Icons.FileSpreadsheet className="w-4 h-4" />
                            {downloading ? 'Đang xuất...' : 'Xuất File Excel (.CSV)'}
                        </button>

                        {/* NÚT 2: IN BÁO CÁO / LƯU PDF CHUẨN FORM A4 THEO BỘ LỌC */}
                        <button 
                            type="button"
                            onClick={handlePrintOrPDF}
                            className="flex items-center gap-1.5 px-4 py-2 bg-itc-800 text-white font-bold text-xs rounded-xl hover:bg-itc-900 transition shadow-md shadow-itc-900/10 active:scale-95"
                            title="Mở bản in A4 chính thức có phần ký tên (Lưu thành file PDF theo bộ lọc)"
                        >
                            <Icons.Printer className="w-4 h-4" />
                            In Báo Cáo / Lưu PDF
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
