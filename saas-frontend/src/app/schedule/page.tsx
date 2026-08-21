"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { Clock, Calendar, CheckCircle2, LayoutList, Loader2, Trash2, RefreshCw } from "lucide-react";

export default function SchedulePage() {
  // --- 1. LẤY URL API ĐỘNG TỪ BIẾN MÔI TRƯỜNG ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // --- SỬA TẠI ĐÂY: BIẾN ĐỘNG CHO WORKSPACE ID ---
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Lấy Workspace ID từ máy người dùng ngay khi vừa mở trang
  useEffect(() => {
    const savedId = localStorage.getItem("workspaceId");
    if (savedId) {
      setWorkspaceId(savedId);
    } else {
      setWorkspaceId("workspace-01"); // Dự phòng nếu chưa đăng nhập
    }
  }, []);

  // Tự động tải lịch đăng bài khi đã bốc được Workspace ID
  useEffect(() => {
    if (workspaceId) {
      fetchPosts();
    }
  }, [workspaceId]); // <--- Chạy lại khi ID thay đổi

  const fetchPosts = async () => {
    if (!workspaceId) return; 
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/social/scheduled-posts?workspaceId=${workspaceId}`);
      setPosts(res.data || []);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu lịch trình:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // ... (Phần còn lại của trang giữ nguyên)

  // --- 2. SỬA LỖI TYPESCRIPT (Thêm <any[]>) ---
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- 3. SỬA LINK GỌI API ---
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/social/scheduled-posts?workspaceId=${workspaceId}`);
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
    <div className="p-8 bg-slate-50 min-h-screen text-slate-900 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Tiêu đề */}
        <div className="flex justify-between items-center mb-10">
            <div>
                <h1 className="text-3xl font-black flex items-center gap-3 text-slate-800 italic uppercase tracking-tighter">
                    <div className="bg-orange-500 p-2 rounded-xl text-white shadow-lg shadow-orange-100">
                        <Clock size={28} />
                    </div>
                    Lịch đăng bài tự động
                </h1>
                <p className="text-slate-400 text-[10px] font-bold uppercase mt-2 tracking-widest ml-12">Hệ thống AI tự động xếp lịch</p>
            </div>
            <div className="flex items-center gap-3">
                <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 text-xs font-black text-slate-500 uppercase tracking-widest">
                    Chờ đăng: {posts.length} bài
                </div>
                <button onClick={fetchPosts} className="p-3 bg-white border rounded-2xl hover:bg-slate-50 transition-all shadow-sm group">
                    <RefreshCw size={20} className={`text-slate-400 group-hover:text-orange-500 ${loading ? "animate-spin" : ""}`} />
                </button>
            </div>
        </div>

        {/* Nội dung danh sách */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-[40px] shadow-sm border">
            <Loader2 className="animate-spin mb-4 text-orange-500" size={40} />
            <p className="font-black uppercase text-xs tracking-widest italic text-slate-300">Đang quét lịch trình bài viết...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white p-24 text-center rounded-[40px] border-2 border-dashed border-slate-200 shadow-inner">
            <LayoutList size={56} className="mx-auto text-slate-100 mb-6" />
            <p className="text-slate-400 font-black uppercase text-sm tracking-tighter">Hiện không có bài viết nào đang chờ</p>
            <p className="text-slate-300 text-xs mt-2 font-medium italic">Hãy quay lại trang chủ để lên lịch cho bài viết AI của bạn!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {posts.map((post: any) => (
              <div key={post.id} className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-100 hover:border-orange-200 transition-all flex flex-col md:flex-row gap-8 items-start relative group animate-in fade-in slide-in-from-bottom-4 duration-500">
                 {/* Cột thời gian */}
                 <div className="bg-orange-50 text-orange-600 p-6 rounded-[28px] font-black text-center min-w-[150px] border border-orange-100 shadow-inner">
                    <Calendar size={24} className="mx-auto mb-3" />
                    <div className="text-[9px] uppercase font-bold tracking-widest opacity-50">Ngày đăng dự kiến</div>
                    <div className="text-xl mt-1 tracking-tighter">
                        {new Date(post.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-[10px] mt-1 font-bold">
                        {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                 </div>

                 {/* Cột nội dung */}
                 <div className="flex-1 w-full">
                    <div className="flex justify-between items-center mb-5">
                        <span className="flex items-center gap-2 text-[9px] font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full uppercase tracking-tighter shadow-sm border border-blue-100">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                            Auto Post Queued
                        </span>
                        <button className="p-2 text-slate-200 hover:text-red-500 transition-colors bg-slate-50 rounded-xl hover:bg-red-50">
                            <Trash2 size={18} />
                        </button>
                    </div>
                    <div className="text-slate-800 leading-relaxed text-lg bg-slate-50/50 p-6 rounded-3xl border border-slate-100 italic font-medium shadow-inner">
                        "{post.content}"
                    </div>
                    
                    {post.userId && (
                        <div className="mt-5 flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-white w-fit px-4 py-2 rounded-xl border">
                            <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                            Ảnh sản phẩm đã đính kèm
                        </div>
                    )}
                 </div>

                 {/* Hiệu ứng hover */}
                 <div className="absolute top-1/2 -right-1 w-1 h-12 bg-orange-500 rounded-l-full opacity-0 group-hover:opacity-100 transition-all"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}