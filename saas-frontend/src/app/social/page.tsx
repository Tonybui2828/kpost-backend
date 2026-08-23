"use client";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { 
  Share2, Plus, Trash2, 
  Loader2, Globe, Edit3, X,
  Sparkles 
} from "lucide-react";

export default function SocialPage() {
  // --- 1. CẤU HÌNH API ĐỘNG ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [newAcc, setNewAcc] = useState({ pageId: "", token: "", name: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- 2. LẤY WORKSPACE ID TỪ BỘ NHỚ ---
  useEffect(() => {
    const id = localStorage.getItem("workspaceId");
    if (id) {
      setWorkspaceId(id);
    } else {
      setWorkspaceId("workspace-01"); // Dự phòng
    }
  }, []);

  // --- 3. HÀM LẤY DANH SÁCH TÀI KHOẢN (DUY NHẤT) ---
  const fetchAccounts = useCallback(async () => {
    if (!workspaceId) return;
    setFetching(true);
    try {
      const res = await axios.get(`${API_URL}/social/accounts?workspaceId=${workspaceId}`);
      setAccounts(res.data || []);
    } catch (error) {
      console.error("Lỗi lấy danh sách Fanpage:", error);
    } finally {
      setFetching(false);
    }
  }, [workspaceId, API_URL]);

  // Tự động tải dữ liệu khi có ID
  useEffect(() => {
    if (workspaceId) {
      fetchAccounts();
    }
  }, [workspaceId, fetchAccounts]);

  // --- 4. BẬT/TẮT AI ---
  const toggleAiAutopilot = async (accId: string, currentStatus: boolean) => {
    try {
      await axios.patch(`${API_URL}/social/accounts/${accId}`, {
        isAiAutoReply: !currentStatus
      });
      fetchAccounts(); 
    } catch (error) {
      alert("❌ Lỗi cập nhật trạng thái AI!");
    }
  };

  // --- 5. LƯU / CẬP NHẬT PAGE ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAcc.pageId || !newAcc.token || !newAcc.name) return alert("Vui lòng điền đủ thông tin!");

    setLoading(true);
    try {
      if (editingId) {
        await axios.patch(`${API_URL}/social/accounts/${editingId}`, {
          platformId: newAcc.pageId,
          accessToken: newAcc.token,
          accountName: newAcc.name
        });
        alert("✅ Đã cập nhật thành công!");
      } else {
        await axios.post(`${API_URL}/social/accounts`, {
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
        alert("❌ Thất bại: Kiểm tra lại mã Token hoặc ID Page.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa Fanpage này khỏi hệ thống?")) return;
    try {
      await axios.delete(`${API_URL}/social/accounts/${id}`);
      fetchAccounts();
    } catch (error) { alert("Lỗi khi xóa!"); }
  };

  const startEdit = (acc: any) => {
    setEditingId(acc.id);
    setNewAcc({ pageId: acc.platformId, token: acc.accessToken, name: acc.accountName });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-black mb-10 flex items-center gap-4 italic uppercase tracking-tighter text-black">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><Share2 size={32} /></div>
          Kết nối Fanpage
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* CỘT TRÁI: FORM NHẬP */}
          <div className="lg:col-span-4">
            <div className={`bg-white p-8 rounded-[40px] shadow-xl border-2 transition-all ${editingId ? 'border-orange-500' : 'border-white'}`}>
              <h2 className="text-xl font-black mb-6 uppercase italic text-black">
                 {editingId ? "Sửa thông tin" : "Kết nối Page mới"}
              </h2>
              <form onSubmit={handleSave} className="space-y-5">
                <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-black border border-transparent focus:border-blue-200" placeholder="Tên gợi nhớ" value={newAcc.name} onChange={(e) => setNewAcc({...newAcc, name: e.target.value})} required />
                <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-black border border-transparent focus:border-blue-200" placeholder="Fanpage ID" value={newAcc.pageId} onChange={(e) => setNewAcc({...newAcc, pageId: e.target.value})} required />
                <textarea className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-black text-[10px] border border-transparent focus:border-blue-200" rows={5} placeholder="Page Access Token..." value={newAcc.token} onChange={(e) => setNewAcc({...newAcc, token: e.target.value})} required />
                <button type="submit" disabled={loading} className={`w-full text-white font-black py-5 rounded-[24px] shadow-2xl transition-all ${editingId ? 'bg-orange-500' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {loading ? <Loader2 className="animate-spin mx-auto" /> : "LƯU KẾT NỐI"}
                </button>
              </form>
            </div>
          </div>

          {/* CỘT PHẢI: DANH SÁCH */}
          <div className="lg:col-span-8">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 min-h-[500px]">
              <h2 className="text-2xl font-black italic uppercase text-black mb-8 tracking-tighter">Đang hoạt động</h2>
              {fetching ? (
                <div className="flex flex-col items-center py-20 text-slate-300 font-black uppercase"><Loader2 className="animate-spin mb-4 text-blue-500" size={40} /> Đang tải...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {accounts.map((acc: any) => (
                    <div key={acc.id} className="bg-slate-50/50 p-6 rounded-[35px] border-2 border-transparent hover:border-blue-500 hover:bg-white transition-all group shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg"><Globe size={20} /></div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => startEdit(acc)} className="p-2 bg-white text-slate-400 hover:text-orange-500 rounded-xl border"><Edit3 size={16} /></button>
                           <button onClick={() => handleDelete(acc.id)} className="p-2 bg-white text-slate-400 hover:text-red-500 rounded-xl border"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <h3 className="font-black text-lg text-black uppercase truncate">{acc.accountName}</h3>
                      <div className="mt-6 flex items-center justify-between border-t pt-4">
                         <span className="text-[10px] font-black text-slate-400 uppercase">Trợ lý AI</span>
                         <button onClick={() => toggleAiAutopilot(acc.id, acc.isAiAutoReply)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${acc.isAiAutoReply ? "bg-black text-white shadow-lg" : "bg-slate-200 text-slate-400"}`}>
                            <Sparkles size={10} className="inline mr-1" /> {acc.isAiAutoReply ? "ON" : "OFF"}
                         </button>
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