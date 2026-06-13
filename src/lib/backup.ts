import { db } from './firebase';
import { doc, getDoc, collection, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';

export interface ScheduleItem {
  id?: string;
  examDate: any; // Firestore Timestamp or Date or string
  subject: string;
  startPeriod: number;
  endPeriod: number;
  isPriority?: boolean;
  notes?: string;
  [key: string]: any;
}

export interface BackupData {
  version: number;
  timestamp: string;
  schedules: ScheduleItem[];
  settings: {
    income: any;
    school: any;
  };
}

export async function handleBackupJSON(
  currentUser: User,
  allSchedules: ScheduleItem[],
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
) {
  try {
    const settingsSnap = await getDoc(doc(db, 'users', currentUser.uid, 'settings', 'income'));
    const schoolSnap = await getDoc(doc(db, 'users', currentUser.uid, 'settings', 'school'));
    
    // Map schedules converting Timestamp objects to ISO strings
    const serializedSchedules = allSchedules.map(s => {
      let dateStr = '';
      if (s.examDate && typeof s.examDate.toDate === 'function') {
        dateStr = s.examDate.toDate().toISOString();
      } else if (s.examDate instanceof Date) {
        dateStr = s.examDate.toISOString();
      } else {
        dateStr = new Date(s.examDate).toISOString();
      }
      return {
        ...s,
        examDate: dateStr
      };
    });

    const backup: BackupData = {
      version: 1,
      timestamp: new Date().toISOString(),
      schedules: serializedSchedules,
      settings: {
        income: settingsSnap.exists() ? settingsSnap.data() : {},
        school: schoolSnap.exists() ? schoolSnap.data() : {}
      }
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.body.appendChild(document.createElement('a'));
    link.href = url;
    link.download = `backup_sotay_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast("Đã tải file sao lưu thành công!", "success");
  } catch(e) { 
    console.error(e); 
    showToast("Lỗi khi tạo file sao lưu.", "error"); 
  }
}

export async function handleRestoreJSON(
  file: File,
  currentUser: User,
  setLoading: (loading: boolean) => void,
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void,
  onComplete: () => void
) {
  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      if (!evt.target?.result) return;
      const data = JSON.parse(evt.target.result as string);
      
      if (!data.schedules || !Array.isArray(data.schedules)) {
        showToast("File JSON không chứa danh sách lịch thi hợp lệ.", "error");
        return;
      }

      const confirmRestore = confirm(
        `Khôi phục ${data.schedules.length} lịch thi? Toàn bộ dữ liệu hiện tại sẽ bị xóa.`
      );
      if (!confirmRestore) return;
      
      setLoading(true);
      const batch = writeBatch(db);
      
      // Clear all existing schedules
      const snap = await getDocs(collection(db, 'users', currentUser.uid, 'schedules'));
      snap.forEach(d => batch.delete(d.ref));
      
      // Phục hồi Settings
      if (data.settings?.income) {
        batch.set(doc(db, 'users', currentUser.uid, 'settings', 'income'), data.settings.income);
      }
      if (data.settings?.school) {
        batch.set(doc(db, 'users', currentUser.uid, 'settings', 'school'), data.settings.school);
      }
      
      // Phục hồi Schedules
      data.schedules.forEach((s: any) => {
        const ref = doc(collection(db, 'users', currentUser.uid, 'schedules'));
        
        // Convert ISO date string back to Timestamp
        const parsedDate = new Date(s.examDate);
        const firebaseDate = isNaN(parsedDate.getTime()) ? Timestamp.now() : Timestamp.fromDate(parsedDate);

        // Remove id field from document body to prevent duplicate fields
        const { id, ...rest } = s;

        batch.set(ref, {
          ...rest,
          examDate: firebaseDate
        });
      });
      
      await batch.commit();
      showToast("Khôi phục thành công! Trang web sẽ tải lại.", "success");
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch(err) { 
      console.error(err);
      showToast("File JSON không hợp lệ.", "error"); 
      setLoading(false);
    }
  };
  reader.readAsText(file);
}
