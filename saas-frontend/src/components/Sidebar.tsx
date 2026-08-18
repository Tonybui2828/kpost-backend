"use client";
import { useState, useEffect, useCallback } from "react";
import { 
  LayoutDashboard, PenTool, Package, MessageSquare, 
  Settings, Share2, LogOut, Clock, MessageCircle, 
  Users, ShoppingBag, Truck, Sparkles 
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import axios from "axios";
import { io } from "socket.io-client";

// --- 1. KẾT NỐI SOCKET ĐỘNG ---
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const socket = io(API_URL);

const menuItems = [
  { name: "Tổng quan", icon: <LayoutDashboard size={20} />, href: "/dashboard" },
  { name: "AI Marketing", icon: <PenTool size={20} />, href: "/" },
  { name: "Quản lý sản phẩm", icon: <Package size={20} />, href: "/products" },
  { name: "Lịch đăng bài", icon: <Clock size={20} />, href: "/schedule" }, 
  { name: "Hộp thư Inbox", icon: <MessageSquare size={20} />, href: "/inbox" },
  { name: "Quản lý Bình luận", icon: <MessageCircle size={20} />, href: "/comments" }, 
  { name: "Chiến dịch Nhóm", icon: <Users size={20} />, href: "/groups" },
  { name: "Quản lý Đơn hàng", icon: <ShoppingBag size={20} />, href: "/orders" },
  { name: "Cấu hình vận chuyển", icon: <Truck size={20} />, href: "/shipping" },
  { name: "Kết nối MXH", icon: <Share2 size={20} />, href: "/social" },
  { name: "Cài đặt", icon: <Settings size={20} />, href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [plan, setPlan] = useState("FREE");
  const workspaceId = "workspace-01";

  // --- 2. SỬA LINK LẤY THÔNG TIN GÓI CƯỚC ---
  const fetchPlan = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/dashboard/stats?workspaceId=${workspaceId}`);
      if (res.data?.stats?.plan) {
        setPlan(res.data.stats.plan.toUpperCase());
      }
    } catch (e) {
      console.error("Lỗi cập nhật gói cước từ API:", API_URL);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchPlan();

    socket.on("paymentSuccess", (data) => {
      console.log("🚀 Sidebar nhận tín hiệu nâng cấp gói!");
      fetchPlan(); 
    });

    return () => {
      socket.off("paymentSuccess");
    };
  }, [fetchPlan, pathname]);

  return (
    <div className="w-64 bg-white h-screen border-r border-slate-200 flex flex-col fixed left-0 top-0 z-[100] font-sans">
      {/* Phần Logo Hệ thống */}
      <div className="p-6 pb-2 text-2xl font-black text-blue-600 flex items-center gap-2 italic uppercase tracking-tighter">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-100">
            <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
        </div>
        SaaS AI
      </div>

      {/* HUY HIỆU GÓI CƯỚC */}
      <div className="px-6 mb-6 mt-2">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border-2 font-black text-[10px] uppercase italic tracking-widest transition-all duration-700 shadow-sm ${
            plan === 'DIAMOND' ? 'bg-purple-600 text-white border-purple-400 shadow-purple-200' :
            plan === 'GOLD' ? 'bg-amber-500 text-white border-amber-300 shadow-amber-200' :
            plan === 'PRO' ? 'bg-blue-600 text-white border-blue-400 shadow-blue-200' :
            'bg-slate-50 text-slate-400 border-slate-200 shadow-none opacity-60'
        }`}>
            <Sparkles 
              size={12} 
              fill={plan === 'FREE' ? 'none' : 'currentColor'} 
              className={plan !== 'FREE' ? 'animate-pulse text-white' : ''} 
            />
            {plan} MEMBER
        </div>
      </div>

      {/* Danh sách Menu */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto text-slate-700 custom-scrollbar">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              pathname === item.href 
              ? "bg-blue-600 text-white shadow-lg shadow-blue-100 scale-[1.02]" 
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {item.icon}
            <span className="text-sm font-black uppercase tracking-tight">{item.name}</span>
          </Link>
        ))}
      </nav>

      {/* Nút Đăng xuất */}
      <div className="p-4 border-t border-slate-100">
        <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 font-black uppercase tracking-widest hover:text-red-600 transition-colors text-[10px]">
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}