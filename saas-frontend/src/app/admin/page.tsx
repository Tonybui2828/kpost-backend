"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Users, Globe, Send, Trash2, 
  Settings, DollarSign, Activity, 
  ImageIcon, Bell, Save, RefreshCcw,
  Ticket, Plus, ChevronRight, Loader2, Tag
} from "lucide-react";

export default function AdminPage() {
  // --- STATE DỮ LIỆU ---
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState({ 
    websiteName: "", 
    logoUrl: "", 
    announcement: "" 
  });
  const [vouchers, setVouchers] = useState([]);
  const [users, setUsers] = useState([]);
  const [newVoucher, setNewVoucher] = useState({ code: "", discount: 0, type: "fixed" });
  const [loading, setLoading] = useState(true);

  // --- LẤY DỮ LIỆU TỔNG HỢP ---
  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, settingsRes, vouchersRes, usersRes] = await Promise.all([
        axios.get("http://localhost:3001/admin/stats"),
        axios.get("http://localhost:3001/admin/settings"),
        axios.get("http://localhost:3001/admin/vouchers"),
        axios.get("http://localhost:3001/admin/users-list"),
      ]);
      setStats(statsRes.data);
      setSettings(settingsRes.data);
      setVouchers(vouchersRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error("Lỗi tải dữ liệu admin:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdminData(); }, []);

  // --- XỬ LÝ VOUCHER (TẠO/XÓA) ---
  const handleCreateVoucher = async () => {
    if (!newVoucher.code || newVoucher.discount <= 0) {
        return alert("Vui lòng nhập đầy đủ mã và giá trị giảm lớn hơn 0!");
    }
    try {
      await axios.post("http://localhost:3001/admin/vouchers", newVoucher);
      setNewVoucher({ code: "", discount: 0, type: "fixed" });
      const res = await axios.get("http://localhost:3001/admin/vouchers");
      setVouchers(res.data);
      alert("✅ Đã tạo voucher mới thành công!");
    } catch (error) { alert("❌ Lỗi khi tạo voucher"); }
  };

  const handleDeleteVoucher = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa voucher này không?")) return;
    try {
        await axios.delete(`http://localhost:3001/admin/vouchers/${id}`);
        const res = await axios.get("http://localhost:3001/admin/vouchers");
        setVouchers(res.data);
    } catch (e) { alert("Lỗi khi xóa!"); }
  };

  // --- CẬP NHẬT CẤU HÌNH LOGO/WEBSITE ---
  const handleUpdateSettings = async () => {
    try {
      await axios.patch("http://localhost:3001/admin/settings", settings);
      alert("✅ Đã cập nhật cấu hình thành công!");
    } catch (error) { alert("❌ Lỗi khi lưu cấu hình."); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800 font-[family-name:var(--font-geist-sans)]">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black flex items-center gap-3">
          <Settings className="text-blue-600" size={32} /> HỆ THỐNG QUẢN TRỊ
        </h1>
        <span className="bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Admin Control</span>
      </div>

      {/* --- PHẦN 1: THỐNG KÊ --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 text-black">
        <StatCard icon={<DollarSign size={20}/>} label="Doanh thu" value={`${stats?.totalRevenue?.toLocaleString()}đ`} color="text-green-600" />
        <StatCard icon={<Activity size={20}/>} label="Tăng trưởng" value={stats?.growthRate} color="text-blue-600" />
        <StatCard icon={<Users size={20}/>} label="Người dùng" value={stats?.totalUsers} color="text-purple-600" />
        <StatCard icon={<Bell size={20}/>} label="Tháng này" value={`${stats?.thisMonthRevenue?.toLocaleString()}đ`} color="text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-black mb-8">
        {/* --- KHỐI CẤU HÌNH --- */}
        <div className="bg-white p-6 rounded-[32px] shadow-xl border border-blue-50 h-fit">
          <h2 className="font-bold mb-6 flex items-center gap-2 text-blue-600 uppercase text-xs tracking-widest">
            <ImageIcon size={16}/> Cấu hình thương hiệu
          </h2>
          <div className="space-y-4">
            <input placeholder="Tên Website" className="w-full p-4 bg-slate-50 rounded-2xl border outline-none font-bold" value={settings.websiteName} onChange={e => setSettings({...settings, websiteName: e.target.value})} />
            <input placeholder="Logo URL" className="w-full p-4 bg-slate-50 rounded-2xl border outline-none" value={settings.logoUrl} onChange={e => setSettings({...settings, logoUrl: e.target.value})} />
            <textarea placeholder="Thông báo chạy chữ..." className="w-full p-4 bg-slate-50 rounded-2xl border min-h-[80px]" value={settings.announcement} onChange={e => setSettings({...settings, announcement: e.target.value})} />
            <button onClick={handleUpdateSettings} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
              <Save size={20}/> LƯU CÀI ĐẶT
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AdminToolCard title="Thông báo gia hạn" desc="Quét tự động các Shop sắp hết hạn" icon={<RefreshCcw className="text-orange-500"/>} action={async () => { await axios.post("http://localhost:3001/admin/check-renewal"); alert("Đã gửi thông báo!"); }} />
                <AdminToolCard title="Đăng bài hệ thống" desc="Gửi tin tức đến toàn bộ người dùng" icon={<Globe className="text-blue-500"/>} action={() => alert("Sắp ra mắt")} />
            </div>
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                <p className="text-[10px] font-black text-slate-300 uppercase mb-4">Preview Header</p>
                <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-full border">
                    {settings.logoUrl ? <img src={settings.logoUrl} className="h-6 object-contain" alt="Logo" /> : <div className="h-6 w-6 bg-slate-200 rounded-full"/>}
                    <span className="font-black text-lg">{settings.websiteName || "Dropbuy"}</span>
                </div>
            </div>
        </div>
      </div>

      {/* --- PHẦN 3: VOUCHER & KHÁCH HÀNG --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-black">
        
        {/* KHỐI QUẢN LÝ VOUCHER (ĐÃ SỬA GIAO DIỆN NHẬP) */}
        <div className="bg-white p-6 rounded-[32px] shadow-xl border border-blue-50">
            <h2 className="font-bold mb-6 flex items-center gap-2 text-blue-600 uppercase text-xs tracking-widest">
                <Ticket size={16}/> Kho Voucher Giảm giá
            </h2>
            
            {/* FORM NHẬP VOUCHER MỚI */}
            <div className="bg-slate-50 p-5 rounded-[28px] border-2 border-dashed border-blue-100 space-y-4 mb-6">
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 ml-2">MÃ VOUCHER</label>
                    <input 
                        placeholder="VD: GIAM20K" 
                        className="w-full p-4 bg-white rounded-2xl border outline-none font-black text-blue-600 text-center uppercase shadow-sm" 
                        value={newVoucher.code} 
                        onChange={e => setNewVoucher({...newVoucher, code: e.target.value.toUpperCase()})} 
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 ml-2">GIÁ TRỊ GIẢM</label>
                        <input 
                            type="number" 
                            placeholder="Số..." 
                            className="w-full p-4 bg-white rounded-2xl border outline-none font-bold shadow-sm" 
                            value={newVoucher.discount} 
                            onChange={e => setNewVoucher({...newVoucher, discount: Number(e.target.value)})} 
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 ml-2">ĐƠN VỊ</label>
                        <select 
                            className="w-full p-4 bg-white rounded-2xl border outline-none font-black text-blue-600 cursor-pointer shadow-sm"
                            value={newVoucher.type}
                            onChange={e => setNewVoucher({...newVoucher, type: e.target.value})}
                        >
                            <option value="fixed">Tiền (VND)</option>
                            <option value="percent">Phần trăm (%)</option>
                        </select>
                    </div>
                </div>

                {/* NÚT THÊM - ĐÃ ĐƯỢC ĐƯA RA RIÊNG ĐỂ KHÔNG BỊ MẤT */}
                <button 
                    onClick={handleCreateVoucher} 
                    className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 mt-2"
                >
                    <Plus size={20}/> THÊM VOUCHER MỚI
                </button>
            </div>

            {/* DANH SÁCH VOUCHER */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {vouchers.map((v: any) => (
                    <div key={v.id} className="p-4 bg-white rounded-2xl border-2 border-dashed border-slate-100 flex justify-between items-center">
                        <div>
                            <p className="font-black text-blue-600">{v.code}</p>
                            <p className="text-[10px] text-slate-400 font-bold">
                                Giảm {v.type === 'percent' ? `${v.discount}%` : `${v.discount.toLocaleString()}đ`}
                            </p>
                        </div>
                        <button onClick={() => handleDeleteVoucher(v.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors">
                            <Trash2 size={18}/>
                        </button>
                    </div>
                ))}
            </div>
        </div>

        {/* DANH SÁCH KHÁCH HÀNG */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[32px] shadow-xl border border-blue-50">
            <h2 className="font-bold mb-6 flex items-center gap-2 text-blue-600 uppercase text-xs tracking-widest">
                <Users size={16}/> Khách hàng hiện tại
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {users.map((u: any) => (
                    <div key={u.id} className="p-4 bg-slate-50 rounded-[24px] border border-transparent hover:border-blue-100 transition-all flex items-center gap-4">
                        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 border shadow-sm">
                            {u.name?.charAt(0) || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-black text-slate-800 text-sm truncate">{u.name || "Khách hàng"}</h3>
                            <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                        </div>
                        <div className="text-right">
                            <span className={`text-[8px] px-2 py-1 rounded-full font-black uppercase ${u.workspaces[0]?.workspace?.plan === 'free' ? 'bg-slate-200 text-slate-500' : 'bg-green-100 text-green-600'}`}>
                                {u.workspaces[0]?.workspace?.plan || "Free"}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}

// CÁC COMPONENT PHỤ
function StatCard({ icon, label, value, color }: any) {
    return (
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-xl bg-slate-50 ${color}`}>{icon}</div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{label}</span>
            </div>
            <p className={`text-2xl font-black ${color}`}>{value || "0"}</p>
        </div>
    );
}

function AdminToolCard({ title, desc, icon, action }: any) {
    return (
        <button onClick={action} className="bg-white p-6 rounded-[32px] border hover:border-blue-500 transition-all flex items-start gap-4 text-left shadow-sm group active:scale-95 w-full">
            <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-blue-50 transition-colors">{icon}</div>
            <div>
                <h3 className="font-black text-slate-800 text-sm">{title}</h3>
                <p className="text-[10px] text-slate-400 mt-1">{desc}</p>
            </div>
        </button>
    );
}