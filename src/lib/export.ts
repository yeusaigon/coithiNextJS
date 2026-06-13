import * as XLSX from 'xlsx';

export interface Schedule {
  id: string;
  subject: string;
  examDate: any; // Firebase Timestamp or ISO Date
  startPeriod: number;
  endPeriod: number;
  note?: string;
  type?: 'standard' | 'session';
  examSession?: string;
  isPriority?: boolean;
}

export function exportToExcel(allSchedules: Schedule[], showToast: (msg: string, type?: 'success' | 'error') => void) {
  if (allSchedules.length === 0) {
    showToast("Không có dữ liệu để xuất", "error");
    return;
  }
  
  const exportData = allSchedules.map((s, index) => {
    let dateStr = '';
    try {
      const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
      dateStr = d.toLocaleDateString('vi-VN');
    } catch (e) {
      dateStr = String(s.examDate);
    }
    return {
      "STT": index + 1,
      "Môn Thi": s.subject,
      "Ngày Thi": dateStr,
      "Từ Tiết": s.startPeriod || '',
      "Đến Tiết": s.endPeriod || '',
      "Ghi Chú": s.note || ''
    };
  });

  try {
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "LichCoiThi");
    XLSX.writeFile(workbook, "lich_coi_thi_sotay.xlsx");
    showToast("Đã xuất file Excel thành công!", "success");
  } catch (error) {
    console.error(error);
    showToast("Lỗi khi xuất file Excel.", "error");
  }
}

function formatUTC(date: Date, timeStr: string) {
  if (!timeStr || !timeStr.includes(':')) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0); 
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function generateGoogleCalendarLink(
  schedule: Schedule, 
  schoolTimeMaps: any, 
  currentUserSchool: string
) {
  const timeMap = schoolTimeMaps[currentUserSchool] || schoolTimeMaps.custom || {};
  let startStr = '07:00';
  let endStr = '09:00';
  
  if (schedule.type === 'session' && schedule.examSession) {
    if (schedule.examSession.includes('Sáng')) {
      startStr = '07:00'; endStr = '11:00';
    } else if (schedule.examSession.includes('Chiều')) {
      startStr = '13:00'; endStr = '17:00';
    } else {
      startStr = '18:00'; endStr = '21:00';
    }
  } else {
    startStr = timeMap[schedule.startPeriod]?.start || '07:00';
    endStr = timeMap[schedule.endPeriod]?.end || '09:00';
  }

  const d = typeof schedule.examDate.toDate === 'function' ? schedule.examDate.toDate() : new Date(schedule.examDate);
  const startDT = formatUTC(d, startStr);
  const endDT = formatUTC(d, endStr);
  
  if (!startDT || !endDT) return '#';
  
  const url = new URL("https://www.google.com/calendar/render");
  url.searchParams.append("action", "TEMPLATE");
  url.searchParams.append("text", `Coi thi: ${schedule.subject}`);
  url.searchParams.append("dates", `${startDT}/${endDT}`);
  url.searchParams.append("details", `Ghi chú: ${schedule.note || 'Không có'}`);
  return url.href;
}

export function downloadSingleICS(
  schedule: Schedule, 
  schoolTimeMaps: any, 
  currentUserSchool: string,
  showToast: (msg: string, type?: 'success' | 'error') => void
) {
  const timeMap = schoolTimeMaps[currentUserSchool] || schoolTimeMaps.custom || {};
  let startStr = '07:00';
  let endStr = '09:00';
  
  if (schedule.type === 'session' && schedule.examSession) {
    if (schedule.examSession.includes('Sáng')) {
      startStr = '07:00'; endStr = '11:00';
    } else if (schedule.examSession.includes('Chiều')) {
      startStr = '13:00'; endStr = '17:00';
    } else {
      startStr = '18:00'; endStr = '21:00';
    }
  } else {
    startStr = timeMap[schedule.startPeriod]?.start || '07:00';
    endStr = timeMap[schedule.endPeriod]?.end || '09:00';
  }
  
  const d = typeof schedule.examDate.toDate === 'function' ? schedule.examDate.toDate() : new Date(schedule.examDate);
  const startDT = formatUTC(d, startStr);
  const endDT = formatUTC(d, endStr);
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  if (!startDT || !endDT) { 
    showToast("Lỗi thời gian, không tạo được file ICS", "error"); 
    return; 
  }
  
  const icsContent = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SotayCoiThi//VN','BEGIN:VEVENT',
    `UID:${schedule.id}@coithi.app`,`DTSTAMP:${now}`,`DTSTART:${startDT}`,`DTEND:${endDT}`,
    `SUMMARY:Coi thi: ${schedule.subject}`,`DESCRIPTION:${schedule.note || ''}`,'END:VEVENT','END:VCALENDAR'
  ].join('\r\n');
  
  triggerDownload(icsContent, `LichCoiThi_${schedule.subject.replace(/\s+/g, '_')}.ics`, 'text/calendar;charset=utf-8');
}

export function exportMonthToICS(
  allSchedules: Schedule[], 
  selectedMonth: string, 
  schoolTimeMaps: any, 
  currentUserSchool: string,
  showToast: (msg: string, type?: 'success' | 'error') => void
) {
  const data = (selectedMonth === 'all') ? allSchedules : allSchedules.filter(s => {
    const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` === selectedMonth;
  });
  
  if (data.length === 0) {
    showToast("Không có dữ liệu trong thời gian này", "error");
    return;
  }
  
  let ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SotayCoiThi//VN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'
  ];
  
  data.forEach(s => {
    const timeMap = schoolTimeMaps[currentUserSchool] || schoolTimeMaps.custom || {};
    let startStr = '07:00';
    let endStr = '09:00';
    
    if (s.type === 'session' && s.examSession) {
      if (s.examSession.includes('Sáng')) {
        startStr = '07:00'; endStr = '11:00';
      } else if (s.examSession.includes('Chiều')) {
        startStr = '13:00'; endStr = '17:00';
      } else {
        startStr = '18:00'; endStr = '21:00';
      }
    } else {
      startStr = timeMap[s.startPeriod]?.start || '07:00';
      endStr = timeMap[s.endPeriod]?.end || '09:00';
    }
    
    const d = typeof s.examDate.toDate === 'function' ? s.examDate.toDate() : new Date(s.examDate);
    const startDT = formatUTC(d, startStr);
    const endDT = formatUTC(d, endStr);
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    if (startDT && endDT) {
      ics.push(
        'BEGIN:VEVENT',
        `UID:${s.id}@coithi.app`,
        `DTSTAMP:${now}`,
        `DTSTART:${startDT}`,
        `DTEND:${endDT}`,
        `SUMMARY:Coi thi: ${s.subject}`,
        `DESCRIPTION:${s.note || ''}`,
        'END:VEVENT'
      );
    }
  });
  ics.push('END:VCALENDAR');
  
  triggerDownload(ics.join('\r\n'), "lich_coi_thi.ics", 'text/calendar');
  showToast("Đã tải file đồng bộ Lịch!", "success");
}

function triggerDownload(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
