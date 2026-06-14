'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useSidebar } from '@/app/admin/layout';
import { db } from '@/lib/firebase';
import { useDelayedBoolean } from '@/hooks/useDelayedBoolean';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { Schedule } from '@/lib/export';

import { 
  FiMenu, FiSearch, FiX, FiCalendar, FiClock, FiEdit3, FiTrash2, FiChevronUp, FiAward, FiBookOpen 
} from 'react-icons/fi';
import { FaFilePdf, FaBookOpen } from 'react-icons/fa6';

const DEFAULT_SCHOOL_TIME_MAP = {
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

export default function HistoryPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { toggleSidebar } = useSidebar();

  // --- STATE ---
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const showSkeleton = useDelayedBoolean(loading, 1000);
  const [school, setSchool] = useState('iuh');
  const [customTimeMap, setCustomTimeMap] = useState<any>({});

  // Filter & Search states
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showToTop, setShowToTop] = useState(false);

  // Deletion state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  const getActiveTimeMap = () => {
    return school === 'custom' ? customTimeMap : DEFAULT_SCHOOL_TIME_MAP;
  };

  const getEndDateTime = (schedule: Schedule) => {
    const timeMap = getActiveTimeMap();
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
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowToTop(e.currentTarget.scrollTop > 200);
  };

  useEffect(() => {
    if (!user) return;

    // Load user settings
    const loadSchoolSetting = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid, 'settings', 'school'));
      if (snap.exists()) {
        const d = snap.data();
        setSchool(d.school || 'iuh');
        if (d.customMap) setCustomTimeMap(d.customMap);
      }
    };
    loadSchoolSetting();

    // Subscribe to schedules
    const q = query(collection(db, 'users', user.uid, 'schedules'), orderBy("examDate", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSchedules = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Schedule));
      setSchedules(fetchedSchedules);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Set default initial month filter to the most recent month
  useEffect(() => {
    if (loading || schedules.length === 0) return;
    
    const now = new Date();
    const pastItems = schedules.filter(s => getEndDateTime(s) < now);
    if (pastItems.length > 0) {
      const months = pastItems.map(s => {
        const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      });
      const uniqueMonths = Array.from(new Set(months)).sort().reverse();
      if (uniqueMonths.length > 0 && selectedMonth === 'all') {
        setSelectedMonth(uniqueMonths[0]);
      }
    }
  }, [schedules, loading]);

  const handleScrollToTop = () => {
    const container = document.getElementById('history-scroll-container');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOpenDeleteConfirm = (s: Schedule) => {
    setSelectedSchedule(s);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteSchedule = async () => {
    if (!user || !selectedSchedule) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'schedules', selectedSchedule.id));
      showToast('Đã xóa khỏi lịch sử thành công', 'success');
    } catch (e) {
      showToast('Gặp lỗi khi xóa lịch sử', 'error');
    } finally {
      setIsDeleteConfirmOpen(false);
      setSelectedSchedule(null);
    }
  };

  // --- FILTER & SEARCH PROCESSING ---
  const now = new Date();
  let pastSchedules = schedules.filter(s => getEndDateTime(s) < now);

  // Parse list of unique months for drop-down filter select
  const uniqueMonths = Array.from(new Set(
    pastSchedules.map(s => {
      const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })
  )).sort().reverse();

  // Filter by Month
  if (selectedMonth !== 'all') {
    const [year, month] = selectedMonth.split('-').map(Number);
    pastSchedules = pastSchedules.filter(s => {
      const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }

  // Filter by Search Keyword
  const keyword = searchKeyword.trim().toLowerCase();
  if (keyword) {
    pastSchedules = pastSchedules.filter(s => 
      s.subject.toLowerCase().includes(keyword) || 
      (s.note && s.note.toLowerCase().includes(keyword))
    );
  }

  // Calculate statistics for the current filtered view
  const totalExams = pastSchedules.length;
  let totalUnits = 0;
  pastSchedules.forEach(s => {
    if (s.type === 'session') {
      totalUnits += s.examSession ? s.examSession.split(',').length : 1;
    } else {
      totalUnits += (s.endPeriod - s.startPeriod + 1);
    }
  });

  // Highlight matches text
  const highlightText = (text: string, kw: string) => {
    if (!kw) return text;
    const parts = text.split(new RegExp(`(${kw})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === kw.toLowerCase() 
            ? <mark key={i} className="bg-yellow-200 text-slate-900 font-semibold p-0.5 rounded">{part}</mark>
            : part
        )}
      </span>
    );
  };

  // Group schedules by month for rendering
  const getGroupedHistory = () => {
    const groups: Record<string, Schedule[]> = {};
    pastSchedules.forEach(s => {
      const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return groups;
  };

  const groupedHistory = getGroupedHistory();

  // Cards layout logic helper
  const getCardDateDetails = (s: Schedule) => {
    const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
    const day = d.getDay();
    const dateNum = d.getDate();
    const monthNum = d.getMonth() + 1;
    const dayLabel = day === 0 ? 'CN' : day === 6 ? 'Thứ 7' : `Thứ ${day + 1}`;
    
    let bgClass = 'bg-[#002147]/5';
    let textClass = 'text-[#002147]';
    if (day === 0 || day === 6) {
      bgClass = 'bg-[#B45309]/10';
      textClass = 'text-[#B45309]';
    }
    return { dateNum, monthNum, dayLabel, bgClass, textClass };
  };

  // --- EXPORT TO PRINTING/REPORTS ---
  const handleExportReport = () => {
    if (pastSchedules.length === 0) {
      showToast("Không có dữ liệu để tạo báo cáo", "error");
      return;
    }

    const sortedPast = [...pastSchedules].sort((a, b) => {
      const timeA = typeof a.examDate.toMillis === 'function' ? a.examDate.toMillis() : new Date(a.examDate).getTime();
      const timeB = typeof b.examDate.toMillis === 'function' ? b.examDate.toMillis() : new Date(b.examDate).getTime();
      return timeA - timeB;
    });

    let reportTitle = selectedMonth === 'all' 
      ? "Tất cả các tháng" 
      : `Tháng ${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`;
    if (keyword) {
      reportTitle += ` (Tìm kiếm: "${searchKeyword}")`;
    }

    const serializable = sortedPast.map(s => {
      const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
      return {
        ...s,
        examDate: d.toISOString()
      };
    });

    localStorage.setItem('reportData', JSON.stringify(serializable));
    localStorage.setItem('reportTitle', reportTitle);
    localStorage.setItem('reportUser', user?.displayName || 'Giảng viên');

    window.open('/admin/report', '_blank');
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0 z-20 sticky top-0 transition-shadow">
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleSidebar}
            className="text-slate-500 hover:text-slate-800 lg:hidden focus:outline-none p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <FiMenu className="h-5.5 w-5.5" />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block">Lưu trữ</span>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight cursor-default">Lịch sử coi thi</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportReport}
            className="bg-[#002147] hover:bg-[#002147]/90 text-white font-bold py-2 px-4 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm active:scale-95 text-sm"
            title="In báo cáo PDF"
          >
            <FaFilePdf className="text-sm" />
            <span className="hidden sm:inline">Xuất báo cáo</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <div 
        id="history-scroll-container"
        onScroll={handleScroll}
        className="history-page flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth bg-[#F2F2F7]"
      >
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto space-y-6">

          {/* Filtering panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-200/50 shadow-sm">
            
            {/* Dropdown select */}
            <div className="relative">
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="block w-full border border-slate-200 bg-slate-50/50 rounded-xl shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all p-3 pr-10 outline-none text-sm font-bold text-slate-700 appearance-none cursor-pointer"
              >
                <option value="all">Tất cả thời gian</option>
                {uniqueMonths.map(m => {
                  const [year, month] = m.split('-');
                  return <option key={m} value={m}>{`Tháng ${parseInt(month)}/${year}`}</option>;
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                <FiCalendar className="text-sm" />
              </div>
            </div>

            {/* Search Input */}
            <div className="relative md:col-span-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <FiSearch className="text-sm" />
              </div>
              <input 
                type="text" 
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm tên môn thi hoặc ghi chú..."
                className="block w-full border border-slate-200 bg-slate-50/50 rounded-xl shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all p-3 pl-10 pr-10 outline-none text-sm text-slate-750 font-medium"
              />
              {searchKeyword && (
                <button 
                  onClick={() => setSearchKeyword('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  <FiX className="text-sm" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Statistics Banner */}
          {pastSchedules.length > 0 && (
            <div className="bg-[#002147]/5 border border-[#002147]/10 px-4 py-3 rounded-xl flex flex-wrap items-center gap-2 shadow-xs text-sm">
              <FaBookOpen className="w-4.5 h-4.5 text-[#002147] flex-shrink-0" />
              <span className="text-slate-600 font-medium">Tìm thấy:</span>
              <strong className="text-[#002147] text-base font-extrabold">{totalExams}</strong>
              <span className="text-slate-500 font-medium">buổi/lần</span>
              <div className="h-4 w-px bg-slate-300 mx-2 hidden sm:block"></div>
              <strong className="text-[#002147] text-base font-extrabold">{totalUnits}</strong>
              <span className="text-slate-500 font-medium">đơn vị tính (tiết/buổi)</span>
            </div>
          )}

          {/* SKELETON LOADER */}
          {loading && showSkeleton && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-100 h-24 animate-pulse"></div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 h-24 animate-pulse"></div>
            </div>
          )}

          {/* SCRIPTED CONTENTS */}
          {!loading && (
            <>
              {/* Empty state */}
              {pastSchedules.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/40 inline-block shadow-xs mb-4">
                    <FiSearch className="text-4xl text-slate-400 animate-pulse" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Không tìm thấy kết quả!</h3>
                  <p className="text-slate-500 mt-1 max-w-sm text-xs">
                    {searchKeyword 
                      ? "Hãy thử tìm kiếm với từ khóa khác." 
                      : "Bạn chưa có dữ liệu lịch thi nào đã diễn ra."}
                  </p>
                </div>
              )}

              {/* Grouped lists */}
              {pastSchedules.length > 0 && (
                <div className="space-y-6 pb-20">
                  {Object.keys(groupedHistory).sort().reverse().map(monthKey => {
                    const group = groupedHistory[monthKey];
                    const [year, month] = monthKey.split('-');
                    return (
                      <div key={monthKey} className="space-y-2.5">
                        <h3 className="month-header">THÁNG {parseInt(month)} / {year}</h3>
                        <div className="ios-list-group">
                          {group.map(s => {
                            const { dateNum, dayLabel, bgClass, textClass } = getCardDateDetails(s);
                            const timeMap = getActiveTimeMap();
                            const sTime = timeMap[s.startPeriod]?.start;
                            const eTime = timeMap[s.endPeriod]?.end;

                            return (
                              <div 
                                key={s.id}
                                className="ios-list-item flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                              >
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                  {/* Square Date Badge */}
                                  <div className={`flex-shrink-0 text-center w-12 h-12 ${bgClass} rounded-xl flex flex-col justify-center items-center`}>
                                    <p className={`text-xl font-extrabold ${textClass} leading-none`}>{dateNum}</p>
                                    <p className={`text-xs font-bold uppercase ${textClass} mt-0.5`}>{dayLabel}</p>
                                  </div>

                                  <div className="min-w-0">
                                    <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center flex-wrap gap-1.5">
                                      {highlightText(s.subject, searchKeyword)} 
                                      {s.isPriority && (
                                        <span className="px-1.5 py-0.5 rounded-md text-[8px] uppercase font-bold bg-[#B45309]/10 text-[#B45309] border border-[#B45309]/20">Ưu tiên</span>
                                      )}
                                    </h4>
                                    <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                                      <FiClock className="h-3.5 w-3.5 text-slate-400" />
                                      {s.type === 'session' ? (
                                        <span>Buổi {s.examSession}</span>
                                      ) : (
                                        <span>Tiết {s.startPeriod} - {s.endPeriod} {sTime && eTime ? `(${sTime} - ${eTime})` : ''}</span>
                                      )}
                                    </p>
                                    {s.note && (
                                      <p className="text-xs text-slate-400 mt-1 italic flex items-center gap-1">
                                        <FiEdit3 className="h-3 w-3" />
                                        <span>{highlightText(s.note, searchKeyword)}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2.5 sm:pt-0">
                                  <button 
                                    onClick={() => handleOpenDeleteConfirm(s)}
                                    className="w-8 h-8 rounded-full bg-slate-50 hover:bg-red-50 hover:text-red-650 text-slate-500 flex items-center justify-center transition-all active:scale-90" 
                                    title="Xóa khỏi lịch sử"
                                  >
                                    <FiTrash2 className="w-3.5 h-3.5" />
                                  </button>
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
            </>
          )}

        </div>
      </div>

      {showToTop && (
        <button 
          onClick={handleScrollToTop}
          className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center transition-all z-30 hover:-translate-y-1 active:scale-95"
        >
          <FiChevronUp className="w-6 h-6" />
        </button>
      )}

      {/* CONFIRM DELETE MODAL */}
      {isDeleteConfirmOpen && (
        <div className="modal fixed inset-0 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4 z-50 active">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center relative mx-4">
            <button 
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <FiX className="text-lg" />
            </button>
            <div className="modal-icon-wrapper bg-red-50 text-red-600 mt-2">
              <FiTrash2 className="w-8 h-8 text-red-600 mx-auto" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Xóa khỏi lịch sử?</h3>
            <p className="text-sm text-slate-500 mb-6">Hành động này không thể hoàn tác.</p>
            <button 
              onClick={handleDeleteSchedule}
              className="w-full bg-red-600 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-600/30 active:scale-95"
            >
              Xóa vĩnh viễn
            </button>
          </div>
        </div>
      )}
    </>
  );
}
