'use client';

import React, { useState } from 'react';
import { useSidebar } from '@/app/admin/layout';
import { FiMenu, FiChevronUp } from 'react-icons/fi';
import { FaMugHot } from 'react-icons/fa6';

const TKB_DATA = {
  study: [
    { session: 'Sáng', period: 1, time: '06:30 – 07:20' },
    { session: 'Sáng', period: 2, time: '07:20 – 08:10' },
    { session: 'Sáng', period: 3, time: '08:10 – 09:00' },
    { session: 'Break', label: 'Giải lao 10 phút' },
    { session: 'Sáng', period: 4, time: '09:10 – 10:00' },
    { session: 'Sáng', period: 5, time: '10:00 – 10:50' },
    { session: 'Sáng', period: 6, time: '10:50 – 11:40' },

    { session: 'Chiều', period: 7, time: '12:30 – 13:20' },
    { session: 'Chiều', period: 8, time: '13:20 – 14:10' },
    { session: 'Chiều', period: 9, time: '14:10 – 15:00' },
    { session: 'Break', label: 'Giải lao 10 phút' },
    { session: 'Chiều', period: 10, time: '15:10 – 16:00' },
    { session: 'Chiều', period: 11, time: '16:00 – 16:50' },
    { session: 'Chiều', period: 12, time: '16:50 – 17:40' },

    { session: 'Tối', period: 13, time: '18:00 – 18:50' },
    { session: 'Tối', period: 14, time: '18:50 – 19:40' },
    { session: 'Break', label: 'Giải lao 10 phút' },
    { session: 'Tối', period: 15, time: '19:50 – 20:40' },
    { session: 'Tối', period: 16, time: '20:40 – 21:30' },
  ],
  exam60: [
    { session: 'Sáng', periods: '1 - 2', start: '06:30' },
    { session: 'Sáng', periods: '3 - 4', start: '08:20' },
    { session: 'Sáng', periods: '5 - 6', start: '10:10' },
    { session: 'Chiều', periods: '7 - 8', start: '12:30' },
    { session: 'Chiều', periods: '9 - 10', start: '14:20' },
    { session: 'Chiều', periods: '11 - 12', start: '16:10' },
    { session: 'Tối', periods: '13 - 14', start: '18:00' },
    { session: 'Tối', periods: '15 - 16', start: '19:50' },
  ],
  exam90: [
    { session: 'Sáng', periods: '1 - 3', start: '06:30' },
    { session: 'Sáng', periods: '4 - 6', start: '09:10' },
    { session: 'Chiều', periods: '6 - 8', start: '12:30' },
    { session: 'Chiều', periods: '9 - 12', start: '15:10' },
    { session: 'Tối', periods: '13 - 15', start: '18:00' },
  ]
};

type TabType = 'study' | 'exam60' | 'exam90';

