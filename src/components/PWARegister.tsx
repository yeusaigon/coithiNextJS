'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Đăng ký Service Worker khi trang load xong để tránh chặn luồng khởi tạo chính
      const registerSW = () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => {
            // Đăng ký thành công
          })
          .catch(err => {
            // Đăng ký thất bại
          });
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
