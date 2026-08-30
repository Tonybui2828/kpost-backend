"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { 
  Loader2, Sparkles, Image as ImageIcon, 
  Globe, Edit3, CheckCircle2, 
  Square, Clock, ShoppingCart, FolderCheck, Trash2, Shuffle, Plus
} from "lucide-react";

function AiMarketingContent() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const searchParams = useSearchParams();

  // --- STATE DỮ LIỆU ---
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<any>(null);
  const [editableContent, setEditableContent] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false); 
  const [isEditing, setIsEditing] = useState(false);

  // --- QUẢN LÝ ẢNH/MEDIA ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newMediaUrls = Array.from(files).map(file => URL.createObjectURL(file));
    setAvailableImages(prev => [...newMediaUrls, ...prev]);
    setSelectedImages(prev => {
      const combined = [...newMediaUrls, ...prev];
      return combined.slice(0, 10);
    });
  };

  // --- QUẢN LÝ PAGE & FOLDER ---
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [pageGroups, setPageGroups] = useState<{name: string, ids: string[]}[]>([]);
  const [newGroupName, setNewGroupName] = useState("");

  // --- HẸN GIỜ & SPIN CONTENT ---
  const [isScheduling, setIsScheduling] = useState(false);
  const [spinContent, setSpinContent] = useState(true); // Đã chuyển ra ngoài để quản lý chung
  const [scheduleDate, setScheduleDate] = useState("");
  const [productUrl, setProductUrl] = useState(""); 
  const [workspaceId, setWorkspaceId] = useState<string>("");

  useEffect(() => {
    const savedId = localStorage.getItem("workspaceId") || "workspace-01";
    setWorkspaceId(savedId);
    const savedGroups = localStorage.getItem("kpost_page_groups");
    if (savedGroups) setPageGroups(JSON.parse(savedGroups));
  }, []);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!workspaceId) return;
      try {
        const res = await axios.get(`${API_URL}/social/accounts?workspaceId=${workspaceId}`);
        setAccounts(res.data || []);
      } catch (e) { console.error("Lỗi lấy danh sách Page"); }
    };
    fetchAccounts();

    const t = searchParams.get("topic");
    const imgs = searchParams.get("imgs");
    if (t) setTopic(t);
    if (imgs) {
        const imgList = imgs.split(',');
        setAvailableImages(imgList);
        setSelectedImages(imgList); 
    }
  }, [searchParams, API_URL, workspaceId]);

  const handleGenerateContent = async () => {
    if (!topic) return alert("Nhập chủ đề!");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/ai-content/generate`, { 
        topic: topic, userId: "admin-01", workspaceId 
      });
      setResult(res.data);
      setEditableContent(res.data.content);
    } catch (e) { alert("AI đang bận!"); } finally { setLoading(false); }
  };

  const handlePostAction = async () => {
    if (!editableContent || selectedPageIds.length === 0) return alert("Chưa chọn nội dung hoặc Page!");
    if (selectedImages.length === 0) return alert("Hãy chọn ít nhất 1 tấm ảnh/video đẹp nhé!");

    setPosting(true);
    try {
      if (isScheduling) {
        if (!scheduleDate) return alert("Vui lòng chọn ngày giờ hẹn lịch!");
        
        // 🚀 ĐÃ SỬA LỖI MÚI GIỜ CHỖ NÀY: Ép sang chuẩn UTC trước khi gửi
        const isoDate = new Date(scheduleDate).toISOString();

        await axios.post(`${API_URL}/social/schedule-batch`, {
          workspaceId,
          baseContent: editableContent,
          pageIds: selectedPageIds,
          imageUrls: selectedImages,
          productUrl: productUrl,
          scheduledAt: isoDate, // Gửi biến đã ép chuẩn ISO
          spinContent: spinContent 
        });
        
        alert(`🚀 Thành công! Đã đưa ${selectedPageIds.length} bài viết vào lịch chờ đăng.`);
      } else {
        const pagesToPost = accounts.filter((acc: any) => selectedPageIds.includes(acc.platformId));
        // Lặp qua từng page và đăng ngay lập tức (Nếu spin=true, phải xào lại trên frontend vì API post lẻ ko xào)
        // Hiện tại AI Post lẻ tạm bỏ qua Spin để tối ưu tốc độ, chỉ Spin khi Hẹn giờ.
        for (const acc of pagesToPost) {
          await axios.post(`${API_URL}/social/facebook/post`, {
            pageId: acc.platformId, 
            accessToken: acc.accessToken, 
            message: editableContent, 
            imageUrls: selectedImages, 
            productUrl: productUrl 
          });
        }
        alert(`🚀 Thành công! Đã xuất bản lên ${selectedPageIds.length} Page.`);
      }
    } catch (error: any) { 
      console.error("CHI TIẾT LỖI GỌI API ĐĂNG BÀI:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Lỗi không xác định";
      alert(`Lỗi API: ${errorMessage}\nHãy mở tab Console (F12) để xem chi tiết.`); 
    } finally { setPosting(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-black font-sans">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-black text-center mb-10 italic uppercase text-slate-900 tracking-tighter">AI CONTENT CREATOR</h1>

        <div className="mb-10 bg-white p-6 rounded-[32px] border shadow-sm text-black">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center gap-2">
                <ImageIcon size={14} className="text-blue-600" /> Bộ sưu tập ảnh sản phẩm ({selectedImages.length}/10)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div onClick={() => fileInputRef.current?.click()} className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-4 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all bg-slate-50">
                  <Plus size={32} className="mb-2" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Thêm Media</span>
                  <input type="file" multiple accept="image/*,video/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload}/>
                </div>
                {availableImages.map((url, idx) => (
                    <div key={idx} onClick={() => setSelectedImages(prev => prev.includes(url) ? prev.filter(u => u !== url) : (prev.length < 10 ? [...prev, url] : prev))}
                         className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-4 transition-all ${selectedImages.includes(url) ? 'border-blue-600 scale-95 shadow-md' : 'border-white opacity-40'}`}>
                        <img src={url} className="w-full h-full object-cover" alt="media" />
                        {selectedImages.includes(url) && <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1"><CheckCircle2 size={16} /></div>}
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-2xl border mb-10 text-black">
          <textarea className="w-full p-6 bg-slate-50 border-none rounded-[32px] outline-none text-xl min-h-[140px] text-slate-900 font-bold focus:bg-white transition-all" placeholder="Mô tả ý tưởng của bạn (vd: Viết bài bán áo thun mùa hè)..." value={topic} onChange={(e) => setTopic(e.target.value)} />
          <button onClick={handleGenerateContent} disabled={loading} className="w-full mt-6 bg-black text-white font-black py-5 rounded-3xl shadow-lg flex items-center justify-center gap-3 hover:bg-slate-800 transition-all">
             {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={22} />} SÁNG TẠO BÀI VIẾT VỚI AI
          </button>
        </div>

        {result && (
          <div className="bg-white p-8 rounded-[45px] shadow-2xl border-l-[16px] border-blue-600 mb-10 text-black animate-in fade-in slide-in-from-bottom-10">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black uppercase italic">Nội dung đề xuất gốc</h2>
                <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded-xl ${isEditing ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}><Edit3 size={18}/></button>
             </div>
             <textarea className={`w-full p-6 rounded-[24px] text-lg leading-relaxed outline-none border-2 transition-all mb-8 ${isEditing ? 'border-orange-200 bg-orange-50/10' : 'border-transparent bg-slate-50'}`} rows={6} value={editableContent} readOnly={!isEditing} onChange={(e) => setEditableContent(e.target.value)} />
             
             {/* LUÔN HIỆN NÚT SPIN */}
             <label className="flex items-center gap-2 cursor-pointer bg-orange-50 p-4 rounded-2xl border border-orange-100 mb-6 hover:bg-orange-100 transition-colors">
                  <input type="checkbox" className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500" checked={spinContent} onChange={(e) => setSpinContent(e.target.checked)} />
                  <div className="flex flex-col">
                    <span className="text-sm font-black uppercase text-orange-700 flex items-center gap-1">
                      <Shuffle size={16} /> Bật AI Spin Trộn nội dung (Chống Spam)
                    </span>
                    <span className="text-xs text-orange-600 font-medium leading-tight mt-1">
                      Khi Lên Lịch, Hệ thống sẽ dùng AI viết lại {selectedPageIds.length || 'nhiều'} phiên bản nội dung hoàn toàn khác nhau cho từng Page.
                    </span>
                  </div>
             </label>

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
                          <input type="datetime-local" className="w-full bg-white border-2 border-blue-100 px-4 py-3 rounded-2xl text-xs font-bold text-blue-600 outline-none" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
                        </div>
                    )}
                </div>
             </div>

             <div className="mb-8 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 text-black"><FolderCheck size={14} /> Nhóm Fanpage theo Folder</h3>
                    <div className="flex gap-2 text-black">
                        <input placeholder="Tên Folder..." className="px-4 py-2 rounded-xl text-xs bg-white border outline-none font-bold text-black" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                        <button onClick={() => {
                            if(!newGroupName || selectedPageIds.length === 0) return alert("Nhập tên và chọn Page!");
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
                {posting ? <Loader2 className="animate-spin" /> : (
                  <>
                    <Globe size={24} /> 
                    {isScheduling ? (spinContent ? 'LÊN LỊCH & SPIN NỘI DUNG 🚀' : 'ĐƯA VÀO HÀNG CHỜ ĐĂNG 🚀') : 'XUẤT BẢN NGAY 🚀'}
                  </>
                )}
             </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiMarketingPage() {
  return (<Suspense fallback={<div className="p-20 text-center font-black animate-pulse text-slate-300">LOADING AI SYSTEM...</div>}><AiMarketingContent /></Suspense>);
}