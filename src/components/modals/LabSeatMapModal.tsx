"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from '../ui/Icons';
import { addAuditLog } from '../../lib/auditLogger';
import { AlertItem } from '../../types';

export type MachineStatus = 'GOOD' | 'WARNING_NETWORK' | 'BROKEN_HARDWARE' | 'UNDER_REPAIR';

export interface MachineSeatData {
    seatId: string;       // e.g. "M01", "M08", "M14"
    seatNumber: number;   // 1 to 32
    room: string;         // "Phòng Lab 5"
    rowLabel: string;     // "Dãy 1", "Dãy 2", "Dãy 3", "Dãy 4"
    status: MachineStatus;
    hardwareSpec: string;
    ipAddress: string;
    studentComplaints: Array<{
        date: string;
        classCode: string;
        mssv?: string;
        comment: string;
        score?: number;
    }>;
    technicianNote?: string;
    lastUpdated?: string;
}

interface LabSeatMapModalProps {
    reviews?: any[];
    classes?: any[];
    alerts?: AlertItem[];
    warningThreshold?: number;
    setWarningThreshold?: (val: number) => void;
    roomSummaries?: any[];
    initialTab?: 'SEAT_MAP' | 'ALERTS';
    initialRoom?: string;
    onClose: () => void;
    onUpdateAction?: (reviewId: string, status: string, note: string) => void;
    onViewClassReviews?: (classId: string) => void;
}

const STORAGE_KEY_SEAT_MAP = 'itc_lab_seat_statuses';

// Pre-seeded status for realistic demo in Lab 5 and other labs
const DEFAULT_LAB5_SEATS: Record<string, Partial<MachineSeatData>> = {
    "M08": {
        status: 'WARNING_NETWORK',
        studentComplaints: [
            {
                date: '06/11/2026',
                classCode: '2027',
                mssv: '2110452',
                comment: 'Cổng mạng LAN chập chờn, tải bài tập thực hành trên web môn học bị ngắt quãng liên tục.',
                score: 2
            }
        ],
        technicianNote: 'KTV đã kiểm tra, bấm lại đầu cáp RJ45 âm sàn.',
        lastUpdated: '06/11/2026 14:30'
    },
    "M14": {
        status: 'BROKEN_HARDWARE',
        studentComplaints: [
            {
                date: '05/11/2026',
                classCode: 'ITC_2026',
                mssv: '2110389',
                comment: 'Chuột quang bị liệt nút click trái, bàn phím kẹt phím cách (Space) và phím Enter.',
                score: 1
            }
        ],
        technicianNote: 'Cần thay chuột quang mới và vệ sinh cụm bàn phím số.',
        lastUpdated: '05/11/2026 16:45'
    },
    "M22": {
        status: 'UNDER_REPAIR',
        studentComplaints: [
            {
                date: '04/11/2026',
                classCode: 'ITC_2025',
                mssv: '2210115',
                comment: 'Máy bị lỗi màn hình xanh khi biên dịch mã nguồn C++, nghi ngờ RAM bị lỏng.',
                score: 2
            }
        ],
        technicianNote: 'Đang vệ sinh chân RAM và chạy chẩn đoán MemTest86.',
        lastUpdated: '06/11/2026 09:15'
    }
};

const LAB_ROOMS = [
    { id: 'Phòng Lab 5', name: 'Phòng Lab 5 (Trung tâm)', totalSeats: 32, rows: 4, cols: 8 },
    { id: 'Phòng Lab 1', name: 'Phòng Lab 1 (Thực hành cơ bản)', totalSeats: 32, rows: 4, cols: 8 },
    { id: 'Phòng Lab 2', name: 'Phòng Lab 2 (Lập trình chuyên sâu)', totalSeats: 32, rows: 4, cols: 8 },
    { id: 'Phòng Lab 6', name: 'Phòng Lab 6 (Đồ họa & Mạng)', totalSeats: 32, rows: 4, cols: 8 },
    { id: 'Phòng A24', name: 'Phòng A24 (Hội trường máy tính)', totalSeats: 36, rows: 4, cols: 9 }
];

