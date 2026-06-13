'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-3 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem 
            key={toast.id} 
            toast={toast} 
            onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} 
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Force reflow/tick to trigger transition animation
    const raf = requestAnimationFrame(() => setVisible(true));
    
    const timer = setTimeout(() => {
      setVisible(false);
      const closeTimer = setTimeout(() => onClose(toast.id), 500); // Chờ animation kết thúc
      return () => clearTimeout(closeTimer);
    }, 3000);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [toast, onClose]);

  const bgClass = 
    toast.type === 'success' ? 'bg-emerald-600 text-white' : 
    toast.type === 'error' ? 'bg-rose-600 text-white' : 
    'bg-slate-800 text-white';

  return (
    <div
      className={`py-3 px-5 rounded-xl shadow-xl transition-all duration-500 ease-out transform pointer-events-auto flex items-center gap-3 ${bgClass} ${
        visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95'
      }`}
    >
      <span className="text-sm font-semibold">{toast.message}</span>
    </div>
  );
}

export const useToast = () => useContext(ToastContext);
