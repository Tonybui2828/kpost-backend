"use client";
import React, { useState } from 'react';
import { Users, UserPlus, Send, Settings, Clock, Link2, CheckCircle2, Square, List, Calendar, LayoutGrid } from 'lucide-react';

// ==========================================
// DỮ LIỆU MẪU (Giả lập khi chưa nối API)
// ==========================================
const MOCK_PAGES = [
  { id: 'p1', name: 'Công nghệ Tech 28' },
  { id: 'p2', name: 'Điện máy Anh Kỳ' },
  { id: 'p3', name: 'Dropbuy Việt Nam' },
];

const MOCK_GROUPS = [
  { id: 'g1', name: 'Hội Đam Mê Công Nghệ', members: '120K' },
  { id: 'g2', name: 'Chợ Điện Máy Giá Rẻ', members: '45K' },
  { id: 'g3', name: 'Cộng Đồng Dropbuy', members: '12K' },
  { id: 'g4', name: 'Hội Thanh Lý Đồ Điện Tử', members: '88K' }
];

const MOCK_SCHEDULED_POSTS = [
  { id: 'post1', pageName: 'Công nghệ Tech 28', content: 'Sale cực sốc máy hút mùi nhà bếp Buchen nhập khẩu Đức. Giảm giá 50% chỉ hôm nay...' },
  { id: 'post2', pageName: 'Điện máy Anh Kỳ', content: 'Tủ lạnh Inverter tiết kiệm điện đã về hàng. Anh chị nào cần inbox em gửi báo giá nhé.' }
];

// ==========================================
// COMPONENT CHÍNH
// ==========================================
export default function GroupsCampaignPage() {
  const [activeSubTab, setActiveSubTab] = useState<'join' | 'post' | 'schedule'>('join');

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

        {/* --- NỘI DUNG TỪNG TAB --- */}
        {activeSubTab === 'join' && <JoinGroupsTab />}
        {activeSubTab === 'post' && <PostGroupsTab />}
        {activeSubTab === 'schedule' && <ScheduleGroupsTab />}
      </div>
    </div>
  );
}

