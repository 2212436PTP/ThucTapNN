import React, { useState } from 'react';
import { Icons } from '../ui/Icons';

interface ManageCoursesModalProps {
    courses: any[];
    classes: any[];
    onClose: () => void;
    onRefresh: () => void;
}

export const ManageCoursesModal: React.FC<ManageCoursesModalProps> = ({
    courses,
    classes,
    onClose,
    onRefresh
}) => {
    const [loading, setLoading] = useState(false);
    const [editingCourse, setEditingCourse] = useState<any>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Form inputs
    const [courseName, setCourseName] = useState('');
    const [courseCode, setCourseCode] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const resetForm = () => {
        setCourseName('');
        setCourseCode('');
        setEditingCourse(null);
        setIsAdding(false);
        setErrorMsg('');
        setSuccessMsg('');
    };

    const handleStartAdd = () => {
        resetForm();
        setIsAdding(true);
    };

    const handleStartEdit = (course: any) => {
        setEditingCourse(course);
        setCourseName(course.name);
        setCourseCode(course.code || '');
        setIsAdding(false);
        setErrorMsg('');
        setSuccessMsg('');
    };

    const handleSaveCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (!courseName.trim()) {
            setErrorMsg('Vui lòng nhập tên môn học.');
            return;
        }

        setLoading(true);
        try {
            if (isAdding) {
                const res = await fetch('/api/courses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: courseCode.trim(),
                        name: courseName.trim()
                    })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Không thể thêm môn học.');

                setSuccessMsg('Đã thêm môn học mới thành công!');
                resetForm();
                onRefresh();
            } else if (editingCourse) {
                const res = await fetch('/api/courses', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: editingCourse.id,
                        code: courseCode.trim(),
                        name: courseName.trim()
                    })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Không thể cập nhật môn học.');

                setSuccessMsg('Đã cập nhật môn học thành công!');
                resetForm();
                onRefresh();
            }
        } catch (err: any) {
            console.error('Error saving course:', err);
            setErrorMsg(err.message || 'Không thể lưu môn học. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCourse = async (course: any) => {
        // Check if any class is currently using this course
        const linkedClasses = classes.filter(c => c.courseId === course.id);
        if (linkedClasses.length > 0) {
            alert(`Không thể xóa môn "${course.name}" vì hiện đang có ${linkedClasses.length} lớp học (${linkedClasses.map(c => c.code).join(', ')}) thuộc môn này. Vui lòng chuyển hoặc xóa các lớp trước.`);
            return;
        }

        if (!confirm(`Bạn có chắc chắn muốn xóa môn học "${course.name}"?`)) return;

        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');
        try {
            const res = await fetch(`/api/courses?id=${encodeURIComponent(course.id)}`, {
                method: 'DELETE'
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Không thể xóa môn học.');

            setSuccessMsg(`Đã xóa môn học "${course.name}" thành công!`);
            onRefresh();
        } catch (err: any) {
            console.error('Error deleting course:', err);
            setErrorMsg(err.message || 'Không thể xóa môn học.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
                
                {/* MODAL HEADER */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-itc-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-700/60">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-white/10 rounded-2xl text-amber-400">
                            <Icons.BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-black text-base sm:text-lg">Quản lý Danh mục Môn học</h3>
                            <p className="text-xs text-slate-300 mt-0.5">
                                Chỉnh sửa thông tin, mã môn và thêm môn học mới vào hệ thống
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
                    >
                        <Icons.X className="w-5 h-5" />
                    </button>
                </div>

                {/* MODAL BODY */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                    
                    {/* TOP ACTION BAR */}
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-600">
                            Hiện có {courses.length} môn học trong hệ thống
                        </span>
                        {!isAdding && !editingCourse && (
                            <button 
                                onClick={handleStartAdd}
                                className="px-3.5 py-1.5 bg-itc-800 hover:bg-itc-900 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                            >
                                <Icons.Plus className="w-3.5 h-3.5" /> Thêm Môn học mới
                            </button>
                        )}
                    </div>

                    {/* ALERTS */}
                    {errorMsg && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                            <Icons.AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                            <Icons.CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{successMsg}</span>
                        </div>
                    )}

                    {/* FORM ADD OR EDIT */}
                    {(isAdding || editingCourse) && (
                        <form onSubmit={handleSaveCourse} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3.5 shadow-2xs animate-fadeIn">
                            <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                                <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider">
                                    {isAdding ? 'Thêm Môn học mới' : `Chỉnh sửa: ${editingCourse.name}`}
                                </h4>
                                <button 
                                    type="button"
                                    onClick={resetForm}
                                    className="text-xs font-bold text-slate-400 hover:text-slate-600"
                                >
                                    Hủy
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Tên Môn học: <span className="text-rose-500">*</span></label>
                                    <input 
                                        type="text"
                                        value={courseName}
                                        onChange={(e) => setCourseName(e.target.value)}
                                        placeholder="VD: Lập trình Python, Tin học cơ bản..."
                                        className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-itc-500 font-medium"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Mã Môn học:</label>
                                    <input 
                                        type="text"
                                        value={courseCode}
                                        onChange={(e) => setCourseCode(e.target.value)}
                                        placeholder="VD: PYTHON-DEV, IT-BASIC..."
                                        className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-itc-500 uppercase font-mono"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                                <button 
                                    type="button"
                                    onClick={resetForm}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition"
                                >
                                    Đóng form
                                </button>
                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-1.5 bg-itc-800 hover:bg-itc-900 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                                >
                                    {loading ? 'Đang lưu...' : isAdding ? 'Thêm môn' : 'Cập nhật môn'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* COURSES TABLE / LIST */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                                <tr>
                                    <th className="p-3 w-12 text-center">STT</th>
                                    <th className="p-3">Mã Môn</th>
                                    <th className="p-3">Tên Môn học</th>
                                    <th className="p-3 text-center">Số Lớp học</th>
                                    <th className="p-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {courses.map((c, idx) => {
                                    const linkedCount = classes.filter(cls => cls.courseId === c.id).length;
                                    const isBeingEdited = editingCourse?.id === c.id;

                                    return (
                                        <tr key={c.id} className={`hover:bg-slate-50 transition ${isBeingEdited ? 'bg-amber-50/50' : ''}`}>
                                            <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                                            <td className="p-3 font-mono font-bold text-slate-700">
                                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                                                    {c.code || c.id}
                                                </span>
                                            </td>
                                            <td className="p-3 font-bold text-slate-900">
                                                {c.name}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    linkedCount > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {linkedCount} lớp
                                                </span>
                                            </td>
                                            <td className="p-3 text-right space-x-2">
                                                <button 
                                                    onClick={() => handleStartEdit(c)}
                                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1"
                                                >
                                                    <Icons.Edit className="w-3 h-3 text-slate-600" /> Sửa
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteCourse(c)}
                                                    disabled={linkedCount > 0}
                                                    title={linkedCount > 0 ? 'Không thể xóa môn đang có lớp' : 'Xóa môn học'}
                                                    className={`px-2 py-1 rounded-lg font-bold text-[11px] transition inline-flex items-center ${
                                                        linkedCount > 0 ? 'text-slate-300 cursor-not-allowed' : 'text-rose-600 hover:bg-rose-50'
                                                    }`}
                                                >
                                                    <Icons.Trash className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                </div>

                {/* MODAL FOOTER */}
                <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex justify-end items-center">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition shadow-xs"
                    >
                        Đóng
                    </button>
                </div>

            </div>
        </div>
    );
};
