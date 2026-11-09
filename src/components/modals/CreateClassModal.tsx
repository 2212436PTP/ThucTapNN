"use client";

import React, { useState, useMemo } from 'react';
import { Icons } from '../ui/Icons';
import { Course, Teacher } from '../../types';

export const STANDARD_ROOMS = [
    'Phòng Lab 1',
    'Phòng Lab 2',
    'Phòng Lab 3',
    'Phòng Lab 4',
    'Phòng Lab 5',
    'Phòng Lab A24',
    'Phòng Lab C12'
];

export const STANDARD_SCHEDULES = [
    'Tối 2 - 4 - 6 (18:00 - 20:30)',
    'Tối 3 - 5 - 7 (18:00 - 20:30)',
    'Sáng 2 - 4 - 6 (07:30 - 11:00)',
    'Sáng 3 - 5 - 7 (07:30 - 11:00)',
    'Chiều 2 - 4 - 6 (13:30 - 17:00)',
    'Chiều 3 - 5 - 7 (13:30 - 17:00)',
    'Cả ngày Thứ Bảy (08:00 - 17:00)',
    'Cả ngày Chủ Nhật (08:00 - 17:00)'
];

function generateRandomCode(): string {
    const year = 2026;
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `ITC_${year}_${randomNum}`;
}

interface CreateClassModalProps {
    courses: Course[];
    teachers: Teacher[];
    classes?: any[];
    editingClass?: any;
    onClose: () => void;
    onSubmit: (classData: any) => void;
}

