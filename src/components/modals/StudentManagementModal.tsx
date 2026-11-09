"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Icons } from '../ui/Icons';
import * as XLSX from 'xlsx';
import { 
    getClassStudents, 
    saveClassStudents, 
    ClassStudentItem,
    DEFAULT_REAL_STUDENTS
} from '../../lib/classMetaStorage';
import { supabase } from '../../lib/supabaseClient';
import { addAuditLog } from '../../lib/auditLogger';

interface StudentManagementModalProps {
    classItem?: any;
    allClasses: any[];
    courses: any[];
    teachers: any[];
    reviews: any[];
    appUsers?: any[];
    onClose: () => void;
    onRefreshClassData?: () => void;
}

export const StudentManagementModal: React.FC<StudentManagementModalProps> = ({
    classItem,
    allClasses,
    courses,
    teachers,
    reviews,
    appUsers = [],
    onClose,
    onRefreshClassData
}) => {
    // Lớp đang được chọn
    const [selectedClassId, setSelectedClassId] = useState<string>(
        classItem?.id || (allClasses[0]?.id || '')
    );

    // Lấy thông tin lớp hiện tại
    const currentClass = useMemo(() => {
        return allClasses.find(c => c.id === selectedClassId) || classItem || null;
    }, [allClasses, selectedClassId, classItem]);

    // Lấy môn học & giảng viên
    const currentCourse = useMemo(() => {
        return courses.find(cr => cr.id === currentClass?.courseId || cr.id === currentClass?.course_id);
    }, [courses, currentClass]);

    const teacherNames = useMemo(() => {
        if (!currentClass) return 'Chưa phân công';
        const assignedIds = currentClass.teacherIds || (currentClass.teacherId ? [currentClass.teacherId] : [currentClass.teacher_id]);
        const assigned = teachers.filter((t: any) => assignedIds.includes(t.id));
        if (assigned.length > 0) return assigned.map((t: any) => t.name).join(', ');
        return 'Chưa phân công';
    }, [teachers, currentClass]);

    // Danh sách tài khoản sinh viên đăng ký trong hệ thống (role = STUDENT)
    const registeredStudents = useMemo(() => {
        return appUsers.filter((u: any) => u.role === 'STUDENT');
    }, [appUsers]);

    // Các bài reviews thuộc lớp này
    const classReviews = useMemo(() => {
        if (!selectedClassId) return [];
        return reviews.filter(r => r.classId === selectedClassId || r.class_id === selectedClassId);
    }, [reviews, selectedClassId]);

    // Sĩ số lớp hiện tại (tùy chỉnh 20 - 50)
    const [studentsCountInput, setStudentsCountInput] = useState<number>(
        currentClass?.studentsCount || currentClass?.students_count || 30
    );
    const [isSavingCount, setIsSavingCount] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Danh sách sinh viên của lớp
    const [students, setStudents] = useState<ClassStudentItem[]>([]);
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'SUBMITTED' | 'PENDING'>('ALL');
    const [searchKeyword, setSearchKeyword] = useState('');

    // State cho Modal Thêm sinh viên (Nhập tay / CSV)
    const [showAddModal, setShowAddModal] = useState(false);
    const [addMode, setAddMode] = useState<'MANUAL' | 'CSV'>('MANUAL');
    const [manualCode, setManualCode] = useState('');
    const [manualName, setManualName] = useState('');
    const [manualEmail, setManualEmail] = useState('');
    const [csvStudents, setCsvStudents] = useState<Array<{ code: string; name: string; email: string }>>([]);
    const [csvFileName, setCsvFileName] = useState('');

    // State chỉnh sửa sinh viên
    const [editingStudent, setEditingStudent] = useState<ClassStudentItem | null>(null);
    const [editStudentName, setEditStudentName] = useState('');
    const [editStudentCode, setEditStudentCode] = useState('');
    const [editStudentEmail, setEditStudentEmail] = useState('');

    // Load danh sách sinh viên khi đổi lớp
    useEffect(() => {
        if (!currentClass) return;
        const count = currentClass.studentsCount || currentClass.students_count || 30;
        setStudentsCountInput(count);

        const list = getClassStudents(
            currentClass.id, 
            count, 
            registeredStudents, 
            classReviews
        );
        setStudents(list);
    }, [currentClass, registeredStudents, classReviews]);

    // Lắng nghe cập nhật sinh viên
    useEffect(() => {
        const handleUpdate = () => {
            if (!currentClass) return;
            const count = currentClass.studentsCount || currentClass.students_count || 30;
            const list = getClassStudents(currentClass.id, count, registeredStudents, classReviews);
            setStudents(list);
        };
        window.addEventListener('class_students_updated', handleUpdate);
        return () => window.removeEventListener('class_students_updated', handleUpdate);
    }, [currentClass, registeredStudents, classReviews]);

    // Định dạng thời gian nộp bài
    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return '';
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

    // Cập nhật sĩ số lớp (ràng buộc 20 - 50)
    const handleUpdateStudentsCount = async () => {
        if (studentsCountInput < 20 || studentsCountInput > 50) {
            setMessage({ type: 'error', text: 'Sĩ số học viên phải từ 20 đến 50 sinh viên/lớp!' });
            return;
        }

        setIsSavingCount(true);
        setMessage(null);

        try {
            // Cập nhật Database Supabase
            const { error: dbError } = await supabase
                .from('classes')
                .update({ students_count: studentsCountInput })
                .eq('id', selectedClassId);

            if (dbError) throw dbError;

            // Cập nhật danh sách sinh viên theo sĩ số mới
            const updatedList = getClassStudents(
                selectedClassId, 
                studentsCountInput, 
                registeredStudents, 
                classReviews
            );
            setStudents(updatedList);
            saveClassStudents(selectedClassId, updatedList);

            addAuditLog({
                actor: 'Ban Quản Trị ITC (admin@dlu.edu.vn)',
                role: 'ADMIN',
                action: 'UPDATE_STUDENTS_COUNT',
                actionLabel: 'Cập nhật sĩ số lớp',
                target: `Lớp ${currentClass?.code || selectedClassId}`,
                details: `Điều chỉnh sĩ số lớp học thành ${studentsCountInput} học viên.`
            });

            if (onRefreshClassData) onRefreshClassData();
            setMessage({ type: 'success', text: `Đã cập nhật sĩ số lớp thành công: ${studentsCountInput} học viên.` });
        } catch (e: any) {
            console.error('Lỗi cập nhật sĩ số:', e);
            setMessage({ type: 'error', text: e.message || 'Lỗi khi cập nhật cơ sở dữ liệu!' });
        } finally {
            setIsSavingCount(false);
        }
    };

    // Thêm sinh viên thủ công (Nhập tay)
    const handleManualAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCode.trim() || !manualName.trim()) {
            setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ MSSV và Họ tên sinh viên!' });
            return;
        }

        if (students.length >= 50) {
            setMessage({ type: 'error', text: 'Lớp học đã đạt sĩ số tối đa 50 sinh viên/lớp!' });
            return;
        }

        if (students.some(s => s.code.toLowerCase() === manualCode.trim().toLowerCase())) {
            setMessage({ type: 'error', text: `Mã sinh viên ${manualCode} đã có trong danh sách lớp!` });
            return;
        }

        const newStudent: ClassStudentItem = {
            id: `student_${Date.now()}`,
            code: manualCode.trim(),
            name: manualName.trim(),
            email: manualEmail.trim() || `${manualCode.trim()}@sinhvien.dlu.edu.vn`,
            hasSubmitted: false
        };

        const updated = [...students, newStudent];
        setStudents(updated);
        saveClassStudents(selectedClassId, updated);
        setStudentsCountInput(updated.length);

        try {
            await supabase.from('classes').update({ students_count: updated.length }).eq('id', selectedClassId);
            if (onRefreshClassData) onRefreshClassData();
        } catch (e) {
            console.error('Lỗi cập nhật DB:', e);
        }

        addAuditLog({
            actor: 'Ban Quản Trị ITC (admin@dlu.edu.vn)',
            role: 'ADMIN',
            action: 'ADD_STUDENT_MANUAL',
            actionLabel: 'Thêm sinh viên vào lớp',
            target: `Lớp ${currentClass?.code || selectedClassId}`,
            details: `Thêm học viên ${newStudent.name} (MSSV: ${newStudent.code}).`
        });

        setMessage({ type: 'success', text: `Đã thêm thành công sinh viên ${newStudent.name} (${newStudent.code}) vào lớp.` });
        setManualCode('');
        setManualName('');
        setManualEmail('');
        setShowAddModal(false);
    };

    // Đọc file Excel (.xlsx, .xls) hoặc CSV sinh viên
    const handleStudentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCsvFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
                if (!rows || rows.length < 2) {
                    setMessage({ type: 'error', text: 'File không có dữ liệu sinh viên hợp lệ!' });
                    return;
                }

                // Tìm cột theo tiêu đề
                const header = (rows[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
                let codeIdx = header.findIndex((h: string) => h.includes('mã') || h.includes('mssv') || h.includes('code'));
                let nameIdx = header.findIndex((h: string) => h.includes('tên') || h.includes('name') || h.includes('họ'));
                let emailIdx = header.findIndex((h: string) => h.includes('email') || h.includes('mail'));

                // Nếu không có header rõ ràng, mặc định STT=0, MSSV=1, Tên=2, Email=3 hoặc MSSV=0, Tên=1
                if (codeIdx === -1) codeIdx = header.length > 3 ? 1 : 0;
                if (nameIdx === -1) nameIdx = header.length > 3 ? 2 : 1;
                if (emailIdx === -1) emailIdx = header.length > 3 ? 3 : 2;

                const parsed: Array<{ code: string; name: string; email: string }> = [];
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.length === 0) continue;
                    const code = String(row[codeIdx] || '').trim();
                    const name = String(row[nameIdx] || '').trim();
                    if (!code || !name) continue;
                    const email = String(row[emailIdx] || '').trim() || `${code}@sinhvien.dlu.edu.vn`;
                    parsed.push({ code, name, email });
                }

                if (parsed.length === 0) {
                    setMessage({ type: 'error', text: 'Không tìm thấy dòng dữ liệu sinh viên nào trong file!' });
                    return;
                }

                setCsvStudents(parsed);
                setMessage({ type: 'success', text: `Đã đọc thành công ${parsed.length} sinh viên từ file ${file.name}.` });
            } catch (err: any) {
                console.error('Lỗi đọc file Excel/CSV:', err);
                setMessage({ type: 'error', text: 'Lỗi khi đọc file: ' + (err.message || 'Định dạng file không hợp lệ') });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Áp dụng nhập danh sách sinh viên từ file Excel / CSV
    const handleApplyCsvStudents = async () => {
        if (csvStudents.length === 0) return;

        // Đảm bảo sĩ số từ 20 đến 50
        let targetList = csvStudents.slice(0, 50).map(s => ({
            id: `student_${Date.now()}_${s.code}`,
            code: s.code,
            name: s.name,
            email: s.email,
            hasSubmitted: false
        }));

        if (targetList.length < 20) {
            setMessage({ type: 'error', text: `Danh sách chỉ có ${targetList.length} sinh viên. Lớp học yêu cầu tối thiểu 20 sinh viên!` });
            return;
        }

        setStudents(targetList);
        saveClassStudents(selectedClassId, targetList);
        setStudentsCountInput(targetList.length);

        try {
            await supabase.from('classes').update({ students_count: targetList.length }).eq('id', selectedClassId);
            if (onRefreshClassData) onRefreshClassData();
        } catch (e) {
            console.error('Lỗi sync sĩ số file:', e);
        }

        addAuditLog({
            actor: 'Ban Quản Trị ITC (admin@dlu.edu.vn)',
            role: 'ADMIN',
            action: 'IMPORT_STUDENTS_FILE',
            actionLabel: 'Nạp danh sách sinh viên',
            target: `Lớp ${currentClass?.code || selectedClassId}`,
            details: `Nhập danh sách ${targetList.length} học viên từ file ${csvFileName || 'Excel'}.`
        });

        setMessage({ type: 'success', text: `Đã nhập thành công ${targetList.length} sinh viên từ file vào lớp!` });
        setShowAddModal(false);
        setCsvStudents([]);
        setCsvFileName('');
    };

    // Chuyển đổi thủ công trạng thái Đã / Chưa nộp
    const handleToggleStudentStatus = (studentCode: string) => {
        const updated = students.map(s => {
            if (s.code === studentCode) {
                const nextSubmitted = !s.hasSubmitted;
                return {
                    ...s,
                    hasSubmitted: nextSubmitted,
                    submittedAt: nextSubmitted ? new Date().toISOString() : undefined,
                    score: nextSubmitted ? (s.score || 5.0) : undefined
                };
            }
            return s;
        });
        setStudents(updated);
        saveClassStudents(selectedClassId, updated);
    };

    // Bắt đầu chỉnh sửa sinh viên
    const handleStartEditStudent = (s: ClassStudentItem) => {
        setEditingStudent(s);
        setEditStudentName(s.name);
        setEditStudentCode(s.code);
        setEditStudentEmail(s.email || `${s.code}@sinhvien.dlu.edu.vn`);
    };

    // Lưu chỉnh sửa sinh viên
    const handleSaveEditStudent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;
        if (!editStudentName.trim() || !editStudentCode.trim()) {
            alert('Vui lòng điền đầy đủ Mã số sinh viên và Họ tên!');
            return;
        }

        const updated = students.map(s => {
            if (s.code === editingStudent.code) {
                return {
                    ...s,
                    name: editStudentName.trim(),
                    code: editStudentCode.trim(),
                    email: editStudentEmail.trim()
                };
            }
            return s;
        });

        setStudents(updated);
        saveClassStudents(selectedClassId, updated);
        setMessage({ type: 'success', text: `Đã cập nhật sinh viên ${editStudentName} (${editStudentCode})!` });
        setEditingStudent(null);
    };

    // Xóa sinh viên khỏi lớp
    const handleDeleteStudent = (s: ClassStudentItem) => {
        if (!confirm(`Bạn có chắc chắn muốn XÓA sinh viên ${s.name} (${s.code}) khỏi lớp này?`)) return;

        const updated = students.filter(item => item.code !== s.code);
        setStudents(updated);
        saveClassStudents(selectedClassId, updated);
        setMessage({ type: 'success', text: `Đã xóa sinh viên ${s.name} khỏi lớp.` });
    };

    // Thống kê tiến độ
    const stats = useMemo(() => {
        const total = students.length;
        const submitted = students.filter(s => s.hasSubmitted).length;
        const pending = total - submitted;
        const percent = total > 0 ? Math.round((submitted / total) * 100) : 0;
        return { total, submitted, pending, percent };
    }, [students]);

    // Danh sách hiển thị sau khi lọc và tìm kiếm
    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            if (filterStatus === 'SUBMITTED' && !s.hasSubmitted) return false;
            if (filterStatus === 'PENDING' && s.hasSubmitted) return false;

            if (searchKeyword.trim()) {
                const kw = searchKeyword.toLowerCase().trim();
                const matchName = s.name.toLowerCase().includes(kw);
                const matchCode = s.code.toLowerCase().includes(kw);
                const matchEmail = (s.email || '').toLowerCase().includes(kw);
                if (!matchName && !matchCode && !matchEmail) return false;
            }

            return true;
        });
    }, [students, filterStatus, searchKeyword]);

    // Xuất danh sách sinh viên và tiến độ ra file Excel (.XLSX)
    const handleExportStudentList = () => {
        try {
            const wsData: any[][] = [
                [`TRƯỜNG ĐẠI HỌC ĐÀ LẠT - TRUNG TÂM CÔNG NGHỆ THÔNG TIN (ITC)`],
                [`DANH SÁCH SINH VIÊN & TIẾN ĐỘ THỰC HIỆN KHẢO SÁT LỚP ${currentClass?.code || ''}`],
                [`Môn học: ${currentCourse?.name || ''} | GV: ${teacherNames} | Phòng máy: ${currentClass?.room || ''}`],
                [`Học kỳ & Niên khóa: ${currentClass?.academicYear || '2025-2026 - HK1'} | Tiến độ: ${stats.submitted}/${stats.total} SV`],
                [],
                ['STT', 'Mã Sinh Viên (MSSV)', 'Họ Và Tên Sinh Viên', 'Email Liên Hệ', 'Trạng Thái Khảo Sát', 'Thời Gian Nộp Bài', 'Điểm Đánh Giá TB']
            ];

            students.forEach((s, idx) => {
                const statusStr = s.hasSubmitted ? "ĐÃ ĐÁNH GIÁ" : "CHƯA ĐÁNH GIÁ";
                const timeStr = s.hasSubmitted ? formatDateTime(s.submittedAt) : "-";
                const scoreStr = s.hasSubmitted && s.score ? `${s.score} / 5.0` : "-";
                wsData.push([idx + 1, s.code, s.name, s.email || '', statusStr, timeStr, scoreStr]);
            });

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 28 }, { wch: 32 }, { wch: 22 }, { wch: 22 }, { wch: 18 }];
            XLSX.utils.book_append_sheet(wb, ws, `Lop_${currentClass?.code || 'ITC'}`);
            XLSX.writeFile(wb, `Danh_Sach_SV_Khao_Sat_${currentClass?.code || 'Lop'}.xlsx`);
        } catch (e) {
            console.error('Lỗi xuất file Excel, dùng fallback CSV:', e);
            const BOM = "\uFEFF";
            let csv = BOM;
            csv += `TRƯỜNG ĐẠI HỌC ĐÀ LẠT - TRUNG TÂM CÔNG NGHỆ THÔNG TIN (ITC)\n`;
            csv += `DANH SÁCH SINH VIÊN & TIẾN ĐỘ KHẢO SÁT LỚP ${currentClass?.code || ''}\n\n`;
            csv += "STT,Mã Sinh Viên (MSSV),Họ Và Tên Sinh Viên,Email,Trạng Thái Khảo Sát,Thời Gian Nộp Bài,Điểm Đánh Giá TB\n";
            students.forEach((s, idx) => {
                const statusStr = s.hasSubmitted ? "ĐÃ ĐÁNH GIÁ" : "CHƯA ĐÁNH GIÁ";
                const timeStr = s.hasSubmitted ? formatDateTime(s.submittedAt) : "-";
                const scoreStr = s.hasSubmitted && s.score ? `${s.score} / 5.0` : "-";
                csv += `${idx + 1},"${s.code}","${s.name}","${s.email || ''}","${statusStr}","${timeStr}","${scoreStr}"\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Danh_Sach_SV_Khao_Sat_${currentClass?.code || 'Lop'}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 text-xs text-slate-700 animate-in zoom-in-95 duration-200">
                
                {/* Header (Cố định ở trên) */}
                <div className="bg-gradient-to-r from-itc-900 to-itc-800 text-white px-6 py-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 shadow-inner">
                            <Icons.User className="w-5 h-5 text-itc-200" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                                    THEO DÕI ĐÁNH GIÁ
                                </span>
                                <span className="text-[11px] text-itc-200">1 năm có 2 học kỳ (HK1 / HK2)</span>
                            </div>
                            <h2 className="text-base sm:text-lg font-black mt-0.5 leading-tight">
                                Quản lý Sinh viên & Tiến độ Khảo sát theo Lớp
                            </h2>
                        </div>
                    </div>

                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                        title="Đóng"
                    >
                        <Icons.X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Thanh chọn lớp & Thông tin lớp */}
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 shrink-0 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                            <label className="text-xs font-bold text-slate-700 shrink-0">Chọn Lớp học:</label>
                            <select
                                value={selectedClassId}
                                onChange={e => setSelectedClassId(e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-itc-900 focus:border-itc-500 outline-none w-full max-w-xs shadow-2xs"
                            >
                                {allClasses.map(c => (
                                    <option key={c.id} value={c.id}>
                                        Lớp {c.code} ({c.academicYear || '2025-2026 - HK1'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Các nút hành động quản lý sinh viên */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Nút thêm sinh viên */}
                            <button
                                type="button"
                                onClick={() => setShowAddModal(true)}
                                className="px-3.5 py-1.5 bg-itc-800 hover:bg-itc-900 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                            >
                                <Icons.Plus className="w-3.5 h-3.5" />
                                <span>+ Thêm SV (Nhập tay / File Excel, CSV)</span>
                            </button>

                            {/* Tùy chỉnh Sĩ số lớp (20 - 50 SV) */}
                            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                <span className="text-[11px] font-bold text-slate-600 shrink-0">Sĩ số (20-50):</span>
                                <input 
                                    type="number" 
                                    min="20"
                                    max="50"
                                    value={studentsCountInput}
                                    onChange={e => setStudentsCountInput(parseInt(e.target.value) || 0)}
                                    className="w-12 text-center font-black text-itc-900 border border-slate-200 rounded-lg py-0.5 text-xs outline-none focus:border-itc-500"
                                />
                                <button
                                    type="button"
                                    onClick={handleUpdateStudentsCount}
                                    disabled={isSavingCount}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold rounded-lg transition disabled:opacity-50"
                                >
                                    {isSavingCount ? 'Lưu...' : 'Lưu'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                            message.type === 'success' 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                            {message.type === 'success' ? <Icons.CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <Icons.AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                            <span>{message.text}</span>
                        </div>
                    )}

                    {/* Banner thông tin chi tiết của lớp */}
                    {currentClass && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-slate-200 text-slate-600">
                            <div>
                                <span className="text-slate-400 block text-[10px]">Môn học:</span>
                                <b className="text-slate-900">{currentCourse?.name || 'Môn học'}</b>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[10px]">Giảng viên:</span>
                                <b className="text-slate-900">{teacherNames}</b>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[10px]">Phòng máy & Lịch học:</span>
                                <b className="text-slate-900">{currentClass.room} ({currentClass.schedule})</b>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[10px]">Học kỳ & Niên khóa:</span>
                                <b className="text-itc-800 font-extrabold">{currentClass.academicYear || '2025-2026 - HK1'}</b>
                            </div>
                        </div>
                    )}
                </div>

                {/* Body (Cuộn mượt mà bên trong) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                    
                    {/* Thẻ Thống kê Tiến độ Khảo sát */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                            <span className="text-slate-500 block text-[11px] font-medium">Tổng sĩ số lớp</span>
                            <div className="flex items-baseline gap-1 mt-1">
                                <b className="text-xl font-extrabold text-slate-900">{stats.total}</b>
                                <span className="text-slate-400 text-xs">sinh viên</span>
                            </div>
                        </div>

                        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
                            <span className="text-emerald-700 block text-[11px] font-medium">Đã thực hiện đánh giá</span>
                            <div className="flex items-baseline gap-1 mt-1">
                                <b className="text-xl font-extrabold text-emerald-600">{stats.submitted}</b>
                                <span className="text-slate-400 text-xs">sinh viên</span>
                            </div>
                        </div>

                        <div className="bg-white p-3.5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-2xs">
                            <span className="text-rose-700 block text-[11px] font-medium">Chưa thực hiện đánh giá</span>
                            <div className="flex items-baseline gap-1 mt-1">
                                <b className="text-xl font-extrabold text-rose-600">{stats.pending}</b>
                                <span className="text-slate-400 text-xs">sinh viên</span>
                            </div>
                        </div>

                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-center">
                            <div className="flex justify-between items-center text-[11px] font-bold mb-1.5">
                                <span className="text-slate-600">Tiến độ hoàn thành:</span>
                                <span className="text-itc-800 font-bold">{stats.submitted} / {stats.total} SV</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div 
                                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                                    style={{ width: `${stats.percent}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Bộ lọc trạng thái & Tìm kiếm sinh viên */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setFilterStatus('ALL')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                    filterStatus === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                Tất cả ({students.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterStatus('SUBMITTED')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                    filterStatus === 'SUBMITTED' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:bg-emerald-50'
                                }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                Đã đánh giá ({stats.submitted})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterStatus('PENDING')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                    filterStatus === 'PENDING' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:bg-rose-50'
                                }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                Chưa đánh giá ({stats.pending})
                            </button>
                        </div>

                        {/* Ô tìm kiếm MSSV hoặc Tên */}
                        <div className="relative w-full sm:w-64">
                            <Icons.Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Tìm theo tên hoặc MSSV..."
                                value={searchKeyword}
                                onChange={e => setSearchKeyword(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8.5 pr-3 py-1.5 text-xs outline-none focus:border-itc-500 font-medium"
                            />
                        </div>
                    </div>

                    {/* Bảng danh sách sinh viên */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                        <div className="max-h-[380px] overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-100/90 sticky top-0 z-10 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                                    <tr>
                                        <th className="p-3 w-12 text-center">STT</th>
                                        <th className="p-3 w-28">Mã SV (MSSV)</th>
                                        <th className="p-3">Họ và tên Sinh viên</th>
                                        <th className="p-3">Email liên hệ</th>
                                        <th className="p-3 text-center w-36">Trạng thái khảo sát</th>
                                        <th className="p-3 w-36 text-center">Thời gian nộp bài</th>
                                        <th className="p-3 text-right w-24">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map((s, idx) => (
                                            <tr key={s.id || s.code} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                                                <td className="p-3 font-extrabold text-itc-900">{s.code}</td>
                                                <td className="p-3 font-semibold text-slate-800">{s.name}</td>
                                                <td className="p-3 text-slate-500 text-[11px]">{s.email || '-'}</td>
                                                <td className="p-3 text-center">
                                                    {s.hasSubmitted ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                            <Icons.CheckCircle className="w-3 h-3 text-emerald-600" />
                                                            ĐÃ ĐÁNH GIÁ
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                                                            <Icons.AlertTriangle className="w-3 h-3 text-rose-500" />
                                                            CHƯA ĐÁNH GIÁ
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center text-[11px] text-slate-500">
                                                    {s.hasSubmitted ? (
                                                        <div className="flex items-center justify-center gap-1 font-medium text-slate-700">
                                                            <Icons.Clock className="w-3 h-3 text-slate-400" />
                                                            <span>{formatDateTime(s.submittedAt)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 italic">-</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleStudentStatus(s.code)}
                                                            className={`text-[10px] font-bold px-1.5 py-1 rounded-lg transition ${
                                                                s.hasSubmitted 
                                                                    ? 'text-amber-700 hover:bg-amber-50' 
                                                                    : 'text-emerald-700 hover:bg-emerald-50'
                                                            }`}
                                                            title="Đổi trạng thái kiểm thử"
                                                        >
                                                            {s.hasSubmitted ? 'Hủy nộp' : 'Đã nộp'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartEditStudent(s)}
                                                            className="text-slate-600 hover:text-itc-800 p-1 hover:bg-slate-100 rounded-lg transition"
                                                            title="Sửa thông tin sinh viên"
                                                        >
                                                            <Icons.Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteStudent(s)}
                                                            className="text-rose-600 hover:text-rose-800 p-1 hover:bg-rose-50 rounded-lg transition"
                                                            title="Xóa sinh viên khỏi lớp"
                                                        >
                                                            <Icons.Trash className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                                                Không tìm thấy sinh viên nào khớp với bộ lọc.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer (Cố định ở dưới) */}
                <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex flex-wrap justify-between items-center gap-3 shrink-0">
                    <span className="text-slate-500 text-[11px]">
                        Lớp học: <b>{currentClass?.code}</b> | Sĩ số: <b>{stats.total}</b> SV | Đã nộp: <b>{stats.submitted}</b> SV
                    </span>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                        >
                            Đóng
                        </button>

                        <button
                            type="button"
                            onClick={handleExportStudentList}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-emerald-700/15"
                            title="Tải danh sách sinh viên lớp và tiến độ khảo sát ra file Excel (.XLSX)"
                        >
                            <Icons.FileSpreadsheet className="w-4 h-4" />
                            Xuất Danh Sách SV (.XLSX)
                        </button>
                    </div>
                </div>

            </div>

            {/* SUB-MODAL: THÊM SINH VIÊN (NHẬP TAY HOẶC IMPORT FILE EXCEL / CSV) */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-60 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95">
                        <div className="bg-gradient-to-r from-itc-900 to-itc-800 p-4 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <Icons.User className="w-5 h-5 text-itc-200" />
                                <h3 className="font-bold text-sm">Thêm Sinh viên vào lớp {currentClass?.code}</h3>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs">
                                <Icons.X className="w-4 h-4 text-white" />
                            </button>
                        </div>

                        {/* Tabs Mode */}
                        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2.5 gap-2">
                            <button
                                type="button"
                                onClick={() => setAddMode('MANUAL')}
                                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                                    addMode === 'MANUAL' ? 'border-itc-800 text-itc-900' : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Icons.Edit className="w-3.5 h-3.5" /> Nhập thủ công
                            </button>
                            <button
                                type="button"
                                onClick={() => setAddMode('CSV')}
                                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                                    addMode === 'CSV' ? 'border-itc-800 text-itc-900' : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Icons.Upload className="w-3.5 h-3.5" /> Tải tệp Excel / CSV
                            </button>
                        </div>

                        <div className="p-5">
                            {addMode === 'MANUAL' ? (
                                <form onSubmit={handleManualAddStudent} className="space-y-3">
                                    <div className="grid grid-cols-3 gap-2.5">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Mã SV (MSSV) *</label>
                                            <input
                                                required
                                                value={manualCode}
                                                onChange={e => setManualCode(e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-itc-500 outline-none"
                                                placeholder="VD: 2110452"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Họ và Tên Sinh viên *</label>
                                            <input
                                                required
                                                value={manualName}
                                                onChange={e => setManualName(e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-itc-500 outline-none"
                                                placeholder="VD: Nguyễn Hoàng Minh Châu"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Email sinh viên (Tùy chọn)</label>
                                        <input
                                            type="email"
                                            value={manualEmail}
                                            onChange={e => setManualEmail(e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-itc-500 outline-none"
                                            placeholder="VD: 2110452@sinhvien.dlu.edu.vn"
                                        />
                                    </div>
                                    <div className="pt-2 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddModal(false)}
                                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 bg-itc-800 hover:bg-itc-900 text-white font-bold py-2 rounded-xl text-xs shadow-md"
                                        >
                                            + Thêm vào lớp
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-3.5">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800">Tải file mẫu 50 Sinh viên</h4>
                                            <p className="text-[10px] text-slate-500">Gồm 50 sinh viên họ tên thật & MSSV chuẩn DLU</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <a
                                                href="/du_lieu_mau_50_sinh_vien.xlsx"
                                                download="du_lieu_mau_50_sinh_vien.xlsx"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition shadow-2xs"
                                                title="Tải mẫu Excel 50 sinh viên"
                                            >
                                                <Icons.FileSpreadsheet className="w-3.5 h-3.5" />
                                                Mẫu Excel (.XLSX)
                                            </a>
                                            <a
                                                href="/du_lieu_mau_50_sinh_vien.csv"
                                                download="du_lieu_mau_50_sinh_vien.csv"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition"
                                                title="Tải mẫu CSV"
                                            >
                                                <Icons.Download className="w-3.5 h-3.5" />
                                                Mẫu CSV
                                            </a>
                                        </div>
                                    </div>

                                    <div className="border-2 border-dashed border-slate-200 hover:border-itc-500 rounded-2xl p-4 text-center transition cursor-pointer bg-slate-50/50 relative">
                                        <input 
                                            type="file" 
                                            accept=".xlsx, .xls, .csv"
                                            onChange={handleStudentFileUpload}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <Icons.FileSpreadsheet className="w-7 h-7 text-itc-800 mx-auto mb-1 opacity-80" />
                                        <p className="text-xs font-bold text-slate-700">
                                            {csvFileName ? `Đã chọn: ${csvFileName}` : 'Nhấn để chọn file Excel (.xlsx) hoặc CSV'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Tự động nhận diện cột MSSV, Họ tên, Email (Tối thiểu 20, tối đa 50 SV)</p>
                                    </div>

                                    {csvStudents.length > 0 && (
                                        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-36 overflow-y-auto divide-y divide-slate-100 text-[11px]">
                                            <div className="bg-slate-100 px-3 py-1 font-bold text-slate-700 text-[10px]">
                                                Đã tìm thấy {csvStudents.length} sinh viên:
                                            </div>
                                            {csvStudents.slice(0, 10).map((s, idx) => (
                                                <div key={idx} className="p-1.5 flex justify-between px-3">
                                                    <span><b>{s.code}</b> - {s.name}</span>
                                                    <span className="text-slate-400 text-[10px]">{s.email}</span>
                                                </div>
                                            ))}
                                            {csvStudents.length > 10 && (
                                                <div className="p-1.5 text-center text-slate-400 text-[10px] italic">
                                                    ... và {csvStudents.length - 10} sinh viên khác
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="pt-2 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddModal(false)}
                                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleApplyCsvStudents}
                                            disabled={csvStudents.length === 0}
                                            className="flex-1 bg-itc-800 hover:bg-itc-900 text-white font-bold py-2 rounded-xl text-xs shadow-md disabled:opacity-50"
                                        >
                                            Áp dụng vào lớp ({csvStudents.length} SV)
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL SỬA THÔNG TIN SINH VIÊN */}
            {editingStudent && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-60 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-slate-200">
                        <div className="bg-gradient-to-r from-itc-900 to-itc-800 p-4 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <Icons.Edit className="w-5 h-5 text-itc-200" />
                                <h4 className="font-bold text-sm">Chỉnh sửa thông tin sinh viên</h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingStudent(null)}
                                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                            >
                                <Icons.X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEditStudent} className="p-5 space-y-3.5 bg-slate-50">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Mã số sinh viên (MSSV) *</label>
                                <input
                                    type="text"
                                    required
                                    value={editStudentCode}
                                    onChange={e => setEditStudentCode(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:border-itc-500 outline-none bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên sinh viên *</label>
                                <input
                                    type="text"
                                    required
                                    value={editStudentName}
                                    onChange={e => setEditStudentName(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-itc-500 outline-none bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Email liên hệ</label>
                                <input
                                    type="email"
                                    value={editStudentEmail}
                                    onChange={e => setEditStudentEmail(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-itc-500 outline-none bg-white"
                                />
                            </div>

                            <div className="pt-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingStudent(null)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-itc-800 hover:bg-itc-900 text-white font-bold py-2 rounded-xl text-xs shadow-md"
                                >
                                    Lưu thay đổi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
