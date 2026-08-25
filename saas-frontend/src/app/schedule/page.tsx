"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { 
  Clock, 
  Calendar, 
  Loader2, 
  Trash2, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Edit,
  CheckCircle2
} from "lucide-react";

export default function SchedulePage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const savedId = localStorage.getItem("workspaceId");
    if (savedId) setWorkspaceId(savedId);
    else setWorkspaceId("workspace-01");
  }, []);

  const fetchPosts = useCallback(async () => {
    if (!workspaceId) return; 
    setLoading(true);
    try {
      // Sửa lại endpoint nếu cần. Giả định API trả về mảng các bài viết có trường `scheduledAt` hoặc `createdAt`
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

  // --- LOGIC CALENDAR ---
  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Tìm ngày bắt đầu của tuần (Chủ nhật = 0)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // Tìm ngày kết thúc của calendar lưới (luôn đủ 35 hoặc 42 ô)
    const endDate = new Date(lastDay);
    if (endDate.getDay() !== 6) {
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    }

    const days = [];
    const d = new Date(startDate);
    while (d <= endDate) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  const monthYearString = currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  const today = new Date();

  // Handle Delete Action
  const handleDelete = async (postId: string) => {
    if(!confirm("Bạn có chắc chắn muốn xóa lịch đăng bài này?")) return;
    try {
      // Giả định API delete:
      // await axios.delete(`${API_URL}/social/scheduled-posts/${postId}`);
      
      // Update local state temporarily (remove this if you want to refetch instead)
      setPosts(posts.filter(p => p.id !== postId));
      alert("Xóa thành công!");
    } catch (error) {
      console.error("Lỗi xóa bài:", error);
      alert("Không thể xóa bài viết. Vui lòng thử lại.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen text-slate-900 font-sans">
      
      {/* Header */}
      <div className="h-20 px-8 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <Calendar size={20} />
            </div>
            Quản lý lịch đăng bài
          </h1>
          <p className="text-xs text-slate-500 mt-1">Theo dõi các bài viết đã lên lịch và đã đăng</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 border border-slate-200">
            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors shadow-sm"><ChevronLeft size={18} /></button>
            <span className="px-4 text-sm font-semibold capitalize w-36 text-center">{monthYearString}</span>
            <button onClick={handleNextMonth} className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors shadow-sm"><ChevronRight size={18} /></button>
          </div>
          
          <button onClick={fetchPosts} className="p-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm group">
            <RefreshCw size={18} className={`text-slate-500 group-hover:text-blue-600 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Content - Calendar Grid */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full min-h-[600px]">
          
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 shrink-0">
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
              <div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 border-r border-slate-200 last:border-0">
                {day}
              </div>
            ))}
          </div>

          {/* Loading State Overlay */}
          {loading && calendarDays.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="animate-spin mb-4 text-blue-600" size={32} />
              <p className="text-sm font-medium">Đang tải lịch trình...</p>
            </div>
          ) : (
            <div className="grid grid-cols-7 flex-1 auto-rows-[minmax(120px,1fr)]">
              {calendarDays.map((date, i) => {
                const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                
                // Lọc bài viết cho ngày này
                // LƯU Ý: Phải parse chính xác trường date từ DB của bạn (createdAt hoặc scheduledAt)
                const dayPosts = posts.filter(p => {
                  const postDate = new Date(p.scheduledAt || p.createdAt); // Ưu tiên scheduledAt nếu có
                  return postDate.getDate() === date.getDate() && 
                         postDate.getMonth() === date.getMonth() && 
                         postDate.getFullYear() === date.getFullYear();
                });

                return (
                  <div key={i} className={`border-r border-b border-slate-200 last:border-r-0 p-2 group transition-colors ${
                    isCurrentMonth ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50 text-slate-400'
                  }`}>
                    
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-blue-600 text-white shadow-md' : (isCurrentMonth ? 'text-slate-700' : 'text-slate-400')
                      }`}>
                        {date.getDate()}
                      </span>
                    </div>

                    {/* Danh sách bài trong ngày */}
                    <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[140px] scrollbar-hide">
                      {dayPosts.map(post => {
                        const postDate = new Date(post.scheduledAt || post.createdAt);
                        // Logic xác định trạng thái: Đã qua (published) hay Tương lai (scheduled)
                        const isPublished = postDate < new Date(); 

                        return (
                          <div key={post.id} className={`group/item text-xs p-2 rounded-md border leading-snug flex flex-col gap-1 transition-all ${
                            isPublished 
                              ? 'bg-slate-100 border-slate-200 hover:bg-slate-200' // Đã đăng (Xám)
                              : 'bg-blue-50 border-blue-200 hover:bg-blue-100' // Chờ đăng (Xanh)
                          }`}>
                            
                            <div className="flex items-center justify-between">
                              <div className={`font-semibold flex items-center gap-1.5 ${isPublished ? 'text-slate-600' : 'text-blue-700'}`}>
                                {isPublished ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                {postDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              
                              {/* Actions (Hiện khi hover vào item) */}
                              <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1 transition-opacity">
                                <button className="p-1 hover:bg-white/60 rounded text-slate-500 hover:text-blue-600">
                                  <Edit size={12} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(post.id)}
                                  className="p-1 hover:bg-white/60 rounded text-slate-500 hover:text-red-600"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            <div className={`line-clamp-2 mt-0.5 ${isPublished ? 'text-slate-500' : 'text-slate-700'}`}>
                              {post.content}
                            </div>
                            
                            {post.userId && ( // Placeholder cho việc có ảnh đính kèm
                               <div className="text-[9px] mt-0.5 flex items-center gap-1 text-slate-500 font-medium">
                                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Có đính kèm ảnh
                               </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}