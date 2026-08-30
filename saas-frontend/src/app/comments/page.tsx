"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { RefreshCw, Send, Loader2, MessageCircle, Sparkles, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export default function CommentsPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const [comments, setComments] = useState<any[]>([]);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState<{ [key: string]: boolean }>({});
  const [repliedIds, setRepliedIds] = useState<string[]>([]); // Lưu vết những comment đã trả lời để đổi màu
  
  const [workspaceId, setWorkspaceId] = useState<string>("");

  useEffect(() => {
    const savedId = localStorage.getItem("workspaceId");
    setWorkspaceId(savedId || "workspace-01"); 
  }, []);

  const fetchComments = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/social/sync-inbox`, { workspaceId });
      const res = await axios.get(`${API_URL}/social/inbox?workspaceId=${workspaceId}`);
      
      // 🚀 LỌC BỎ INBOX: Chỉ lấy những tin có type là 'comment'
      const onlyComments = (res.data || []).filter((c: any) => c.type === 'comment');
      
      // Sắp xếp bình luận mới nhất lên đầu (hoặc cũ nhất tùy bạn, ở đây xếp mới nhất)
      const sortedComments = onlyComments.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setComments(sortedComments);
    } catch (e) { 
      console.error("Lỗi kết nối:", e); 
      alert("Lỗi: Không tìm thấy cổng dữ liệu trên máy chủ!");
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    if (workspaceId) fetchComments(); 
  }, [workspaceId]);

  // --- HÀM TÍNH THỜI GIAN CHỜ ---
  const getWaitTime = (dateStr: string) => {
    if (!dateStr) return "";
    const diffMs = new Date().getTime() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ`;
    return `${Math.floor(diffHours / 24)} ngày`;
  };

  // --- HÀM GỌI AI TRẢ LỜI ---
  const handleAiSuggest = async (comment: any) => {
    setAiLoading({ ...aiLoading, [comment.id]: true });
    try {
      const res = await axios.post(`${API_URL}/ai-content/suggest-reply`, {
        message: comment.content,
        workspaceId
      });
      // Lấy kết quả AI điền thẳng vào ô text
      setReplyText({ ...replyText, [comment.id]: res.data });
    } catch (error) {
      alert("AI đang bận, vui lòng thử lại sau!");
    } finally {
      setAiLoading({ ...aiLoading, [comment.id]: false });
    }
  };

  // --- HÀM GỬI PHẢN HỒI LÊN FACEBOOK ---
  const handleReply = async (comment: any) => {
    const text = replyText[comment.id];
    if (!text || !text.trim()) return alert("Vui lòng nhập nội dung!");

    try {
      await axios.post(`${API_URL}/social/comment-reply`, {
        workspaceId,
        commentId: comment.platformId,
        text: text,
        pageName: comment.pageName
      });
      alert("Đã gửi phản hồi thành công! ✅");
      
      // Xóa chữ trong ô input và Đánh dấu là đã trả lời (để chuyển màu thẻ)
      setReplyText({ ...replyText, [comment.id]: "" });
      if (!repliedIds.includes(comment.id)) {
          setRepliedIds([...repliedIds, comment.id]);
      }
    } catch (error) { 
      alert("Lỗi khi phản hồi! Kiểm tra lại kết nối mạng."); 
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800 font-sans">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black flex items-center gap-3 text-black italic uppercase tracking-tighter">
          <div className="bg-pink-600 p-2 rounded-xl text-white shadow-lg"><MessageCircle size={28} /></div>
          Quản lý Bình luận
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
        {loading && comments.length === 0 ? (
          <div className="text-center py-20 text-slate-400"><Loader2 className="animate-spin mx-auto" size={32} /></div>
        ) : comments.length === 0 ? (
          <div className="bg-white p-20 text-center rounded-[40px] border-2 border-dashed border-slate-200 shadow-inner">
            <p className="text-slate-400 font-black uppercase tracking-widest text-black">Chưa có bình luận nào</p>
          </div>
        ) : (
          comments.map((comment: any) => {
            // Kiểm tra xem comment đã được trả lời chưa (có cờ status từ DB hoặc đã thao tác ở frontend)
            const isReplied = comment.status === 'replied' || repliedIds.includes(comment.id);
            
            return (
              <div 
                key={comment.id} 
                className={`p-8 rounded-[36px] shadow-xl border animate-in fade-in slide-in-from-bottom-4 duration-500 transition-colors ${
                    isReplied 
                    ? 'bg-white border-slate-100 opacity-70' // Trạng thái Đã trả lời (Trắng)
                    : 'bg-emerald-50 border-emerald-300' // Trạng thái Chưa trả lời (Xanh lá)
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl border ${isReplied ? 'bg-slate-50 text-slate-400' : 'bg-emerald-100 text-emerald-600'}`}>
                      {comment.senderName ? comment.senderName[0] : "?"}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-lg">{comment.senderName || "Khách hàng"}</p>
                      <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase opacity-70">Từ Fanpage: {comment.pageName || "Unknown"}</span>
                      </div>
                    </div>
                  </div>

                  {/* THẺ TRẠNG THÁI (STATUS BADGE) */}
                  <div className="flex flex-col items-end gap-1">
                      {isReplied ? (
                         <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 px-3 py-1 rounded-full">
                            <CheckCircle2 size={12} /> Đã trả lời
                         </div>
                      ) : (
                         <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white px-3 py-1.5 rounded-full shadow-md animate-pulse">
                            <AlertCircle size={12} /> Trả lời ngay
                         </div>
                      )}
                      
                      {!isReplied && (
                         <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                            <Clock size={12} /> Đã chờ {getWaitTime(comment.createdAt)}
                         </p>
                      )}
                  </div>
                </div>

                <div className={`p-6 rounded-[24px] mb-8 border italic font-medium leading-relaxed ${isReplied ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-white border-emerald-100 text-emerald-900 shadow-inner'}`}>
                  "{comment.content}"
                </div>

                {/* KHU VỰC NHẬP VÀ GỌI AI */}
                <div className="flex gap-3">
                  <input 
                    className="flex-1 p-4 bg-white border border-slate-200 rounded-[20px] outline-none text-black font-bold focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
                    placeholder="Nhập nội dung phản hồi bình luận..."
                    value={replyText[comment.id] || ""}
                    onChange={(e) => setReplyText({ ...replyText, [comment.id]: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && handleReply(comment)}
                  />
                  
                  {/* NÚT AI */}
                  <button 
                    onClick={() => handleAiSuggest(comment)}
                    disabled={aiLoading[comment.id] || isReplied}
                    title="Dùng AI viết câu trả lời"
                    className="bg-orange-100 text-orange-600 px-5 py-4 rounded-[20px] font-black hover:bg-orange-200 shadow-sm transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center"
                  >
                    {aiLoading[comment.id] ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                  </button>

                  {/* NÚT GỬI */}
                  <button 
                    onClick={() => handleReply(comment)}
                    disabled={!replyText[comment.id]?.trim()}
                    className="bg-black text-white px-8 py-4 rounded-[20px] font-black hover:bg-slate-800 shadow-lg transition-all active:scale-95 disabled:opacity-30"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}