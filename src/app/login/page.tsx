'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

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
    } catch (error: any) {
      setSigningIn(false);
      const errorCode = error.code;
      console.error(`Login Error [${errorCode}]:`, error.message);
      if (errorCode === 'auth/popup-closed-by-user') {
        setErrorMessage('Bạn đã đóng cửa sổ đăng nhập. Vui lòng thử lại.');
      } else {
        setErrorMessage('Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại sau.');
      }
    }
  };

  if (loading || (user && !signingIn)) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center z-[9999]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left Side - Illustration */}
      <div className="hidden lg:flex w-1/2 bg-blue-700 text-white p-12 flex-col justify-center items-center relative">
        <Link href="/" className="absolute top-8 left-8 flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>Quay về trang chủ</span>
        </Link>
        <div className="text-center">
          <img src="https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=1470&auto=format&fit=crop" alt="Illustration" className="w-full max-w-md mx-auto rounded-lg shadow-2xl mb-8" />
          <h1 className="text-3xl font-bold">Chào mừng trở lại!</h1>
          <p className="mt-2 text-blue-200">Đăng nhập để tiếp tục quản lý lịch coi thi của bạn.</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <Link href="/" className="inline-block mb-6">
            <img src="https://imgpx.com/fJEpqO59ze9b.webp" alt="App Logo" className="h-16 w-16 rounded-2xl mx-auto" />
          </Link>
          
          <h2 className="text-3xl font-bold text-slate-900">Đăng nhập vào Sổ Tay</h2>
          <p className="text-slate-500 mt-2 mb-8">Sử dụng tài khoản Google của bạn để tiếp tục.</p>

          <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-left">
            <button 
              onClick={handleLogin}
              disabled={signingIn}
              className="w-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold py-3 px-6 rounded-lg transition duration-300 flex items-center justify-center space-x-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.012,36.49,44,30.638,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
              </svg>
              <span>{signingIn ? 'Đang đăng nhập...' : 'Đăng nhập với Google'}</span>
            </button>
            {errorMessage && (
              <div className="mt-4 text-red-600 font-semibold text-center text-sm">{errorMessage}</div>
            )}
          </div>
          <p className="text-xs text-slate-400 text-center mt-8">Bằng cách đăng nhập, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi.</p>
        </div>
      </div>
    </div>
  );
}
