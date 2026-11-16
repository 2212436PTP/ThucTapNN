"use client";

import React, { useState, useMemo } from 'react';
import { Icons } from './Icons';
import { Course } from '../../types';

interface QualityBarChartProps {
    courses: Course[];
    classMetrics: Record<string, any>;
    warningThreshold: number;
    onSelectClass?: (classCode: string) => void;
    onSelectCourse?: (courseId: string) => void;
}

export const QualityBarChart: React.FC<QualityBarChartProps> = ({
    courses = [],
    classMetrics = {},
    warningThreshold = 3.0,
    onSelectClass,
    onSelectCourse
}) => {
    const [viewMode, setViewMode] = useState<'COURSE' | 'CLASS'>('COURSE');
    const [scoreType, setScoreType] = useState<'OVERALL' | 'FACILITY'>('OVERALL');
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Dữ liệu theo Môn học (Courses)
    const courseStats = useMemo(() => {
        return courses.map(course => {
            const relatedMetrics = Object.values(classMetrics).filter((cm: any) => 
                cm.classInfo?.courseId === course.id || cm.classInfo?.course_id === course.id
            );

            const totalReviews = relatedMetrics.reduce((sum: number, cm: any) => sum + (cm.count || 0), 0);
            
            const validOverallScores = relatedMetrics
                .map((cm: any) => parseFloat(cm.overallAvg))
                .filter(v => !isNaN(v) && v > 0);
            
            const avgOverall = validOverallScores.length > 0
                ? Number((validOverallScores.reduce((a, b) => a + b, 0) / validOverallScores.length).toFixed(1))
                : 0;

            const validFacilityScores = relatedMetrics
                .map((cm: any) => cm.criteriaAvgs?.facility || cm.criteriaAvgs?.group_3 || 0)
                .filter(v => v > 0);

            const avgFacility = validFacilityScores.length > 0
                ? Number((validFacilityScores.reduce((a, b) => a + b, 0) / validFacilityScores.length).toFixed(1))
                : 0;

            return {
                id: course.id,
                code: course.code || course.id,
                name: course.name,
                classCount: relatedMetrics.length,
                totalReviews,
                score: scoreType === 'OVERALL' ? avgOverall : avgFacility,
                avgOverall,
                avgFacility
            };
        });
    }, [courses, classMetrics, scoreType]);

    // Dữ liệu theo Lớp học (Classes)
    const classStats = useMemo(() => {
        return Object.values(classMetrics).map((cm: any) => {
            const avgOverall = parseFloat(cm.overallAvg) || 0;
            const avgFacility = Number((cm.criteriaAvgs?.facility || cm.criteriaAvgs?.group_3 || 0).toFixed(1));

            return {
                id: cm.classInfo?.id || cm.classInfo?.code,
                code: cm.classInfo?.code || 'Lớp',
                name: `${cm.classInfo?.code} - ${cm.courseName}`,
                courseId: cm.classInfo?.courseId,
                room: cm.classInfo?.room || 'Chưa xếp phòng',
                teacherName: cm.teacherNames || 'Chưa phân công',
                totalReviews: cm.count || 0,
                score: scoreType === 'OVERALL' ? avgOverall : avgFacility,
                avgOverall,
                avgFacility
            };
        });
    }, [classMetrics, scoreType]);

    const activeList = viewMode === 'COURSE' ? courseStats : classStats;

    // Tính toán chỉ số tóm tắt biểu đồ
    const chartSummary = useMemo(() => {
        const scores = activeList.map(item => item.score).filter(s => s > 0);
        if (scores.length === 0) return { avg: 0, high: 0, warning: 0, critical: 0 };

        const avg = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
        const high = activeList.filter(i => i.score >= 4.0).length;
        const warning = activeList.filter(i => i.score >= warningThreshold && i.score < 4.0).length;
        const critical = activeList.filter(i => i.score > 0 && i.score < warningThreshold).length;

        return { avg, high, warning, critical };
    }, [activeList, warningThreshold]);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 transition-all mb-6">
            {/* Header: Title & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-itc-50 border border-itc-200 flex items-center justify-center text-itc-800">
                        <Icons.TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-tight">
                                Biểu đồ Thống kê Tương quan Điểm số & Chất lượng
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-itc-100 text-itc-800 border border-itc-200">
                                {viewMode === 'COURSE' ? `${courseStats.length} Môn học` : `${classStats.length} Lớp học`}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            So sánh trực quan điểm đánh giá trung bình giữa các môn học và lớp đào tạo tại Trung tâm ITC
                        </p>
                    </div>
                </div>

                {/* View Switchers */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Chế độ xem: Theo Môn / Theo Lớp */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                        <button
                            type="button"
                            onClick={() => {
                                setViewMode('COURSE');
                                setHoveredIndex(null);
                            }}
                            className={`px-3 py-1.5 rounded-lg transition ${
                                viewMode === 'COURSE' 
                                    ? 'bg-white text-itc-900 shadow-2xs' 
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Theo Môn học
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setViewMode('CLASS');
                                setHoveredIndex(null);
                            }}
                            className={`px-3 py-1.5 rounded-lg transition ${
                                viewMode === 'CLASS' 
                                    ? 'bg-white text-itc-900 shadow-2xs' 
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Theo Lớp học
                        </button>
                    </div>

                    {/* Tiêu chí điểm: Điểm chung / Cơ sở vật chất */}
                    <select
                        value={scoreType}
                        onChange={(e) => setScoreType(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-itc-500"
                    >
                        <option value="OVERALL">Điểm Hài Lòng Chung (5 Nhóm)</option>
                        <option value="FACILITY">Điểm Cơ Sở Vật Chất & Phòng Máy</option>
                    </select>
                </div>
            </div>

            {/* Quick KPI Counters for Chart */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
                    <span className="text-slate-500 font-semibold text-[11px]">Điểm TB Biểu đồ:</span>
                    <span className="font-black text-slate-800 text-sm">{chartSummary.avg} / 5.0</span>
                </div>
                <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80 flex items-center justify-between">
                    <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đạt chuẩn cao (≥ 4.0):
                    </span>
                    <span className="font-black text-emerald-800 text-sm">{chartSummary.high}</span>
                </div>
                <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/80 flex items-center justify-between">
                    <span className="text-amber-700 font-semibold text-[11px] flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> Mức an toàn (≥ {warningThreshold}):
                    </span>
                    <span className="font-black text-amber-800 text-sm">{chartSummary.warning}</span>
                </div>
                <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-200/80 flex items-center justify-between">
                    <span className="text-rose-700 font-semibold text-[11px] flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span> Cần lưu ý (&lt; {warningThreshold}):
                    </span>
                    <span className="font-black text-rose-800 text-sm">{chartSummary.critical}</span>
                </div>
            </div>

            {/* BAR CHART CANVAS (Responsive SVG + HTML Bars) */}
            <div className="relative pt-6 pb-2">
                {/* Horizontal Threshold Reference Line */}
                <div 
                    className="absolute left-10 right-4 border-b-2 border-dashed border-rose-400 z-10 pointer-events-none flex items-center justify-end"
                    style={{ bottom: `${(warningThreshold / 5.0) * 190 + 36}px` }}
                >
                    <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-200 shadow-2xs -translate-y-3">
                        Ngưỡng cảnh báo: {warningThreshold}★
                    </span>
                </div>

                {/* Horizontal Grid lines at 5.0, 4.0, 3.0, 2.0, 1.0 */}
                <div className="relative h-48 pl-10 pr-4 flex flex-col justify-between border-l border-b border-slate-200">
                    {[5.0, 4.0, 3.0, 2.0, 1.0].map((level) => (
                        <div key={level} className="relative w-full border-t border-slate-100 flex items-center">
                            <span className="absolute -left-9 text-[10px] font-bold text-slate-400 -translate-y-1/2">
                                {level.toFixed(1)}
                            </span>
                        </div>
                    ))}

                    {/* Bars Container */}
                    <div className="absolute inset-0 pl-10 pr-4 flex items-end justify-around gap-2 sm:gap-4 pb-0.5">
                        {activeList.map((item, idx) => {
                            const isHovered = hoveredIndex === idx;
                            const score = item.score;
                            const heightPercent = score > 0 ? (score / 5.0) * 100 : 8;

                            let barColor = 'bg-emerald-500 hover:bg-emerald-600';
                            let textColor = 'text-emerald-700';
                            let badgeBorder = 'border-emerald-200 bg-emerald-50';

                            if (score === 0) {
                                barColor = 'bg-slate-200';
                                textColor = 'text-slate-400';
                                badgeBorder = 'border-slate-200 bg-slate-50';
                            } else if (score < warningThreshold) {
                                barColor = 'bg-rose-500 hover:bg-rose-600 animate-pulse';
                                textColor = 'text-rose-700';
                                badgeBorder = 'border-rose-200 bg-rose-50';
                            } else if (score < 4.0) {
                                barColor = 'bg-amber-500 hover:bg-amber-600';
                                textColor = 'text-amber-700';
                                badgeBorder = 'border-amber-200 bg-amber-50';
                            }

                            return (
                                <div
                                    key={item.id || idx}
                                    className="flex-1 max-w-[80px] h-full flex flex-col items-center justify-end relative group cursor-pointer"
                                    onMouseEnter={() => setHoveredIndex(idx)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    onClick={() => {
                                        if (viewMode === 'CLASS' && onSelectClass) {
                                            onSelectClass(item.code);
                                        } else if (viewMode === 'COURSE' && onSelectCourse) {
                                            onSelectCourse(item.id);
                                        }
                                    }}
                                >
                                    {/* Score pill on top of bar */}
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded mb-1 border ${badgeBorder} ${textColor} transition-transform group-hover:scale-110 shadow-2xs`}>
                                        {score > 0 ? `${score}★` : 'N/A'}
                                    </span>

                                    {/* The animated vertical bar */}
                                    <div
                                        className={`w-full rounded-t-lg transition-all duration-300 shadow-2xs ${barColor} ${
                                            isHovered ? 'ring-2 ring-slate-800 scale-102 brightness-110' : ''
                                        }`}
                                        style={{ height: `${heightPercent}%` }}
                                    />

                                    {/* Tooltip on hover */}
                                    {isHovered && (
                                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-2 rounded-xl text-[11px] shadow-xl z-30 whitespace-nowrap pointer-events-none animate-fadeIn">
                                            <p className="font-bold">{item.name}</p>
                                            <p className="text-slate-300 text-[10px]">
                                                Điểm: <b className="text-amber-400">{score} / 5.0</b> • Lượt đánh giá: <b>{item.totalReviews}</b>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* X-Axis Labels */}
                <div className="pl-10 pr-4 flex items-start justify-around gap-2 sm:gap-4 mt-2">
                    {activeList.map((item, idx) => (
                        <div key={item.id || idx} className="flex-1 max-w-[80px] text-center">
                            <span 
                                className="text-[10px] font-bold text-slate-700 block truncate hover:text-itc-800"
                                title={item.name}
                            >
                                {item.code}
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                                {item.totalReviews} phiếu
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Insight & Legend */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] font-semibold text-slate-500">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-emerald-500"></span> Đạt chuẩn cao (≥ 4.0★)
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-amber-500"></span> Bình thường (≥ {warningThreshold}★)
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-rose-500"></span> Dưới ngưỡng (&lt; {warningThreshold}★)
                    </span>
                </div>

                <div className="text-[11px] text-slate-400 italic">
                    * Nhấp vào từng cột để xem chi tiết hoặc lọc theo lớp/môn học.
                </div>
            </div>
        </div>
    );
};
