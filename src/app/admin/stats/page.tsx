'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/app/admin/layout';
import { db } from '@/lib/firebase';
import { useDelayedBoolean } from '@/hooks/useDelayedBoolean';
import { collection, onSnapshot, query, orderBy, getDoc, doc } from 'firebase/firestore';
import { Schedule } from '@/lib/export';

import { 
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { FiMenu, FiChevronUp, FiTrendingUp, FiCalendar } from 'react-icons/fi';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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
  const [customTimeMap, setCustomTimeMap] = useState<any>({});
  const [showToTop, setShowToTop] = useState(false);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<'date' | 'sessions' | 'periods'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const handleScrollToTop = () => {
    const container = document.getElementById('stats-scroll-container');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // --- STATS LOGIC ---
  const now = new Date();
  const pastSchedules = schedules.filter(s => getEndDateTime(s) < now);

  // Parse past 12 months array
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

  // --- SORT TIMETABLE ROW ---
  const handleSort = (column: 'date' | 'sessions' | 'periods') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedStats = [...monthlyStats].sort((a, b) => {
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

  // Calculate totals
  const totalSessions = monthlyStats.reduce((acc, item) => acc + item.sessions, 0);
  const totalPeriods = monthlyStats.reduce((acc, item) => acc + item.periods, 0);

  const getSortIndicator = (col: 'date' | 'sessions' | 'periods') => {
    if (sortColumn === col) {
      return sortDirection === 'asc' ? '▲' : '▼';
    }
    return '↕';
  };

  // --- CHART CONFIGURATION ---
  const chartData = {
    labels: monthlyStats.map(item => item.monthLabel.replace('Tháng ', 'T')),
    datasets: [
      {
        label: 'Số tiết thi',
        data: monthlyStats.map(item => item.periods),
        backgroundColor: 'rgba(59, 130, 246, 0.85)', // blue-500
        borderColor: 'rgba(37, 99, 235, 1)',
        borderWidth: 1,
        borderRadius: 6,
      },
      {
        label: 'Số buổi thi',
        data: monthlyStats.map(item => item.sessions),
        backgroundColor: 'rgba(249, 115, 22, 0.85)', // orange-500
        borderColor: 'rgba(234, 88, 12, 1)',
        borderWidth: 1,
        borderRadius: 6,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { family: 'Inter', weight: 'bold' as any }
        }
      },
      tooltip: {
        padding: 12,
        cornerRadius: 12
      }
    },
    scales: {
      x: {
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: { stepSize: 5 }
      }
    }
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
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block">Thống kê</span>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight cursor-default">Phân tích & Thống kê</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div 
        id="stats-scroll-container"
        onScroll={handleScroll}
        className="admin-page flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth bg-[#F2F2F7]"
      >
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto space-y-6">
          
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Tổng quan hiệu suất</h2>
            <p className="text-slate-550 mt-1 text-xs sm:text-sm font-medium">Số liệu thống kê chi tiết về hoạt động coi thi của bạn.</p>
          </div>

          {/* SKELETON LOADER */}
          {loading && showSkeleton && (
            <div className="space-y-6 animate-pulse">
              <div className="bg-white p-6 h-96 rounded-2xl border border-slate-200/50"></div>
              <div className="bg-white p-6 h-64 rounded-2xl border border-slate-200/50"></div>
            </div>
          )}

          {!loading && (
            <>
              {/* Graphical Chart (Wow Factor) */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/50 animate-[fadeIn_0.5s_ease-out_100ms_both] transition-shadow hover:shadow-md">
                <h2 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                  <FiTrendingUp className="text-[#002147]" />
                  Biểu đồ hiệu suất 12 tháng gần nhất
                </h2>
                <div className="h-72 w-full relative">
                  <Bar data={chartData} options={chartOptions} />
                </div>
              </div>

              {/* sortable 12-month summary table */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/50 animate-[fadeIn_0.5s_ease-out_200ms_both] transition-shadow hover:shadow-md">
                <h2 className="text-base font-extrabold text-slate-900 mb-5 flex items-center gap-2">
                  <FiCalendar className="text-[#002147]" />
                  Bảng tổng hợp chi tiết
                </h2>
                
                <div className="overflow-x-auto border border-slate-200/50 rounded-xl shadow-inner bg-slate-50/20">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="text-[10px] text-slate-450 uppercase bg-slate-50/70 border-b border-slate-200/50 font-mono">
                      <tr>
                        <th className="px-5 py-3 font-bold border-r border-slate-200/50 text-center w-12 bg-slate-100/50">#</th>
                        
                        <th 
                          onClick={() => handleSort('date')}
                          className="px-6 py-3 font-bold border-r border-slate-200/50 cursor-pointer select-none hover:bg-slate-100/50 transition-colors"
                        >
                          Thời gian (Tháng) 
                          <span className={`ml-1 ${sortColumn === 'date' ? 'text-[#002147] font-bold' : 'text-slate-300'}`}>
                            {getSortIndicator('date')}
                          </span>
                        </th>
                        
                        <th 
                          onClick={() => handleSort('sessions')}
                          className="px-6 py-3 font-bold border-r border-slate-200/50 text-right cursor-pointer select-none hover:bg-slate-100/50 transition-colors"
                        >
                          Số buổi 
                          <span className={`ml-1 ${sortColumn === 'sessions' ? 'text-[#002147] font-bold' : 'text-slate-300'}`}>
                            {getSortIndicator('sessions')}
                          </span>
                        </th>
                        
                        <th 
                          onClick={() => handleSort('periods')}
                          className="px-6 py-3 font-bold text-right cursor-pointer select-none hover:bg-slate-100/50 transition-colors"
                        >
                          Tổng số tiết 
                          <span className={`ml-1 ${sortColumn === 'periods' ? 'text-[#002147] font-bold' : 'text-slate-300'}`}>
                            {getSortIndicator('periods')}
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 font-mono bg-white text-xs">
                      {sortedStats.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5 border-r border-slate-200/50 text-center bg-slate-50/55 text-slate-400 font-bold select-none">{idx + 1}</td>
                          <td className="px-6 py-3.5 border-r border-slate-200/50 text-slate-705 font-bold">{item.monthLabel}</td>
                          <td className="px-6 py-3.5 border-r border-slate-200/50 text-right text-slate-600 font-semibold">{item.sessions} buổi</td>
                          <td className="px-6 py-3.5 text-right text-[#002147] font-bold">{item.periods.toLocaleString('vi-VN')} tiết</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50/80 border-t-2 border-slate-200/50 font-mono font-bold text-slate-800 text-xs">
                      <tr>
                        <td className="px-5 py-4 border-r border-slate-200/50 text-center bg-slate-100/50 font-bold">∑</td>
                        <td className="px-6 py-4 border-r border-slate-200/50 text-slate-500 uppercase tracking-wider text-[10px]">Tổng cộng</td>
                        <td className="px-6 py-4 border-r border-slate-200/50 text-right text-slate-800">{totalSessions} buổi</td>
                        <td className="px-6 py-4 text-right text-[#002147]">{totalPeriods.toLocaleString('vi-VN')} tiết</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {showToTop && (
        <button 
          onClick={handleScrollToTop}
          className="fixed bottom-8 right-8 bg-[#002147] hover:bg-[#002147]/95 text-white w-12 h-12 rounded-full shadow-lg shadow-[#002147]/30 flex items-center justify-center transition-all z-30 hover:-translate-y-1 active:scale-95"
        >
          <FiChevronUp className="w-6 h-6" />
        </button>
      )}
    </>
  );
}
