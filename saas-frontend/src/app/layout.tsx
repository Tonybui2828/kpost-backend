import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "../components/Sidebar"; 

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kpost AI - Hệ thống Marketing All-in-One",
  description: "Tự động hóa kinh doanh và marketing thông minh bằng trí tuệ nhân tạo",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      {/* suppressHydrationWarning giúp web không bị lỗi khi bốc dữ liệu từ localStorage lúc vừa load trang */}
      <body className={`${geist.className} bg-slate-50 text-slate-900`} suppressHydrationWarning={true}>
        <div className="flex min-h-screen">
          
          {/* 1. Thanh Sidebar cố định bên trái (Rộng 256px) */}
          <div className="w-64 fixed h-full z-50">
            <Sidebar />
          </div>

          {/* 2. Vùng nội dung chính bên phải */}
          {/* ml-64 đẩy nội dung sang để không bị Sidebar che mất */}
          <main className="flex-1 ml-64 min-h-screen relative">
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
          
        </div>
      </body>
    </html>
  );
}