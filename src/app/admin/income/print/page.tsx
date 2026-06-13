'use client';

import React, { useEffect, useState } from 'react';

interface PrintPayload {
  user: { name: string; email: string };
  data: {
    period: string;
    showDate: boolean;
    breakdown: Record<string, {
      quantity: number;
      dates: string[];
      isSession: boolean;
      rate: number;
      total: number;
    }>;
    totals: {
      gross: number;
      tax: number;
      net: number;
    };
  };
}

export default function IncomePrintPage() {
  const [payload, setPayload] = useState<PrintPayload | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('printData');
    if (!raw) {
      alert("Không tìm thấy dữ liệu báo cáo.");
      window.close();
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setPayload(parsed);
      
      // Auto trigger system print dialog after load
      setTimeout(() => {
        window.print();
      }, 800);
    } catch (e) {
      console.error(e);
      alert("Lỗi hiển thị dữ liệu.");
    }
  }, []);

  if (!payload) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500 font-medium animate-pulse">Đang tải dữ liệu in ấn...</p>
      </div>
    );
  }

  const { user, data } = payload;

  return (
    <div className="bg-gray-100 min-h-screen text-slate-800 print:bg-white py-8">
      {/* Print Controls */}
      <div className="print:hidden fixed top-4 right-4 flex gap-2 z-50">
        <button 
          onClick={() => window.print()} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg active:scale-95 transition-all text-sm cursor-pointer"
        >
          In Ngay
        </button>
        <button 
          onClick={() => window.close()} 
          className="bg-white hover:bg-gray-100 text-gray-700 font-bold py-2.5 px-5 rounded-xl shadow border border-gray-300 active:scale-95 transition-all text-sm cursor-pointer"
        >
          Đóng
        </button>
      </div>

      {/* A4 Page Simulation container */}
      <div className="print-container bg-white max-w-[210mm] min-h-[297mm] mx-auto p-8 sm:p-16 shadow-md print:shadow-none print:p-0 flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wide text-gray-900">Báo Cáo Thu Nhập</h1>
              <p className="text-sm text-gray-500 mt-1">Sổ Tay Coi Thi</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-800">PHIẾU KÊ KHAI</div>
              <div className="text-sm text-gray-500 mt-1">
                Ngày xuất: {new Date().toLocaleDateString('vi-VN')}
              </div>
            </div>
          </div>
        </div>

        {/* Info Block */}
        <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
          <div>
            <p className="text-gray-500">Người thực hiện:</p>
            <p className="font-bold text-gray-900 text-lg">{user.name}</p>
            <p className="text-gray-600">{user.email}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">Giai đoạn báo cáo:</p>
            <p className="font-bold text-blue-700 text-lg">{data.period}</p>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-grow">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-xs">
                <th className="py-3 px-2 border-b border-gray-300 w-10 text-center">STT</th>
                <th className="py-3 px-2 border-b border-gray-300">Nội dung (Môn học)</th>
                {data.showDate && <th className="py-3 px-2 border-b border-gray-300">Ngày thi</th>}
                <th className="py-3 px-2 border-b border-gray-300 text-center">ĐVT</th>
                <th className="py-3 px-2 border-b border-gray-300 text-center text-xs">SL</th>
                <th className="py-3 px-2 border-b border-gray-300 text-right">Đơn giá</th>
                <th className="py-3 px-2 border-b border-gray-300 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 divide-y divide-gray-200">
              {Object.entries(data.breakdown).map(([subject, details], index) => {
                const unit = details.isSession ? 'Buổi' : 'Tiết';
                return (
                  <tr key={subject}>
                    <td className="py-3 px-2 text-center text-gray-500">{index + 1}</td>
                    <td className="py-3 px-2 font-medium">{subject}</td>
                    {data.showDate && (
                      <td className="py-3 px-2 text-xs text-gray-500">
                        {details.dates.join(', ')}
                      </td>
                    )}
                    <td className="py-3 px-2 text-center text-gray-500 text-xs uppercase">{unit}</td>
                    <td className="py-3 px-2 text-center font-bold">{details.quantity}</td>
                    <td className="py-3 px-2 text-right text-gray-600">{details.rate.toLocaleString('vi-VN')}</td>
                    <td className="py-3 px-2 text-right font-bold text-gray-900">{details.total.toLocaleString('vi-VN')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="mt-6 border-t border-gray-300 pt-4">
          <div className="flex justify-end">
            <div className="w-full sm:w-1/2 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Tổng thu nhập:</span>
                <span className="font-bold text-gray-900">{data.totals.gross.toLocaleString('vi-VN')} ₫</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Thuế TNCN (Khấu trừ):</span>
                <span className="text-red-600">- {data.totals.tax.toLocaleString('vi-VN')} ₫</span>
              </div>
              <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
                <span className="text-gray-800 font-bold uppercase text-base">Thực lĩnh:</span>
                <span className="font-bold text-xl text-blue-700">{data.totals.net.toLocaleString('vi-VN')} ₫</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-12 text-center text-xs text-gray-400 border-t border-gray-100">
          <p>Báo cáo được tạo tự động bởi ứng dụng Sổ Tay Coi Thi.</p>
          <p className="mt-1">
            Được thực hiện bởi{' '}
            <a href="https://coithi.appsviet.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              https://coithi.appsviet.com/
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