export default function TkbPage() {
  const { toggleSidebar } = useSidebar();
  const [activeTab, setActiveTab] = useState<TabType>('study');
  const [showToTop, setShowToTop] = useState(false);

  // Split data into morning, afternoon, evening for grid columns
  const studySáng = TKB_DATA.study.slice(0, 7);
  const studyChiều = TKB_DATA.study.slice(7, 14);
  const studyTối = TKB_DATA.study.slice(14);

  const exam60Sáng = TKB_DATA.exam60.filter(item => item.session === 'Sáng');
  const exam60Chiều = TKB_DATA.exam60.filter(item => item.session === 'Chiều');
  const exam60Tối = TKB_DATA.exam60.filter(item => item.session === 'Tối');

  const exam90Sáng = TKB_DATA.exam90.filter(item => item.session === 'Sáng');
  const exam90Chiều = TKB_DATA.exam90.filter(item => item.session === 'Chiều');
  const exam90Tối = TKB_DATA.exam90.filter(item => item.session === 'Tối');

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowToTop(e.currentTarget.scrollTop > 200);
  };

  const scrollToTop = () => {
    const container = document.getElementById('tkb-scroll-container');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0 z-20 sticky top-0 transition-shadow">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="text-slate-505 hover:text-slate-800 lg:hidden focus:outline-none p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <FiMenu className="h-5.5 w-5.5" />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block">Tra cứu</span>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight cursor-default">Thời khóa biểu - IUH</h1>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div
        id="tkb-scroll-container"
        onScroll={handleScroll}
        className="admin-page flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth bg-[#F2F2F7]"
      >
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto space-y-6 pb-10">

          {/* TAB NAVIGATION - ĐỒNG BỘ THIẾT KẾ PILL / SEGMENTED CONTROL */}
          <div className="mb-2 sm:mb-4 animate-[fadeIn_0.3s_ease-out] flex overflow-x-auto hide-scrollbar mt-2 sm:mt-0">
            <div className="inline-flex items-center p-1.5 bg-[#f1f5f9] rounded-2xl flex-shrink-0">
              <button
                onClick={() => setActiveTab('study')}
                className={`flex items-center justify-center px-5 sm:px-6 py-2.5 sm:py-3 text-[13px] sm:text-sm transition-all duration-200 rounded-xl whitespace-nowrap outline-none ${activeTab === 'study'
                    ? 'bg-white text-[#111827] font-bold shadow-sm'
                    : 'text-[#64748b] hover:text-[#334155] font-semibold'
                  }`}
              >
                Lý thuyết
              </button>

              <button
                onClick={() => setActiveTab('exam60')}
                className={`flex items-center justify-center px-5 sm:px-6 py-2.5 sm:py-3 text-[13px] sm:text-sm transition-all duration-200 rounded-xl whitespace-nowrap outline-none ${activeTab === 'exam60'
                    ? 'bg-white text-[#111827] font-bold shadow-sm'
                    : 'text-[#64748b] hover:text-[#334155] font-semibold'
                  }`}
              >
                Lịch thi 60 phút
              </button>

              <button
                onClick={() => setActiveTab('exam90')}
                className={`flex items-center justify-center px-5 sm:px-6 py-2.5 sm:py-3 text-[13px] sm:text-sm transition-all duration-200 rounded-xl whitespace-nowrap outline-none ${activeTab === 'exam90'
                    ? 'bg-white text-[#111827] font-bold shadow-sm'
                    : 'text-[#64748b] hover:text-[#334155] font-semibold'
                  }`}
              >
                Lịch thi 90 phút
              </button>
            </div>
          </div>

          {/* Tab content containers */}
          <div key={activeTab} className="animate-[fadeIn_0.4s_ease-out]">

            {activeTab === 'study' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Ca Sáng */}
                <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-amber-50/50 border-b border-slate-150 px-6 py-5 flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-amber-800 uppercase tracking-[0.14em]">Ca Sáng</h3>
                    <span className="text-[10px] text-amber-600 font-medium bg-amber-100/60 px-2 py-0.5 rounded-full">Tiết 1 – 6</span>
                  </div>
                  <div className="divide-y divide-slate-100 flex-1 bg-white">
                    {studySáng.map((item, idx) => (
                      item.session === 'Break' ? (
                        <div key={idx} className="bg-amber-500/5 py-3 px-5 text-center border-y border-slate-100 flex items-center justify-center gap-2 text-[10px] font-bold text-[#B45309] uppercase tracking-wider">
                          <FaMugHot className="text-xs text-[#B45309]" />
                          <span>{item.label}</span>
                        </div>
                      ) : (
                        <div key={idx} className="flex justify-between items-center px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                          <span className="font-semibold text-slate-800 text-sm">Tiết {item.period}</span>
                          <span className="text-slate-600 font-semibold tracking-tight text-sm">{item.time}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>

                {/* Ca Chiều */}
                <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-blue-50/50 border-b border-slate-150 px-6 py-5 flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-blue-800 uppercase tracking-[0.14em]">Ca Chiều</h3>
                    <span className="text-[10px] text-blue-600 font-medium bg-blue-100/60 px-2 py-0.5 rounded-full">Tiết 7 – 12</span>
                  </div>
                  <div className="divide-y divide-slate-100 flex-1 bg-white">
                    {studyChiều.map((item, idx) => (
                      item.session === 'Break' ? (
                        <div key={idx} className="bg-amber-500/5 py-3 px-5 text-center border-y border-slate-100 flex items-center justify-center gap-2 text-[10px] font-bold text-[#B45309] uppercase tracking-wider">
                          <FaMugHot className="text-xs text-[#B45309]" />
                          <span>{item.label}</span>
                        </div>
                      ) : (
                        <div key={idx} className="flex justify-between items-center px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                          <span className="font-semibold text-slate-800 text-sm">Tiết {item.period}</span>
                          <span className="text-slate-600 font-semibold tracking-tight text-sm">{item.time}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>

                {/* Ca Tối */}
                <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-indigo-50/50 border-b border-slate-150 px-6 py-5 flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-indigo-800 uppercase tracking-[0.14em]">Ca Tối</h3>
                    <span className="text-[10px] text-indigo-600 font-medium bg-indigo-100/60 px-2 py-0.5 rounded-full">Tiết 13 – 16</span>
                  </div>
                  <div className="divide-y divide-slate-100 flex-1 bg-white">
                    {studyTối.map((item, idx) => (
                      item.session === 'Break' ? (
                        <div key={idx} className="bg-amber-500/5 py-3 px-5 text-center border-y border-slate-100 flex items-center justify-center gap-2 text-[10px] font-bold text-[#B45309] uppercase tracking-wider">
                          <FaMugHot className="text-xs text-[#B45309]" />
                          <span>{item.label}</span>
                        </div>
                      ) : (
                        <div key={idx} className="flex justify-between items-center px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                          <span className="font-semibold text-slate-800 text-sm">Tiết {item.period}</span>
                          <span className="text-slate-600 font-semibold tracking-tight text-sm">{item.time}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'exam60' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Ca Sáng */}
                <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-amber-50/50 border-b border-slate-150 px-6 py-5 flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-amber-800 uppercase tracking-[0.14em]">Ca Sáng</h3>
                    <span className="text-[10px] text-amber-600 font-medium bg-amber-100/60 px-2 py-0.5 rounded-full">Thi 60 Phút</span>
                  </div>
                  <div className="divide-y divide-slate-100 flex-1 bg-white">
                    {exam60Sáng.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-extrabold text-slate-800 text-xs">Tiết {item.periods}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ca {idx + 1}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#002147] font-bold tracking-tight text-sm sm:text-base">{item.start}</span>
                          <span className="block text-[10px] text-[#B45309] font-semibold uppercase tracking-wider mt-0.5">Giờ phát đề</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ca Chiều */}
                <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-blue-50/50 border-b border-slate-150 px-6 py-5 flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-blue-800 uppercase tracking-[0.14em]">Ca Chiều</h3>
                    <span className="text-[10px] text-blue-600 font-medium bg-blue-100/60 px-2 py-0.5 rounded-full">Thi 60 Phút</span>
                  </div>
                  <div className="divide-y divide-slate-100 flex-1 bg-white">
                    {exam60Chiều.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-extrabold text-slate-800 text-xs">Tiết {item.periods}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ca {idx + 4}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#002147] font-bold tracking-tight text-sm sm:text-base">{item.start}</span>
                          <span className="block text-[10px] text-[#B45309] font-semibold uppercase tracking-wider mt-0.5">Giờ phát đề</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ca Tối */}
                <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-indigo-50/50 border-b border-slate-150 px-6 py-5 flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-indigo-800 uppercase tracking-[0.14em]">Ca Tối</h3>
                    <span className="text-[10px] text-indigo-600 font-medium bg-indigo-100/60 px-2 py-0.5 rounded-full">Thi 60 Phút</span>
                  </div>
                  <div className="divide-y divide-slate-100 flex-1 bg-white">
                    {exam60Tối.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-extrabold text-slate-800 text-xs">Tiết {item.periods}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ca {idx + 7}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#002147] font-bold tracking-tight text-sm sm:text-base">{item.start}</span>
                          <span className="block text-[10px] text-[#B45309] font-semibold uppercase tracking-wider mt-0.5">Giờ phát đề</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'exam90' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Ca Sáng */}
                <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-amber-50/50 border-b border-slate-150 px-6 py-5 flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-amber-800 uppercase tracking-[0.14em]">Ca Sáng</h3>
                    <span className="text-[10px] text-amber-600 font-medium bg-amber-100/60 px-2 py-0.5 rounded-full">Thi 90 Phút</span>
                  </div>
                  <div className="divide-y divide-slate-100 flex-1 bg-white">
                    {exam90Sáng.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-extrabold text-slate-800 text-xs">Tiết {item.periods}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ca {idx + 1}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#002147] font-bold tracking-tight text-sm sm:text-base">{item.start}</span>
                          <span className="block text-[10px] text-[#B45309] font-semibold uppercase tracking-wider mt-0.5">Giờ phát đề</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ca Chiều */}
                <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-blue-50/50 border-b border-slate-150 px-6 py-5 flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-blue-800 uppercase tracking-[0.14em]">Ca Chiều</h3>
                    <span className="text-[10px] text-blue-600 font-medium bg-blue-100/60 px-2 py-0.5 rounded-full">Thi 90 Phút</span>
                  </div>
                  <div className="divide-y divide-slate-100 flex-1 bg-white">
                    {exam90Chiều.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-extrabold text-slate-800 text-xs">Tiết {item.periods}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ca {idx + 3}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#002147] font-bold tracking-tight text-sm sm:text-base">{item.start}</span>
                          <span className="block text-[10px] text-[#B45309] font-semibold uppercase tracking-wider mt-0.5">Giờ phát đề</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ca Tối */}
                <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-indigo-50/50 border-b border-slate-150 px-6 py-5 flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-indigo-800 uppercase tracking-[0.14em]">Ca Tối</h3>
                    <span className="text-[10px] text-indigo-600 font-medium bg-indigo-100/60 px-2 py-0.5 rounded-full">Thi 90 Phút</span>
                  </div>
                  <div className="divide-y divide-slate-100 flex-1 bg-white">
                    {exam90Tối.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-extrabold text-slate-800 text-xs">Tiết {item.periods}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ca {idx + 5}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#002147] font-bold tracking-tight text-sm sm:text-base">{item.start}</span>
                          <span className="block text-[10px] text-[#B45309] font-semibold uppercase tracking-wider mt-0.5">Giờ phát đề</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {showToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-[#002147] hover:bg-[#002147]/95 text-white w-12 h-12 rounded-full shadow-lg shadow-[#002147]/30 flex items-center justify-center transition-all z-30 hover:-translate-y-1 active:scale-95"
        >
          <FiChevronUp className="w-6 h-6" />
        </button>
      )}
    </>
  );
}