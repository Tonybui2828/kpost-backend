"use client";
import { useState, useEffect, Suspense } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { 
  PenTool, Loader2, Sparkles, Image as ImageIcon, 
  Globe, Edit3, Wand2, X, ListFilter, CheckCircle2, 
  Square, Download, FileText, UploadCloud, Clock, Calendar,
  Link2, ShoppingCart
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient("https://wsgjryobqfayxhdhujki.supabase.co", "sb_publishable__cTnEl5USBaraE6p6P0WDw_Q37Hmye7");

function AiMarketingContent() {
  const searchParams = useSearchParams();
  const [topic, setTopic] = useState("");
  const [imageUrl, setImageUrl] = useState(""); 
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [editableContent, setEditableContent] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [posting, setPosting] = useState(false); 
  const [isEditing, setIsEditing] = useState(false);

  // --- STATE HẸN GIỜ & LINK SẢN PHẨM ---
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [productUrl, setProductUrl] = useState(""); 

  const [accounts, setAccounts] = useState([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const workspaceId = "workspace-01"; 

  useEffect(() => {
    let interval: any;
    if (imageLoading) {
      setProgress(0);
      interval = setInterval(() => setProgress((prev) => (prev >= 98 ? 98 : prev + 2)), 400);
    }
    return () => clearInterval(interval);
  }, [imageLoading]);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await axios.get(`http://localhost:3001/social/accounts?workspaceId=${workspaceId}`);
        setAccounts(res.data || []);
        setSelectedPageIds(res.data.map((acc: any) => acc.platformId));
      } catch (e) { console.error("Lỗi lấy danh sách Page"); }
    };
    fetchAccounts();
    const t = searchParams.get("topic");
    const i = searchParams.get("img");
    if (t) setTopic(t);
    if (i) setImageUrl(i);
  }, [searchParams]);

  const handleManualUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `manual_${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from('product-images').upload(fileName, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        setImageUrl(publicUrl);
        alert("Đã tải ảnh lên thành công!");
      }
    } catch (e) { alert("Lỗi tải ảnh!"); } finally { setUploading(false); }
  };

  const downloadImage = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `AI-Photo-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) { alert("Lỗi khi tải!"); }
  };

  const handleDrawImage = async () => {
    if (!topic) return alert("Vui lòng nhập mô tả!");
    setImageLoading(true);
    setImageUrl(""); 
    try {
      const res = await axios.post("http://localhost:3001/social/ai-generate-image", { prompt: topic });
      if (res.data && res.data.url) {
        setImageUrl(res.data.url);
        setProgress(100);
      }
    } catch (e) { alert("AI đang bận!"); } finally { setImageLoading(false); }
  };

  const handleGenerateContent = async () => {
    if (!topic) return alert("Nhập chủ đề!");
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:3001/ai-content/generate", { 
        topic: topic, userId: "admin-01", workspaceId 
      });
      setResult(res.data);
      setEditableContent(res.data.content);
    } catch (e) { alert("Lỗi kết nối!"); } finally { setLoading(false); }
  };

  // --- HÀM XỬ LÝ ĐĂNG BÀI HOẶC HẸN GIỜ (ĐÃ CẬP NHẬT) ---
  const handlePostAction = async () => {
    if (!editableContent || selectedPageIds.length === 0) return alert("Thiếu nội dung hoặc chưa chọn Page!");
    
    if (isScheduling && !scheduleDate) {
      return alert("Vui lòng chọn thời gian bạn muốn đăng bài!");
    }

    setPosting(true);
    try {
      if (isScheduling) {
        // LUỒNG 1: HẸN GIỜ (Gửi kèm productUrl để Backend tự comment khi đến giờ)
        await axios.post("http://localhost:3001/social/schedule", {
          content: editableContent,
          workspaceId,
          scheduledAt: scheduleDate,
          imageUrl: imageUrl || "",
          productUrl: productUrl // <--- GỬI LINK LÊN ĐÂY
        });
        alert(`✅ Đã lên lịch thành công! Bài viết và link comment sẽ tự động lên sóng lúc: ${new Date(scheduleDate).toLocaleString('vi-VN')}`);
      } else {
        // LUỒNG 2: ĐĂNG NGAY (Gửi productUrl để Backend tự comment ngay lập tức)
        const pagesToPost = accounts.filter((acc: any) => selectedPageIds.includes(acc.platformId));
        
        for (const acc of pagesToPost) {
          await axios.post("http://localhost:3001/social/facebook/post", {
            pageId: acc.platformId, 
            accessToken: acc.accessToken, 
            message: editableContent, 
            imageUrl,
            productUrl: productUrl // <--- GỬI LINK LÊN ĐÂY ĐỂ ĐĂNG XONG COMMENT LUÔN
          });
        }
        alert(`🚀 Thành công! Đã đăng bài và chèn link mua hàng tự động lên ${pagesToPost.length} Fanpage.`);
      }
    } catch (error) { 
      alert("Có lỗi xảy ra trong quá trình xử lý!"); 
    } finally { setPosting(false); }
  };

  const togglePageSelection = (pId: string) => {
    setSelectedPageIds(prev => prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-black">
      <div className="max-w-4xl mx-auto font-sans">
        <h1 className="text-4xl font-black text-center mb-8 italic uppercase text-slate-900 tracking-tighter">AI CREATIVE PRO</h1>

        {/* KHU VỰC HIỂN THỊ ẢNH */}
        <div className="mb-10 text-center flex items-center justify-center min-h-[150px]">
            {imageLoading ? (
                <div className="bg-white p-8 rounded-[40px] shadow-xl border w-full max-w-sm text-center">
                    <p className="text-blue-600 font-black mb-2 animate-pulse uppercase text-sm">{progress}% ĐANG TẠO ẢNH...</p>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }}></div></div>
                </div>
            ) : imageUrl ? (
                <div className="relative inline-block animate-in zoom-in group">
                    <img src={imageUrl} className="max-h-[450px] rounded-[40px] shadow-2xl border-8 border-white object-contain bg-white" />
                    <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={downloadImage} className="bg-white text-blue-600 p-3 rounded-full shadow-xl hover:bg-blue-600 hover:text-white transition-all"><Download size={20} /></button>
                        <button onClick={() => setImageUrl("")} className="bg-white text-red-500 p-3 rounded-full shadow-xl hover:bg-red-500 hover:text-white transition-all"><X size={20} /></button>
                    </div>
                </div>
            ) : (
                <label className="w-full h-48 border-4 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center bg-white hover:bg-blue-50 transition-all cursor-pointer group">
                    {uploading ? <Loader2 className="animate-spin text-blue-600" /> : <UploadCloud size={48} className="text-slate-200 group-hover:text-blue-400" />}
                    <p className="text-slate-400 font-bold uppercase text-[10px] mt-2 tracking-widest text-center">Bấm để tải ảnh lên hoặc chờ AI tạo ảnh</p>
                    <input type="file" className="hidden" accept="image/*" onChange={handleManualUpload} />
                </label>
            )}
        </div>

        {/* NHẬP LIỆU */}
        <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-white mb-8 text-black">
          <textarea className="w-full p-6 bg-slate-50 border-none rounded-[32px] outline-none text-xl min-h-[120px] text-slate-900 font-medium transition-all focus:bg-white" placeholder="Bạn muốn AI viết gì hoặc vẽ gì?" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={handleGenerateContent} disabled={loading} className="bg-slate-900 text-white font-black py-5 rounded-3xl shadow-lg flex items-center justify-center gap-3 hover:bg-black transition-all">
               {loading ? <Loader2 className="animate-spin" /> : <FileText size={22} />} {imageUrl ? "VIẾT BÀI CHO ẢNH NÀY" : "VIẾT BÀI AI"}
            </button>
            <button onClick={handleDrawImage} disabled={imageLoading} className="bg-blue-600 text-white font-black py-5 rounded-3xl shadow-lg flex items-center justify-center gap-3 hover:bg-blue-700 transition-all">
               {imageLoading ? <Loader2 className="animate-spin" /> : <Wand2 size={22} />} AI TẠO ẢNH 🎨
            </button>
          </div>
        </div>

        {/* KẾT QUẢ BẢN THẢO */}
        {result && (
          <div className="bg-white p-10 rounded-[45px] shadow-2xl border-l-[20px] border-green-500 mb-10 animate-in slide-in-from-bottom-10">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black italic uppercase text-slate-800 flex items-center gap-2"><Sparkles className="text-blue-600"/> Bản thảo nội dung</h2>
                <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded-full transition-all ${isEditing ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}><Edit3 size={18} /></button>
             </div>
             <textarea className={`w-full p-8 rounded-[35px] text-xl leading-relaxed outline-none border-2 transition-all ${isEditing ? 'bg-orange-50/50 border-orange-200 text-slate-900 font-bold' : 'bg-slate-50 border-transparent text-slate-700'}`} rows={10} value={editableContent} readOnly={!isEditing} onChange={(e) => setEditableContent(e.target.value)} />
             
             {/* KHU VỰC CẤU HÌNH ĐẨY BÀI */}
             <div className="mt-8 space-y-4">
                
                {/* Ô NHẬP LINK SẢN PHẨM */}
                <div className="p-6 bg-blue-50/50 rounded-[35px] border-2 border-dashed border-blue-200 shadow-inner">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md"><ShoppingCart size={16} /></div>
                        <span className="text-[10px] font-black uppercase text-blue-900 tracking-[0.2em]">Link mua hàng (AI tự comment)</span>
                    </div>
                    <input 
                        className="w-full px-6 py-4 bg-white rounded-2xl outline-none border-none text-blue-600 font-bold shadow-sm placeholder:font-medium placeholder:text-slate-300"
                        placeholder="Dán link Shopee, Lazada hoặc Website của bạn..."
                        value={productUrl}
                        onChange={(e) => setProductUrl(e.target.value)}
                    />
                </div>

                {/* CẤU HÌNH HẸN GIỜ */}
                <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                        type="checkbox" 
                        className="w-6 h-6 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 transition-all"
                        checked={isScheduling} 
                        onChange={(e) => setIsScheduling(e.target.checked)}
                        />
                        <span className="text-sm font-black text-slate-600 uppercase tracking-widest group-hover:text-blue-600 transition-colors flex items-center gap-2">
                            <Clock size={16} /> Hẹn giờ đăng bài
                        </span>
                    </label>
                    
                    {isScheduling && (
                        <div className="flex-1 animate-in zoom-in duration-300">
                            <input 
                            type="datetime-local" 
                            className="w-full bg-white border-2 border-blue-100 px-6 py-3 rounded-2xl text-sm font-bold text-blue-600 outline-none focus:border-blue-500 shadow-sm"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            />
                        </div>
                    )}
                </div>
             </div>

             {/* NÚT XUẤT BẢN THÔNG MINH */}
             <button 
                onClick={handlePostAction} 
                disabled={posting} 
                className={`mt-6 w-full font-black py-7 rounded-[35px] shadow-2xl text-2xl uppercase italic flex items-center justify-center gap-4 transition-all active:scale-95 ${
                    isScheduling 
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-200" 
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-200"
                }`}
             >
                {posting ? (
                    <Loader2 className="animate-spin" size={30} />
                ) : isScheduling ? (
                    <><Calendar size={28} /> XÁC NHẬN LỊCH ĐĂNG ⏰</>
                ) : (
                    <><Globe size={28} /> ĐĂNG LÊN {selectedPageIds.length} PAGE ĐÃ CHỌN 🚀</>
                )}
             </button>

             {/* DANH SÁCH PAGE ĐÍCH */}
             <div className="mt-10 p-6 bg-slate-50/50 rounded-[32px] border border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2 italic"><ListFilter size={14} className="text-blue-600" /> Hệ thống đích đến ({accounts.length})</h3>
                <div className="max-h-[250px] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 pr-2 custom-scrollbar text-black">
                    {accounts.map((acc: any) => (
                        <div key={acc.platformId} onClick={() => togglePageSelection(acc.platformId)} className={`flex items-center gap-4 p-5 rounded-3xl cursor-pointer border-2 transition-all ${selectedPageIds.includes(acc.platformId) ? 'bg-white border-blue-500 shadow-md scale-[1.02]' : 'bg-transparent border-transparent opacity-30 hover:opacity-100'}`}>
                            {selectedPageIds.includes(acc.platformId) ? <CheckCircle2 className="text-blue-600" size={24} /> : <Square className="text-slate-300" size={24} />}
                            <p className="font-bold text-base truncate text-black">{acc.accountName}</p>
                        </div>
                    ))}
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiMarketingPage() {
  return (<Suspense fallback={<div className="p-20 text-center font-black animate-pulse text-slate-300">LOADING AI ENGINE...</div>}><AiMarketingContent /></Suspense>);
}