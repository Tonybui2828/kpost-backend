"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Share2, Plus, Trash2, CheckCircle, 
  Loader2, Globe, Edit3, X, ShieldAlert,
  Sparkles // Thêm icon cho AI
} from "lucide-react";

export default function SocialPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [newAcc, setNewAcc] = useState({ pageId: "", token: "", name: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const workspaceId = "workspace-01"; 

  const fetchAccounts = async () => {
    setFetching(true);
    try {
      const res = await axios.get(`http://localhost:3001/social/accounts?workspaceId=${workspaceId}`);
      setAccounts(res.data || []);
    } catch (error) {
      console.error("Lỗi lấy danh sách:", error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  // --- HÀM BẬT/TẮT AI AUTOPILOT ---
  const toggleAiAutopilot = async (accId: string, currentStatus: boolean) => {
    try {
      // Gọi API Patch đã viết ở Backend
      await axios.patch(`http://localhost:3001/social/accounts/${accId}`, {
        isAiAutoReply: !currentStatus
      });
      fetchAccounts(); // Tải lại danh sách để cập nhật giao diện
    } catch (error) {
      alert("❌ Không thể cập nhật trạng thái AI. Vui lòng thử lại!");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAcc.pageId || !newAcc.token || !newAcc.name) return alert("Vui lòng điền đủ thông tin!");

    setLoading(true);
    try {
      if (editingId) {
        await axios.patch(`http://localhost:3001/social/accounts/${editingId}`, {
          platformId: newAcc.pageId,
          accessToken: newAcc.token,
          accountName: newAcc.name
        });
        alert("✅ Đã cập nhật thông tin thành công!");
      } else {
        await axios.post("http://localhost:3001/social/accounts", {
          workspaceId,
          platform: "facebook",
          platformId: newAcc.pageId,
          accessToken: newAcc.token,
          accountName: newAcc.name
        });
        alert("✅ Kết nối Fanpage mới thành công!");
      }
      
      setNewAcc({ pageId: "", token: "", name: "" });
      setEditingId(null);
      fetchAccounts(); 
    } catch (error: any) {
      if (error.response?.status === 403) {
        if (confirm(`❌ HẠN MỨC ĐÃ HẾT!\n\n${error.response.data.message}\n\nBạn có muốn chuyển sang trang Cài đặt để nâng cấp gói cước ngay không?`)) {
          window.location.href = "/settings"; 
        }
      } else {
        alert("❌ Lỗi kết nối Backend hoặc Token không hợp lệ!");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa Fanpage này?")) {
      try {
        await axios.delete(`http://localhost:3001/social/accounts/${id}`);
        alert("Đã xóa thành công!");
        fetchAccounts();
      } catch (error) {
        alert("Lỗi khi xóa!");
      }
    }
  };

  const startEdit = (acc: any) => {
    setEditingId(acc.id);
    setNewAcc({
      pageId: acc.platformId,
      token: acc.accessToken,
      name: acc.accountName
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-black mb-10 flex items-center gap-4 italic uppercase tracking-tighter">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg">
            <Share2 size={32} />
          </div>
          Kết nối Fanpage
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* CỘT TRÁI: FORM */}
          <div className="lg:col-span-4">
            <div className={`bg-white p-8 rounded-[40px] shadow-xl border-2 transition-all ${editingId ? 'border-orange-500 shadow-orange-50' : 'border-white'}`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black flex items-center gap-2 uppercase italic text-black">
                   {editingId ? <Edit3 className="text-orange-500" /> : <Plus className="text-blue-600" />}
                   {editingId ? "Sửa thông tin" : "Kết nối Page"}
                </h2>
                {editingId && (
                  <button onClick={() => { setEditingId(null); setNewAcc({pageId:"", token:"", name:""}); }} className="text-slate-300 hover:text-red-500"><X size={20} /></button>
                )}
              </div>
              
              <form onSubmit={handleSave} className="space-y-5">
                <div className="text-black">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên Page gợi nhớ</label>
                  <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-black border border-transparent focus:bg-white focus:border-blue-200" placeholder="Ví dụ: Shop Quần Áo" value={newAcc.name} onChange={(e) => setNewAcc({...newAcc, name: e.target.value})} required />
                </div>
                
                <div className="text-black">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã Fanpage ID</label>
                  <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-black border border-transparent focus:bg-white focus:border-blue-200" placeholder="102938..." value={newAcc.pageId} onChange={(e) => setNewAcc({...newAcc, pageId: e.target.value})} required />
                </div>

                <div className="text-black">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Page Access Token</label>
                  <textarea className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-black text-[10px] border border-transparent focus:bg-white focus:border-blue-200" rows={5} placeholder="EAA..." value={newAcc.token} onChange={(e) => setNewAcc({...newAcc, token: e.target.value})} required />
                </div>

                <button type="submit" disabled={loading} className={`w-full text-white font-black py-5 rounded-[24px] shadow-2xl flex justify-center items-center gap-3 transition-all active:scale-95 ${editingId ? 'bg-orange-500' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {loading ? <Loader2 className="animate-spin" /> : editingId ? "CẬP NHẬT NGAY" : "KẾT NỐI HỆ THỐNG"}
                </button>
              </form>
            </div>
          </div>

          {/* CỘT PHẢI: DANH SÁCH PAGE + SWITCH AI */}
          <div className="lg:col-span-8">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 min-h-[500px]">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black italic uppercase text-black">Đang hoạt động</h2>
                <div className="bg-green-50 text-green-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Online: {accounts.length}</div>
              </div>

              {fetching ? (
                <div className="flex flex-col items-center py-20 text-slate-300 font-black uppercase tracking-widest"><Loader2 className="animate-spin mb-4" size={40} /> Đang quét Database...</div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-24 border-4 border-dashed border-slate-50 rounded-[40px]">
                   <Globe size={64} className="text-slate-100 mb-4 mx-auto" />
                   <p className="text-slate-300 font-black uppercase italic text-sm tracking-widest">Chưa có kết nối nào</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {accounts.map((acc: any) => (
                    <div key={acc.id} className="bg-slate-50/50 p-6 rounded-[35px] border-2 border-transparent hover:border-blue-500 hover:bg-white transition-all group relative shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg">
                           <Globe size={20} />
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => startEdit(acc)} className="p-2 bg-white text-slate-400 hover:text-orange-500 rounded-xl shadow-sm border border-slate-100"><Edit3 size={16} /></button>
                           <button onClick={() => handleDelete(acc.id)} className="p-2 bg-white text-slate-400 hover:text-red-500 rounded-xl shadow-sm border border-slate-100"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <h3 className="font-black text-lg text-slate-800 truncate pr-4 text-black">{acc.accountName}</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase mt-1">ID: {acc.platformId}</p>
                      
                      {/* --- NÚT GẠT BẬT AI AUTOPILOT --- */}
                      <div className="mt-6 flex flex-col gap-3">
                        <div className="h-[1px] bg-slate-100 w-full"></div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trợ lý AI</span>
                            <button 
                                onClick={() => toggleAiAutopilot(acc.id, acc.isAiAutoReply)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all active:scale-90 ${
                                    acc.isAiAutoReply 
                                    ? "bg-green-600 text-white shadow-lg shadow-green-100" 
                                    : "bg-slate-200 text-slate-400"
                                }`}
                            >
                                <Sparkles size={12} fill={acc.isAiAutoReply ? "currentColor" : "none"} className={acc.isAiAutoReply ? "animate-pulse" : ""} />
                                {acc.isAiAutoReply ? "Đang trực 24/7" : "Đã tắt"}
                            </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}