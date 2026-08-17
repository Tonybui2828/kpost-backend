"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { Clock, Calendar, CheckCircle2, LayoutList, Loader2, Trash2 } from "lucide-react";

export default function SchedulePage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const workspaceId = "workspace-01";

  // Hàm lấy danh sách bài chờ đăng từ Backend
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:3001/social/scheduled-posts?workspaceId=${workspaceId}`);
      setPosts(res.data || []);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu lịch trình:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-900 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-5xl mx-auto">
        {/* Tiêu đề */}
        <div className="flex justify-between items-center mb-10">
            <h1 className="text-3xl font-black flex items-center gap-3 text-slate-800">
                <div className="bg-orange-500 p-2 rounded-xl text-white shadow-lg shadow-orange-100">
                    <Clock size={28} />
                </div>
                Lịch đăng bài tự động
            </h1>
            <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-widest">
                Đang chờ: {posts.length} bài viết
            </div>
        </div>

        {/* Nội dung danh sách */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="font-medium italic">Đang tải lịch trình đăng bài...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white p-20 text-center rounded-[40px] border-2 border-dashed border-slate-200">
            <LayoutList size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium text-lg">Hiện không có bài viết nào đang chờ đăng.</p>
            <p className="text-slate-300 text-sm mt-1">Hãy quay lại trang chủ để lên lịch cho bài viết AI của bạn!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {posts.map((post: any) => (
              <div key={post.id} className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col md:flex-row gap-8 items-start relative group">
                 {/* Cột thời gian */}
                 <div className="bg-orange-50 text-orange-600 p-5 rounded-3xl font-black text-center min-w-[140px] border border-orange-100">
                    <Calendar size={24} className="mx-auto mb-2" />
                    <div className="text-[10px] uppercase opacity-60">Sẽ đăng vào</div>
                    <div className="text-sm mt-1">
                        {new Date(post.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-[10px] mt-1 opacity-80">
                        {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                 </div>

                 {/* Cột nội dung */}
                 <div className="flex-1">
                    <div className="flex justify-between items-center mb-4">
                        <span className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter italic">
                            <CheckCircle2 size={12} /> Auto Schedule Mode
                        </span>
                        <button className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={18} />
                        </button>
                    </div>
                    <div className="text-slate-700 leading-relaxed text-lg bg-slate-50/50 p-6 rounded-2xl border border-slate-50 italic">
                        "{post.content}"
                    </div>
                    
                    {post.userId && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 font-medium">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            Đã đính kèm ảnh sản phẩm
                        </div>
                    )}
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}