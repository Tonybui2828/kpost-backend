"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client"; 
import { 
  User, Lock, Shield, CreditCard, Gift, 
  BookOpen, Scale, Bell, Globe, ChevronRight,
  X, Copy, Smartphone, PartyPopper, Rocket, Loader2, Sparkles, CheckCircle2,
  Mail, KeyRound, UserPlus, LogIn, LogOut, ShieldCheck, Fingerprint,
  ShieldAlert, AlertCircle, FileText, Check, MessageCircle, XCircle, Share2,
  MousePointerClick, Users, ShoppingCart, DollarSign, TrendingUp, CheckCircle, Clock, Ticket
} from "lucide-react";

// --- 1. KẾT NỐI SOCKET ĐỘNG ---
const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001");

const tabs = [
  { id: "account", label: "Tài khoản & Login", icon: <User size={18} /> },
  { id: "affiliate", label: "AFFILIATE (KIẾM TIỀN)", icon: <Share2 size={18} /> },
  { id: "security", label: "Mật khẩu & Bảo mật", icon: <Lock size={18} /> },
  { id: "billing", label: "Gói cước & Nạp tiền", icon: <CreditCard size={18} /> },
  { id: "voucher", label: "Mã giảm giá", icon: <Gift size={18} /> },
  { id: "guide", label: "Hướng dẫn khách mới", icon: <BookOpen size={18} /> },
  { id: "terms", label: "Điều khoản sử dụng", icon: <Scale size={18} /> },
  { id: "privacy", label: "Chính sách bảo mật", icon: <Shield size={18} /> },
];

export default function SettingsPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const [activeTab, setActiveTab] = useState("account");
  const [showQR, setShowQR] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paymentInfo, setPaymentInfo] = useState({ qr: "", memo: "", amount: 0, plan: "" });
  const [workspaceId, setWorkspaceId] = useState<string>("");
  
  // --- QUẢN LÝ DỮ LIỆU USER CHUNG CHO TOÀN BỘ TRANG ---
  const [user, setUser] = useState<any>(null);
  const [isFetchingUser, setIsFetchingUser] = useState(true);

  // --- BẮT LINK AFFILIATE TRÊN URL ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      localStorage.setItem("kpost_affiliate_ref", refCode);
    }
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) { setIsFetchingUser(false); return; }
            const res = await axios.get(`${API_URL}/auth/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data);
            setWorkspaceId(res.data.currentWorkspaceId || res.data.wid || "");
        } catch (e) { 
            console.log("Guest mode active"); 
        } finally { 
            setIsFetchingUser(false); 
        }
    };
    fetchProfile();

    socket.on("paymentSuccess", (data: any) => {
      if (data.billCode === paymentInfo.memo) {
        setPaymentStatus("success");
        try {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3");
            audio.play();
        } catch (e) { console.log("Audio play blocked"); }
      }
    });

    let interval: NodeJS.Timeout | null = null;
    
    if (showQR && paymentStatus === "pending" && paymentInfo.memo) {
        interval = setInterval(async () => {
            try {
                const res = await axios.get(`${API_URL}/social/check-transaction/${paymentInfo.memo}?t=${new Date().getTime()}`);
                if (res.data && res.data.status === "success") {
                    setPaymentStatus("success");
                    if (interval) clearInterval(interval);
                    
                    try {
                        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3");
                        audio.play();
                    } catch (e) { console.log("Audio play blocked"); }
                }
            } catch (e) { console.error("Poll Error:", e); }
        }, 5000);
    }

    return () => {
      socket.off("paymentSuccess");
      if (interval) clearInterval(interval);
    };
  }, [paymentInfo.memo, showQR, paymentStatus, API_URL]);

  const handleUpgrade = async (planName: string, amount: number) => {
    if (!workspaceId) return alert("Vui lòng đăng nhập trước khi nâng cấp!");
    try {
      const res = await axios.post(`${API_URL}/social/create-transaction`, {
        workspaceId, planName, amount: amount
      });
      
      const { description } = res.data; 
      
      const qrUrl = `https://img.vietqr.io/image/MB-0966527931-compact.png?amount=${amount}&addInfo=${description}&accountName=BUI%20VAN%20KY`;
      setPaymentInfo({ qr: qrUrl, memo: description, amount: amount, plan: planName });
      setPaymentStatus("pending");
      setShowQR(true);
    } catch (e) { alert("Lỗi hệ thống thanh toán!"); }
  };

  const handleLogout = () => {
      localStorage.clear();
      window.location.reload();
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800 font-sans relative">
      {/* POPUP QUÉT MÃ QR THANH TOÁN */}
      {showQR && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-[50px] p-10 max-w-md w-full text-center shadow-2xl relative border border-white/20 text-black">
                {paymentStatus === "pending" ? (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <button onClick={() => setShowQR(false)} className="absolute top-8 right-8 text-slate-300 hover:text-red-500"><X size={32} /></button>
                        <div className="mb-6">
                            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg"><Smartphone size={32} /></div>
                            <h3 className="text-2xl font-black italic uppercase text-black">Quét mã nâng cấp</h3>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Gói {paymentInfo.plan} • {paymentInfo.amount.toLocaleString()}đ</p>
                        </div>
                        <div className="bg-white p-6 rounded-[40px] mb-8 border-2 border-slate-100 shadow-sm"><img src={paymentInfo.qr} className="w-full rounded-3xl" alt="QR" /></div>
                        <div className="space-y-4">
                            <div className="bg-blue-600 p-5 rounded-3xl text-white cursor-pointer active:scale-95 transition-all shadow-xl shadow-blue-100" onClick={() => {navigator.clipboard.writeText(paymentInfo.memo); alert("Đã copy!");}}>
                                <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-1">Nội dung chuyển khoản</p>
                                <p className="text-2xl font-black italic tracking-widest flex items-center justify-center gap-3">{paymentInfo.memo} <Copy size={18} /></p>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-[11px] text-blue-600 font-black uppercase animate-pulse mt-4"><Loader2 size={14} className="animate-spin" /> Đang kiểm tra tiền về...</div>
                        </div>
                    </div>
                ) : (
                    <div className="py-6 animate-in zoom-in-50 duration-500 text-black">
                        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-2xl animate-bounce"><PartyPopper size={48} /></div>
                        <h3 className="text-4xl font-black italic uppercase mb-2">THÀNH CÔNG!</h3>
                        <p className="text-sm text-slate-500 font-bold mb-10 px-4">Cảm ơn bạn! Gói {paymentInfo.plan} đã được kích hoạt.</p>
                        <button onClick={() => window.location.reload()} className="w-full py-5 bg-blue-600 text-white rounded-[28px] font-black uppercase italic text-lg shadow-2xl active:scale-95">Bắt đầu ngay 🚀</button>
                    </div>
                )}
            </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-10">
        
        {/* ================= SIDEBAR ================= */}
        <div className="w-full lg:w-72 space-y-2">
           <div className="mb-10 px-4 text-black text-center lg:text-left">
              <h1 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">Settings</h1>
              
              {isFetchingUser ? (
                  <div className="h-4 w-32 bg-slate-200 animate-pulse rounded mt-2 mx-auto lg:mx-0"></div>
              ) : user ? (
                  <p className="text-[11px] font-black text-slate-600 uppercase mt-1 tracking-widest">
                    {user.name} - <span className="text-blue-600">{workspaceId || "KP_GUEST"}</span>
                  </p>
              ) : (
                  <p className="text-[11px] font-black text-slate-600 uppercase mt-1 tracking-widest">
                    Chưa đăng nhập
                  </p>
              )}
           </div>

           {tabs.map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`w-full flex items-center justify-between px-6 py-4 rounded-[24px] font-black transition-all ${
                 activeTab === tab.id 
                   ? (tab.id === 'affiliate' ? "bg-blue-600 text-white shadow-xl scale-[1.05]" : "bg-blue-600 text-white shadow-xl scale-[1.05]")
                   : (tab.id === 'affiliate' ? "text-blue-600 hover:bg-blue-50" : "text-slate-400 hover:bg-white hover:text-slate-600")
               }`}
             >
               <div className="flex items-center gap-4">{tab.icon} <span className="text-sm uppercase tracking-tight">{tab.label}</span></div>
               {activeTab === tab.id && <ChevronRight size={16} />}
             </button>
           ))}

           {user && (
             <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-4 mt-4 rounded-[24px] font-black transition-all text-slate-400 hover:text-red-500 hover:bg-white">
               <LogOut size={18} /> <span className="text-sm uppercase tracking-tight">Đăng xuất</span>
             </button>
           )}
        </div>

        {/* ================= MAIN CONTENT ================= */}
        <div className="flex-1 bg-white rounded-[50px] shadow-2xl border border-white p-12 min-h-[700px] text-black">
            {activeTab === "account" && <AccountTab user={user} loading={isFetchingUser} />}
            {activeTab === "affiliate" && <AffiliateTab user={user} />}
            {activeTab === "billing" && <BillingTab onUpgrade={handleUpgrade} />}
            {activeTab === "security" && <SecurityTab />}
            {activeTab === "voucher" && <VoucherTab />}
            {activeTab === "guide" && <GuideTab />}
            {activeTab === "terms" && <TermsTab />}
            {activeTab === "privacy" && <PrivacyTab />}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// CÁC TAB CHI TIẾT
