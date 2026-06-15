'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useSidebar } from '@/app/admin/layout';
import {
  FiMenu, FiChevronUp, FiStar, FiPlay, FiAlertTriangle, FiCheck
} from 'react-icons/fi';

export default function FAQPage() {
  const { toggleSidebar } = useSidebar();
  const [showToTop, setShowToTop] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowToTop(e.currentTarget.scrollTop > 200);
  };

  const scrollToTop = () => {
    const container = document.getElementById('faq-scroll-container');
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
            className="text-slate-500 hover:text-slate-800 lg:hidden focus:outline-none p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <FiMenu className="h-5.5 w-5.5" />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block">Trợ giúp</span>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight cursor-default">Hướng dẫn sử dụng</h1>
          </div>
        </div>
      </header>

      {/* Main Content (Scrollable) */}
      <div
        id="faq-scroll-container"
        onScroll={handleScroll}
        className="admin-page flex-grow overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth bg-[#F2F2F7]"
      >
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto space-y-8">

          {/* Header Section */}
          <div className="text-center pb-4 animate-[fadeIn_0.5s_ease-out]">
            <Image
              src="/Coithi.webp"
              width={640}
              height={640}
              priority
              className="mx-auto mb-4 w-20 h-20 rounded-2xl object-cover shadow-[0_12px_30px_rgba(15,23,42,0.18)] transform transition-transform hover:scale-105 duration-300"
              alt="Coithi"
            />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Sổ Tay Coi Thi</h2>
            <p className="text-slate-500 mt-2 text-base sm:text-lg font-medium">Mọi thông tin bạn cần để sử dụng ứng dụng hiệu quả.</p>
          </div>

          {/* FAQ Content */}
          <div className="space-y-6">

            {/* Card 1: Features */}
            <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm p-6 lg:p-8 space-y-6 animate-[fadeIn_0.5s_ease-out_100ms_both]">
              <h2 className="text-xl font-semibold text-slate-950 flex items-center gap-3 pb-3 border-b border-slate-200/50">
                <div className="w-9 h-9 rounded-xl bg-[#002147]/5 flex items-center justify-center text-[#002147] shadow-sm border border-[#002147]/10">
                  <FiStar className="text-base" />
                </div>
                Các tính năng chính
              </h2>
              <ul className="space-y-4 text-slate-650 text-base">
                <li className="flex items-start gap-3.5">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-[#002147]/5 text-[#002147] flex items-center justify-center flex-shrink-0 text-[10px] shadow-sm border border-[#002147]/10">
                    <FiCheck />
                  </div>
                  <span className="leading-relaxed"><strong className="text-slate-900">Quản lý lịch thi:</strong> Thêm, sửa, xóa lịch coi thi nhanh chóng. Dữ liệu đồng bộ qua tài khoản Google.</span>
                </li>
                <li className="flex items-start gap-3.5">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-[#002147]/5 text-[#002147] flex items-center justify-center flex-shrink-0 text-[10px] shadow-sm border border-[#002147]/10">
                    <FiCheck />
                  </div>
                  <span className="leading-relaxed"><strong className="text-slate-900">Nhập & Xuất dữ liệu:</strong> Hỗ trợ nhập lịch hàng loạt từ Excel/CSV và xuất báo cáo PDF/In ấn.</span>
                </li>
                <li className="flex items-start gap-3.5">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-[#002147]/5 text-[#002147] flex items-center justify-center flex-shrink-0 text-[10px] shadow-sm border border-[#002147]/10">
                    <FiCheck />
                  </div>
                  <span className="leading-relaxed"><strong className="text-slate-900">Thống kê thu nhập:</strong> Tự động tính toán số tiết và thù lao coi thi (hỗ trợ tính thuế TNCN).</span>
                </li>
                <li className="flex items-start gap-3.5">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-[#002147]/5 text-[#002147] flex items-center justify-center flex-shrink-0 text-[10px] shadow-sm border border-[#002147]/10">
                    <FiCheck />
                  </div>
                  <span className="leading-relaxed"><strong className="text-slate-900">Tra cứu TKB:</strong> Xem nhanh thời gian tiết học và sơ đồ giờ thi chuẩn của nhà trường.</span>
                </li>
              </ul>
            </div>

            {/* Card 2: Getting Started */}
            <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm p-6 lg:p-8 space-y-6 animate-[fadeIn_0.5s_ease-out_200ms_both]">
              <h2 className="text-xl font-semibold text-slate-950 flex items-center gap-3 pb-3 border-b border-slate-200/50">
                <div className="w-9 h-9 rounded-xl bg-[#B45309]/10 flex items-center justify-center text-[#B45309] shadow-sm border border-[#B45309]/10">
                  <FiPlay className="text-base pl-0.5" />
                </div>
                Bắt đầu sử dụng
              </h2>
              <div className="space-y-6 text-slate-650 text-base">
                <div className="flex gap-4">
                  <span className="font-semibold text-[#002147]/20 text-2xl leading-none select-none">01</span>
                  <div>
                    <p className="font-bold text-slate-900 text-lg">Đăng nhập tài khoản</p>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">Sử dụng tài khoản Google để hệ thống tự động sao lưu dữ liệu của bạn trên Cloud.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="font-semibold text-[#002147]/20 text-2xl leading-none select-none">02</span>
                  <div>
                    <p className="font-bold text-slate-900 text-lg">Thêm lịch thi mới</p>
                    <ul className="space-y-2.5 mt-2 text-sm text-slate-500">
                      <li className="flex items-start gap-2.5">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#002147]/35 shrink-0" />
                        <span><strong className="text-slate-800">Tạo lịch</strong> trên Dashboard chính.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#002147]/35 shrink-0" />
                        <span>Điền môn thi, ngày thi và các tiết bắt đầu/kết thúc.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#002147]/35 shrink-0" />
                        <span>Chọn tab <strong className="text-slate-800">&quot;Theo Buổi&quot;</strong> nếu muốn tính thù lao theo ca/buổi.</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="font-semibold text-[#002147]/20 text-2xl leading-none select-none">03</span>
                  <div>
                    <p className="font-bold text-slate-900 text-lg">Cài đặt đơn giá thù lao</p>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">Truy cập mục <strong className="text-slate-800">Quản lý thu nhập</strong> để thiết lập đơn giá coi thi mặc định và mức khấu trừ thuế TNCN.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Disclaimer */}
            <div className="bg-red-50/50 rounded-2xl shadow-sm border border-red-100 p-6 lg:p-8 animate-[fadeIn_0.5s_ease-out_300ms_both] transition-all hover:shadow-md hover:border-red-200">
              <div className="flex gap-4">
                <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-xl bg-red-100 text-red-650 flex items-center justify-center text-base shadow-sm border border-red-200/70">
                  <FiAlertTriangle />
                </div>
                <div>
                  <h3 className="font-semibold text-red-900 text-lg">Lưu ý quan trọng</h3>
                  <div className="text-red-800 text-sm mt-2 space-y-2.5 leading-relaxed">
                    <p><strong className="text-red-950">Dữ liệu cá nhân:</strong> Đây là ứng dụng hỗ trợ cá nhân, không phải ứng dụng chính thức của Nhà trường.</p>
                    <p><strong className="text-red-950">Phòng thi & Lịch thi:</strong> Lịch thi có thể thay đổi bất thường. Để cập nhật phòng thi chính xác nhất, quý thầy cô vui lòng luôn đối chiếu trực tiếp với ứng dụng <strong className="text-red-950">OneUni</strong> hoặc thông báo từ Phòng Khảo thí/Đào tạo.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center py-6 text-sm text-slate-400 border-t border-slate-200/50 mt-8 animate-[fadeIn_0.5s_ease-out_300ms_both]">
            <p className="font-semibold text-slate-500">Chúc quý thầy cô có một kỳ coi thi hiệu quả và thuận lợi!</p>
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
