import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "../components/Sidebar"; // Import Sidebar quay trở lại

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kpost AI Marketing All-in-One",
  description: "Hệ thống tự động hóa marketing thông minh",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-slate-50 text-slate-900`}>
        <div className="flex min-h-screen">
          
          {/* 1. Thanh Sidebar cố định bên trái */}
          <div className="w-64 fixed h-full z-50">
            <Sidebar />
          </div>

          {/* 2. Vùng nội dung chính bên phải */}
          {/* Dùng ml-64 để đẩy nội dung sang phải 256px (bằng độ rộng Sidebar) */}
          <main className="flex-1 ml-64 p-4 md:p-8 relative">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>
          
        </div>
      </body>
    </html>
  );
}