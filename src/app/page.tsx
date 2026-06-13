'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showLoading, setShowLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/admin/dashboard');
      } else {
        setShowLoading(false);
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (showLoading) return;

    const revealElements = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });
    
    revealElements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [showLoading]);

  const pageUrl = 'https://coithi.appsviet.com/';
  const pageTitle = 'Sổ Tay Coi Thi - Trợ lý coi thi thế hệ mới';
  const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
  const zaloShareUrl = `https://zalo.me/share_inline?url=${encodeURIComponent(pageUrl)}&desc=${encodeURIComponent(pageTitle)}&title=${encodeURIComponent(pageTitle)}`;

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(pageUrl).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  if (showLoading) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center z-[9999]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg fixed top-0 left-0 right-0 z-50 border-b border-slate-200/70">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="https://imgpx.com/fJEpqO59ze9b.webp" alt="App Logo" className="h-10 w-10 rounded-lg" />
            <span className="text-xl font-bold text-slate-900">Sổ Tay Coi Thi</span>
          </div>
          <div>
            <Link href="/login" className="bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Vào ứng dụng
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative bg-blue-700 [clip-path:polygon(0_0,100%_0,100%_85%,0%_100%)] text-white overflow-hidden pt-16 flex-shrink-0">
        <div className="container mx-auto px-6 pt-24 pb-48 md:pt-24 md:pb-56 relative z-10">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight text-white">
                Chuyển Đổi Số <br /> Bắt đầu từ hôm nay.
              </h1>
              <p className="mt-6 text-lg md:text-xl text-blue-100 max-w-lg">
                Sổ Tay Coi Thi : Trợ lý đắc lực dành cho Giảng viên, giúp sắp xếp, theo dõi và không bao giờ bỏ lỡ lịch coi thi quan trọng.
              </p>
              <Link href="/login" className="cta-button mt-10 inline-block text-white font-bold text-lg px-8 py-4 rounded-lg bg-orange-500 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/40 hover:-translate-y-1 hover:scale-105">
                Bắt đầu sử dụng miễn phí
              </Link>
            </div>
            <div className="hidden md:block">
              <img src="https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=1470&auto=format&fit=crop" alt="Giảng viên" className="rounded-lg shadow-2xl transform rotate-3" />
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-20 bg-slate-50 -mt-24 relative z-20 flex-shrink-0">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 reveal transition-all duration-700 transform translate-y-10 opacity-0 [&.visible]:translate-y-0 [&.visible]:opacity-100">Bạn nhận được gì?</h2>
            <p className="text-slate-500 mt-2 reveal transition-all duration-700 delay-100 transform translate-y-10 opacity-0 [&.visible]:translate-y-0 [&.visible]:opacity-100">Tất cả công cụ bạn cần cho một kỳ coi thi thành công.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-md border border-slate-100 reveal transition-all duration-700 transform translate-y-10 opacity-0 [&.visible]:translate-y-0 [&.visible]:opacity-100">
              <h3 className="font-bold text-xl text-slate-900">Quản lý thông minh</h3>
              <p className="text-slate-500 mt-2">Thêm, sửa, xóa lịch coi thi nhanh chóng. Dữ liệu được đồng bộ hóa an toàn.</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md border border-slate-100 reveal transition-all duration-700 delay-100 transform translate-y-10 opacity-0 [&.visible]:translate-y-0 [&.visible]:opacity-100">
              <h3 className="font-bold text-xl text-slate-900">Thống kê trực quan</h3>
              <p className="text-slate-500 mt-2">Theo dõi tổng số tiết đã coi, thu nhập dự kiến qua biểu đồ rõ ràng.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-blue-700 text-white flex-shrink-0">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold reveal transition-all duration-700 transform translate-y-10 opacity-0 [&.visible]:translate-y-0 [&.visible]:opacity-100">Giảng viên nói gì?</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-8 rounded-lg reveal transition-all duration-700 delay-200 transform translate-y-10 opacity-0 [&.visible]:translate-y-0 [&.visible]:opacity-100">
              <p className="text-blue-100">"Ứng dụng này đã thay đổi hoàn toàn cách tôi quản lý lịch coi thi. Giao diện trực quan và tính năng đồng bộ hóa thật tuyệt vời. Tiết kiệm cho tôi rất nhiều thời gian."</p>
              <p className="font-bold text-white mt-4">- Một giảng viên đại học</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-8 rounded-lg reveal transition-all duration-700 delay-300 transform translate-y-10 opacity-0 [&.visible]:translate-y-0 [&.visible]:opacity-100">
              <p className="text-blue-100">"Tính năng tạo lịch hàng loạt là một cứu cánh thực sự vào đầu mỗi kỳ thi. Việc tự động hóa đã giúp tôi không còn phải nhập tay hàng chục lịch nữa, rất hệ thống và chuyên nghiệp. Rất khuyến khích đồng nghiệp sử dụng!"</p>
              <p className="font-bold text-white mt-4">- Một giảng viên đại học</p>
            </div>
          </div>
        </div>
      </section>

      {/* AppsViet Banner */}
      <section className="relative bg-gray-800 text-white py-20 flex-shrink-0">
        <div className="absolute inset-0">
          <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj_BFdGDMcpJq5ossXTITen_7X-lAjryI-S7Oidcw-JCBsoIZoZlo_Lvm__Ql-hSkdErOdnzjCBXP_DOB9SP02lM7yuCGD_4YR1cDhiaD7qJ2wsyMmtp6U22MwaROpcQQaQ-reQ0Igbf7owhfE64AT2Yr1NAyiE5vctX-Yzr-WEp4z-431Sq5uLKYZXAc8/s0/world.jpg" className="w-full h-full object-cover opacity-20" alt="World Map Banner" />
        </div>
        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold reveal transition-all duration-700 transform translate-y-10 opacity-0 [&.visible]:translate-y-0 [&.visible]:opacity-100">AppsViet Projects</h2>
          <p className="mt-4 max-w-2xl mx-auto text-blue-200 reveal transition-all duration-700 delay-100 transform translate-y-10 opacity-0 [&.visible]:translate-y-0 [&.visible]:opacity-100">Chúng tôi tạo ra những giải pháp số hóa để nâng cao hiệu suất công việc cho các tổ chức và cá nhân.</p>
          <a href="http://appsviet.com/" target="_blank" rel="noopener noreferrer" className="cta-button mt-8 inline-block text-white font-bold text-lg px-8 py-4 rounded-lg bg-orange-500 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/40 hover:-translate-y-1 hover:scale-105">
            Tìm hiểu thêm
          </a>
        </div>
      </section>

      {/* Share Section */}
      <section className="py-20 bg-blue-700 text-white flex-shrink-0">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold reveal transition-all duration-700 transform translate-y-10 opacity-0 [&.visible]:translate-y-0 [&.visible]:opacity-100">Lan tỏa sự tiện lợi</h2>
          <p className="text-blue-200 mt-2 max-w-2xl mx-auto reveal transition-all duration-700 delay-100 transform translate-y-10 opacity-0 [&.visible]:translate-y-0 [&.visible]:opacity-100">Nếu bạn thấy ứng dụng này hữu ích, hãy chia sẻ nó với bạn bè và đồng nghiệp.</p>
          <div className="mt-8 reveal transition-all duration-700 delay-200 transform translate-y-10 opacity-0 [&.visible]:translate-y-0 [&.visible]:opacity-100">
            <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiQwj1IHBw0259cIjB1z-lumsZ5yNTlW5rqEKN_UNDbFL0-XL9T1jCuvyQW7JapCDGyRdo31cpwuaiGUGMNCeQyeruS7EDtYZX3dnrIFqbD44efERr1OK-gCv1V29zJxnuxa1LECs9KuqFhmKu4qiyPzlQOsEiCBA4ETxdMrRX32dtlDoGZkwpSxMatGcQ/s0/qrcode_coithi.appsviet.com.png" alt="QR Code" className="w-48 h-48 mx-auto rounded-lg shadow-xl border-4 border-white" />
            <p className="text-white mt-4 font-semibold">Quét để mở ứng dụng</p>
          </div>
          <div className="mt-6 flex justify-center gap-4 reveal transition-all duration-700 delay-300 transform translate-y-10 opacity-0 [&.visible]:translate-y-0 [&.visible]:opacity-100">
            <a href={fbShareUrl} target="_blank" rel="noopener noreferrer" className="social-share-btn" title="Chia sẻ qua Facebook">
              <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjQHN-veL7dPrK3VVLAPJf4PB-26SQhlbHVCibnnkKrWWJjo032pOaxXP7rI-3heVDpmKBrBsmht25vXlDAvl-W4VSFl8HiwJwIUF5tC1RlBZ_NOPkNjrNEVhpB5utcK2VN3p3DYcdDDSTHfdTY3MRipIH1RLd6UGhdCimmvff6T-Vi278mS18QUonlJ8s/s0/fb.png" className="w-6 h-6" alt="Facebook" />
            </a>
            <a href={zaloShareUrl} target="_blank" rel="noopener noreferrer" className="social-share-btn" title="Chia sẻ qua Zalo">
              <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiFcht0S_MrmTAasKXmTxtRgG4P2LRQ_eJUXeQHGT1KiSEjW3Ivybg1E1r7vLQY3WS8bdDSxRSDruu18pWXvnObzVmg_TZEDm45x1zk6hqXKlGfFmBf8TdPWibrXRJXBUBUsvVR1Urz1drEKLqOGQt8vFUjZ5gPaXHthIVoaOuDs13nlsthcBQG_Ax7Tfs/s0/zalo.webp" className="w-6 h-6" alt="Zalo" />
            </a>
            <button onClick={handleCopyLink} className="social-share-btn bg-white/20" title="Sao chép liên kết">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" /></svg>
              <span className="sr-only">Sao chép Link</span>
            </button>
          </div>
          <p className={`mt-2 text-green-400 font-semibold transition-opacity duration-300 ${copySuccess ? 'opacity-100' : 'opacity-0'}`}>Đã sao chép liên kết!</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-400 py-8 text-center mt-auto flex-shrink-0">
        <p>&copy; 2025 Sổ Tay Coi Thi. Phát triển bởi Phan Minh Trí.</p>
      </footer>
    </div>
  );
}
