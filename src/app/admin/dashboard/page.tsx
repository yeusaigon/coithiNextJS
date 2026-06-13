'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useSidebar } from '@/app/admin/layout';
import { db } from '@/lib/firebase';
import { 
  collection, doc, addDoc, onSnapshot, query, orderBy, deleteDoc, updateDoc, writeBatch, Timestamp, getDoc 
} from 'firebase/firestore';
import { defaultSubjects } from '@/lib/subjects';
import { 
  exportToExcel, generateGoogleCalendarLink, downloadSingleICS, exportMonthToICS, Schedule 
} from '@/lib/export';
import * as XLSX from 'xlsx';

import { 
  FiPlus, FiCalendar, FiClock, FiUpload, FiDownload, FiX, FiChevronUp, FiChevronDown, FiCheck, FiEdit3, FiTrash2, FiMenu 
} from 'react-icons/fi';
import { FaGoogle, FaFileExcel, FaCircleInfo, FaFileImport, FaGraduationCap, FaBookOpen } from 'react-icons/fa6';

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

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { toggleSidebar } = useSidebar();

  // --- STATE ---
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState('iuh');
  const [customTimeMap, setCustomTimeMap] = useState<any>({});
  
  // Modal toggle state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteUpcomingOpen, setIsDeleteUpcomingOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [isExportExcelOpen, setIsExportExcelOpen] = useState(false);
  const [isExportGcalOpen, setIsExportGcalOpen] = useState(false);

  // Form State
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [entryMode, setEntryMode] = useState<'standard' | 'priority'>('standard');
  const [examDate, setExamDate] = useState('');
  const [subject, setSubject] = useState('');
  const [startPeriod, setStartPeriod] = useState<number>(1);
  const [endPeriod, setEndPeriod] = useState<number>(5);
  const [prioritySubject, setPrioritySubject] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [note, setNote] = useState('');

  // Selected schedule for single actions (e.g. deletion)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Import State
  const [schedulesToImport, setSchedulesToImport] = useState<Schedule[]>([]);
  const [importCount, setImportCount] = useState(0);
  const [showImportToast, setShowImportToast] = useState(false);

  // Export State
  const [selectedExportMonth, setSelectedExportMonth] = useState('all');

  // Deletion by Month State
  const [deleteMonthCheckboxes, setDeleteMonthCheckboxes] = useState<Record<string, boolean>>({});

  // Autocomplete lists
  const [subjectList, setSubjectList] = useState<string[]>([]);
  const [prioritySubjectList, setPrioritySubjectList] = useState<string[]>([]);

  // Show/Hide To Top Button
  const [showToTop, setShowToTop] = useState(false);

  // Countdown timer state
  const [upcomingCountdown, setUpcomingCountdown] = useState('-');
  const [showStatsMobile, setShowStatsMobile] = useState(true);
  const [countdownUrgency, setCountdownUrgency] = useState<'normal' | 'urgent' | 'ongoing'>('normal');
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'week' | 'month'>('all');

  // File Upload input reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- SCHOOL TIME MAP GETTER ---
  const getActiveTimeMap = () => {
    return school === 'custom' ? customTimeMap : DEFAULT_SCHOOL_TIME_MAP;
  };

  // --- RESOLVE END DATE TIME ---
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

  const convertPeriodToTime = (start: number, end: number) => {
    const timeMap = getActiveTimeMap();
    const s = timeMap[start]?.start;
    const e = timeMap[end]?.end;
    return (s && e) ? `${s} - ${e}` : `Tiết ${start} - ${end}`;
  };

  // --- GREETING NAME ---
  const displayGreetingName = user?.displayName || 'Giảng viên';

  // --- CORE SYSTEM EFFECTS ---
  useEffect(() => {
    if (!user) return;

    // 1. Fetch settings
    const loadSchoolSetting = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid, 'settings', 'school'));
      if (snap.exists()) {
        const d = snap.data();
        setSchool(d.school || 'iuh');
        if (d.customMap) setCustomTimeMap(d.customMap);
      }
    };
    loadSchoolSetting();

    // 2. Subscribe to schedules
    const q = query(collection(db, 'users', user.uid, 'schedules'), orderBy("examDate", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSchedules = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Schedule));
      setSchedules(fetchedSchedules);
      setLoading(false);
    });

    // 3. Scroll listener for To Top button
    const handleScroll = () => {
      const container = document.getElementById('main-content-scroll');
      if (container) {
        setShowToTop(container.scrollTop > 300);
      }
    };
    const scrollContainer = document.getElementById('main-content-scroll');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      unsubscribe();
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [user]);

  // Autocomplete & Unique month parsing
  useEffect(() => {
    const defaultSet = new Set([...defaultSubjects, ...schedules.map(s => s.subject)]);
    setSubjectList(Array.from(defaultSet));

    const pSet = new Set<string>();
    schedules.forEach(s => {
      if (s.isPriority) pSet.add(s.subject);
    });
    setPrioritySubjectList(Array.from(pSet));
  }, [schedules]);

  // --- CALENDAR EXPORT MONTH OPTIONS ---
  const getUniqueMonths = () => {
    const months = schedules.map(s => {
      const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    return Array.from(new Set(months)).sort().reverse();
  };

  // --- NEAREST UPCOMING COUNTDOWN TIMER ---
  const upcomingSchedules = schedules
    .filter(s => getEndDateTime(s) >= new Date())
    .sort((a, b) => {
      const timeA = typeof a.examDate.toMillis === 'function' ? a.examDate.toMillis() : new Date(a.examDate).getTime();
      const timeB = typeof b.examDate.toMillis === 'function' ? b.examDate.toMillis() : new Date(b.examDate).getTime();
      return timeA - timeB || a.startPeriod - b.startPeriod;
    });

  const nextUpcoming = upcomingSchedules[0] || null;

  useEffect(() => {
    if (!nextUpcoming) {
      setUpcomingCountdown('-');
      setCountdownUrgency('normal');
      return;
    }

    let startStr = '07:00';
    if (nextUpcoming.type === 'session' && nextUpcoming.examSession) {
      if (nextUpcoming.examSession.includes('Sáng')) startStr = '07:00';
      else if (nextUpcoming.examSession.includes('Chiều')) startStr = '13:00';
      else startStr = '18:00';
    } else {
      const timeMap = getActiveTimeMap();
      startStr = timeMap[nextUpcoming.startPeriod]?.start || '07:00';
    }

    const d = typeof nextUpcoming.examDate.toDate === 'function' ? nextUpcoming.examDate.toDate() : new Date(nextUpcoming.examDate);
    const targetTime = new Date(d.getTime());
    const [h, m] = startStr.split(':').map(Number);
    targetTime.setHours(h, m, 0, 0);

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = targetTime.getTime() - now;
      const endTime = getEndDateTime(nextUpcoming).getTime();

      if (now >= targetTime.getTime() && now <= endTime) {
        setUpcomingCountdown("Đang diễn ra");
        setCountdownUrgency('ongoing');
        return;
      }

      if (diff <= 0) {
        setUpcomingCountdown("Đã kết thúc");
        setCountdownUrgency('normal');
        return;
      }

      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setUpcomingCountdown(`${days > 0 ? days + 'd ' : ''}${hours}h ${minutes}m`);

      if (diff <= 2 * 3600 * 1000) {
        setCountdownUrgency('urgent');
      } else {
        setCountdownUrgency('normal');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [nextUpcoming, school, customTimeMap]);

  // --- CRUD FUNCTIONS ---

  const handleOpenAddModal = () => {
    setScheduleId(null);
    setEntryMode('standard');
    setExamDate(new Date().toISOString().split('T')[0]);
    setSubject('');
    setStartPeriod(1);
    setEndPeriod(5);
    setPrioritySubject('');
    setSelectedSessions([]);
    setNote('');
    setIsScheduleModalOpen(true);
  };

  const handleOpenEditModal = (s: Schedule) => {
    setScheduleId(s.id);
    const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
    setExamDate(d.toISOString().split('T')[0]);
    setNote(s.note || '');
    
    if (s.type === 'session') {
      setEntryMode('priority');
      setPrioritySubject(s.subject);
      setSelectedSessions(s.examSession ? s.examSession.split(', ') : []);
    } else {
      setEntryMode('standard');
      setSubject(s.subject);
      setStartPeriod(s.startPeriod);
      setEndPeriod(s.endPeriod);
    }
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!examDate) {
      showToast("Vui lòng chọn ngày thi", "error");
      return;
    }

    const payload: Partial<Schedule> = {
      examDate: Timestamp.fromDate(new Date(examDate)),
      note: note.trim()
    };

    if (entryMode === 'priority') {
      const finalSubj = prioritySubject.trim().toUpperCase();
      if (!finalSubj) {
        showToast("Vui lòng nhập môn thi", "error");
        return;
      }
      if (selectedSessions.length === 0) {
        showToast("Vui lòng chọn ít nhất 1 buổi thi", "error");
        return;
      }
      payload.type = 'session';
      payload.subject = finalSubj;
      payload.isPriority = true;
      payload.examSession = selectedSessions.join(', ');

      let minStart = 16;
      let maxEnd = 1;
      if (selectedSessions.includes('Sáng')) { minStart = Math.min(minStart, 1); maxEnd = Math.max(maxEnd, 5); }
      if (selectedSessions.includes('Chiều')) { minStart = Math.min(minStart, 7); maxEnd = Math.max(maxEnd, 11); }
      if (selectedSessions.includes('Tối')) { minStart = Math.min(minStart, 13); maxEnd = Math.max(maxEnd, 16); }
      payload.startPeriod = minStart;
      payload.endPeriod = maxEnd;
    } else {
      const finalSubj = subject.trim();
      if (!finalSubj) {
        showToast("Vui lòng nhập môn thi", "error");
        return;
      }
      if (endPeriod < startPeriod) {
        showToast("Tiết kết thúc phải lớn hơn hoặc bằng tiết bắt đầu", "error");
        return;
      }
      payload.type = 'standard';
      payload.subject = finalSubj;
      payload.startPeriod = startPeriod;
      payload.endPeriod = endPeriod;
      payload.isPriority = false;
    }

    try {
      if (scheduleId) {
        await updateDoc(doc(db, 'users', user.uid, 'schedules', scheduleId), payload);
        showToast('Đã cập nhật lịch thi thành công', 'success');
      } else {
        await addDoc(collection(db, 'users', user.uid, 'schedules'), payload);
        showToast('Đã thêm mới lịch thi thành công', 'success');
      }
      setIsScheduleModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast("Gặp lỗi trong quá trình lưu dữ liệu", "error");
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
      showToast('Đã xóa lịch thi thành công', 'success');
    } catch (e) {
      showToast('Lỗi khi xóa lịch thi', 'error');
    } finally {
      setIsDeleteConfirmOpen(false);
      setSelectedSchedule(null);
    }
  };

  // --- BATCH DELETE UPCOMING SCHEDULES BY MONTH ---
  const handleOpenDeleteUpcoming = () => {
    const now = new Date();
    const upcoming = schedules.filter(s => getEndDateTime(s) >= now);

    const months: Record<string, number> = {};
    upcoming.forEach(s => {
      const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = (months[key] || 0) + 1;
    });

    const checkStates: Record<string, boolean> = {};
    Object.keys(months).forEach(k => {
      checkStates[k] = false;
    });
    setDeleteMonthCheckboxes(checkStates);
    setIsDeleteUpcomingOpen(true);
  };

  const handleConfirmDeleteUpcoming = async () => {
    if (!user) return;
    const selectedMonths = Object.keys(deleteMonthCheckboxes).filter(k => deleteMonthCheckboxes[k]);
    if (selectedMonths.length === 0) {
      showToast("Vui lòng chọn ít nhất 1 tháng", "error");
      return;
    }

    if (!confirm("Bạn có chắc chắn muốn xóa TẤT CẢ lịch CHƯA DIỄN RA trong các tháng đã chọn?")) return;

    setIsDeleteUpcomingOpen(false);
    setLoading(true);

    try {
      const batch = writeBatch(db);
      let deletedCount = 0;
      const now = new Date();

      schedules.forEach(s => {
        if (getEndDateTime(s) >= now) {
          const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (selectedMonths.includes(key)) {
            batch.delete(doc(db, 'users', user.uid, 'schedules', s.id));
            deletedCount++;
          }
        }
      });

      if (deletedCount > 0) {
        await batch.commit();
        showToast(`Đã xóa ${deletedCount} lịch thi sắp tới.`, 'success');
      } else {
        showToast("Không tìm thấy dữ liệu hợp lệ để xóa.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Lỗi khi thực hiện xóa hàng loạt", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- EXCEL IMPORT LOGIC ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportOpen(false);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1, raw: true }) as any[][];

        const parsed = parseExcelData(rows);
        if (parsed.length > 0) {
          showImportPreview(parsed);
        } else {
          showToast("Không tìm thấy dữ liệu hợp lệ trong file Excel", "error");
        }
      } catch (err: any) {
        showToast("Lỗi phân tích file Excel: " + err.message, "error");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const parseExcelSerialDate = (serial: number) => {
    const excelDays = parseFloat(String(serial));
    if (isNaN(excelDays)) return null;
    const jsDate = new Date((excelDays - 25569) * 86400 * 1000);
    return new Date(jsDate.getTime() + (jsDate.getTimezoneOffset() * 60000));
  };

  const parseExcelData = (rows: any[][]) => {
    if (!rows || rows.length === 0) return [];
    let headerIndex = -1;
    let cols: string[] = [];
    const normalizeStr = (str: any) => {
      if (!str) return '';
      return String(str)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase();
    };

    for (let i = 0; i < rows.length; i++) {
      if (!rows[i] || !Array.isArray(rows[i])) continue;
      const normalizedLine = normalizeStr(rows[i].join(' '));
      if (normalizedLine.includes('mon') && normalizedLine.includes('ngay')) {
        headerIndex = i;
        cols = rows[i].map(c => normalizeStr(c));
        break;
      }
    }

    if (headerIndex === -1) throw new Error("Không tìm thấy hàng tiêu đề bảng");

    const idxSub = cols.findIndex(c => c.includes('mon'));
    const idxDate = cols.findIndex(c => c.includes('ngay'));
    const idxStart = cols.findIndex(c => c.includes('tu') || c.includes('bat dau'));
    const idxEnd = cols.findIndex(c => c.includes('den') || c.includes('ket thuc'));
    const idxNote = cols.findIndex(c => c.includes('ghi chu'));

    if ([idxSub, idxDate, idxStart, idxEnd].includes(-1)) throw new Error("Thiếu cột bắt buộc (Môn, Ngày, Từ tiết, Đến tiết).");

    const results: Schedule[] = [];
    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length <= Math.max(idxSub, idxDate, idxStart, idxEnd)) continue;
      const subVal = row[idxSub];
      const dateVal = row[idxDate];
      const startVal = row[idxStart];
      const endVal = row[idxEnd];
      if (!subVal || !dateVal) continue;

      try {
        let finalDate: Date | null = null;
        if (typeof dateVal === 'number') {
          finalDate = parseExcelSerialDate(dateVal);
        } else {
          const dateParts = String(dateVal).match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
          if (dateParts) {
            finalDate = new Date(Number(dateParts[3]), Number(dateParts[2]) - 1, Number(dateParts[1]));
          }
        }
        if (!finalDate || isNaN(finalDate.getTime())) continue;

        results.push({
          id: '',
          type: 'standard',
          subject: String(subVal).trim(),
          examDate: Timestamp.fromDate(finalDate),
          startPeriod: parseInt(startVal) || 1,
          endPeriod: parseInt(endVal) || 2,
          note: idxNote !== -1 && row[idxNote] ? String(row[idxNote]).trim() : '',
          isPriority: false
        });
      } catch (e) {
        console.error("Lỗi parse dòng", i, e);
      }
    }
    return results;
  };

  const showImportPreview = (data: Schedule[]) => {
    setSchedulesToImport(data);
    setIsImportPreviewOpen(true);
  };

  const handleConfirmImport = async () => {
    if (!user) return;
    const batch = writeBatch(db);
    const colRef = collection(db, 'users', user.uid, 'schedules');
    let added = 0;

    schedulesToImport.forEach(s => {
      const dateMillis = typeof s.examDate.toMillis === 'function' ? s.examDate.toMillis() : new Date(s.examDate).getTime();
      const isDup = schedules.some(ex => {
        const exMillis = typeof ex.examDate.toMillis === 'function' ? ex.examDate.toMillis() : new Date(ex.examDate).getTime();
        return ex.subject === s.subject && exMillis === dateMillis && ex.startPeriod === s.startPeriod;
      });
      if (!isDup) {
        const docRef = doc(colRef);
        batch.set(docRef, s);
        added++;
      }
    });

    setIsImportPreviewOpen(false);
    if (added > 0) {
      setLoading(true);
      await batch.commit();
      setLoading(false);
      setImportCount(added);
      setShowImportToast(true);
      setTimeout(() => setShowImportToast(false), 4000);
    } else {
      showToast("Không có dữ liệu mới để thêm.", "info");
    }
    setSchedulesToImport([]);
  };

  // --- SCROLL TO TOP UTILITY ---
  const handleScrollToTop = () => {
    const container = document.getElementById('main-content-scroll');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Filter upcoming schedules based on segment selection
  const getFilteredUpcoming = () => {
    const now = new Date();
    return upcomingSchedules.filter(s => {
      if (scheduleFilter === 'all') return true;

      const examDateObj = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);

      if (scheduleFilter === 'month') {
        return examDateObj.getMonth() === now.getMonth() && examDateObj.getFullYear() === now.getFullYear();
      }

      if (scheduleFilter === 'week') {
        const today = new Date();
        const day = today.getDay();
        const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diffToMonday));
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday.getTime());
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const examTime = examDateObj.getTime();
        return examTime >= monday.getTime() && examTime <= sunday.getTime();
      }

      return true;
    });
  };

  // Group schedules by year-month for rendering
  const getGroupedSchedules = () => {
    const filtered = getFilteredUpcoming();
    const groups: Record<string, Schedule[]> = {};
    filtered.forEach(s => {
      const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    return groups;
  };

  const groupedUpcoming = getGroupedSchedules();
  const hasUpcoming = upcomingSchedules.length > 0;

  // Calculate monthly stats
  const thisMonthSchedules = schedules.filter(s => {
    const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
    return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
  });
  const thisMonthCount = thisMonthSchedules.length;
  const thisMonthPriorityCount = thisMonthSchedules.filter(s => s.isPriority).length;

  // Dynamic styling based on urgency
  const getUrgencyClasses = () => {
    if (countdownUrgency === 'ongoing') {
      return {
        cardBg: 'bg-gradient-to-br from-[#800020] via-[#991B1B] to-[#B45309] border-red-500/20 animate-[pulse_2.5s_infinite_ease-in-out]',
        badgeBg: 'bg-white/20 border border-white/30 text-white animate-pulse',
        countdownBg: 'bg-white/20 border border-white/20 backdrop-blur-md',
        countdownText: 'text-white font-black'
      };
    }
    if (countdownUrgency === 'urgent') {
      return {
        cardBg: 'bg-gradient-to-br from-[#B45309] via-[#c26a1b] to-[#D4AF37] border-amber-500/20 shadow-md',
        badgeBg: 'bg-white/20 border border-white/35 text-white',
        countdownBg: 'bg-white/15 border border-white/15 backdrop-blur-md',
        countdownText: 'text-white font-extrabold'
      };
    }
    return {
      cardBg: 'bg-gradient-to-br from-[#002147] via-[#002b5c] to-[#003366] border-slate-200/10',
      badgeBg: 'bg-[#D4AF37]/20 border border-[#D4AF37]/35 text-[#FFE699]',
      countdownBg: 'bg-white/10 border border-white/10 backdrop-blur-md',
      countdownText: 'text-[#FFE699]'
    };
  };

  const urgency = getUrgencyClasses();

  const formatCardDate = (schedule: Schedule) => {
    const d = typeof schedule.examDate.toDate === 'function' ? schedule.examDate.toDate() : new Date(schedule.examDate);
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

  return (
    <>
      {/* Header bar */}
      <header className="dashboard-header bg-white/80 backdrop-blur-lg border-b border-slate-200/50 h-[4.5rem] flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0 z-20 sticky top-0 transition-shadow">
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleSidebar}
            className="text-slate-500 hover:text-slate-800 lg:hidden focus:outline-none p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <FiMenu className="h-5.5 w-5.5" />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block">Tổng quan</span>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight cursor-default">Bảng điều khiển</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Add schedule button - hidden on mobile as mobile uses FAB */}
          <button 
            onClick={handleOpenAddModal}
            className="hidden sm:flex bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-xl transition-all duration-150 items-center gap-1.5 shadow-sm active:scale-95 text-sm"
            title="Tạo lịch thi mới"
          >
            <FiPlus className="text-base" />
            <span>Tạo lịch</span>
          </button>
          
          <div className="h-5 w-px bg-slate-200/80 mx-1 hidden sm:block"></div>
          
          <button 
            onClick={() => setIsImportOpen(true)}
            className="w-9 h-9 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-xl flex items-center justify-center transition-all focus:outline-none active:scale-95 text-slate-600" 
            title="Nhập từ Excel"
          >
            <FaFileImport className="text-sm" />
          </button>
          
          <button 
            onClick={() => exportToExcel(schedules, showToast)}
            className="w-9 h-9 bg-slate-100 hover:bg-green-50 hover:text-green-600 rounded-xl flex items-center justify-center transition-all focus:outline-none active:scale-95 text-slate-600" 
            title="Xuất ra Excel"
          >
            <FaFileExcel className="text-sm" />
          </button>
          
          <button 
            onClick={() => setIsExportGcalOpen(true)}
            className="w-9 h-9 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl flex items-center justify-center transition-all focus:outline-none active:scale-95 text-slate-600" 
            title="Lưu vào Google Lịch"
          >
            <FaGoogle className="text-sm" />
          </button>
          
          <button 
            onClick={handleOpenDeleteUpcoming}
            className="w-9 h-9 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-xl flex items-center justify-center transition-all focus:outline-none active:scale-95 text-slate-600" 
            title="Xóa lịch sắp tới"
          >
            <FiCalendar className="text-sm" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content-scroll" className="dashboard-page flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth bg-[#F2F2F7]">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto space-y-6">
          
          {/* SKELETON LOADER */}
          {loading && (
            <div className="space-y-4">
              <div className="bg-white/60 p-8 rounded-2xl animate-pulse h-36 border border-slate-200/40"></div>
              <div className="bg-white/60 p-4 rounded-2xl border border-slate-200/40 animate-pulse h-20"></div>
              <div className="bg-white/60 p-4 rounded-2xl border border-slate-200/40 animate-pulse h-20"></div>
            </div>
          )}

          {/* DASHBOARD ACTUAL CONTENT */}
          {!loading && (
            <>
               {/* Hero Section Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Side: Countdown Card */}
                {hasUpcoming && nextUpcoming ? (
                  <div className={`lg:col-span-2 bg-gradient-to-br p-6 sm:p-7 rounded-2xl border shadow-md relative overflow-hidden group hover:shadow-lg transition-all duration-300 flex flex-col justify-between min-h-[170px] ${urgency.cardBg}`}>
                    {/* Academic watermark graduation cap icon */}
                    <FaGraduationCap className="absolute -right-4 -bottom-6 text-white/5 text-8xl sm:text-9xl transform -rotate-12 pointer-events-none transition-transform duration-500 group-hover:scale-105" />
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 w-full my-auto">
                      <div className="space-y-1.5 max-w-xl">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-colors duration-300 ${urgency.badgeBg}`}>
                          <FaBookOpen className="text-[10px]" />
                          <span>Lịch thi sắp tới</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight pt-1">
                          {nextUpcoming.subject}
                        </h3>
                        <p className="text-blue-100/80 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                          <FiClock className="text-blue-200/70 text-sm" />
                          {nextUpcoming.type === 'session' ? (
                            `Buổi ${nextUpcoming.examSession}`
                          ) : (
                            `Tiết ${nextUpcoming.startPeriod} - ${nextUpcoming.endPeriod} (${convertPeriodToTime(nextUpcoming.startPeriod, nextUpcoming.endPeriod)})`
                          )}
                        </p>
                      </div>
                      
                      <div className={`text-left sm:text-right p-3.5 sm:p-4 rounded-xl min-w-[130px] w-full sm:w-auto shadow-inner transition-colors duration-300 ${urgency.countdownBg}`}>
                        <span className="block text-[9px] font-bold text-blue-200 uppercase tracking-widest">Đếm ngược</span>
                        <div className={`text-2xl sm:text-3xl tracking-tight mt-0.5 tabular-nums transition-colors duration-300 ${urgency.countdownText}`}>
                          {upcomingCountdown}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/40 shadow-sm flex flex-col items-center justify-center text-center min-h-[170px]">
                    <div className="bg-[#002147]/5 p-3 rounded-full mb-3 text-[#002147]">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707-.707m12.728 12.728l.707-.707M12 8v4l3 3" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">Thư giãn nhé!</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Hiện tại bạn không có lịch coi thi nào sắp tới.</p>
                  </div>
                )}
                
                {/* Right Side: Stats Widget */}
                <div className={`bg-white rounded-2xl border border-slate-200/40 shadow-sm p-5 relative overflow-hidden flex flex-col justify-between group hover:shadow-md transition-all duration-300 ${showStatsMobile ? 'min-h-[170px]' : 'min-h-0 sm:min-h-[170px]'}`}>
                  <FaBookOpen className="absolute -right-4 -bottom-4 text-slate-100/60 text-7xl transform rotate-12 pointer-events-none transition-transform duration-500 group-hover:scale-105" />
                  
                  <div className="relative z-10 flex flex-col h-full justify-between gap-3.5">
                    <div className="flex justify-between items-start w-full">
                      <div>
                        <span className="text-[9px] text-[#B45309] font-extrabold uppercase tracking-wider block">Thống kê coi thi</span>
                        <h3 className="text-sm font-black text-[#002147] tracking-tight mt-0.5">Tháng {new Date().getMonth() + 1} / {new Date().getFullYear()}</h3>
                      </div>
                      
                      {/* Mobile Toggle Button */}
                      <button
                        type="button"
                        onClick={() => setShowStatsMobile(prev => !prev)}
                        className="sm:hidden flex items-center justify-center text-[10px] font-extrabold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-all active:scale-95 border border-slate-200/40"
                      >
                        {showStatsMobile ? 'Tạm ẩn' : 'Hiện lại'}
                      </button>
                    </div>
                    
                    <div className={`grid grid-cols-3 gap-2 ${showStatsMobile ? 'grid' : 'hidden sm:grid'}`}>
                      <div className="bg-[#002147]/5 border border-[#002147]/10 p-2 rounded-xl text-center">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Tổng ca</span>
                        <span className="text-base font-black text-[#002147] mt-0.5 block">{thisMonthCount}</span>
                      </div>
                      <div className="bg-[#B45309]/5 border border-[#B45309]/10 p-2 rounded-xl text-center">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Sắp tới</span>
                        <span className="text-base font-black text-[#B45309] mt-0.5 block">{upcomingSchedules.length}</span>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-xl text-center">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Ưu tiên</span>
                        <span className="text-base font-black text-emerald-700 mt-0.5 block">{thisMonthPriorityCount}</span>
                      </div>
                    </div>
                    
                    <div className={`text-[10px] text-slate-400 font-bold border-t border-slate-100 pt-2 flex items-center justify-between ${showStatsMobile ? 'flex' : 'hidden sm:flex'}`}>
                      <span>TỔNG LỊCH ĐÃ LƯU:</span>
                      <span className="font-extrabold text-[#002147]">{schedules.length} ca</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedules List with Segment Filters */}
              {hasUpcoming && (
                <div className="space-y-4 pb-20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest cursor-default">Danh sách lịch thi</h3>
                    
                    {/* Segment Control Filter */}
                    <div className="ios-segment-control w-full sm:w-72">
                      <button
                        onClick={() => setScheduleFilter('all')}
                        className={`ios-segment-button ${scheduleFilter === 'all' ? 'active' : ''}`}
                      >
                        Tất cả ({upcomingSchedules.length})
                      </button>
                      <button
                        onClick={() => setScheduleFilter('week')}
                        className={`ios-segment-button ${scheduleFilter === 'week' ? 'active' : ''}`}
                      >
                        Tuần này
                      </button>
                      <button
                        onClick={() => setScheduleFilter('month')}
                        className={`ios-segment-button ${scheduleFilter === 'month' ? 'active' : ''}`}
                      >
                        Tháng này
                      </button>
                    </div>
                  </div>

                  {Object.keys(groupedUpcoming).length > 0 ? (
                    <div className="space-y-6">
                      {Object.keys(groupedUpcoming).sort().map(monthKey => {
                        const group = groupedUpcoming[monthKey];
                        const [year, month] = monthKey.split('-');
                        return (
                          <div key={monthKey} className="space-y-2.5">
                            <h3 className="month-header">THÁNG {month} / {year}</h3>
                            <div className="ios-list-group">
                              {group.map(s => {
                                const { dateNum, monthNum, dayLabel, bgClass, textClass } = formatCardDate(s);
                                return (
                                  <div 
                                    key={s.id}
                                    className="ios-list-item flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                                  >
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                      <div className={`flex-shrink-0 text-center w-12 h-12 ${bgClass} rounded-xl flex flex-col justify-center items-center`}>
                                        <p className={`text-xl font-extrabold ${textClass} leading-none`}>{dateNum}</p>
                                        <p className={`text-[9px] font-bold uppercase ${textClass} mt-0.5`}>{dayLabel}</p>
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5 flex-wrap">
                                          {s.subject}
                                          {s.isPriority && (
                                            <span className="px-1.5 py-0.5 rounded-md text-[8px] uppercase font-bold bg-[#B45309]/10 text-[#B45309] border border-[#B45309]/20">Ưu tiên</span>
                                          )}
                                        </h4>
                                        <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                                          <FiClock className="h-3.5 w-3.5 text-slate-400" />
                                          {s.type === 'session' ? (
                                            <span>Buổi {s.examSession}</span>
                                          ) : (
                                            <span>Tiết {s.startPeriod} - {s.endPeriod} ({convertPeriodToTime(s.startPeriod, s.endPeriod)})</span>
                                          )}
                                        </p>
                                        {s.note && (
                                          <p className="text-[11px] text-slate-400 mt-1 italic flex items-center gap-1">
                                            <FiEdit3 className="h-3 w-3" />
                                            {s.note}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2.5 sm:pt-0">
                                      <a 
                                        href={generateGoogleCalendarLink(s, getActiveTimeMap(), school)} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="w-8 h-8 rounded-full bg-slate-50 hover:bg-[#002147]/5 hover:text-[#002147] text-slate-500 flex items-center justify-center transition-all active:scale-90" 
                                        title="Thêm vào Google Calendar"
                                      >
                                        <FaGoogle className="h-3.5 w-3.5" />
                                      </a>
                                      <button 
                                        onClick={() => downloadSingleICS(s, getActiveTimeMap(), school, showToast)}
                                        className="w-8 h-8 rounded-full bg-slate-50 hover:bg-[#002147]/5 hover:text-[#002147] text-slate-500 flex items-center justify-center transition-all active:scale-90" 
                                        title="Tải file .ICS"
                                      >
                                        <FiDownload className="h-3.5 w-3.5" />
                                      </button>
                                      <div className="w-px h-4 bg-slate-200 mx-1 hidden sm:block"></div>
                                      <button 
                                        onClick={() => handleOpenEditModal(s)}
                                        className="w-8 h-8 rounded-full bg-slate-50 hover:bg-[#002147]/5 hover:text-[#002147] text-slate-500 flex items-center justify-center transition-all active:scale-90" 
                                        title="Sửa"
                                      >
                                        <FiEdit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => handleOpenDeleteConfirm(s)}
                                        className="w-8 h-8 rounded-full bg-slate-50 hover:bg-[#991B1B]/5 hover:text-[#991B1B] text-slate-500 flex items-center justify-center transition-all active:scale-90" 
                                        title="Xóa"
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
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl border border-slate-200/40 p-6 shadow-sm">
                      <FiCalendar className="text-slate-300 text-5xl mb-2.5 animate-bounce-slow" />
                      <h4 className="text-sm font-bold text-slate-850">Không tìm thấy ca thi</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Không tìm thấy ca thi nào phù hợp với bộ lọc đã chọn.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>

        {/* Floating Add Button - iOS Rounded FAB style */}
        <button 
          onClick={handleOpenAddModal}
          className="sm:hidden fixed bottom-6 right-6 bg-blue-500 hover:bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl z-40 transition-transform active:scale-90 focus:outline-none"
        >
          <FiPlus />
        </button>
        
        {showToTop && (
          <button 
            onClick={handleScrollToTop}
            className="fixed bottom-24 sm:bottom-8 right-6 sm:right-8 bg-white/95 border border-slate-200/80 backdrop-blur-md text-slate-600 w-11 h-11 rounded-full shadow-sm flex items-center justify-center transition-all z-30 active:scale-95"
          >
            <FiChevronUp className="w-5 h-5" />
          </button>
        )}
      </main>

      {/* MODAL: CREATE / EDIT SCHEDULE */}
      {isScheduleModalOpen && (
        <div className="modal fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 active transition-opacity">
          <div className="ios-bottom-sheet w-full sm:max-w-lg flex flex-col overflow-hidden max-h-[92vh] sm:mx-4 relative">
            {/* Drag Handle on mobile */}
            <div className="sm:hidden ios-drag-indicator"></div>
            
            <button 
              onClick={() => setIsScheduleModalOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors z-10"
            >
              <FiX className="text-base" />
            </button>
            <div className="px-6 pt-5 pb-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {scheduleId ? 'Chỉnh Sửa Lịch Thi' : 'Thêm Lịch Mới'}
              </h2>
            </div>
            
            <div className="px-6 pb-2">
              <div className="ios-segment-control">
                <div 
                  onClick={() => setEntryMode('standard')}
                  className={`ios-segment-button ${entryMode === 'standard' ? 'active' : ''}`}
                >
                  Theo Tiết
                </div>
                <div 
                  onClick={() => setEntryMode('priority')}
                  className={`ios-segment-button ${entryMode === 'priority' ? 'active' : ''}`}
                >
                  Theo Buổi
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-6 pt-2 space-y-4 flex-grow overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Ngày thi <span className="text-red-500">*</span></label>
                <input 
                  type="date" 
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="modal-input" 
                  required
                />
              </div>

              {entryMode === 'standard' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Môn thi <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      list="subject-list" 
                      className="modal-input font-bold" 
                      autoComplete="off" 
                      placeholder="VD: Toán cao cấp"
                      required={entryMode === 'standard'}
                    />
                    <datalist id="subject-list">
                      {subjectList.map(s => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 text-center">Từ tiết <span className="text-red-500">*</span></label>
                      <input 
                        type="number" 
                        value={startPeriod}
                        onChange={(e) => setStartPeriod(parseInt(e.target.value) || 1)}
                        className="modal-input text-center font-mono font-bold" 
                        min="1" 
                        max="16" 
                        placeholder="1"
                        required={entryMode === 'standard'}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 text-center">Đến tiết <span className="text-red-500">*</span></label>
                      <input 
                        type="number" 
                        value={endPeriod}
                        onChange={(e) => setEndPeriod(parseInt(e.target.value) || 1)}
                        className="modal-input text-center font-mono font-bold" 
                        min="1" 
                        max="16" 
                        placeholder="5"
                        required={entryMode === 'standard'}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2.5">
                    <FaCircleInfo className="mt-0.5 flex-shrink-0" />
                    <p className="font-semibold leading-relaxed">Dành cho môn tính thù lao theo buổi (VD: VSTEP, IELTS...).</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Tên môn <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={prioritySubject}
                      onChange={(e) => setPrioritySubject(e.target.value.toUpperCase())}
                      list="priority-subject-list" 
                      className="modal-input uppercase font-extrabold text-blue-600 tracking-wide" 
                      autoComplete="off" 
                      placeholder="VD: VSTEP"
                      required={entryMode === 'priority'}
                    />
                    <datalist id="priority-subject-list">
                      {prioritySubjectList.map(s => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">Buổi thi <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Sáng', 'Chiều', 'Tối'].map(s => {
                        const isChecked = selectedSessions.includes(s);
                        const periodLabel = s === 'Sáng' ? '1 - 5' : s === 'Chiều' ? '7 - 11' : '13 - 16';
                        return (
                          <label key={s} className="cursor-pointer">
                            <input 
                              type="checkbox" 
                              name="exam-session" 
                              value={s} 
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSessions(prev => [...prev, s]);
                                } else {
                                  setSelectedSessions(prev => prev.filter(item => item !== s));
                                }
                              }}
                              className="session-checkbox hidden"
                            />
                            <div className={`border rounded-xl p-2.5 text-center transition-all ${
                              isChecked ? 'bg-blue-50 border-blue-500 text-blue-600 ring-2 ring-blue-500/10' : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}>
                              <span className="block text-xs font-bold">{s}</span>
                              <span className="text-[9px] text-slate-400 font-mono font-bold">{periodLabel}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Ghi chú</label>
                <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2} 
                  className="modal-input" 
                  placeholder="Phòng thi, lưu ý..."
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition shadow-sm active:scale-95 text-sm"
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SINGLE DELETE CONFIRMATION */}
      {isDeleteConfirmOpen && (
        <div className="modal fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 active">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs text-center relative mx-4 border border-slate-100">
            <button 
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <FiX className="text-sm" />
            </button>
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
              <FiTrash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Xóa lịch thi này?</h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">Hành động này không thể hoàn tác.</p>
            <button 
              onClick={handleDeleteSchedule}
              className="w-full bg-red-500 text-white font-bold py-3 px-4 rounded-xl hover:bg-red-600 transition active:scale-95 text-xs"
            >
              Xóa vĩnh viễn
            </button>
          </div>
        </div>
      )}

      {/* MODAL: DELETE UPCOMING BY MONTH */}
      {isDeleteUpcomingOpen && (
        <div className="modal fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 z-50 active">
          <div className="ios-bottom-sheet w-full sm:max-w-md p-6 text-center relative overflow-hidden">
            <div className="sm:hidden ios-drag-indicator"></div>
            <button 
              onClick={() => setIsDeleteUpcomingOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors z-10"
            >
              <FiX className="text-base" />
            </button>
            <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-3">
              <FiCalendar className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Dọn dẹp Lịch Sắp Tới</h2>
            <p className="text-slate-500 text-xs mb-5">Chỉ xóa các lịch <strong>chưa diễn ra</strong> thuộc các tháng bạn chọn dưới đây.</p>
            
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 mb-5 max-h-40 overflow-y-auto custom-scrollbar text-left">
              {Object.keys(deleteMonthCheckboxes).length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-xs font-semibold">Bạn không có lịch sắp tới nào.</div>
              ) : (
                <div className="space-y-2">
                  {Object.keys(deleteMonthCheckboxes).sort().map(m => {
                    const [year, month] = m.split('-');
                    const label = `Tháng ${month}/${year}`;
                    
                    const count = schedules.filter(s => {
                      if (getEndDateTime(s) < new Date()) return false;
                      const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
                      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === m;
                    }).length;

                    return (
                      <label 
                        key={m}
                        className="flex items-center justify-between p-2.5 bg-white border border-slate-200/70 rounded-xl cursor-pointer hover:border-orange-500 hover:bg-orange-50/50 transition-all group"
                      >
                        <div className="flex items-center gap-2.5">
                          <input 
                            type="checkbox" 
                            checked={deleteMonthCheckboxes[m]}
                            onChange={(e) => {
                              setDeleteMonthCheckboxes(prev => ({
                                ...prev,
                                [m]: e.target.checked
                              }));
                            }}
                            className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500"
                          />
                          <span className="font-bold text-xs text-slate-800 group-hover:text-orange-600 transition-colors">{label}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                          {count} lịch
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <button 
              onClick={handleConfirmDeleteUpcoming}
              disabled={Object.keys(deleteMonthCheckboxes).length === 0}
              className={`w-full py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition active:scale-95 text-xs ${
                Object.keys(deleteMonthCheckboxes).length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Xóa lịch đã chọn
            </button>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT EXCEL */}
      {isImportOpen && (
        <div className="modal fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 active">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 mx-4 text-center relative border border-slate-150">
            <button 
              onClick={() => setIsImportOpen(false)}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <FiX className="text-sm" />
            </button>
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-3">
              <FaFileImport className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1.5">Nhập File Excel</h2>
            <p className="text-slate-400 text-xs mb-5 leading-relaxed">
              Tải lên file Excel lịch thi được kết xuất từ hệ thống của trường học. Trợ lý sẽ tự động loại bỏ các dòng thừa.
            </p>
            <label className="cursor-pointer w-full py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition flex items-center justify-center gap-1.5 active:scale-95 text-xs">
              <FiUpload /> Chọn File .XLS / .XLSX
              <input 
                ref={fileInputRef}
                type="file" 
                onChange={handleFileUpload}
                className="hidden" 
                accept=".xls, .xlsx, .csv"
              />
            </label>
          </div>
        </div>
      )}

      {/* MODAL: EXCEL IMPORT PREVIEW */}
      {isImportPreviewOpen && (
        <div className="modal fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 z-50 active">
          <div className="ios-bottom-sheet w-full sm:max-w-2xl flex flex-col max-h-[85vh] sm:mx-4 relative overflow-hidden">
            <button 
              onClick={() => setIsImportPreviewOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors z-10"
            >
              <FiX className="text-base" />
            </button>
            <div className="p-5 border-b border-slate-100 pr-12 bg-white">
              <h2 className="text-base font-bold text-slate-900">Xem trước dữ liệu</h2>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Tìm thấy {schedulesToImport.length} lịch thi. Trùng: {
                  schedulesToImport.filter(s => {
                    const dateMillis = typeof s.examDate.toMillis === 'function' ? s.examDate.toMillis() : new Date(s.examDate).getTime();
                    return schedules.some(ex => {
                      const exMillis = typeof ex.examDate.toMillis === 'function' ? ex.examDate.toMillis() : new Date(ex.examDate).getTime();
                      return ex.subject === s.subject && exMillis === dateMillis && ex.startPeriod === s.startPeriod;
                    });
                  }).length
                } lịch.
              </p>
            </div>
            
            <div className="flex-grow overflow-y-auto custom-scrollbar bg-slate-50">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] text-slate-400 uppercase bg-slate-100/85 border-b border-slate-200 sticky top-0 font-bold">
                  <tr>
                    <th className="px-5 py-2.5 font-bold">Môn Thi</th>
                    <th className="px-5 py-2.5 font-bold">Ngày</th>
                    <th className="px-5 py-2.5 font-bold text-center">Tiết</th>
                    <th className="px-5 py-2.5 font-bold text-right">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 bg-white">
                  {schedulesToImport.map((s, idx) => {
                    const dateMillis = typeof s.examDate.toMillis === 'function' ? s.examDate.toMillis() : new Date(s.examDate).getTime();
                    const isDup = schedules.some(ex => {
                      const exMillis = typeof ex.examDate.toMillis === 'function' ? ex.examDate.toMillis() : new Date(ex.examDate).getTime();
                      return ex.subject === s.subject && exMillis === dateMillis && ex.startPeriod === s.startPeriod;
                    });
                    const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{s.subject}</td>
                        <td className="p-4 text-slate-500 font-semibold">{d.toLocaleDateString('vi-VN')}</td>
                        <td className="p-4 text-slate-500 font-mono text-center font-bold">{s.startPeriod}-{s.endPeriod}</td>
                        <td className="p-4 text-right">
                          {isDup ? (
                            <span className="inline-block bg-yellow-50 border border-yellow-100 text-yellow-600 px-2 py-0.5 rounded-md text-[9px] font-bold">Trùng</span>
                          ) : (
                            <span className="inline-block bg-green-50 border border-green-100 text-green-600 px-2 py-0.5 rounded-md text-[9px] font-bold">Mới</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-white">
              <button 
                onClick={handleConfirmImport}
                className="w-full py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition active:scale-95 text-xs"
              >
                Xác nhận Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXPORT TO GOOGLE CALENDAR (ICS) */}
      {isExportGcalOpen && (
        <div className="modal fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 z-50 active">
          <div className="ios-bottom-sheet w-full sm:max-w-sm p-6 text-center relative overflow-hidden">
            <button 
              onClick={() => setIsExportGcalOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors z-10"
            >
              <FiX className="text-base" />
            </button>
            
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-150 shadow-xs flex items-center justify-center mx-auto mb-3 text-blue-500">
                <FaGoogle className="text-2xl" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900 mb-1">Đồng bộ Lịch</h2>
              <p className="text-slate-400 text-xs mb-5 leading-relaxed">
                Tạo file <span className="font-bold text-blue-500 bg-blue-50/50 px-1 py-0.5 rounded-md">.ICS</span> để nhập lịch thi vào Google Calendar hoặc Outlook.
              </p>
              
              <div className="mb-5 text-left bg-slate-50 p-3 rounded-xl border border-slate-150">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Chọn thời gian</label>
                <div className="relative">
                  <select 
                    value={selectedExportMonth}
                    onChange={(e) => setSelectedExportMonth(e.target.value)}
                    className="block w-full border border-slate-200 rounded-lg shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all p-2.5 pr-10 outline-none text-xs font-bold text-slate-700 bg-white appearance-none cursor-pointer"
                  >
                    <option value="all">Tất cả thời gian</option>
                    {getUniqueMonths().map(m => {
                      const [year, month] = m.split('-');
                      return <option key={m} value={m}>{`Tháng ${month}/${year}`}</option>;
                    })}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                    <FiChevronDown className="text-sm" />
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  setIsExportGcalOpen(false);
                  exportMonthToICS(schedules, selectedExportMonth, getActiveTimeMap(), school, showToast);
                }}
                className="w-full py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition active:scale-95 flex items-center justify-center gap-1.5 text-xs shadow-sm"
              >
                <FiDownload /> Tải file .ICS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMART SUCCESS TOAST FOR EXCEL IMPORT */}
      {showImportToast && (
        <div 
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] flex items-center bg-white rounded-2xl shadow-xl border border-slate-150 p-3 pr-5 gap-3.5 w-[calc(100%-2rem)] max-w-sm pointer-events-auto transition-all duration-500"
          style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 border border-emerald-100">
            <FiCheck className="text-xl text-emerald-600" />
          </div>
          <div>
            <h4 className="text-slate-900 font-bold text-xs sm:text-sm">Nhập thành công!</h4>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Đã nạp <span className="font-bold text-emerald-600">{importCount}</span> lịch coi thi mới.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
