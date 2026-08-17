"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { 
  DollarSign, Send, MessageCircle, AlertTriangle, 
  TrendingUp, ArrowRight, Sparkles, Target, 
  Zap, Calendar, ArrowUpRight, Loader2
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const workspaceId = "workspace-01";

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`http://localhost:3001/dashboard/stats?workspaceId=${workspaceId}`);
        setData(res.data);
      } catch (e) {
        console.error("Lỗi lấy dữ liệu dashboard:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="font-black text-slate-400 uppercase tracking-widest text-sm text-black">AI đang tổng hợp dữ liệu...</p>
    </div>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3 italic">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
                <TrendingUp size={28} />
            </div>
            Quản trị tăng trưởng AI
          </h1>
          <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">Dữ liệu thời gian thực • Cập nhật bởi AI</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
            <Calendar className="text-blue-600" size={18} />
            <span className="font-black text-sm text-black">7 NGÀY GẦN NHẤT</span>
        </div>
      </div>

      {/* 1. CỤM CARD CHỈ SỐ CHÍNH */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 text-black">
        <StatCard title="Doanh thu" value={`${data.stats.totalRevenue.toLocaleString()}đ`} icon={<DollarSign />} color="bg-blue-600" trend="+12.5%" />
        <StatCard title="Bài viết AI" value={data.stats.totalPosts} icon={<Send />} color="bg-indigo-600" trend="+5" />
        <StatCard title="Hội thoại" value={data.stats.totalMessages} icon={<MessageCircle />} color="bg-purple-600" trend="+18%" />
        <StatCard title="Kho hàng" value={data.stats.lowStockCount} icon={<AlertTriangle />} color="bg-orange-500" trend="Cần nhập" isAlert={data.stats.lowStockCount > 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10 text-black">
        {/* 2. BIỂU ĐỒ DOANH THU */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[45px] shadow-sm border border-slate-100 text-black">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-slate-900 text-lg uppercase italic">Xu hướng doanh thu</h3>
            <div className="flex items-center gap-2 text-green-500 font-bold text-sm">
                <Zap size={16} fill="currentColor" /> Tăng trưởng ổn định
            </div>
          </div>
          <div className="h-[320px] w-full text-black">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.stats.chart}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 'bold'}} dy={10} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                  formatter={(value: any) => [`${value.toLocaleString()}đ`, "Doanh thu"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. AI ADVISOR (LỜI KHUYÊN AI) */}
        <div className="bg-slate-900 p-8 rounded-[45px] text-white shadow-2xl relative overflow-hidden flex flex-col">
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <Sparkles className="text-blue-400 animate-pulse" size={28} />
                    <h2 className="text-xl font-black italic uppercase tracking-tight text-white">AI Advisor</h2>
                </div>
                
                <div className="bg-white/10 p-5 rounded-[30px] border border-white/10 mb-6">
                    <p className="text-sm leading-relaxed text-blue-100 font-medium italic text-white">
                        "{data.aiInsight.analysis}"
                    </p>
                </div>

                <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4 text-white">Đề xuất hành động</h3>
                <div className="space-y-3">
                    {data.aiInsight.suggestions.map((s: string, i: number) => (
                        <div key={i} className="flex items-start gap-3 group">
                            <div className="mt-1"><Target size={14} className="text-blue-500 group-hover:scale-125 transition-transform" /></div>
                            <p className="text-xs font-bold text-slate-300 leading-normal text-white">{s}</p>
                        </div>
                    ))}
                </div>
            </div>
            {/* Trang trí nền */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-black font-medium">
        {/* ĐƠN HÀNG GẦN ĐÂY */}
        <div className="bg-white p-8 rounded-[45px] shadow-sm border border-slate-100 text-black">
          <div className="flex justify-between items-center mb-6 text-black">
            <h2 className="text-xl font-black italic uppercase text-slate-900 text-black">Đơn hàng mới nhất</h2>
            <button className="text-blue-600 font-black text-xs uppercase tracking-widest hover:underline text-black">Xem tất cả</button>
          </div>
          <div className="space-y-3 text-black">
            {data.recentOrders.map((order: any) => (
              <div key={order.id} className="flex justify-between items-center p-5 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-md transition-all group text-black">
                <div className="flex items-center gap-4 text-black">
                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all text-black">
                      {order.customerName[0]}
                   </div>
                   <div>
                      <p className="font-black text-slate-800 text-sm text-black">{order.customerName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                   </div>
                </div>
                <div className="text-right text-black">
                    <p className="font-black text-blue-600 text-black">+{order.totalAmount.toLocaleString()}đ</p>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter text-black">Hoàn tất</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* THÔNG BÁO HỆ THỐNG */}
        <div className="bg-white p-8 rounded-[45px] shadow-sm border border-slate-100 flex flex-col justify-between text-black font-medium">
            <div>
                <h2 className="text-xl font-black italic uppercase mb-6 text-black">Trạng thái vận hành</h2>
                <div className="space-y-6">
                    <StatusItem label="Kết nối Facebook API" status="Hoạt động" color="text-green-500" />
                    <StatusItem label="AI Content Engine" status="Sẵn sàng" color="text-green-500" />
                    <StatusItem label="Viettel Post API" status="Đã đấu nối" color="text-blue-500" />
                </div>
            </div>
            <div className="mt-10 p-6 bg-blue-50 rounded-[30px] border border-blue-100">
                <p className="text-xs font-bold text-blue-600 leading-relaxed text-black font-medium">
                    Hệ thống đang tự động tối ưu hóa các bài đăng của bạn dựa trên dữ liệu mua hàng mới nhất.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}

// COMPONENT CON: THẺ THỐNG KÊ
function StatCard({ title, value, icon, color, trend, isAlert }: any) {
  return (
    <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-xl hover:-translate-y-1 transition-all text-black">
      <div className={`${color} p-4 rounded-2xl text-white shadow-lg shadow-blue-100 flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 text-black">{title}</p>
        <p className={`text-2xl font-black ${isAlert ? 'text-red-500' : 'text-slate-900'} text-black`}>{value}</p>
        <div className={`flex items-center gap-1 font-black text-[10px] mt-1 ${isAlert ? 'text-red-400' : 'text-green-500'}`}>
           <ArrowUpRight size={12} /> {trend}
        </div>
      </div>
    </div>
  );
}

// COMPONENT CON: TRẠNG THÁI
function StatusItem({ label, status, color }: any) {
    return (
        <div className="flex justify-between items-center pb-4 border-b border-slate-50 text-black">
            <span className="text-sm font-bold text-slate-500 text-black">{label}</span>
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full bg-current ${color} animate-pulse`}></div>
                <span className={`text-xs font-black uppercase tracking-widest ${color}`}>{status}</span>
            </div>
        </div>
    )
}