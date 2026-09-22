'use client';
import { useState, useEffect } from 'react';
import { X, Sparkles, Flame } from 'lucide-react';
import Link from 'next/link';

export default function HomePopup() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.kpost.vn';
  const [popupData, setPopupData] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Kiểm tra xem khách đã tắt popup trong phiên duyệt này chưa (tránh làm phiền)
    const hasClosed = sessionStorage.getItem('kpost_closed_popup');
    if (hasClosed) return;

    fetch(`${API_URL}/admin/marketing-campaigns`)
      .then(res => res.json())
      .then(data => {
        if (data?.popupActive) {
          setPopupData(data);
          // Hiện sau 1.5 giây khi khách vào trang
          setTimeout(() => setIsOpen(true), 1500);
        }
      })
      .catch(() => {});
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('kpost_closed_popup', 'true');
  };

  if (!isOpen || !popupData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Nút đóng */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white flex items-center justify-center transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ảnh Banner nếu có */}
        {popupData.popupImage && (
          <div className="h-48 w-full overflow-hidden relative">
            <img 
              src={popupData.popupImage} 
              alt="Promo Banner" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          </div>
        )}

        {/* Nội dung Popup */}
        <div className="p-6 md:p-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-xs font-black uppercase tracking-wider">
            <Flame className="w-4 h-4" />
            Ưu đãi có hạn
          </div>

          <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            {popupData.popupTitle}
          </h3>

          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            {popupData.popupContent}
          </p>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href={popupData.popupButtonLink || '/pricing'}
              onClick={handleClose}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-blue-600/30 text-sm uppercase tracking-wider transition-all active:scale-95"
            >
              {popupData.popupButtonText || 'Nhận Ngay Ưu Đãi'}
            </Link>

            <button
              onClick={handleClose}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 py-1"
            >
              Để lại sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}