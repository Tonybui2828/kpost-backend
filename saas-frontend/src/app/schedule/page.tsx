"use client";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Clock, Calendar, Loader2, Trash2, RefreshCw, Edit } from "lucide-react";

export default function SchedulePage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [posts, setPosts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  const [editingPost, setEditingPost] = useState<any>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    const savedId = localStorage.getItem("workspaceId");
    setWorkspaceId(savedId || "workspace-01");
  }, []);

  const fetchPosts = useCallback(async () => {
    if (!workspaceId) return; 
    setLoading(true);
    try {
      const [postRes, accRes] = await Promise.all([
         axios.get(`${API_URL}/social/scheduled-posts?workspaceId=${workspaceId}`),
         axios.get(`${API_URL}/social/accounts?workspaceId=${workspaceId}`)
      ]);
      setPosts(postRes.data || []);
      setAccounts(accRes.data || []);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, API_URL]);

  useEffect(() => {
    if (workspaceId) fetchPosts();
  }, [workspaceId, fetchPosts]);

  const handleDelete = async (postId: string) => {
    if(!confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;
    try {
      await axios.delete(`${API_URL}/social/scheduled-posts/${postId}`);
      setPosts(posts.filter(p => p.id !== postId));
    } catch (error) {}
  };

  const openEditModal = (post: any) => {
    setEditingPost(post);
    const cleanContent = (post.content || "").replace(/\[KPOST_META\].*?\[\/KPOST_META\]/s, '').trim();
    setEditContent(cleanContent);
  };

  const saveEdit = async () => {
    try {
      const metaMatch = editingPost.content.match(/(\[KPOST_META\].*?\[\/KPOST_META\])/s);
      const metaTag = metaMatch ? `\n\n${metaMatch[1]}` : '';
      const finalContent = editContent + metaTag;

      await axios.patch(`${API_URL}/social/scheduled-posts/${editingPost.id}`, { content: finalContent });
      setPosts(posts.map(p => p.id === editingPost.id ? { ...p, content: finalContent } : p));
      setEditingPost(null);
    } catch(error) {}
  };

  const sortedPosts = [...posts].sort((a, b) => new Date(a.scheduledAt || a.createdAt).getTime() - new Date(b.scheduledAt || b.createdAt).getTime());

  const groupedPosts: Record<string, any[]> = {};
  sortedPosts.forEach(post => {
    const d = new Date(post.scheduledAt || post.createdAt);
    // 🚀 FIX LỖI TIMEZONE: Ép cứng giờ hiển thị là giờ Việt Nam (UTC + 7)
    const vnTime = new Date(d.getTime() + (7 * 60 * 60 * 1000));
    
    // Gom nhóm theo ngày Việt Nam
    const dateKey = `${vnTime.getUTCDate().toString().padStart(2, '0')}/${(vnTime.getUTCMonth() + 1).toString().padStart(2, '0')}/${vnTime.getUTCFullYear()}`;
    if (!groupedPosts[dateKey]) groupedPosts[dateKey] = [];
    groupedPosts[dateKey].push(post);
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen text-slate-900 font-sans relative">
      {editingPost && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] p-6 w-full max-w-2xl shadow-xl transform transition-all">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Edit className="text-blue-600"/> Chỉnh sửa nội dung</h3>
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="w-full h-64 border border-slate-300 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none text-sm" />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setEditingPost(null)} className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors">Hủy bỏ</button>
              <button onClick={saveEdit} className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-colors shadow-md hover:shadow-lg">Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}

      <div className="h-20 px-8 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800"><div className="bg-blue-600 p-1.5 rounded-lg text-white"><Calendar size={20} /></div>Quản lý lịch đăng bài</h1>
        </div>
        <button onClick={fetchPosts} className="px-4 py-2 bg-white border rounded-lg shadow-sm flex items-center gap-2 text-sm font-semibold text-slate-700">
          <RefreshCw size={16} className={`${loading ? "animate-spin" : ""}`} /> Làm mới
        </button>
      </div>

      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto pb-20">
          {loading && posts.length === 0 ? (
             <div className="text-center py-20 text-slate-400"><Loader2 className="animate-spin mx-auto" size={32} /></div>
          ) : (
            Object.entries(groupedPosts).map(([dateKey, dailyPosts]) => (
                <div key={dateKey} className="mb-10 bg-white p-6 rounded-[24px] border shadow-sm">
                   <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b pb-4 mb-4">
                      <Calendar size={20} className="text-blue-600" /> Ngày đăng: {dateKey} ({dailyPosts.length} bài)
                   </h2>
                   <div className="flex flex-col gap-3">
                      {dailyPosts.map((post) => {
                         const d = new Date(post.scheduledAt || post.createdAt);
                         
                         // 🚀 Đóng đinh hiển thị giờ VN (Bỏ qua sai lệch của máy tính/trình duyệt)
                         const vnTime = new Date(d.getTime() + (7 * 60 * 60 * 1000));
                         const timeString = `${vnTime.getUTCHours().toString().padStart(2, '0')}:${vnTime.getUTCMinutes().toString().padStart(2, '0')}`;
                         
                         const displayContent = (post.content || "").replace(/\[KPOST_META\].*?\[\/KPOST_META\]/s, '').trim();
                         
                         // LẤY TÊN THẬT CỦA FANPAGE TỪ META DATA
                         let targetPageId = "";
                         const metaMatch = post.content.match(/\[KPOST_META\](.*?)\[\/KPOST_META\]/s);
                         if (metaMatch && metaMatch[1]) {
                             try { targetPageId = JSON.parse(metaMatch[1]).pageId; } catch(e) {}
                         }
                         const accountMatch = accounts.find(a => a.platformId === targetPageId);
                         const pageName = accountMatch ? accountMatch.accountName : "Fanpage không xác định";

                         return (
                           <div key={post.id} className="flex flex-col md:flex-row md:items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-blue-200 gap-4">
                              <div className="flex-1 min-w-0">
                                 <p className="text-sm font-bold text-slate-800 line-clamp-2">{displayContent}</p>
                                 <div className="flex gap-2 mt-2">
                                    <button onClick={() => openEditModal(post)} className="text-[10px] bg-white border border-slate-200 px-3 py-1 rounded-lg font-black text-blue-600 uppercase flex items-center gap-1"><Edit size={12}/> Sửa</button>
                                    <button onClick={() => handleDelete(post.id)} className="text-[10px] bg-white border border-slate-200 px-3 py-1 rounded-lg font-black text-red-500 uppercase flex items-center gap-1"><Trash2 size={12}/> Xóa</button>
                                 </div>
                              </div>
                              <div className="md:w-48 shrink-0 flex items-center gap-2 text-blue-800 text-sm font-bold border-l border-slate-200 pl-4">
                                  <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-xs">F</div>
                                  <span className="truncate" title={pageName}>{pageName}</span>
                              </div>
                              <div className="md:w-40 shrink-0 flex items-center gap-2 text-slate-900 text-sm font-black border-l border-slate-200 pl-4">
                                  <Clock size={16} className="text-orange-500" /> {timeString}
                              </div>
                           </div>
                         );
                      })}
                   </div>
                </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}