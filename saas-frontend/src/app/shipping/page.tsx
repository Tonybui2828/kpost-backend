"use client";
import React, { useState, useEffect } from 'react';
import { Truck, Save, ShieldCheck, Info } from 'lucide-react';

export default function ShippingPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [saved, setSaved] = useState(false);
  
  const [config, setConfig] = useState({
    vtpPhone: '',
    vtpPassword: '',
    vtpShopId: '',
  });

  useEffect(() => {
    const savedId = localStorage.getItem("workspaceId");
    if (savedId) {
      setWorkspaceId(savedId);
    } else {
      setWorkspaceId("workspace-01"); 
    }
  }, []);

  const fetchConfig = async () => {
    if (!workspaceId) return;
    try {
      // ĐÃ SỬA LẠI ĐƯỜNG DẪN API CHUẨN
      const response = await fetch(`${API_URL}/shipping/${workspaceId}`);
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setConfig({
            vtpPhone: data.vtpPhone || '',
            // NẾU CÓ PASS TỪ DB, HIỂN THỊ DẤU *** ĐỂ BẢO MẬT
            vtpPassword: data.vtpPassword ? '********' : '', 
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

  useEffect(() => {
    if (workspaceId) {
      fetchConfig();
    }
  }, [workspaceId, API_URL]);

  const handleSave = async () => {
    if (!config.vtpPhone || !config.vtpPassword || !config.vtpShopId) {
      alert("Vui lòng nhập đầy đủ Số điện thoại, Mật khẩu và Mã kho hàng!");
      return;
    }

    setLoading(true);
    try {
      // TẠO PAYLOAD RIÊNG: NẾU PASS LÀ *** THÌ KHÔNG GỬI LÊN DB ĐỂ TRÁNH GHI ĐÈ LỖI
      const payload: any = {
        vtpPhone: config.vtpPhone,
        vtpShopId: config.vtpShopId,
      };
      if (config.vtpPassword !== '********') {
        payload.vtpPassword = config.vtpPassword;
      }

      // ĐÃ SỬA LẠI ĐƯỜNG DẪN API CHUẨN
      const response = await fetch(`${API_URL}/shipping/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSaved(true);
        alert("✅ Kết nối Viettel Post đã được lưu thành công!");
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("❌ Lỗi lưu cấu hình! Vui lòng kiểm tra lại tài khoản Viettel Post.");
      }
    } catch (error) {
      alert("❌ Lỗi kết nối đến hệ thống xử lý.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-10 text-center font-black text-slate-300 italic animate-pulse uppercase">Đang tải cấu hình vận chuyển...</div>;

  return (
    <div className="p-8 max-w-4xl text-slate-800 font-sans">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tighter text-black">
          <div className="bg-red-600 p-2 rounded-xl text-white shadow-lg shadow-red-100">
            <Truck size={28} />
          </div>
          Cấu hình Vận chuyển
        </h1>
        <p className="text-slate-400 mt-2 font-bold uppercase text-[10px] tracking-widest ml-14">Kết nối tài khoản Viettel Post tự động</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center font-black text-red-600 text-xl shadow-inner border border-red-100">VTP</div>
            <div>
              <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight text-black">Tài khoản Viettel Post</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Hệ thống tự động gia hạn mã kết nối API</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Số điện thoại VTP</label>
                 <input 
                   type="text"
                   placeholder="VD: 0987654321"
                   className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-transparent outline-none focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all font-bold text-black"
                   value={config.vtpPhone}
                   onChange={(e) => setConfig({...config, vtpPhone: e.target.value})}
                 />
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Mật khẩu</label>
                 <input 
                   type="password"
                   placeholder="Mật khẩu đăng nhập app"
                   className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-transparent outline-none focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all font-bold text-black"
                   value={config.vtpPassword}
                   onChange={(e) => setConfig({...config, vtpPassword: e.target.value})}
                 />
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Mã kho hàng (Group Address ID)</label>
              <input 
                type="text"
                placeholder="Ví dụ: 16983116"
                className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-transparent outline-none focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all font-bold text-black"
                value={config.vtpShopId}
                onChange={(e) => setConfig({...config, vtpShopId: e.target.value})}
              />
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={loading}
            className={`mt-12 w-full py-5 rounded-[24px] font-black uppercase italic text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${
              loading ? "bg-slate-100 text-slate-300 shadow-none" : "bg-red-600 text-white hover:bg-red-700 shadow-red-200"
            }`}
          >
            {loading ? "ĐANG KẾT NỐI..." : saved ? <><ShieldCheck size={24}/> ĐÃ LƯU KẾT NỐI</> : <><Save size={24}/> LƯU & KẾT NỐI VIETTEL POST</>}
          </button>

          <div className="mt-8 p-6 bg-red-50/50 rounded-3xl border border-red-100 flex items-start gap-4">
             <Info className="text-red-600 shrink-0" size={20} />
             <p className="text-[11px] text-red-800/70 font-medium leading-relaxed italic">
                Lưu ý: Hãy sử dụng <strong>Số điện thoại</strong> và <strong>Mật khẩu</strong> bạn đang dùng để đăng nhập vào ứng dụng Viettel Post trên điện thoại. Hệ thống sẽ tự động khởi tạo và duy trì kết nối API mãi mãi, giúp bạn đẩy đơn mượt mà không bị gián đoạn.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}