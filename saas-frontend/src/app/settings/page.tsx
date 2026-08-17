"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client"; // Thêm thư viện Socket
import { 
  User, Lock, Shield, CreditCard, Gift, 
  BookOpen, Scale, Bell, Globe, ChevronRight,
  LogOut, Star, CheckCircle2, Mail, Fingerprint,
  QrCode, Zap, Info, ShieldAlert, X, Copy, Smartphone,
  PartyPopper, Rocket, Loader2, Square
} from "lucide-react";

// Kết nối Socket đến Backend cổng 3001
const socket = io("http://localhost:3001");

const tabs = [
  { id: "account", label: "Tài khoản & Login", icon: <User size={18} /> },
  { id: "security", label: "Mật khẩu & Bảo mật", icon: <Lock size={18} /> },
  { id: "billing", label: "Gói cước & Nạp tiền", icon: <CreditCard size={18} /> },
  { id: "voucher", label: "Mã giảm giá", icon: <Gift size={18} /> },
  { id: "guide", label: "Hướng dẫn khách mới", icon: <BookOpen size={18} /> },
  { id: "terms", label: "Tuyên bố trách nhiệm", icon: <Scale size={18} /> },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("account");
  const [showQR, setShowQR] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paymentInfo, setPaymentInfo] = useState({ qr: "", memo: "", amount: 0, plan: "" });

  const workspaceId = "workspace-01";

  // ==========================================
  // LOGIC REAL-TIME: NHẬN TÍN HIỆU TIỀN VỀ NGAY LẬP TỨC
  // ==========================================
  useEffect(() => {
    // 1. Lắng nghe sự kiện thanh toán thành công từ Backend
    socket.on("paymentSuccess", (data) => {
      console.log("🔔 Nhận tín hiệu Socket:", data);
      
      // Nếu mã Bill khớp với mã đang hiện trên màn hình
      if (data.billCode === paymentInfo.memo) {
        setPaymentStatus("success");
        
        // Phát âm thanh Ting Ting (Tùy chọn: bạn cần có file mp3 trong public/sounds)
        try {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3");
            audio.play();
        } catch (e) { console.log("Audio play blocked"); }
      }
    });

    // 2. Fallback: Vẫn giữ Polling 5s một lần để phòng hờ Socket bị lag (Chuẩn thương mại)
    let interval: any;
    if (showQR && paymentStatus === "pending") {
        interval = setInterval(async () => {
            const res = await axios.get(`http://localhost:3001/social/check-transaction/${paymentInfo.memo}`);
            if (res.data && res.data.status === "success") {
                setPaymentStatus("success");
                clearInterval(interval);
            }
        }, 5000);
    }

    return () => {
      socket.off("paymentSuccess");
      if (interval) clearInterval(interval);
    };
  }, [paymentInfo.memo, showQR, paymentStatus]);

  const handleUpgrade = async (plan: any) => {
    const priceMap: any = { "PRO": 599000, "GOLD": 999000, "DIAMOND": 3999000 };
    const amount = priceMap[plan.name];

    try {
      const res = await axios.post("http://localhost:3001/social/create-transaction", {
        workspaceId, planName: plan.name, amount: amount
      });
      const { description } = res.data; 
      
      const bankId = "MB"; 
      const accountNo = "0966527931"; 
      const accountName = "BUI%20VAN%20KY";
      const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact.png?amount=${amount}&addInfo=${description}&accountName=${accountName}`;

      setPaymentInfo({ qr: qrUrl, memo: description, amount: amount, plan: plan.name });
      setPaymentStatus("pending");
      setShowQR(true);
    } catch (e) {
      alert("Lỗi kết nối hệ thống thanh toán!");
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800 font-sans relative">
      
      {/* MODAL THANH TOÁN THÔNG MINH */}
      {showQR && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-[50px] p-10 max-w-md w-full text-center shadow-2xl relative text-black border border-white/20">
                
                {paymentStatus === "pending" ? (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <button onClick={() => setShowQR(false)} className="absolute top-8 right-8 text-slate-300 hover:text-red-500 transition-colors">
                            <X size={32} />
                        </button>
                        
                        <div className="mb-6">
                            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-200">
                                <Smartphone size={32} />
                            </div>
                            <h3 className="text-2xl font-black italic uppercase tracking-tighter">Quét mã nâng cấp</h3>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Gói {paymentInfo.plan} • {paymentInfo.amount.toLocaleString()}đ</p>
                        </div>

                        <div className="bg-white p-6 rounded-[40px] mb-8 border-2 border-slate-100 shadow-sm relative group">
                            <img src={paymentInfo.qr} className="w-full rounded-3xl" alt="VietQR" />
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[40px] flex items-center justify-center">
                                <p className="bg-white px-4 py-2 rounded-full text-[10px] font-black shadow-xl">QUÉT QUA APP NGÂN HÀNG</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-blue-600 p-5 rounded-3xl text-white relative group cursor-pointer active:scale-95 transition-all shadow-xl shadow-blue-100" onClick={() => {navigator.clipboard.writeText(paymentInfo.memo); alert("Đã copy nội dung!");}}>
                                <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-1">Nội dung chuyển khoản</p>
                                <p className="text-2xl font-black italic tracking-widest flex items-center justify-center gap-3">
                                    {paymentInfo.memo} <Copy size={18} className="group-hover:rotate-12 transition-transform" />
                                </p>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-[11px] text-blue-600 font-black uppercase tracking-widest animate-pulse mt-4">
                                <Loader2 size={14} className="animate-spin" />
                                Hệ thống đang kiểm tra tiền về...
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-6 animate-in zoom-in-50 duration-500 text-black">
                        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-green-200 animate-bounce">
                            <PartyPopper size={48} />
                        </div>
                        <h3 className="text-4xl font-black text-slate-900 italic uppercase mb-2 tracking-tighter">THÀNH CÔNG!</h3>
                        <p className="text-sm text-slate-500 font-bold mb-10 px-4 leading-relaxed">
                            Cảm ơn bạn! Gói <span className="text-blue-600 font-black">{paymentInfo.plan}</span> đã được kích hoạt hoàn toàn tự động.
                        </p>
                        
                        <button 
                            onClick={() => window.location.reload()} 
                            className="w-full py-5 bg-blue-600 text-white rounded-[28px] font-black uppercase italic text-lg flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-2xl shadow-blue-100 active:scale-95"
                        >
                            <Rocket size={24} /> Bắt đầu ngay 🚀
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* GIAO DIỆN CHÍNH */}
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-10">
        <div className="w-full lg:w-72 space-y-2">
           <div className="mb-10 px-4">
              <h1 className="text-3xl font-black text-slate-900 italic tracking-tighter">SETTINGS</h1>
              <p className="text-xs font-bold text-slate-400 uppercase mt-1 tracking-widest">SaaS AI Control Center</p>
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

        <div className="flex-1 bg-white rounded-[50px] shadow-2xl shadow-slate-200/50 border border-white p-12 min-h-[700px]">
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

// ==========================================
// CÁC COMPONENT TAB (GIỮ NGUYÊN HOẶC ĐÃ FIX)
// ==========================================

function BillingTab({ onUpgrade }: any) {
    const plans = [
        { name: "PRO", price: "599.000", color: "blue", features: ["Không giới hạn bài viết AI", "Hỗ trợ 50 Fanpage", "AI chốt đơn & rải link"] },
        { name: "GOLD", price: "999.000", color: "amber", features: ["Không giới hạn bài viết AI", "Hỗ trợ 100 Fanpage", "Ưu tiên xử lý ảnh 4K"] },
        { name: "DIAMOND", price: "3.999.000", color: "purple", features: ["Không giới hạn bài viết AI", "Hỗ trợ 500 Fanpage", "Hỗ trợ kỹ thuật 24/7"] },
    ];
    return (
        <div className="space-y-10 animate-in fade-in">
            <h2 className="text-2xl font-black italic uppercase text-slate-900 tracking-tighter">Gói dịch vụ & Nâng cấp</h2>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {plans.map((p) => (
                    <div key={p.name} className={`p-8 rounded-[45px] border-4 bg-white hover:shadow-2xl transition-all ${p.color === 'blue' ? 'border-blue-600' : p.color === 'amber' ? 'border-amber-500' : 'border-purple-600'}`}>
                        <p className={`font-black uppercase tracking-widest text-[10px] mb-4 ${p.color === 'blue' ? 'text-blue-600' : p.color === 'amber' ? 'text-amber-500' : 'text-purple-600'}`}>Gói {p.name}</p>
                        <p className="text-3xl font-black italic text-slate-900">{p.price}đ</p>
                        <ul className="my-8 space-y-3">
                            {p.features.map(f => <li key={f} className="text-[11px] font-bold text-slate-500 flex items-start gap-2 leading-tight"><CheckCircle2 size={14} className="text-green-500 shrink-0"/> {f}</li>)}
                        </ul>
                        <button onClick={() => onUpgrade(p)} className={`w-full py-4 rounded-3xl font-black text-white uppercase italic shadow-lg active:scale-95 transition-all ${p.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : p.color === 'amber' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-purple-600 hover:bg-purple-700'}`}>
                            Nâng cấp ✨
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

function AccountTab() {
    return (
        <div className="space-y-10 animate-in fade-in">
            <h2 className="text-2xl font-black text-slate-900 italic uppercase">Thông tin định danh</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Họ và tên</label>
                    <input className="w-full p-5 bg-slate-50 rounded-[20px] outline-none font-bold border border-transparent focus:border-blue-200 transition-all text-black" defaultValue="Bùi Văn Kỳ" />
                </div>
                <div className="space-y-3 text-black">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Email liên hệ</label>
                    <input className="w-full p-5 bg-slate-50 rounded-[20px] outline-none font-bold text-slate-400" defaultValue="admin@saas-ai.vn" readOnly />
                </div>
            </div>
            <div className="pt-10 border-t border-slate-100">
                <h3 className="font-black text-lg mb-6 flex items-center gap-2 italic text-slate-900"><Globe size={20} className="text-blue-600" /> Kết nối đăng nhập nhanh</h3>
                <button className="flex items-center justify-between p-6 bg-white border-2 border-slate-100 rounded-[30px] hover:border-blue-500 transition-all group w-full md:w-2/3">
                    <div className="flex items-center gap-4 font-black text-sm text-black">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/list/google.svg" className="w-6 h-6" /> 
                        Tiếp tục với Google
                    </div>
                    <span className="text-[10px] font-black text-green-500 uppercase bg-green-50 px-4 py-1 rounded-full">Đã bảo mật</span>
                </button>
            </div>
        </div>
    )
}

function SecurityTab() { return <div className="p-10 text-center"><Lock size={48} className="mx-auto text-slate-200 mb-4" /><p className="font-black text-slate-400 uppercase italic">Bảo mật tài khoản đang được AI mã hóa...</p></div> }
function VoucherTab() { return <div className="p-10 text-center"><Gift size={48} className="mx-auto text-slate-200 mb-4" /><p className="font-black text-slate-400 uppercase italic">Bạn chưa có mã giảm giá nào khả dụng.</p></div> }
function GuideTab() { return <div className="p-10 text-center"><BookOpen size={48} className="mx-auto text-slate-200 mb-4" /><p className="font-black text-slate-400 uppercase italic">Đang tải tài liệu hướng dẫn vận hành...</p></div> }
function TermsTab() { return <div className="bg-red-50 p-8 rounded-[40px] border border-red-100"><h2 className="text-xl font-black mb-4 uppercase italic text-red-600">Tuyên bố trách nhiệm</h2><p className="text-sm font-bold text-red-900/60 leading-relaxed italic">1. Người dùng chịu trách nhiệm về nội dung bài viết.<br/>2. Không hoàn tiền sau khi đã kích hoạt gói.<br/>3. Cam kết bảo mật dữ liệu khách hàng 100%.</p></div> }