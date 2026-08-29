"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Clock, Calendar, Loader2, Trash2, RefreshCw, Edit } from "lucide-react";

export default function SchedulePage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States cho tính năng Chỉnh sửa
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    const savedId = localStorage.getItem("workspaceId");
    if (savedId) setWorkspaceId(savedId);
    else setWorkspaceId("workspace-01");
  }, []);

  const fetchPosts = useCallback(async () => {
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
  }, [workspaceId, API_URL]);

  useEffect(() => {
    if (workspaceId) fetchPosts();
  }, [workspaceId, fetchPosts]);

  // --- XÓA BÀI ---
  const handleDelete = async (postId: string) => {
    if(!confirm("Bạn có chắc chắn muốn xóa bài viết này khỏi lịch đăng?")) return;
    try {
      await axios.delete(`${API_URL}/social/scheduled-posts/${postId}`);
      setPosts(posts.filter(p => p.id !== postId));
      alert("Xóa thành công!");
    } catch (error) {
      console.error("Lỗi xóa bài:", error);
      alert("Xóa thất bại. Kiểm tra kết nối máy chủ.");
    }
  };

  // --- MỞ POPUP SỬA BÀI ---
  const openEditModal = (post: any) => {
    setEditingPost(post);
    // Bóc tách thẻ [KPOST_META] ra để lúc sửa không nhìn thấy thẻ ẩn đó
    const cleanContent = (post.content || "").replace(/\[KPOST_META\].*?\[\/KPOST_META\]/s, '').trim();
    setEditContent(cleanContent);
  };

  // --- LƯU CHỈNH SỬA ---
  const saveEdit = async () => {
    try {
      // Tìm lại thẻ Meta cũ để giữ nguyên ảnh và pageId
      const metaMatch = editingPost.content.match(/(\[KPOST_META\].*?\[\/KPOST_META\])/s);
      const metaTag = metaMatch ? `\n\n${metaMatch[1]}` : '';
      const finalContent = editContent + metaTag;

      await axios.patch(`${API_URL}/social/scheduled-posts/${editingPost.id}`, {
        content: finalContent
      });

      setPosts(posts.map(p => p.id === editingPost.id ? { ...p, content: finalContent } : p));
      setEditingPost(null);
      alert("Lưu thay đổi thành công!");
    } catch(error) {
      alert("Lỗi khi lưu bài viết.");
    }
  };

  // --- GỘP NHÓM THEO NGÀY ---
  const sortedPosts = [...posts].sort((a, b) => {
    return new Date(a.scheduledAt || a.createdAt).getTime() - new Date(b.scheduledAt || b.createdAt).getTime();
  });

  const groupedPosts: Record<string, any[]> = {};
  sortedPosts.forEach(post => {
    const d = new Date(post.scheduledAt || post.createdAt);
    const dateKey = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    if (!groupedPosts[dateKey]) groupedPosts[dateKey] = [];
    groupedPosts[dateKey].push(post);
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen text-slate-900 font-sans relative">
      
      {/* MODAL CHỈNH SỬA (Hiện lên khi bấm nút) */}
      {editingPost && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] p-6 w-full max-w-2xl shadow-xl transform transition-all">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Edit className="text-blue-600"/> Chỉnh sửa nội dung</h3>
            <textarea 
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              placeholder="Nhập nội dung bài đăng..."
              className="w-full h-64 border border-slate-300 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none text-sm"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setEditingPost(null)} className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors">Hủy bỏ</button>
              <button onClick={saveEdit} className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-colors shadow-md hover:shadow-lg">Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="h-20 px-8 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white"><Calendar size={20} /></div>
            Quản lý lịch đăng bài
          </h1>
          <p className="text-xs text-slate-500 mt-1">Danh sách trực quan, dễ dàng theo dõi hàng loạt</p>
        </div>
        <button onClick={fetchPosts} className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm flex items-center gap-2 text-sm font-semibold text-slate-700">
          <RefreshCw size={16} className={`${loading ? "animate-spin" : ""}`} /> Làm mới
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto pb-20">
          {loading && posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="animate-spin mb-4 text-blue-600" size={32} />
              <p className="text-sm font-medium">Đang tải lịch trình...</p>
            </div>
          ) : (
            <>
              {Object.entries(groupedPosts).map(([dateKey, dailyPosts]) => (
                <div key={dateKey} className="mb-10 bg-white p-6 rounded-[24px] border shadow-sm">
                   <div className="flex items-center justify-between border-b pb-4 mb-4">
                      <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                         <Calendar size={20} className="text-blue-600" /> Ngày đăng: {dateKey}
                      </h2>
                      <div className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                         Số bài chờ đăng: {dailyPosts.length}
                      </div>
                   </div>
                   
                   <div className="mb-3 text-xs font-black uppercase text-slate-400 tracking-widest px-2">Danh sách bài đăng:</div>
                   
                   <div className="flex flex-col gap-3">
                      {dailyPosts.map((post) => {
                         const d = new Date(post.scheduledAt || post.createdAt);
                         const timeString = `${d.getHours().toString().padStart(2, '0')}h:${d.getMinutes().toString().padStart(2, '0')}`;
                         
                         // Loại bỏ thẻ meta khi hiển thị ngoài giao diện
                         const displayContent = (post.content || "").replace(/\[KPOST_META\].*?\[\/KPOST_META\]/s, '').trim();

                         return (
                           <div key={post.id} className="flex flex-col md:flex-row md:items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors gap-4">
                              <div className="flex-1 min-w-0">
                                 <p className="text-sm font-bold text-slate-800 line-clamp-2" title={displayContent}>
                                   {displayContent}
                                 </p>
                                 <div className="flex gap-2 mt-2">
                                    <button onClick={() => openEditModal(post)} className="text-[10px] bg-white border border-slate-200 px-3 py-1 rounded-lg font-black text-blue-600 hover:bg-blue-50 uppercase flex items-center gap-1">
                                      <Edit size={12}/> Chỉnh sửa
                                    </button>
                                    <button onClick={() => handleDelete(post.id)} className="text-[10px] bg-white border border-slate-200 px-3 py-1 rounded-lg font-black text-red-500 hover:bg-red-50 uppercase flex items-center gap-1">
                                      <Trash2 size={12}/> Xóa
                                    </button>
                                 </div>
                              </div>
                              
                              <div className="md:w-48 shrink-0 flex items-center gap-2 text-slate-600 text-sm font-medium border-l border-slate-200 pl-4">
                                  <div className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">F</div>
                                  <span className="truncate">Fanpage Mục Tiêu</span>
                              </div>
                              
                              <div className="md:w-40 shrink-0 flex items-center gap-2 text-slate-900 text-sm font-black border-l border-slate-200 pl-4">
                                  <Clock size={16} className="text-orange-500" /> Đăng lúc: {timeString}
                              </div>
                           </div>
                         );
                      })}
                   </div>
                </div>
              ))}
              
              {sortedPosts.length === 0 && (
                 <div className="text-center py-20 text-slate-500">
                     <Calendar size={48} className="mx-auto mb-4 text-slate-300 opacity-50" />
                     <p className="font-medium">Chưa có bài viết nào được lên lịch.</p>
                 </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}