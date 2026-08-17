"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { MessageSquare, RefreshCw, User, Send, Loader2, MessageCircle, Globe } from "lucide-react";

export default function CommentsPage() {
  const [comments, setComments] = useState([]);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const workspaceId = "workspace-01";

  const fetchComments = async () => {
    setLoading(true);
    try {
      // 1. Gọi lệnh đồng bộ từ Facebook về
      await axios.post("http://localhost:3001/social/sync-inbox", { workspaceId });
      
      // 2. Lấy toàn bộ dữ liệu từ bảng InboxMessage
      const res = await axios.get(`http://localhost:3001/social/inbox?workspaceId=${workspaceId}`);
      
      console.log("DỮ LIỆU THỰC TẾ TRONG DATABASE:", res.data);

      // BƯỚC 2: TẠM THỜI KHÔNG LỌC ĐỂ KIỂM TRA DỮ LIỆU
      // Thay vì lọc 'comment', chúng ta hiện tất cả những gì lấy được
      setComments(res.data || []);
      
    } catch (e) { 
      console.error("Lỗi:", e); 
      alert("Lỗi kết nối Backend 3001!");
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchComments(); }, []);

  const handleReply = async (comment: any) => {
    const text = replyText[comment.id];
    if (!text || !text.trim()) return alert("Vui lòng nhập nội dung!");

    try {
      await axios.post("http://localhost:3001/social/comment-reply", {
        workspaceId,
        commentId: comment.platformId,
        text: text,
        pageName: comment.pageName
      });
      alert("Đã gửi phản hồi thành công! ✅");
      setReplyText({ ...replyText, [comment.id]: "" });
    } catch (error) { 
      alert("Lỗi khi phản hồi! Kiểm tra lại Token."); 
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black flex items-center gap-3">
          <div className="bg-pink-600 p-2 rounded-xl text-white shadow-lg"><MessageCircle size={28} /></div>
          Kiểm tra dữ liệu Hộp thư
        </h1>
        <button 
          onClick={fetchComments} 
          disabled={loading}
          className="bg-white px-6 py-3 rounded-2xl shadow-sm border font-bold flex items-center gap-2"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> 
          Làm mới dữ liệu
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {comments.length === 0 ? (
          <div className="bg-white p-20 text-center rounded-[40px] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold uppercase">Database đang trống rỗng</p>
            <p className="text-slate-300 text-sm mt-2">Hãy kiểm tra Terminal của Backend xem có báo lỗi khi quét tin nhắn không.</p>
          </div>
        ) : (
          comments.map((comment: any) => (
            <div key={comment.id} className="bg-white p-8 rounded-[36px] shadow-lg border border-white">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center font-black">{comment.senderName ? comment.senderName[0] : "?"}</div>
                  <div>
                    <p className="font-black text-slate-900">{comment.senderName}</p>
                    <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${comment.type === 'comment' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                            Loại: {comment.type || "Chưa xác định"}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold tracking-tighter italic">Nguồn: {comment.pageName}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-[24px] mb-8 border border-slate-100 italic">
                "{comment.content}"
              </div>

              <div className="flex gap-4">
                <input 
                  className="flex-1 p-4 bg-white border border-slate-200 rounded-[20px] outline-none text-black"
                  placeholder="Trả lời thử..."
                  value={replyText[comment.id] || ""}
                  onChange={(e) => setReplyText({ ...replyText, [comment.id]: e.target.value })}
                />
                <button 
                  onClick={() => handleReply(comment)}
                  className="bg-pink-600 text-white px-8 py-4 rounded-[20px] font-black"
                >
                  GỬI
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}