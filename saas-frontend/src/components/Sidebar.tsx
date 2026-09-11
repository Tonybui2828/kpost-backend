"use client";
import { useState, useEffect, useCallback } from "react";
import { 
  LayoutDashboard, PenTool, Package, MessageSquare, 
  Settings, Share2, LogOut, LogIn, Clock, MessageCircle, 
  ShoppingBag, Truck, Sparkles, Menu, X 
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { io } from "socket.io-client";

// --- 1. KẾT NỐI SOCKET ĐỘNG ---
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
// Lưu ý: Nếu có lỗi kết nối Socket ở phía frontend, bạn cân nhắc comment dòng io() lại nếu chưa cần thiết.
const socket = io(API_URL);

const menuItems = [
  { name: "Tổng quan", icon: <LayoutDashboard size={20} />, href: "/dashboard" },
  { name: "AI Marketing", icon: <PenTool size={20} />, href: "/" },
  { name: "Quản lý sản phẩm", icon: <Package size={20} />, href: "/products" },
  { name: "Lịch đăng bài", icon: <Clock size={20} />, href: "/schedule" }, 
  { name: "Hộp thư Inbox", icon: <MessageSquare size={20} />, href: "/inbox" },
  { name: "Quản lý Bình luận", icon: <MessageCircle size={20} />, href: "/comments" }, 
  { name: "Quản lý Đơn hàng", icon: <ShoppingBag size={20} />, href: "/orders" },
  { name: "Cấu hình vận chuyển", icon: <Truck size={20} />, href: "/shipping" },
  { name: "Kết nối MXH", icon: <Share2 size={20} />, href: "/social" },
  { name: "Cài đặt", icon: <Settings size={20} />, href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter(); 
  const [user, setUser] = useState<any>(null);
  const [plan, setPlan] = useState("GUEST");
  
  // STATE MỚI ĐỂ ĐIỀU KHIỂN MENU TRÊN MOBILE
  const [isOpen, setIsOpen] = useState(false);

  // --- 2. HÀM LẤY THÔNG TIN NGƯỜI DÙNG & GÓI CƯỚC THẬT ---
  const fetchUserStatus = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setPlan("GUEST");
      return;
    }

    try {
      const res = await axios.get(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      setPlan(res.data.plan || "FREE");
    } catch (e) {
      console.error("Phiên đăng nhập hết hạn");
      setUser(null);
      setPlan("GUEST");
    }
  }, [API_URL]);

  useEffect(() => {
    fetchUserStatus();

    socket.on("paymentSuccess", () => {
      console.log("🚀 Cập nhật gói cước mới...");
      fetchUserStatus(); 
    });

    return () => {
      socket.off("paymentSuccess");
    };
  }, [fetchUserStatus, pathname]);

  // Tự động đóng Menu khi đổi trang (trên Mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      localStorage.clear(); 
      window.location.href = "/"; 
    }
  };

  return (
    <>
      {/* HEADER CHO MOBILE (Hiển thị thanh trên cùng có nút Menu) */}
      {/* Chỉ hiện trên Mobile (md:hidden) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-xl font-black text-blue-600 italic uppercase tracking-tighter">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
            <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
          </div>
          KPOST AI
        </div>
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* OVERLAY NỀN ĐEN MỜ CHO MOBILE */}
      {/* Khi mở menu sẽ có lớp đen mờ phủ lên nội dung chính */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[90] transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* THANH MENU (SIDEBAR) CHÍNH */}
      {/* Desktop: Luôn hiện bên trái (md:translate-x-0) */}
      {/* Mobile: Ẩn/Hiện dựa vào state isOpen, có viền trên cùng (h-full) */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 
        flex flex-col z-[100] font-sans transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}
      `}>
        
        {/* Logo & Nút Đóng (Mobile) */}
        <div className="p-6 pb-2 flex items-center justify-between">
          <div className="text-2xl font-black text-blue-600 flex items-center gap-2 italic uppercase tracking-tighter">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
            </div>
            KPOST AI
          </div>
          {/* Nút đóng X chỉ hiện trên Mobile */}
          <button 
            className="md:hidden p-2 text-slate-400 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl"
            onClick={() => setIsOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* HUY HIỆU GÓI CƯỚC THẬT */}
        <div className="px-6 mb-6 mt-2">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border-2 font-black text-[10px] uppercase italic tracking-widest transition-all duration-700 shadow-sm ${
              plan === 'DIAMOND' ? 'bg-purple-600 text-white border-purple-400 shadow-purple-200' :
              plan === 'GOLD' ? 'bg-amber-500 text-white border-amber-300 shadow-amber-200' :
              plan === 'PRO' ? 'bg-blue-600 text-white border-blue-400 shadow-blue-200' :
              'bg-slate-50 text-slate-400 border-slate-200 shadow-none opacity-60'
          }`}>
              <Sparkles 
                size={12} 
                fill={plan === 'GUEST' ? 'none' : 'currentColor'} 
                className={plan !== 'GUEST' ? 'animate-pulse text-white' : ''} 
              />
              {plan} {plan === 'GUEST' ? '' : 'MEMBER'}
          </div>
        </div>

        {/* Danh sách Menu */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto text-slate-700 custom-scrollbar pb-6">
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

        {/* Nút Đăng xuất / Đăng nhập */}
        <div className="p-4 border-t border-slate-100">
          {user ? (
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 font-black uppercase tracking-widest hover:text-red-600 hover:bg-red-50 rounded-xl transition-all text-[10px]"
            >
              <LogOut size={18} />
              <span>Đăng xuất</span>
            </button>
          ) : (
            <Link
              href="/settings"
              className="flex items-center gap-3 px-4 py-3 w-full text-blue-600 font-black uppercase tracking-widest hover:bg-blue-50 rounded-xl transition-all text-[10px]"
            >
              <LogIn size={18} />
              <span>Đăng nhập</span>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}