// ==========================================

function AccountTab({ user, loading }: { user: any, loading: boolean }) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const [authMode, setAuthMode] = useState("login"); 
    const [formData, setFormData] = useState({ email: "", password: "", name: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getRemainingDays = (expiryDate: string | null) => {
        if (!expiryDate) return null;
        const diffTime = new Date(expiryDate).getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    const handleManualAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload: any = { ...formData };
            if (authMode === "register") {
                const savedRef = localStorage.getItem("kpost_affiliate_ref");
                if (savedRef) {
                    payload.affiliateBy = savedRef; 
                }
            }

            const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
            const res = await axios.post(`${API_URL}${endpoint}`, payload);
            
            if (authMode === "login") {
                localStorage.setItem("token", res.data.token);
                localStorage.setItem("workspaceId", res.data.wid);
                window.location.href = "/dashboard"; 
            } else {
                alert("Đăng ký thành công! Mời bạn đăng nhập.");
                setAuthMode("login");
            }
        } catch (error: any) {
            alert(error.response?.data?.message || "Lỗi xử lý xác thực!");
        } finally { setIsSubmitting(false); }
    };

    if (loading) return <div className="p-10 text-center animate-pulse font-black text-slate-300 uppercase">Đang kết nối hệ thống...</div>;

    if (user) {
        const remainingDays = getRemainingDays(user.planExpiry);

        return (
            <div className="space-y-10 animate-in fade-in text-black">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-600 rounded-[30px] flex items-center justify-center text-white font-black text-3xl shadow-xl">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-3xl font-black italic uppercase tracking-tighter">{user.name}</h2>
                      <p className="text-slate-400 font-bold">{user.email}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-slate-50 rounded-3xl border">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gói hiện tại</p>
                        <div className="flex items-center gap-3">
                            <p className="text-xl font-black text-blue-600 italic uppercase">{user.plan || "FREE"} MEMBER</p>
                            {remainingDays !== null && remainingDays > 0 && (
                                <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase ${remainingDays <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                    <Clock size={12} /> Còn {remainingDays} ngày
                                </span>
                            )}
                            {remainingDays === 0 && user.plan && user.plan.toLowerCase() !== "free" && (
                                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-200 text-slate-500">
                                    Đã hết hạn
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Không gian</p>
                      <p className="text-sm font-mono font-bold text-slate-600 truncate">{user.currentWorkspaceId || "Chưa có"}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto text-black">
            <h2 className="text-3xl font-black italic uppercase mb-10 text-center tracking-tighter">{authMode === 'login' ? 'Đăng Nhập' : 'Tạo Tài Khoản'}</h2>
            <form onSubmit={handleManualAuth} className="space-y-4">
                {authMode === 'register' && <input className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold" placeholder="Họ và tên" onChange={e => setFormData({...formData, name: e.target.value})} required />}
                <input className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold" type="email" placeholder="Email" onChange={e => setFormData({...formData, email: e.target.value})} required />
                <input className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold" type="password" placeholder="Mật khẩu" onChange={e => setFormData({...formData, password: e.target.value})} required />
                <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-black text-white font-black rounded-[25px] shadow-2xl flex justify-center items-center gap-3 active:scale-95 transition-all disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : authMode === 'login' ? <LogIn size={20}/> : <UserPlus size={20}/>} 
                  {authMode === 'login' ? 'VÀO HỆ THỐNG' : 'ĐĂNG KÝ NGAY'}
                </button>
            </form>
            <div className="mt-8 text-center">
              <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 underline"> 
                {authMode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'} 
              </button>
            </div>
            <div className="my-10 flex items-center gap-4">
              <div className="h-[1px] bg-slate-100 flex-1"></div>
              <span className="text-[10px] font-black text-slate-300">HOẶC</span>
              <div className="h-[1px] bg-slate-100 flex-1"></div>
            </div>
            <button onClick={() => window.location.href=`${API_URL}/auth/google`} className="w-full bg-white border border-slate-200 text-slate-700 font-black py-4 rounded-[24px] text-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-4 shadow-[0_4px_15px_rgb(0,0,0,0.02)]">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/list/google.svg" className="w-5 h-5" alt="G" />
                TIẾP TỤC VỚI GOOGLE
            </button>
        </div>
    )
}

function AffiliateTab({ user }: { user: any }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const [copySuccess, setCopySuccess] = useState(false);
  const [timeFilter, setTimeFilter] = useState('month');
  
  // State lưu trữ dữ liệu thống kê thật từ Backend
  const [stats, setStats] = useState({ clicks: 0, signups: 0, orders: 0, revenue: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Gán link Affiliate động
  const affiliateId = user?.currentWorkspaceId || user?._id || "GUEST";
  const dynamicAffiliateLink = `https://kpost.vn/?ref=KPOST_${affiliateId}`;

  // Gọi API lấy dữ liệu thống kê khi tab được load
  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.currentWorkspaceId) {
        setIsLoadingStats(false);
        return;
      }
      try {
        const res = await axios.get(`${API_URL}/social/affiliate/stats?workspaceId=${user.currentWorkspaceId}`);
        setStats(res.data);
      } catch (error) {
        console.error("Lỗi lấy dữ liệu Affiliate:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchStats();
  }, [user?.currentWorkspaceId, API_URL]);

  const handleCopy = () => {
    navigator.clipboard.writeText(dynamicAffiliateLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in">
       <div className="border-b border-slate-100 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-3">
              <Share2 className="text-blue-600" size={28} /> KPOST AFFILIATE
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-2">Chia sẻ Kpost - Nhận hoa hồng trọn đời</p>
          </div>
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-2xl flex items-center gap-2">
             <CheckCircle size={18} />
             <div>
                <p className="text-[10px] font-black uppercase tracking-wider">Trạng thái Affiliate</p>
                <p className="text-sm font-bold">
                  {user ? `Đã kích hoạt (${user.plan || "Free"})` : "Chưa kích hoạt"}
                </p>
             </div>
          </div>
       </div>

       {/* INFO CARDS */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50/50 rounded-[24px] p-6 border border-blue-100">
             <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Chính sách hoa hồng</h3>
             <ul className="space-y-3 text-sm font-medium text-slate-700">
               <li className="flex items-center gap-2"><Check className="text-blue-500" size={16}/> Hoa hồng <strong className="text-blue-700">10%</strong> trên giá trị đơn sau giảm giá.</li>
               <li className="flex items-center gap-2"><Check className="text-blue-500" size={16}/> Cookie được lưu <strong className="text-blue-700">12 tháng</strong>.</li>
             </ul>
          </div>
          <div className="bg-orange-50/50 rounded-[24px] p-6 border border-orange-100">
             <h3 className="text-xs font-black text-orange-600 uppercase tracking-widest mb-4">Quy định thanh toán</h3>
             <ul className="space-y-3 text-sm font-medium text-slate-700">
               <li className="flex items-center gap-2"><Check className="text-orange-500" size={16}/> Lệnh rút tối thiểu <strong className="text-orange-700">500.000 VNĐ</strong>.</li>
               <li className="flex items-center gap-2"><Check className="text-orange-500" size={16}/> Thanh toán vào <strong className="text-orange-700">Thứ 2</strong> và <strong className="text-orange-700">Thứ 6</strong>.</li>
             </ul>
          </div>
       </div>

       {/* LINK AFFILIATE ĐỘNG */}
       <div>
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Link Giới Thiệu Của Bạn</label>
          <div className="flex gap-2">
             <input 
               readOnly 
               value={dynamicAffiliateLink} 
               className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none"
             />
             <button onClick={handleCopy} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase hover:bg-blue-600 transition-colors flex items-center gap-2">
               {copySuccess ? <Check size={18} /> : <Copy size={18} />}
               {copySuccess ? 'Đã Copy' : 'Copy'}
             </button>
          </div>
       </div>

       {/* THỐNG KÊ TỪ BACKEND */}
       <div>
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Tổng quan thống kê</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2 text-blue-500"><MousePointerClick size={16}/> <span className="text-[10px] font-black uppercase tracking-widest">Lượt nhấp</span></div>
                {isLoadingStats ? <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"></div> : <p className="text-2xl font-black italic text-slate-900">{stats.clicks.toLocaleString()}</p>}
             </div>
             <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2 text-indigo-500"><Users size={16}/> <span className="text-[10px] font-black uppercase tracking-widest">Đăng ký mới</span></div>
                {isLoadingStats ? <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"></div> : <p className="text-2xl font-black italic text-slate-900">{stats.signups.toLocaleString()}</p>}
             </div>
             <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2 text-purple-500"><ShoppingCart size={16}/> <span className="text-[10px] font-black uppercase tracking-widest">Đã mua gói</span></div>
                {isLoadingStats ? <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"></div> : <p className="text-2xl font-black italic text-slate-900">{stats.orders.toLocaleString()}</p>}
             </div>
             <div className="p-5 rounded-2xl bg-green-50 border border-green-100 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2 text-green-600"><DollarSign size={16}/> <span className="text-[10px] font-black uppercase tracking-widest">Số dư hoa hồng</span></div>
                {isLoadingStats ? <div className="h-8 w-24 bg-green-200 animate-pulse rounded"></div> : <p className="text-2xl font-black italic text-green-700">{stats.revenue.toLocaleString()}đ</p>}
             </div>
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-2 italic">* Số liệu được cập nhật theo thời gian thực từ hệ thống.</p>
       </div>

       {/* BÁO CÁO DOANH THU THEO THỜI GIAN */}
       <div className="p-6 rounded-[32px] border border-slate-100 bg-slate-50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
             <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
               <TrendingUp size={18} className="text-blue-500"/> Doanh thu theo thời gian
             </h3>
             <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm flex-wrap">
               {['day', 'week', 'month', 'quarter', 'year'].map(t => (
                 <button 
                   key={t}
                   onClick={() => setTimeFilter(t)}
                   className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${timeFilter === t ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                 >
                   {t === 'day' ? 'Ngày' : t === 'week' ? 'Tuần' : t === 'month' ? 'Tháng' : t === 'quarter' ? 'Quý' : 'Năm'}
                 </button>
               ))}
             </div>
          </div>
          
          <div className="h-48 flex items-end gap-2 justify-between mt-8 opacity-30">
             {[0, 0, 0, 0, 0, 0, 0].map((h, i) => (
               <div key={i} className="w-full bg-blue-100 rounded-t-lg relative group" style={{height: `5%`}}>
               </div>
             ))}
          </div>
          <div className="flex justify-between mt-4 text-[10px] font-black uppercase text-slate-400">
             <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
          </div>
       </div>
    </div>
  )
}

function SecurityTab() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const [loading, setLoading] = useState(false);
    const [passwords, setPasswords] = useState({ old: "", new: "", confirm: "" });

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) return alert("Mật khẩu mới không khớp!");
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${API_URL}/auth/change-password`, passwords, { headers: { Authorization: `Bearer ${token}` } });
            alert("✅ Đã đổi mật khẩu thành công!");
            setPasswords({ old: "", new: "", confirm: "" });
        } catch (e: any) { alert(e.response?.data?.message || "Thất bại!"); } finally { setLoading(false); }
    };

    return (
        <div className="space-y-10 text-black animate-in fade-in">
            <h2 className="text-2xl font-black italic uppercase">Bảo mật đa tầng</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <h3 className="font-black text-sm text-blue-600 uppercase flex items-center gap-2"><KeyRound size={16} /> Đổi mật khẩu</h3>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <input type="password" placeholder="Mật khẩu hiện tại" className="w-full p-4 bg-slate-50 rounded-2xl border outline-none font-bold" value={passwords.old} onChange={e => setPasswords({...passwords, old: e.target.value})} required />
                        <input type="password" placeholder="Mật khẩu mới (tối thiểu 12 ký tự)" className="w-full p-4 bg-slate-50 rounded-2xl border outline-none font-bold" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} required />
                        <input type="password" placeholder="Xác nhận mật khẩu mới" className="w-full p-4 bg-slate-50 rounded-2xl border outline-none font-bold" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} required />
                        <button className="w-full py-4 bg-black text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all">{loading ? <Loader2 className="animate-spin mx-auto" /> : "CẬP NHẬT MẬT KHẨU"}</button>
                    </form>
                </div>
                <div className="space-y-6">
                    <h3 className="font-black text-sm text-blue-600 uppercase flex items-center gap-2"><ShieldCheck size={16} /> Nhật ký & 2FA</h3>
                    <div className="p-5 bg-slate-50 rounded-3xl border flex items-center justify-between"><div className="flex items-center gap-3"><Smartphone size={20} className="text-slate-400" /><div><p className="text-sm font-black text-black">Xác thực OTP</p><p className="text-[10px] text-slate-400 font-bold">Bảo vệ qua điện thoại</p></div></div><span className="px-4 py-1.5 bg-slate-200 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest">Coming soon</span></div>
                    <div className="p-5 bg-slate-50 rounded-3xl border flex items-center justify-between"><div className="flex items-center gap-3"><Fingerprint size={20} className="text-slate-400" /><div><p className="text-sm font-black text-black">Thiết bị tin cậy</p><p className="text-[10px] text-slate-400 font-bold">Quản lý phiên đăng nhập</p></div></div><button className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase">Kiểm tra</button></div>
                </div>
            </div>
        </div>
    )
}

function BillingTab({ onUpgrade }: any) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const [duration, setDuration] = useState('1m');
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [voucher, setVoucher] = useState("");
    const [discount, setDiscount] = useState(0); 
    const [isPercentage, setIsPercentage] = useState(true);
    const [voucherMessage, setVoucherMessage] = useState("");
    const [isCheckingVoucher, setIsCheckingVoucher] = useState(false);

    const plans = [
        { 
            name: "PRO", 
            color: "blue",
            prices: { '1m': 590000, '3m': 1690000, '6m': 3390000, '12m': 6890000 },
            features: ["Add 50 Fanpage", "Thêm 50 sản phẩm", "Đăng bài không giới hạn", "Sử dụng tính năng nâng cao Auto AI Inbox", "Mở tính năng Affiliate hoa hồng 10%"] 
        },
        { 
            name: "GOLD", 
            color: "amber", 
            prices: { '1m': 990000, '3m': 2890000, '6m': 5890000, '12m': 11690000 },
            features: ["Tất cả tính năng Gói PRO", "Add 100 Fanpage", "Add 100 sản phẩm", "Mở tính năng Affiliate hoa hồng 15%"] 
        },
        { 
            name: "DIAMOND", 
            color: "purple", 
            prices: { '1m': 3990000, '3m': 11890000, '6m': 23390000, '12m': 46590000 },
            features: ["Tất cả tính năng Gói GOLD & PRO", "Add 500 Fanpage", "Thêm 500 sản phẩm", "Mở tính năng Affiliate hoa hồng 20%"] 
        },
    ];

    const handleApplyVoucher = async () => {
        if (!voucher.trim()) {
            setDiscount(0);
            setVoucherMessage("");
            return;
        }

        setIsCheckingVoucher(true);
        setVoucherMessage("Đang kiểm tra...");
        
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(`${API_URL}/social/check-voucher`, { code: voucher.toUpperCase() }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.data && res.data.valid) {
                const discountValue = res.data.discountValue; 
                const discountType = res.data.discountType;
                
                setDiscount(discountValue);
                setIsPercentage(discountType === 'percent');
                
                setVoucherMessage(`✅ Đã áp dụng giảm ${discountType === 'percent' ? discountValue + '%' : discountValue.toLocaleString() + 'đ'}`);
            } else {
                setDiscount(0);
                setVoucherMessage("❌ Mã không hợp lệ hoặc đã hết hạn");
            }
        } catch (error: any) {
            setDiscount(0);
            setVoucherMessage(`❌ ${error.response?.data?.message || "Mã không hợp lệ hoặc đã hết hạn"}`);
        } finally {
            setIsCheckingVoucher(false);
        }
    };

    const getFinalPrice = () => {
        if (!selectedPlan) return 0;
        let finalPrice = selectedPlan.price;
        if (discount > 0) {
            if (isPercentage) {
                finalPrice = finalPrice * (1 - (discount / 100));
            } else {
                finalPrice = finalPrice - discount;
            }
        }
        return finalPrice > 0 ? finalPrice : 0;
    };
    
    const getDiscountAmount = () => {
        if (!selectedPlan || discount <= 0) return 0;
        if (isPercentage) {
            return selectedPlan.price * (discount / 100);
        }
        return discount > selectedPlan.price ? selectedPlan.price : discount;
    };

    const handleConfirmPayment = () => {
        const finalPrice = getFinalPrice();
        onUpgrade(selectedPlan.name, finalPrice);
        setSelectedPlan(null); 
        setVoucher("");
        setDiscount(0);
        setVoucherMessage("");
    };

    return (
        <div className="space-y-10 text-black animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <h2 className="text-2xl font-black italic uppercase">Nâng cấp thành viên</h2>
                
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    {[
                        { id: '1m', label: '1 Tháng' },
                        { id: '3m', label: '3 Tháng' },
                        { id: '6m', label: '6 Tháng' },
                        { id: '12m', label: '1 Năm' }
                    ].map(d => (
                        <button 
                            key={d.id} 
                            onClick={() => setDuration(d.id)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${duration === d.id ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            {d.label}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {plans.map((p) => {
                    const price = p.prices[duration as keyof typeof p.prices];
                    return (
                        <div key={p.name} className={`p-8 rounded-[40px] border-4 bg-white hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col ${p.color === 'blue' ? 'border-blue-100 hover:border-blue-600' : p.color === 'amber' ? 'border-amber-100 hover:border-amber-500' : 'border-purple-100 hover:border-purple-600'}`}>
                            <p className={`font-black uppercase text-[11px] tracking-widest mb-4 ${p.color === 'blue' ? 'text-blue-600' : p.color === 'amber' ? 'text-amber-500' : 'text-purple-600'}`}>Hạng {p.name}</p>
                            <div className="flex items-end gap-1 mb-8">
                                <span className="text-4xl font-black italic tracking-tighter">{price.toLocaleString()}đ</span>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                {p.features.map(f => (
                                    <li key={f} className="text-xs font-bold text-slate-600 flex items-start gap-3 leading-relaxed">
                                        <CheckCircle2 size={16} className={`${p.color === 'blue' ? 'text-blue-500' : p.color === 'amber' ? 'text-amber-500' : 'text-purple-500'} shrink-0 mt-0.5`}/> 
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button 
                                onClick={() => setSelectedPlan({ name: p.name, price: price })} 
                                className={`w-full py-4 rounded-3xl font-black text-white uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all mt-auto ${p.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' : p.color === 'amber' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'}`}>
                                Chọn gói này ✨
                            </button>
                        </div>
                    );
                })}
            </div>

            {selectedPlan && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[40px] p-8 max-w-sm w-full shadow-2xl relative flex flex-col animate-in zoom-in-95 duration-200 border border-white/20">
                        <button onClick={() => setSelectedPlan(null)} className="absolute top-6 right-6 text-slate-400 hover:text-red-500 transition-colors">
                            <X size={28} />
                        </button>
                        
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 mb-6">Xác nhận đơn hàng</h3>
                        
                        <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 mb-6 space-y-4">
                            <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                                <span>Gói cước:</span>
                                <span className="text-slate-900 uppercase font-black">Hạng {selectedPlan.name}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                                <span>Chu kỳ:</span>
                                <span className="text-slate-900 font-black">{
                                    duration === '1m' ? '1 Tháng' : 
                                    duration === '3m' ? '3 Tháng' : 
                                    duration === '6m' ? '6 Tháng' : '1 Năm'
                                }</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                                <span>Giá gốc:</span>
                                <span className="text-slate-900 font-black">{selectedPlan.price.toLocaleString()}đ</span>
                            </div>
                            
                            {discount > 0 && (
                                <div className="flex justify-between items-center text-sm font-black text-green-600">
                                    <span>Giảm giá ({isPercentage ? discount + '%' : discount.toLocaleString() + 'đ'}):</span>
                                    <span>-{getDiscountAmount().toLocaleString()}đ</span>
                                </div>
                            )}
                            
                            <div className="pt-4 border-t border-slate-200 flex flex-col mt-2">
                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Tổng thanh toán:</span>
                                <span className="text-3xl font-black italic text-blue-600">{getFinalPrice().toLocaleString()}đ</span>
                            </div>
                        </div>

                        <div className="mb-8">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Mã giảm giá (Nếu có)</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={voucher} 
                                    onChange={(e) => setVoucher(e.target.value.toUpperCase())}
                                    placeholder="Nhập mã..." 
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors uppercase placeholder:normal-case"
                                />
                                <button onClick={handleApplyVoucher} disabled={isCheckingVoucher} className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase hover:bg-blue-600 transition-colors active:scale-95 disabled:opacity-70 flex items-center justify-center min-w-[90px]">
                                    {isCheckingVoucher ? <Loader2 size={16} className="animate-spin" /> : "Áp dụng"}
                                </button>
                            </div>
                            {voucherMessage && (
                                <p className={`text-xs font-bold mt-3 ${voucherMessage.includes('❌') ? 'text-red-500' : 'text-green-600'}`}>
                                    {voucherMessage}
                                </p>
                            )}
                        </div>

                        <button onClick={handleConfirmPayment} className="w-full py-5 bg-blue-600 text-white font-black rounded-[24px] shadow-xl hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                            Tiến Hành Thanh Toán <ChevronRight size={18}/>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function VoucherTab() { 
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const [code, setCode] = useState("");
    const [isChecking, setIsChecking] = useState(false);
    const [message, setMessage] = useState("");
    
    const [savedVouchers, setSavedVouchers] = useState<any[]>([]);

    const handleSaveVoucher = async () => {
        if (!code.trim()) return;
        setIsChecking(true);
        setMessage("Đang kiểm tra...");
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(`${API_URL}/social/check-voucher`, { code: code.toUpperCase() }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.data && res.data.valid) {
                if (!savedVouchers.find(v => v.code === code.toUpperCase())) {
                    setSavedVouchers([{
                        code: code.toUpperCase(),
                        discountValue: res.data.discountValue,
                        discountType: res.data.discountType,
                        validUntil: "Vô thời hạn" 
                    }, ...savedVouchers]);
                    setMessage("✅ Đã lưu mã giảm giá thành công vào ví!");
                } else {
                    setMessage("⚠️ Mã này đã được lưu trong ví của bạn.");
                }
                setCode("");
            } else {
                setMessage("❌ Mã không hợp lệ hoặc đã hết hạn");
            }
        } catch (error: any) {
            setMessage(`❌ ${error.response?.data?.message || "Mã không tồn tại"}`);
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="text-black animate-in fade-in">
            <h2 className="text-2xl font-black italic uppercase mb-8">Ví mã giảm giá</h2>
            
            <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 mb-10 max-w-lg">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Thêm mã giảm giá mới</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={code} 
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="Nhập mã KPOST..." 
                        className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors uppercase placeholder:normal-case"
                    />
                    <button 
                        onClick={handleSaveVoucher} 
                        disabled={isChecking} 
                        className="bg-blue-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase hover:bg-blue-700 transition-colors active:scale-95 disabled:opacity-70 flex items-center justify-center"
                    >
                        {isChecking ? <Loader2 size={18} className="animate-spin" /> : "LƯU MÃ"}
                    </button>
                </div>
                {message && (
                    <p className={`text-xs font-bold mt-4 ${message.includes('❌') ? 'text-red-500' : message.includes('⚠️') ? 'text-amber-500' : 'text-green-600'}`}>
                        {message}
                    </p>
                )}
            </div>

            {savedVouchers.length === 0 ? (
                <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50">
                    <Gift size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="font-black text-slate-400 uppercase italic">Ví của bạn hiện đang trống.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedVouchers.map((v, index) => (
                        <div key={index} className="flex items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-50 rounded-full border-r border-slate-200"></div>
                            
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                                <Ticket size={28} />
                            </div>
                            <div className="flex-1">
                                <p className="text-xl font-black italic text-slate-900 tracking-tighter">
                                    Giảm {v.discountType === 'percent' ? v.discountValue + '%' : v.discountValue.toLocaleString() + 'đ'}
                                </p>
                                <p className="text-xs font-bold text-slate-500 mt-1">Mã: <span className="text-blue-600">{v.code}</span></p>
                                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest flex items-center gap-1">
                                    <Clock size={12}/> {v.validUntil}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    ) 
}

function GuideTab() { return <div className="p-10 text-center text-black animate-in fade-in"><BookOpen size={48} className="mx-auto text-slate-200 mb-4" /><p className="font-black text-slate-400 uppercase italic">Tài liệu đang được cập nhật...</p></div> }

function TermsTab() {
  useEffect(() => {
    document.title = "Điều Khoản Dịch Vụ & Thỏa Thuận Pháp Lý Minh Bạch | Kpost";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Chi tiết điều khoản dịch vụ và thỏa thuận pháp lý khi sử dụng phần mềm Kpost. Tìm hiểu rõ về quyền lợi, trách nhiệm, quy trình thanh toán và bảo mật tài khoản.");
    }
  }, []);

  return (
    <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-sm border border-slate-100 max-h-[85vh] overflow-y-auto custom-scrollbar animate-in fade-in">
      <div className="mb-8 border-b border-slate-100 pb-6 flex items-center gap-4">
        <div className="bg-orange-50 text-orange-600 p-4 rounded-2xl">
          <Scale size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">
            Điều Khoản Dịch Vụ
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-2">Thỏa Thuận Pháp Lý Kpost</p>
        </div>
      </div>

      <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
        <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 text-center md:text-left">
          <h3 className="text-lg font-black text-slate-900 mb-3 uppercase tracking-tighter flex items-center justify-center md:justify-start gap-2">
            <ShieldAlert className="text-orange-500" size={20}/> Chào mừng đến với Kpost!
          </h3>
          <p className="mb-4">
            Để xây dựng một môi trường làm việc hiệu quả, minh bạch và bảo vệ tối đa quyền lợi của Khách hàng, 
            tài liệu này đóng vai trò là <strong>Thỏa thuận pháp lý ("Thỏa thuận")</strong> chính thức giữa <strong>Bạn ("Khách hàng")</strong> và <strong>Công ty ("Kpost" hoặc "Chúng tôi")</strong>. 
            Chúng tôi cam kết cung cấp các dịch vụ công nghệ chất lượng cao, đồng hành cùng sự phát triển kinh doanh của bạn.
          </p>
          <div className="bg-orange-100 text-orange-800 p-3 rounded-xl font-bold text-xs uppercase tracking-wider">
            Bằng việc đăng ký tài khoản, thực hiện thanh toán hoặc bắt đầu sử dụng Phần mềm, Khách hàng xác nhận đã đọc, hiểu và đồng ý tuân thủ toàn bộ các điều khoản dưới đây.
          </div>
        </div>

        <div className="relative w-full h-48 md:h-64 bg-slate-900 rounded-[24px] overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
           <div className="text-center z-10 text-white px-4">
             <div className="flex justify-center gap-4 mb-4">
                <div className="bg-blue-500 p-3 rounded-full"><User size={24} className="text-white"/></div>
                <Scale size={48} className="text-slate-400 opacity-50" />
                <div className="bg-orange-500 p-3 rounded-full"><Shield size={24} className="text-white"/></div>
             </div>
             <p className="font-bold text-xs uppercase tracking-widest text-slate-300">Thỏa thuận pháp lý và điều khoản dịch vụ minh bạch tại Kpost</p>
           </div>
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tighter flex items-center gap-2">
            <span className="bg-slate-200 text-slate-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span> 
            Định Nghĩa Cơ Bản
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <p className="font-bold text-slate-900 mb-1 text-xs uppercase tracking-widest">"Phần mềm"</p>
                <p className="text-xs text-slate-600">Là hệ thống ứng dụng Kpost, bao gồm toàn bộ mã nguồn, giao diện website, ứng dụng di động, tài liệu kỹ thuật và các bản cập nhật do Chúng tôi phát triển, sở hữu.</p>
             </div>
             <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <p className="font-bold text-slate-900 mb-1 text-xs uppercase tracking-widest">"Khách hàng"</p>
                <p className="text-xs text-slate-600">Là cá nhân hoặc tổ chức thực hiện trả phí để mua Quyền sử dụng Phần mềm.</p>
             </div>
             <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <p className="font-bold text-slate-900 mb-1 text-xs uppercase tracking-widest">"Quyền sử dụng" (License)</p>
                <p className="text-xs text-slate-600">Là quyền có thời hạn, không độc quyền, không thể chuyển nhượng mà Kpost cấp cho Khách hàng để truy cập và khai thác các tính năng của Phần mềm.</p>
             </div>
             <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <p className="font-bold text-slate-900 mb-1 text-xs uppercase tracking-widest">"Gói cước"</p>
                <p className="text-xs text-slate-600">Là tập hợp các tính năng, giới hạn dung lượng và thời hạn sử dụng (Time-based subscription) mà Khách hàng đã lựa chọn.</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div>
              <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tighter flex items-center gap-2">
                <span className="bg-slate-200 text-slate-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span> 
                Tài Khoản và Bảo Mật
              </h3>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="text-blue-500 shrink-0 mt-0.5" size={16}/> 
                  Khách hàng có trách nhiệm cung cấp thông tin hoàn toàn chính xác trong quá trình đăng ký.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="text-blue-500 shrink-0 mt-0.5" size={16}/> 
                  Tự bảo mật thông tin tài khoản (username, password, API Key). Mọi hoạt động phát sinh từ tài khoản sẽ do Khách hàng chịu trách nhiệm hoàn toàn.
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={16}/> 
                  Kpost được miễn trừ trách nhiệm đối với thiệt hại do Khách hàng vô tình hay cố ý để lộ thông tin.
                </li>
              </ul>
           </div>
           <div>
              <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tighter flex items-center gap-2">
                <span className="bg-slate-200 text-slate-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span> 
                Thanh Toán & Nghiệm Thu
              </h3>
              <div className="space-y-3">
                 <div className="flex gap-3 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                   <div className="bg-blue-100 text-blue-600 font-black w-6 h-6 flex items-center justify-center rounded-full text-xs">1</div>
                   <p className="text-xs"><strong className="text-slate-900">Thanh toán:</strong> 100% giá trị Gói cước trước khi sử dụng.</p>
                 </div>
                 <div className="flex gap-3 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                   <div className="bg-blue-100 text-blue-600 font-black w-6 h-6 flex items-center justify-center rounded-full text-xs">2</div>
                   <p className="text-xs"><strong className="text-slate-900">Bàn giao:</strong> Ngay khi hệ thống gửi xác nhận kích hoạt.</p>
                 </div>
                 <div className="flex gap-3 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                   <div className="bg-blue-100 text-blue-600 font-black w-6 h-6 flex items-center justify-center rounded-full text-xs">3</div>
                   <p className="text-xs"><strong className="text-slate-900">Nghiệm thu:</strong> Lần đăng nhập đầu tiên được coi là Biên bản nghiệm thu điện tử.</p>
                 </div>
                 <div className="flex gap-3 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                   <div className="bg-blue-100 text-blue-600 font-black w-6 h-6 flex items-center justify-center rounded-full text-xs">4</div>
                   <p className="text-xs"><strong className="text-slate-900">Hóa đơn:</strong> Ghi nhận với nội dung "Phí quyền sử dụng phần mềm".</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-2xl">
          <h3 className="text-lg font-black text-red-700 mb-2 uppercase tracking-tighter flex items-center gap-2">
            <span className="bg-red-100 text-red-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span> 
            Chính Sách Không Hoàn Hủy
          </h3>
          <p className="text-red-900 font-medium">
            Trừ khi có những quy định khác được thỏa thuận bằng văn bản, tất cả các khoản phí mua Quyền sử dụng Phần mềm tại Kpost là <strong>không hoàn lại (non-refundable)</strong> trong mọi trường hợp, bao gồm cả việc Khách hàng chủ động ngưng sử dụng dịch vụ trước khi hết thời hạn gói cước.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tighter flex items-center gap-2">
            <span className="bg-slate-200 text-slate-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">5</span> 
            Quy Định Sử Dụng Hợp Lệ (AUP)
          </h3>
          <p className="mb-3">Để duy trì môi trường phần mềm sạch và tuân thủ pháp luật, Khách hàng cam kết KHÔNG sử dụng Phần mềm Kpost để:</p>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4 shadow-sm">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <XCircle className="text-red-500 shrink-0 mt-0.5" size={18}/> 
                <span className="text-slate-700">Phát tán tin nhắn rác (Spam), thực hiện hành vi lừa đảo, truyền bá nội dung đồi trụy hoặc các hành vi vi phạm pháp luật hiện hành.</span>
              </li>
              <li className="flex items-start gap-3">
                <XCircle className="text-red-500 shrink-0 mt-0.5" size={18}/> 
                <span className="text-slate-700">Vi phạm tiêu chuẩn cộng đồng hoặc chính sách của các Nền tảng bên thứ ba (Meta, TikTok, Shopee, Google...).</span>
              </li>
              <li className="flex items-start gap-3">
                <XCircle className="text-red-500 shrink-0 mt-0.5" size={18}/> 
                <span className="text-slate-700">Xâm nhập trái phép, cố ý phá hoại, hoặc sao chép/dịch ngược mã nguồn Phần mềm Kpost.</span>
              </li>
            </ul>
          </div>
          <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-xs flex gap-3 items-center">
             <AlertCircle size={24} className="text-orange-500 shrink-0" />
             <p><strong>Xử lý vi phạm:</strong> Kpost bảo lưu quyền đơn phương khóa tài khoản vĩnh viễn, không cần báo trước và không hoàn tiền đối với bất kỳ trường hợp nào bị phát hiện vi phạm các quy định trên.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="border-t border-slate-200 pt-4">
              <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-tighter flex gap-2"><span className="text-blue-500">6.</span> Cập Nhật Tính Năng</h4>
              <p className="text-xs text-slate-600 leading-relaxed">Kpost là một sản phẩm không ngừng tiến hóa ("Evolving Software"). Chúng tôi có quyền chủ động cập nhật, chỉnh sửa, loại bỏ tính năng để tối ưu hóa hiệu suất. Thay đổi này không làm mất đi bản chất cốt lõi của Quyền sử dụng.</p>
           </div>
           <div className="border-t border-slate-200 pt-4">
              <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-tighter flex gap-2"><span className="text-blue-500">7.</span> Quyền Sở Hữu Trí Tuệ</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-2"><strong>Kpost:</strong> Giữ toàn quyền sở hữu trí tuệ đối với Phần mềm, mã nguồn và thương hiệu. Khách hàng chỉ được cấp quyền sử dụng.</p>
              <p className="text-xs text-slate-600 leading-relaxed"><strong>Khách hàng:</strong> Toàn bộ dữ liệu do Khách hàng tải lên hệ thống thuộc quyền sở hữu hợp pháp của Khách hàng.</p>
           </div>
           <div className="border-t border-slate-200 pt-4">
              <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-tighter flex gap-2"><span className="text-blue-500">8.</span> Lưu Trữ & Xóa Dữ Lưu</h4>
              <p className="text-xs text-slate-600 leading-relaxed">Sau 30 ngày kể từ khi hết hạn gói cước mà không gia hạn, Kpost có quyền xóa vĩnh viễn dữ liệu để giải phóng máy chủ. Kpost không chịu trách nhiệm bồi thường cho mất mát dữ liệu do chậm trễ gia hạn.</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-wider text-xs">9. Miễn Trừ Trách Nhiệm</h4>
              <p className="text-xs text-slate-600 leading-relaxed">Phần mềm cung cấp trên cơ sở "Nguyên trạng" (As-is). Chúng tôi miễn trừ trách nhiệm với các lỗi, sự cố hoặc khóa tài khoản (checkpoint) xuất phát từ Nền tảng bên thứ ba hoặc do thay đổi chính sách của họ.</p>
           </div>
           <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-wider text-xs">10. Giới Hạn Trách Nhiệm</h4>
              <p className="text-xs text-slate-600 leading-relaxed">Tổng trách nhiệm bồi thường của Kpost đối với Khách hàng không vượt quá tổng giá trị Gói cước mà Khách hàng đã thực thanh toán trong vòng 03 (ba) tháng gần nhất tính đến thời điểm xảy ra sự kiện.</p>
           </div>
           <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-wider text-xs">11. Sự Kiện Bất Khả Kháng</h4>
              <p className="text-xs text-slate-600 leading-relaxed">Miễn trừ trách nhiệm bồi thường trong điều kiện: thiên tai, dịch bệnh, chiến tranh, đứt cáp quang quốc tế, hoặc các quyết định đình chỉ từ cơ quan Nhà nước có thẩm quyền.</p>
           </div>
           <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-wider text-xs">12. Luật & Tranh Chấp</h4>
              <p className="text-xs text-slate-600 leading-relaxed">Điều chỉnh theo pháp luật Việt Nam. Tranh chấp ưu tiên hòa giải thiện chí, nếu không thành sẽ được phân xử tại Tòa án có thẩm quyền tại Hà Nội.</p>
           </div>
        </div>

        <div className="mt-12 bg-white border-2 border-slate-900 text-slate-900 p-8 md:p-12 rounded-[32px] text-center shadow-xl">
           <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Bạn Đã Sẵn Sàng?</h3>
           <p className="mb-8 font-medium text-slate-600 max-w-lg mx-auto text-sm leading-relaxed">
             Nếu bạn đã đọc kỹ và đồng ý với các điều khoản trên, hãy bắt đầu tối ưu hóa quy trình kinh doanh của mình ngay hôm nay.
           </p>
           <a href="mailto:support@kpost.vn" className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black px-8 py-4 rounded-2xl uppercase tracking-widest text-sm transition-colors mb-6">
             <MessageCircle size={18} />
             Hỗ trợ Pháp lý & Dịch vụ
           </a>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
             support@kpost.vn
           </p>
           <div className="mt-8 border-t border-slate-100 pt-6">
              <p className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">
                Khởi đầu hành trình chuyển đổi số an toàn, minh bạch và hiệu quả cùng Kpost!
              </p>
           </div>
        </div>

      </div>
    </div>
  );
}

function PrivacyTab() {
  return (
    <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-sm border border-slate-100 max-h-[85vh] overflow-y-auto custom-scrollbar animate-in fade-in">
      <div className="mb-8 border-b border-slate-100 pb-6 flex items-center gap-4">
        <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl">
          <Shield size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">
            Chính Sách Bảo Mật Của Kpost
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-2">Cập nhật lần cuối: Tháng 9, 2026</p>
        </div>
      </div>

      <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
        <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100">
          <h3 className="text-lg font-black text-slate-900 mb-3 uppercase tracking-tighter flex items-center gap-2">
            <CheckCircle2 className="text-green-500" size={20}/> Cam kết giá trị
          </h3>
          <p className="mb-4">
            Tại <strong>Kpost</strong>, chúng tôi đặt sự an toàn và quyền riêng tư của khách hàng lên hàng đầu. 
            Mọi dữ liệu bạn cung cấp đều được mã hóa, lưu trữ an toàn và xử lý một cách minh bạch nhằm mang lại trải nghiệm phần mềm tối ưu và đáng tin cậy nhất.
          </p>
          <p>
            Chính sách này mô tả chi tiết cách chúng tôi thu thập, sử dụng, tiết lộ và bảo vệ thông tin khi bạn sử dụng dịch vụ thông qua Kpost, bao gồm các tích hợp với <strong>Facebook, Instagram, TikTok, Telegram, WhatsApp, Shopee, Zalo, Line và Youtube</strong>. Bằng việc sử dụng dịch vụ, bạn đồng ý với các thực hành được mô tả dưới đây.
          </p>
        </div>

        <div className="relative w-full h-48 md:h-64 bg-slate-100 rounded-[24px] overflow-hidden flex items-center justify-center border border-slate-200">
           <div className="absolute inset-0 bg-blue-900/5 mix-blend-multiply"></div>
           <div className="text-center z-10">
             <Shield className="mx-auto mb-3 text-blue-400" size={56} />
             <p className="text-slate-600 font-bold text-xs uppercase tracking-widest px-4">Hệ thống bảo mật dữ liệu an toàn tiêu chuẩn quốc tế của Kpost</p>
           </div>
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tighter flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span> 
            Thông tin Chúng tôi Thu thập
          </h3>
          <p className="mb-3">Chúng tôi thu thập nhiều loại thông tin để cung cấp, duy trì và cải thiện dịch vụ, bao gồm:</p>
          <ul className="space-y-3 ml-2 md:ml-4">
            <li className="flex items-start gap-2">
              <Check className="text-blue-500 shrink-0 mt-1" size={16}/> 
              <span><strong>Thông tin Nhận dạng Cá nhân (PII):</strong> Các thông tin như tên, địa chỉ email, số điện thoại và các chi tiết có thể nhận dạng bạn. <em className="text-blue-700 bg-blue-50 px-1 rounded">Kpost KHÔNG thu thập hoặc lưu trữ thông tin nhạy cảm: tình trạng sức khỏe, tài chính, sinh trắc học, thông tin tài khoản ngân hàng, dữ liệu tội phạm, đặc điểm sinh học.</em></span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="text-blue-500 shrink-0 mt-1" size={16}/> 
              <span><strong>Thông tin Không Cá nhân:</strong> Dữ liệu không trực tiếp nhận dạng bạn (thống kê sử dụng, loại trình duyệt, thông tin thiết bị).</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="text-blue-500 shrink-0 mt-1" size={16}/> 
              <span><strong>Dữ liệu Theo Nền tảng:</strong> Thông tin thu thập qua tích hợp bên thứ ba (Facebook, Instagram, TikTok, Telegram, WhatsApp, Shopee, Zalo, Line, Youtube) bao gồm tương tác người dùng, vị trí, số liệu tương tác và dữ liệu cuộc trò chuyện.</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tighter flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span> 
            Cách Chúng tôi Sử dụng Thông tin
          </h3>
          <p className="mb-3">Dữ liệu chúng tôi thu thập được sử dụng để:</p>
          <ul className="list-disc ml-6 space-y-2 mb-6 text-slate-700 font-medium">
            <li>Cung cấp và duy trì dịch vụ.</li>
            <li>Cải thiện trải nghiệm người dùng và chức năng nền tảng.</li>
            <li>Giao tiếp với người dùng và phản hồi các câu hỏi.</li>
            <li>Đảm bảo tuân thủ các nghĩa vụ pháp lý và tiêu chuẩn bảo mật.</li>
          </ul>
          
          <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
             <h4 className="font-bold text-blue-900 mb-3 uppercase tracking-wider text-xs">Phương Pháp Xác thực Tài khoản</h4>
             <ul className="space-y-3 text-sm text-blue-900 font-medium">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  Kpost áp dụng các phương pháp xác thực: <strong>Xác minh email, SMS OTP (One-Time Password), Số điện thoại.</strong>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  Kpost KHÔNG yêu cầu hoặc lưu trữ: <strong>Ảnh/video giấy tờ tùy thân (CCCD, Passport), dữ liệu sinh trắc học.</strong>
                </li>
             </ul>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tighter flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span> 
            Chia sẻ và Tiết lộ Dữ liệu
          </h3>
          <p className="mb-3 font-bold text-slate-900">Chúng tôi tuyệt đối không bán thông tin cá nhân của bạn. Dữ liệu chỉ được chia sẻ trong các trường hợp:</p>
          <ul className="space-y-3 ml-2 md:ml-4">
            <li className="flex items-start gap-2">
              <Check className="text-blue-500 shrink-0 mt-1" size={16}/> 
              <span><strong>Nhà cung cấp Dịch vụ:</strong> Chia sẻ khi cần thiết để duy trì chất lượng dịch vụ. Các đối tác phải cam kết đảm bảo quy định về tiêu chuẩn an toàn và luật an toàn thông tin của Việt Nam.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="text-blue-500 shrink-0 mt-1" size={16}/> 
              <span><strong>Cơ quan Pháp lý:</strong> Khi có yêu cầu hợp pháp để tuân thủ quy định hoặc lệnh của tòa án.</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tighter flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span> 
            Bảo mật và Lưu trữ Dữ liệu Khách hàng
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm hover:border-blue-200 transition-colors">
                <h4 className="font-bold text-slate-900 mb-2">a. Cam kết bảo mật</h4>
                <p className="text-xs text-slate-600 leading-relaxed">Kpost cam kết bảo vệ dữ liệu trong suốt quá trình cung cấp và vận hành phần mềm. Toàn bộ dữ liệu được lưu trữ trên hệ thống máy chủ đạt chuẩn bảo mật, áp dụng cơ chế mã hóa phù hợp và kiểm soát truy cập nghiêm ngặt. Việc xử lý chỉ diễn ra trong phạm vi cần thiết.</p>
             </div>
             <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm hover:border-blue-200 transition-colors">
                <h4 className="font-bold text-slate-900 mb-2">b. Quyền chủ động xóa dữ liệu</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-2">Hệ thống cung cấp "Tùy chọn lưu trữ", cho phép Khách hàng thiết lập cơ chế xóa dữ liệu tự động.</p>
                <div className="bg-red-50 text-red-700 p-2 rounded-lg text-[10px] font-bold flex gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>Lưu ý: Dữ liệu đã xóa tự động theo thiết lập sẽ không thể khôi phục. Cần chủ động sao lưu trước khi xóa.</span>
                </div>
             </div>
             <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm hover:border-blue-200 transition-colors">
                <h4 className="font-bold text-slate-900 mb-2">c. Dữ liệu sau khi kết thúc gói cước</h4>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li>• <strong>Thời gian chờ gia hạn:</strong> Lưu trữ thêm 2 năm kể từ ngày kết thúc gói cước.</li>
                  <li>• <strong>Xóa tự động:</strong> Sau 2 năm nếu không gia hạn, hệ thống tự động xóa toàn bộ dữ liệu.</li>
                  <li>• <strong>Trường hợp ưu tiên:</strong> Áp dụng mốc thời gian ngắn hơn nếu KH đã thiết lập ở mục 4.b.</li>
                </ul>
             </div>
             <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm hover:border-blue-200 transition-colors">
                <h4 className="font-bold text-slate-900 mb-2">d. Trách nhiệm của Khách hàng</h4>
                <p className="text-xs text-slate-600 leading-relaxed">Khách hàng có trách nhiệm quản lý cấu hình lưu trữ trong "Cài đặt tài khoản" và tự chịu rủi ro về mất dữ liệu do không gia hạn hoặc do thiết lập xóa tự động.</p>
             </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tighter flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">5</span> 
            Thu thập và Xử lý Dữ liệu Theo Nền tảng
          </h3>
          <p className="mb-4">Kpost tuân thủ chính sách bảo mật của từng nền tảng và các quy định quốc tế liên quan. Dữ liệu từ các nền tảng được xử lý an toàn và lưu trữ trên máy chủ riêng của Kpost.</p>
          
          <div className="overflow-hidden border border-slate-200 rounded-2xl mb-6">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-4 border-b border-slate-200 w-1/4">Nền tảng</th>
                  <th className="px-4 py-4 border-b border-slate-200">Cách thức hoạt động và Xử lý dữ liệu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 font-bold text-slate-900 whitespace-nowrap">TikTok</td>
                  <td className="px-4 py-4 text-slate-600">Truy cập dữ liệu (bình luận, lượt thích, chia sẻ) qua API và Webhooks thời gian thực. Lưu trữ mã hóa trên máy chủ Kpost.</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 font-bold text-slate-900 whitespace-nowrap">Facebook & Instagram</td>
                  <td className="px-4 py-4 text-slate-600">Yêu cầu quyền quản lý trang, đọc/trả lời tin nhắn, quảng cáo (tùy chọn). Thu thập dữ liệu qua API & Webhooks để chăm sóc khách hàng.</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 font-bold text-slate-900 whitespace-nowrap">WhatsApp & Telegram</td>
                  <td className="px-4 py-4 text-slate-600">Thu thập tin nhắn, nhật ký tương tác qua API để quản lý tự động. Dữ liệu được mã hóa bảo mật.</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 font-bold text-slate-900 whitespace-nowrap">Shopee</td>
                  <td className="px-4 py-4 text-slate-600">Truy cập dữ liệu đơn hàng, câu hỏi, giao dịch qua API nhằm quản lý đơn và phân tích hiệu suất.</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 font-bold text-slate-900 whitespace-nowrap">Zalo & Line</td>
                  <td className="px-4 py-4 text-slate-600">Thu thập dữ liệu tin nhắn/nhật ký qua API để quản lý giao tiếp. Lưu trữ an toàn trên máy chủ Kpost.</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 font-bold text-slate-900 whitespace-nowrap">Google & Youtube</td>
                  <td className="px-4 py-4 text-slate-600">
                    Tuân thủ nghiêm ngặt Chính sách Dữ liệu Người dùng Dịch vụ API của Google và Điều khoản của Youtube. Chúng tôi sử dụng API để cung cấp tính năng bình luận, phát trực tiếp và <strong>không chuyển giao/bán dữ liệu cho bên thứ ba</strong> ngoài mục đích đã yêu cầu. Bạn có thể thu hồi quyền truy cập qua Cài đặt Bảo mật của Google.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
             <h4 className="font-bold text-slate-900 mb-3 uppercase tracking-wider text-xs">Quyền của Bạn về Dữ liệu Nền tảng</h4>
             <ul className="text-sm space-y-2 text-slate-700 font-medium">
               <li className="flex gap-2 items-start"><CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" /> <strong>Truy cập & Sửa đổi:</strong> Yêu cầu truy cập hoặc sửa các sai sót.</li>
               <li className="flex gap-2 items-start"><CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" /> <strong>Xóa:</strong> Yêu cầu xóa dữ liệu theo luật bảo vệ hiện hành (VD: GDPR).</li>
             </ul>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tighter flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">6</span> 
            Chuyển Dữ liệu Quốc tế và Quyền Bảo vệ
          </h3>
          <p className="mb-4">Kpost có thể chuyển dữ liệu ra ngoài quốc gia của bạn (bao gồm ngoài Khu vực Kinh tế Châu Âu - EEA), đi kèm các biện pháp bảo vệ thích hợp như điều khoản hợp đồng tiêu chuẩn.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                <h4 className="font-bold text-slate-900 mb-3">Quyền của Người dùng (Theo GDPR/CCPA)</h4>
                <ul className="text-xs text-slate-600 space-y-2 mb-4">
                  <li>• <strong>Quyền Truy cập & Sửa đổi:</strong> Yêu cầu bản sao hoặc sửa dữ liệu.</li>
                  <li>• <strong>Quyền Xóa & Di chuyển:</strong> Yêu cầu xóa hoặc nhận bản sao định dạng máy đọc được.</li>
                  <li>• <strong>Quyền Phản đối:</strong> Giới hạn hoặc dừng xử lý dữ liệu.</li>
                </ul>
                <div className="bg-slate-50 text-slate-600 text-xs font-medium p-3 rounded-xl border border-slate-200 text-center">
                  Liên hệ <strong className="text-blue-600">support@kpost.vn</strong> để thực hiện các quyền này.
                </div>
             </div>
             <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                <h4 className="font-bold text-slate-900 mb-3">Quyền của Kpost</h4>
                <p className="text-xs text-slate-600 leading-relaxed">Kpost bảo lưu quyền sử dụng hình ảnh, thương hiệu (Logo) và thông tin của khách hàng/đối tác cho mục đích: Quảng bá thương hiệu, Nghiên cứu phân tích dịch vụ Kpost, và Trưng bày tài liệu/câu chuyện thành công.</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
           <div className="border-t border-slate-100 pt-4">
              <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-tighter flex gap-2"><span className="text-blue-500">8.</span> Cookie và Công nghệ Theo dõi</h4>
              <p className="text-xs text-slate-600 leading-relaxed">Kpost sử dụng cookie ẩn danh gửi đến trình duyệt nhằm cải thiện trải nghiệm người dùng. Bạn hoàn toàn có thể kiểm soát việc sử dụng cookie thông qua cài đặt trình duyệt cá nhân.</p>
           </div>
           <div className="border-t border-slate-100 pt-4">
              <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-tighter flex gap-2"><span className="text-blue-500">9.</span> Liên kết Bên Thứ Ba</h4>
              <p className="text-xs text-slate-600 leading-relaxed">Dịch vụ có thể chứa liên kết đến các trang web bên ngoài không do Kpost vận hành. Chúng tôi không chịu trách nhiệm về nội dung và chính sách bảo mật của các trang web này.</p>
           </div>
           <div className="border-t border-slate-100 pt-4">
              <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-tighter flex gap-2"><span className="text-blue-500">10.</span> Quyền Riêng tư của Trẻ em</h4>
              <p className="text-xs text-slate-600 leading-relaxed">Kpost không cung cấp dịch vụ và không cố ý thu thập thông tin của trẻ em dưới 13 tuổi. Nếu phát hiện trường hợp này, dữ liệu sẽ ngay lập tức được xóa khỏi máy chủ.</p>
           </div>
           <div className="border-t border-slate-100 pt-4">
              <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-tighter flex gap-2"><span className="text-blue-500">11.</span> Thay đổi Chính sách</h4>
              <p className="text-xs text-slate-600 leading-relaxed">Kpost có quyền cập nhật chính sách này để phù hợp với công nghệ và luật pháp. Mọi thay đổi sẽ được thông báo qua email hoặc trực tiếp trên phần mềm ít nhất 30 ngày trước khi áp dụng.</p>
           </div>
        </div>

        <div className="mt-12 bg-slate-900 text-white p-8 md:p-12 rounded-[32px] text-center shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
           <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
           
           <div className="relative z-10">
             <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Cần Hỗ Trợ Khác?</h3>
             <p className="mb-8 font-medium text-slate-300 max-w-lg mx-auto text-sm leading-relaxed">
               Nếu bạn có bất kỳ thắc mắc nào về Chính sách Bảo mật này hoặc cách chúng tôi bảo vệ thông tin của bạn, đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng lắng nghe và giải quyết.
             </p>
             <a href="mailto:support@kpost.vn" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-4 rounded-2xl uppercase tracking-widest text-sm transition-colors mb-8 shadow-lg shadow-blue-900/50">
               <MessageCircle size={18} />
               support@kpost.vn
             </a>
             <div className="border-t border-slate-800 pt-6">
                <p className="text-xs font-bold text-blue-300 uppercase tracking-widest">
                  Hãy yên tâm phát triển kinh doanh, việc bảo vệ dữ liệu đã có Kpost đồng hành cùng bạn!
                </p>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}