"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { 
  Radio, Video, Play, Square, RefreshCw, CheckCircle2, 
  AlertCircle, Upload, Film, Sparkles, Clock, Globe, 
  Layers, CheckSquare, Square as EmptySquare, ExternalLink,
  ChevronRight, Loader2, ShieldCheck, Flame
} from "lucide-react";

export default function LiveStreamPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Thông tin phiên người dùng
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  // Form kịch bản & cấu hình Live
  const [title, setTitle] = useState("🔴 [LIVESTREAM] SIÊU SALE TRỰC TIẾP CÙNG TRỢ LÝ AI");
  const [description, setDescription] = useState(
    "Chào mừng các bạn đến với buổi phát trực tiếp hôm nay!\n👉 Nhắn tin ngay để nhận ưu đãi độc quyền."
  );
  const [videoUrl, setVideoUrl] = useState("");
  const [isLoop, setIsLoop] = useState(true);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);

  // Trạng thái tải video & trạng thái Live
  const [isUploading, setIsUploading] = useState(false);
  const [isStartingLive, setIsStartingLive] = useState(false);
  const [activeStreams, setActiveStreams] = useState<any[]>([]);
  const [isCheckingActive, setIsCheckingActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. TẢI THÔNG TIN WORKSPACE & DANH SÁCH FANPAGE
  useEffect(() => {
    const savedWid = localStorage.getItem("workspaceId");
    if (savedWid) {
      setWorkspaceId(savedWid);
      fetchAccounts(savedWid);
      fetchActiveStreams(savedWid);
    } else {
      setIsLoadingAccounts(false);
    }
  }, []);

  // Định kỳ 10 giây quét lại trạng thái luồng Live
  useEffect(() => {
    if (!workspaceId) return;
    const interval = setInterval(() => {
      fetchActiveStreams(workspaceId, true);
    }, 10000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  const fetchAccounts = async (wid: string) => {
    try {
      setIsLoadingAccounts(true);
      const res = await axios.get(`${API_URL}/social/accounts?workspaceId=${wid}`);
      setAccounts(res.data || []);
      // Mặc định chọn tất cả Fanpage
      if (Array.isArray(res.data) && res.data.length > 0) {
        setSelectedPages(res.data.map((a: any) => a.platformId));
      }
    } catch (e) {
      console.error("Lỗi tải Fanpage:", e);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const fetchActiveStreams = async (wid: string, silent = false) => {
    try {
      if (!silent) setIsCheckingActive(true);
      const res = await axios.get(`${API_URL}/social/livestream/active?workspaceId=${wid}`);
      setActiveStreams(res.data || []);
    } catch (e) {
      console.error("Lỗi lấy luồng active:", e);
    } finally {
      if (!silent) setIsCheckingActive(false);
    }
  };

  // 2. TẢI FILE VIDEO MP4 TỪ MÁY LÊN (GỌI API UPLOAD-VIDEO CHUẨN MP4)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("mp4") && !file.type.includes("video")) {
      toast.error("Vui lòng chỉ chọn file video (định dạng MP4)!");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Đang xử lý và tải video MP4 lên máy chủ...");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result as string;

        try {
          // GỌI ENDPOINT /social/upload-video ĐỂ LƯU CHUẨN .MP4
          const res = await axios.post(`${API_URL}/social/upload-video`, {
            base64: base64Data,
            fileName: file.name
          });

          const uploadedUrl = res.data?.url || res.data?.urls?.[0];

          if (uploadedUrl) {
            setVideoUrl(uploadedUrl);
            toast.success("Tải video MP4 lên máy chủ thành công!", { id: toastId });
          } else {
            toast.error("Không nhận được đường dẫn video từ máy chủ", { id: toastId });
          }
        } catch (uploadErr: any) {
          // Fallback thử endpoint upload chung nếu server chưa reload
          try {
            const fallbackRes = await axios.post(`${API_URL}/social/upload`, {
              base64: base64Data
            });
            const fallbackUrl = fallbackRes.data?.urls?.[0];
            if (fallbackUrl) {
              setVideoUrl(fallbackUrl);
              toast.success("Tải video thành công!", { id: toastId });
            } else {
              throw new Error("Lỗi tải video");
            }
          } catch (e: any) {
            toast.error(uploadErr.response?.data?.message || "Lỗi khi tải video lên máy chủ!", { id: toastId });
          }
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        toast.error("Lỗi khi đọc file từ máy tính", { id: toastId });
        setIsUploading(false);
      };
    } catch (err: any) {
      toast.error("Lỗi xử lý file video", { id: toastId });
      setIsUploading(false);
    }
  };

  // 3. CHỌN / BỎ CHỌN FANPAGE
  const togglePage = (pageId: string) => {
    if (selectedPages.includes(pageId)) {
      setSelectedPages(selectedPages.filter((id) => id !== pageId));
    } else {
      setSelectedPages([...selectedPages, pageId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedPages.length === accounts.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(accounts.map((a) => a.platformId));
    }
  };

  // 4. BẮT ĐẦU PHÁT LIVE HÀNG LOẠT
  const handleStartLive = async () => {
    if (!workspaceId) {
      return toast.error("Vui lòng đăng nhập trước khi phát Live!");
    }
    if (!videoUrl) {
      return toast.error("Vui lòng chọn hoặc tải lên một video AI / Video bán hàng!");
    }

    // Kiểm tra nếu link là ảnh tĩnh thì cảnh báo ngay
    const lowerUrl = videoUrl.toLowerCase();
    if (lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg") || lowerUrl.endsWith(".png") || lowerUrl.endsWith(".webp")) {
      return toast.error("File được chọn là ẢNH TĨNH (.jpg/.png). Vui lòng tải lên file VIDEO định dạng .mp4!");
    }

    if (selectedPages.length === 0) {
      return toast.error("Vui lòng tích chọn ít nhất 1 Fanpage!");
    }

    setIsStartingLive(true);
    const toastId = toast.loading(`Đang phát sóng lên ${selectedPages.length} Fanpage...`);

    try {
      const res = await axios.post(`${API_URL}/social/livestream/start`, {
        workspaceId,
        videoUrl,
        title,
        description,
        pageIds: selectedPages,
        loop: isLoop
      });

      toast.success(res.data?.message || "Đã bắt đầu phát sóng Live thành công!", { id: toastId });
      fetchActiveStreams(workspaceId);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Lỗi khi bắt đầu Livestream!";
      toast.error(msg, { id: toastId });
    } finally {
      setIsStartingLive(false);
    }
  };

  // 5. DỪNG LIVE TOÀN BỘ HOẶC TỪNG PAGE
  const handleStopLive = async (pageId?: string) => {
    const confirmMsg = pageId 
      ? "Bạn có chắc muốn dừng phát Live trên Fanpage này?" 
      : "Bạn có chắc muốn DỪNG TẤT CẢ các luồng Live đang phát?";
    if (!confirm(confirmMsg)) return;

    const toastId = toast.loading("Đang ngắt luồng phát...");
    try {
      await axios.post(`${API_URL}/social/livestream/stop`, {
        workspaceId,
        pageId
      });
      toast.success("Đã dừng phát Live thành công!", { id: toastId });
      fetchActiveStreams(workspaceId);
    } catch (err: any) {
      toast.error("Lỗi khi dừng Live!", { id: toastId });
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[36px] shadow-sm border border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-600/30">
                <Radio size={24} className="animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-2">
                  AI Livestream Studio <span className="bg-red-100 text-red-600 text-[10px] tracking-widest uppercase px-3 py-1 rounded-full font-black not-italic">Multi-Stream</span>
                </h1>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
                  Phát video nhân vật AI đồng thời lên hàng loạt Fanpage Facebook
                </p>
              </div>
            </div>
          </div>

          {/* TRẠNG THÁI LUỒNG LIVE ĐANG CHẠY */}
          <div className="flex items-center gap-3">
            {activeStreams.length > 0 ? (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 px-4 py-3 rounded-2xl">
                <span className="w-3 h-3 bg-red-600 rounded-full animate-ping"></span>
                <span className="text-xs font-black uppercase text-red-600 tracking-wider">
                  Đang phát: {activeStreams.length} Page
                </span>
                <button
                  onClick={() => handleStopLive()}
                  className="bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase px-3 py-1.5 rounded-xl shadow-md transition-all active:scale-95"
                >
                  Dừng tất cả
                </button>
              </div>
            ) : (
              <div className="bg-slate-100 text-slate-500 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2">
                <Square size={14} /> Hệ thống sẵn sàng
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* CỘT TRÁI: CẤU HÌNH VIDEO & NỘI DUNG LIVE (7 CỘT) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* BOX 1: CHỌN / TẢI LÊN VIDEO AI */}
            <div className="bg-white p-6 md:p-8 rounded-[36px] shadow-sm border border-slate-100 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  <Film className="text-blue-600" size={18} /> 1. Video Nhân Vật AI / Video Bán Hàng
                </h3>
                <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg">
                  Định dạng MP4
                </span>
              </div>

              {/* KHUNG PREVIEW VIDEO */}
              <div className="relative aspect-video bg-slate-950 rounded-3xl overflow-hidden flex items-center justify-center border border-slate-200 shadow-inner group">
                {videoUrl ? (
                  <video
                    key={videoUrl}
                    src={videoUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-6 text-slate-500 space-y-3">
                    <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-slate-400 mx-auto">
                      <Video size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-300">Chưa có video được chọn</p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Tải lên video nhân vật AI được xuất từ HeyGen, D-ID, SadTalker hoặc video giới thiệu sản phẩm của bạn (.mp4)
                    </p>
                  </div>
                )}

                {isUploading && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-2">
                    <Loader2 size={36} className="animate-spin text-blue-500" />
                    <p className="text-xs font-black uppercase tracking-widest">Đang tải video MP4 lên máy chủ...</p>
                  </div>
                )}
              </div>

              {/* TẢI LÊN HOẶC DÁN LINK */}
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="video/mp4,video/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex-1 py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-slate-900/10"
                  >
                    <Upload size={16} /> Chọn File Video MP4 Từ Máy
                  </button>
                  {videoUrl && (
                    <button
                      type="button"
                      onClick={() => setVideoUrl("")}
                      className="px-4 py-4 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-2xl font-black text-xs uppercase transition-all"
                    >
                      Đổi Video
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Hoặc dán URL video trực tiếp (Link .mp4)
                  </label>
                  <input
                    type="text"
                    placeholder="https://domain.com/my-ai-video.mp4"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-bold outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* BOX 2: TIÊU ĐỀ & NỘI DUNG LIVESTREAM */}
            <div className="bg-white p-6 md:p-8 rounded-[36px] shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Sparkles className="text-amber-500" size={18} /> 2. Kịch Bản & Tiêu Đề Phát Sóng
              </h3>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Tiêu đề Livestream
                </label>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề Livestream..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Mô tả bài Live / Link chốt đơn
                </label>
                <textarea
                  rows={3}
                  placeholder="Nhập nội dung mô tả, link mua hàng, số hotline..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-600 resize-none"
                />
              </div>

              {/* TÙY CHỌN LẶP VÒNG VIDEO */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer" onClick={() => setIsLoop(!isLoop)}>
                <div>
                  <p className="text-xs font-black uppercase text-slate-900">Phát lặp vòng vô hạn (Loop)</p>
                  <p className="text-[11px] font-bold text-slate-400">
                    Video AI sẽ tự động lặp lại liên tục cho đến khi bạn bấm Dừng Live
                  </p>
                </div>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white ${isLoop ? "bg-blue-600" : "bg-slate-300"}`}>
                  <CheckCircle2 size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: CHỌN FANPAGE & ĐIỀU KHIỂN PHÁT (5 CỘT) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* BOX 3: DANH SÁCH FANPAGE MUỐN PHÁT SÓNG */}
            <div className="bg-white p-6 md:p-8 rounded-[36px] shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                    <Globe className="text-green-600" size={18} /> 3. Chọn Fanpage Phát Sóng
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                    Đã chọn: <strong className="text-blue-600">{selectedPages.length}</strong> / {accounts.length} Fanpage
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-xl transition-all"
                >
                  {selectedPages.length === accounts.length ? "Bỏ chọn hết" : "Chọn tất cả"}
                </button>
              </div>

              {isLoadingAccounts ? (
                <div className="py-12 text-center text-slate-400 font-bold flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin text-blue-600" /> Đang quét danh sách Fanpage...
                </div>
              ) : accounts.length === 0 ? (
                <div className="py-8 text-center text-slate-400 font-bold space-y-2">
                  <AlertCircle className="mx-auto text-amber-500" size={32} />
                  <p className="text-xs">Chưa có Fanpage nào được kết nối.</p>
                  <a href="/social" className="text-xs text-blue-600 underline font-black">
                    Kết nối Fanpage ngay
                  </a>
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {accounts.map((acc) => {
                    const isChecked = selectedPages.includes(acc.platformId);
                    const isLive = activeStreams.some((s) => s.pageId === acc.platformId);

                    return (
                      <div
                        key={acc.id}
                        onClick={() => togglePage(acc.platformId)}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                          isChecked
                            ? "border-blue-500 bg-blue-50/40"
                            : "border-slate-100 bg-slate-50/50 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden pr-2">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${isChecked ? "bg-blue-600 text-white" : "border border-slate-300 bg-white"}`}>
                            {isChecked && <CheckCircle2 size={14} />}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-black text-slate-800 truncate" title={acc.accountName}>
                              {acc.accountName}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400">ID: {acc.platformId}</p>
                          </div>
                        </div>

                        {isLive && (
                          <span className="bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 animate-pulse">
                            <Flame size={10} /> Live
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* NÚT BẮT ĐẦU PHÁT LIVE LỚN */}
              <button
                type="button"
                onClick={handleStartLive}
                disabled={isStartingLive || isUploading || selectedPages.length === 0 || !videoUrl}
                className="w-full py-5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-[24px] font-black uppercase tracking-wider text-sm shadow-xl shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-3 mt-4"
              >
                {isStartingLive ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> Đang đẩy luồng phát...
                  </>
                ) : (
                  <>
                    <Radio size={20} /> Phát Live Lên {selectedPages.length} Fanpage Ngay 🚀
                  </>
                )}
              </button>
            </div>

            {/* BOX 4: THEO DÕI CÁC LUỒNG ĐANG HOẠT ĐỘNG (REALTIME MONITOR) */}
            {activeStreams.length > 0 && (
              <div className="bg-white p-6 md:p-8 rounded-[36px] shadow-sm border border-red-100 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
                    <Flame size={18} /> Các Luồng Đang Phát ({activeStreams.length})
                  </h3>
                  <button
                    onClick={() => fetchActiveStreams(workspaceId)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                    title="Làm mới"
                  >
                    <RefreshCw size={14} className={isCheckingActive ? "animate-spin" : ""} />
                  </button>
                </div>

                <div className="space-y-3">
                  {activeStreams.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-black text-slate-800">{s.pageName}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Bắt đầu: {new Date(s.startTime).toLocaleTimeString("vi-VN")}
                        </p>
                      </div>

                      <button
                        onClick={() => handleStopLive(s.pageId)}
                        className="bg-slate-200 hover:bg-red-600 hover:text-white text-slate-700 font-bold text-[10px] uppercase px-3 py-1.5 rounded-xl transition-all"
                      >
                        Dừng Page Này
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}