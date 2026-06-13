const CACHE_NAME = 'sotaycoithi-nextjs-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/file.svg',
  '/globe.svg',
  '/next.svg',
  '/vercel.svg',
  '/window.svg'
];

// 1. Install: Lưu trữ các tài nguyên tĩnh cơ bản
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 2. Activate: Dọn dẹp cache cũ
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim())
  );
});

// 3. Fetch: Xử lý cache và network động cho Next.js
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Bỏ qua các API Firebase, Auth, Google APIs
  if (req.method !== 'GET' || 
      url.origin.includes('firestore.googleapis.com') || 
      url.origin.includes('identitytoolkit.googleapis.com') || 
      url.origin.includes('securetoken.googleapis.com') ||
      url.origin.includes('googleapis.com')) {
    return;
  }

  // A. Điều hướng trang (HTML pages): Network-First
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(networkRes => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(req, networkRes.clone());
            return networkRes;
          });
        })
        .catch(() => caches.match(req)) // Nếu mất mạng -> Fallback dùng bản cache gần nhất
    );
    return;
  }

  // B. Next.js Static Assets (_next/static): Cache-First (Bởi vì Next.js build có hash trong tên tệp nên không bao giờ thay đổi nội dung)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(req).then(cachedRes => {
        if (cachedRes) return cachedRes;
        return fetch(req).then(networkRes => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(req, networkRes.clone());
            return networkRes;
          });
        });
      })
    );
    return;
  }

  // C. Các tài nguyên tĩnh khác (Images, Fonts, CSS): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then(cachedRes => {
      const fetchPromise = fetch(req).then(networkRes => {
        caches.open(CACHE_NAME).then(cache => cache.put(req, networkRes.clone()));
        return networkRes;
      }).catch(() => {});

      return cachedRes || fetchPromise;
    })
  );
});