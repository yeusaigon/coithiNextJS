'use client';

import React from 'react';
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
        className={`bg-white/85 bg-[radial-gradient(rgba(0,33,71,0.035)_1px,transparent_1px)] [background-size:20px_20px] backdrop-blur-xl text-slate-800 w-76 min-h-screen p-5 flex flex-col flex-shrink-0 fixed lg:relative top-0 left-0 bottom-0 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-300 ease-in-out z-40 shadow-[1px_0_0_rgba(0,0,0,0.06)] flex border-r border-slate-200/50`}
      >
        {/* App Logo & Header */}
        <div className="text-left mb-6 flex items-center gap-3 pt-2">
          <Link href="/admin/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img 
              src="https://imgpx.com/fJEpqO59ze9b.webp" 
              className="w-12 h-12 rounded-xl object-cover shadow-md border border-slate-100" 
              alt="App Logo"
            />
            <div className="flex flex-col">
              <h1 className="text-lg font-black uppercase tracking-wider leading-none shine-text">Sổ Tay Coi Thi</h1>
              <span className="text-[10px] text-slate-400 font-bold mt-1">Trợ lý giảng viên</span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-grow mt-2">
          <ul className="space-y-1 text-sm">
            {MENU_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href === '/admin/dashboard' && pathname === '/admin');
              return (
                <li key={item.id}>
                  <Link 
                    href={item.href} 
                    onClick={onClose}
                    className={`flex items-center px-3 py-2.5 rounded-lg font-medium transition-all duration-150 whitespace-nowrap active:scale-98 ${
                      isActive 
                        ? 'bg-blue-500/10 text-blue-600 font-semibold' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <item.Icon className={`w-4.5 h-4.5 mr-3 flex-shrink-0 transition-transform duration-200 ${
                      isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile Section */}
        <div className="mt-auto pt-4 border-t border-slate-200/50 -mx-5 -mb-5 p-4 bg-slate-50/60 flex flex-col gap-3">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-150 shadow-xs group">
            <div className="text-left min-w-0 flex-grow pl-1">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Giảng viên</span>
              </div>
              <p className="text-xs font-bold text-slate-800 truncate pr-1" title={userName}>{userName}</p>
              <p className="text-[10px] text-slate-450 font-medium truncate" title={userEmail}>{userEmail}</p>
            </div>
            <button 
              onClick={() => {
                if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                  logout();
                }
              }}
              className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 hover:bg-rose-600 hover:text-white hover:border-rose-600 text-rose-600 flex items-center justify-center transition-all active:scale-95 flex-shrink-0 shadow-sm"
              title="Đăng xuất"
            >
              <FaRightFromBracket className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[9px] text-slate-400 text-center tracking-wider font-semibold">
            &copy; {new Date().getFullYear()} Phan Minh Trí
          </p>
        </div>
      </aside>
    </>
  );
}
