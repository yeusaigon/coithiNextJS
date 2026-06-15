'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useSidebar } from '@/app/admin/layout';
import { db } from '@/lib/firebase';
import { useDelayedBoolean } from '@/hooks/useDelayedBoolean';
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  getDocs,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { handleBackupJSON, handleRestoreJSON } from '@/lib/backup';
import {
  FiMenu,
  FiClock,
  FiSliders,
  FiSave,
  FiBell,
  FiDownload,
  FiUpload,
  FiTrash2,
  FiAlertTriangle,
  FiX,
  FiCheck
} from 'react-icons/fi';
import { FaSun, FaCloudSun, FaMoon, FaBroom } from 'react-icons/fa6';

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

interface ScheduleItem {
  id?: string;
  examDate: any;
  subject: string;
  startPeriod: number;
  endPeriod: number;
  isPriority?: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { toggleSidebar } = useSidebar();

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'school' | 'general'>('school');
  const [schoolType, setSchoolType] = useState<'iuh' | 'custom'>('iuh');
  const [customMap, setCustomMap] = useState<Record<number, { start: string; end: string }>>({});
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const showSkeleton = useDelayedBoolean(loading, 1000);
  const [submitting, setSubmitting] = useState(false);

  // Notification state
  const [hasNotificationSupport, setHasNotificationSupport] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Modals state
  const [isDeleteMonthOpen, setIsDeleteMonthOpen] = useState(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  // --- COMPUTE MONTHS ---
  const monthsData: Record<string, number> = {};
  schedules.forEach(s => {
    const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
    if (!isNaN(d.getTime())) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsData[key] = (monthsData[key] || 0) + 1;
    }
  });
  const sortedMonths = Object.keys(monthsData).sort().reverse();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const support = 'Notification' in window;
      setHasNotificationSupport(support);
      if (support) {
        setNotificationsEnabled(Notification.permission === 'granted');
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Load school hours configurations
    const loadSchoolConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid, 'settings', 'school'));
        if (snap.exists()) {
          const d = snap.data();
          setSchoolType(d.school || 'iuh');
          if (d.customMap) {
            setCustomMap(d.customMap);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadSchoolConfig();

    // Listen to schedules list for data clear helpers
    const q = query(collection(db, 'users', user.uid, 'schedules'), orderBy("examDate", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ScheduleItem));
      setSchedules(items);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // --- SAVE SCHOOL HOURS ---
  const handleSaveSchoolHours = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const payload: any = { school: schoolType };
      if (schoolType === 'custom') {
        // Validate custom inputs
        const finalizedMap: Record<number, { start: string; end: string }> = {};
        for (let i = 1; i <= 16; i++) {
          const slot = customMap[i] || { start: '', end: '' };
          if (slot.start && slot.end) {
            finalizedMap[i] = { start: slot.start, end: slot.end };
          } else {
            // Fill from IUH if empty
            finalizedMap[i] = DEFAULT_SCHOOL_TIME_MAP[i];
          }
        }
        payload.customMap = finalizedMap;
        setCustomMap(finalizedMap);
      }

      await setDoc(doc(db, 'users', user.uid, 'settings', 'school'), payload, { merge: true });
      showToast("Đã lưu cấu hình giờ học thành công!", "success");
    } catch (error) {
      console.error(error);
      showToast("Lỗi khi lưu cấu hình.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // --- NOTIFICATION HANDLER ---
  const handleNotificationToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasNotificationSupport) {
      showToast("Trình duyệt này không hỗ trợ hiển thị thông báo.", "error");
      return;
    }

    if (e.target.checked) {
      Notification.requestPermission().then(p => {
        if (p === 'granted') {
          setNotificationsEnabled(true);
          showToast("Đã kích hoạt quyền nhận thông báo thành công!", "success");
        } else {
          setNotificationsEnabled(false);
          showToast("Bạn đã từ chối cấp quyền thông báo.", "error");
        }
      });
    } else {
      showToast("Để tắt hoàn toàn, vui lòng điều chỉnh trong cài đặt quyền của Trình duyệt.", "info");
      setNotificationsEnabled(false);
    }
  };

  // --- RESTORE BACKUP ---
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (!file) return;

    handleRestoreJSON(
      file,
      user,
      setSubmitting,
      showToast,
      () => window.location.reload()
    );
    e.target.value = '';
  };

  // --- CLEAN DATA BY MONTHS ---
  const handleConfirmDeleteMonths = async () => {
    if (!user) return;
    if (selectedMonths.length === 0) {
      showToast("Vui lòng chọn ít nhất 1 tháng để dọn dẹp.", "info");
      return;
    }

    setIsDeleteMonthOpen(false);
    setSubmitting(true);
    try {
      const batch = writeBatch(db);
      let deleteCount = 0;

      schedules.forEach(s => {
        const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (selectedMonths.includes(key) && s.id) {
            batch.delete(doc(db, 'users', user.uid, 'schedules', s.id));
            deleteCount++;
          }
        }
      });

      if (deleteCount > 0) {
        await batch.commit();
        showToast(`Đã dọn dẹp thành công ${deleteCount} lịch thi cũ.`, "success");
        setSelectedMonths([]);
      } else {
        showToast("Không tìm thấy dữ liệu thi phù hợp.", "info");
      }
    } catch (err) {
      console.error(err);
      showToast("Gặp lỗi trong quá trình dọn dẹp dữ liệu.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // --- WIPE ALL DATA ---
  const handleConfirmDeleteAll = async () => {
    if (!user) return;
    setIsDeleteAllOpen(false);
    setSubmitting(true);
    try {
      const snap = await getDocs(collection(db, 'users', user.uid, 'schedules'));
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      showToast("Đã xóa sạch toàn bộ lịch coi thi khỏi hệ thống.", "success");
    } catch (err) {
      console.error(err);
      showToast("Gặp lỗi khi xóa dữ liệu.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMonthSelection = (month: string) => {
    setSelectedMonths(prev =>
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  // Get start/end time of a period
  const getTimeString = (period: number, field: 'start' | 'end') => {
    if (schoolType === 'custom') {
      return customMap[period]?.[field] || DEFAULT_SCHOOL_TIME_MAP[period][field];
    }
    return DEFAULT_SCHOOL_TIME_MAP[period][field];
  };

  const handleCustomTimeChange = (period: number, field: 'start' | 'end', val: string) => {
    setCustomMap(prev => {
      const slot = prev[period] || { ...DEFAULT_SCHOOL_TIME_MAP[period] };
      return {
        ...prev,
        [period]: {
          ...slot,
          [field]: val
        }
      };
    });
  };

  const shifts = [
    {
      title: 'Ca Sáng',
      sub: 'Tiết 1 - Tiết 6',
      icon: FaSun,
      iconColor: 'text-blue-500',
      bgGradient: 'from-blue-500 to-sky-400',
      borderColor: 'border-blue-100',
      bgLight: 'bg-blue-50/10',
      badgeBg: 'bg-blue-50 text-blue-700',
      periods: [1, 2, 3, 4, 5, 6]
    },
    {
      title: 'Ca Chiều',
      sub: 'Tiết 7 - Tiết 12',
      icon: FaCloudSun,
      iconColor: 'text-orange-500',
      bgGradient: 'from-orange-500 to-amber-400',
      borderColor: 'border-orange-100',
      bgLight: 'bg-orange-50/10',
      badgeBg: 'bg-orange-50 text-orange-700',
      periods: [7, 8, 9, 10, 11, 12]
    },
    {
      title: 'Ca Tối',
      sub: 'Tiết 13 - Tiết 16',
      icon: FaMoon,
      iconColor: 'text-purple-500',
      bgGradient: 'from-purple-500 to-indigo-400',
      borderColor: 'border-purple-100',
      bgLight: 'bg-purple-50/10',
      badgeBg: 'bg-purple-50 text-purple-700',
      periods: [13, 14, 15, 16]
    }
  ];

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
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block">Hệ thống</span>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight cursor-default">Cài đặt hệ thống</h1>
          </div>
        </div>
      </header>

      {/* Main Area */}
      <main className="admin-page flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth bg-[#F2F2F7]">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto space-y-6 pb-10">

          {/* TAB NAVIGATION - ĐỒNG BỘ THIẾT KẾ PILL / SEGMENTED CONTROL */}
          <div className="mb-2 sm:mb-4 animate-[fadeIn_0.3s_ease-out] flex overflow-x-auto hide-scrollbar mt-2 sm:mt-0">
            <div className="inline-flex items-center p-1.5 bg-[#f1f5f9] rounded-2xl flex-shrink-0">
              <button
                onClick={() => setActiveTab('school')}
                className={`flex items-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 text-[13px] sm:text-sm transition-all duration-200 rounded-xl whitespace-nowrap outline-none ${activeTab === 'school'
                    ? 'bg-white text-[#111827] font-bold shadow-sm'
                    : 'text-[#64748b] hover:text-[#334155] font-semibold'
                  }`}
              >
                <FiClock className={`h-4 w-4 ${activeTab === 'school' ? 'text-[#111827]' : 'text-[#94a3b8]'}`} />
                Khung giờ chuẩn
              </button>
              <button
                onClick={() => setActiveTab('general')}
                className={`flex items-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 text-[13px] sm:text-sm transition-all duration-200 rounded-xl whitespace-nowrap outline-none ${activeTab === 'general'
                    ? 'bg-white text-[#111827] font-bold shadow-sm'
                    : 'text-[#64748b] hover:text-[#334155] font-semibold'
                  }`}
              >
                <FiSliders className={`h-4 w-4 ${activeTab === 'general' ? 'text-[#111827]' : 'text-[#94a3b8]'}`} />
                Cài đặt chung
              </button>
            </div>
          </div>

          {/* SKELETON LOADING */}
          {loading && showSkeleton && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200/50 h-96 animate-pulse space-y-4">
              <div className="h-6 w-1/4 bg-slate-200 rounded"></div>
              <div className="h-4 w-1/2 bg-slate-100 rounded"></div>
              <div className="h-48 w-full bg-slate-50 rounded-2xl"></div>
            </div>
          )}

          {/* ACTUAL DISPLAY */}
          {!loading && (
            <div key={activeTab} className="animate-[fadeIn_0.4s_ease-out]">
              {/* TAB 1: KHUNG GIỜ CHUẨN */}
              {activeTab === 'school' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-[#dadce0] transition-shadow hover:shadow-[0_1px_3px_rgba(60,64,67,0.1)] relative overflow-hidden">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                          <FiClock className="text-[#1a73e8]" /> Cấu hình khung giờ
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Lựa chọn áp dụng khung giờ học tiêu chuẩn hoặc tùy chỉnh chi tiết cho từng tiết.</p>
                      </div>

                      {/* Pill Switcher - Đồng bộ thiết kế tab nhỏ bên trong */}
                      <div className="inline-flex items-center p-1.5 bg-[#f1f5f9] rounded-2xl flex-shrink-0 self-start">
                        <button
                          type="button"
                          onClick={() => setSchoolType('iuh')}
                          className={`px-4 py-2 text-xs sm:text-[13px] transition-all duration-200 rounded-xl whitespace-nowrap outline-none ${schoolType === 'iuh'
                              ? 'bg-white text-[#111827] font-bold shadow-sm'
                              : 'text-[#64748b] hover:text-[#334155] font-semibold'
                            }`}
                        >
                          ĐH Công nghiệp
                        </button>
                        <button
                          type="button"
                          onClick={() => setSchoolType('custom')}
                          className={`px-4 py-2 text-xs sm:text-[13px] transition-all duration-200 rounded-xl whitespace-nowrap outline-none ${schoolType === 'custom'
                              ? 'bg-white text-[#111827] font-bold shadow-sm'
                              : 'text-[#64748b] hover:text-[#334155] font-semibold'
                            }`}
                        >
                          Cá nhân hóa
                        </button>
                      </div>
                    </div>

                    {/* Shifts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {shifts.map((shift, idx) => {
                        const ShiftIcon = shift.icon;
                        return (
                          <div
                            key={idx}
                            className={`flex flex-col bg-white border ${shift.borderColor} ${shift.bgLight} rounded-3xl p-5 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md`}
                          >
                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${shift.bgGradient}`}></div>
                            <div className="flex items-center gap-3 mb-5 mt-1">
                              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                                <ShiftIcon className={`text-lg ${shift.iconColor}`} />
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-800 text-base">{shift.title}</h4>
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{shift.sub}</p>
                              </div>
                            </div>

                            <div className="space-y-3 flex-1">
                              {shift.periods.map(p => {
                                const startVal = getTimeString(p, 'start');
                                const endVal = getTimeString(p, 'end');

                                if (schoolType === 'custom') {
                                  return (
                                    <div
                                      key={p}
                                      className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-slate-300 transition-colors group"
                                    >
                                      <span className={`px-2.5 py-1 text-xs font-bold ${shift.badgeBg} rounded-lg transition-transform group-hover:scale-105`}>
                                        Tiết {p}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="time"
                                          value={startVal}
                                          onChange={(e) => handleCustomTimeChange(p, 'start', e.target.value)}
                                          className="w-[76px] text-center text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] rounded-lg p-1 transition-all outline-none"
                                        />
                                        <span className="text-slate-300 font-bold text-xs">-</span>
                                        <input
                                          type="time"
                                          value={endVal}
                                          onChange={(e) => handleCustomTimeChange(p, 'end', e.target.value)}
                                          className="w-[76px] text-center text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] rounded-lg p-1 transition-all outline-none"
                                        />
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div
                                      key={p}
                                      className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow transition-shadow"
                                    >
                                      <span className={`px-2.5 py-1 text-xs font-bold ${shift.badgeBg} rounded-lg`}>
                                        Tiết {p}
                                      </span>
                                      <span className="text-sm font-bold text-slate-700 bg-slate-50/50 px-3 py-1 rounded-lg border border-slate-100">
                                        {startVal} - {endVal}
                                      </span>
                                    </div>
                                  );
                                }
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={handleSaveSchoolHours}
                        disabled={submitting}
                        className="w-full sm:w-auto px-6 py-3.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FiSave />
                        <span>Lưu cấu hình giờ học</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CÀI ĐẶT CHUNG */}
              {activeTab === 'general' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                  {/* LEFT COLUMN: NOTIFICATION & BACKUP */}
                  <div className="flex flex-col gap-6">

                    {/* Assistant Reminder */}
                    <div className="bg-white p-6 rounded-3xl border border-[#dadce0] shadow-sm flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600 border border-yellow-100">
                          <FiBell className="text-lg" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-base">Trợ lý nhắc nhở</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Yêu cầu quyền thông báo để nhắc lịch trước 60 phút.</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationsEnabled}
                          onChange={handleNotificationToggle}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-205 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a73e8]"></div>
                      </label>
                    </div>

                    {/* Cloud Storage (JSON Backup/Restore) */}
                    <div className="bg-white p-6 rounded-3xl border border-[#dadce0] shadow-sm">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                          <FiDownload className="text-lg" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg">Sao lưu và khôi phục</h3>
                      </div>
                      <p className="text-xs text-slate-500 mb-5 leading-relaxed font-medium">Xuất toàn bộ lịch thi, thu nhập và cấu hình ra file JSON để lưu trữ hoặc khôi phục khi cần thiết.</p>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleBackupJSON(user!, schedules, showToast)}
                          className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200/60 rounded-2xl hover:bg-[#1a73e8]/5 hover:border-[#1a73e8]/20 hover:text-[#1a73e8] transition-all active:scale-95 group shadow-xs cursor-pointer"
                        >
                          <FiDownload className="text-2xl text-slate-400 group-hover:text-[#1a73e8] mb-2 transition-colors" />
                          <span className="text-xs font-bold text-slate-700 group-hover:text-[#1a73e8]">Tạo bản sao</span>
                        </button>

                        <label
                          htmlFor="restore-json-file"
                          className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200/60 rounded-2xl hover:bg-emerald-55/10 hover:border-emerald-200/55 hover:text-emerald-700 transition-all cursor-pointer active:scale-95 group shadow-xs"
                        >
                          <FiUpload className="text-2xl text-slate-400 group-hover:text-emerald-605 mb-2 transition-colors" />
                          <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700">Khôi phục</span>
                        </label>
                        <input
                          type="file"
                          id="restore-json-file"
                          onChange={handleRestoreFile}
                          className="hidden"
                          accept=".json"
                        />
                      </div>
                    </div>

                  </div>

                  {/* RIGHT COLUMN: DANGER ZONE */}
                  <div className="flex flex-col gap-6">

                    {/* Danger Zone Card */}
                    <div className="bg-white p-6 rounded-3xl border border-red-200 bg-red-50/10 relative overflow-hidden shadow-sm">
                      <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                      <div className="flex items-center gap-3 mb-5 pl-2">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-650 border border-red-100">
                          <FiAlertTriangle className="text-lg" />
                        </div>
                        <div>
                          <h3 className="font-bold text-red-700 text-lg">Vùng nguy hiểm</h3>
                          <p className="text-xs text-red-500/80 mt-0.5">Các thao tác xóa vĩnh viễn không thể khôi phục.</p>
                        </div>
                      </div>

                      <div className="space-y-3 pl-2">
                        <button
                          onClick={() => {
                            setSelectedMonths([]);
                            setIsDeleteMonthOpen(true);
                          }}
                          className="w-full p-4 bg-white border border-red-100 rounded-2xl hover:border-[#B45309]/30 hover:bg-[#B45309]/5 transition-all flex items-center justify-between group shadow-xs cursor-pointer"
                        >
                          <div className="text-left">
                            <h4 className="font-bold text-slate-805 group-hover:text-[#B45309] text-xs sm:text-sm">Dọn dẹp lịch cũ</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">Xóa chọn lọc danh sách lịch thi theo từng tháng.</p>
                          </div>
                          <FaBroom className="text-slate-300 group-hover:text-[#B45309] text-base" />
                        </button>

                        <button
                          onClick={() => setIsDeleteAllOpen(true)}
                          className="w-full p-4 bg-white border border-red-200 rounded-2xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all flex items-center justify-between group shadow-xs cursor-pointer"
                        >
                          <div className="text-left">
                            <h4 className="font-bold text-red-650 group-hover:text-white text-xs sm:text-sm">Xóa sạch hệ thống</h4>
                            <p className="text-[11px] text-slate-500 group-hover:text-red-100 mt-0.5">Đưa tài khoản dữ liệu về trạng thái trống ban đầu.</p>
                          </div>
                          <FiTrash2 className="text-red-400 group-hover:text-white text-base" />
                        </button>
                      </div>
                    </div>

                  </div>

                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* MODAL: DELETE BY MONTH */}
      {isDeleteMonthOpen && (
        <div className="modal fixed inset-0 bg-slate-900/60 backdrop-blur-md items-center justify-center p-4 z-50 flex active">
          <div className="admin-page bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center relative overflow-hidden mx-4">
            <button
              onClick={() => setIsDeleteMonthOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <FiX className="text-lg" />
            </button>
            <div className="modal-icon-wrapper bg-[#B45309]/10 text-[#B45309] mt-2 mx-auto w-12 h-12 rounded-full flex items-center justify-center text-lg mb-4">
              <FaBroom />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-2">Dọn dẹp lịch cũ</h2>
            <p className="text-slate-500 text-xs mb-6">Chọn các tháng bạn muốn xóa khỏi hệ thống.</p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 max-h-48 overflow-y-auto custom-scrollbar text-left">
              {sortedMonths.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-xs font-medium">Chưa có lịch thi nào để xóa.</div>
              ) : (
                <div className="space-y-2">
                  {sortedMonths.map(m => {
                    const [year, month] = m.split('-');
                    const isChecked = selectedMonths.includes(m);
                    return (
                      <label
                        key={m}
                        className={`flex items-center justify-between p-3 bg-white border rounded-xl cursor-pointer hover:border-[#B45309]/30 hover:bg-[#B45309]/5 transition-all group shadow-sm ${isChecked ? 'border-[#B45309] bg-[#B45309]/5' : 'border-slate-200'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMonthSelection(m)}
                            className="w-4 h-4 text-[#B45309] rounded border-slate-300 focus:ring-[#B45309] cursor-pointer"
                          />
                          <span className="font-bold text-slate-800 group-hover:text-[#B45309] transition-colors text-xs">
                            {`Tháng ${parseInt(month)}/${year}`}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md group-hover:bg-[#B45309]/10 group-hover:text-[#B45309] transition-colors">
                          {monthsData[m]} lịch
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={handleConfirmDeleteMonths}
              disabled={selectedMonths.length === 0 || submitting}
              className="w-full py-3 bg-[#B45309] hover:bg-[#B45309]/95 text-white font-bold rounded-xl shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs"
            >
              Xóa đã chọn
            </button>
          </div>
        </div>
      )}

      {/* MODAL: DELETE ALL */}
      {isDeleteAllOpen && (
        <div className="modal fixed inset-0 bg-slate-900/60 backdrop-blur-md items-center justify-center p-4 z-50 flex active">
          <div className="admin-page bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center border-t-4 border-red-500 relative mx-4">
            <button
              onClick={() => setIsDeleteAllOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <FiX className="text-lg" />
            </button>
            <div className="modal-icon-wrapper bg-red-50 text-red-600 mt-2 mb-2 mx-auto w-12 h-12 rounded-full flex items-center justify-center text-lg">
              <FiAlertTriangle />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2 mt-4">Cảnh báo Nguy hiểm!</h3>
            <p className="text-slate-500 text-xs mb-6 leading-relaxed">
              Bạn đang yêu cầu xóa <strong>TOÀN BỘ</strong> lịch coi thi của tài khoản.<br />Hành động này không thể hoàn tác.
            </p>
            <button
              onClick={handleConfirmDeleteAll}
              disabled={submitting}
              className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-600/30 active:scale-95 cursor-pointer text-xs"
            >
              Xóa vĩnh viễn
            </button>
          </div>
        </div>
      )}
    </>
  );
}