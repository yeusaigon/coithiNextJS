'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/app/admin/layout';
import { db } from '@/lib/firebase';
import { useDelayedBoolean } from '@/hooks/useDelayedBoolean';
import { collection, onSnapshot, query, orderBy, getDoc, doc, deleteDoc } from 'firebase/firestore';
import { Schedule } from '@/lib/export';
import { FiMenu, FiChevronUp, FiCalendar, FiClock, FiEdit3, FiTrash2, FiInfo, FiX, FiCheckCircle } from 'react-icons/fi';
import { FaBookOpen, FaChartBar } from 'react-icons/fa6';
import { FaHistory } from 'react-icons/fa';

const DEFAULT_SCHOOL_TIME_MAP: Record<number, { start: string; end: string }> = {
  1: { start: "06:30", end: "07:20" },
  2: { start: "07:20", end: "08:10" },
  3: { start: "08:10", end: "09:00" },
  4: { start: "09:10", end: "10:00" },
  5: { start: "10:00", end: "10:50" },
  6: { start: "10:50", end: "11:40" },
  7: { start: "12:30", end: "13:20" },
  8: { start: "13:20", end: "14:10" },
  9: { start: "14:10", end: "15:00" },
  10: { start: "15:10", end: "16:00" },
  11: { start: "16:00", end: "16:50" },
  12: { start: "16:50", end: "17:40" },
  13: { start: "18:00", end: "18:50" },
  14: { start: "18:50", end: "19:40" },
  15: { start: "19:50", end: "20:40" },
  16: { start: "20:40", end: "21:30" }
};

interface MonthlyStat {
  dateObject: Date;
  monthLabel: string;
  sessions: number;
  periods: number;
}

