'use client';

import React, { useEffect, useState } from 'react';

interface ScheduleItem {
  id?: string;
  examDate: string | Date;
  subject: string;
  startPeriod: number;
  endPeriod: number;
  isPriority?: boolean;
}

export default function ReportPrintPage() {
  const [data, setData] = useState<ScheduleItem[]>([]);
  const [title, setTitle] = useState('');
  const [user, setUser] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const reportDataJSON = localStorage.getItem('reportData');
    const reportTitle = localStorage.getItem('reportTitle');
    const reportUser = localStorage.getItem('reportUser');

    if (!reportDataJSON) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(reportDataJSON);
      setData(parsed);
      setTitle(reportTitle || 'Báo cáo tổng hợp');
      setUser(reportUser || 'Giảng viên');
    } catch (error) {
      console.error('Lỗi dữ liệu báo cáo:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center pt-20 bg-slate-50 min-h-screen p-6">
        <p className="text-red-500 text-xl font-bold">Không có dữ liệu báo cáo.</p>
        <button onClick={() => window.close()} className="mt-4 text-blue-600 hover:underline">
          Đóng cửa sổ
        </button>
      </div>
    );
  }

  const totalSessions = data.length;
  const totalPeriods = data.reduce((acc, s) => acc + (Number(s.endPeriod) - Number(s.startPeriod) + 1), 0);

  return (
    <div className="bg-slate-100 min-h-screen p-4 md:p-8 text-slate-800 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto bg-white p-6 md:p-10 rounded-3xl shadow-xl border border-slate-200/50 print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start mb-8 pb-6 border-b border-slate-200 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Báo Cáo Coi Thi</h1>
            <p className="text-slate-500 mt-1 font-semibold text-lg">{title}</p>
          </div>
          <div className="sm:text-right">
            <p className="font-extrabold text-slate-800 text-xl">{user}</p>
            <p className="text-sm text-slate-400 mt-1">
              Ngày xuất: <span className="font-medium">{new Date().toLocaleDateString('vi-VN')}</span>
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse mb-8 text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs tracking-wider">
                <th className="p-4">Ngày thi</th>
                <th className="p-4">Môn thi</th>
                <th className="p-4">Thời gian</th>
                <th className="p-4 text-center">Số tiết</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 divide-y divide-slate-100">
              {data.map((s, index) => {
                const dateObj = new Date(s.examDate);
                const dateString = isNaN(dateObj.getTime())
                  ? String(s.examDate)
                  : dateObj.toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    });
                return (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-semibold">{dateString}</td>
                    <td className="p-4">
                      <span className="font-extrabold text-slate-800">{s.subject}</span>
                      {s.isPriority && (
                        <span className="text-red-500 text-xs font-bold ml-1.5 px-1.5 py-0.5 rounded-md bg-red-50 border border-red-100">
                          Ưu tiên
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500 font-medium">Tiết {s.startPeriod} - {s.endPeriod}</td>
                    <td className="p-4 text-center font-bold text-slate-900">{Number(s.endPeriod) - Number(s.startPeriod) + 1}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-full max-w-sm bg-slate-50 p-6 rounded-2xl border border-slate-200/50 shadow-inner">
            <h3 className="text-base font-extrabold mb-4 text-slate-800 uppercase tracking-wider">Tổng kết</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500">Tổng số buổi:</span>
                <span className="font-extrabold text-lg text-slate-800">{totalSessions}</span>
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-200">
                <span className="font-semibold text-slate-500">Tổng số tiết:</span>
                <span className="font-extrabold text-xl text-blue-600">{totalPeriods}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 text-center print:hidden flex justify-center gap-4">
          <button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/30 active:scale-95 cursor-pointer"
          >
            In Báo Cáo
          </button>
          <button
            onClick={() => window.close()}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-8 rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
