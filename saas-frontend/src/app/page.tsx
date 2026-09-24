"use client";
import { useState, useEffect, Suspense, useRef } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Loader2, Sparkles, Globe, Edit3, 
  Clock, ShoppingCart, FolderCheck, Trash2, Shuffle, Square, CheckCircle2,
  Image as ImageIcon, Plus, X, Flame, Bell, ArrowRight
} from "lucide-react";

// =========================================================================
// 1. COMPONENT POPUP THÔNG BÁO TỰ ĐỘNG HIỆN KHI KHÁCH TRUY CẬP TRANG CHỦ
// =========================================================================
function HomePopupModal({ campaign }: { campaign: any }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!campaign || !campaign.popupActive) return;

    // Kiểm tra nếu khách đã từng tắt popup trong phiên duyệt này thì không hiện lại
    const isClosed = sessionStorage.getItem("kpost_popup_closed");
    if (isClosed) return;

    // Tự động bật Popup sau 1.2 giây khi vào trang
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [campaign]);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem("kpost_popup_closed", "true");
  };

  if (!isOpen || !campaign?.popupActive) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[36px] max-w-lg w-full overflow-hidden shadow-2xl relative border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Nút Đóng */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-all shadow-md active:scale-95"
          title="Đóng"
        >
          <X size={18} />
        </button>

        {/* Banner Ảnh nếu có */}
        {campaign.popupImage && (
          <div className="h-48 md:h-52 w-full overflow-hidden relative bg-slate-100">
            <img 
              src={campaign.popupImage} 
              alt="Promotion" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-80" />
          </div>
        )}

        {/* Nội dung thông báo */}
        <div className="p-6 md:p-8 text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-orange-100 text-orange-600 text-[11px] font-black uppercase tracking-wider">
            <Flame size={14} className="animate-pulse" />
            Thông Báo Đặc Quyền
          </div>

          <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-snug">
            {campaign.popupTitle || "🎉 Chào Mừng Bạn Đến Với KPost AI"}
          </h3>

          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            {campaign.popupContent}
          </p>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href={campaign.popupButtonLink || "/settings"}
              onClick={handleClose}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black rounded-2xl shadow-lg shadow-blue-500/25 text-sm uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>{campaign.popupButtonText || "Nhận Ưu Đãi Ngay"}</span>
              <ArrowRight size={16} />
            </Link>

            <button
              onClick={handleClose}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 py-1 transition-colors"
            >
              Để lại sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 2. BANNER ĐẾM NGƯỢC FLASHSALE TRÊN ĐẦU TRANG CHỦ
// =========================================================================
function FlashSaleBanner({ campaign }: { campaign: any }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!campaign?.flashSaleActive || !campaign?.flashSaleEnd) return;

    const target = new Date(campaign.flashSaleEnd).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [campaign]);

  if (!campaign?.flashSaleActive || !timeLeft) return null;

  return (
    <div className="mb-8 p-4 md:p-5 rounded-3xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-white shadow-xl shadow-orange-500/20 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-3 text-center md:text-left">
        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
          <Flame className="w-7 h-7 text-yellow-300 animate-bounce" />
        </div>
        <div>
          <h2 className="text-base md:text-lg font-black uppercase tracking-tight text-white flex items-center justify-center md:justify-start gap-2">
            {campaign.flashSaleTitle || "🔥 CHIẾN DỊCH FLASHSALE GIỚI HẠN"}
          </h2>
          <p className="text-xs text-orange-100 font-medium mt-0.5">
            Ưu đãi đặc biệt giảm sâu cho tất cả các gói dịch vụ AI All-In-One!
          </p>
        </div>
      </div>

      {/* ĐỒNG HỒ ĐẾM NGƯỢC */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 font-black text-xs">
          <div className="bg-black/40 backdrop-blur-md px-3 py-2 rounded-xl text-center min-w-[42px]">
            <span className="text-base font-black text-yellow-300 block leading-tight">{timeLeft.days}</span>
            <span className="text-[9px] text-white/70 uppercase">Ngày</span>
          </div>
          <span className="text-yellow-300 text-sm font-black">:</span>
          <div className="bg-black/40 backdrop-blur-md px-3 py-2 rounded-xl text-center min-w-[42px]">
            <span className="text-base font-black text-yellow-300 block leading-tight">{timeLeft.hours}</span>
            <span className="text-[9px] text-white/70 uppercase">Giờ</span>
          </div>
          <span className="text-yellow-300 text-sm font-black">:</span>
          <div className="bg-black/40 backdrop-blur-md px-3 py-2 rounded-xl text-center min-w-[42px]">
            <span className="text-base font-black text-yellow-300 block leading-tight">{timeLeft.minutes}</span>
            <span className="text-[9px] text-white/70 uppercase">Phút</span>
          </div>
          <span className="text-yellow-300 text-sm font-black">:</span>
          <div className="bg-black/40 backdrop-blur-md px-3 py-2 rounded-xl text-center min-w-[42px]">
            <span className="text-base font-black text-yellow-300 block leading-tight">{timeLeft.seconds}</span>
            <span className="text-[9px] text-white/70 uppercase">Giây</span>
          </div>
        </div>

        <Link
          href="/settings"
          className="ml-2 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black text-xs rounded-xl uppercase tracking-wider transition-all shadow-md active:scale-95 shrink-0"
        >
          Nâng Cấp
        </Link>
      </div>
    </div>
  );
}

