'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { useDelayedBoolean } from '@/hooks/useDelayedBoolean';

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
  const showSkeleton = useDelayedBoolean(loading, 1000);
  const isDashboardRoute = pathname?.startsWith('/admin/dashboard') || pathname === '/admin';

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading && showSkeleton && isDashboardRoute) {
    return <AdminDashboardSkeleton />;
  }

  if (loading) {
    return null;
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

function AdminDashboardSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800" aria-busy="true" aria-live="polite">
      <aside className="hidden lg:flex w-76 shrink-0 flex-col border-r border-slate-200/50 bg-white/90 p-4 shadow-[1px_0_0_rgba(0,0,0,0.06)]">
        <div className="animate-pulse space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-100/80 p-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-slate-200" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded-full bg-slate-200" />
                <div className="h-3 w-1/2 rounded-full bg-slate-100" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-xl border border-slate-200/40 bg-white px-3 py-3"
              >
                <div className="h-5 w-5 rounded-full bg-slate-200" />
                <div className="h-4 flex-1 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>

          <div className="mt-auto rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-slate-200" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded-full bg-slate-200" />
                <div className="h-3 w-1/2 rounded-full bg-slate-100" />
              </div>
            </div>
            <div className="mt-4 h-9 rounded-xl bg-slate-100" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-[4.5rem] items-center justify-between border-b border-slate-200/50 bg-white/80 px-4 shadow-sm backdrop-blur-lg sm:px-6 lg:px-8">
          <div className="animate-pulse flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-200 lg:hidden" />
            <div className="space-y-2">
              <div className="h-3 w-20 rounded-full bg-slate-200" />
              <div className="h-5 w-36 rounded-full bg-slate-200" />
            </div>
          </div>
          <div className="animate-pulse flex items-center gap-2">
            <div className="hidden h-10 w-24 rounded-xl bg-slate-200 sm:block" />
            <div className="h-10 w-10 rounded-xl bg-slate-200" />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto bg-[#F2F2F7] p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl 2xl:max-w-7xl space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="animate-pulse lg:col-span-2 rounded-2xl border border-slate-200/40 bg-white p-6 shadow-sm min-h-[170px]">
                <div className="h-4 w-24 rounded-full bg-slate-200" />
                <div className="mt-4 h-7 w-2/3 rounded-full bg-slate-200" />
                <div className="mt-3 h-4 w-1/2 rounded-full bg-slate-100" />
                <div className="mt-8 flex gap-3">
                  <div className="h-20 flex-1 rounded-2xl bg-slate-100" />
                  <div className="h-20 w-36 rounded-2xl bg-slate-100" />
                </div>
              </div>

              <div className="animate-pulse rounded-2xl border border-slate-200/40 bg-white p-5 shadow-sm min-h-[170px]">
                <div className="h-4 w-28 rounded-full bg-slate-200" />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="h-16 rounded-xl bg-slate-100" />
                  <div className="h-16 rounded-xl bg-slate-100" />
                  <div className="h-16 rounded-xl bg-slate-100" />
                </div>
                <div className="mt-4 h-9 rounded-xl bg-slate-100" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-2xl border border-slate-200/40 bg-white p-5 shadow-sm">
                  <div className="h-4 w-24 rounded-full bg-slate-200" />
                  <div className="mt-3 h-8 w-20 rounded-full bg-slate-200" />
                  <div className="mt-4 h-3 w-2/3 rounded-full bg-slate-100" />
                </div>
              ))}
            </div>

            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-2xl border border-slate-200/40 bg-white p-4 shadow-sm">
                  <div className="h-4 w-40 rounded-full bg-slate-200" />
                  <div className="mt-3 h-3 w-5/6 rounded-full bg-slate-100" />
                  <div className="mt-2 h-3 w-2/3 rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
