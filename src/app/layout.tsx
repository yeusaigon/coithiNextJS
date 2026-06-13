import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import DisableDevTools from "@/components/DisableDevTools";
import PWARegister from "@/components/PWARegister";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Sổ Tay Coi Thi - Trợ lý coi thi thế hệ mới",
  description: "Quản lý lịch coi thi thông minh, hiệu quả và không bao giờ bỏ lỡ. Sổ Tay Coi Thi là trợ lý không thể thiếu cho mọi giảng viên.",
  manifest: "/manifest.json",
  icons: {
    icon: "/Coithi.webp",
    shortcut: "/Coithi.webp",
    apple: "/Coithi.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable}`}>
      <body className="antialiased font-sans">
        <AuthProvider>
          <ToastProvider>
            <DisableDevTools />
            <PWARegister />
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
