"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { MessageSquare, RefreshCw, User, Send, Loader2, MessageCircle, Globe } from "lucide-react";

export default function CommentsPage() {
  // --- 1. LẤY URL API ĐỘNG TỪ BIẾN MÔI TRƯỜNG ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

 // --- 2. ĐỊNH NGHĨA KIỂU DỮ LIỆU & ID ĐỘNG ---
  const [comments, setComments] = useState<any[]>([]);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  
  // Thay đổi ở đây: Lấy ID từ bộ nhớ máy thay vì viết cứng
  const [workspaceId, setWorkspaceId] = useState<string>("");

  useEffect(() => {
    // Khi trang web mở ra, bốc cái mã ID riêng của khách hàng này ra
    const savedId = localStorage.getItem("workspaceId");
    if (savedId) {
      setWorkspaceId(savedId);
    } else {
      setWorkspaceId("workspace-01"); // Dự phòng nếu khách chưa đăng nhập
    }
  }, []);

  // --- 3. SỬA LINK GỌI API CHO ĐÚNG ĐỊA CHỈ BACKEND ---
  const fetchComments = async () => {
    setLoading(true);
    try {
      // Gọi lệnh đồng bộ qua /social/sync-inbox
      await axios.post(`${API_URL}/social/sync-inbox`, { workspaceId });
      
      // Lấy dữ liệu tin nhắn qua /social/inbox (Phải có chữ /social mới hết lỗi 404)
      const res = await axios.get(`${API_URL}/social/inbox?workspaceId=${workspaceId}`);
      
      console.log("DỮ LIỆU TỪ BACKEND:", res.data);
      setComments(res.data || []);
      
    } catch (e) { 
      console.error("Lỗi kết nối:", e); 
      alert("Lỗi: Không tìm thấy cổng dữ liệu trên máy chủ!");
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchComments(); }, []);

  const handleReply = async (comment: any) => {
    const text = replyText[comment.id];
    if (!text || !text.trim()) return alert("Vui lòng nhập nội dung!");

    try {
      // Gửi phản hồi qua /social/comment-reply
      await axios.post(`${API_URL}/social/comment-reply`, {
        workspaceId,
        commentId: comment.platformId,
        text: text,
        pageName: comment.pageName
      });
      alert("Đã gửi phản hồi thành công! ✅");
      setReplyText({ ...replyText, [comment.id]: "" });
    } catch (error) { 
      alert("Lỗi khi phản hồi! Kiểm tra lại kết nối mạng."); 
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800 font-sans">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black flex items-center gap-3 text-black italic uppercase tracking-tighter">
          <div className="bg-pink-600 p-2 rounded-xl text-white shadow-lg"><MessageCircle size={28} /></div>
          Quản lý Hộp thư & Bình luận
        </h1>
        <button 
          onClick={fetchComments} 
          disabled={loading}
          className="bg-white px-6 py-3 rounded-2xl shadow-sm border font-bold flex items-center gap-2 hover:bg-slate-50 transition-all text-slate-600"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> 
          Làm mới dữ liệu
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {comments.length === 0 ? (
          <div className="bg-white p-20 text-center rounded-[40px] border-2 border-dashed border-slate-200 shadow-inner">
            <p className="text-slate-400 font-black uppercase tracking-widest text-black">Hộp thư đang trống</p>
            <p className="text-slate-300 text-sm mt-2 font-medium italic">Hãy nhấn nút "Làm mới" để quét tin nhắn từ Fanpage.</p>
          </div>
        ) : (
          comments.map((comment: any) => (
            <div key={comment.id} className="bg-white p-8 rounded-[36px] shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500 text-black">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl border">
                    {comment.senderName ? comment.senderName[0] : "?"}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-lg">{comment.senderName || "Khách hàng"}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${comment.type === 'comment' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                            {comment.type || "Message"}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase opacity-70">Nguồn: {comment.pageName || "Unknown"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-[24px] mb-8 border border-slate-100 italic text-slate-700 font-medium leading-relaxed">
                "{comment.content}"
              </div>

              <div className="flex gap-4">
                <input 
                  className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-[20px] outline-none text-black font-bold focus:bg-white focus:border-blue-500 transition-all shadow-sm"
                  placeholder="Nhập nội dung phản hồi nhanh..."
                  value={replyText[comment.id] || ""}
                  onChange={(e) => setReplyText({ ...replyText, [comment.id]: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleReply(comment)}
                />
                <button 
                  onClick={() => handleReply(comment)}
                  disabled={!replyText[comment.id]?.trim()}
                  className="bg-black text-white px-8 py-4 rounded-[20px] font-black hover:bg-slate-800 shadow-lg transition-all active:scale-95 disabled:opacity-30"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}