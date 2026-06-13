'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FirebaseError } from 'firebase/app';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/admin/dashboard');
    }
  }, [user, loading, router]);

  const handleLogin = async () => {
    setErrorMessage('');
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      setSigningIn(false);
      const errorCode = error instanceof FirebaseError ? error.code : 'unknown';
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Login Error [${errorCode}]:`, errorMessage);
      if (errorCode === 'auth/popup-closed-by-user') {
        setErrorMessage('Bạn đã đóng cửa sổ đăng nhập. Vui lòng thử lại.');
      } else {
        setErrorMessage('Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại sau.');
      }
    }
  };

  if (loading || (user && !signingIn)) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
        <div className="h-10 w-10 rounded-full border-4 border-[#1a73e8]/20 border-t-[#1a73e8] animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-[#202124]">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-5 sm:px-8">
        <header className="flex h-11 items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-[#5f6368] hover:bg-white hover:text-[#202124] hover:shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Trang chủ</span>
          </Link>
        </header>

        <section className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[440px]">
            <div className="overflow-hidden rounded-lg border border-[#dadce0] bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08),0_8px_24px_rgba(60,64,67,0.10)]">
              <div className="h-1.5 w-full bg-[linear-gradient(90deg,#4285f4_0_25%,#ea4335_25%_50%,#fbbc04_50%_75%,#34a853_75%_100%)]" />

              <div className="px-7 pb-8 pt-9 text-center sm:px-10">
                <Image
                  src="/Coithi.webp"
                  alt="Coithi"
                  width={640}
                  height={640}
                  priority
                  className="mx-auto h-20 w-20 object-contain"
                />

                <h1 className="mt-8 text-3xl font-normal tracking-normal text-[#202124]">
                  Chào mừng trở lại
                </h1>
                <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#5f6368]">
                  Đăng nhập để tiếp tục quản lý lịch coi thi trên Coithi.
                </p>

                <button
                  onClick={handleLogin}
                  disabled={signingIn}
                  className="mt-8 flex h-12 w-full items-center justify-center rounded-md border border-[#dadce0] bg-white px-5 text-sm font-medium text-[#3c4043] shadow-sm hover:border-[#c6dafc] hover:bg-[#f8fbff] hover:text-[#174ea6] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signingIn ? 'Đang đăng nhập...' : 'Tiếp tục với Google'}
                </button>

                {errorMessage && (
                  <div className="mt-4 rounded-md border border-[#f4c7c3] bg-[#fce8e6] px-4 py-3 text-left text-sm font-medium leading-5 text-[#a50e0e]">
                    {errorMessage}
                  </div>
                )}

                <p className="mt-7 text-xs leading-5 text-[#5f6368]">
                  Sử dụng tài khoản Google đã được cấp quyền truy cập.
                </p>
              </div>
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-[#80868b]">
              Coithi giúp quản lý lịch coi thi gọn gàng và nhất quán.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
