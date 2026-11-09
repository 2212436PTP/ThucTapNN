"use client";

import React, { useState } from 'react';
import { Icons } from '../ui/Icons';

export const CreateTeacherModal = ({ onClose, onSubmit, onUpdate, editingTeacher }: any) => {
    const [mode, setMode] = useState<'MANUAL' | 'CSV'>('MANUAL');
    
    // Nhập tay state
    const [code, setCode] = useState(editingTeacher?.code || '');
    const [name, setName] = useState(editingTeacher?.name || '');
    const [email, setEmail] = useState(editingTeacher?.email || '');
    const [password, setPassword] = useState('123456');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Nhập file CSV state
    const [csvTeachers, setCsvTeachers] = useState<Array<{ code: string; name: string; email: string; password?: string }>>([]);
    const [csvFileName, setCsvFileName] = useState('');
    const [importProgress, setImportProgress] = useState<{ total: number; success: number; current: string } | null>(null);

    // 1. Xử lý tạo thủ công hoặc cập nhật giảng viên
    const handleSubmitManual = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            if (editingTeacher) {
                if (onUpdate) {
                    await onUpdate(editingTeacher.id, {
                        code: code.trim(),
                        name: name.trim(),
                        email: email.trim()
                    });
                }
                setSuccessMessage(`Đã cập nhật giảng viên: ${name} (${code})`);
                setTimeout(() => {
                    onClose();
                }, 800);
            } else {
                const res = await fetch('/api/auth/create-teacher', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email.trim(), password: password.trim(), code: code.trim(), name: name.trim() })
                });
                const data = await res.json();
                
                if (!res.ok) throw new Error(data.error || 'Lỗi không xác định');
                
                setSuccessMessage(`Đã thêm thành công giảng viên: ${name} (${code})`);
                if (onSubmit) onSubmit(data.user);
                setTimeout(() => {
                    onClose();
                }, 800);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Xử lý đọc file CSV
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCsvFileName(file.name);
        setError('');

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(Boolean);
            if (lines.length < 2) {
                setError('File CSV phải chứa tiêu đề và ít nhất 1 dòng dữ liệu!');
                return;
            }

            const parsed: Array<{ code: string; name: string; email: string; password?: string }> = [];
            // Bỏ qua dòng tiêu đề
            for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
                if (parts.length >= 3) {
                    parsed.push({
                        code: parts[0] || `GV_${Date.now() % 1000}`,
                        name: parts[1],
                        email: parts[2],
                        password: parts[3] || '123456'
                    });
                }
            }

            if (parsed.length === 0) {
                setError('Không tìm thấy dòng dữ liệu giảng viên hợp lệ trong file CSV!');
            } else {
                setCsvTeachers(parsed);
            }
        };
        reader.readAsText(file, 'utf-8');
    };

    // 3. Xử lý nhập hàng loạt từ file CSV
    const handleImportCsv = async () => {
        if (csvTeachers.length === 0) return;
        setIsLoading(true);
        setError('');
        let successCount = 0;

        for (let i = 0; i < csvTeachers.length; i++) {
            const t = csvTeachers[i];
            setImportProgress({ total: csvTeachers.length, success: successCount, current: t.name });

            try {
                const res = await fetch('/api/auth/create-teacher', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: t.email,
                        password: t.password || '123456',
                        code: t.code,
                        name: t.name
                    })
                });
                if (res.ok) {
                    successCount++;
                }
            } catch (e) {
                console.error('Lỗi thêm GV từ CSV:', t.name, e);
            }
        }

        setIsLoading(false);
        setImportProgress(null);
        setSuccessMessage(`Đã nhập thành công ${successCount}/${csvTeachers.length} giảng viên từ file CSV.`);
        
        if (onSubmit) onSubmit();
        setTimeout(() => {
            onClose();
        }, 1200);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 border border-slate-200">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-itc-900 to-itc-800 p-5 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center shadow-inner">
                            <Icons.User className="w-5 h-5 text-itc-200" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base">
                                {editingTeacher ? 'Chỉnh sửa Thông tin Giảng viên' : 'Thêm Giảng viên'}
                            </h3>
                            <p className="text-xs text-itc-200">
                                {editingTeacher ? `Cập nhật thông tin giảng viên ${editingTeacher.name}` : 'Nhập thủ công hoặc import hàng loạt từ file CSV'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                    >
                        <Icons.X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Mode Selector Tabs (Chỉ hiển thị khi thêm mới) */}
                {!editingTeacher && (
                    <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
                        <button
                            type="button"
                            onClick={() => { setMode('MANUAL'); setError(''); }}
                            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                                mode === 'MANUAL'
                                    ? 'border-itc-800 text-itc-900'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Icons.Edit className="w-3.5 h-3.5" /> Nhập thủ công
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('CSV'); setError(''); }}
                            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                                mode === 'CSV'
                                    ? 'border-itc-800 text-itc-900'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Icons.FileSpreadsheet className="w-3.5 h-3.5" />
                            Tải tệp CSV
                        </button>
                    </div>
                )}

                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-medium flex items-center gap-2">
                            <Icons.AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 font-medium flex items-center gap-2">
                            <Icons.CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* MODE 1: NHẬP TAY */}
                    {mode === 'MANUAL' && (
                        <form onSubmit={handleSubmitManual} className="space-y-3.5">
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Mã GV *</label>
                                    <input 
                                        required 
                                        value={code} 
                                        onChange={e => setCode(e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-itc-500 outline-none" 
                                        placeholder="VD: GV11"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Họ và Tên (kèm học vị) *</label>
                                    <input 
                                        required 
                                        value={name} 
                                        onChange={e => setName(e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-itc-500 outline-none" 
                                        placeholder="VD: PGS. TS. Nguyễn Thanh Tùng"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Email đăng nhập *</label>
                                <input 
                                    type="email" 
                                    required 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-itc-500 outline-none" 
                                    placeholder="VD: thanhtung@dlu.edu.vn"
                                />
                            </div>

                            {!editingTeacher && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu ban đầu</label>
                                    <input 
                                        required 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs font-medium focus:border-itc-500 outline-none font-mono"
                                    />
                                </div>
                            )}
                            
                            <div className="pt-3 flex gap-2.5">
                                <button 
                                    type="button" 
                                    onClick={onClose} 
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition text-xs"
                                >
                                    Hủy
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isLoading} 
                                    className="flex-1 bg-itc-800 hover:bg-itc-900 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {isLoading 
                                        ? 'Đang lưu...' 
                                        : (editingTeacher ? 'Lưu thay đổi' : '+ Tạo Giảng viên')
                                    }
                                </button>
                            </div>
                        </form>
                    )}

                    {/* MODE 2: NHẬP TỪ FILE CSV */}
                    {mode === 'CSV' && (
                        <div className="space-y-4">
                            {/* Nút tải file mẫu */}
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-800">File mẫu dữ liệu Giảng viên (.CSV)</h4>
                                    <p className="text-[11px] text-slate-500">Bao gồm cột: Mã GV, Họ Và Tên, Email, Mật Khẩu</p>
                                </div>
                                <a
                                    href="/du_lieu_mau_giang_vien.csv"
                                    download="du_lieu_mau_giang_vien.csv"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-itc-50 hover:bg-itc-100 text-itc-800 border border-itc-200 text-xs font-bold rounded-xl transition shrink-0"
                                >
                                    <Icons.Download className="w-3.5 h-3.5" />
                                    Tải file mẫu
                                </a>
                            </div>

                            {/* Dropzone / Upload input */}
                            <div className="border-2 border-dashed border-slate-200 hover:border-itc-500 rounded-2xl p-5 text-center transition cursor-pointer bg-slate-50/50 relative">
                                <input 
                                    type="file" 
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <Icons.FileSpreadsheet className="w-8 h-8 text-itc-800 mx-auto mb-2 opacity-80" />
                                <p className="text-xs font-bold text-slate-700">
                                    {csvFileName ? `Đã chọn: ${csvFileName}` : 'Nhấn để chọn file CSV giảng viên'}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1">Định dạng file .csv chuẩn UTF-8</p>
                            </div>

                            {/* Preview parsed teachers */}
                            {csvTeachers.length > 0 && (
                                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                                    <div className="bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-700 flex justify-between items-center">
                                        <span>Tìm thấy {csvTeachers.length} giảng viên trong file:</span>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 text-[11px]">
                                        {csvTeachers.map((t, idx) => (
                                            <div key={idx} className="p-2 flex items-center justify-between hover:bg-slate-50">
                                                <div>
                                                    <b className="text-itc-900 font-bold">{t.code}</b> - <span className="font-semibold text-slate-800">{t.name}</span>
                                                    <div className="text-[10px] text-slate-400">{t.email}</div>
                                                </div>
                                                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono">123456</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Progress bar when importing */}
                            {importProgress && (
                                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1.5">
                                    <div className="flex justify-between text-xs font-bold text-indigo-900">
                                        <span>Đang nhập: {importProgress.current}</span>
                                        <span>{importProgress.success}/{importProgress.total}</span>
                                    </div>
                                    <div className="w-full bg-indigo-200 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className="bg-indigo-600 h-2 rounded-full transition-all duration-200"
                                            style={{ width: `${(importProgress.success / importProgress.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 flex gap-2.5">
                                <button 
                                    type="button" 
                                    onClick={onClose} 
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition text-xs"
                                >
                                    Đóng
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleImportCsv}
                                    disabled={isLoading || csvTeachers.length === 0} 
                                    className="flex-1 bg-itc-800 hover:bg-itc-900 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-md disabled:opacity-50"
                                >
                                    {isLoading ? 'Đang nhập...' : `Nhập ${csvTeachers.length} Giảng viên`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
