import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script"; // <-- Import thêm Script của Next.js
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
      <body className={`${geist.className} bg-slate-50 text-slate-900`} suppressHydrationWarning={true}>
        
        {/* ĐOẠN SCRIPT CHẠY NGẦM ĐỂ BẮT MÃ AFFILIATE TỪ MỌI ĐƯỜNG LINK */}
        <Script id="affiliate-tracker" strategy="afterInteractive">
          {`
            try {
              const urlParams = new URLSearchParams(window.location.search);
              const refCode = urlParams.get('ref');
              if (refCode) {
                localStorage.setItem('kpost_affiliate_ref', refCode);
                console.log('✅ Đã bắt thành công mã Affiliate:', refCode);
              }
            } catch(e) {}
          `}
        </Script>

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