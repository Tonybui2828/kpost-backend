import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script"; 
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
        
        {/* ĐOẠN SCRIPT CHẠY NGẦM ĐỂ BẮT MÃ AFFILIATE */}
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

        <div className="flex min-h-screen w-full bg-slate-50 overflow-x-hidden">
          
          {/* 1. Thanh Sidebar (Sẽ tự động biến thành nút Menu trên Mobile) */}
          <Sidebar />

          {/* 2. Vùng nội dung chính */}
          {/* Mobile: Không lùi lề (ml-0), lùi đỉnh (pt-16) chừa chỗ cho Menu */}
          {/* Desktop: Lùi trái (md:ml-64), đỉnh sát viền (md:pt-0) */}
          <main className="flex-1 ml-0 md:ml-64 min-h-screen relative w-full pt-16 md:pt-0 transition-all duration-300">
            <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
          
        </div>
      </body>
    </html>
  );
}