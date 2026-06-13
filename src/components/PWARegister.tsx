'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (process.env.NODE_ENV !== 'production') {
        navigator.serviceWorker.getRegistrations()
          .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
          .then(() => caches?.keys?.())
          .then(cacheKeys => Promise.all((cacheKeys ?? []).map(cacheKey => caches.delete(cacheKey))))
          .catch(() => undefined);
        return;
      }

      // Đăng ký Service Worker khi trang load xong để tránh chặn luồng khởi tạo chính
      const registerSW = () => {
        navigator.serviceWorker.register('/sw.js')
          .catch(() => undefined);
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  return null;
}
