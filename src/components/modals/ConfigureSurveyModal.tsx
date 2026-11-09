"use client";

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Icons } from '../ui/Icons';
import { OFFICIAL_SURVEY_SECTIONS, ALL_QUESTIONS } from '../../lib/surveyQuestions';
import { 
    getClassMeta, 
    saveClassMeta, 
    getQuestionBank, 
    addQuestionToBank, 
    addQuestionsToBank,
    deleteQuestionFromBank, 
    updateQuestionInBank,
    CustomQuestion 
} from '../../lib/classMetaStorage';
import { addAuditLog } from '../../lib/auditLogger';

interface ConfigureSurveyModalProps {
    classItem: any;
    currentUserRole?: 'ADMIN' | 'TEACHER';
    onClose: () => void;
    onSaved?: () => void;
}

export const ConfigureSurveyModal = ({ classItem, currentUserRole = 'ADMIN', onClose, onSaved }: ConfigureSurveyModalProps) => {
    const classId = classItem.id;
    const classCode = classItem.code;
    const initialMeta = getClassMeta(classId, classItem.teacherId, classCode);

    const [mode, setMode] = useState<'DEFAULT_30' | 'CUSTOM'>(initialMeta.surveyConfig.mode || 'DEFAULT_30');
    const [selectedIds, setSelectedIds] = useState<number[]>(initialMeta.surveyConfig.selectedQuestionIds || ALL_QUESTIONS.map(q => q.id));
    const [bankQuestions, setBankQuestions] = useState<CustomQuestion[]>([]);
    
    // New question input state
    const [newQuestionText, setNewQuestionText] = useState('');
    const [newQuestionGroup, setNewQuestionGroup] = useState('VI. CÂU HỎI BỔ SUNG (THEO LỚP)');
    const [activeSectionTab, setActiveSectionTab] = useState<string>('all');

    // Bulk question upload state
    const [entryTab, setEntryTab] = useState<'MANUAL' | 'FILE'>('MANUAL');
    const [fileQuestions, setFileQuestions] = useState<Array<{ text: string; group: string }>>([]);
    const [fileUploadName, setFileUploadName] = useState('');
    const [fileMessage, setFileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Load custom questions bank
    const reloadBank = () => {
        const { custom } = getQuestionBank();
        setBankQuestions(custom);
    };

    useEffect(() => {
        reloadBank();
    }, []);

    // Toggle a question selection
    const toggleQuestion = (id: number) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        const allIds = [...ALL_QUESTIONS.map(q => q.id), ...bankQuestions.map(q => q.id)];
        setSelectedIds(Array.from(new Set(allIds)));
    };

    const handleDeselectAll = () => {
        setSelectedIds([]);
    };

    // Add a custom question to bank & auto-select it
    const handleAddQuestion = () => {
        if (!newQuestionText.trim()) {
            alert('Vui lòng nhập nội dung câu hỏi mới!');
            return;
        }

        const created = addQuestionToBank(newQuestionText, newQuestionGroup, currentUserRole);
        setSelectedIds(prev => [...prev, created.id]);
        setNewQuestionText('');
        reloadBank();
    };

    // Bulk File Upload handler
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileUploadName(file.name);
        setFileMessage(null);
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.txt')) {
            const reader = new FileReader();
            reader.onload = (event: any) => {
                const text = String(event.target?.result || '');
                const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
                if (lines.length === 0) {
                    setFileMessage({ type: 'error', text: 'Tệp văn bản không có nội dung câu hỏi nào!' });
                    return;
                }
                const parsed = lines.map(line => {
                    const cleaned = line.replace(/^(câu\s*\d+[:.]|\d+[\.\-\)]\s*)/i, '').trim();
                    return {
                        text: cleaned || line,
                        group: newQuestionGroup
                    };
                });
                setFileQuestions(parsed);
                setFileMessage({ type: 'success', text: `Đã đọc thành công ${parsed.length} câu hỏi từ tệp văn bản!` });
            };
            reader.readAsText(file, 'utf-8');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event: any) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
                if (!rows || rows.length === 0) {
                    setFileMessage({ type: 'error', text: 'Tệp Excel/CSV không có dữ liệu!' });
                    return;
                }

                let startRow = 0;
                let textCol = 0;
                let groupCol = -1;

                const firstRow = (rows[0] || []).map((c: any) => String(c || '').trim().toLowerCase());
                const headerTextIdx = firstRow.findIndex(h => h.includes('câu hỏi') || h.includes('nội dung') || h.includes('question') || h.includes('tiêu chí'));
                const headerGroupIdx = firstRow.findIndex(h => h.includes('nhóm') || h.includes('chủ đề') || h.includes('group') || h.includes('phần'));

                if (headerTextIdx !== -1) {
                    textCol = headerTextIdx;
                    startRow = 1;
                } else if (firstRow.length > 1 && (firstRow[0].includes('stt') || firstRow[0].includes('no') || !isNaN(Number(firstRow[0])))) {
                    textCol = 1;
                    startRow = firstRow[0].includes('stt') || firstRow[0].includes('no') ? 1 : 0;
                }

                if (headerGroupIdx !== -1) {
                    groupCol = headerGroupIdx;
                }

                const parsed: Array<{ text: string; group: string }> = [];
                for (let i = startRow; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.length === 0) continue;
                    let text = String(row[textCol] || '').trim();
                    text = text.replace(/^(câu\s*\d+[:.]|\d+[\.\-\)]\s*)/i, '').trim();
                    if (!text || text.length < 3) continue;

                    let group = groupCol !== -1 && row[groupCol] ? String(row[groupCol]).trim() : newQuestionGroup;
                    parsed.push({ text, group });
                }

                if (parsed.length === 0) {
                    setFileMessage({ type: 'error', text: 'Không trích xuất được câu hỏi nào từ file!' });
                    return;
                }

                setFileQuestions(parsed);
                setFileMessage({ type: 'success', text: `Đã đọc thành công ${parsed.length} câu hỏi từ tệp ${file.name}!` });
            } catch (err: any) {
                console.error('Lỗi đọc file:', err);
                setFileMessage({ type: 'error', text: 'Lỗi đọc file: ' + (err.message || 'Định dạng không hợp lệ') });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleApplyUploadedQuestions = () => {
        if (fileQuestions.length === 0) return;
        const created = addQuestionsToBank(fileQuestions, currentUserRole);
        const newIds = created.map(q => q.id);
        setSelectedIds(prev => [...prev, ...newIds]);
        reloadBank();
        alert(`Đã thêm thành công ${created.length} câu hỏi mới vào ngân hàng và đưa vào Đề Khảo Sát của lớp!`);
        setFileQuestions([]);
        setFileUploadName('');
        setFileMessage(null);
    };

    const handleRemovePreviewQuestion = (index: number) => {
        setFileQuestions(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleDeleteBankQuestion = (id: number) => {
        if (confirm('Bạn có chắc muốn xóa câu hỏi này khỏi ngân hàng câu hỏi?')) {
            deleteQuestionFromBank(id);
            setSelectedIds(prev => prev.filter(x => x !== id));
            reloadBank();
        }
    };

    const handleEditBankQuestion = (q: any) => {
        const newText = prompt('Chỉnh sửa nội dung câu hỏi:', q.text);
        if (!newText || !newText.trim() || newText.trim() === q.text) return;
        updateQuestionInBank(q.id, newText.trim());
        reloadBank();
    };

    // Save configuration
    const handleSave = () => {
        if (mode === 'CUSTOM' && selectedIds.length === 0) {
            alert('Vui lòng chọn ít nhất 1 câu hỏi để sinh viên làm khảo sát!');
            return;
        }

        saveClassMeta(classId, {
            surveyConfig: {
                mode,
                selectedQuestionIds: mode === 'DEFAULT_30' ? ALL_QUESTIONS.map(q => q.id) : selectedIds,
                customQuestions: bankQuestions.filter(q => selectedIds.includes(q.id))
            }
        }, classItem.teacherId, classCode);

        // System Audit Log
        addAuditLog({
            actor: currentUserRole === 'ADMIN' ? 'Ban Quản Trị ITC (admin@dlu.edu.vn)' : 'Giảng viên phụ trách lớp',
            role: currentUserRole === 'ADMIN' ? 'ADMIN' : 'TEACHER',
            action: 'CONFIG_SURVEY_QUESTIONS',
            actionLabel: 'Cấu hình đề khảo sát',
            target: `Lớp ${classCode}`,
            details: `Thiết lập chế độ [${mode === 'DEFAULT_30' ? 'Chuẩn 30 câu hỏi ITC' : `Tùy chọn ${selectedIds.length} câu hỏi`}]`
        });

        if (onSaved) onSaved();
        onClose();
    };

    const totalSelected = mode === 'DEFAULT_30' ? 30 : selectedIds.length;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-itc-900 to-itc-800 p-5 text-white flex justify-between items-center shrink-0">
                    <div>
                        <div className="inline-flex items-center gap-1.5 bg-white/15 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-itc-100 mb-1">
                            <span>Lớp: {classCode}</span> • <span>{classItem.courseName || 'Khóa đào tạo'}</span>
                        </div>
                        <h3 className="font-black text-lg">Cấu Hình Đề Khảo Sát</h3>
                        <p className="text-xs text-slate-300">
                            {currentUserRole === 'ADMIN' ? 'Quản trị viên' : 'Giảng viên'} cấu hình các câu hỏi mà sinh viên lớp này sẽ thực hiện đánh giá.
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                    >
                        <Icons.Plus className="w-5 h-5 rotate-45" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
                    {/* Mode Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setMode('DEFAULT_30')}
                            className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                                mode === 'DEFAULT_30'
                                    ? 'bg-itc-50/70 border-itc-800 ring-2 ring-itc-800 shadow-xs'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-extrabold text-sm text-slate-900">Form Mẫu 30 Câu Chuẩn</span>
                                    {mode === 'DEFAULT_30' && (
                                        <span className="w-2.5 h-2.5 rounded-full bg-itc-800"></span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Áp dụng trọn gói bộ 30 câu hỏi Likert 5 nhóm theo chuẩn đánh giá của Trung tâm ITC.
                                </p>
                            </div>
                            <span className="mt-3 text-[11px] font-bold text-itc-800 bg-itc-100/60 px-2 py-0.5 rounded w-fit">
                                30 câu hỏi tiêu chuẩn
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setMode('CUSTOM')}
                            className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                                mode === 'CUSTOM'
                                    ? 'bg-itc-50/70 border-itc-800 ring-2 ring-itc-800 shadow-xs'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-extrabold text-sm text-slate-900">Tùy Chọn Câu Hỏi & Tự Soạn</span>
                                    {mode === 'CUSTOM' && (
                                        <span className="w-2.5 h-2.5 rounded-full bg-itc-800"></span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Tự tích chọn câu hỏi cần khảo sát từ ngân hàng hoặc tự tạo thêm câu hỏi riêng cho lớp này.
                                </p>
                            </div>
                            <span className="mt-3 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded w-fit">
                                Đã chọn: {selectedIds.length} câu hỏi
                            </span>
                        </button>
                    </div>

                    {/* Custom Mode Questions Manager */}
                    {mode === 'CUSTOM' && (
                        <div className="space-y-5 animate-in fade-in duration-150">
                            {/* Toolbar */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-700">Đề khảo sát hiện tại:</span>
                                    <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                                        {selectedIds.length} câu hỏi
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        type="button"
                                        onClick={handleSelectAll}
                                        className="text-xs font-bold text-itc-800 hover:underline px-2 py-1"
                                    >
                                        Tích chọn tất cả
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button 
                                        type="button"
                                        onClick={handleDeselectAll}
                                        className="text-xs font-bold text-rose-600 hover:underline px-2 py-1"
                                    >
                                        Bỏ chọn hết
                                    </button>
                                </div>
                            </div>

                            {/* Section 1: Tạo câu hỏi mới của Giảng viên / Admin (Nhập tay hoặc Tải tệp Excel/CSV/TXT) */}
                            <div className="bg-white rounded-2xl border border-indigo-200/80 p-5 shadow-2xs space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-indigo-900">
                                        <Icons.Plus className="w-4 h-4 text-indigo-600" />
                                        <h4 className="font-extrabold text-xs uppercase tracking-wide">
                                            Thêm Câu Hỏi Khảo Sát Mới (Giảng viên / Admin)
                                        </h4>
                                    </div>
                                    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                                        <button
                                            type="button"
                                            onClick={() => setEntryTab('MANUAL')}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                                entryTab === 'MANUAL'
                                                    ? 'bg-white text-indigo-800 shadow-2xs'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            Nhập từng câu
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEntryTab('FILE')}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                                entryTab === 'FILE'
                                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            <Icons.Upload className="w-3.5 h-3.5" /> Tải tệp (Excel / CSV / TXT)
                                        </button>
                                    </div>
                                </div>

                                {entryTab === 'MANUAL' ? (
                                    <div className="space-y-3">
                                        <p className="text-xs text-slate-500">
                                            Nhập câu hỏi bạn muốn sinh viên đánh giá (ví dụ: về bài tập lớn, đồ án thực hành, tài liệu bổ sung...).
                                        </p>
                                        <input 
                                            type="text"
                                            placeholder="Ví dụ: Giảng viên hỗ trợ giải đáp đồ án cuối khóa có chi tiết và dễ hiểu không?"
                                            value={newQuestionText}
                                            onChange={e => setNewQuestionText(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddQuestion(); } }}
                                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-slate-50/50"
                                        />
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-slate-500 font-medium">Nhóm nội dung:</span>
                                                <select 
                                                    value={newQuestionGroup}
                                                    onChange={e => setNewQuestionGroup(e.target.value)}
                                                    className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs bg-white text-slate-800 font-medium focus:outline-none"
                                                >
                                                    <option value="II. HOẠT ĐỘNG GIẢNG DẠY VÀ ĐÁNH GIÁ">II. Hoạt động giảng dạy & đánh giá</option>
                                                    <option value="I. MỤC TIÊU VÀ NỘI DUNG KHÓA HỌC">I. Mục tiêu & nội dung khóa học</option>
                                                    <option value="III. CƠ SỞ VẬT CHẤT, TÀI LIỆU VÀ ĐIỀU KIỆN HỌC TẬP">III. Cơ sở vật chất & tài liệu</option>
                                                    <option value="VI. CÂU HỎI BỔ SUNG (THEO LỚP)">VI. Câu hỏi bổ sung riêng của lớp</option>
                                                </select>
                                            </div>

                                            <button 
                                                type="button"
                                                onClick={handleAddQuestion}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                                            >
                                                <Icons.Plus className="w-3.5 h-3.5" /> Thêm Vào Đề Khảo Sát
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3.5 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                Tải lên danh sách câu hỏi khảo sát từ file Excel (<code className="text-indigo-700 font-bold">.xlsx</code>, <code className="text-indigo-700 font-bold">.xls</code>), <code className="text-indigo-700 font-bold">.csv</code> hoặc tệp văn bản <code className="text-indigo-700 font-bold">.txt</code> (mỗi dòng một câu).
                                            </p>
                                            <div className="flex items-center gap-2 text-xs">
                                                <a 
                                                    href="/mau_cau_hoi_khao_sat.xlsx" 
                                                    download 
                                                    className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold transition"
                                                >
                                                    <Icons.Download className="w-3.5 h-3.5" /> File mẫu (.xlsx)
                                                </a>
                                                <a 
                                                    href="/mau_cau_hoi_khao_sat.csv" 
                                                    download 
                                                    className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg font-bold transition"
                                                >
                                                    <Icons.Download className="w-3.5 h-3.5" /> File mẫu (.csv)
                                                </a>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                                            <div className="sm:col-span-2">
                                                <input
                                                    type="file"
                                                    accept=".xlsx, .xls, .csv, .txt"
                                                    onChange={handleFileUpload}
                                                    className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer cursor-pointer bg-white rounded-xl border border-slate-200 p-1"
                                                />
                                            </div>
                                            <div>
                                                <select 
                                                    value={newQuestionGroup}
                                                    onChange={e => setNewQuestionGroup(e.target.value)}
                                                    className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs bg-white text-slate-800 font-medium focus:outline-none"
                                                    title="Nhóm mặc định cho câu hỏi mới tải lên"
                                                >
                                                    <option value="VI. CÂU HỎI BỔ SUNG (THEO LỚP)">VI. Câu hỏi bổ sung riêng của lớp</option>
                                                    <option value="II. HOẠT ĐỘNG GIẢNG DẠY VÀ ĐÁNH GIÁ">II. Hoạt động giảng dạy & đánh giá</option>
                                                    <option value="I. MỤC TIÊU VÀ NỘI DUNG KHÓA HỌC">I. Mục tiêu & nội dung khóa học</option>
                                                    <option value="III. CƠ SỞ VẬT CHẤT, TÀI LIỆU VÀ ĐIỀU KIỆN HỌC TẬP">III. Cơ sở vật chất & tài liệu</option>
                                                </select>
                                            </div>
                                        </div>

                                        {fileMessage && (
                                            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                                                fileMessage.type === 'success' 
                                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                            }`}>
                                                {fileMessage.type === 'success' ? (
                                                    <Icons.CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                                ) : (
                                                    <Icons.AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                                )}
                                                <span>{fileMessage.text}</span>
                                            </div>
                                        )}

                                        {fileQuestions.length > 0 && (
                                            <div className="space-y-3 pt-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-700">
                                                        Xem trước danh sách câu hỏi ({fileQuestions.length} câu):
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFileQuestions([])}
                                                        className="text-xs text-rose-600 hover:underline font-semibold"
                                                    >
                                                        Xóa danh sách tải lên
                                                    </button>
                                                </div>

                                                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                                                    {fileQuestions.map((fq, idx) => (
                                                        <div key={idx} className="flex items-start justify-between gap-2 pt-1.5 first:pt-0">
                                                            <div className="text-xs text-slate-800 leading-relaxed flex-1">
                                                                <span className="font-bold text-indigo-700 mr-1.5">{idx + 1}.</span>
                                                                <span>{fq.text}</span>
                                                                <span className="block text-[10px] text-slate-400 mt-0.5">{fq.group}</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemovePreviewQuestion(idx)}
                                                                className="text-slate-400 hover:text-rose-600 p-1"
                                                                title="Bỏ câu này"
                                                            >
                                                                <Icons.X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={handleApplyUploadedQuestions}
                                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shadow-xs flex items-center justify-center gap-2"
                                                >
                                                    <Icons.Plus className="w-4 h-4" />
                                                    Thêm {fileQuestions.length} Câu Hỏi Này Vào Đề Khảo Sát
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Section 2: Ngân hàng 30 câu hỏi chuẩn (Checkbox list) */}
                            <div className="space-y-4">
                                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-2">
                                    <Icons.BookOpen className="w-4 h-4 text-itc-800" />
                                    Ngân Hàng Câu Hỏi Khảo Sát (Chọn những câu bạn muốn hỏi)
                                </h4>

                                {OFFICIAL_SURVEY_SECTIONS.map((sec, sIdx) => {
                                    const secSelectedCount = sec.questions.filter(q => selectedIds.includes(q.id)).length;

                                    return (
                                        <div key={sec.id} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                                            <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                                <span className="font-bold text-xs text-slate-800">
                                                    {sec.group}
                                                </span>
                                                <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                    Đã chọn {secSelectedCount}/{sec.questions.length}
                                                </span>
                                            </div>

                                            <div className="divide-y divide-slate-100 p-2">
                                                {sec.questions.map(q => {
                                                    const isChecked = selectedIds.includes(q.id);

                                                    return (
                                                        <label 
                                                            key={q.id}
                                                            className={`flex items-start gap-3 p-3 rounded-xl transition cursor-pointer ${
                                                                isChecked ? 'bg-itc-50/30' : 'hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <input 
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => toggleQuestion(q.id)}
                                                                className="mt-0.5 w-4 h-4 text-itc-800 rounded border-slate-300 focus:ring-itc-500 cursor-pointer"
                                                            />
                                                            <div className="text-xs text-slate-700 leading-relaxed select-none">
                                                                <span className="font-bold text-slate-900 mr-1.5">{q.id}.</span>
                                                                {q.text}
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Custom questions list if any */}
                                {bankQuestions.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-indigo-200 shadow-2xs overflow-hidden">
                                        <div className="bg-indigo-50/80 px-4 py-3 border-b border-indigo-100 flex items-center justify-between">
                                            <span className="font-bold text-xs text-indigo-900">
                                                Câu hỏi tự tạo trong Ngân hàng ({bankQuestions.length})
                                            </span>
                                        </div>
                                        <div className="divide-y divide-slate-100 p-2">
                                            {bankQuestions.map(q => {
                                                const isChecked = selectedIds.includes(q.id);

                                                return (
                                                    <div 
                                                        key={q.id}
                                                        className={`flex items-center justify-between p-3 rounded-xl transition ${
                                                            isChecked ? 'bg-indigo-50/30' : 'hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <label className="flex items-start gap-3 cursor-pointer flex-1 mr-3">
                                                            <input 
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => toggleQuestion(q.id)}
                                                                className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                            />
                                                            <div className="text-xs text-slate-800 select-none">
                                                                <span className="font-bold text-indigo-700 mr-1.5">[Tự tạo]</span>
                                                                {q.text}
                                                            </div>
                                                        </label>
                                                        <div className="flex items-center gap-1">
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleEditBankQuestion(q)}
                                                                className="text-slate-400 hover:text-indigo-600 p-1 rounded"
                                                                title="Sửa câu hỏi này"
                                                            >
                                                                <Icons.Edit className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleDeleteBankQuestion(q.id)}
                                                                className="text-slate-400 hover:text-rose-600 p-1 rounded"
                                                                title="Xóa câu hỏi này"
                                                            >
                                                                <Icons.Trash className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                    <div className="text-xs text-slate-500">
                        Tổng số câu sinh viên sẽ trả lời: <b className="text-slate-900">{totalSelected} câu</b>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                        >
                            Hủy
                        </button>
                        <button 
                            type="button" 
                            onClick={handleSave} 
                            className="px-5 py-2 text-xs font-bold text-white bg-itc-800 rounded-xl hover:bg-itc-900 transition shadow-xs flex items-center gap-1.5"
                        >
                            <Icons.CheckCircle className="w-3.5 h-3.5" /> Lưu Cấu Hình Khảo Sát
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
