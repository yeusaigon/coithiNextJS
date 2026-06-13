'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  FaHouse, 
  FaClockRotateLeft, 
  FaChartLine, 
  FaCoins, 
  FaCalendarDays, 
  FaGear, 
  FaCircleQuestion,
  FaRightFromBracket
} from 'react-icons/fa6';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const MENU_ITEMS = [
  { id: 'dashboard', href: '/admin/dashboard', Icon: FaHouse, label: 'Bảng điều khiển' },
  { id: 'history', href: '/admin/history', Icon: FaClockRotateLeft, label: 'Lịch sử coi thi' },
  { id: 'stats', href: '/admin/stats', Icon: FaChartLine, label: 'Phân tích & Thống kê' },
  { id: 'income', href: '/admin/income', Icon: FaCoins, label: 'Quản lý thu nhập' },
  { id: 'tkb', href: '/admin/tkb', Icon: FaCalendarDays, label: 'Thời khóa biểu - IUH' },
  { id: 'settings', href: '/admin/settings', Icon: FaGear, label: 'Cài đặt hệ thống' },
  { id: 'faq', href: '/admin/faq', Icon: FaCircleQuestion, label: 'Hướng dẫn & FAQ' },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const userName = user?.displayName || 'Giảng viên';
  const userEmail = user?.email || '';

  return (
    <>
      {/* Sidebar overlay for mobile */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/20 backdrop-blur-xs z-30 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar container */}
      <aside 
        aria-label="Menu quản trị"
        className={`bg-white/85 bg-[radial-gradient(rgba(0,33,71,0.035)_1px,transparent_1px)] [background-size:20px_20px] backdrop-blur-xl text-slate-800 h-dvh max-h-dvh w-[min(19rem,calc(100vw-1rem))] lg:w-76 p-4 sm:p-5 flex flex-col flex-shrink-0 fixed lg:relative top-0 left-0 bottom-0 overflow-hidden transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-300 ease-in-out z-40 shadow-[1px_0_0_rgba(0,0,0,0.06)] flex border-r border-slate-200/50`}
      >
        {/* Navigation Items */}
        <nav className="-mr-1 min-h-0 flex-grow overflow-y-auto pr-1">
          <ul className="space-y-1.5 text-base">
            {MENU_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href === '/admin/dashboard' && pathname === '/admin');
              return (
                <li key={item.id}>
                  <Link 
                    href={item.href} 
                    onClick={onClose}
                    title={item.label}
                    className={`flex min-h-12 min-w-0 items-center gap-3 rounded-lg px-3 py-3 font-medium transition-all duration-150 active:scale-98 sm:px-3.5 ${
                      isActive 
                        ? 'bg-blue-500/10 text-blue-600 font-semibold' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <item.Icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${
                      isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`} />
                    <span className="min-w-0 truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Brand, Account & Copyright */}
        <div className="mt-4 shrink-0 rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
          <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-3 hover:opacity-90 transition-opacity">
            <Image
              src="/Coithi.webp"
              width={640}
              height={640}
              priority
              className="h-11 w-11 shrink-0 rounded-xl object-cover shadow-md border border-slate-100 sm:h-12 sm:w-12"
              alt="Coithi"
            />
            <div className="flex min-w-0 flex-col overflow-hidden">
              <h1 className="truncate text-lg font-black uppercase tracking-wide leading-none shine-text sm:text-xl sm:tracking-wider">Sổ Tay Coi Thi</h1>
              <span className="mt-1 truncate text-xs font-bold text-slate-400">Trợ lý giảng viên</span>
            </div>
          </Link>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="min-w-0 flex-grow">
              <p className="truncate pr-1 text-sm font-bold text-slate-800" title={userName}>{userName}</p>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-450" title={userEmail}>{userEmail}</p>
            </div>
            <button
              onClick={() => {
                if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                  logout();
                }
              }}
              className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 hover:bg-rose-600 hover:text-white hover:border-rose-600 text-rose-600 flex items-center justify-center transition-all active:scale-95 flex-shrink-0 shadow-sm"
              title="Đăng xuất"
            >
              <FaRightFromBracket className="w-4 h-4" />
            </button>
          </div>

          <p className="mt-3 border-t border-slate-100 pt-2.5 text-center text-[10px] font-semibold tracking-wider text-slate-400">
            &copy; {new Date().getFullYear()} Phan Minh Trí
          </p>
        </div>
      </aside>
    </>
  );
}
