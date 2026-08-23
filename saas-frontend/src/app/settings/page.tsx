"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client"; 
import { 
  User, Lock, Shield, CreditCard, Gift, 
  BookOpen, Scale, Bell, Globe, ChevronRight,
  X, Copy, Smartphone, PartyPopper, Rocket, Loader2, Sparkles, CheckCircle2,
  Mail, KeyRound, UserPlus, LogIn, LogOut
} from "lucide-react";

// --- 1. KẾT NỐI SOCKET ĐỘNG ---
const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001");

const tabs = [
  { id: "account", label: "Tài khoản & Login", icon: <User size={18} /> },
  { id: "security", label: "Mật khẩu & Bảo mật", icon: <Lock size={18} /> },
  { id: "billing", label: "Gói cước & Nạp tiền", icon: <CreditCard size={18} /> },
  { id: "voucher", label: "Mã giảm giá", icon: <Gift size={18} /> },
  { id: "guide", label: "Hướng dẫn khách mới", icon: <BookOpen size={18} /> },
  { id: "terms", label: "Tuyên bố trách nhiệm", icon: <Scale size={18} /> },
];

export default function SettingsPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const [activeTab, setActiveTab] = useState("account");
  const [showQR, setShowQR] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paymentInfo, setPaymentInfo] = useState({ qr: "", memo: "", amount: 0, plan: "" });
  const [workspaceId, setWorkspaceId] = useState<string>("");

  useEffect(() => {
    const savedId = localStorage.getItem("workspaceId");
    if (savedId) setWorkspaceId(savedId);

    socket.on("paymentSuccess", (data: any) => {
      if (data.billCode === paymentInfo.memo) {
        setPaymentStatus("success");
        try {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3");
            audio.play();
        } catch (e) { console.log("Audio play blocked"); }
      }
    });

    let interval: any;
    if (showQR && paymentStatus === "pending") {
        interval = setInterval(async () => {
            try {
                const res = await axios.get(`${API_URL}/social/check-transaction/${paymentInfo.memo}`);
                if (res.data && res.data.status === "success") {
                    setPaymentStatus("success");
                    clearInterval(interval);
                }
            } catch (e) { console.error(e); }
        }, 5000);
    }

    return () => {
      socket.off("paymentSuccess");
      if (interval) clearInterval(interval);
    };
  }, [paymentInfo.memo, showQR, paymentStatus, API_URL]);

  const handleUpgrade = async (plan: any) => {
    if (!workspaceId) return alert("Vui lòng đăng nhập trước khi nâng cấp!");
    const priceMap: any = { "PRO": 599000, "GOLD": 999000, "DIAMOND": 3999000 };
    const amount = priceMap[plan.name];
    try {
      const res = await axios.post(`${API_URL}/social/create-transaction`, {
        workspaceId, planName: plan.name, amount: amount
      });
      const { description } = res.data; 
      const qrUrl = `https://img.vietqr.io/image/MB-0966527931-compact.png?amount=${amount}&addInfo=${description}&accountName=BUI%20VAN%20KY`;
      setPaymentInfo({ qr: qrUrl, memo: description, amount: amount, plan: plan.name });
      setPaymentStatus("pending");
      setShowQR(true);
    } catch (e) { alert("Lỗi hệ thống thanh toán!"); }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800 font-sans relative">
      {/* MODAL THANH TOÁN (Giữ nguyên) */}
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
                            <div className="bg-blue-600 p-5 rounded-3xl text-white cursor-pointer active:scale-95 transition-all shadow-xl" onClick={() => {navigator.clipboard.writeText(paymentInfo.memo); alert("Đã copy!");}}>
                                <p className="text-[10px] font-black uppercase opacity-60 mb-1">Nội dung chuyển khoản</p>
                                <p className="text-2xl font-black italic tracking-widest flex items-center justify-center gap-3">{paymentInfo.memo} <Copy size={18} /></p>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-[11px] text-blue-600 font-black uppercase animate-pulse mt-4"><Loader2 size={14} className="animate-spin" /> Đang kiểm tra tiền về...</div>
                        </div>
                    </div>
                ) : (
                    <div className="py-6 animate-in zoom-in-50 duration-500 text-black">
                        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-2xl animate-bounce"><PartyPopper size={48} /></div>
                        <h3 className="text-4xl font-black italic uppercase mb-2">THÀNH CÔNG!</h3>
                        <p className="text-sm text-slate-500 font-bold mb-10 px-4">Cảm ơn bạn! Gói {paymentInfo.plan} đã được kích hoạt thành công.</p>
                        <button onClick={() => window.location.reload()} className="w-full py-5 bg-blue-600 text-white rounded-[28px] font-black uppercase italic text-lg shadow-2xl active:scale-95">Bắt đầu ngay 🚀</button>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* GIAO DIỆN CHÍNH */}
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-10">
        <div className="w-full lg:w-72 space-y-2">
           <div className="mb-10 px-4 text-black">
              <h1 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">Settings</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest opacity-60">Control Center</p>
           </div>
           {tabs.map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`w-full flex items-center justify-between px-6 py-4 rounded-[24px] font-black transition-all ${
                 activeTab === tab.id ? "bg-blue-600 text-white shadow-xl scale-[1.05]" : "text-slate-400 hover:bg-white hover:text-slate-600"
               }`}
             >
               <div className="flex items-center gap-4">{tab.icon} <span className="text-sm uppercase tracking-tight">{tab.label}</span></div>
               {activeTab === tab.id && <ChevronRight size={16} />}
             </button>
           ))}
        </div>

        <div className="flex-1 bg-white rounded-[50px] shadow-2xl border border-white p-12 min-h-[700px] text-black">
            {activeTab === "account" && <AccountTab />}
            {activeTab === "billing" && <BillingTab onUpgrade={handleUpgrade} />}
            {activeTab === "security" && <SecurityTab />}
            {activeTab === "voucher" && <VoucherTab />}
            {activeTab === "guide" && <GuideTab />}
            {activeTab === "terms" && <TermsTab />}
        </div>
      </div>
    </div>
  );
}

