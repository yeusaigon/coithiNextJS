'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useSidebar } from '@/app/admin/layout';
import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot, query, orderBy, setDoc, getDoc } from 'firebase/firestore';
import { Schedule } from '@/lib/export';

import { 
  FiMenu, FiSliders, FiX, FiCheck, FiInfo, FiTrash2, FiFileText, FiPlus, FiChevronUp 
} from 'react-icons/fi';
import { FaCircleInfo } from 'react-icons/fa6';

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

interface IncomeSettings {
  defaultRate: number;
  taxRate: number;
  subjectRates: Record<string, number>;
  baseSalary?: number;
  dependentsCount?: number;
}

export default function IncomePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { toggleSidebar } = useSidebar();

  // --- STATE ---
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState('iuh');
  const [customTimeMap, setCustomTimeMap] = useState<any>({});

  // Settings State
  const [settings, setSettings] = useState<IncomeSettings>({
    defaultRate: 0,
    taxRate: 0,
    subjectRates: {},
    baseSalary: 0,
    dependentsCount: 0
  });

  // UI state
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [showDates, setShowDates] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Settings inputs
  const [generalDefaultRate, setGeneralDefaultRate] = useState<number>(0);
  const [generalTaxRate, setGeneralTaxRate] = useState<number>(0);
  const [exceptionSubject, setExceptionSubject] = useState('');
  const [exceptionRate, setExceptionRate] = useState<number>(0);
  const [baseSalaryInput, setBaseSalaryInput] = useState<number>(0);
  const [dependentsInput, setDependentsInput] = useState<number>(0);

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

  useEffect(() => {
    if (!user) return;

    // Load school settings
    const loadSchoolSetting = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid, 'settings', 'school'));
      if (snap.exists()) {
        const d = snap.data();
        setSchool(d.school || 'iuh');
        if (d.customMap) setCustomTimeMap(d.customMap);
      }
    };
    loadSchoolSetting();

    // Subscribe to settings
    const settingsRef = doc(db, 'users', user.uid, 'settings', 'income');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as IncomeSettings;
        const resolvedRates = data.subjectRates || {};
        setSettings({
          defaultRate: data.defaultRate || 0,
          taxRate: data.taxRate || 0,
          subjectRates: resolvedRates,
          baseSalary: data.baseSalary || 0,
          dependentsCount: data.dependentsCount || 0
        });
        setGeneralDefaultRate(data.defaultRate || 0);
        setGeneralTaxRate(data.taxRate || 0);
        setBaseSalaryInput(data.baseSalary || 0);
        setDependentsInput(data.dependentsCount || 0);
      }
    });

    // Subscribe to schedules
    const q = query(collection(db, 'users', user.uid, 'schedules'), orderBy("examDate", "asc"));
    const unsubSchedules = onSnapshot(q, (snapshot) => {
      const fetchedSchedules = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Schedule));
      setSchedules(fetchedSchedules);
      setLoading(false);
    });

    return () => {
      unsubSettings();
      unsubSchedules();
    };
  }, [user]);

  // Set default initial month filter to the most recent month
  useEffect(() => {
    if (loading || schedules.length === 0) return;
    const months = schedules.map(s => {
      const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const uniqueMonths = Array.from(new Set(months)).sort().reverse();
    if (uniqueMonths.length > 0 && selectedMonth === 'all') {
      setSelectedMonth(uniqueMonths[0]);
    }
  }, [schedules, loading]);

  const uniqueMonths = Array.from(new Set(
    schedules.map(s => {
      const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })
  )).sort().reverse();

  const getFilteredSchedules = () => {
    if (selectedMonth === 'all') return schedules;
    return schedules.filter(s => {
      const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === selectedMonth;
    });
  };

  const filteredSchedules = getFilteredSchedules();

  // --- CALCULATIONS ---
  let totalPeriodsOrSessions = 0;
  let grossIncome = 0;
  const breakdown: Record<string, {
    quantity: number;
    total: number;
    rate: number;
    isSpecific: boolean;
    isSession: boolean;
    dates: Set<string>;
  }> = {};

  filteredSchedules.forEach(s => {
    const isSpecific = settings.subjectRates.hasOwnProperty(s.subject);
    const rate = isSpecific ? settings.subjectRates[s.subject] : settings.defaultRate;
    
    let quantity = 0;
    let isSession = false;

    if (s.type === 'session' || s.isPriority) {
      quantity = s.examSession ? s.examSession.split(',').length : 1;
      isSession = true;
    } else {
      quantity = (s.endPeriod - s.startPeriod + 1);
    }

    totalPeriodsOrSessions += quantity;
    const totalAmount = quantity * rate;
    grossIncome += totalAmount;

    const dateStr = typeof s.examDate.toDate === 'function' 
      ? s.examDate.toDate().toLocaleDateString('vi-VN') 
      : new Date(s.examDate).toLocaleDateString('vi-VN');
    
    if (!breakdown[s.subject]) {
      breakdown[s.subject] = {
        quantity: 0,
        total: 0,
        rate: rate,
        isSpecific: isSpecific,
        isSession: isSession,
        dates: new Set<string>()
      };
    }
    breakdown[s.subject].quantity += quantity;
    breakdown[s.subject].total += totalAmount;
    breakdown[s.subject].dates.add(dateStr);
  });

  const taxRate = settings.taxRate || 0;
  const taxAmount = grossIncome * (taxRate / 100);
  const netIncome = grossIncome - taxAmount;

  // --- PROGRESSIVE PIT ESTIMATION ALGORITHM ---
  const calculateProgressivePIT = (taxableAmount: number) => {
    if (taxableAmount <= 0) return 0;
    let tax = 0;
    const brackets = [
      { limit: 5000000, rate: 0.05 },
      { limit: 10000000, rate: 0.10 },
      { limit: 18000000, rate: 0.15 },
      { limit: 32000000, rate: 0.20 },
      { limit: 52000000, rate: 0.25 },
      { limit: 80000000, rate: 0.30 },
      { limit: Infinity, rate: 0.35 }
    ];
    let prevLimit = 0;
    for (const b of brackets) {
      if (taxableAmount > prevLimit) {
        const amt = Math.min(taxableAmount - prevLimit, b.limit - prevLimit);
        tax += amt * b.rate;
        prevLimit = b.limit;
      } else {
        break;
      }
    }
    return tax;
  };

  const pitDeductions = 11000000 + dependentsInput * 4400000;
  const taxableBase = Math.max(0, baseSalaryInput - pitDeductions);
  const baseTax = calculateProgressivePIT(taxableBase);
  
  const combinedGross = baseSalaryInput + grossIncome;
  const taxableCombined = Math.max(0, combinedGross - pitDeductions);
  const combinedTax = calculateProgressivePIT(taxableCombined);
  
  const actualTaxDueForCoiThi = combinedTax - baseTax;
  const taxDifference = taxAmount - actualTaxDueForCoiThi;

  // Unique list of subjects in schedule to build drop-down exception list
  const uniqueSubjectsInDb = Array.from(new Set(schedules.map(s => s.subject))).sort();

  // --- SAVE GENERAL SETTINGS ---
  const handleSaveGeneralSettings = async () => {
    if (!user) return;
    if (generalDefaultRate < 0 || generalTaxRate < 0 || generalTaxRate > 100 || baseSalaryInput < 0 || dependentsInput < 0) {
      showToast("Giá trị nhập không hợp lệ", "error");
      return;
    }

    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'income'), {
        defaultRate: generalDefaultRate,
        taxRate: generalTaxRate,
        baseSalary: baseSalaryInput,
        dependentsCount: dependentsInput
      }, { merge: true });
      showToast("Đã lưu cấu hình chung thành công", "success");
    } catch (e) {
      console.error(e);
      showToast("Lỗi khi lưu cài đặt", "error");
    }
  };

  // --- ADD SPECIFIC EXCEPTIONS ---
  const handleAddException = async () => {
    if (!user) return;
    if (!exceptionSubject || exceptionRate <= 0) {
      showToast("Vui lòng chọn môn và nhập đơn giá hợp lệ", "error");
      return;
    }

    try {
      const newRates = { ...settings.subjectRates };
      newRates[exceptionSubject] = exceptionRate;
      
      await setDoc(doc(db, 'users', user.uid, 'settings', 'income'), {
        subjectRates: newRates
      }, { merge: true });
      
      setExceptionRate(0);
      setExceptionSubject('');
      showToast(`Đã thêm giá ngoại lệ cho môn ${exceptionSubject}`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gặp lỗi khi thêm đơn giá", "error");
    }
  };

  // --- DELETE EXCEPTION RATE ---
  const handleDeleteException = async (subj: string) => {
    if (!user) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa thù lao ngoại lệ của môn: ${subj}?`)) return;

    try {
      const newRates = { ...settings.subjectRates };
      delete newRates[subj];
      
      await setDoc(doc(db, 'users', user.uid, 'settings', 'income'), {
        subjectRates: newRates
      }, { merge: true });
      
      showToast("Đã xóa đơn giá ngoại lệ", "success");
    } catch (e) {
      console.error(e);
      showToast("Gặp lỗi khi xóa đơn giá ngoại lệ", "error");
    }
  };

  // --- TRIGGER PRINT PREVIEW ---
  const handlePrint = () => {
    if (filteredSchedules.length === 0) {
      showToast("Không có dữ liệu để in báo cáo", "error");
      return;
    }

    const payload = {
      user: { name: user?.displayName || 'Giảng viên', email: user?.email || '' },
      data: {
        period: selectedMonth === 'all' ? 'Tất cả thời gian' : `Tháng ${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`,
        breakdown: Object.fromEntries(
          Object.entries(breakdown).map(([subj, val]) => [subj, {
            ...val,
            dates: Array.from(val.dates)
          }])
        ),
        totals: {
          gross: grossIncome,
          tax: taxAmount,
          net: netIncome
        },
        showDate: showDates
      }
    };

    localStorage.setItem('printData', JSON.stringify(payload));
    window.open('/admin/income/print', '_blank');
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
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight cursor-default">Quản lý thu nhập</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrint}
            disabled={filteredSchedules.length === 0}
            className="bg-[#002147] hover:bg-[#002147]/90 text-white font-bold py-2 px-4 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="In báo cáo thu nhập"
          >
            <FiFileText />
            <span className="hidden sm:inline">In báo cáo</span>
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-10 h-10 bg-white border border-slate-200 text-slate-500 hover:text-[#002147] hover:bg-slate-100 hover:border-slate-350 rounded-xl flex items-center justify-center transition-all focus:outline-none hover:shadow-sm active:scale-95" 
            title="Cấu hình đơn giá"
          >
            <FiSliders className="text-base" />
          </button>
        </div>
      </header>

      {/* Main view content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth bg-[#F2F2F7]">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto space-y-6">

          {/* SKELETON LOADER */}
          {loading && (
            <div className="bg-white rounded-2xl border border-slate-200/50 overflow-hidden animate-pulse h-96"></div>
          )}

          {/* ACTUAL DISPLAY CONTAINER */}
          {!loading && (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
              <div className="bg-slate-50/50 border-b border-slate-200/50 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    Báo cáo tổng quan
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Dựa trên lịch thi đã hoàn thành và sắp tới.</p>
                </div>
                <div className="w-full sm:w-auto flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Tháng:</label>
                  <div className="relative w-full sm:w-48">
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="block w-full border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#002147] focus:border-transparent p-2 pr-8 outline-none text-xs font-bold text-slate-700 bg-white cursor-pointer"
                    >
                      <option value="all">Tất cả thời gian</option>
                      {uniqueMonths.map(m => {
                        const [year, month] = m.split('-');
                        return <option key={m} value={m}>{`Tháng ${parseInt(month)}/${year}`}</option>;
                      })}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 border-b border-slate-200/50 bg-white">
                <div className="p-6">
                  <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Tổng số tiết/buổi</p>
                  <p className="text-3xl font-black text-slate-800">{totalPeriodsOrSessions}</p>
                </div>
                <div className="p-6">
                  <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Tổng thu nhập</p>
                  <p className="text-3xl font-black text-[#B45309]">{grossIncome.toLocaleString('vi-VN')} ₫</p>
                </div>
                <div className="p-6 bg-red-50/10">
                  <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                    Thuế TNCN 
                    <span className="text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded border border-red-200/55">
                      ({taxRate}%)
                    </span>
                  </p>
                  <p className="text-3xl font-black text-red-650">- {taxAmount.toLocaleString('vi-VN')} ₫</p>
                </div>
                <div className="p-6 bg-[#002147]/5">
                  <p className="text-xs font-bold text-[#002147] mb-1 uppercase tracking-wider">Thực lĩnh</p>
                  <p className="text-3xl font-black text-[#002147] drop-shadow-xs">{netIncome.toLocaleString('vi-VN')} ₫</p>
                </div>
              </div>

              {/* Table details */}
              <div className="border-t border-slate-200/50">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">Chi tiết theo môn</h3>
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={showDates}
                        onChange={(e) => setShowDates(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#002147] transition-colors"></div>
                    </div>
                    <span className="text-xs font-bold text-slate-650 group-hover:text-[#002147] transition-colors">Hiển thị ngày thi</span>
                  </label>
                </div>
                
                {filteredSchedules.length === 0 ? (
                  <div className="py-16 text-center text-slate-450">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                        <FiInfo className="text-slate-350 text-base" />
                      </div>
                      <p className="text-xs text-slate-500">Không có dữ liệu coi thi trong thời gian này.</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[10px] text-slate-450 uppercase bg-slate-50 border-b border-slate-200/50">
                        <tr>
                          <th className="px-5 py-3.5 font-bold">Môn Thi</th>
                          {showDates && <th className="px-5 py-3.5 font-bold">Ngày Thi</th>}
                          <th className="px-5 py-3.5 font-bold text-center">Số Tiết/Buổi</th>
                          <th className="px-5 py-3.5 font-bold text-right">Đơn giá (₫)</th>
                          <th className="px-5 py-3.5 font-bold text-right">Thành tiền (₫)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(breakdown).map(([subject, data]) => {
                          const dateList = Array.from(data.dates).join(', ');
                          const unitLabel = data.isSession ? 'Buổi' : 'Tiết';
                          return (
                            <tr key={subject} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-4 font-bold text-slate-905">
                                {subject}
                                {data.isSpecific && (
                                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#B45309]/10 text-[#B45309] border border-[#B45309]/20">Ngoại lệ</span>
                                )}
                              </td>
                              {showDates && (
                                  <td className="px-5 py-4 text-slate-500 font-medium">{dateList}</td>
                              )}
                              <td className="px-5 py-4 text-center text-slate-650 font-bold">
                                {data.quantity} <span className="text-[10px] text-slate-400 font-normal">{unitLabel}</span>
                              </td>
                              <td className={`px-5 py-4 text-right font-semibold ${data.isSpecific ? 'text-[#B45309]' : 'text-slate-500'}`}>
                                {data.rate.toLocaleString('vi-VN')}
                              </td>
                              <td className="px-5 py-4 text-right font-extrabold text-slate-805">
                                {data.total.toLocaleString('vi-VN')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Dự phòng thuế TNCN lũy tiến */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden mt-6">
              <div className="bg-slate-50/50 border-b border-slate-200/50 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    Dự phòng thuế TNCN lũy tiến (Quy định mới nhất)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Tính toán ước lượng thuế phải nộp khi quyết toán thù lao coi thi gộp chung với lương cơ hữu.</p>
                </div>
                {selectedMonth !== 'all' && (
                  <button 
                    onClick={handleSaveGeneralSettings}
                    className="px-3.5 py-1.5 bg-[#002147] hover:bg-[#002147]/90 text-white font-bold rounded-xl text-xs shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                    title="Lưu cấu hình thuế làm mặc định"
                  >
                    <FiCheck />
                    <span>Lưu cài đặt</span>
                  </button>
                )}
              </div>

              {selectedMonth === 'all' ? (
                <div className="p-8 text-center text-slate-450 bg-slate-50/30">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                      <FiInfo className="text-slate-400 text-sm" />
                    </div>
                    <p className="text-xs text-slate-555">Vui lòng chọn một tháng cụ thể ở bộ lọc phía trên để tính thuế lũy tiến TNCN.</p>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Grid details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/40">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cơ sở tính thuế hàng tháng</p>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Lương cơ hữu:</span>
                          <div className="relative w-28">
                            <input 
                              type="number"
                              value={baseSalaryInput === 0 ? '' : baseSalaryInput}
                              onChange={(e) => setBaseSalaryInput(parseInt(e.target.value) || 0)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-right text-xs font-bold focus:ring-1 focus:ring-[#002147] outline-none pr-5"
                              placeholder="0"
                            />
                            <span className="absolute right-1.5 top-1.5 text-[8px] font-bold text-slate-400">₫</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-500">Thù lao coi thi:</span>
                          <span className="font-bold text-slate-800">{grossIncome.toLocaleString('vi-VN')} ₫</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200/60 pt-2 font-bold">
                          <span className="text-slate-700">Tổng thu nhập:</span>
                          <span className="text-slate-900">{combinedGross.toLocaleString('vi-VN')} ₫</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/40">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Các khoản giảm trừ gia cảnh</p>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-500">Bản thân:</span>
                          <span className="font-bold text-slate-800">11.000.000 ₫</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Người phụ thuộc:</span>
                          <div className="relative w-20">
                            <input 
                              type="number"
                              value={dependentsInput === 0 ? '' : dependentsInput}
                              onChange={(e) => setDependentsInput(parseInt(e.target.value) || 0)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-right text-xs font-bold focus:ring-1 focus:ring-[#002147] outline-none pr-7"
                              placeholder="0"
                              min="0"
                            />
                            <span className="absolute right-1.5 top-1.5 text-[8px] font-bold text-slate-400">người</span>
                          </div>
                        </div>
                        <div className="flex justify-between border-t border-slate-200/60 pt-2 font-bold">
                          <span className="text-slate-700">Tổng giảm trừ:</span>
                          <span className="text-slate-900">{pitDeductions.toLocaleString('vi-VN')} ₫</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/40">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ước tính thuế thu nhập phát sinh</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Thu nhập tính thuế:</span>
                          <span className="font-bold text-slate-800">{taxableCombined.toLocaleString('vi-VN')} ₫</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Thuế lũy tiến phát sinh:</span>
                          <span className="font-bold text-[#B45309]">{combinedTax.toLocaleString('vi-VN')} ₫</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200/60 pt-1.5 font-bold text-[10px]">
                          <span className="text-slate-500">Thuế lương cơ hữu:</span>
                          <span className="text-slate-700 font-semibold">{baseTax.toLocaleString('vi-VN')} ₫</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Comparison */}
                  <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Ước tính kết quả quyết toán tháng</h4>
                      <p className="text-[11px] text-slate-500">
                        Số thuế đã tạm đóng tại nguồn: <span className="font-bold text-slate-700">{taxAmount.toLocaleString('vi-VN')} ₫</span> ({taxRate}% thù lao). 
                        Thuế lũy tiến phân bổ cho thù lao: <span className="font-bold text-slate-700">{actualTaxDueForCoiThi.toLocaleString('vi-VN')} ₫</span>.
                      </p>
                    </div>

                    <div className="w-full sm:w-auto">
                      {taxDifference > 0 ? (
                        <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl px-4 py-3 text-right">
                          <span className="block text-[9px] text-emerald-500 font-bold uppercase tracking-wider">Hoàn thuế dự kiến</span>
                          <span className="text-lg font-black text-emerald-600">+{taxDifference.toLocaleString('vi-VN')} ₫</span>
                        </div>
                      ) : taxDifference < 0 ? (
                        <div className="bg-rose-50 border border-rose-200/80 rounded-xl px-4 py-3 text-right">
                          <span className="block text-[9px] text-rose-500 font-bold uppercase tracking-wider">Truy thu dự kiến</span>
                          <span className="text-lg font-black text-rose-600">{taxDifference.toLocaleString('vi-VN')} ₫</span>
                        </div>
                      ) : (
                        <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-right">
                          <span className="block text-[9px] text-slate-450 font-bold uppercase tracking-wider">Trạng thái quyết toán</span>
                          <span className="text-lg font-black text-slate-700">Cân bằng 0 ₫</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        </div>
      </div>

      {/* MODAL: INCOME SETTINGS */}
      {isSettingsOpen && (
        <div className="modal fixed inset-0 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4 z-50 flex active">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh] relative mx-4">
            
            {/* Header Modal */}
            <div className="p-6 pb-5 flex justify-between items-center border-b border-slate-150 bg-white">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#002147]/5 text-[#002147] flex items-center justify-center text-lg shadow-sm border border-[#002147]/10">
                  <FiSliders />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Thiết lập đơn giá</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Tùy chỉnh đơn giá và thuế suất thù lao.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <FiX className="text-lg" />
              </button>
            </div>
            
            {/* Body Modal */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#F2F2F7]">
              
              {/* Section 1: General configuration */}
              <div className="bg-white p-5 rounded-2xl border border-slate-205/60 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#002147]"></div>
                <h3 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                  Áp dụng chung
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                  {/* Default Rate */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Đơn giá Tiết chuẩn</label>
                    <div className="relative group">
                      <input 
                        type="number" 
                        value={generalDefaultRate === 0 ? '' : generalDefaultRate}
                        onChange={(e) => setGeneralDefaultRate(parseInt(e.target.value) || 0)}
                        className="income-modal-input modal-input-money text-[#002147] font-bold focus:ring-[#002147] border-slate-250 bg-white pr-8 pl-4 h-11 text-sm rounded-xl w-full" 
                        placeholder="75000" 
                        min="0" 
                        step="1000"
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                        <span className="font-bold text-xs">₫</span>
                      </div>
                    </div>
                  </div>
                  {/* Tax Rate */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Khấu trừ thuế (TNCN)</label>
                    <div className="relative group">
                      <input 
                        type="number" 
                        value={generalTaxRate === 0 ? '' : generalTaxRate}
                        onChange={(e) => setGeneralTaxRate(parseFloat(e.target.value) || 0)}
                        className="income-modal-input modal-input-money text-red-650 font-bold focus:ring-red-500 border-slate-250 bg-white pr-8 pl-4 h-11 text-sm rounded-xl w-full" 
                        placeholder="10" 
                        min="0" 
                        max="100" 
                        step="0.1"
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                        <span className="font-bold text-xs">%</span>
                      </div>
                    </div>
                  </div>
                  {/* Base Salary */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Lương cơ hữu cố định hàng tháng</label>
                    <div className="relative group">
                      <input 
                        type="number" 
                        value={baseSalaryInput === 0 ? '' : baseSalaryInput}
                        onChange={(e) => setBaseSalaryInput(parseInt(e.target.value) || 0)}
                        className="income-modal-input modal-input-money text-slate-800 font-bold focus:ring-[#002147] border-slate-250 bg-white pr-8 pl-4 h-11 text-sm rounded-xl w-full" 
                        placeholder="VD: 15000000" 
                        min="0" 
                        step="100000"
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                        <span className="font-bold text-xs">₫</span>
                      </div>
                    </div>
                  </div>
                  {/* Dependents Count */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Số người phụ thuộc</label>
                    <div className="relative group">
                      <input 
                        type="number" 
                        value={dependentsInput === 0 ? '' : dependentsInput}
                        onChange={(e) => setDependentsInput(parseInt(e.target.value) || 0)}
                        className="income-modal-input text-slate-800 font-bold focus:ring-[#002147] border-slate-250 bg-white pr-8 pl-4 h-11 text-sm rounded-xl w-full" 
                        placeholder="0" 
                        min="0" 
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                        <span className="font-bold text-xs">người</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleSaveGeneralSettings}
                  className="w-full py-3 bg-[#002147] hover:bg-[#002147]/95 text-white font-bold rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 text-xs"
                >
                  Lưu cấu hình chung
                </button>
              </div>

              {/* Section 2: Exceptions Rates */}
              <div className="bg-white p-5 rounded-2xl border border-slate-205/60 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#B45309]"></div>

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      Đơn giá ngoại lệ
                    </h3>
                    <p className="text-[11px] text-slate-550 mt-1 font-medium">Dành cho môn thi đặc biệt tính thù lao theo <span className="text-[#B45309] font-bold">Buổi</span>.</p>
                  </div>
                </div>
                
                {/* Exception form */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 bg-[#B45309]/5 rounded-xl border border-[#B45309]/10">
                  <div className="flex-grow">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Chọn môn thi</label>
                    <select 
                      value={exceptionSubject}
                      onChange={(e) => setExceptionSubject(e.target.value)}
                      className="income-modal-input text-xs font-semibold cursor-pointer border-slate-200 bg-white shadow-sm h-11 py-1.5 focus:ring-[#B45309] focus:border-[#B45309] rounded-xl w-full outline-none px-3 border"
                    >
                      <option value="">-- Chọn môn học --</option>
                      {uniqueSubjectsInDb.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-44 relative">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Đơn giá / Buổi</label>
                    <input 
                      type="number" 
                      value={exceptionRate === 0 ? '' : exceptionRate}
                      onChange={(e) => setExceptionRate(parseInt(e.target.value) || 0)}
                      className="income-modal-input font-bold text-xs pr-8 border-slate-205 bg-white shadow-sm h-11 text-[#B45309] focus:ring-[#B45309] focus:border-[#B45309] pl-3 rounded-xl w-full border" 
                      placeholder="VD: 250000" 
                      min="0" 
                      step="1000"
                    />
                    <span className="absolute right-3 bottom-3 text-[10px] font-bold text-slate-400">₫</span>
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={handleAddException}
                      className="h-11 w-full sm:w-14 bg-[#002147] hover:bg-[#002147]/95 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center flex-shrink-0 shadow-sm shadow-[#002147]/10" 
                      title="Thêm ngoại lệ"
                    >
                      <FiPlus className="text-lg" />
                    </button>
                  </div>
                </div>

                {/* List Exceptions */}
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 pl-1">Danh sách ngoại lệ hiện tại</h4>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-2 min-h-[100px] max-h-48 overflow-y-auto custom-scrollbar shadow-inner">
                  {Object.keys(settings.subjectRates).length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4 text-center">Chưa có ngoại lệ nào.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {Object.entries(settings.subjectRates).map(([subject, rate]) => (
                        <div 
                          key={subject}
                          className="flex justify-between items-center bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm hover:border-[#B45309]/30 transition-all duration-200 group"
                        >
                          <div className="flex-1 min-w-0 pr-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#B45309]/10 text-[#B45309] flex items-center justify-center font-extrabold text-xs flex-shrink-0">
                              {subject.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-xs truncate" title={subject}>{subject}</p>
                              <p className="text-[#B45309] font-extrabold text-[10px] mt-0.5">
                                {rate.toLocaleString('vi-VN')} ₫ 
                                <span className="text-slate-400 font-medium"> / Buổi</span>
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeleteException(subject)}
                            className="text-slate-400 hover:text-red-650 hover:bg-red-50 p-2 rounded-lg transition-colors flex-shrink-0" 
                            title="Xóa ngoại lệ"
                          >
                            <FiTrash2 className="text-sm" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer Modal */}
            <div className="p-4 bg-slate-100 border-t border-slate-205 flex justify-end">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 font-bold rounded-xl transition-all active:scale-95 shadow-xs text-xs"
              >
                Đóng
              </button>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
