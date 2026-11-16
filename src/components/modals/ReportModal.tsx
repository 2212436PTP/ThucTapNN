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

    // BỘ LỌC ĐA CHIỀU & TÌM KIẾM NHANH
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('ALL');
    const [selectedRatingFilter, setSelectedRatingFilter] = useState<string>('ALL'); // ALL, ALERT, 1, 2, 3, 4, 5
    const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
    const [startDate, setStartDate] = useState<string>(''); // YYYY-MM-DD
    const [endDate, setEndDate] = useState<string>(''); // YYYY-MM-DD
    const [reportViewMode, setReportViewMode] = useState<'REVIEWS' | 'ALERTS'>('REVIEWS'); // Mặc định hiển thị Bảng đánh giá chi tiết chuẩn học đường

    // PHÂN TRANG (PAGINATION)
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10); // 10, 20, 50, hoặc 0 (Tất cả)

    // Tự động quay về trang 1 khi người dùng đổi tiêu chí lọc hoặc tìm kiếm
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedClassId, selectedTeacherId, selectedRatingFilter, selectedSemester, startDate, endDate, reportViewMode, searchKeyword]);

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

    // Helper: Tính điểm trung bình 1 bài review (Chỉ tính các câu hỏi Likert 1-5 sao, loại bỏ hoàn toàn MSSV/tên/meta)
    const calculateReviewAvg = (ratings: Record<string, any>) => {
        if (!ratings) return 5.0;
        const vals = Object.entries(ratings)
            .filter(([k]) => {
                if (['student_code', 'student_name', 'studentCode', 'studentName', 'mssv', 'name', 'submitted_at', 'submittedAt', 'timestamp', 'comment', 'assetLocation', 'role', 'class_id', 'classId'].includes(k)) return false;
                if (k.startsWith('group_') || k.startsWith('student_') || k.startsWith('meta_')) return false;
                return true;
            })
            .map(([, v]) => typeof v === 'number' ? v : parseFloat(String(v)))
            .filter(v => !isNaN(v) && v >= 1 && v <= 5);
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
            // Lọc theo Từ khóa tìm kiếm (Mã lớp, Giảng viên, Môn học, Phòng máy, Ý kiến)
            if (searchKeyword.trim()) {
                const kw = searchKeyword.toLowerCase().trim();
                const matchClass = r.classCode.toLowerCase().includes(kw);
                const matchCourse = r.courseName.toLowerCase().includes(kw);
                const matchTeacher = r.teacherName.toLowerCase().includes(kw);
                const matchRoom = (r.room || '').toLowerCase().includes(kw);
                const matchComment = (r.comment || '').toLowerCase().includes(kw);
                if (!matchClass && !matchCourse && !matchTeacher && !matchRoom && !matchComment) return false;
            }

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
    }, [reviews, classes, courses, teachers, selectedClassId, selectedTeacherId, selectedRatingFilter, selectedSemester, startDate, endDate, warningThreshold, searchKeyword]);

    // DỮ LIỆU ĐIỂM NÓNG BẢO TRÌ (ALERTS) ĐÃ LỌC
    const filteredAlerts = useMemo(() => {
        const rawAlerts = stats?.alertList || [];
        return rawAlerts.filter((a: any) => {
            const cls = classes.find(c => c.id === a.classId || c.code === a.classCode);
            const assignedTeacherIds = cls?.teacherIds || (cls?.teacherId ? [cls.teacherId] : []);

            // Lọc theo Từ khóa tìm kiếm
            if (searchKeyword.trim()) {
                const kw = searchKeyword.toLowerCase().trim();
                const matchClass = (a.classCode || cls?.code || '').toLowerCase().includes(kw);
                const matchCourse = (a.courseName || a.className || '').toLowerCase().includes(kw);
                const matchTeacher = (a.teacherName || '').toLowerCase().includes(kw);
                const matchRoom = (a.room || cls?.room || '').toLowerCase().includes(kw);
                const matchDesc = (a.title || a.description || a.criteriaName || '').toLowerCase().includes(kw);
                if (!matchClass && !matchCourse && !matchTeacher && !matchRoom && !matchDesc) return false;
            }

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
    }, [stats?.alertList, classes, selectedClassId, selectedTeacherId, selectedRatingFilter, selectedSemester, startDate, endDate, warningThreshold, searchKeyword]);

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
                        <div className="w-10 h-10 rounded-2xl bg-itc-50 border border-itc-200 flex items-center justify-center shrink-0 text-itc-800 shadow-2xs">
                            <Icons.FileText className="w-5 h-5 text-itc-800" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold text-itc-800 uppercase tracking-widest bg-itc-50 px-2.5 py-0.5 rounded-full border border-itc-100">
                                    TRƯỜNG ĐẠI HỌC ĐÀ LẠT
                                </span>
                                <span className="text-[11px] text-slate-500 font-semibold">Trung tâm Công nghệ Thông tin (ITC)</span>
                            </div>
                            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-0.5 leading-tight">
                                BÁO CÁO CHẤT LƯỢNG ĐÀO TẠO & KHẢO SÁT HỌC VIÊN
                            </h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            type="button"
                            onClick={handleExportCSV}
                            disabled={downloading}
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs active:scale-95 disabled:opacity-50"
                            title="Tải về file Excel / CSV theo đúng các tiêu chí bộ lọc đã chọn"
                        >
                            <Icons.FileSpreadsheet className="w-3.5 h-3.5" />
                            {downloading ? 'Đang xuất...' : 'Xuất Excel (.CSV)'}
                        </button>

                        <button 
                            type="button"
                            onClick={handlePrintOrPDF}
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-itc-800 text-white font-bold text-xs rounded-xl hover:bg-itc-900 transition shadow-xs active:scale-95"
                            title="Mở bản in A4 chính thức chuẩn trường học (Lưu thành file PDF theo bộ lọc)"
                        >
                            <Icons.Printer className="w-3.5 h-3.5" />
                            In Báo Cáo / Lưu PDF
                        </button>

                        <button 
                            onClick={onClose} 
                            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors font-bold text-sm ml-1"
                            title="Đóng (Esc)"
                        >
                            <Icons.X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* THANH BỘ LỌC ĐA TIÊU CHÍ, TÌM KIẾM THEO LỚP/GIẢNG VIÊN & KHOẢNG THỜI GIAN */}
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 shrink-0 space-y-3">
                    
                    {/* HÀNG 1: Ô TÌM KIẾM NHANH (SEARCH BAR) + CHUYỂN ĐỔI CHẾ ĐỘ XEM */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-200/80">
                        {/* Ô TÌM KIẾM THEO LỚP, GIẢNG VIÊN, MÔN HỌC, PHÒNG LAB */}
                        <div className="relative flex-1">
                            <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchKeyword}
                                onChange={e => setSearchKeyword(e.target.value)}
                                placeholder="Tìm kiếm nhanh theo mã lớp (VD: 2027), tên giảng viên, môn học, phòng lab..."
                                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-itc-500 shadow-2xs"
                            />
                            {searchKeyword && (
                                <button
                                    type="button"
                                    onClick={() => setSearchKeyword('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 flex items-center justify-center text-[10px] font-bold"
                                    title="Xóa tìm kiếm"
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        {/* Chế độ xem: Phiếu khảo sát vs Điểm nóng bảo trì chuẩn học đường */}
                        <div className="flex bg-slate-200/80 p-0.5 rounded-xl shrink-0">
                            <button
                                type="button"
                                onClick={() => setReportViewMode('REVIEWS')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    reportViewMode === 'REVIEWS' ? 'bg-white text-itc-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Xem danh sách phiếu khảo sát chi tiết của học viên"
                            >
                                <Icons.FileText className="w-3.5 h-3.5 text-itc-800" />
                                <span>Phiếu Khảo Sát ({filteredReviews.length})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setReportViewMode('ALERTS')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    reportViewMode === 'ALERTS' ? 'bg-white text-rose-700 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Xem danh sách các điểm nóng và sự cố cần bảo trì phòng máy"
                            >
                                <Icons.AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Điểm Nóng & Bảo Trì ({filteredAlerts.length})</span>
                            </button>
                        </div>
                    </div>

                    {/* HÀNG 2: 4 DROPDOWN LỌC CHUYÊN SÂU */}
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

                    {/* HÀNG 3: KHOẢNG THỜI GIAN ĐÁNH GIÁ (TỪ NGÀY -> ĐẾN NGÀY) */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1.5 border-t border-slate-200/70 text-xs">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Từ ngày */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                                    <Icons.Clock className="w-3 h-3 text-itc-800" /> Từ ngày:
                                </span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:border-itc-500 outline-none"
                                />
                            </div>

                            {/* Đến ngày */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                                    <Icons.Clock className="w-3 h-3 text-itc-800" /> Đến ngày:
                                </span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:border-itc-500 outline-none"
                                />
                            </div>

                            {/* Nút reset ngày hoặc ghi chú */}
                            {(startDate || endDate) && (
                                <button
                                    type="button"
                                    onClick={() => { setStartDate(''); setEndDate(''); }}
                                    className="py-1 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition flex items-center gap-1"
                                    title="Xóa bộ lọc khoảng ngày để xem toàn bộ"
                                >
                                    <Icons.X className="w-3 h-3" /> Xóa lọc ngày
                                </button>
                            )}
                        </div>

                        {/* Tổng số kết quả phù hợp & Nút đặt lại */}
                        <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                            {searchKeyword ? (
                                <span>Kết quả tìm kiếm: <b className="text-itc-800">"{searchKeyword}"</b> ({filteredReviews.length} phiếu, {filteredAlerts.length} sự cố)</span>
                            ) : (
                                <span className="text-slate-500">Đang hiển thị dữ liệu theo bộ lọc hiện tại</span>
                            )}

                            {(selectedClassId !== 'ALL' || selectedTeacherId !== 'ALL' || selectedRatingFilter !== 'ALL' || selectedSemester !== 'ALL' || startDate || endDate || searchKeyword) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedClassId('ALL');
                                        setSelectedTeacherId('ALL');
                                        setSelectedRatingFilter('ALL');
                                        setSelectedSemester('ALL');
                                        setStartDate('');
                                        setEndDate('');
                                        setSearchKeyword('');
                                    }}
                                    className="text-[11px] text-itc-700 hover:text-itc-900 font-bold hover:underline transition-colors flex items-center gap-1"
                                    title="Khôi phục tất cả bộ lọc về mặc định"
                                >
                                    <Icons.RefreshCw className="w-3 h-3" />
                                    <span>Đặt lại bộ lọc</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Body (Cuộn mượt mà bên trong, không tràn màn hình) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                    
                    {/* Thẻ KPI Tổng quan theo Bộ lọc chuẩn học đường */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-itc-200 transition-colors">
                            <div className="flex items-center justify-between text-slate-500">
                                <span className="text-[11px] font-bold uppercase tracking-wider">Lượt phiếu khảo sát</span>
                                <div className="w-7 h-7 rounded-lg bg-itc-50 border border-itc-100 flex items-center justify-center text-itc-800">
                                    <Icons.FileText className="w-3.5 h-3.5" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1.5 mt-2">
                                <b className="text-2xl font-black text-itc-900">{activeStats.submissions}</b>
                                <span className="text-slate-400 text-xs font-semibold">phiếu nộp</span>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-200 transition-colors">
                            <div className="flex items-center justify-between text-slate-500">
                                <span className="text-[11px] font-bold uppercase tracking-wider">Điểm hài lòng trung bình</span>
                                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                                    <Icons.Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1.5 mt-2">
                                <b className="text-2xl font-black text-emerald-600">{activeStats.avg}</b>
                                <span className="text-slate-400 text-xs font-semibold">/ 5.0 ★</span>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-rose-200 transition-colors">
                            <div className="flex items-center justify-between text-slate-500">
                                <span className="text-[11px] font-bold uppercase tracking-wider">Cảnh báo sự cố / Bảo trì</span>
                                <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                                    <Icons.AlertTriangle className="w-3.5 h-3.5" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1.5 mt-2">
                                <b className="text-2xl font-black text-rose-600">{activeStats.alertsCount}</b>
                                <span className="text-slate-400 text-xs font-semibold">hạng mục (&lt; {warningThreshold} sao)</span>
                            </div>
                        </div>
                    </div>

                    {/* BẢNG DỮ LIỆU ĐÁNH GIÁ CHI TIẾT CHUẨN HỌC ĐƯỜNG */}
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