// --- TAB TÀI KHOẢN: ĐÃ TÍCH HỢP FORM ĐĂNG NHẬP THỦ CÔNG ---
function AccountTab() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [authMode, setAuthMode] = useState("login"); // login hoặc register
    const [formData, setFormData] = useState({ email: "", password: "", name: "" });

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) { setLoading(false); return; }
            const res = await axios.get(`${API_URL}/auth/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data);
        } catch (e) { console.log("Guest mode active"); } finally { setLoading(false); }
    };

    useEffect(() => { fetchProfile(); }, [API_URL]);

    const handleManualAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
            const res = await axios.post(`${API_URL}${endpoint}`, formData);
            
            if (authMode === "login") {
                localStorage.setItem("token", res.data.token);
                localStorage.setItem("workspaceId", res.data.wid);
                alert("Đăng nhập thành công! 🚀");
                window.location.href = "/dashboard";
            } else {
                alert("Đăng ký thành công! Mời bạn đăng nhập.");
                setAuthMode("login");
            }
        } catch (error: any) {
            alert(error.response?.data?.message || "Thất bại! Vui lòng kiểm tra lại.");
        } finally { setLoading(false); }
    };

    const handleGoogleLogin = () => {
        window.location.href = `${API_URL}/auth/google`;
    };

    if (loading) return <div className="p-10 text-center animate-pulse font-black text-slate-300 uppercase">ĐANG KẾT NỐI HỆ THỐNG...</div>;

    if (user) return (
        <div className="space-y-10 animate-in fade-in text-black">
            <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-blue-600 rounded-[30px] flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-blue-100">
                    {user.name?.[0]}
                </div>
                <div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter">{user.name}</h2>
                    <p className="text-slate-400 font-bold">{user.email}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gói dịch vụ hiện tại</p>
                    <p className="text-xl font-black text-blue-600 italic">{user.plan} MEMBER</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Không gian</p>
                    <p className="text-sm font-mono font-bold text-slate-600 truncate">{user.currentWorkspaceId}</p>
                </div>
            </div>
            <button onClick={() => {localStorage.clear(); window.location.reload();}} className="text-red-500 font-black text-[10px] uppercase tracking-[0.2em] hover:underline flex items-center gap-2">
                <LogOut size={14} /> Thoát tài khoản ngay
            </button>
        </div>
    );

    return (
        <div className="max-w-md mx-auto animate-in slide-in-from-bottom-10 duration-500 text-black">
            <h2 className="text-3xl font-black italic uppercase mb-10 text-center tracking-tighter">
                {authMode === 'login' ? 'Đăng Nhập' : 'Tạo Tài Khoản'}
            </h2>
            
            <form onSubmit={handleManualAuth} className="space-y-4">
                {authMode === 'register' && (
                    <div className="relative">
                        <User className="absolute left-4 top-4 text-slate-300" size={18} />
                        <input className="w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-2xl outline-none font-bold focus:bg-white focus:border-blue-500 transition-all text-black" placeholder="Họ và tên của bạn" onChange={e => setFormData({...formData, name: e.target.value})} required />
                    </div>
                )}
                <div className="relative">
                    <Mail className="absolute left-4 top-4 text-slate-300" size={18} />
                    <input className="w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-2xl outline-none font-bold focus:bg-white focus:border-blue-500 transition-all text-black" type="email" placeholder="Địa chỉ Email" onChange={e => setFormData({...formData, email: e.target.value})} required />
                </div>
                <div className="relative">
                    <KeyRound className="absolute left-4 top-4 text-slate-300" size={18} />
                    <input className="w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-2xl outline-none font-bold focus:bg-white focus:border-blue-500 transition-all text-black" type="password" placeholder="Mật khẩu bảo mật" onChange={e => setFormData({...formData, password: e.target.value})} required />
                </div>
                
                <button type="submit" className="w-full py-5 bg-black text-white font-black rounded-[25px] shadow-2xl flex justify-center items-center gap-3 active:scale-95 transition-all">
                    {authMode === 'login' ? <LogIn size={20}/> : <UserPlus size={20}/>}
                    {authMode === 'login' ? 'VÀO HỆ THỐNG NGAY' : 'XÁC NHẬN ĐĂNG KÝ'}
                </button>
            </form>

            <div className="mt-8 text-center">
                <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 underline underline-offset-4">
                    {authMode === 'login' ? 'Chưa có tài khoản? Đăng ký tại đây' : 'Đã có tài khoản? Quay lại đăng nhập'}
                </button>
            </div>

            <div className="my-10 flex items-center gap-4">
                <div className="h-[1px] bg-slate-100 flex-1"></div>
                <span className="text-[10px] font-black text-slate-300 tracking-widest uppercase">Hoặc dùng Google</span>
                <div className="h-[1px] bg-slate-100 flex-1"></div>
            </div>

            <button onClick={handleGoogleLogin} className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-4 font-black shadow-sm hover:bg-slate-50 transition-all active:scale-95 text-black">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/list/google.svg" className="w-6" alt="G" />
                Tiếp tục với tài khoản Google
            </button>
        </div>
    )
}

// CÁC TAB CÒN LẠI (GIỮ NGUYÊN)
function BillingTab({ onUpgrade }: any) {
    const plans = [
        { name: "PRO", price: "599.000", color: "blue", features: ["Không giới hạn bài viết AI", "Hỗ trợ 50 Fanpage", "AI chốt đơn & rải link"] },
        { name: "GOLD", price: "999.000", color: "amber", features: ["Không giới hạn bài viết AI", "Hỗ trợ 100 Fanpage", "Ưu tiên xử lý ảnh 4K"] },
        { name: "DIAMOND", price: "3.999.000", color: "purple", features: ["Không giới hạn bài viết AI", "Hỗ trợ 500 Fanpage", "Hỗ trợ kỹ thuật 24/7"] },
    ];
    return (
        <div className="space-y-10 animate-in fade-in text-black">
            <h2 className="text-2xl font-black italic uppercase">Gói dịch vụ & Nâng cấp</h2>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {plans.map((p) => (
                    <div key={p.name} className={`p-8 rounded-[45px] border-4 bg-white hover:shadow-2xl transition-all ${p.color === 'blue' ? 'border-blue-600' : p.color === 'amber' ? 'border-amber-500' : 'border-purple-600'}`}>
                        <p className={`font-black uppercase tracking-widest text-[10px] mb-4 ${p.color === 'blue' ? 'text-blue-600' : p.color === 'amber' ? 'text-amber-500' : 'text-purple-600'}`}>Gói {p.name}</p>
                        <p className="text-3xl font-black italic text-slate-900">{p.price}đ</p>
                        <ul className="my-8 space-y-3">
                            {p.features.map(f => <li key={f} className="text-[11px] font-bold text-slate-500 flex items-start gap-2 leading-tight"><CheckCircle2 size={14} className="text-green-500 shrink-0"/> {f}</li>)}
                        </ul>
                        <button onClick={() => onUpgrade(p)} className={`w-full py-4 rounded-3xl font-black text-white uppercase italic shadow-lg active:scale-95 transition-all ${p.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : p.color === 'amber' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-purple-600 hover:bg-purple-700'}`}>Nâng cấp ngay ✨</button>
                    </div>
                ))}
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
            await axios.post(`${API_URL}/auth/change-password`, passwords, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("✅ Đã đổi mật khẩu thành công!");
            setPasswords({ old: "", new: "", confirm: "" });
        } catch (e: any) {
            alert(e.response?.data?.message || "Lỗi khi đổi mật khẩu!");
        } finally { setLoading(false); }
    };

    return (
        <div className="space-y-10 animate-in fade-in text-black">
            <h2 className="text-2xl font-black text-slate-900 italic uppercase">Bảo mật tài khoản</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* FORM ĐỔI MẬT KHẨU */}
                <div className="space-y-6">
                    <h3 className="font-black text-sm text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <KeyRound size={16} /> Đổi mật khẩu mới
                    </h3>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <input type="password" placeholder="Mật khẩu hiện tại" className="w-full p-4 bg-slate-50 rounded-2xl border outline-none font-bold" value={passwords.old} onChange={e => setPasswords({...passwords, old: e.target.value})} required />
                        <input type="password" placeholder="Mật khẩu mới" className="w-full p-4 bg-slate-50 rounded-2xl border outline-none font-bold" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} required />
                        <input type="password" placeholder="Xác nhận mật khẩu mới" className="w-full p-4 bg-slate-50 rounded-2xl border outline-none font-bold" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} required />
                        <button className="w-full py-4 bg-black text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all">
                            {loading ? <Loader2 className="animate-spin mx-auto" /> : "CẬP NHẬT MẬT KHẨU"}
                        </button>
                    </form>
                </div>

                {/* CÁC TÙY CHỌN BẢO MẬT KHÁC */}
                <div className="space-y-6">
                    <h3 className="font-black text-sm text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck size={16} /> Cài đặt nâng cao
                    </h3>
                    
                    <div className="space-y-3">
                        {/* Xác thực 2 lớp */}
                        <div className="p-5 bg-slate-50 rounded-3xl border flex items-center justify-between group hover:bg-white hover:border-blue-200 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-blue-500"><Smartphone size={20} /></div>
                                <div>
                                    <p className="text-sm font-black">Xác thực 2 lớp (2FA)</p>
                                    <p className="text-[10px] text-slate-400 font-bold">Bảo vệ qua mã OTP điện thoại</p>
                                </div>
                            </div>
                            <button className="px-4 py-1.5 bg-slate-200 text-slate-500 rounded-full text-[9px] font-black uppercase">Sắp ra mắt</button>
                        </div>

                        {/* Nhật ký đăng nhập */}
                        <div className="p-5 bg-slate-50 rounded-3xl border flex items-center justify-between group hover:bg-white hover:border-blue-200 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-blue-500"><Fingerprint size={20} /></div>
                                <div>
                                    <p className="text-sm font-black">Thiết bị đã đăng nhập</p>
                                    <p className="text-[10px] text-slate-400 font-bold">Quản lý các phiên làm việc</p>
                                </div>
                            </div>
                            <button className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">Kiểm tra</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
function VoucherTab() { return <div className="p-10 text-center text-black"><Gift size={48} className="mx-auto text-slate-200 mb-4" /><p className="font-black text-slate-400 uppercase italic">Bạn chưa có mã giảm giá nào.</p></div> }
function GuideTab() { return <div className="p-10 text-center text-black"><BookOpen size={48} className="mx-auto text-slate-200 mb-4" /><p className="font-black text-slate-400 uppercase italic">Tài liệu đang được AI biên soạn...</p></div> }
function TermsTab() { return <div className="bg-red-50 p-8 rounded-[40px] border border-red-100 text-black font-sans"><h2 className="text-xl font-black mb-4 uppercase italic text-red-600">Điều khoản</h2><p className="text-sm font-bold text-red-900/60 leading-relaxed italic">1. Không hoàn tiền sau khi kích hoạt.<br/>2. Bảo mật dữ liệu 100%.</p></div> }