export const CreateClassModal = ({ courses, teachers, classes = [], editingClass, onClose, onSubmit }: CreateClassModalProps) => {
    const [formData, setFormData] = useState({
        code: editingClass?.code || generateRandomCode(),
        courseId: editingClass?.course_id || editingClass?.courseId || courses[0]?.id || '',
        academicYear: editingClass?.academicYear ? editingClass.academicYear.split(' - ')[0] : '2025-2026',
        semester: editingClass?.academicYear?.includes('HK2') ? 'HK2' : 'HK1',
        room: editingClass?.room || STANDARD_ROOMS[0],
        schedule: editingClass?.schedule || STANDARD_SCHEDULES[0],
        studentsCount: editingClass?.studentsCount || editingClass?.students_count || 30
    });

    const availableRooms = useMemo(() => {
        if (editingClass?.room && !STANDARD_ROOMS.includes(editingClass.room)) {
            return [editingClass.room, ...STANDARD_ROOMS];
        }
        return STANDARD_ROOMS;
    }, [editingClass]);

    const availableSchedules = useMemo(() => {
        if (editingClass?.schedule && !STANDARD_SCHEDULES.includes(editingClass.schedule)) {
            return [editingClass.schedule, ...STANDARD_SCHEDULES];
        }
        return STANDARD_SCHEDULES;
    }, [editingClass]);

    // Kiểm tra trùng lịch và trùng phòng máy
    const conflictingClass = useMemo(() => {
        if (!formData.room || !formData.schedule || !classes || classes.length === 0) return null;

        const curRoomClean = formData.room.toLowerCase().replace(/phòng\s*(lab\s*)?/i, '').trim();

        return classes.find(c => {
            if (editingClass && c.id === editingClass.id) return false;
            if (c.status === 'CLOSED') return false;

            const otherRoomClean = (c.room || '').toLowerCase().replace(/phòng\s*(lab\s*)?/i, '').trim();
            if (curRoomClean !== otherRoomClean) return false;

            // Day overlap check
            const curScheduleStr = formData.schedule.toLowerCase();
            const otherScheduleStr = (c.schedule || '').toLowerCase();

            const curDays = (curScheduleStr.match(/[2-7]|cn|bảy/gi) || []).map((x: string) => x.toLowerCase());
            const otherDays = (otherScheduleStr.match(/[2-7]|cn|bảy/gi) || []).map((x: string) => x.toLowerCase());

            const hasDayOverlap = curDays.length > 0 && otherDays.length > 0 && curDays.some((d: string) => otherDays.includes(d));

            // Shift overlap check (Sáng / Chiều / Tối)
            const isCurMorning = curScheduleStr.includes('sáng');
            const isCurAfternoon = curScheduleStr.includes('chiều');
            const isCurEvening = curScheduleStr.includes('tối');

            const isOtherMorning = otherScheduleStr.includes('sáng');
            const isOtherAfternoon = otherScheduleStr.includes('chiều');
            const isOtherEvening = otherScheduleStr.includes('tối');

            if (hasDayOverlap) {
                if ((isCurMorning && (isOtherAfternoon || isOtherEvening)) && !isOtherMorning) return false;
                if ((isCurAfternoon && (isOtherMorning || isOtherEvening)) && !isOtherAfternoon) return false;
                if ((isCurEvening && (isOtherMorning || isOtherAfternoon)) && !isOtherEvening) return false;
                return true;
            }

            return curScheduleStr === otherScheduleStr;
        });
    }, [formData.room, formData.schedule, classes, editingClass]);

    // Multiple teachers assigned (1, 2 or 3 teachers)
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>(
        editingClass?.teacherIds?.length 
            ? editingClass.teacherIds 
            : (editingClass?.teacher_id || editingClass?.teacherId)
                ? [editingClass.teacher_id || editingClass.teacherId]
                : (teachers[0]?.id ? [teachers[0].id] : [])
    );

    // Tìm kiếm giảng viên
    const [teacherSearch, setTeacherSearch] = useState('');
    const [error, setError] = useState('');

    const toggleTeacher = (teacherId: string) => {
        if (selectedTeacherIds.includes(teacherId)) {
            if (selectedTeacherIds.length === 1) {
                setError('Lớp học phải có ít nhất 1 giảng viên phụ trách!');
                return;
            }
            setSelectedTeacherIds(prev => prev.filter(id => id !== teacherId));
            setError('');
        } else {
            if (selectedTeacherIds.length >= 3) {
                setError('Mỗi lớp chỉ phân công tối đa 3 giảng viên!');
                return;
            }
            setSelectedTeacherIds(prev => [...prev, teacherId]);
            setError('');
        }
    };

    // Lọc danh sách giảng viên theo ô search
    const filteredTeachers = useMemo(() => {
        if (!teacherSearch.trim()) return teachers;
        const kw = teacherSearch.toLowerCase().trim();
        return teachers.filter(t => 
            t.name.toLowerCase().includes(kw) ||
            (t.email && t.email.toLowerCase().includes(kw)) ||
            (t.code && t.code.toLowerCase().includes(kw))
        );
    }, [teachers, teacherSearch]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code.trim() || !formData.room.trim() || !formData.schedule.trim()) {
            setError('Vui lòng điền đầy đủ Mã lớp, Phòng và Lịch học.');
            return;
        }

        // Cảnh báo chặn nếu trùng phòng và lịch học
        if (conflictingClass) {
            setError(`Trùng phòng và lịch học: Lớp ${conflictingClass.code} đang sử dụng ${formData.room} vào lịch ${conflictingClass.schedule}. Vui lòng chọn phòng khác hoặc lịch học khác!`);
            return;
        }

        // Kiểm tra sĩ số từ 20 đến 50
        if (formData.studentsCount < 20 || formData.studentsCount > 50) {
            setError('Sĩ số lớp học bắt buộc phải từ 20 đến 50 học viên!');
            return;
        }

        if (selectedTeacherIds.length === 0) {
            setError('Vui lòng chọn ít nhất 1 giảng viên phụ trách lớp.');
            return;
        }

        // Định dạng niên khóa: "2025-2026 - HK1" hoặc "2025-2026 - HK2"
        const finalAcademicYear = `${formData.academicYear.trim()} - ${formData.semester}`;

        const classData = {
            id: editingClass ? editingClass.id : ('cls_' + Date.now()),
            code: formData.code.trim(),
            courseId: formData.courseId,
            teacherId: selectedTeacherIds[0], // primary teacher for backward compat
            teacherIds: selectedTeacherIds,
            academicYear: finalAcademicYear,
            room: formData.room.trim(),
            schedule: formData.schedule.trim(),
            studentsCount: formData.studentsCount,
            status: editingClass?.status || 'OPEN_SURVEY'
        };

        onSubmit(classData);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                <div className="bg-gradient-to-r from-itc-900 to-itc-800 p-5 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-black text-lg">
                            {editingClass ? 'Chỉnh sửa Thông tin Lớp học' : 'Mở Lớp Đào tạo Mới'}
                        </h3>
                        <p className="text-xs text-itc-100 mt-0.5">
                            {editingClass ? `Cập nhật thông tin và phân công giảng viên cho lớp ${editingClass.code}` : 'Khởi tạo đợt đào tạo và phân công giảng viên'}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <Icons.X className="w-5 h-5 text-white" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-slate-50">
                    {error && (
                        <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs border border-rose-200 font-medium flex items-center gap-2">
                            <Icons.AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                        </div>
                    )}

                    {/* Mã lớp & Niên khóa (1 năm 2 học kỳ) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-700">Mã Lớp DLU *</label>
                                {!editingClass && (
                                    <span className="text-[10px] text-slate-400">Tự sinh ngẫu nhiên</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <input 
                                    type="text" 
                                    placeholder="VD: ITC_2026_01"
                                    value={formData.code}
                                    onChange={e => setFormData({...formData, code: e.target.value})}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-itc-500 outline-none bg-white font-bold text-itc-900"
                                />
                                {!editingClass && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, code: generateRandomCode() }))}
                                        className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 border border-slate-200"
                                        title="Tạo ngẫu nhiên mã lớp mới"
                                    >
                                        <Icons.RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                                        <span>Ngẫu nhiên</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Năm học & Học kỳ *</label>
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={formData.academicYear}
                                    onChange={e => setFormData({...formData, academicYear: e.target.value})}
                                    className="border border-slate-200 rounded-xl px-2 py-2 text-xs focus:border-itc-500 outline-none bg-white font-medium text-slate-800"
                                >
                                    <option value="2024-2025">2024-2025</option>
                                    <option value="2025-2026">2025-2026</option>
                                    <option value="2026-2027">2026-2027</option>
                                    <option value="2027-2028">2027-2028</option>
                                </select>

                                <select
                                    value={formData.semester}
                                    onChange={e => setFormData({...formData, semester: e.target.value})}
                                    className="border border-slate-200 rounded-xl px-2 py-2 text-xs focus:border-itc-500 outline-none bg-white font-bold text-itc-800"
                                >
                                    <option value="HK1">Học kỳ 1</option>
                                    <option value="HK2">Học kỳ 2</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Khóa Học / Chứng Chỉ *</label>
                            <select 
                                value={formData.courseId}
                                onChange={e => setFormData({...formData, courseId: e.target.value})}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-itc-500 outline-none bg-white font-medium text-slate-800"
                            >
                                {courses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-700">Sĩ số *</label>
                                <span className="text-[10px] text-slate-400">(20 - 50 HV)</span>
                            </div>
                            <input 
                                type="number" 
                                min="20"
                                max="50"
                                value={formData.studentsCount}
                                onChange={e => setFormData({...formData, studentsCount: parseInt(e.target.value) || 0})}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-itc-500 outline-none bg-white text-center font-bold text-itc-900"
                            />
                        </div>
                    </div>

                    {/* Phân công Giảng viên kèm Ô SEARCH tìm kiếm */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700">
                                Phân công Giảng viên * <span className="text-[11px] text-slate-400 font-normal">(Chọn từ 1 đến 3 GV)</span>
                            </label>
                            <span className="text-[11px] font-bold text-itc-800 bg-itc-50 px-2 py-0.5 rounded border border-itc-200">
                                Đã chọn: {selectedTeacherIds.length}/3 GV
                            </span>
                        </div>

                        {/* Ô TÌM KIẾM GIẢNG VIÊN */}
                        <div className="relative">
                            <Icons.Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Tìm nhanh giảng viên theo tên, email, mã GV..."
                                value={teacherSearch}
                                onChange={e => setTeacherSearch(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl pl-8.5 pr-8 py-1.5 text-xs focus:border-itc-500 focus:ring-1 focus:ring-itc-500 outline-none transition placeholder:text-slate-400 font-medium"
                            />
                            {teacherSearch && (
                                <button
                                    type="button"
                                    onClick={() => setTeacherSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                    title="Xóa tìm kiếm"
                                >
                                    <Icons.X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200">
                            {filteredTeachers.length > 0 ? (
                                filteredTeachers.map(t => {
                                    const isSelected = selectedTeacherIds.includes(t.id);
                                    return (
                                        <button
                                            type="button"
                                            key={t.id}
                                            onClick={() => toggleTeacher(t.id)}
                                            className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                                                isSelected 
                                                    ? 'bg-itc-50 border-itc-600 text-itc-900 font-bold shadow-2xs' 
                                                    : 'bg-slate-50/50 border-slate-100 hover:bg-slate-100 text-slate-700 font-normal'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                                isSelected ? 'bg-itc-800 border-itc-800 text-white' : 'border-slate-300'
                                            }`}>
                                                {isSelected && <Icons.CheckCircle className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <div className="truncate text-xs">
                                                <p className="truncate font-semibold">{t.name}</p>
                                                <p className="text-[10px] text-slate-400 truncate">{t.email || t.code}</p>
                                            </div>
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="col-span-2 text-center py-4 text-xs text-slate-400 italic">
                                    Không tìm thấy giảng viên khớp với từ khóa "{teacherSearch}"
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Phòng Máy / Lab & Lịch Học Dropdowns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Phòng Máy / Lab *</label>
                            <select 
                                value={formData.room}
                                onChange={e => {
                                    setFormData({...formData, room: e.target.value});
                                    setError('');
                                }}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-itc-500 outline-none bg-white font-medium text-slate-800"
                            >
                                {availableRooms.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Lịch Học *</label>
                            <select 
                                value={formData.schedule}
                                onChange={e => {
                                    setFormData({...formData, schedule: e.target.value});
                                    setError('');
                                }}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-itc-500 outline-none bg-white font-medium text-slate-800"
                            >
                                {availableSchedules.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Cảnh báo trùng phòng & lịch học nếu có */}
                    {conflictingClass && (
                        <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl text-xs text-amber-900 flex items-start gap-2 animate-in fade-in">
                            <Icons.AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold">Cảnh báo trùng lịch phòng máy:</span>
                                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                                    Lớp <b>{conflictingClass.code}</b> đang học tại <b>{formData.room}</b> vào khung giờ <b>{conflictingClass.schedule}</b>. Vui lòng chọn phòng lab khác hoặc đổi lịch học để tránh xung đột thiết bị!
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="pt-3 flex justify-end gap-2.5">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">
                            Hủy bỏ
                        </button>
                        <button type="submit" className="px-5 py-2 text-xs font-black text-white bg-itc-800 rounded-xl hover:bg-itc-900 shadow-md flex items-center gap-1.5 transition">
                            {editingClass ? (
                                <>
                                    <Icons.Check className="w-4 h-4 text-emerald-400" /> Lưu thay đổi
                                </>
                            ) : (
                                <>
                                    <Icons.Plus className="w-4 h-4" /> Tạo Lớp Đào Tạo
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
