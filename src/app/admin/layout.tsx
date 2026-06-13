'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';

const SidebarContext = createContext<{
  toggleSidebar: () => void;
}>({
  toggleSidebar: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center z-[9999]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return null;

  // Nếu là trang in ấn hoặc báo cáo, bỏ qua Layout Sidebar để in sạch sẽ
  const isPrintPage = pathname?.endsWith('/print') || pathname?.endsWith('/report');
  if (isPrintPage) {
    return <div className="w-full min-h-screen bg-white">{children}</div>;
  }

  return (
    <SidebarContext.Provider value={{ toggleSidebar: () => setIsSidebarOpen(prev => !prev) }}>
      <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800">
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        
        {/* Main Content Area */}
        <div className="flex-grow flex flex-col h-full overflow-hidden">
          {children}
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