// =========================================================================
// 3. NỘI DUNG CHÍNH TRANG AI MARKETING CREATOR
// =========================================================================
function AiMarketingContent() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const searchParams = useSearchParams();

  // --- STATE DỮ LIỆU ---
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<any>(null);
  const [editableContent, setEditableContent] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false); 
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // --- CHIẾN DỊCH MARKETING FLASHSALE & POPUP TỪ BACKEND ---
  const [campaign, setCampaign] = useState<any>(null);

  // --- QUẢN LÝ ẢNH ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  
  // --- QUẢN LÝ PAGE & FOLDER ---
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [pageGroups, setPageGroups] = useState<{name: string, ids: string[]}[]>([]);
  const [newGroupName, setNewGroupName] = useState("");

  // --- HẸN GIỜ & SPIN CONTENT ---
  const [isScheduling, setIsScheduling] = useState(false);
  const [spinContent, setSpinContent] = useState(true); 
  const [scheduleDate, setScheduleDate] = useState("");
  const [productUrl, setProductUrl] = useState(""); 
  const [workspaceId, setWorkspaceId] = useState<string>("");

  // 👉 1. BẮT LINK AFFILIATE & LOAD CHIẾN DỊCH MARKETING
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      if (refCode) {
        localStorage.setItem("kpost_affiliate_ref", refCode);
      }
      const ws = localStorage.getItem("workspaceId");
      if (ws) setWorkspaceId(ws);

      // LẤY CẤU HÌNH CHIẾN DỊCH FLASHSALE VÀ POPUP TỪ BACKEND
      axios.get(`${API_URL}/admin/marketing-campaigns`)
        .then(res => setCampaign(res.data))
        .catch(() => {});
    } catch (error) {
      console.error("Lỗi khởi tạo trang chủ:", error);
    }
  }, [API_URL]);

  // KIỂM TRA LOCAL STORAGE KHI LOAD TRANG
  useEffect(() => {
    const savedTopic = localStorage.getItem("pendingAIPost_topic");
    const savedImgs = localStorage.getItem("pendingAIPost_imgs");
    const savedLink = localStorage.getItem("pendingAIPost_link");

    if (savedTopic) {
      setTopic(savedTopic);
      localStorage.removeItem("pendingAIPost_topic");
    }

    if (savedImgs) {
      const imgList = savedImgs.split(',');
      setAvailableImages(prev => [...new Set([...imgList, ...prev])]); 
      setSelectedImages(imgList);
      localStorage.removeItem("pendingAIPost_imgs");
    }

    if (savedLink) {
      setProductUrl(savedLink);
      localStorage.removeItem("pendingAIPost_link");
    }
  }, []);

  // Lấy dữ liệu Fanpage
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const url = workspaceId 
          ? `${API_URL}/social/accounts?workspaceId=${workspaceId}` 
          : `${API_URL}/social/accounts`;
          
        const res = await axios.get(url);
        setAccounts(res.data || []);
      } catch (e) { 
        console.error("Lỗi lấy danh sách Page"); 
      }
    };
    
    fetchAccounts();

    const t = searchParams.get("topic");
    const imgs = searchParams.get("imgs");
    if (t && !topic) setTopic(t); 
    if (imgs && selectedImages.length === 0) {
        const imgList = imgs.split(',');
        setAvailableImages(prev => [...new Set([...imgList, ...prev])]);
        setSelectedImages(imgList); 
    }
  }, [searchParams, API_URL, workspaceId]);

  // 🔥 HÀM UPLOAD MEDIA TỪ MÁY TÍNH
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const filePromises = Array.from(files).map((file) => {
        return new Promise<{ name: string; base64: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ name: file.name, base64: reader.result as string });
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
      });

      const base64Files = await Promise.all(filePromises);
      const token = localStorage.getItem("token");

      const res = await axios.post(
        `${API_URL}/social/upload`,
        { files: base64Files },
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );

      const uploadedUrls: string[] = res.data?.urls || [];

      if (uploadedUrls.length > 0) {
        setAvailableImages((prev) => [...new Set([...uploadedUrls, ...prev])]);
        setSelectedImages((prev) => [...new Set([...prev, ...uploadedUrls])].slice(0, 10));
      } else {
        alert("Không nhận được đường dẫn ảnh từ server!");
      }
    } catch (err: any) {
      console.error("Lỗi upload media:", err);
      alert("Lỗi tải ảnh lên: " + (err.response?.data?.message || err.message || "Vui lòng thử lại"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (e: React.MouseEvent, urlToRemove: string) => {
    e.stopPropagation();
    setAvailableImages(prev => prev.filter(u => u !== urlToRemove));
    setSelectedImages(prev => prev.filter(u => u !== urlToRemove));
  };

  const handleGenerateContent = async () => {
    if (!topic) return alert("Nhập chủ đề!");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/ai-content/generate`, { topic, userId: "admin-01", workspaceId });
      const generated = res.data.content || res.data;
      setResult({ content: generated });
      setEditableContent(generated);
    } catch (error: any) { 
      console.error(error);
      const errorMsg = error.response?.data?.message || error.message || "AI đang bận hoặc có lỗi xảy ra. Vui lòng thử lại sau.";
      alert(`kpost.vn says\n\n${errorMsg}`); 
    } finally { 
      setLoading(false); 
    }
  };

  const handlePostAction = async () => {
    if (!editableContent || selectedPageIds.length === 0) return alert("Chưa chọn nội dung hoặc Page!");

    setPosting(true);
    try {
      if (isScheduling) {
        if (!scheduleDate) return alert("Vui lòng chọn ngày giờ hẹn lịch!");
        
        const exactVnTime = `${scheduleDate}:00+07:00`;
        const isoDate = new Date(exactVnTime).toISOString();

        await axios.post(`${API_URL}/social/schedule-batch`, {
          workspaceId,
          baseContent: editableContent,
          pageIds: selectedPageIds,
          imageUrls: selectedImages,
          productUrl: productUrl,
          scheduledAt: isoDate,
          spinContent: spinContent 
        });
        
        alert(`🚀 Thành công! Đã đưa ${selectedPageIds.length} bài viết vào lịch chờ đăng.`);
      } else {
        const pagesToPost = accounts.filter((acc: any) => selectedPageIds.includes(acc.platformId));
        for (const acc of pagesToPost) {
          await axios.post(`${API_URL}/social/facebook/post`, {
            pageId: acc.platformId, 
            accessToken: acc.accessToken, 
            message: editableContent, 
            imageUrls: selectedImages, 
            productUrl 
          });
        }
        alert(`🚀 Thành công! Đã xuất bản lên ${selectedPageIds.length} Page.`);
      }
    } catch (error: any) { 
      const errorMessage = error?.response?.data?.message || error?.message || "Lỗi không xác định";
      alert(`Lỗi API: ${errorMessage}`); 
    } finally { setPosting(false); }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8 text-black font-sans min-h-screen">
      {/* POPUP THÔNG BÁO TỰ ĐỘNG BẬT KHI CÓ CHIẾN DỊCH */}
      <HomePopupModal campaign={campaign} />

      <div className="max-w-5xl mx-auto pb-20">
        {/* BANNER FLASHSALE ĐẾM NGƯỢC NẾU ĐANG BẬT */}
        <FlashSaleBanner campaign={campaign} />

        <h1 className="text-4xl font-black text-center mb-10 italic uppercase text-slate-900 tracking-tighter">
          AI CONTENT CREATOR
        </h1>

        {/* 1. CHỌN ẢNH BÀI ĐĂNG */}
        <div className="mb-10 bg-white p-6 rounded-[32px] border shadow-sm text-black">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <ImageIcon size={14} className="text-blue-600" /> Bộ sưu tập ảnh sản phẩm ({selectedImages.length}/10)
              </p>
              {uploading && (
                <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                  <Loader2 size={13} className="animate-spin" /> Đang tải ảnh từ máy tính lên...
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {/* Ô BẤM THÊM MEDIA TỪ MÁY TÍNH */}
                <div 
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-4 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all bg-slate-50 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={28} className="animate-spin text-blue-600 mb-1" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Đang tải...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={32} className="mb-1" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Thêm Media</span>
                      <span className="text-[9px] text-slate-400 font-medium">(Ảnh / Video)</span>
                    </>
                  )}
                  <input 
                     type="file" 
                     multiple 
                     accept="image/*,video/*" 
                     className="hidden" 
                     ref={fileInputRef}
                     onChange={handleFileUpload}
                  />
                </div>

                {/* DANH SÁCH ẢNH */}
                {availableImages.map((url, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedImages(prev => prev.includes(url) ? prev.filter(u => u !== url) : (prev.length < 10 ? [...prev, url] : prev))}
                      className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-4 transition-all ${selectedImages.includes(url) ? 'border-blue-600 scale-95 shadow-md' : 'border-white opacity-60 hover:opacity-100'}`}
                    >
                        <img src={url} className="w-full h-full object-cover" alt="product" />
                        
                        {/* Dấu tích chọn */}
                        {selectedImages.includes(url) && (
                          <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1 shadow-md">
                            <CheckCircle2 size={16} />
                          </div>
                        )}

                        {/* Nút xóa ảnh */}
                        <button 
                          onClick={(e) => handleRemoveImage(e, url)}
                          className="absolute top-2 left-2 bg-black/60 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Xóa ảnh này"
                        >
                          <X size={12} />
                        </button>
                    </div>
                ))}
            </div>
        </div>

        {/* 2. NHẬP Ý TƯỞNG */}
        <div className="bg-white p-8 rounded-[40px] shadow-2xl border mb-10 text-black">
          <textarea className="w-full p-6 bg-slate-50 border-none rounded-[32px] outline-none text-xl min-h-[140px] text-slate-900 font-bold focus:bg-white transition-all" placeholder="Mô tả ý tưởng của bạn (vd: Viết bài bán áo thun mùa hè)..." value={topic} onChange={(e) => setTopic(e.target.value)} />
          <button onClick={handleGenerateContent} disabled={loading} className="w-full mt-6 bg-black text-white font-black py-5 rounded-3xl shadow-lg flex items-center justify-center gap-3 hover:bg-slate-800 transition-all">
             {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={22} />} SÁNG TẠO BÀI VIẾT VỚI AI
          </button>
        </div>

        {/* 3. KẾT QUẢ VÀ CẤU HÌNH ĐĂNG */}
        {result && (
          <div className="bg-white p-8 rounded-[45px] shadow-xl border-l-[16px] border-blue-600 mb-10 text-black animate-in fade-in slide-in-from-bottom-10">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black uppercase italic">Nội dung đề xuất gốc</h2>
                <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded-xl ${isEditing ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}><Edit3 size={18}/></button>
             </div>
             <textarea className={`w-full p-6 rounded-[24px] text-lg leading-relaxed outline-none border-2 transition-all mb-8 ${isEditing ? 'border-orange-200 bg-orange-50/10' : 'border-transparent bg-slate-50'}`} rows={6} value={editableContent} readOnly={!isEditing} onChange={(e) => setEditableContent(e.target.value)} />
             
             {/* HẸN GIỜ & SPIN CONTENT */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-black">
                <div className="p-6 bg-blue-50/50 rounded-[35px] border-2 border-dashed border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                        <ShoppingCart size={16} className="text-blue-600" />
                        <span className="text-[10px] font-black uppercase text-blue-900">Link chèn tự động dưới comment</span>
                    </div>
                    <input className="w-full px-6 py-4 bg-white rounded-2xl outline-none font-bold text-blue-600 shadow-sm" placeholder="Dán link sản phẩm của bạn..." value={productUrl} onChange={(e) => setProductUrl(e.target.value)} />
                </div>

                <div className="p-6 bg-slate-50 rounded-[35px] border border-slate-100 flex flex-col justify-center">
                    <label className="flex items-center justify-between cursor-pointer mb-3">
                        <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2"><Clock size={14} /> Chế độ hẹn giờ đăng</span>
                        <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-blue-600" checked={isScheduling} onChange={(e) => setIsScheduling(e.target.checked)} />
                    </label>
                    
                    {isScheduling && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                          <input type="datetime-local" className="w-full mb-3 bg-white border-2 border-blue-100 px-4 py-3 rounded-2xl text-xs font-bold text-blue-600 outline-none" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
                          
                          <label className="flex items-center gap-2 cursor-pointer bg-orange-50 p-3 rounded-xl border border-orange-100">
                              <input type="checkbox" className="w-4 h-4 rounded text-orange-600" checked={spinContent} onChange={(e) => setSpinContent(e.target.checked)} />
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-orange-700 flex items-center gap-1">
                                  <Shuffle size={12} /> Tránh Spam (Khuyên dùng)
                                </span>
                                <span className="text-[9px] text-orange-600 font-medium leading-tight mt-0.5">
                                  Hệ thống sẽ dùng AI viết lại {selectedPageIds.length || 'nhiều'} phiên bản nội dung khác nhau cho từng Page.
                                </span>
                              </div>
                          </label>
                        </div>
                    )}
                </div>
             </div>

             {/* NHÓM FANPAGE THEO FOLDER */}
             <div className="mb-8 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 text-black"><FolderCheck size={14} /> Nhóm Fanpage theo Folder ({selectedPageIds.length} đã chọn)</h3>
                    <div className="flex gap-2 text-black">
                        <input placeholder="Tên Folder..." className="px-4 py-2 rounded-xl text-xs bg-white border outline-none font-bold text-black" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                        <button onClick={() => {
                            if(!newGroupName || selectedPageIds.length === 0) return alert("Nhập tên và chọn Page để tạo Folder!");
                            const updated = [...pageGroups, { name: newGroupName, ids: selectedPageIds }];
                            setPageGroups(updated);
                            localStorage.setItem("kpost_page_groups", JSON.stringify(updated));
                            setNewGroupName("");
                        }} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[9px] font-black hover:bg-black transition-all">LƯU FOLDER</button>
                    </div>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {pageGroups.map((group, idx) => (
                        <div key={idx} className="flex items-center gap-1 shrink-0">
                            <button onClick={() => setSelectedPageIds(group.ids)} className="bg-white border-2 border-blue-500 text-blue-600 px-5 py-2.5 rounded-2xl text-[10px] font-black whitespace-nowrap hover:bg-blue-50 transition-colors">📁 {group.name.toUpperCase()}</button>
                            <button onClick={() => {
                                const updated = pageGroups.filter(g => g.name !== group.name);
                                setPageGroups(updated);
                                localStorage.setItem("kpost_page_groups", JSON.stringify(updated));
                            }} className="text-slate-300 hover:text-red-500"><Trash2 size={12}/></button>
                        </div>
                    ))}
                </div>
             </div>

             {/* CHỌN PAGE LẺ */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-10 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar text-black">
                {accounts.map((acc: any) => (
                    <div key={acc.platformId} onClick={() => setSelectedPageIds(prev => prev.includes(acc.platformId) ? prev.filter(id => id !== acc.platformId) : [...prev, acc.platformId])} 
                         className={`p-4 rounded-[20px] border-2 cursor-pointer transition-all flex items-center justify-between ${selectedPageIds.includes(acc.platformId) ? 'border-blue-500 bg-white shadow-md' : 'border-transparent bg-slate-50 opacity-40 hover:opacity-100'}`}>
                        <p className="font-bold text-xs truncate pr-2 text-black">{acc.accountName}</p>
                        {selectedPageIds.includes(acc.platformId) ? <CheckCircle2 size={18} className="text-blue-600" /> : <Square size={18} className="text-slate-200" />}
                    </div>
                ))}
             </div>

             <button onClick={handlePostAction} disabled={posting} className="w-full bg-blue-600 text-white font-black py-6 rounded-[30px] shadow-xl text-xl hover:bg-blue-700 active:scale-95 transition-all flex justify-center items-center gap-2">
                {posting ? <Loader2 className="animate-spin" /> : <><Globe size={24} /> {isScheduling ? (spinContent ? 'LÊN LỊCH & SPIN NỘI DUNG 🚀' : 'ĐƯA VÀO HÀNG CHỜ ĐĂNG 🚀') : 'XUẤT BẢN NGAY 🚀'}</>}
             </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiMarketingPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-black animate-pulse text-slate-300">LOADING AI SYSTEM...</div>}>
      <AiMarketingContent />
    </Suspense>
  );
}