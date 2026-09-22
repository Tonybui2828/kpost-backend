'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Flame, Bell, Save, Calendar, Percent, Sparkles, Eye, CheckCircle2 } from 'lucide-react';

export default function AdminMarketingPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.kpost.vn';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [campaign, setCampaign] = useState({
    // Flash Sale
    flashSaleActive: false,
    flashSaleTitle: '🔥 SIÊU SALE GIỚI HẠN - GIẢM ĐẾN 50% TẤT CẢ GÓI',
    flashSaleEnd: '',
    flashSalePlans: {
      PRO: { discount: 30, salePrice: 199000, originalPrice: 299000 },
      GOLD: { discount: 40, salePrice: 399000, originalPrice: 599000 },
      DIAMOND: { discount: 50, salePrice: 699000, originalPrice: 1399000 }
    },
    // Popup
    popupActive: false,
    popupTitle: '🎉 ĐẶC QUYỀN TRẢI NGHIỆM AI ALL-IN-ONE',
    popupContent: 'Nhận ngay mã ưu đãi giảm 50% khi nâng cấp gói PRO/GOLD trong hôm nay. Đừng bỏ lỡ công cụ phát Live & quản trị bán hàng đỉnh cao!',
    popupImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    popupButtonText: 'Khám Phá & Nhận Ưu Đãi',
    popupButtonLink: '/pricing'
  });

  useEffect(() => {
    fetch(`${API_URL}/admin/marketing-campaigns`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          setCampaign(prev => ({
            ...prev,
            ...data,
            flashSaleEnd: data.flashSaleEnd ? new Date(data.flashSaleEnd).toISOString().slice(0, 16) : '',
            flashSalePlans: data.flashSalePlans || prev.flashSalePlans
          }));
        }
      })
      .catch(() => toast.error('Không tải được cấu hình Marketing'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/marketing-campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign)
      });
      if (res.ok) {
        toast.success('Đã lưu chiến dịch Marketing thành công!');
      } else {
        toast.error('Lỗi khi lưu chiến dịch');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold">Đang tải cấu hình Marketing...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="text-blue-600 w-7 h-7" />
            Chiến dịch Flash Sale & Popup Thông báo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kích hoạt các chiến dịch bán hàng trực tiếp trên Trang chủ và Bảng giá để thúc đẩy doanh thu.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-600/25 active:scale-95 transition-all text-sm uppercase tracking-wider"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* KHỐI 1: QUẢN LÝ FLASHSALE */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
                <Flame className="w-5 h-5 text-orange-600 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">Chiến dịch Flash Sale</h2>
                <p className="text-xs text-slate-400">Hiển thị huy hiệu Sale và đồng hồ đếm ngược</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={campaign.flashSaleActive}
                onChange={e => setCampaign({ ...campaign, flashSaleActive: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tiêu đề Flash Sale</label>
              <input
                type="text"
                value={campaign.flashSaleTitle}
                onChange={e => setCampaign({ ...campaign, flashSaleTitle: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-orange-500" />
                Thời gian kết thúc Flash Sale (Đếm ngược)
              </label>
              <input
                type="datetime-local"
                value={campaign.flashSaleEnd}
                onChange={e => setCampaign({ ...campaign, flashSaleEnd: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-orange-500"
              />
            </div>

            {/* Cấu hình giá sale cho từng gói */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-3">Mức giảm giá từng gói</label>
              <div className="space-y-3">
                {['PRO', 'GOLD', 'DIAMOND'].map((pkg) => (
                  <div key={pkg} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                    <span className="font-black text-xs px-2.5 py-1 bg-slate-200 text-slate-800 rounded-lg">{pkg}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-bold">Giảm (%):</span>
                      <input
                        type="number"
                        placeholder="30"
                        value={campaign.flashSalePlans[pkg]?.discount || ''}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setCampaign({
                            ...campaign,
                            flashSalePlans: {
                              ...campaign.flashSalePlans,
                              [pkg]: { ...campaign.flashSalePlans[pkg], discount: val }
                            }
                          });
                        }}
                        className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-center"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-bold">Giá Sale (đ):</span>
                      <input
                        type="number"
                        placeholder="199000"
                        value={campaign.flashSalePlans[pkg]?.salePrice || ''}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setCampaign({
                            ...campaign,
                            flashSalePlans: {
                              ...campaign.flashSalePlans,
                              [pkg]: { ...campaign.flashSalePlans[pkg], salePrice: val }
                            }
                          });
                        }}
                        className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-center"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* KHỐI 2: QUẢN LÝ POPUP TRANG CHỦ */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-black">
                <Bell className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">Popup Bảng Thông Báo</h2>
                <p className="text-xs text-slate-400">Tự động hiện khi khách truy cập trang chủ</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={campaign.popupActive}
                onChange={e => setCampaign({ ...campaign, popupActive: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tiêu đề Popup</label>
              <input
                type="text"
                value={campaign.popupTitle}
                onChange={e => setCampaign({ ...campaign, popupTitle: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nội dung thông báo / Ưu đãi</label>
              <textarea
                rows={3}
                value={campaign.popupContent}
                onChange={e => setCampaign({ ...campaign, popupContent: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-800 outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Link Ảnh Banner Popup (Tùy chọn)</label>
              <input
                type="text"
                placeholder="https://..."
                value={campaign.popupImage}
                onChange={e => setCampaign({ ...campaign, popupImage: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Chữ trên nút</label>
                <input
                  type="text"
                  value={campaign.popupButtonText}
                  onChange={e => setCampaign({ ...campaign, popupButtonText: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Link khi bấm nút</label>
                <input
                  type="text"
                  value={campaign.popupButtonLink}
                  onChange={e => setCampaign({ ...campaign, popupButtonLink: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}