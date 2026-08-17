"use client";
import React, { useState, useEffect } from 'react';
import { Truck, Save, ShieldCheck, Info, AlertCircle } from 'lucide-react';

export default function ShippingPage() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true); // Trạng thái đang tải dữ liệu cũ
  const [saved, setSaved] = useState(false);
  
  const [config, setConfig] = useState({
    vtpToken: '',
    vtpShopId: '',
  });

  const workspaceId = "workspace-01"; // ID cố định của bạn

  // --- BƯỚC QUAN TRỌNG: LẤY DỮ LIỆU CŨ KHI F5 ---
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`http://localhost:3001/orders/shipping-settings/${workspaceId}`);
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
  }, []);

  const handleSave = async () => {
    if (!config.vtpToken || !config.vtpShopId) {
      alert("Vui lòng nhập đầy đủ Token và Mã kho hàng!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/orders/shipping-settings/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setSaved(true);
        alert("✅ Cấu hình đã được lưu vĩnh viễn vào Database!");
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("❌ Lỗi lưu cấu hình.");
      }
    } catch (error) {
      alert("❌ Lỗi kết nối Backend.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-8 text-slate-500 font-bold">Đang tải cấu hình...</div>;

  return (
    <div className="p-8 max-w-4xl text-slate-800">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Truck className="text-blue-600" size={28} />
          Cấu hình Vận chuyển
        </h1>
        <p className="text-slate-500 mt-1">Dữ liệu được lưu trữ bảo mật trên hệ thống.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center font-bold text-red-600">VTP</div>
              <div>
                <h3 className="font-bold text-slate-800">Viettel Post</h3>
                <p className="text-xs text-slate-400">Kết nối tài khoản: {workspaceId}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">API Token cá nhân</label>
                <input 
                  type="password"
                  placeholder="Dán mã Token từ ViettelPost..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={config.vtpToken}
                  onChange={(e) => setConfig({...config, vtpToken: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Mã kho hàng (Shop ID)</label>
                <input 
                  type="text"
                  placeholder="Ví dụ: 16983116"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={config.vtpShopId}
                  onChange={(e) => setConfig({...config, vtpShopId: e.target.value})}
                />
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={loading}
              className={`mt-8 w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                loading ? "bg-slate-100 text-slate-400" : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100 shadow-blue-500/20"
              }`}
            >
              {loading ? "Đang xử lý..." : saved ? <><ShieldCheck size={20}/> Đã cập nhật</> : <><Save size={20}/> Lưu cấu hình</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}