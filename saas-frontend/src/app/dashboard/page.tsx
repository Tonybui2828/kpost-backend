"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { 
  BarChart3, TrendingUp, Package, ShoppingCart, 
  RefreshCw, Loader2, ArrowUpRight,
  DollarSign, Users, Calendar
} from "lucide-react";

export default function DashboardPage() {
  // --- 1. CẤU HÌNH API ĐỘNG ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // 2. LOGIC NHẬN TOKEN & WID TỪ GOOGLE LOGIN
  // ==========================================
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const wid = urlParams.get('wid');

    if (token && wid) {
        localStorage.setItem('token', token);
        localStorage.setItem('workspaceId', wid);
        window.history.replaceState({}, document.title, window.location.pathname);
        setWorkspaceId(wid);
    } else {
        const savedId = localStorage.getItem("workspaceId") || "workspace-01";
        setWorkspaceId(savedId);
    }
  }, []);

  // --- 3. HÀM GỌI API LẤY DỮ LIỆU ---
  const fetchStats = useCallback(async () => {
    if (!workspaceId) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await axios.get(`${API_URL}/dashboard/stats?workspaceId=${workspaceId}`, {
        headers: {
            Authorization: token ? `Bearer ${token}` : ""
        }
      });
      setStats(res.data);
    } catch (error) {
      console.error("Lỗi Dashboard API:", error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, API_URL]);

  useEffect(() => {
    if (workspaceId) {
      fetchStats();
    }
  }, [workspaceId, fetchStats]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2 text-slate-300">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <p className="text-xs font-black uppercase tracking-widest">Đang phân tích dữ liệu...</p>
        </div>
    </div>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10 text-black">
        <div>
            <h1 className="text-3xl font-black flex items-center gap-3 text-black italic uppercase tracking-tighter">
                <BarChart3 className="text-blue-600" size={32} /> Tổng quan kinh doanh
            </h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase mt-2 tracking-widest ml-12">Hệ thống phân tích dữ liệu AI</p>
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
            sub="Doanh số chốt đơn"
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
            sub="Phân tích từ Inbox"
        />
      </div>

      {/* --- PHẦN BIỂU ĐỒ & LỊCH TRÌNH --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 relative overflow-hidden text-black flex flex-col justify-between">
                <div className="flex justify-between items-start mb-6 text-black">
                    <div>
                        <h2 className="text-xl font-black text-black uppercase tracking-tighter">Biểu đồ tăng trưởng</h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">Thống kê 7 ngày gần nhất</p>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-500 font-black text-sm bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                        <TrendingUp size={14} /> +{stats?.growthRate || "12%"}
                    </div>
                </div>
                
                {/* BIỂU ĐỒ 7 NGÀY HOẠT ĐỘNG HOÀN CHỈNH */}
                <GrowthChart weeklyData={stats?.weeklyData || stats?.chartData} />
          </div>

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
                                <p className="text-sm font-bold text-slate-800">Post mẫu số #{i}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Dự kiến: 12:00 PM</p>
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

// --- COMPONENT BIỂU ĐỒ TĂNG TRƯỞNG 7 NGÀY ---
function GrowthChart({ weeklyData }: { weeklyData?: any[] }) {
  const chartDays = useMemo(() => {
    const days = [];
    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayLabel = dayNames[d.getDay()];
      const dateLabel = `${d.getDate()}/${d.getMonth() + 1}`;
      
      // Khớp dữ liệu từ Backend nếu có
      let revenue = 0;
      let orders = 0;
      if (weeklyData && Array.isArray(weeklyData)) {
        const found = weeklyData.find((item: any) => {
          const itemDate = new Date(item.date || item.createdAt);
          return itemDate.getDate() === d.getDate() && itemDate.getMonth() === d.getMonth();
        });
        if (found) {
          revenue = Number(found.revenue || found.amount || 0);
          orders = Number(found.orders || found.count || 0);
        }
      }

      days.push({
        dayLabel,
        dateLabel,
        revenue,
        orders
      });
    }
    return days;
  }, [weeklyData]);

  // Tìm mức doanh thu cao nhất để chia tỉ lệ cột
  const maxRevenue = useMemo(() => {
    const max = Math.max(...chartDays.map(d => d.revenue));
    return max > 0 ? max : 1000000; // Tối thiểu 1 triệu để vẽ khung đẹp mắt khi chưa có doanh thu
  }, [chartDays]);

  return (
    <div className="w-full">
      {/* Vùng vẽ biểu đồ */}
      <div className="relative h-[220px] w-full pt-6 pb-2">
        {/* Đường lưới kẻ ngang */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
          <div className="border-b border-dashed border-slate-200 w-full" />
          <div className="border-b border-dashed border-slate-200 w-full" />
          <div className="border-b border-slate-200 w-full" />
        </div>

        {/* 7 Cột biểu đồ */}
        <div className="relative z-10 h-full flex items-end justify-between gap-2 sm:gap-4 px-2">
          {chartDays.map((item, idx) => {
            const heightPercent = item.revenue > 0 ? Math.max((item.revenue / maxRevenue) * 100, 12) : 6;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip khi rê chuột vào cột */}
                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none bg-slate-900 text-white text-[10px] font-bold py-1 px-2.5 rounded-xl shadow-xl whitespace-nowrap z-20">
                  <span className="text-emerald-400">{item.revenue.toLocaleString()}đ</span> • {item.orders} đơn
                </div>

                {/* Thanh cột */}
                <div 
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full max-w-[40px] rounded-t-2xl transition-all duration-500 ease-out cursor-pointer ${
                    item.revenue > 0 
                      ? 'bg-gradient-to-t from-blue-600 to-indigo-500 group-hover:from-blue-500 group-hover:to-indigo-400 shadow-md shadow-blue-500/20' 
                      : 'bg-slate-100 group-hover:bg-slate-200'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Trục ngày bên dưới */}
      <div className="flex justify-between items-center px-2 pt-3 border-t border-slate-100">
        {chartDays.map((item, idx) => (
          <div key={idx} className="flex-1 text-center">
            <p className="text-[11px] font-black text-slate-700 uppercase">{item.dayLabel}</p>
            <p className="text-[9px] font-bold text-slate-400">{item.dateLabel}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- THẺ THỐNG KÊ (GIỮ NGUYÊN) ---
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