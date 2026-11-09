"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from '../ui/Icons';
import { getAuditLogs, clearAuditLogs, AuditLogItem } from '../../lib/auditLogger';

interface AuditLogsModalProps {
    onClose: () => void;
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({ onClose }) => {
    const [logs, setLogs] = useState<AuditLogItem[]>([]);
    const [selectedRole, setSelectedRole] = useState<string>('ALL');
    const [selectedAction, setSelectedAction] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const reloadLogs = () => {
        setLogs(getAuditLogs());
    };

    useEffect(() => {
        reloadLogs();
    }, []);

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return logs.filter(item => {
            if (selectedRole !== 'ALL' && item.role !== selectedRole) return false;
            if (selectedAction !== 'ALL' && item.action !== selectedAction) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchActor = item.actor.toLowerCase().includes(q);
                const matchAction = item.actionLabel.toLowerCase().includes(q);
                const matchTarget = item.target.toLowerCase().includes(q);
                const matchDetails = item.details.toLowerCase().includes(q);
                if (!matchActor && !matchAction && !matchTarget && !matchDetails) return false;
            }

            return true;
        });
    }, [logs, selectedRole, selectedAction, searchQuery]);

    // Unique actions list for filter dropdown
    const actionTypes = useMemo(() => {
        const map = new Map<string, string>();
        logs.forEach(l => {
            if (!map.has(l.action)) {
                map.set(l.action, l.actionLabel);
            }
        });
        return Array.from(map.entries()).map(([action, label]) => ({ action, label }));
    }, [logs]);

    const formatTimestamp = (isoStr: string) => {
        try {
            const d = new Date(isoStr);
            if (isNaN(d.getTime())) return isoStr;
            return d.toLocaleString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return isoStr;
        }
    };

    const handleExportCSV = () => {
        let csv = '\uFEFF';
        csv += "NHẬT KÝ THAO TÁC HỆ THỐNG ITC (AUDIT LOGS)\n";
        csv += `Thời gian xuất:,"${new Date().toLocaleString('vi-VN')}"\n`;
        csv += `Tổng số bản ghi:,"${filteredLogs.length} dòng"\n\n`;
        csv += "STT,Mã Bản Ghi,Thời Gian,Người Thực Hiện,Vai Trò,Hành Động Thao Tác,Đối Tượng Tác Động,Chi Tiết Nội Dung\n";

        filteredLogs.forEach((l, idx) => {
            const time = formatTimestamp(l.timestamp);
            const actor = l.actor.replace(/"/g, '""');
            const actionLabel = l.actionLabel.replace(/"/g, '""');
            const target = l.target.replace(/"/g, '""');
            const details = l.details.replace(/"/g, '""');
            csv += `${idx + 1},"${l.id}","${time}","${actor}","${l.role}","${actionLabel}","${target}","${details}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Nhat_Ky_He_Thong_ITC_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleClearLogs = () => {
        if (confirm('Bạn có chắc chắn muốn đặt lại nhật ký hệ thống về trạng thái ban đầu?')) {
            clearAuditLogs();
            reloadLogs();
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
                
                {/* HEADER */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                            <Icons.Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                                    SYSTEM AUDIT TRAIL
                                </span>
                                <span className="text-[11px] text-slate-400">Minh bạch & Tuân thủ ISO 9001:2015</span>
                            </div>
                            <h2 className="text-base sm:text-lg font-black text-white">
                                NHẬT KÝ THAO TÁC HỆ THỐNG (AUDIT LOGS)
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-slate-200 transition"
                            title="Xuất file nhật ký CSV"
                        >
                            <Icons.Download className="w-3.5 h-3.5 text-emerald-400" /> Xuất Nhật Ký
                        </button>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition font-bold"
                        >
                            <Icons.X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* FILTER CONTROLS */}
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Role filter */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-500">Vai trò:</span>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-itc-500"
                            >
                                <option value="ALL">Tất cả vai trò</option>
                                <option value="ADMIN">Ban Quản trị (Admin)</option>
                                <option value="TEACHER">Giảng viên (Teacher)</option>
                                <option value="SYSTEM">Hệ thống (System)</option>
                            </select>
                        </div>

                        {/* Action filter */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-500">Hành động:</span>
                            <select
                                value={selectedAction}
                                onChange={(e) => setSelectedAction(e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-itc-500"
                            >
                                <option value="ALL">Tất cả hành động ({actionTypes.length})</option>
                                {actionTypes.map(act => (
                                    <option key={act.action} value={act.action}>{act.label}</option>
                                ))}
                            </select>
                        </div>

                        {(selectedRole !== 'ALL' || selectedAction !== 'ALL' || searchQuery) && (
                            <button
                                onClick={() => {
                                    setSelectedRole('ALL');
                                    setSelectedAction('ALL');
                                    setSearchQuery('');
                                }}
                                className="text-[11px] font-bold text-rose-600 hover:underline ml-1"
                            >
                                Đặt lại lọc
                            </button>
                        )}
                    </div>

                    {/* Search box */}
                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="Tìm theo người, lớp, phòng, ghi chú..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:border-itc-500"
                        />
                        <span className="absolute left-2.5 top-2 text-slate-400">
                            <Icons.Search className="w-3.5 h-3.5" />
                        </span>
                    </div>
                </div>

                {/* TABLE OF LOGS */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
                    {filteredLogs.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <Icons.Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-bold">Không tìm thấy bản ghi nhật ký phù hợp</p>
                            <p className="text-xs mt-1">Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-600 font-black border-b border-slate-200 uppercase tracking-wider text-[10px]">
                                        <th className="py-3 px-3 text-center w-12">STT</th>
                                        <th className="py-3 px-3 w-36">Thời Gian</th>
                                        <th className="py-3 px-4 w-52">Người Thực Hiện</th>
                                        <th className="py-3 px-3 w-40">Hành Động</th>
                                        <th className="py-3 px-4 w-44">Đối Tượng</th>
                                        <th className="py-3 px-4">Chi Tiết Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredLogs.map((log, index) => (
                                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3 px-3 text-center text-slate-400 font-bold">
                                                {index + 1}
                                            </td>
                                            <td className="py-3 px-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                                                    <Icons.Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{formatTimestamp(log.timestamp)}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-slate-900 leading-tight">
                                                    {log.actor.split(' (')[0]}
                                                </div>
                                                {log.actor.includes('(') && (
                                                    <span className="text-[10px] text-slate-400 block mt-0.5">
                                                        {log.actor.match(/\((.*?)\)/)?.[1] || ''}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                                                    log.badgeClass || 'bg-slate-100 text-slate-800 border-slate-200'
                                                }`}>
                                                    {log.actionLabel}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-800">
                                                {log.target}
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 leading-relaxed font-medium">
                                                {log.details}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="bg-white border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-600">
                            Hiển thị: <b className="text-itc-800">{filteredLogs.length}</b> / {logs.length} bản ghi
                        </span>
                        <button
                            onClick={handleClearLogs}
                            className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition underline"
                        >
                            Đặt lại dữ liệu mẫu
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

