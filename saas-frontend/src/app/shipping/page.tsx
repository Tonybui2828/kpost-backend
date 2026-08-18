"use client";
import React, { useState, useEffect } from 'react';
import { Truck, Save, ShieldCheck, Info, AlertCircle } from 'lucide-react';

export default function ShippingPage() {
  // --- 1. LẤY URL API ĐỘNG ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [saved, setSaved] = useState(false);
  
  const [config, setConfig] = useState({
    vtpToken: '',
    vtpShopId: '',
  });

  const workspaceId = "workspace-01";

  // --- 2. SỬA LINK LẤY CẤU HÌNH ---
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${API_URL}/orders/shipping-settings/${workspaceId}`);
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setConfig({
              vtpToken: data.vtpToken || '',
              vtpShopId: data.vtpShopId || '',
            });
          }
        }
      } catch (error) {
        console.error("Không thể lấy cấu hình cũ:", error);
      } finally {
        setFetching(false);
      }
    };
    fetchConfig();
  }, [API_URL]);

  // --- 3. SỬA LINK LƯU CẤU HÌNH ---
  const handleSave = async () => {
    if (!config.vtpToken || !config.vtpShopId) {
      alert("Vui lòng nhập đầy đủ Token và Mã kho hàng!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/orders/shipping-settings/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setSaved(true);
        alert("✅ Cấu hình vận chuyển đã được lưu thành công!");
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("❌ Lỗi lưu cấu hình từ máy chủ.");
      }
    } catch (error) {
      alert("❌ Lỗi kết nối đến hệ thống xử lý.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-8 text-slate-500 font-black italic animate-pulse">ĐANG TẢI CẤU HÌNH VẬN CHUYỂN...</div>;

  return (
    <div className="p-8 max-w-4xl text-slate-800 font-sans">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tighter">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100">
            <Truck size={28} />
          </div>
          Cấu hình Vận chuyển
        </h1>
        <p className="text-slate-400 mt-2 font-bold uppercase text-[10px] tracking-widest ml-14">Kết nối trực tiếp với Viettel Post Partner API</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center font-black text-red-600 text-xl shadow-inner border border-red-100">VTP</div>
            <div>
              <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Viettel Post Integration</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID Không gian: {workspaceId}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Mã API Token cá nhân</label>
              <input 
                type="password"
                placeholder="Dán mã Token từ trang quản trị ViettelPost..."
                className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-transparent outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-bold text-black"
                value={config.vtpToken}
                onChange={(e) => setConfig({...config, vtpToken: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Mã kho hàng (Group Address ID)</label>
              <input 
                type="text"
                placeholder="Ví dụ: 16983116"
                className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-transparent outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-bold text-black"
                value={config.vtpShopId}
                onChange={(e) => setConfig({...config, vtpShopId: e.target.value})}
              />
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={loading}
            className={`mt-12 w-full py-5 rounded-[24px] font-black uppercase italic text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${
              loading ? "bg-slate-100 text-slate-300 shadow-none" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
            }`}
          >
            {loading ? "ĐANG XỬ LÝ..." : saved ? <><ShieldCheck size={24}/> ĐÃ CẬP NHẬT</> : <><Save size={24}/> LƯU CẤU HÌNH VẬN CHUYỂN</>}
          </button>

          <div className="mt-8 p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-start gap-4">
             <Info className="text-blue-600 shrink-0" size={20} />
             <p className="text-[11px] text-blue-800/70 font-medium leading-relaxed italic">
                Lưu ý: Mã Token và Shop ID lấy tại trang <strong>viettelpost.vn</strong> (Phần cấu hình kết nối API). Hãy đảm bảo mã chính xác để có thể đẩy đơn hàng tự động.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}