// ==========================================
// PHẦN 1: THAM GIA NHÓM
// ==========================================
function JoinGroupsTab() {
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [groupLinks, setGroupLinks] = useState('');
  const [parsedGroups, setParsedGroups] = useState<{uid: string}[]>([]);

  const handleParse = () => {
    const lines = groupLinks.split('\n').map(l => l.trim()).filter(l => l);
    if(lines.length === 0) return alert("Vui lòng nhập Link hoặc UID!");
    setParsedGroups(lines.map(l => ({ uid: l })));
  };

  const togglePage = (id: string) => {
    setSelectedPages(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
      {/* TRÁI: CHỌN FANPAGE */}
      <div className="lg:col-span-5 bg-white p-8 rounded-[36px] border shadow-xl h-fit">
        <h2 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2 text-slate-800">
          <Square size={20} className="text-blue-600" /> Chọn Fanpage tham gia
        </h2>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {MOCK_PAGES.map(page => (
            <div 
              key={page.id} 
              onClick={() => togglePage(page.id)}
              className={`p-5 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all ${selectedPages.includes(page.id) ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-slate-100 hover:border-blue-300 hover:bg-slate-50'}`}
            >
              <span className="font-bold text-[15px] text-slate-800">{page.name}</span>
              {selectedPages.includes(page.id) ? <CheckCircle2 size={20} className="text-blue-600" /> : <Square size={20} className="text-slate-300" />}
            </div>
          ))}
        </div>
      </div>

      {/* PHẢI: NHẬP UID/LINK */}
      <div className="lg:col-span-7 bg-white p-8 rounded-[36px] border shadow-xl">
        <h2 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2 text-slate-800">
          <Link2 size={20} className="text-blue-600" /> Nhập UID / Link nhóm Facebook
        </h2>
        
        <textarea 
          className="w-full h-48 p-5 bg-slate-50 border border-slate-200 rounded-[24px] outline-none font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-[15px] mb-6 shadow-inner"
          placeholder="Dán link hoặc UID nhóm vào đây... &#10;(Mỗi nhóm 1 dòng)"
          value={groupLinks}
          onChange={e => setGroupLinks(e.target.value)}
        />
        
        <div className="flex gap-4 mb-8">
          <button onClick={handleParse} className="bg-slate-900 text-white px-8 py-4 rounded-[20px] font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-2 active:scale-95">
            <List size={18} /> Trích xuất danh sách
          </button>
          <button disabled={parsedGroups.length === 0 || selectedPages.length === 0} className="bg-blue-600 text-white px-8 py-4 rounded-[20px] font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 flex-1 active:scale-95 shadow-lg shadow-blue-200">
            <UserPlus size={18} /> Bắt đầu tham gia
          </button>
        </div>

        {/* KẾT QUẢ TRÍCH XUẤT */}
        {parsedGroups.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 bg-slate-50 p-6 rounded-[24px] border border-slate-100">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Nhóm chờ tham gia ({parsedGroups.length})</h3>
            <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
              {parsedGroups.map((g, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <span className="font-mono text-sm font-bold text-slate-600 truncate mr-4">{g.uid}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-600 px-3 py-1.5 rounded-full shrink-0 animate-pulse">Chờ duyệt</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// PHẦN 2: ĐĂNG BÀI NHÓM
// ==========================================
function PostGroupsTab() {
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const toggleAllGroups = () => {
    if(selectedGroups.length === MOCK_GROUPS.length) setSelectedGroups([]);
    else setSelectedGroups(MOCK_GROUPS.map(g => g.id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
      {/* BƯỚC 1: CHỌN BÀI VIẾT TỪ LỊCH */}
      <div className="bg-white p-8 rounded-[36px] border shadow-xl h-fit">
        <h2 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2 text-emerald-700">
          <Calendar size={20} /> Bước 1: Chọn bài viết chờ
        </h2>
        <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
          {MOCK_SCHEDULED_POSTS.map(post => (
            <div 
              key={post.id}
              onClick={() => setSelectedPost(post.id)}
              className={`p-6 rounded-[24px] border-2 cursor-pointer transition-all ${selectedPost === post.id ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-slate-100 hover:border-emerald-200 hover:bg-slate-50'}`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest bg-slate-800 text-white px-3 py-1 rounded-full">{post.pageName}</span>
                {selectedPost === post.id && <CheckCircle2 size={20} className="text-emerald-600" />}
              </div>
              <p className="text-[15px] font-bold text-slate-700 leading-relaxed">{post.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* BƯỚC 2: CHỌN NHÓM ĐÍCH */}
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
// PHẦN 3: CẤU HÌNH RẢI BÀI (CHỐNG SPAM)
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
        {/* SETTING 1 */}
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
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-5 bg-purple-100/50 p-3 rounded-xl border border-purple-100">💡 Khuyên dùng: Dưới 15 nhóm mỗi chiến dịch để đảm bảo Fanpage sống dai.</p>
        </div>

        {/* SETTING 2 */}
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
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-5 bg-purple-100/50 p-3 rounded-xl border border-purple-100">💡 Hệ thống sẽ <span className="text-purple-600 font-black">"nghỉ ngơi ngẫu nhiên"</span> trong khoảng thời gian này trước khi đăng bài tiếp theo.</p>
        </div>

        {/* NÚT LƯU */}
        <div className="pt-4">
          <button className="w-full bg-purple-600 text-white px-8 py-5 rounded-[24px] font-black text-xl hover:bg-purple-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-200 active:scale-95">
            <Clock size={24} /> Lưu Cấu Hình Rải Bài
          </button>
        </div>
      </div>
    </div>
  );
}