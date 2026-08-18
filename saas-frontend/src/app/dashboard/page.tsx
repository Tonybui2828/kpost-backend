"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { 
  BarChart3, TrendingUp, Package, ShoppingCart, 
  RefreshCw, Loader2, ArrowUpRight, ArrowDownRight,
  DollarSign, Users, Calendar
} from "lucide-react";

export default function DashboardPage() {
  // --- 1. LẤY URL API ĐỘNG ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const workspaceId = "workspace-01";

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- 2. GỌI API THỐNG KÊ DASHBOARD ---
  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/dashboard/stats?workspaceId=${workspaceId}`);
      setStats(res.data);
    } catch (error) {
      console.error("Lỗi lấy thống kê dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <div>
            <h1 className="text-3xl font-black flex items-center gap-3 text-black italic uppercase tracking-tighter">
                <BarChart3 className="text-blue-600" size={32} /> Tổng quan kinh doanh
            </h1>
            <p className="text-slate-400 text-xs font-bold uppercase mt-1 tracking-widest">Dữ liệu cập nhật theo thời gian thực</p>
        </div>
        <button onClick={fetchStats} className="p-4 bg-white border rounded-2xl hover:bg-slate-50 transition-all shadow-sm group">
            <RefreshCw size={20} className={`group-active:rotate-180 transition-all duration-500 ${loading ? "animate-spin text-blue-600" : "text-slate-400"}`} />
        </button>
      </div>

      {/* --- CÁC KHỐI THỐNG KÊ CHÍNH --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
            label="Doanh thu hôm nay" 
            value={`${(stats?.todayRevenue || 0).toLocaleString()}đ`} 
            icon={<DollarSign size={20}/>} 
            color="text-emerald-600"
            sub="Tăng 12% so với hôm qua"
        />
        <StatCard 
            label="Đơn hàng mới" 
            value={stats?.totalOrders || 0} 
            icon={<ShoppingCart size={20}/>} 
            color="text-blue-600"
            sub="Đang chờ xử lý"
        />
        <StatCard 
            label="Sản phẩm trong kho" 
            value={stats?.totalProducts || 0} 
            icon={<Package size={20}/>} 
            color="text-orange-600"
            sub="Sẵn sàng đăng bán"
        />
        <StatCard 
            label="Khách hàng tiềm năng" 
            value={stats?.totalCustomers || 0} 
            icon={<Users size={20}/>} 
            color="text-purple-600"
            sub="Từ Facebook & Inbox"
        />
      </div>

      {/* --- PHẦN BIỂU ĐỒ & LỊCH TRÌNH --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* KHỐI TĂNG TRƯỞNG */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 relative overflow-hidden">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-xl font-black text-black uppercase tracking-tighter">Biểu đồ tăng trưởng</h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase">Thống kê 7 ngày gần nhất</p>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-500 font-black text-sm bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                        <TrendingUp size={14} /> +{stats?.growthRate || "0%"}
                    </div>
                </div>
                
                {/* Khu vực placeholder cho biểu đồ */}
                <div className="h-[250px] w-full bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex items-center justify-center">
                    <p className="text-slate-300 font-black italic uppercase text-xs">Biểu đồ đang được xử lý dữ liệu...</p>
                </div>
          </div>

          {/* KHỐI LỊCH ĐĂNG BÀI NHANH */}
          <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100">
                <h2 className="text-xl font-black text-black uppercase tracking-tighter mb-6 flex items-center gap-2">
                    <Calendar className="text-blue-600" size={20} /> Lịch đăng bài
                </h2>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100 cursor-pointer group">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                {i}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-800">Bài viết mẫu #{i}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Dự kiến: 12:00 PM</p>
                            </div>
                        </div>
                    ))}
                </div>
                <button className="w-full mt-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-blue-600 transition-all shadow-lg active:scale-95">
                    XEM TOÀN BỘ LỊCH
                </button>
          </div>
      </div>
    </div>
  );
}

// --- COMPONENT CON CHO THẺ THỐNG KÊ ---
function StatCard({ label, value, icon, color, sub }: any) {
  return (
    <div className="bg-white p-7 rounded-[36px] shadow-sm border border-slate-100 hover:shadow-xl transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-slate-50 ${color} group-hover:bg-blue-600 group-hover:text-white transition-all`}>
          {icon}
        </div>
        <ArrowUpRight size={16} className="text-slate-300" />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
        <p className="text-[10px] text-slate-300 font-bold mt-2 italic">{sub}</p>
      </div>
    </div>
  );
}