export default function StatsPage() {
  const { user } = useAuth();
  const { toggleSidebar } = useSidebar();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const showSkeleton = useDelayedBoolean(loading, 1000);
  const [school, setSchool] = useState('iuh');
  const [customTimeMap, setCustomTimeMap] = useState<Record<number, { start: string; end: string }>>({});
  const [showToTop, setShowToTop] = useState(false);
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState('all');
  const [isHistoryMonthMenuOpen, setIsHistoryMonthMenuOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const historyFilterRef = useRef<HTMLDivElement>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'history' | 'summary'>('history');

  // Sorting state
  const [sortColumn, setSortColumn] = useState<'date' | 'sessions' | 'periods'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const getActiveTimeMap = () => {
    return school === 'custom' ? customTimeMap : DEFAULT_SCHOOL_TIME_MAP;
  };

  const getEndDateTime = useCallback((schedule: Schedule) => {
    const timeMap = school === 'custom' ? customTimeMap : DEFAULT_SCHOOL_TIME_MAP;
    const endTimeString = timeMap[schedule.endPeriod]?.end;
    const d = typeof schedule.examDate.toDate === 'function' ? schedule.examDate.toDate() : new Date(schedule.examDate);
    if (!endTimeString) {
      const fallbackDate = new Date(d.getTime());
      fallbackDate.setHours(23, 59, 59, 999);
      return fallbackDate;
    }
    const [h, m] = endTimeString.split(':').map(Number);
    const resolvedDate = new Date(d.getTime());
    resolvedDate.setHours(h, m, 0, 0);
    return resolvedDate;
  }, [school, customTimeMap]);

  // Logic màu sắc theo phong cách thanh lịch của Google
  const getCardDateDetails = (schedule: Schedule) => {
    const d = typeof schedule.examDate.toDate === 'function' ? schedule.examDate.toDate() : new Date(schedule.examDate);
    const day = d.getDay();
    const dateNum = d.getDate();
    const dayLabel = day === 0 ? 'CN' : day === 6 ? 'T7' : `T${day + 1}`;

    // Cuối tuần sử dụng màu đỏ mượt (Google Red 600), ngày thường dùng màu xám đậm (Google Grey 800)
    const isWeekend = day === 0 || day === 6;
    const colorClass = isWeekend ? 'text-[#d93025]' : 'text-[#202124]';
    const bgClass = isWeekend ? 'bg-red-50/50' : 'bg-transparent';

    return { dateNum, dayLabel, colorClass, bgClass };
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowToTop(e.currentTarget.scrollTop > 200);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (historyFilterRef.current && !historyFilterRef.current.contains(event.target as Node)) {
        setIsHistoryMonthMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsHistoryMonthMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadSchoolSetting = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid, 'settings', 'school'));
      if (snap.exists()) {
        const d = snap.data();
        setSchool(d.school || 'iuh');
        if (d.customMap) setCustomTimeMap(d.customMap);
      }
    };
    loadSchoolSetting();

    const q = query(collection(db, 'users', user.uid, 'schedules'), orderBy("examDate", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSchedules = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Schedule));
      setSchedules(fetchedSchedules);
      setLoading(false);

      setSelectedHistoryMonth(prev => {
        if (prev !== 'all') return prev;
        const referenceNow = new Date();
        const pastItems = fetchedSchedules.filter(s => getEndDateTime(s) < referenceNow);
        if (pastItems.length === 0) return prev;

        const months = pastItems.map(s => {
          const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        });
        const uniqueMonths = Array.from(new Set(months)).sort().reverse();
        return uniqueMonths[0] || prev;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [user, getEndDateTime]);

  const handleScrollToTop = () => {
    const container = document.getElementById('stats-scroll-container');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // --- STATS LOGIC ---
  const now = new Date();
  const pastSchedules = schedules.filter(s => getEndDateTime(s) < now);

  const monthlyStats: MonthlyStat[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;

    const schedulesInMonth = pastSchedules.filter(s => {
      const examDate = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
      return examDate.getMonth() === d.getMonth() && examDate.getFullYear() === d.getFullYear();
    });

    const sessionsCount = schedulesInMonth.reduce((acc, s) => {
      if (s.type === 'session' && s.examSession) {
        return acc + s.examSession.split(',').length;
      }
      return acc + 1;
    }, 0);

    const monthlyPeriods = schedulesInMonth.reduce((acc, s) => acc + (s.endPeriod - s.startPeriod + 1), 0);

    monthlyStats.push({
      dateObject: d,
      monthLabel: monthLabel,
      sessions: sessionsCount,
      periods: monthlyPeriods
    });
  }

  const recentMonthlyStats = monthlyStats.slice(-6);

  const handleSort = (column: 'date' | 'sessions' | 'periods') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedStats = [...recentMonthlyStats].sort((a, b) => {
    let valA: number;
    let valB: number;

    if (sortColumn === 'date') {
      valA = a.dateObject.getTime();
      valB = b.dateObject.getTime();
    } else {
      valA = a[sortColumn];
      valB = b[sortColumn];
    }

    if (sortDirection === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });

  const totalSessions = recentMonthlyStats.reduce((acc, item) => acc + item.sessions, 0);
  const totalPeriods = recentMonthlyStats.reduce((acc, item) => acc + item.periods, 0);

  const getSortIndicator = (col: 'date' | 'sessions' | 'periods') => {
    if (sortColumn === col) {
      return sortDirection === 'asc' ? '▲' : '▼';
    }
    return '↕';
  };

  const historyMonths = Array.from(new Set(
    pastSchedules.map(s => {
      const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })
  )).sort().reverse();

  const selectedHistoryMonthLabel = (() => {
    if (selectedHistoryMonth === 'all') return 'Tất cả thời gian';
    const [year, month] = selectedHistoryMonth.split('-');
    return `Tháng ${parseInt(month)} năm ${year}`;
  })();

  const filteredHistorySchedules = pastSchedules.filter(s => {
    if (selectedHistoryMonth !== 'all') {
      const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key !== selectedHistoryMonth) return false;
    }

    return true;
  });

  const groupedHistory = filteredHistorySchedules.reduce((groups, schedule) => {
    const d = typeof schedule.examDate.toDate === 'function' ? schedule.examDate.toDate() : new Date(schedule.examDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(schedule);
    return groups;
  }, {} as Record<string, Schedule[]>);

  const groupedHistoryEntries = Object.entries(groupedHistory).sort((a, b) => b[0].localeCompare(a[0]));

  const handleOpenDeleteConfirm = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteSchedule = async () => {
    if (!user || !selectedSchedule) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'schedules', selectedSchedule.id));
      setIsDeleteConfirmOpen(false);
      setSelectedSchedule(null);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      {/* CSS cho hiệu ứng load và tab mượt mà */}
      <style>{`
        @keyframes softReveal {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-soft-reveal {
          animation: softReveal 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 lg:px-8 flex-shrink-0 z-20 sticky top-0 transition-shadow">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleSidebar}
            className="text-slate-500 hover:text-slate-800 lg:hidden focus:outline-none p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <FiMenu className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block">Thống kê</span>
            <h1 className="text-base sm:text-lg font-bold text-[#202124] tracking-tight cursor-default">Phân tích & Thống kê</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div
        id="stats-scroll-container"
        onScroll={handleScroll}
        className="admin-page flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 scroll-smooth bg-[#F2F2F7]"
      >
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto">

          {/* SKELETON LOADER */}
          {loading && showSkeleton && (
            <div className="space-y-6 animate-pulse px-1 sm:px-0">
              <div className="h-12 w-64 bg-slate-200/80 rounded-2xl" />
              <div className="bg-white p-6 h-[32rem] rounded-2xl border border-slate-200/50" />
            </div>
          )}

          {!loading && (
            <>
              {/* ======================================================== */}
              {/* TAB NAVIGATION - ĐỒNG BỘ THIẾT KẾ (PILL / SEGMENTED CONTROL) */}
              {/* ======================================================== */}
              <div className="mb-4 sm:mb-6 animate-[fadeIn_0.3s_ease-out] flex overflow-x-auto hide-scrollbar">
                <div className="inline-flex items-center p-1.5 bg-[#f1f5f9] rounded-2xl flex-shrink-0">
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 text-[13px] sm:text-sm transition-all duration-200 rounded-xl whitespace-nowrap outline-none ${activeTab === 'history'
                        ? 'bg-white text-[#111827] font-bold shadow-sm'
                        : 'text-[#64748b] hover:text-[#334155] font-semibold'
                      }`}
                  >
                    <FaHistory className={`h-4 w-4 ${activeTab === 'history' ? 'text-[#111827]' : 'text-[#94a3b8]'}`} />
                    Lịch sử coi thi
                  </button>
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`flex items-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 text-[13px] sm:text-sm transition-all duration-200 rounded-xl whitespace-nowrap outline-none ${activeTab === 'summary'
                        ? 'bg-white text-[#111827] font-bold shadow-sm'
                        : 'text-[#64748b] hover:text-[#334155] font-semibold'
                      }`}
                  >
                    <FaChartBar className={`h-4 w-4 ${activeTab === 'summary' ? 'text-[#111827]' : 'text-[#94a3b8]'}`} />
                    Bảng tổng hợp 6 tháng
                  </button>
                </div>
              </div>

              {/* Dùng key để reset và re-trigger animation khi chuyển tab */}
              <div key={activeTab} className="animate-soft-reveal">

                {/* ======================================================== */}
                {/* TAB 1: LỊCH SỬ COI THI                                   */}
                {/* ======================================================== */}
                {activeTab === 'history' && (
                  <div className="bg-white rounded-2xl sm:rounded-[24px] border border-[#dadce0] overflow-hidden transition-shadow hover:shadow-[0_1px_3px_rgba(60,64,67,0.1)]">
                    {/* Header Card */}
                    <div className="border-b border-[#dadce0] px-3 py-3 sm:px-6 sm:py-5 bg-white relative z-20">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-50 text-[#1a73e8] flex-shrink-0">
                            <FiCalendar className="h-4 w-4 sm:h-5 sm:w-5" />
                          </div>
                          <div>
                            <h2 className="text-base sm:text-xl font-bold text-[#202124] leading-tight">Lịch sử coi thi</h2>
                            <p className="text-[11px] sm:text-sm font-normal text-[#5f6368] mt-0.5">Dòng thời gian các ca thi đã hoàn thành</p>
                          </div>
                        </div>

                        <div className="relative self-start sm:self-auto" ref={historyFilterRef}>
                          <button
                            type="button"
                            onClick={() => setIsHistoryMonthMenuOpen(prev => !prev)}
                            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-[#dadce0] bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-sm font-medium text-[#3c4043] transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                          >
                            <span>{selectedHistoryMonthLabel}</span>
                            <FiChevronUp className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#5f6368] transition-transform ${isHistoryMonthMenuOpen ? '' : 'rotate-180'}`} />
                          </button>

                          {isHistoryMonthMenuOpen && (
                            <div className="absolute right-0 top-10 sm:top-12 z-50 w-48 sm:w-56 rounded-lg border border-[#dadce0] bg-white py-1.5 sm:py-2 shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)] origin-top-right animate-[fadeIn_0.15s_ease-out]">
                              <div className="max-h-56 sm:max-h-64 overflow-y-auto">
                                {historyMonths.map(m => {
                                  const [year, month] = m.split('-');
                                  const label = `Tháng ${parseInt(month)} năm ${year}`;
                                  const active = selectedHistoryMonth === m;
                                  return (
                                    <button
                                      key={m}
                                      type="button"
                                      onClick={() => {
                                        setSelectedHistoryMonth(m);
                                        setIsHistoryMonthMenuOpen(false);
                                      }}
                                      className={`flex w-full items-center justify-between px-3 py-2 sm:px-4 sm:py-2 text-left text-[11px] sm:text-sm transition-colors hover:bg-slate-100 ${active ? 'bg-blue-50/50 text-[#1a73e8] font-medium' : 'text-[#3c4043]'}`}
                                    >
                                      <span>{label}</span>
                                      {active && <span className="text-[#1a73e8]"><FiCheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></span>}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="bg-white min-h-[150px]" key={selectedHistoryMonth}>
                      <div className="animate-soft-reveal">
                        {filteredHistorySchedules.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 sm:py-20 px-4 text-center">
                            <div className="mb-3 sm:mb-4 inline-flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-slate-50 text-[#5f6368]">
                              <FiInfo className="h-6 w-6 sm:h-8 sm:w-8" />
                            </div>
                            <h3 className="text-sm sm:text-base font-medium text-[#202124]">Không có dữ liệu</h3>
                            <p className="mt-1.5 sm:mt-2 max-w-sm text-[11px] sm:text-sm text-[#5f6368]">
                              Bạn chưa có lịch sử coi thi nào trong khoảng thời gian này.
                            </p>
                          </div>
                        ) : (
                          <div className="py-2">
                            {groupedHistoryEntries.map(([monthKey, group]) => {
                              const [year, month] = monthKey.split('-');
                              const monthLabel = `Tháng ${parseInt(month)}, ${year}`;

                              return (
                                <div key={monthKey} className="mb-4 sm:mb-6 last:mb-0">
                                  {/* Month Separator */}
                                  <div className="sticky top-[56px] sm:top-[64px] z-10 bg-white/95 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 border-y border-[#dadce0] mt-1 sm:mt-2 mb-2 sm:mb-4">
                                    <span className="text-[11px] sm:text-sm font-medium text-[#3c4043]">
                                      {monthLabel}
                                    </span>
                                  </div>

                                  {/* Timeline List */}
                                  <div className="space-y-2 sm:space-y-3 px-2 sm:px-6">
                                    {group.map((s, index) => {
                                      const { dateNum, dayLabel, colorClass, bgClass } = getCardDateDetails(s);
                                      const timeMap = getActiveTimeMap();
                                      const sTime = timeMap[s.startPeriod]?.start;
                                      const eTime = timeMap[s.endPeriod]?.end;

                                      const prevSchedule = index > 0 ? group[index - 1] : null;
                                      const showDate = !prevSchedule ||
                                        new Date(prevSchedule.examDate.toDate ? prevSchedule.examDate.toDate() : prevSchedule.examDate).getDate() !== dateNum;

                                      return (
                                        <div key={s.id} className="group relative flex items-stretch gap-2.5 sm:gap-4">

                                          {/* Left Column: Date & Timeline */}
                                          <div className="relative w-10 sm:w-16 flex-shrink-0 flex flex-col items-center">
                                            <div className="absolute top-0 bottom-[-8px] sm:bottom-[-12px] left-1/2 -translate-x-1/2 w-[1px] bg-[#e8eaed] group-last:bottom-0"></div>

                                            {showDate ? (
                                              <div className={`relative z-10 flex flex-col items-center justify-center w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white border border-[#dadce0] mt-1 ${bgClass}`}>
                                                <span className={`text-sm sm:text-xl font-normal leading-none ${colorClass}`}>{dateNum}</span>
                                                <span className={`text-[8px] sm:text-[10px] font-medium uppercase mt-0.5 ${colorClass}`}>{dayLabel}</span>
                                              </div>
                                            ) : (
                                              <div className="relative z-10 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#dadce0] mt-4 sm:mt-5 border-2 border-white"></div>
                                            )}
                                          </div>

                                          {/* Right Column: Google Material Card */}
                                          <div className="flex-1 pb-2 sm:pb-3 pr-2 sm:pr-0">
                                            <div className="relative rounded-xl border border-[#dadce0] bg-white p-2.5 sm:p-4 transition-all hover:shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] group-hover:border-transparent overflow-hidden">

                                              <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#1a73e8] opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-4">
                                                <div className="space-y-2 sm:space-y-3 flex-1 min-w-0">

                                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                    <h4 className="text-sm sm:text-base font-medium text-[#202124] leading-tight">
                                                      {s.subject}
                                                    </h4>
                                                    {s.isPriority && (
                                                      <span className="inline-flex items-center rounded bg-[#fce8e6] px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-[9px] sm:text-[11px] font-medium text-[#d93025]">
                                                        Ưu tiên
                                                      </span>
                                                    )}
                                                  </div>

                                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm">
                                                    <div className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full border border-[#dadce0] bg-white px-2 py-0.5 sm:px-3 sm:py-1 text-[#3c4043] transition-colors hover:bg-slate-50">
                                                      <FiClock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#5f6368]" />
                                                      <span className="font-medium text-[10px] sm:text-xs">
                                                        {s.type === 'session' ? (
                                                          `Buổi ${s.examSession}`
                                                        ) : (
                                                          `Tiết ${s.startPeriod} - ${s.endPeriod} ${sTime && eTime ? `(${sTime} - ${eTime})` : ''}`
                                                        )}
                                                      </span>
                                                    </div>

                                                    {s.note && (
                                                      <div className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full border border-[#fbbc04]/30 bg-[#fef7e0]/50 px-2 py-0.5 sm:px-3 sm:py-1 text-[#ea8600]">
                                                        <FiEdit3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                                        <span className="font-medium text-[10px] sm:text-xs line-clamp-1 max-w-[150px] sm:max-w-[200px]">{s.note}</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>

                                                <button
                                                  onClick={() => handleOpenDeleteConfirm(s)}
                                                  className="absolute top-2.5 right-2.5 sm:static sm:self-center inline-flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full text-[#5f6368] hover:bg-slate-100 hover:text-[#d93025] transition-colors focus:outline-none"
                                                  title="Xóa khỏi lịch sử"
                                                >
                                                  <FiTrash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                </button>
                                              </div>
                                            </div>
                                          </div>

                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* TAB 2: BẢNG TỔNG HỢP 6 THÁNG                             */}
                {/* ======================================================== */}
                {activeTab === 'summary' && (
                  <div className="bg-white rounded-2xl sm:rounded-[24px] border border-[#dadce0] overflow-hidden transition-shadow hover:shadow-[0_1px_3px_rgba(60,64,67,0.1)]">
                    {/* Header Bảng */}
                    <div className="border-b border-[#dadce0] px-3 py-3 sm:px-6 sm:py-5 bg-white relative z-20">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-50 text-[#1a73e8] flex-shrink-0">
                          <FaBookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div>
                          <h2 className="text-base sm:text-xl font-bold text-[#202124] leading-tight">Bảng tổng hợp 6 tháng</h2>
                          <p className="text-[11px] sm:text-sm font-normal text-[#5f6368] mt-0.5">Thống kê số buổi và số tiết đã coi thi</p>
                        </div>
                      </div>
                    </div>

                    {/* Table Container */}
                    <div className="overflow-x-auto bg-white">
                      <table className="w-full border-collapse text-left font-sans">
                        <thead className="bg-slate-50/50 text-[11px] sm:text-sm font-medium text-[#5f6368] border-b border-[#dadce0]">
                          <tr>
                            <th className="px-3 py-2.5 sm:px-6 sm:py-4 text-center w-10 sm:w-16">#</th>

                            <th
                              onClick={() => handleSort('date')}
                              className="cursor-pointer select-none px-3 py-2.5 sm:px-6 sm:py-4 transition-colors hover:bg-slate-100/80 whitespace-nowrap"
                            >
                              <div className="flex items-center gap-1.5">
                                Thời gian (Tháng)
                                <span className={`${sortColumn === 'date' ? 'text-[#1a73e8]' : 'text-[#dadce0]'} text-[10px] sm:text-xs`}>
                                  {getSortIndicator('date')}
                                </span>
                              </div>
                            </th>

                            <th
                              onClick={() => handleSort('sessions')}
                              className="cursor-pointer select-none px-3 py-2.5 sm:px-6 sm:py-4 text-right transition-colors hover:bg-slate-100/80 whitespace-nowrap"
                            >
                              <div className="flex items-center justify-end gap-1.5">
                                Số buổi
                                <span className={`${sortColumn === 'sessions' ? 'text-[#1a73e8]' : 'text-[#dadce0]'} text-[10px] sm:text-xs`}>
                                  {getSortIndicator('sessions')}
                                </span>
                              </div>
                            </th>

                            <th
                              onClick={() => handleSort('periods')}
                              className="cursor-pointer select-none px-3 py-2.5 sm:px-6 sm:py-4 text-right transition-colors hover:bg-slate-100/80 whitespace-nowrap"
                            >
                              <div className="flex items-center justify-end gap-1.5">
                                Tổng số tiết
                                <span className={`${sortColumn === 'periods' ? 'text-[#1a73e8]' : 'text-[#dadce0]'} text-[10px] sm:text-xs`}>
                                  {getSortIndicator('periods')}
                                </span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e8eaed] text-[12px] sm:text-sm font-normal text-[#3c4043]">
                          {sortedStats.map((item, idx) => (
                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                              <td className="px-3 py-3 sm:px-6 sm:py-4 text-center text-[#5f6368]">{idx + 1}</td>
                              <td className="px-3 py-3 sm:px-6 sm:py-4 font-medium text-[#202124] whitespace-nowrap">{item.monthLabel}</td>
                              <td className="px-3 py-3 sm:px-6 sm:py-4 text-right whitespace-nowrap">{item.sessions} buổi</td>
                              <td className="px-3 py-3 sm:px-6 sm:py-4 text-right font-medium text-[#1a73e8] whitespace-nowrap">{item.periods.toLocaleString('vi-VN')} tiết</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50/50 border-t border-[#dadce0] text-[12px] sm:text-sm font-medium text-[#202124]">
                          <tr>
                            <td className="px-3 py-3 sm:px-6 sm:py-4 text-center">∑</td>
                            <td className="px-3 py-3 sm:px-6 sm:py-4 text-[#5f6368] uppercase text-[10px] sm:text-[11px] tracking-wider whitespace-nowrap">Tổng cộng 6 tháng</td>
                            <td className="px-3 py-3 sm:px-6 sm:py-4 text-right whitespace-nowrap">{totalSessions} buổi</td>
                            <td className="px-3 py-3 sm:px-6 sm:py-4 text-right text-[#1a73e8] whitespace-nowrap">{totalPeriods.toLocaleString('vi-VN')} tiết</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            </>
          )}

        </div>
      </div>

      {showToTop && (
        <button
          onClick={handleScrollToTop}
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 bg-[#002147] hover:bg-[#002147]/95 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-lg shadow-[#002147]/30 flex items-center justify-center transition-all z-30 hover:-translate-y-1 active:scale-95"
        >
          <FiChevronUp className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {isDeleteConfirmOpen && (
        <div className="modal fixed inset-0 z-50 flex items-center justify-center bg-[#202124]/40 p-4 backdrop-blur-sm">
          <div className="relative mx-4 max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-[0_24px_38px_3px_rgba(0,0,0,0.14),0_9px_46px_8px_rgba(0,0,0,0.12),0_11px_15px_-7px_rgba(0,0,0,0.2)]">
            <h3 className="text-lg sm:text-xl font-medium text-[#202124] mb-2 sm:mb-3">Xóa khỏi lịch sử?</h3>
            <p className="text-[13px] sm:text-sm text-[#5f6368] mb-5 sm:mb-6">Hành động này sẽ xóa ca thi này vĩnh viễn và không thể hoàn tác.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[13px] sm:text-sm font-medium text-[#1a73e8] hover:bg-blue-50 transition-colors focus:outline-none"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteSchedule}
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[13px] sm:text-sm font-medium text-white bg-[#d93025] hover:bg-[#c5221f] transition-colors focus:outline-none shadow-sm"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}