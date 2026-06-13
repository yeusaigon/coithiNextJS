'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { FaCalendarDays, FaChartLine, FaFileExcel, FaGoogle } from 'react-icons/fa6';

const highlights = [
  {
    title: 'Xem lịch nhanh',
    description: 'Ca sắp tới, thời gian và ghi chú được gom rõ trên dashboard.',
    Icon: FaCalendarDays,
  },
  {
    title: 'Nhập Excel gọn',
    description: 'Đưa lịch vào hệ thống nhanh, hạn chế thao tác lặp lại.',
    Icon: FaFileExcel,
  },
  {
    title: 'Theo dõi tổng quan',
    description: 'Nắm số ca, lịch trong tháng và dữ liệu cần xử lý.',
    Icon: FaChartLine,
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/admin/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
        <div className="h-10 w-10 rounded-full border-4 border-[#1a73e8]/20 border-t-[#1a73e8] animate-spin" />
      </div>
    );
  }

  return (
    <div className="landing-page min-h-screen bg-[#f7fafd] text-slate-950">
      <header className="landing-nav border-b border-slate-200/80 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Image
              src="/Coithi.webp"
              alt="Coithi"
              width={640}
              height={640}
              priority
              className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm"
            />
            <span className="truncate text-lg font-black tracking-tight sm:text-xl">Sổ Tay Coi Thi</span>
          </Link>

          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#1a73e8] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1765cc] active:scale-95"
          >
            Vào ứng dụng
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(26,115,232,0.13),transparent_30%),linear-gradient(180deg,#ffffff_0%,#eef4ff_100%)]" />

          <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div className="landing-hero max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d2e3fc] bg-white px-4 py-2 text-sm font-bold text-[#174ea6] shadow-sm">
                <FaGoogle className="text-[#1a73e8]" />
                Đăng nhập Google, dùng ngay
              </div>

              <h1 className="text-5xl font-black leading-[1.04] tracking-normal sm:text-6xl lg:text-7xl">
                Coithi
              </h1>
              <p className="mt-5 max-w-xl text-xl font-medium leading-8 text-slate-650 sm:text-2xl sm:leading-9">
                Quản lý lịch coi thi nhanh, rõ và gọn cho từng tài khoản.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex h-13 items-center justify-center rounded-full bg-[#1a73e8] px-7 text-base font-bold text-white shadow-[0_10px_28px_rgba(26,115,232,0.24)] transition hover:bg-[#1765cc] active:scale-95"
                >
                  Bắt đầu
                </Link>
                <a
                  href="#features"
                  className="inline-flex h-13 items-center justify-center rounded-full border border-slate-300 bg-white px-7 text-base font-bold text-slate-800 shadow-sm transition hover:border-[#1a73e8] hover:text-[#174ea6] active:scale-95"
                >
                  Xem nhanh
                </a>
              </div>
            </div>

            <div className="landing-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src="/Coithi.webp"
                    alt=""
                    width={640}
                    height={640}
                    className="h-11 w-11 rounded-xl object-cover"
                  />
                  <div>
                    <p className="text-sm font-black text-slate-950">Lịch hôm nay</p>
                    <p className="text-sm font-semibold text-slate-500">Cập nhật theo tài khoản</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#e8f0fe] px-3 py-1 text-xs font-black text-[#174ea6]">Nhanh</span>
              </div>

              <div className="rounded-xl bg-[#002147] p-5 text-white">
                <p className="text-sm font-bold text-blue-100">Ca sắp tới</p>
                <p className="mt-2 text-2xl font-black">Phòng B203</p>
                <p className="mt-1 text-sm font-semibold text-blue-100">Tiết 3 - 5, ghi chú rõ ràng</p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {['12 ca', '4 tuần', '1 file'].map((item) => (
                  <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                    <p className="text-lg font-black text-slate-950">{item}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">đang theo dõi</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="bg-white py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="landing-reveal mb-8 max-w-2xl">
              <p className="text-sm font-black uppercase tracking-wider text-[#1a73e8]">Tối giản để dùng nhanh</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Đủ các việc chính, không rườm rà.</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {highlights.map(({ title, description, Icon }, index) => (
                <article
                  key={title}
                  className="landing-reveal rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  style={{ '--reveal-delay': `${index * 80}ms` } as React.CSSProperties}
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#eef3fb] text-[#1a73e8]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-black">{title}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white py-7 text-center text-sm font-semibold text-slate-500">
        &copy; {new Date().getFullYear()} Sổ Tay Coi Thi. Phát triển bởi Phan Minh Trí.
      </footer>
    </div>
  );
}