export const LabSeatMapModal: React.FC<LabSeatMapModalProps> = ({
    reviews = [],
    classes = [],
    alerts = [],
    warningThreshold = 3.0,
    setWarningThreshold,
    roomSummaries = [],
    initialTab = 'SEAT_MAP',
    initialRoom = 'Phòng Lab 5',
    onClose,
    onUpdateAction,
    onViewClassReviews
}) => {
    const [activeTabMode, setActiveTabMode] = useState<'SEAT_MAP' | 'ALERTS'>(initialTab);
    const [selectedRoom, setSelectedRoom] = useState<string>(initialRoom);
    const [selectedSeat, setSelectedSeat] = useState<MachineSeatData | null>(null);
    const [statusOverrides, setStatusOverrides] = useState<Record<string, Partial<MachineSeatData>>>({});
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    // Technician edit state
    const [editStatus, setEditStatus] = useState<MachineStatus>('GOOD');
    const [editNote, setEditNote] = useState<string>('');
    const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

    // State cho tab Cảnh Báo Bảo Trì & Điểm Nóng
    const [searchAlertQuery, setSearchAlertQuery] = useState('');
    const [alertCategory, setAlertCategory] = useState<'ALL' | 'FACILITY' | 'TEACHING'>('ALL');
    const [alertRoomFilter, setAlertRoomFilter] = useState<string>('ALL');
    const [editingActionAlert, setEditingActionAlert] = useState<{ reviewId: string; status: string; note: string; classCode?: string } | null>(null);

    // Thống kê thiết bị phòng máy (PC, Mạng, Điều hòa)
    const equipmentStats = useMemo(() => {
        let pcCount = 0;
        let netCount = 0;
        let acCount = 0;

        alerts.forEach(a => {
            const text = (a.critName + ' ' + (a.fullQuestion || '')).toLowerCase();
            if (text.includes('máy tính') || text.includes('phần mềm') || text.includes('chuột') || text.includes('bàn phím') || text.includes('thiết bị')) {
                pcCount++;
            } else if (text.includes('mạng') || text.includes('wifi') || text.includes('internet')) {
                netCount++;
            } else if (text.includes('điều hòa') || text.includes('nhiệt độ') || text.includes('môi trường') || text.includes('phòng')) {
                acCount++;
            }
        });

        return { pcCount, netCount, acCount };
    }, [alerts]);

    // Gom nhóm cảnh báo theo lớp
    const classAlertGroups = useMemo(() => {
        const map = new Map<string, any>();

        alerts.forEach(alert => {
            const key = alert.classId || alert.classCode;
            if (!map.has(key)) {
                map.set(key, {
                    classId: alert.classId || '',
                    classCode: alert.classCode,
                    courseName: alert.courseName || '',
                    room: alert.room || 'Chưa xếp phòng',
                    teacherName: alert.teacherName || 'Chưa phân công',
                    academicYear: alert.academicYear,
                    alerts: [],
                    studentComments: []
                });
            }

            const group = map.get(key)!;
            group.alerts.push(alert);

            if (alert.studentComments) {
                alert.studentComments.forEach((c: any) => {
                    if (!group.studentComments.some((item: any) => item.id === c.id)) {
                        group.studentComments.push(c);
                    }
                });
            }
        });

        return Array.from(map.values());
    }, [alerts]);

    const alertRoomOptions = useMemo(() => {
        const set = new Set<string>();
        classAlertGroups.forEach(g => {
            if (g.room && g.room !== 'Chưa xếp phòng') set.add(g.room);
        });
        return Array.from(set);
    }, [classAlertGroups]);

    const filteredClassAlertGroups = useMemo(() => {
        return classAlertGroups.map(grp => {
            let classAlerts = grp.alerts;
            if (alertCategory === 'FACILITY') {
                classAlerts = classAlerts.filter((a: any) => a.isMaintenance || a.category === 'FACILITY');
            } else if (alertCategory === 'TEACHING') {
                classAlerts = classAlerts.filter((a: any) => !a.isMaintenance && a.category !== 'FACILITY');
            }

            return {
                ...grp,
                alerts: classAlerts
            };
        }).filter(grp => {
            if (grp.alerts.length === 0) return false;
            if (alertRoomFilter !== 'ALL' && grp.room !== alertRoomFilter) return false;
            if (searchAlertQuery.trim()) {
                const q = searchAlertQuery.toLowerCase();
                const matchCode = grp.classCode.toLowerCase().includes(q);
                const matchCourse = grp.courseName.toLowerCase().includes(q);
                const matchRoom = grp.room.toLowerCase().includes(q);
                const matchAlert = grp.alerts.some((a: any) => a.critName.toLowerCase().includes(q));
                const matchComment = grp.studentComments.some((c: any) => c.comment.toLowerCase().includes(q));
                if (!matchCode && !matchCourse && !matchRoom && !matchAlert && !matchComment) return false;
            }
            return true;
        });
    }, [classAlertGroups, alertCategory, alertRoomFilter, searchAlertQuery]);

    const getAlertIcon = (alert: any) => {
        const text = (alert.critName + ' ' + (alert.fullQuestion || '')).toLowerCase();
        if (text.includes('máy tính') || text.includes('phần mềm') || text.includes('chuột') || text.includes('bàn phím') || text.includes('thiết bị')) {
            return <Icons.Monitor className="w-4 h-4 text-blue-600" />;
        }
        if (text.includes('mạng') || text.includes('wifi') || text.includes('internet')) {
            return <Icons.Wifi className="w-4 h-4 text-indigo-600" />;
        }
        if (text.includes('điều hòa') || text.includes('nhiệt độ') || text.includes('môi trường') || text.includes('phòng')) {
            return <Icons.Wind className="w-4 h-4 text-cyan-600" />;
        }
        return <Icons.AlertTriangle className="w-4 h-4 text-amber-600" />;
    };

    // Load persisted overrides from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_SEAT_MAP);
            if (raw) {
                setStatusOverrides(JSON.parse(raw));
            } else {
                localStorage.setItem(STORAGE_KEY_SEAT_MAP, JSON.stringify(DEFAULT_LAB5_SEATS));
                setStatusOverrides(DEFAULT_LAB5_SEATS);
            }
        } catch {
            setStatusOverrides(DEFAULT_LAB5_SEATS);
        }
    }, []);

    const activeRoomConfig = useMemo(() => {
        return LAB_ROOMS.find(r => r.id === selectedRoom) || LAB_ROOMS[0];
    }, [selectedRoom]);

    // Build seat data list for current room
    const seatsData = useMemo<MachineSeatData[]>(() => {
        const total = activeRoomConfig.totalSeats;
        const cols = activeRoomConfig.cols;
        const list: MachineSeatData[] = [];

        for (let i = 1; i <= total; i++) {
            const seatNumStr = i < 10 ? `0${i}` : `${i}`;
            const seatId = `M${seatNumStr}`;
            const rowIndex = Math.floor((i - 1) / cols) + 1;
            const rowLabel = `Dãy ${rowIndex}`;
            const ipAddress = `192.168.5.${100 + i}`;

            // Check override
            const override = statusOverrides[seatId];

            // Check student reviews mentioning this machine in comments
            const machineReviews = reviews.filter(r => {
                const comment = (r.comment || '').toLowerCase();
                const assetLoc = (r.assetLocation || r.asset_location || '').toLowerCase();
                const targetStr = `máy ${i}`.toLowerCase();
                const targetStr0 = `máy 0${i}`.toLowerCase();
                const targetM = `m${seatNumStr}`.toLowerCase();

                const inRoom = !r.classId || classes.some(c => c.id === r.classId && (c.room === selectedRoom || selectedRoom.includes(c.room)));
                if (!inRoom) return false;

                return comment.includes(targetStr) || 
                       comment.includes(targetStr0) || 
                       comment.includes(targetM) ||
                       assetLoc.includes(targetStr) ||
                       assetLoc.includes(targetStr0);
            });

            const complaints = machineReviews.map(r => ({
                date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : 'Gần đây',
                classCode: classes.find(c => c.id === r.classId)?.code || 'Lớp học',
                comment: r.comment || '',
                score: r.ratings?.facility || 2
            }));

            // Merge complaints from defaults
            const defaultComplaints = (selectedRoom === 'Phòng Lab 5' && DEFAULT_LAB5_SEATS[seatId]?.studentComplaints) 
                ? DEFAULT_LAB5_SEATS[seatId].studentComplaints! 
                : [];
            
            const allComplaints = [...defaultComplaints, ...complaints];

            let computedStatus: MachineStatus = 'GOOD';
            if (override?.status) {
                computedStatus = override.status;
            } else if (selectedRoom === 'Phòng Lab 5' && DEFAULT_LAB5_SEATS[seatId]?.status) {
                computedStatus = DEFAULT_LAB5_SEATS[seatId].status!;
            } else if (allComplaints.length > 0) {
                const hasLow = allComplaints.some(c => (c.score || 5) <= 2);
                computedStatus = hasLow ? 'BROKEN_HARDWARE' : 'WARNING_NETWORK';
            }

            list.push({
                seatId,
                seatNumber: i,
                room: selectedRoom,
                rowLabel,
                status: computedStatus,
                hardwareSpec: 'Core i5-12400 | 16GB RAM | SSD 512GB | Dell 24"',
                ipAddress,
                studentComplaints: allComplaints,
                technicianNote: override?.technicianNote || (selectedRoom === 'Phòng Lab 5' ? DEFAULT_LAB5_SEATS[seatId]?.technicianNote : undefined),
                lastUpdated: override?.lastUpdated || (selectedRoom === 'Phòng Lab 5' ? DEFAULT_LAB5_SEATS[seatId]?.lastUpdated : undefined)
            });
        }

        return list;
    }, [activeRoomConfig, selectedRoom, statusOverrides, reviews, classes]);

    // Filtered seats
    const filteredSeats = useMemo(() => {
        if (filterStatus === 'ALL') return seatsData;
        return seatsData.filter(s => s.status === filterStatus);
    }, [seatsData, filterStatus]);

    // Statistics counts
    const stats = useMemo(() => {
        const total = seatsData.length;
        const good = seatsData.filter(s => s.status === 'GOOD').length;
        const warning = seatsData.filter(s => s.status === 'WARNING_NETWORK').length;
        const broken = seatsData.filter(s => s.status === 'BROKEN_HARDWARE').length;
        const repairing = seatsData.filter(s => s.status === 'UNDER_REPAIR').length;
        return { total, good, warning, broken, repairing };
    }, [seatsData]);

    const handleSelectSeat = (seat: MachineSeatData) => {
        setSelectedSeat(seat);
        setEditStatus(seat.status);
        setEditNote(seat.technicianNote || '');
        setSaveSuccessMsg('');
    };

    const handleSaveTechnicianAction = () => {
        if (!selectedSeat) return;

        const updatedSeat: Partial<MachineSeatData> = {
            status: editStatus,
            technicianNote: editNote,
            lastUpdated: new Date().toLocaleString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            })
        };

        const newOverrides = {
            ...statusOverrides,
            [selectedSeat.seatId]: updatedSeat
        };

        setStatusOverrides(newOverrides);
        localStorage.setItem(STORAGE_KEY_SEAT_MAP, JSON.stringify(newOverrides));

        // System Audit Log
        addAuditLog({
            actor: 'Kỹ thuật viên Quản lý Phòng máy',
            role: 'ADMIN',
            action: 'UPDATE_LAB_SEAT_STATUS',
            actionLabel: 'Bảo trì máy trạm phòng Lab',
            target: `${selectedSeat.seatId} (${selectedRoom})`,
            details: `Cập nhật trạng thái [${
                editStatus === 'GOOD' ? 'Tốt / Đã sửa' : 
                editStatus === 'WARNING_NETWORK' ? 'Mạng chập chờn' : 
                editStatus === 'BROKEN_HARDWARE' ? 'Hỏng phần cứng' : 'Đang sửa chữa'
            }]. Biên bản: ${editNote || 'Không có ghi chú thêm.'}`
        });

        // Trigger review action update if complaints exist
        if (onUpdateAction && selectedSeat.studentComplaints.length > 0) {
            // Find related review
            const matchedReview = reviews.find(r => (r.comment || '').toLowerCase().includes(selectedSeat.seatId.toLowerCase()));
            if (matchedReview) {
                onUpdateAction(
                    matchedReview.id,
                    editStatus === 'GOOD' ? 'RESOLVED' : 'IN_PROGRESS',
                    `[Biên bản sửa ${selectedSeat.seatId}]: ${editNote}`
                );
            }
        }

        setSelectedSeat({
            ...selectedSeat,
            ...updatedSeat
        });

        setSaveSuccessMsg('Đã cập nhật biên bản kỹ thuật viên thành công!');
        setTimeout(() => setSaveSuccessMsg(''), 3000);
    };

    const handleExportCSV = () => {
        let csv = '\uFEFF';
        csv += `BÁO CÁO HIỆN TRẠNG PHÒNG THỰC HÀNH MÁY TÍNH - ${selectedRoom.toUpperCase()}\n`;
        csv += `Thời gian xuất:,"${new Date().toLocaleString('vi-VN')}"\n`;
        csv += `Tổng số máy:,"${stats.total} máy"\n`;
        csv += `Hoạt động tốt:,"${stats.good} máy"\n`;
        csv += `Mạng chập chờn:,"${stats.warning} máy"\n`;
        csv += `Hỏng phần cứng:,"${stats.broken} máy"\n`;
        csv += `Đang bảo dưỡng:,"${stats.repairing} máy"\n\n`;

        csv += "STT,Mã Máy,Dãy,Địa Chỉ IP,Trạng Thái Kỹ Thuật,Cấu Hình Phần Cứng,Ý Kiến Phản Ánh Sinh Viên,Ghi Chú Kỹ Thuật Viên,Cập Nhật Lần Cuối\n";
        
        seatsData.forEach(s => {
            const statusText = 
                s.status === 'GOOD' ? 'Tốt (Bình thường)' :
                s.status === 'WARNING_NETWORK' ? 'Mạng chập chờn' :
                s.status === 'BROKEN_HARDWARE' ? 'Hỏng phần cứng' : 'Đang sửa chữa';
            
            const commentsText = s.studentComplaints.map(c => c.comment.replace(/"/g, '""')).join('; ') || 'Không có';
            const techNote = (s.technicianNote || 'Chưa có ghi chú').replace(/"/g, '""');

            csv += `${s.seatNumber},"${s.seatId}","${s.rowLabel}","${s.ipAddress}","${statusText}","${s.hardwareSpec}","${commentsText}","${techNote}","${s.lastUpdated || 'Gần đây'}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Bao_Cao_Phong_May_${selectedRoom.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleSaveActionAlert = () => {
        if (!editingActionAlert || !onUpdateAction) return;
        onUpdateAction(editingActionAlert.reviewId, editingActionAlert.status, editingActionAlert.note);
        setEditingActionAlert(null);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
                
                {/* HEADER */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
                            <Icons.Monitor className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-400/30">
                                    ITC INFRASTRUCTURE & LABS
                                </span>
                                <span className="text-[11px] text-slate-400">Hệ thống giám sát sơ đồ máy trạm & cảnh báo điểm nóng thiết bị</span>
                            </div>
                            <h2 className="text-base sm:text-lg font-black text-white">
                                TRUNG TÂM QUẢN LÝ PHÒNG MÁY & CƠ SỞ VẬT CHẤT
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {activeTabMode === 'SEAT_MAP' && (
                            <button
                                onClick={handleExportCSV}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-slate-200 transition"
                                title="Xuất bảng thống kê hiện trạng máy sang file CSV"
                            >
                                <Icons.Download className="w-3.5 h-3.5 text-sky-400" /> Xuất Báo Cáo
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition font-bold"
                        >
                            <Icons.X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* SUB-HEADER TAB SWITCHER */}
                <div className="bg-slate-900/90 px-6 py-2.5 flex items-center justify-between border-b border-slate-700 gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTabMode('SEAT_MAP')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                                activeTabMode === 'SEAT_MAP'
                                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}
                        >
                            <Icons.Monitor className="w-4 h-4" />
                            <span>Sơ Đồ Lưới Ghế Ngồi (32 Máy / Phòng)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTabMode('ALERTS')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 relative ${
                                activeTabMode === 'ALERTS'
                                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}
                        >
                            <Icons.AlertTriangle className="w-4 h-4 text-amber-300" />
                            <span>Cảnh Báo Bảo Trì & Điểm Nóng</span>
                            {alerts.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white ml-0.5">
                                    {alerts.length}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
                        {activeTabMode === 'SEAT_MAP' ? (
                            <span>Phòng đang chọn: <b className="text-white">{selectedRoom}</b></span>
                        ) : (
                            <span>Ngưỡng cảnh báo hiện hành: <b className="text-amber-400">{warningThreshold} sao</b></span>
                        )}
                    </div>
                </div>

                {/* VIEW 1: INTERACTIVE LAB SEAT MAP */}
                {activeTabMode === 'SEAT_MAP' && (
                    <>
                        {/* ROOM SELECTOR & STATUS FILTER BAR */}
                        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
                            {/* Room Tabs */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                                    <Icons.Building className="w-3.5 h-3.5" /> Chọn phòng:
                                </span>
                                {LAB_ROOMS.map(room => (
                                    <button
                                        key={room.id}
                                        onClick={() => {
                                            setSelectedRoom(room.id);
                                            setSelectedSeat(null);
                                        }}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                                            selectedRoom === room.id
                                                ? 'bg-itc-800 text-white shadow-xs'
                                                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                                        }`}
                                    >
                                        {room.name.split(' (')[0]}
                                    </button>
                                ))}
                            </div>

                            {/* Filter Status Selector */}
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-500">Lọc trạng thái:</span>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:border-itc-500"
                                >
                                    <option value="ALL">Tất cả máy ({stats.total})</option>
                                    <option value="GOOD">Bình thường ({stats.good})</option>
                                    <option value="WARNING_NETWORK">Mạng chập chờn ({stats.warning})</option>
                                    <option value="BROKEN_HARDWARE">Hỏng phần cứng ({stats.broken})</option>
                                    <option value="UNDER_REPAIR">Đang sửa chữa ({stats.repairing})</option>
                                </select>
                            </div>
                        </div>

                        {/* STATS STRIP & LEGEND */}
                        <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
                            {/* KPI Badges */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-slate-700">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                    <span>Hoạt động tốt: <b className="text-emerald-700">{stats.good}</b></span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-700">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                    <span>Mạng chập chờn: <b className="text-amber-700">{stats.warning}</b></span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-700">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                                    <span>Hỏng phần cứng: <b className="text-rose-700">{stats.broken}</b></span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-700">
                                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                                    <span>Đang bảo dưỡng: <b className="text-sky-700">{stats.repairing}</b></span>
                                </div>
                            </div>

                            <div className="text-[11px] text-slate-400 italic">
                                * Nhấp vào máy tính màu đỏ hoặc vàng để xem biên bản sự cố và cập nhật tiến độ sửa chữa.
                            </div>
                        </div>

                        {/* MAIN BODY: SEAT GRID + INSPECTOR DRAWER */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/70 flex flex-col lg:flex-row gap-5">
                            
                            {/* LEFT / CENTER: LAB FLOOR PLAN */}
                            <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                                
                                {/* TEACHER PODIUM / BỤC GIẢNG VIÊN */}
                                <div className="mb-6 flex flex-col items-center">
                                    <div className="w-full max-w-md bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 border-2 border-dashed border-slate-300 rounded-xl py-2 px-4 flex items-center justify-between text-slate-700 shadow-2xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-itc-800 text-white flex items-center justify-center font-bold text-xs">
                                                GV
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-wide">Bàn Giảng Viên & Máy Chủ Lab</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                                            <span className="flex items-center gap-1"><Icons.Wind className="w-3.5 h-3.5 text-sky-500" /> Điều hòa 1</span>
                                            <span>Máy chiếu 120"</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                        PHÍA BẢNG TRẮNG / MÁY CHIẾU TRUNG TÂM
                                    </span>
                                </div>

                                {/* SEAT GRID (4 ROWS x 8 COLUMNS) */}
                                <div className="space-y-4 my-2">
                                    {[1, 2, 3, 4].map(rowIndex => {
                                        const rowSeats = seatsData.filter(s => s.rowLabel === `Dãy ${rowIndex}`);
                                        return (
                                            <div key={rowIndex} className="space-y-1">
                                                <div className="flex items-center justify-between px-1">
                                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                                                        DÃY {rowIndex}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {rowSeats.length} máy
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                                                    {rowSeats.map(seat => {
                                                        const isSelected = selectedSeat?.seatId === seat.seatId;

                                                        let statusBg = 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100';
                                                        let badgeColor = 'bg-emerald-500';
                                                        let pulse = '';

                                                        if (seat.status === 'WARNING_NETWORK') {
                                                            statusBg = 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 shadow-xs';
                                                            badgeColor = 'bg-amber-500';
                                                        } else if (seat.status === 'BROKEN_HARDWARE') {
                                                            statusBg = 'bg-rose-50 border-rose-300 text-rose-900 hover:bg-rose-100 shadow-xs';
                                                            badgeColor = 'bg-rose-500';
                                                            pulse = 'animate-pulse ring-2 ring-rose-400';
                                                        } else if (seat.status === 'UNDER_REPAIR') {
                                                            statusBg = 'bg-sky-50 border-sky-300 text-sky-900 hover:bg-sky-100 shadow-xs';
                                                            badgeColor = 'bg-sky-500';
                                                        }

                                                        return (
                                                            <button
                                                                key={seat.seatId}
                                                                onClick={() => handleSelectSeat(seat)}
                                                                className={`relative p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${statusBg} ${pulse} ${
                                                                    isSelected ? 'ring-2 ring-slate-900 scale-105 z-10' : ''
                                                                }`}
                                                                title={`Nhấn xem chi tiết ${seat.seatId} - Trạng thái: ${seat.status}`}
                                                            >
                                                                {/* Status Dot */}
                                                                <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${badgeColor}`}></span>
                                                                
                                                                <Icons.Monitor className={`w-5 h-5 mb-1 ${
                                                                    seat.status === 'BROKEN_HARDWARE' ? 'text-rose-600' :
                                                                    seat.status === 'WARNING_NETWORK' ? 'text-amber-600' :
                                                                    seat.status === 'UNDER_REPAIR' ? 'text-sky-600' : 'text-emerald-600'
                                                                }`} />

                                                                <span className="text-[11px] font-black">{seat.seatId}</span>
                                                                <span className="text-[9px] opacity-70">Máy {seat.seatNumber}</span>

                                                                {seat.studentComplaints.length > 0 && (
                                                                    <span className="mt-0.5 text-[8px] font-extrabold px-1 rounded-sm bg-rose-200 text-rose-800">
                                                                        {seat.studentComplaints.length} phản ánh
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* REAR LAB: ENTRANCE DOOR & AC 2 */}
                                <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 font-semibold px-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-sm bg-slate-300"></span>
                                        <span>Cửa chính ra vào (Phía sau)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Icons.Wind className="w-3.5 h-3.5 text-sky-500" />
                                        <span>Điều hòa 2 (Dàn lạnh sau phòng)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Icons.Wifi className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>Access Point Wi-Fi: ITC_LAB05_5G</span>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: MACHINE INSPECTOR & WORK ORDER FORM */}
                            <div className="w-full lg:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between shrink-0">
                                {selectedSeat ? (
                                    <div className="space-y-4">
                                        {/* Header of Inspector */}
                                        <div className="border-b border-slate-200 pb-3 flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-black text-slate-900">{selectedSeat.seatId}</span>
                                                    <span className="text-xs font-bold text-slate-500">({selectedSeat.room})</span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-0.5">Địa chỉ IP: {selectedSeat.ipAddress}</p>
                                            </div>

                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                selectedSeat.status === 'GOOD' ? 'bg-emerald-100 text-emerald-800' :
                                                selectedSeat.status === 'WARNING_NETWORK' ? 'bg-amber-100 text-amber-800' :
                                                selectedSeat.status === 'BROKEN_HARDWARE' ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'
                                            }`}>
                                                {selectedSeat.status === 'GOOD' ? 'Tốt' :
                                                 selectedSeat.status === 'WARNING_NETWORK' ? 'Cảnh báo mạng' :
                                                 selectedSeat.status === 'BROKEN_HARDWARE' ? 'Hỏng phần cứng' : 'Đang sửa'}
                                            </span>
                                        </div>

                                        {/* Hardware Specs */}
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                CẤU HÌNH PHẦN CỨNG MÁY TRẠM
                                            </span>
                                            <p className="text-xs font-bold text-slate-700">{selectedSeat.hardwareSpec}</p>
                                            <p className="text-[11px] text-slate-500">Hệ điều hành: Windows 11 Education 64-bit | Đã cài VS Code, DevC++, Office 2021</p>
                                        </div>

                                        {/* Student Complaints for this seat */}
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                                                <span>Lịch sử phàn nàn từ sinh viên ({selectedSeat.studentComplaints.length})</span>
                                            </span>

                                            {selectedSeat.studentComplaints.length === 0 ? (
                                                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs text-emerald-700 flex items-center gap-2">
                                                    <Icons.CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                                                    <span>Máy hoạt động ổn định, không có ý kiến phản ánh lỗi.</span>
                                                </div>
                                            ) : (
                                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                                    {selectedSeat.studentComplaints.map((c, idx) => (
                                                        <div key={idx} className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-200 text-xs space-y-1">
                                                            <div className="flex items-center justify-between text-[10px] font-bold text-rose-800">
                                                                <span>Lớp {c.classCode} {c.mssv ? `(SV: ${c.mssv})` : ''}</span>
                                                                <span className="text-slate-400">{c.date}</span>
                                                            </div>
                                                            <p className="text-slate-700 text-xs italic">"{c.comment}"</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Technician Work Order Form */}
                                        <div className="border-t border-slate-200 pt-3 space-y-3">
                                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                                                BIÊN BẢN CỦA KỸ THUẬT VIÊN PHÒNG MÁY
                                            </span>

                                            {/* Status Radio Buttons */}
                                            <div>
                                                <label className="text-[11px] font-bold text-slate-600 block mb-1">Cập nhật hiện trạng:</label>
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditStatus('GOOD')}
                                                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition text-left flex items-center gap-1.5 ${
                                                            editStatus === 'GOOD' 
                                                                ? 'bg-emerald-100 border-emerald-400 text-emerald-900' 
                                                                : 'bg-slate-50 border-slate-200 text-slate-600'
                                                        }`}
                                                    >
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                        <span>Hoạt động tốt</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setEditStatus('WARNING_NETWORK')}
                                                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition text-left flex items-center gap-1.5 ${
                                                            editStatus === 'WARNING_NETWORK' 
                                                                ? 'bg-amber-100 border-amber-400 text-amber-900' 
                                                                : 'bg-slate-50 border-slate-200 text-slate-600'
                                                        }`}
                                                    >
                                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                        <span>Mạng chập chờn</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setEditStatus('BROKEN_HARDWARE')}
                                                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition text-left flex items-center gap-1.5 ${
                                                            editStatus === 'BROKEN_HARDWARE' 
                                                                ? 'bg-rose-100 border-rose-400 text-rose-900' 
                                                                : 'bg-slate-50 border-slate-200 text-slate-600'
                                                        }`}
                                                    >
                                                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                                        <span>Hỏng phần cứng</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setEditStatus('UNDER_REPAIR')}
                                                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition text-left flex items-center gap-1.5 ${
                                                            editStatus === 'UNDER_REPAIR' 
                                                                ? 'bg-sky-100 border-sky-400 text-sky-900' 
                                                                : 'bg-slate-50 border-slate-200 text-slate-600'
                                                        }`}
                                                    >
                                                        <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                                        <span>Đang bảo dưỡng</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Action Note */}
                                            <div>
                                                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                                    Ghi chú xử lý kỹ thuật:
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    value={editNote}
                                                    onChange={(e) => setEditNote(e.target.value)}
                                                    placeholder="VD: Đã thay chuột quang mới, bấm lại đầu cáp RJ45..."
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:border-itc-500 focus:bg-white"
                                                />
                                            </div>

                                            {saveSuccessMsg && (
                                                <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                                                    {saveSuccessMsg}
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                onClick={handleSaveTechnicianAction}
                                                className="w-full py-2 px-4 bg-itc-800 hover:bg-itc-900 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                                            >
                                                <Icons.Check className="w-4 h-4" /> Lưu Biên Bản & Cập Nhật
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                                            <Icons.Monitor className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-600">Chưa chọn máy tính nào</p>
                                            <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                                                Nhấp vào bất kỳ ô máy tính nào trên sơ đồ bên trái để xem biên bản kỹ thuật và cập nhật hiện trạng.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* VIEW 2: MAINTENANCE ALERTS & CRITICAL ISSUES */}
                {activeTabMode === 'ALERTS' && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* THRESHOLD ADJUSTMENT & SEARCH FILTER BAR */}
                        <div className="bg-slate-50 border-b border-slate-200 p-4 px-6 space-y-3 shrink-0">
                            {/* Equipment overview counters */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70 text-xs">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phân loại thiết bị lỗi:</span>
                                    <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 shadow-2xs">
                                        <Icons.Monitor className="w-3.5 h-3.5 text-blue-700" /> Máy tính & Ngoại vi: <b>{equipmentStats.pcCount}</b>
                                    </span>
                                    <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 shadow-2xs">
                                        <Icons.Wifi className="w-3.5 h-3.5 text-indigo-700" /> Mạng & Wi-Fi: <b>{equipmentStats.netCount}</b>
                                    </span>
                                    <span className="bg-cyan-50 text-cyan-800 border border-cyan-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 shadow-2xs">
                                        <Icons.Wind className="w-3.5 h-3.5 text-cyan-700" /> Điều hòa & Môi trường: <b>{equipmentStats.acCount}</b>
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setActiveTabMode('SEAT_MAP')}
                                    className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                                    title="Xem sơ đồ 32 máy tính thực tế của từng phòng máy"
                                >
                                    <Icons.Monitor className="w-3.5 h-3.5 text-amber-700" /> Xem Sơ đồ Ma trận Phòng máy &rarr;
                                </button>
                            </div>

                            {/* Warning threshold slider & quick presets */}
                            {setWarningThreshold && (
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-slate-700">Ngưỡng cảnh báo:</span>
                                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                            <span className="font-black text-rose-600 text-sm">{warningThreshold} sao</span>
                                            <input 
                                                type="range" 
                                                min="2.0" 
                                                max="4.0" 
                                                step="0.1" 
                                                value={warningThreshold} 
                                                onChange={(e) => setWarningThreshold(parseFloat(e.target.value))}
                                                className="w-32 accent-rose-600 cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[11px] font-semibold text-slate-400 mr-1">Mức nhanh:</span>
                                        {[
                                            { val: 2.1, label: '2.1 sao (Khẩn cấp)' },
                                            { val: 2.5, label: '2.5 sao (Nghiêm trọng)' },
                                            { val: 3.0, label: '3.0 sao (Tiêu chuẩn)' },
                                            { val: 3.5, label: '3.5 sao (Nâng cao)' }
                                        ].map(p => (
                                            <button
                                                key={p.val}
                                                onClick={() => setWarningThreshold(p.val)}
                                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition ${
                                                    warningThreshold === p.val 
                                                        ? 'bg-rose-600 text-white shadow-xs' 
                                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Filter category, room and search */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-1">
                                        {[
                                            { id: 'ALL', label: 'Tất cả vấn đề' },
                                            { id: 'FACILITY', label: 'Thiết bị & Phòng máy' },
                                            { id: 'TEACHING', label: 'Giảng dạy' }
                                        ].map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setAlertCategory(cat.id as any)}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                                    alertCategory === cat.id
                                                        ? 'bg-slate-900 text-white shadow-xs'
                                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                                        <span className="text-[11px] font-bold text-slate-500">Phòng:</span>
                                        <select
                                            value={alertRoomFilter}
                                            onChange={(e) => setAlertRoomFilter(e.target.value)}
                                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:border-itc-500 cursor-pointer"
                                        >
                                            <option value="ALL">Tất cả phòng ({alertRoomOptions.length})</option>
                                            {alertRoomOptions.map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="relative w-full sm:w-64">
                                    <input 
                                        type="text"
                                        placeholder="Tìm theo mã lớp, phòng, thiết bị..."
                                        value={searchAlertQuery}
                                        onChange={(e) => setSearchAlertQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-itc-500"
                                    />
                                    <span className="absolute left-2.5 top-2 text-slate-400">
                                        <Icons.Search className="w-3.5 h-3.5" />
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ALERTS LIST: GROUPED BY CLASS */}
                        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-50/70">
                            {filteredClassAlertGroups.length > 0 ? (
                                filteredClassAlertGroups.map((group) => {
                                    const hasMaintenance = group.alerts.some((a: any) => a.isMaintenance);
                                    const hasCritical = group.alerts.some((a: any) => (a.lowestScore ?? 5) <= 1.5 || Number(a.score) < 2.0);

                                    return (
                                        <div 
                                            key={group.classCode}
                                            className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:shadow-md"
                                        >
                                            {/* CLASS CARD HEADER */}
                                            <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex flex-wrap items-center gap-2.5">
                                                    <span className="font-black text-xs text-white bg-itc-800 px-2.5 py-1 rounded-lg shadow-2xs">
                                                        {group.classCode}
                                                    </span>
                                                    <span className="font-black text-slate-900 text-sm">
                                                        {group.courseName}
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 inline-flex items-center gap-1">
                                                        <Icons.Building className="w-3 h-3 text-slate-400" /> {group.room}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        • GV: <span className="font-medium text-slate-700">{group.teacherName}</span>
                                                    </span>
                                                    {group.academicYear && (
                                                        <span className="text-[11px] text-slate-400">
                                                            ({group.academicYear})
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {hasCritical ? (
                                                        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1 animate-pulse">
                                                            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                                                            Có sự cố khẩn cấp
                                                        </span>
                                                    ) : hasMaintenance ? (
                                                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                                                            Cần bảo trì thiết bị
                                                        </span>
                                                    ) : null}

                                                    <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                                        {group.alerts.length} cảnh báo
                                                    </span>

                                                    {onViewClassReviews && group.classId && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => onViewClassReviews(group.classId)}
                                                            className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-itc-800 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                                                        >
                                                            Xem phiếu lớp &rarr;
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* ALERTS LIST INSIDE THIS CLASS */}
                                            <div className="p-4 space-y-2.5">
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                    Danh sách các tiêu chí & thiết bị dưới ngưỡng (&lt; {warningThreshold} sao):
                                                </p>

                                                <div className="grid grid-cols-1 gap-2">
                                                    {group.alerts.map((alert: any) => {
                                                        const lowest = alert.lowestScore ?? Number(alert.score);
                                                        const isCrit = lowest <= 1.5 || Number(alert.score) < 2.0;

                                                        return (
                                                            <div 
                                                                key={alert.id}
                                                                className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2.5 ${
                                                                    isCrit 
                                                                        ? 'bg-rose-50/40 border-rose-200 text-rose-950' 
                                                                        : alert.isMaintenance 
                                                                            ? 'bg-amber-50/30 border-amber-200 text-amber-950' 
                                                                            : 'bg-slate-50 border-slate-200 text-slate-800'
                                                                }`}
                                                            >
                                                                <div className="flex items-center space-x-2.5">
                                                                    <div className="p-1.5 bg-white rounded-lg shadow-2xs border border-slate-200/80">
                                                                        {getAlertIcon(alert)}
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-bold text-xs">
                                                                                {alert.critName}
                                                                            </span>
                                                                            {alert.isMaintenance ? (
                                                                                <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                                                                    Thiết bị
                                                                                </span>
                                                                            ) : (
                                                                                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                                                                    Đào tạo
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-[11px] text-slate-500 italic line-clamp-1">
                                                                            {alert.fullQuestion || alert.critName}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Score Badge */}
                                                                <div className="flex items-center gap-3">
                                                                    <div className="text-right">
                                                                        <div className="flex items-baseline gap-1">
                                                                            <span className="text-[10px] text-slate-400 font-semibold">Điểm TB:</span>
                                                                            <span className={`text-sm font-black ${Number(alert.score) < 2.5 ? 'text-rose-600' : 'text-amber-600'}`}>
                                                                                {alert.score} / 5.0
                                                                            </span>
                                                                        </div>
                                                                        {alert.lowestScore !== undefined && alert.lowestScore < Number(alert.score) && (
                                                                            <span className="text-[10px] font-bold text-rose-600 block">
                                                                                Thấp nhất: {alert.lowestScore} / 5.0
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                                        isCrit ? 'bg-rose-600 text-white shadow-2xs' : 'bg-amber-100 text-amber-800'
                                                                    }`}>
                                                                        {isCrit ? 'Cần sửa ngay' : 'Cần bảo trì'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* STUDENT COMPLAINTS & FEEDBACK FOR THIS CLASS */}
                                                {group.studentComments && group.studentComments.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                                                        <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                                                            <Icons.Comments className="w-3.5 h-3.5 text-slate-400" />
                                                            Ý kiến phản ánh thực tế từ học viên lớp này ({group.studentComments.length}):
                                                        </p>
                                                        <div className="space-y-1.5">
                                                            {group.studentComments.map((c: any) => {
                                                                const assetMatch = (c.comment || '').match(/\[Vị trí thiết bị:\s*([^\]]+)\]/i);
                                                                const assetTag = assetMatch ? assetMatch[1].trim() : null;
                                                                const cleanComment = assetTag ? c.comment.replace(/\[Vị trí thiết bị:\s*[^\]]+\]/i, '').trim() : c.comment;

                                                                return (
                                                                    <div key={c.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 space-y-1.5">
                                                                        <div className="flex justify-between items-center text-[10px]">
                                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                                <span className="text-slate-400">{c.createdAt || 'Mới gửi'}</span>
                                                                                {assetTag && (
                                                                                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 font-bold px-2 py-0.5 rounded text-[10px]">
                                                                                        <Icons.Monitor className="w-3 h-3 text-amber-700" /> Vị trí: {assetTag}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={`font-bold px-2 py-0.5 rounded-full ${
                                                                                    c.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                                                                                    c.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                                                                                    'bg-rose-100 text-rose-800'
                                                                                }`}>
                                                                                    {c.status === 'RESOLVED' ? 'Đã khắc phục' : c.status === 'IN_PROGRESS' ? 'Đang sửa chữa' : 'Chờ tiếp nhận'}
                                                                                </span>
                                                                                <button 
                                                                                    type="button"
                                                                                    onClick={() => setEditingActionAlert({ reviewId: c.id, status: c.status || 'OPEN', note: c.actionNote || '', classCode: group.classCode })}
                                                                                    className="font-bold text-itc-800 hover:underline cursor-pointer"
                                                                                >
                                                                                    Xử lý &rarr;
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                        <p className="italic text-slate-700">"{cleanComment}"</p>
                                                                        {c.actionNote && (
                                                                            <p className="text-[11px] text-emerald-700 bg-emerald-50 p-1.5 rounded-lg border border-emerald-100 font-medium">
                                                                                <b>Biện pháp khắc phục:</b> {c.actionNote}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                /* EMPTY STATE WHEN NO ALERTS BELOW THRESHOLD */
                                <div className="text-center py-12 px-4 bg-emerald-50/60 border border-emerald-200 rounded-3xl space-y-4">
                                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                                        <Icons.CheckCircle className="w-8 h-8" />
                                    </div>
                                    <div className="max-w-md mx-auto space-y-1">
                                        <h4 className="font-black text-emerald-950 text-base">
                                            Tất cả các lớp hiện tại đều đạt chuẩn!
                                        </h4>
                                        <p className="text-xs text-emerald-800/90 leading-relaxed">
                                            Không có lớp hay thiết bị nào bị đánh giá dưới ngưỡng <b>{warningThreshold} sao</b>.
                                        </p>
                                    </div>

                                    {setWarningThreshold && (
                                        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 max-w-md mx-auto text-left space-y-2 shadow-2xs">
                                            <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                <Icons.Check className="w-3.5 h-3.5 text-emerald-600" /> Gợi ý điều chỉnh ngưỡng:
                                            </p>
                                            <p className="text-xs text-slate-600">
                                                Bạn có thể nâng ngưỡng lên <b>3.0 sao</b> hoặc <b>3.5 sao</b> ở thanh trượt phía trên để kiểm tra các phòng máy có điểm chưa cao nhằm lên kế hoạch bảo dưỡng định kỳ.
                                            </p>
                                            <div className="pt-1 flex justify-center">
                                                <button 
                                                    type="button"
                                                    onClick={() => setWarningThreshold(3.2)}
                                                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
                                                >
                                                    Đặt ngưỡng rà soát 3.2 sao &rarr;
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MODAL FOOTER */}
                <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                        Hệ thống Sơ đồ Phòng máy ITC - Đại học Đà Lạt | Tự động đồng bộ với Báo cáo & Khảo sát sinh viên
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                    >
                        Đóng
                    </button>
                </div>
            </div>

            {/* ACTION MODAL TO UPDATE PROGRESS / MAINTENANCE TICKET IN ALERTS TAB */}
            {editingActionAlert && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 z-60 animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-black text-slate-900 text-sm">Cập nhật Phiếu Bảo trì / Xử lý</h4>
                                <p className="text-xs text-slate-500 mt-0.5">Lớp: <span className="font-bold text-itc-800">{editingActionAlert.classCode}</span></p>
                            </div>
                            <button onClick={() => setEditingActionAlert(null)} className="text-slate-400 hover:text-slate-600">
                                <Icons.X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái xử lý sự cố:</label>
                                <select 
                                    value={editingActionAlert.status}
                                    onChange={(e) => setEditingActionAlert({ ...editingActionAlert, status: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 font-bold focus:outline-none focus:ring-1 focus:ring-itc-500"
                                >
                                    <option value="OPEN">Chờ tiếp nhận xử lý</option>
                                    <option value="IN_PROGRESS">Đang kiểm tra / sửa chữa bảo trì</option>
                                    <option value="RESOLVED">Đã sửa chữa / hoàn tất khắc phục</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú hành động bảo trì:</label>
                                <textarea 
                                    rows={3}
                                    value={editingActionAlert.note}
                                    onChange={(e) => setEditingActionAlert({ ...editingActionAlert, note: e.target.value })}
                                    placeholder="Nhập phương án sửa chữa, thay thế vật tư hoặc liên hệ KTV..."
                                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-itc-500 focus:bg-white"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-2">
                                <button 
                                    onClick={() => setEditingActionAlert(null)}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                >
                                    Hủy
                                </button>
                                <button 
                                    onClick={handleSaveActionAlert}
                                    className="px-4 py-1.5 text-xs font-bold text-white bg-itc-800 hover:bg-itc-900 rounded-lg shadow-xs transition"
                                >
                                    Lưu Thay Đổi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

