'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useSidebar } from '@/app/admin/layout';
import { db } from '@/lib/firebase';
import { useDelayedBoolean } from '@/hooks/useDelayedBoolean';
import { collection, doc, onSnapshot, query, orderBy, setDoc, getDoc } from 'firebase/firestore';
import { Schedule } from '@/lib/export';

import {
  FiMenu, FiSliders, FiX, FiCheck, FiInfo, FiTrash2, FiFileText, FiPlus, FiChevronUp, FiPieChart, FiShield
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
  const [activeTab, setActiveTab] = useState<'report' | 'tax'>('report');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const showSkeleton = useDelayedBoolean(loading, 1000);
  const [school, setSchool] = useState('iuh');
  const [customTimeMap, setCustomTimeMap] = useState<any>({});
  const [showToTop, setShowToTop] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowToTop(e.currentTarget.scrollTop > 200);
  };

  const scrollToTop = () => {
    const container = document.getElementById('income-scroll-container');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
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

  const uniqueSubjectsInDb = Array.from(new Set(schedules.map(s => s.subject))).sort();

  // --- SAVE GENERAL SETTINGS ---
  const handleSaveGeneralSettings = async () => {
    if (!user) return;
    if (generalDefaultRate < 0 || generalTaxRate < 0 || generalTaxRate > 100 || baseSalaryInput < 0 || dependentsInput < 0) {
      showToast("Giá trị nhập không hợp lệ", "error");
      return;
    }

    setSaveStatus('saving');

    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'income'), {
        defaultRate: generalDefaultRate,
        taxRate: generalTaxRate,
        baseSalary: baseSalaryInput,
        dependentsCount: dependentsInput
      }, { merge: true });
      showToast("Đã lưu cấu hình chung thành công", "success");
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500); // Reset after 2.5s
    } catch (e) {
      console.error(e);
      showToast("Lỗi khi lưu cài đặt", "error");
      setSaveStatus('idle');
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

  // Helper cho định dạng tiền tệ khi nhập Lương cơ hữu
  const handleSalaryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Chỉ lấy số từ chuỗi nhập vào
    const rawValue = e.target.value.replace(/\D/g, '');
    const numValue = parseInt(rawValue, 10);
    setBaseSalaryInput(isNaN(numValue) ? 0 : numValue);
  };

  return (
    <>
      {/* CSS Animation */}
      <style>{`
        @keyframes softReveal {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-soft-reveal {
          animation: softReveal 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        
        .save-btn-shrink {
          width: 40px !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          border-radius: 50% !important;
          background-color: #10b981 !important; /* Emerald 500 */
        }
        .save-btn-shrink span {
          display: none;
        }
      `}</style>

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
            <h1 className="text-base sm:text-lg font-extrabold text-[#202124] tracking-tight cursor-default">Quản lý thu nhập</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            disabled={filteredSchedules.length === 0}
            className="bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium py-2 px-4 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="In báo cáo thu nhập"
          >
            <FiFileText />
            <span className="hidden sm:inline">Xuất báo cáo</span>
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-white border border-[#dadce0] text-[#5f6368] hover:text-[#1a73e8] hover:bg-blue-50 rounded-xl flex items-center justify-center transition-all focus:outline-none hover:shadow-sm active:scale-95"
            title="Cấu hình đơn giá"
          >
            <FiSliders className="text-base sm:text-lg" />
          </button>
        </div>
      </header>

      {/* Main view content */}
      <div
        id="income-scroll-container"
        onScroll={handleScroll}
        className="admin-page flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth bg-[#F2F2F7]"
      >
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto space-y-6 pb-10">

          {/* SKELETON LOADER */}
          {loading && showSkeleton && (
            <div className="space-y-6 animate-pulse px-1 sm:px-0 mt-2 sm:mt-0">
              <div className="h-12 w-64 bg-slate-200/80 rounded-2xl" />
              <div className="bg-white rounded-2xl border border-slate-200/50 overflow-hidden h-96"></div>
            </div>
          )}

          {/* ACTUAL DISPLAY CONTAINER */}
          {!loading && (
            <>
              {/* TAB NAVIGATION & GLOBAL FILTER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 animate-[fadeIn_0.3s_ease-out] mt-2 sm:mt-0">

                {/* Pill Tabs */}
                <div className="inline-flex items-center p-1.5 bg-[#f1f5f9] rounded-2xl flex-shrink-0 overflow-x-auto hide-scrollbar">
                  <button
                    onClick={() => setActiveTab('report')}
                    className={`flex items-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 text-[13px] sm:text-sm transition-all duration-200 rounded-xl whitespace-nowrap outline-none ${activeTab === 'report'
                        ? 'bg-white text-[#111827] font-bold shadow-sm'
                        : 'text-[#64748b] hover:text-[#334155] font-semibold'
                      }`}
                  >
                    <FiPieChart className={`h-4 w-4 ${activeTab === 'report' ? 'text-[#111827]' : 'text-[#94a3b8]'}`} />
                    Báo cáo thu nhập
                  </button>
                  <button
                    onClick={() => setActiveTab('tax')}
                    className={`flex items-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 text-[13px] sm:text-sm transition-all duration-200 rounded-xl whitespace-nowrap outline-none ${activeTab === 'tax'
                        ? 'bg-white text-[#111827] font-bold shadow-sm'
                        : 'text-[#64748b] hover:text-[#334155] font-semibold'
                      }`}
                  >
                    <FiShield className={`h-4 w-4 ${activeTab === 'tax' ? 'text-[#111827]' : 'text-[#94a3b8]'}`} />
                    Dự toán Thuế TNCN
                  </button>
                </div>

                {/* Global Month Filter */}
                <div className="flex items-center gap-2.5 bg-white px-4 py-2 sm:py-2.5 rounded-2xl border border-[#dadce0] shadow-sm">
                  <FiMenu className="text-[#94a3b8] w-4 h-4 hidden sm:block" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="border-none focus:ring-0 text-[13px] sm:text-sm font-semibold text-[#202124] bg-transparent cursor-pointer outline-none w-full sm:w-auto"
                  >
                    <option value="all">Tất cả thời gian</option>
                    {uniqueMonths.map(m => {
                      const [year, month] = m.split('-');
                      return <option key={m} value={m}>{`Tháng ${parseInt(month)}/${year}`}</option>;
                    })}
                  </select>
                </div>

              </div>

              {/* Tab Content Area */}
              <div key={activeTab} className="animate-soft-reveal">

                {/* TAB 1: BÁO CÁO THU NHẬP */}
                {activeTab === 'report' && (
                  <div className="bg-white rounded-[24px] shadow-sm border border-[#dadce0] overflow-hidden transition-shadow hover:shadow-[0_1px_3px_rgba(60,64,67,0.1)]">

                    {/* Stats Grid (Google Analytics style) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-[#dadce0]">
                      <div className="p-5 sm:p-6 border-r border-b lg:border-b-0 border-[#dadce0]">
                        <p className="text-[11px] sm:text-xs font-medium text-[#5f6368] mb-1">Số tiết / Buổi</p>
                        <p className="text-xl sm:text-2xl font-bold text-[#202124]">{totalPeriodsOrSessions}</p>
                      </div>
                      <div className="p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-[#dadce0]">
                        <p className="text-[11px] sm:text-xs font-medium text-[#5f6368] mb-1">Tổng thu nhập (VNĐ)</p>
                        <p className="text-xl sm:text-2xl font-bold text-[#1a73e8]">{grossIncome.toLocaleString('vi-VN')}</p>
                      </div>
                      <div className="p-5 sm:p-6 border-r border-[#dadce0] bg-red-50/30">
                        <p className="text-[11px] sm:text-xs font-medium text-[#5f6368] mb-1">Thuế tạm thu ({taxRate}%)</p>
                        <p className="text-xl sm:text-2xl font-bold text-[#d93025]">- {taxAmount.toLocaleString('vi-VN')}</p>
                      </div>
                      <div className="p-5 sm:p-6 bg-emerald-50/30">
                        <p className="text-[11px] sm:text-xs font-medium text-[#5f6368] mb-1">Thực lĩnh (VNĐ)</p>
                        <p className="text-xl sm:text-2xl font-bold text-[#0d652d]">{netIncome.toLocaleString('vi-VN')}</p>
                      </div>
                    </div>

                    {/* Table details */}
                    <div className="bg-white">
                      <div className="px-5 sm:px-6 py-4 border-b border-[#dadce0] flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-medium text-[#202124] text-sm">Chi tiết theo môn thi</h3>
                        <label className="flex items-center space-x-2 cursor-pointer group">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={showDates}
                              onChange={(e) => setShowDates(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#1a73e8] transition-colors"></div>
                          </div>
                          <span className="text-[11px] sm:text-xs font-medium text-[#5f6368] group-hover:text-[#202124] transition-colors">Kèm ngày thi</span>
                        </label>
                      </div>

                      {filteredSchedules.length === 0 ? (
                        <div className="py-16 text-center">
                          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                            <FiInfo className="text-[#94a3b8] text-xl" />
                          </div>
                          <p className="text-sm text-[#5f6368]">Không có dữ liệu thu nhập trong khoảng thời gian này.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs sm:text-sm text-left">
                            <thead className="text-[#5f6368] bg-white border-b border-[#dadce0] font-medium">
                              <tr>
                                <th className="px-5 sm:px-6 py-3 sm:py-4 font-medium">Môn Thi</th>
                                {showDates && <th className="px-5 sm:px-6 py-3 sm:py-4 font-medium whitespace-nowrap">Ngày Thi</th>}
                                <th className="px-5 sm:px-6 py-3 sm:py-4 font-medium text-center">Số lượng</th>
                                <th className="px-5 sm:px-6 py-3 sm:py-4 font-medium text-right">Đơn giá (₫)</th>
                                <th className="px-5 sm:px-6 py-3 sm:py-4 font-medium text-right">Thành tiền (₫)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f1f3f4] text-[#3c4043]">
                              {Object.entries(breakdown).map(([subject, data]) => {
                                const dateList = Array.from(data.dates).join(', ');
                                const unitLabel = data.isSession ? 'Buổi' : 'Tiết';
                                return (
                                  <tr key={subject} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 sm:px-6 py-3 sm:py-4 font-medium text-[#202124]">
                                      {subject}
                                      {data.isSpecific && (
                                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/50 whitespace-nowrap">Ngoại lệ</span>
                                      )}
                                    </td>
                                    {showDates && (
                                      <td className="px-5 sm:px-6 py-3 sm:py-4 text-[#5f6368]">{dateList}</td>
                                    )}
                                    <td className="px-5 sm:px-6 py-3 sm:py-4 text-center">
                                      <span className="font-medium">{data.quantity}</span> <span className="text-[#9aa0a6] text-xs">{unitLabel}</span>
                                    </td>
                                    <td className={`px-5 sm:px-6 py-3 sm:py-4 text-right ${data.isSpecific ? 'text-amber-700 font-medium' : 'text-[#5f6368]'}`}>
                                      {data.rate.toLocaleString('vi-VN')}
                                    </td>
                                    <td className="px-5 sm:px-6 py-3 sm:py-4 text-right font-medium text-[#202124]">
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
                )}

                {/* TAB 2: DỰ TOÁN THUẾ TNCN LŨY TIẾN */}
                {activeTab === 'tax' && (
                  <div className="bg-white rounded-[24px] shadow-sm border border-[#dadce0] overflow-hidden transition-shadow hover:shadow-[0_1px_3px_rgba(60,64,67,0.1)]">
                    <div className="p-5 sm:p-6 border-b border-[#dadce0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-[#202124]">Quyết toán Thuế TNCN (Ước tính)</h2>
                        <p className="text-[11px] sm:text-sm text-[#5f6368] mt-0.5">Mô phỏng tiền thuế khi gộp chung Thù lao coi thi và Lương cơ hữu.</p>
                      </div>

                      {/* NÚT LƯU THÔNG MINH */}
                      <button
                        onClick={handleSaveGeneralSettings}
                        disabled={saveStatus !== 'idle'}
                        className={`
                          px-4 py-2 font-medium rounded-full text-xs sm:text-sm flex items-center justify-center gap-1.5 overflow-hidden transition-all duration-300
                          ${saveStatus === 'idle' ? 'bg-[#1a73e8] hover:bg-[#1557b0] text-white active:scale-95' : ''}
                          ${saveStatus === 'saving' ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : ''}
                          ${saveStatus === 'saved' ? 'save-btn-shrink' : 'w-full sm:w-[130px]'}
                        `}
                      >
                        {saveStatus === 'idle' && (
                          <>
                            <FiCheck />
                            <span>Lưu cài đặt</span>
                          </>
                        )}
                        {saveStatus === 'saving' && <span>Đang lưu...</span>}
                        {saveStatus === 'saved' && <FiCheck className="text-white text-lg mx-auto" />}
                      </button>
                    </div>

                    {selectedMonth === 'all' ? (
                      <div className="py-20 text-center px-4">
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                          <FiShield className="text-[#1a73e8] text-xl" />
                        </div>
                        <h3 className="text-sm font-medium text-[#202124] mb-1">Chưa chọn chu kỳ tính thuế</h3>
                        <p className="text-sm text-[#5f6368]">Vui lòng chọn 1 tháng cụ thể ở bộ lọc phía trên để bắt đầu dự toán.</p>
                      </div>
                    ) : (
                      <div className="p-5 sm:p-6">
                        {/* 3 Columns Data - Google Material Clean Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">

                          {/* Col 1: Thu nhập */}
                          <div className="bg-white border border-[#dadce0] rounded-2xl p-4 sm:p-5">
                            <h4 className="text-xs font-bold text-[#5f6368] uppercase tracking-wide mb-4">1. Thu nhập tính thuế</h4>
                            <div className="space-y-3 sm:space-y-4 text-sm">
                              <div className="flex justify-between items-center">
                                <span className="text-[13px] text-[#5f6368]">Lương cơ hữu:</span>
                                <div className="relative w-32">
                                  <input
                                    type="text"
                                    value={baseSalaryInput === 0 ? '' : baseSalaryInput.toLocaleString('vi-VN')}
                                    onChange={handleSalaryInputChange}
                                    className="w-full bg-slate-50 border border-[#dadce0] rounded-lg px-2 py-1 text-right font-medium text-[#202124] focus:ring-1 focus:ring-[#1a73e8] focus:bg-white outline-none pr-5 transition-colors"
                                    placeholder="0"
                                  />
                                  <span className="absolute right-1.5 top-1.5 text-[10px] text-[#5f6368]">₫</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[13px] text-[#5f6368]">Thù lao coi thi:</span>
                                <span className="font-medium text-[#202124]">{grossIncome.toLocaleString('vi-VN')} ₫</span>
                              </div>
                              <div className="flex justify-between items-center border-t border-[#f1f3f4] pt-3">
                                <span className="font-medium text-[#202124]">Tổng cộng:</span>
                                <span className="font-bold text-[#1a73e8]">{combinedGross.toLocaleString('vi-VN')} ₫</span>
                              </div>
                            </div>
                          </div>

                          {/* Col 2: Giảm trừ */}
                          <div className="bg-white border border-[#dadce0] rounded-2xl p-4 sm:p-5">
                            <h4 className="text-xs font-bold text-[#5f6368] uppercase tracking-wide mb-4">2. Các khoản giảm trừ</h4>
                            <div className="space-y-3 sm:space-y-4 text-sm">
                              <div className="flex justify-between items-center">
                                <span className="text-[13px] text-[#5f6368]">Bản thân:</span>
                                <span className="font-medium text-[#202124]">11.000.000 ₫</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[13px] text-[#5f6368]">Người phụ thuộc:</span>
                                <div className="relative w-20">
                                  <input
                                    type="number"
                                    value={dependentsInput === 0 ? '' : dependentsInput}
                                    onChange={(e) => setDependentsInput(parseInt(e.target.value) || 0)}
                                    className="w-full bg-slate-50 border border-[#dadce0] rounded-lg px-2 py-1 text-right font-medium text-[#202124] focus:ring-1 focus:ring-[#1a73e8] focus:bg-white outline-none pr-7 transition-colors"
                                    placeholder="0"
                                    min="0"
                                  />
                                  <span className="absolute right-1.5 top-1.5 text-[10px] text-[#5f6368]">người</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center border-t border-[#f1f3f4] pt-3">
                                <span className="font-medium text-[#202124]">Tổng giảm trừ:</span>
                                <span className="font-bold text-[#d93025]">{pitDeductions.toLocaleString('vi-VN')} ₫</span>
                              </div>
                            </div>
                          </div>

                          {/* Col 3: Kết quả */}
                          <div className="bg-blue-50/30 border border-[#1a73e8]/20 rounded-2xl p-4 sm:p-5">
                            <h4 className="text-xs font-bold text-[#1a73e8] uppercase tracking-wide mb-4">3. Nghĩa vụ Thuế</h4>
                            <div className="space-y-3 sm:space-y-4 text-sm">
                              <div className="flex justify-between items-center">
                                <span className="text-[13px] text-[#5f6368]">Cơ sở tính thuế:</span>
                                <span className="font-medium text-[#202124]">{taxableCombined.toLocaleString('vi-VN')} ₫</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[13px] text-[#5f6368]">Tổng thuế phát sinh:</span>
                                <span className="font-bold text-[#d93025]">{combinedTax.toLocaleString('vi-VN')} ₫</span>
                              </div>
                              <div className="flex justify-between items-center border-t border-[#1a73e8]/10 pt-3">
                                <span className="font-medium text-[#202124] text-xs">Thuế của riêng coi thi:</span>
                                <span className="font-bold text-[#202124]">{actualTaxDueForCoiThi.toLocaleString('vi-VN')} ₫</span>
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* Summary Status Box */}
                        <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-[#dadce0] flex flex-col sm:flex-row justify-between items-center gap-4">
                          <div className="text-center sm:text-left">
                            <h4 className="text-sm font-bold text-[#202124] mb-1">Đánh giá chênh lệch Thuế ({taxRate}% tạm thu)</h4>
                            <p className="text-xs text-[#5f6368]">
                              Đã nộp: <span className="font-medium text-[#202124]">{taxAmount.toLocaleString('vi-VN')} ₫</span> —
                              Thực tế: <span className="font-medium text-[#202124]">{actualTaxDueForCoiThi.toLocaleString('vi-VN')} ₫</span>
                            </p>
                          </div>

                          <div className="w-full sm:w-auto">
                            {taxDifference > 0 ? (
                              <div className="bg-emerald-50 text-emerald-800 rounded-xl px-5 py-2.5 text-center border border-emerald-200">
                                <span className="block text-[10px] font-bold uppercase tracking-wider mb-0.5">Dự kiến được hoàn</span>
                                <span className="text-lg sm:text-xl font-bold">+{taxDifference.toLocaleString('vi-VN')} ₫</span>
                              </div>
                            ) : taxDifference < 0 ? (
                              <div className="bg-red-50 text-red-800 rounded-xl px-5 py-2.5 text-center border border-red-200">
                                <span className="block text-[10px] font-bold uppercase tracking-wider mb-0.5">Dự kiến nộp thêm</span>
                                <span className="text-lg sm:text-xl font-bold">{Math.abs(taxDifference).toLocaleString('vi-VN')} ₫</span>
                              </div>
                            ) : (
                              <div className="bg-white text-[#5f6368] rounded-xl px-5 py-2.5 text-center border border-[#dadce0]">
                                <span className="block text-[10px] font-bold uppercase tracking-wider mb-0.5">Trạng thái</span>
                                <span className="text-lg sm:text-xl font-bold text-[#202124]">Cân bằng</span>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )}

              </div>
            </>
          )}
        </div>
      </div>

      {showToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 bg-[#002147] hover:bg-[#002147]/95 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-lg shadow-[#002147]/30 flex items-center justify-center transition-all z-30 hover:-translate-y-1 active:scale-95"
        >
          <FiChevronUp className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {/* MODAL: INCOME SETTINGS */}
      {isSettingsOpen && (
        <div className="modal fixed inset-0 bg-[#202124]/40 backdrop-blur-sm items-center justify-center p-4 z-50 flex active">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh] relative mx-4">

            {/* Header Modal */}
            <div className="px-6 py-5 flex justify-between items-center border-b border-[#dadce0]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1a73e8] flex items-center justify-center text-lg">
                  <FiSliders />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#202124]">Cấu hình đơn giá</h2>
                  <p className="text-[11px] sm:text-xs text-[#5f6368] mt-0.5">Tùy chỉnh đơn giá và các thông số tính thuế.</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-[#5f6368] hover:bg-slate-100 transition-colors"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            {/* Body Modal */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white">

              {/* Mặc định chung */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#202124]">Mặc định chung</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Default Rate */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#5f6368] mb-1.5">Đơn giá Tiết chuẩn</label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={generalDefaultRate === 0 ? '' : generalDefaultRate.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\D/g, '');
                          setGeneralDefaultRate(parseInt(rawValue, 10) || 0);
                        }}
                        className="w-full h-11 px-3 pr-8 border border-[#dadce0] rounded-xl text-sm font-medium text-[#202124] focus:ring-2 focus:ring-[#1a73e8]/20 focus:border-[#1a73e8] outline-none transition-all"
                        placeholder="VD: 75.000"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-xs font-medium text-[#5f6368] pointer-events-none">₫</span>
                    </div>
                  </div>
                  {/* Tax Rate */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#5f6368] mb-1.5">Mức tạm thu thuế TNCN</label>
                    <div className="relative group">
                      <input
                        type="number"
                        value={generalTaxRate === 0 ? '' : generalTaxRate}
                        onChange={(e) => setGeneralTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-full h-11 px-3 pr-8 border border-[#dadce0] rounded-xl text-sm font-medium text-[#d93025] focus:ring-2 focus:ring-[#1a73e8]/20 focus:border-[#1a73e8] outline-none transition-all"
                        placeholder="VD: 10"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-xs font-medium text-[#5f6368] pointer-events-none">%</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSaveGeneralSettings}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#f1f5f9] hover:bg-slate-200 text-[#3c4043] font-medium rounded-full text-xs transition-colors flex items-center justify-center mx-auto mt-2"
                >
                  Lưu cấu hình mặc định
                </button>
              </div>

              <hr className="border-[#f1f3f4]" />

              {/* Ngoại lệ */}
              <div>
                <h3 className="text-sm font-bold text-[#202124] mb-1">Trường hợp ngoại lệ</h3>
                <p className="text-xs text-[#5f6368] mb-4">Các môn tính thù lao riêng theo <strong>Buổi</strong> (VD: Đồ án, Thực tập).</p>

                {/* Form thêm ngoại lệ */}
                <div className="flex flex-col sm:flex-row gap-3 mb-5 bg-slate-50 p-3 rounded-2xl border border-[#dadce0]">
                  <div className="flex-grow">
                    <select
                      value={exceptionSubject}
                      onChange={(e) => setExceptionSubject(e.target.value)}
                      className="w-full h-11 px-3 border border-[#dadce0] bg-white rounded-xl text-xs sm:text-sm text-[#3c4043] focus:ring-2 focus:ring-[#1a73e8]/20 focus:border-[#1a73e8] outline-none cursor-pointer"
                    >
                      <option value="">-- Chọn môn học --</option>
                      {uniqueSubjectsInDb.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-40 relative">
                    <input
                      type="text"
                      value={exceptionRate === 0 ? '' : exceptionRate.toLocaleString('vi-VN')}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/\D/g, '');
                        setExceptionRate(parseInt(rawValue, 10) || 0);
                      }}
                      className="w-full h-11 px-3 pr-8 border border-[#dadce0] bg-white rounded-xl text-sm font-medium text-[#b45309] focus:ring-2 focus:ring-[#1a73e8]/20 focus:border-[#1a73e8] outline-none"
                      placeholder="Đơn giá / Buổi"
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-medium text-[#5f6368] pointer-events-none">₫</span>
                  </div>
                  <button
                    onClick={handleAddException}
                    className="h-11 px-5 bg-white border border-[#dadce0] hover:bg-slate-50 text-[#1a73e8] font-medium rounded-xl transition-colors flex items-center justify-center flex-shrink-0"
                  >
                    Thêm
                  </button>
                </div>

                {/* Danh sách ngoại lệ */}
                <div className="bg-white rounded-2xl border border-[#dadce0] overflow-hidden min-h-[100px] max-h-48 overflow-y-auto custom-scrollbar">
                  {Object.keys(settings.subjectRates).length === 0 ? (
                    <div className="h-[100px] flex items-center justify-center text-xs text-[#9aa0a6] italic">
                      Chưa có cấu hình ngoại lệ nào.
                    </div>
                  ) : (
                    <ul className="divide-y divide-[#f1f3f4]">
                      {Object.entries(settings.subjectRates).map(([subject, rate]) => (
                        <li key={subject} className="flex justify-between items-center px-4 py-3 hover:bg-slate-50 transition-colors">
                          <div>
                            <p className="font-medium text-[#202124] text-xs sm:text-sm line-clamp-1" title={subject}>{subject}</p>
                            <p className="text-[#b45309] font-medium text-xs mt-0.5">
                              {rate.toLocaleString('vi-VN')} ₫ <span className="text-[#5f6368] font-normal">/ Buổi</span>
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteException(subject)}
                            className="text-[#9aa0a6] hover:text-[#d93025] hover:bg-red-50 p-2 rounded-full transition-colors flex-shrink-0 ml-2"
                            title="Xóa ngoại lệ"
                          >
                            <FiTrash2 className="text-sm" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 bg-slate-50 border-t border-[#dadce0] flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-6 py-2 bg-white border border-[#dadce0] text-[#3c4043] hover:bg-slate-100 font-medium rounded-full transition-colors text-sm"
              >
                Hoàn tất
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}