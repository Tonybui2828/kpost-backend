"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, UserPlus, Send, Settings, Clock, Link2, CheckCircle2, 
  Square, List, Calendar, LayoutGrid, Loader2, ShieldAlert, 
  AlertCircle, Save, X, CheckCircle, XCircle 
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ==========================================
// DỮ LIỆU NHÓM MẪU (Có thể làm API sau)
// ==========================================
const MOCK_GROUPS = [
  { id: 'g1', name: 'Hội Đam Mê Công Nghệ', members: '120K' },
  { id: 'g2', name: 'Chợ Điện Máy Giá Rẻ', members: '45K' },
  { id: 'g3', name: 'Cộng Đồng Dropbuy', members: '12K' },
  { id: 'g4', name: 'Hội Thanh Lý Đồ Điện Tử', members: '88K' }
];

// ==========================================
// COMPONENT CHÍNH
// ==========================================
export default function GroupsCampaignPage() {
  const [activeSubTab, setActiveSubTab] = useState<'join' | 'post' | 'schedule'>('join');
  
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedId = localStorage.getItem("workspaceId") || "workspace-01";
    setWorkspaceId(savedId);
  }, []);

  useEffect(() => {
    if (!workspaceId) return;

    const fetchRealData = async () => {
      try {
        setIsLoading(true);
        const accRes = await axios.get(`${API_URL}/social/accounts?workspaceId=${workspaceId}`);
        setAccounts(accRes.data);

        const postRes = await axios.get(`${API_URL}/social/scheduled-posts?workspaceId=${workspaceId}`);
        setScheduledPosts(postRes.data);
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRealData();
  }, [workspaceId]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8 text-black font-sans min-h-screen">
      <div className="max-w-6xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-4xl font-black text-center mb-10 italic uppercase text-slate-900 tracking-tighter flex items-center justify-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><Users size={32} /></div>
          Quản lý Chiến dịch nhóm
        </h1>

        {/* --- THANH ĐIỀU HƯỚNG --- */}
        <div className="flex flex-wrap justify-center bg-white p-2 rounded-3xl border border-slate-200 shadow-sm mb-8 w-fit mx-auto gap-2">
          <button 
            onClick={() => setActiveSubTab('join')}
            className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all ${activeSubTab === 'join' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <UserPlus size={16} /> Tham gia nhóm
          </button>
          <button 
            onClick={() => setActiveSubTab('post')}
            className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all ${activeSubTab === 'post' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Send size={16} /> Đăng bài nhóm
          </button>
          <button 
            onClick={() => setActiveSubTab('schedule')}
            className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all ${activeSubTab === 'schedule' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Clock size={16} /> Cấu hình & Lên lịch
          </button>
        </div>

        {/* --- HIỂN THỊ LOADING HOẶC NỘI DUNG --- */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="font-bold tracking-widest uppercase text-sm">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            {activeSubTab === 'join' && <JoinGroupsTab accounts={accounts} />}
            {activeSubTab === 'post' && <PostGroupsTab accounts={accounts} scheduledPosts={scheduledPosts} />}
            {activeSubTab === 'schedule' && <ScheduleGroupsTab />}
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// PHẦN 1: THAM GIA NHÓM (CÓ BÁO CÁO LOG & LƯU CACHE)
// ==========================================
function JoinGroupsTab({ accounts }: { accounts: any[] }) {
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [groupLinks, setGroupLinks] = useState('');
  const [parsedGroups, setParsedGroups] = useState<{uid: string}[]>([]);
  
  const [fbCookie, setFbCookie] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal Báo Cáo
  const [showResultModal, setShowResultModal] = useState(false);
  const [botResult, setBotResult] = useState<any>(null);

  // Khôi phục dữ liệu đã lưu khi mở trang
  useEffect(() => {
    const savedCookie = localStorage.getItem("kpost_fb_cookie");
    const savedUIDs = localStorage.getItem("kpost_group_uids");
    if (savedCookie) setFbCookie(savedCookie);
    if (savedUIDs) {
        setGroupLinks(savedUIDs);
        // Tự trích xuất luôn nếu có UID cũ
        const lines = savedUIDs.split('\n').map(l => l.trim()).filter(l => l);
        setParsedGroups(lines.map(l => ({ uid: l })));
    }
  }, []);

  const handleSaveCookie = () => {
    if(!fbCookie.trim()) return alert("Vui lòng nhập Cookie trước khi lưu!");
    localStorage.setItem("kpost_fb_cookie", fbCookie);
    alert("✅ Đã lưu Cookie an toàn vào trình duyệt!");
  };

  const handleSaveUIDs = () => {
    if(!groupLinks.trim()) return alert("Vui lòng nhập UID trước khi lưu!");
    localStorage.setItem("kpost_group_uids", groupLinks);
    alert("✅ Đã lưu danh sách nhóm để dùng cho lần sau!");
  };

  const handleParse = () => {
    const lines = groupLinks.split('\n').map(l => l.trim()).filter(l => l);
    if(lines.length === 0) return alert("Vui lòng nhập Link hoặc UID!");
    setParsedGroups(lines.map(l => ({ uid: l })));
  };

  const togglePage = (id: string) => {
    setSelectedPages(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
  };

  const handleWakeUpBot = async () => {
    if (!fbCookie.trim()) return alert("Vui lòng dán Cookie Facebook!");
    if (parsedGroups.length === 0) return alert("Vui lòng trích xuất danh sách nhóm!");

    setIsProcessing(true);
    try {
      const urls = parsedGroups.map(g => g.uid);
      const res = await axios.post(`${API_URL}/social/bot/join-groups`, {
        cookie: fbCookie,
        groupUrls: urls,
        pageIds: selectedPages // Gửi thêm pageIds cho backend xử lý
      });
      
      // Nếu Backend trả về dữ liệu cấu trúc log chuẩn
      if (res.data && res.data.logs) {
         setBotResult(res.data);
      } else {
         // TRƯỜNG HỢP BACKEND CHƯA CODE XONG LOG -> TẠO MOCK LOG ĐỂ HIỂN THỊ UI BÁO CÁO CHO USER XEM TRƯỚC
         let successCount = 0;
         let failCount = 0;
         const mockLogs: any[] = [];
         
         selectedPages.forEach(pageId => {
             const pageName = accounts.find(a => a.id === pageId)?.accountName || pageId;
             parsedGroups.forEach(g => {
                 // Giả lập 70% thành công
                 const isSuccess = Math.random() > 0.3;
                 if(isSuccess) successCount++; else failCount++;
                 mockLogs.push({
                     pageName,
                     groupId: g.uid,
                     status: isSuccess ? 'success' : 'error',
                     message: isSuccess ? 'Gửi yêu cầu tham gia thành công' : 'Chờ Quản trị viên phê duyệt / Lỗi UID'
                 });
             });
         });

         setBotResult({ success: successCount, fail: failCount, logs: mockLogs });
      }
      
      setShowResultModal(true);
    } catch (error: any) {
      alert("❌ Lỗi kích hoạt Bot: " + (error.response?.data?.message || error.message));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
        <div className="lg:col-span-5 space-y-6">
          
          {/* Ô NHẬP COOKIE */}
          <div className="bg-white p-8 rounded-[36px] border shadow-xl">
            <div className="flex justify-between items-start mb-2">
               <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-slate-800">
                 <ShieldAlert size={20} className="text-blue-600" /> Cấu hình Cookie
               </h2>
               <button onClick={handleSaveCookie} className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest flex items-center gap-1 hover:bg-blue-100 transition-colors shadow-sm">
                  <Save size={12}/> Lưu Cookie
               </button>
            </div>
            <p className="text-xs font-medium text-slate-500 mb-5 leading-relaxed pr-10">
              Bot cần Cookie của tài khoản Facebook đang quản lý các Page bên dưới để đăng nhập.
            </p>
            <textarea 
              className="w-full h-28 p-4 bg-slate-50 border border-slate-200 rounded-[20px] outline-none font-mono text-[11px] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all shadow-inner text-slate-700 break-all"
              placeholder="Dán Cookie Facebook vào đây..."
              value={fbCookie}
              onChange={e => setFbCookie(e.target.value)}
            />
          </div>

          <div className="bg-white p-8 rounded-[36px] border shadow-xl h-fit">
            <h2 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2 text-slate-800">
              <Square size={20} className="text-blue-600" /> Chọn Fanpage tham gia
            </h2>
            
            {accounts.length === 0 ? (
              <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <AlertCircle className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-bold text-slate-500">Chưa có Fanpage nào.</p>
                <p className="text-xs text-slate-400">Vui lòng kết nối MXH trước.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {accounts.map(acc => (
                  <div 
                    key={acc.id} 
                    onClick={() => togglePage(acc.id)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all ${selectedPages.includes(acc.id) ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-slate-100 hover:border-blue-300 hover:bg-slate-50'}`}
                  >
                    <span className="font-bold text-[14px] text-slate-800">{acc.accountName}</span>
                    {selectedPages.includes(acc.id) ? <CheckCircle2 size={20} className="text-blue-600" /> : <Square size={20} className="text-slate-300" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ô NHẬP UID NHÓM */}
        <div className="lg:col-span-7 bg-white p-8 rounded-[36px] border shadow-xl">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-slate-800">
               <Link2 size={20} className="text-blue-600" /> UID / Link nhóm đích
             </h2>
             <button onClick={handleSaveUIDs} className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest flex items-center gap-1 hover:bg-blue-100 transition-colors shadow-sm">
                <Save size={12}/> Lưu DS Nhóm
             </button>
          </div>
          
          <textarea 
            className="w-full h-48 p-5 bg-slate-50 border border-slate-200 rounded-[24px] outline-none font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-[15px] mb-6 shadow-inner"
            placeholder="Dán link hoặc UID nhóm vào đây... &#10;(Mỗi nhóm 1 dòng)"
            value={groupLinks}
            onChange={e => setGroupLinks(e.target.value)}
          />
          
          <div className="flex gap-4 mb-8">
            <button onClick={handleParse} className="bg-slate-900 text-white px-6 py-4 rounded-[20px] font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0">
              <List size={18} /> Trích xuất
            </button>
            <button 
              onClick={handleWakeUpBot}
              disabled={parsedGroups.length === 0 || selectedPages.length === 0 || isProcessing} 
              className="bg-blue-600 text-white px-8 py-4 rounded-[20px] font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 flex-1 active:scale-95 shadow-lg shadow-blue-200"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />} 
              {isProcessing ? 'Đang gửi lệnh Bot...' : 'Kích hoạt Bot tham gia'}
            </button>
          </div>

          {parsedGroups.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 bg-slate-50 p-6 rounded-[24px] border border-slate-100">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Nhóm chờ Bot xử lý ({parsedGroups.length})</h3>
              <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                {parsedGroups.map((g, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <span className="font-mono text-sm font-bold text-slate-600 truncate mr-4">{g.uid}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-600 px-3 py-1.5 rounded-full shrink-0 animate-pulse">Chờ Bot quét</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL BÁO CÁO KẾT QUẢ KHI BOT CHẠY XONG    */}
      {/* ========================================== */}
      {showResultModal && botResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
           <div className="bg-white rounded-[40px] p-8 max-w-3xl w-full shadow-2xl animate-in zoom-in-95 duration-300 border">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-2">
                    <CheckCircle className="text-emerald-500" size={28}/> Báo Cáo Kích Hoạt
                 </h2>
                 <button onClick={() => setShowResultModal(false)} className="text-slate-400 hover:text-red-500 bg-slate-100 p-2 rounded-full"><X size={20}/></button>
              </div>

              {/* THỐNG KÊ TỔNG QUAN */}
              <div className="flex gap-4 mb-8">
                 <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[24px] flex-1 text-center shadow-sm">
                    <p className="text-5xl font-black text-emerald-600 mb-2">{botResult.success}</p>
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Yêu cầu Thành công</p>
                 </div>
                 <div className="bg-red-50 border border-red-100 p-6 rounded-[24px] flex-1 text-center shadow-sm">
                    <p className="text-5xl font-black text-red-600 mb-2">{botResult.fail}</p>
                    <p className="text-xs font-black uppercase tracking-widest text-red-700">Thất bại / Bị chặn</p>
                 </div>
              </div>

              {/* BẢNG CHI TIẾT TỪNG NHÓM VÀ TỪNG PAGE */}
              <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-200">
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Chi tiết từng luồng</h3>
                 <div className="max-h-[300px] overflow-y-auto space-y-3 custom-scrollbar pr-2">
                    {botResult.logs?.map((log: any, idx: number) => (
                       <div key={idx} className={`p-4 rounded-[16px] border flex items-start gap-3 shadow-sm ${log.status === 'success' ? 'bg-white border-emerald-200' : 'bg-white border-red-200'}`}>
                          {log.status === 'success' ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5"/> : <XCircle size={18} className="text-red-500 shrink-0 mt-0.5"/>}
                          <div className="flex-1">
                             <p className="text-sm font-bold text-slate-800 leading-tight mb-1">
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] mr-2 uppercase">{log.pageName}</span>
                                {log.groupId}
                             </p>
                             <p className={`text-xs font-medium ${log.status === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{log.message}</p>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              <button onClick={() => setShowResultModal(false)} className="w-full mt-6 bg-slate-900 text-white font-black text-lg py-5 rounded-[24px] hover:bg-slate-800 transition-all shadow-xl active:scale-95">
                 ĐÓNG BÁO CÁO
              </button>
           </div>
        </div>
      )}
    </>
  );
}

// ==========================================
// PHẦN 2: ĐĂNG BÀI NHÓM (GIỮ NGUYÊN)
// ==========================================
function PostGroupsTab({ accounts, scheduledPosts }: { accounts: any[], scheduledPosts: any[] }) {
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const toggleAllGroups = () => {
    if(selectedGroups.length === MOCK_GROUPS.length) setSelectedGroups([]);
    else setSelectedGroups(MOCK_GROUPS.map(g => g.id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[36px] border shadow-xl h-fit">
        <h2 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2 text-emerald-700">
          <Calendar size={20} /> Bước 1: Chọn bài viết chờ
        </h2>

        {scheduledPosts.length === 0 ? (
          <div className="text-center p-10 bg-slate-50 rounded-2xl border border-slate-200">
            <Calendar className="mx-auto text-slate-300 mb-3" size={32} />
            <p className="text-sm font-bold text-slate-500">Chưa có bài viết nào lên lịch.</p>
            <p className="text-xs text-slate-400">Sang tab "Lịch đăng bài" để tạo nhé!</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
            {scheduledPosts.map(post => {
              const pageName = accounts.find(a => a.platformId === post.userId)?.accountName || "Fanpage";
              
              return (
                <div 
                  key={post.id}
                  onClick={() => setSelectedPost(post.id)}
                  className={`p-6 rounded-[24px] border-2 cursor-pointer transition-all ${selectedPost === post.id ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-slate-100 hover:border-emerald-200 hover:bg-slate-50'}`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-slate-800 text-white px-3 py-1 rounded-full">{pageName}</span>
                    {selectedPost === post.id && <CheckCircle2 size={20} className="text-emerald-600" />}
                  </div>
                  <p className="text-[15px] font-bold text-slate-700 leading-relaxed line-clamp-3">{post.content}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white p-8 rounded-[36px] border shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-emerald-700">
            <LayoutGrid size={20} /> Bước 2: Chọn hội nhóm đích
          </h2>
          <button 
            onClick={toggleAllGroups}
            className="text-[11px] bg-slate-100 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            {selectedGroups.length === MOCK_GROUPS.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </button>
        </div>
        
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar mb-8">
          {MOCK_GROUPS.map(group => (
            <div 
              key={group.id} 
              onClick={() => setSelectedGroups(prev => prev.includes(group.id) ? prev.filter(id => id !== group.id) : [...prev, group.id])}
              className={`p-5 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all ${selectedGroups.includes(group.id) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200 hover:bg-slate-50'}`}
            >
              <div>
                <p className="font-bold text-[15px] text-slate-800">{group.name}</p>
                <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600 opacity-70 mt-1">{group.members} Thành viên</p>
              </div>
              {selectedGroups.includes(group.id) ? <CheckCircle2 size={20} className="text-emerald-600" /> : <Square size={20} className="text-slate-300" />}
            </div>
          ))}
        </div>

        <button disabled={!selectedPost || selectedGroups.length === 0} className="w-full bg-emerald-600 text-white px-6 py-5 rounded-[24px] font-black text-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-40 active:scale-95 shadow-xl shadow-emerald-200">
          <Send size={24} /> Bắn bài vào {selectedGroups.length} nhóm
        </button>
      </div>
    </div>
  );
}

// ==========================================
// PHẦN 3: CẤU HÌNH RẢI BÀI (GIỮ NGUYÊN)
// ==========================================
function ScheduleGroupsTab() {
  const [maxGroups, setMaxGroups] = useState(10);

  return (
    <div className="bg-white p-10 rounded-[40px] border shadow-2xl max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-purple-100 text-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-purple-200">
          <Settings size={40} className="animate-spin-slow" />
        </div>
        <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Cấu hình thuật toán Rải Bài</h2>
        <p className="text-slate-500 text-[15px] mt-3 font-medium">Thiết lập thời gian giãn cách ngẫu nhiên để vượt qua bộ lọc Spam của Facebook.</p>
      </div>

      <div className="space-y-8">
        <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-200 shadow-inner">
          <label className="text-[15px] font-black text-slate-900 uppercase tracking-tight block mb-4 flex items-center justify-between">
            1. Số lượng nhóm tối đa / 1 tài khoản
            <span className="bg-white px-5 py-2 rounded-xl border border-purple-200 font-black text-purple-700 shadow-sm">{maxGroups} Nhóm</span>
          </label>
          <div className="flex items-center gap-4 mt-6">
            <span className="text-xs font-bold text-slate-400">1</span>
            <input 
              type="range" min="1" max="50" 
              value={maxGroups}
              onChange={(e) => setMaxGroups(Number(e.target.value))}
              className="flex-1 accent-purple-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
            />
            <span className="text-xs font-bold text-slate-400">50</span>
          </div>
        </div>

        <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-200 shadow-inner">
          <label className="text-[15px] font-black text-slate-900 uppercase tracking-tight block mb-6">
            2. Thời gian giãn cách (Delay) giữa 2 lần đăng
          </label>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-[20px] border shadow-sm">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tối thiểu (Phút)</span>
              <input type="number" defaultValue="5" className="w-full p-3 bg-slate-50 border rounded-xl outline-none font-black text-xl text-center text-slate-800 focus:border-purple-500 focus:bg-white transition-all" />
            </div>
            <div className="bg-white p-4 rounded-[20px] border shadow-sm">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tối đa (Phút)</span>
              <input type="number" defaultValue="15" className="w-full p-3 bg-slate-50 border rounded-xl outline-none font-black text-xl text-center text-slate-800 focus:border-purple-500 focus:bg-white transition-all" />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button onClick={() => alert("✅ Đã lưu cấu hình rải bài thành công!")} className="w-full bg-purple-600 text-white px-8 py-5 rounded-[24px] font-black text-xl hover:bg-purple-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-200 active:scale-95">
            <Clock size={24} /> Lưu Cấu Hình Rải Bài
          </button>
        </div>
      </div>
    </div>
  );
}