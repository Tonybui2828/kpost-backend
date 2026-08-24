"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { 
  PenTool, Loader2, Sparkles, Image as ImageIcon, 
  Globe, Edit3, Wand2, X, ListFilter, CheckCircle2, 
  Square, Download, FileText, UploadCloud, Clock, Calendar,
  Link2, ShoppingCart, ImagePlus
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient("https://wsgjryobqfayxhdhujki.supabase.co", "sb_publishable__cTnEl5USBaraE6p6P0WDw_Q37Hmye7");

function AiMarketingContent() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const searchParams = useSearchParams();

  // --- STATE DỮ LIỆU ---
  const [topic, setTopic] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [editableContent, setEditableContent] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [posting, setPosting] = useState(false); 
  const [isEditing, setIsEditing] = useState(false);

  // --- STATE QUẢN LÝ NHIỀU ẢNH ---
  const [availableImages, setAvailableImages] = useState<string[]>([]); // Toàn bộ ảnh từ kho
  const [selectedImages, setSelectedImages] = useState<string[]>([]); // Ảnh được tích chọn để đăng
  
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [productUrl, setProductUrl] = useState(""); 

  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>("");

  useEffect(() => {
    const savedId = localStorage.getItem("workspaceId");
    if (savedId) setWorkspaceId(savedId);
    else setWorkspaceId("workspace-01");
  }, []);

  useEffect(() => {
    let interval: any;
    if (imageLoading) {
      setProgress(0);
      interval = setInterval(() => setProgress((prev) => (prev >= 98 ? 98 : prev + 2)), 400);
    }
    return () => clearInterval(interval);
  }, [imageLoading]);

  // NHẬN DỮ LIỆU TỪ TRANG SẢN PHẨM
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!workspaceId) return;
      try {
        const res = await axios.get(`${API_URL}/social/accounts?workspaceId=${workspaceId}`);
        setAccounts(res.data || []);
        setSelectedPageIds(res.data.map((acc: any) => acc.platformId));
      } catch (e) { console.error("Lỗi lấy danh sách Page"); }
    };
    fetchAccounts();

    // Lấy Topic và danh sách ảnh từ URL
    const t = searchParams.get("topic");
    const imgs = searchParams.get("imgs");
    if (t) setTopic(t);
    if (imgs) {
        const imgList = imgs.split(',');
        setAvailableImages(imgList);
        setSelectedImages([imgList[0]]); // Mặc định chọn ảnh đầu tiên
    }
  }, [searchParams, API_URL, workspaceId]);

  // Xử lý chọn/bỏ chọn ảnh
  const toggleImageSelect = (url: string) => {
    setSelectedImages(prev => 
        prev.includes(url) 
        ? prev.filter(item => item !== url) 
        : (prev.length < 10 ? [...prev, url] : prev)
    );
  };

  const handleManualUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `manual_${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from('product-images').upload(fileName, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        setAvailableImages(prev => [publicUrl, ...prev]);
        setSelectedImages(prev => [publicUrl, ...prev]);
        alert("Đã tải ảnh lên thành công!");
      }
    } catch (e) { alert("Lỗi tải ảnh!"); } finally { setUploading(false); }
  };

  const handleGenerateContent = async () => {
    if (!topic) return alert("Vui lòng nhập chủ đề!");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/ai-content/generate`, { 
        topic: topic, userId: "admin-01", workspaceId 
      });
      setResult(res.data);
      setEditableContent(res.data.content);
    } catch (e) { alert("Lỗi kết nối AI!"); } finally { setLoading(false); }
  };

  const handlePostAction = async () => {
    if (!editableContent || selectedPageIds.length === 0) return alert("Chưa chọn nội dung hoặc Page!");
    if (selectedImages.length === 0) return alert("Vui lòng chọn ít nhất 1 ảnh để đăng!");

    setPosting(true);
    try {
      if (isScheduling) {
        await axios.post(`${API_URL}/social/schedule`, {
          content: editableContent,
          workspaceId,
          scheduledAt: scheduleDate,
          imageUrls: selectedImages, // Gửi mảng nhiều ảnh
          productUrl: productUrl 
        });
        alert(`✅ Đã lên lịch thành công!`);
      } else {
        const pagesToPost = accounts.filter((acc: any) => selectedPageIds.includes(acc.platformId));
        for (const acc of pagesToPost) {
          await axios.post(`${API_URL}/social/facebook/post`, {
            pageId: acc.platformId, 
            accessToken: acc.accessToken, 
            message: editableContent, 
            imageUrls: selectedImages, // Backend sẽ xử lý đăng nhiều ảnh
            productUrl: productUrl 
          });
        }
        alert(`🚀 Đã đăng bài kèm ${selectedImages.length} ảnh lên Facebook thành công!`);
      }
    } catch (error) { alert("Lỗi đẩy bài!"); } finally { setPosting(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-center mb-10 italic uppercase text-black tracking-tighter">AI CREATIVE PRO</h1>

        {/* KHU VỰC CHỌN ẢNH ĐĂNG BÀI */}
        <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <ImageIcon size={14} className="text-blue-600" /> 
                    Chọn ảnh đăng bài ({selectedImages.length}/10)
                </p>
                <label className="text-[9px] bg-white border px-3 py-1 rounded-full font-bold cursor-pointer hover:bg-slate-50 transition-all">
                    + TẢI THÊM ẢNH
                    <input type="file" className="hidden" accept="image/*" onChange={handleManualUpload} />
                </label>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {availableImages.length > 0 ? (
                    availableImages.map((url, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => toggleImageSelect(url)}
                            className={`relative aspect-square rounded-[24px] overflow-hidden cursor-pointer border-4 transition-all ${selectedImages.includes(url) ? 'border-blue-600 scale-95 shadow-xl' : 'border-white shadow-sm opacity-60'}`}
                        >
                            <img src={url} className="w-full h-full object-cover" alt="select" />
                            {selectedImages.includes(url) && (
                                <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1 shadow-lg">
                                    <CheckCircle2 size={16} />
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-10 bg-white rounded-[32px] border-2 border-dashed border-slate-200 text-center text-slate-300 font-bold italic text-sm">
                        Chưa có ảnh sản phẩm nào được chọn
                    </div>
                )}
            </div>
        </div>

        {/* NHẬP LIỆU */}
        <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-white mb-10">
          <textarea 
            className="w-full p-6 bg-slate-50 border-none rounded-[32px] outline-none text-xl min-h-[140px] text-slate-900 font-bold transition-all focus:bg-white" 
            placeholder="Mô tả ý tưởng của bạn hoặc dùng mô tả sản phẩm..." 
            value={topic} 
            onChange={(e) => setTopic(e.target.value)} 
          />
          <div className="mt-6 flex gap-4">
            <button onClick={handleGenerateContent} disabled={loading} className="flex-1 bg-black text-white font-black py-5 rounded-3xl shadow-lg flex items-center justify-center gap-3 hover:bg-slate-800 transition-all">
               {loading ? <Loader2 className="animate-spin" /> : <FileText size={22} />} SÁNG TẠO NỘI DUNG AI
            </button>
          </div>
        </div>

        {/* KẾT QUẢ BẢN THẢO */}
        {result && (
          <div className="bg-white p-10 rounded-[45px] shadow-2xl border-l-[20px] border-blue-600 mb-10 animate-in slide-in-from-bottom-10 duration-500">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black italic uppercase text-slate-800 flex items-center gap-2"><Sparkles className="text-blue-600"/> Bản thảo AI</h2>
                <button onClick={() => setIsEditing(!isEditing)} className={`p-3 rounded-full transition-all ${isEditing ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}><Edit3 size={18} /></button>
             </div>
             
             <textarea 
                className={`w-full p-8 rounded-[35px] text-lg leading-relaxed outline-none border-2 transition-all ${isEditing ? 'bg-orange-50/10 border-orange-200 text-slate-900 font-bold' : 'bg-slate-50 border-transparent text-slate-600'}`} 
                rows={12} 
                value={editableContent} 
                readOnly={!isEditing} 
                onChange={(e) => setEditableContent(e.target.value)} 
             />
             
             <div className="mt-8 space-y-4">
                {/* Link sản phẩm */}
                <div className="p-6 bg-blue-50/50 rounded-[35px] border-2 border-dashed border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                        <ShoppingCart size={16} className="text-blue-600" />
                        <span className="text-[10px] font-black uppercase text-blue-900 tracking-widest">Link mua hàng chèn tự động</span>
                    </div>
                    <input className="w-full px-6 py-4 bg-white rounded-2xl border-none outline-none font-black text-blue-600 shadow-sm" placeholder="Dán link sản phẩm..." value={productUrl} onChange={(e) => setProductUrl(e.target.value)} />
                </div>

                {/* Hẹn giờ */}
                <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-6 h-6 rounded-lg border-slate-300 text-blue-600" checked={isScheduling} onChange={(e) => setIsScheduling(e.target.checked)} />
                        <span className="text-sm font-black text-slate-600 uppercase tracking-widest group-hover:text-blue-600 flex items-center gap-2"><Clock size={16} /> Lên lịch đăng</span>
                    </label>
                    {isScheduling && (
                        <input type="datetime-local" className="flex-1 bg-white border-2 border-blue-100 px-6 py-3 rounded-2xl text-sm font-bold text-blue-600" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
                    )}
                </div>
             </div>

             {/* Nút đăng bài */}
             <button onClick={handlePostAction} disabled={posting} className={`mt-8 w-full font-black py-7 rounded-[35px] shadow-2xl text-2xl uppercase italic flex items-center justify-center gap-4 transition-all active:scale-95 ${isScheduling ? "bg-orange-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                {posting ? <Loader2 className="animate-spin" /> : <><Globe size={28} /> XUẤT BẢN KÈM {selectedImages.length} ẢNH 🚀</>}
             </button>

             {/* Danh sách Page đích */}
             <div className="mt-10 p-6 bg-slate-50/50 rounded-[32px] border border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 italic"><ListFilter size={14} /> Page đăng bài ({accounts.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-black">
                    {accounts.map((acc: any) => (
                        <div key={acc.platformId} onClick={() => togglePageSelection(acc.platformId)} className={`flex items-center gap-3 p-4 rounded-3xl cursor-pointer border-2 transition-all ${selectedPageIds.includes(acc.platformId) ? 'bg-white border-blue-500 shadow-md' : 'bg-transparent border-transparent opacity-40'}`}>
                            {selectedPageIds.includes(acc.platformId) ? <CheckCircle2 className="text-blue-600" size={20} /> : <Square className="text-slate-300" size={20} />}
                            <p className="font-bold text-sm truncate text-black">{acc.accountName}</p>
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
  return (<Suspense fallback={<div className="p-20 text-center font-black animate-pulse text-slate-300 uppercase tracking-widest">AI ENGINE LOADING...</div>}><AiMarketingContent /></Suspense>);
}