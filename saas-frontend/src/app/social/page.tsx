"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import axios from "axios";
import { useSearchParams } from 'next/navigation'; 
import { 
  Share2, Plus, Trash2, 
  Loader2, Globe, Edit3, X,
  Sparkles, BookOpen
} from "lucide-react"; 

// --- COMPONENT CON (CHỨA LOGIC CHÍNH) ---
function SocialContent() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const searchParams = useSearchParams();

  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [newAcc, setNewAcc] = useState({ pageId: "", token: "", name: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // State hiển thị popup hướng dẫn
  const [showGuideModal, setShowGuideModal] = useState(false);

  // --- 2. LẤY WORKSPACE ID TỪ BỘ NHỚ ---
  useEffect(() => {
    const id = localStorage.getItem("workspaceId");
    if (id) {
      setWorkspaceId(id);
    } else {
      setWorkspaceId("workspace-01"); 
    }
  }, []);

  // --- 3. BẮT THÔNG BÁO TỪ BACKEND ---
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      alert("🎉 Kết nối Facebook thành công! Đã tự động tải các Fanpage của bạn.");
      window.history.replaceState(null, '', '/social'); 
    }
    if (searchParams.get('error') === 'true') {
      alert("❌ Lỗi cấp quyền! Bạn đã hủy hoặc Facebook từ chối kết nối.");
      window.history.replaceState(null, '', '/social');
    }
  }, [searchParams]);

  // --- 4. HÀM LẤY DANH SÁCH TÀI KHOẢN ---
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

  useEffect(() => {
    if (workspaceId) fetchAccounts();
  }, [workspaceId, fetchAccounts]);

  // --- 5. BẬT/TẮT AI ---
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

  // --- 6. LƯU / CẬP NHẬT PAGE THỦ CÔNG ---
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
    <div className="max-w-6xl mx-auto relative">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <h1 className="text-4xl font-black flex items-center gap-4 italic uppercase tracking-tighter text-black">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><Share2 size={32} /></div>
          Kết nối Fanpage
        </h1>
        
        {/* NÚT MỞ HƯỚNG DẪN MỚI */}
        <button 
          onClick={() => setShowGuideModal(true)}
          className="bg-[#1877F2] text-white px-8 py-4 rounded-[20px] font-black flex items-center justify-center gap-3 hover:bg-[#166FE5] transition-all shadow-lg shadow-blue-200 active:scale-95 w-full md:w-auto uppercase tracking-wide text-sm"
        >
          <BookOpen size={20} />
          Hướng dẫn kết nối Fanpage
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4">
          <div className={`bg-white p-8 rounded-[40px] shadow-xl border-2 transition-all ${editingId ? 'border-orange-500' : 'border-white'}`}>
            <h2 className="text-xl font-black mb-2 uppercase italic text-black">
               {editingId ? "Sửa thông tin" : "Hoặc nhập thủ công"}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium mb-6 uppercase tracking-wider">Nếu không dùng Đăng nhập tự động</p>
            
            <form onSubmit={handleSave} className="space-y-5">
              <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-black border border-transparent focus:border-blue-200" placeholder="Tên gợi nhớ" value={newAcc.name} onChange={(e) => setNewAcc({...newAcc, name: e.target.value})} required />
              <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-black border border-transparent focus:border-blue-200" placeholder="Fanpage ID" value={newAcc.pageId} onChange={(e) => setNewAcc({...newAcc, pageId: e.target.value})} required />
              <textarea className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-black text-[10px] border border-transparent focus:border-blue-200" rows={5} placeholder="Page Access Token..." value={newAcc.token} onChange={(e) => setNewAcc({...newAcc, token: e.target.value})} required />
              <button type="submit" disabled={loading} className={`w-full text-white font-black py-5 rounded-[24px] shadow-2xl transition-all ${editingId ? 'bg-orange-500' : 'bg-slate-900 hover:bg-black'}`}>
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "LƯU KẾT NỐI"}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 min-h-[500px]">
            <h2 className="text-2xl font-black italic uppercase text-black mb-8 tracking-tighter">Đang hoạt động ({accounts.length})</h2>
            {fetching ? (
              <div className="flex flex-col items-center py-20 text-slate-300 font-black uppercase"><Loader2 className="animate-spin mb-4 text-blue-500" size={40} /> Đang tải...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {accounts.length === 0 && !fetching && (
                  <div className="col-span-2 text-center py-10 text-slate-400 font-medium">Chưa có Fanpage nào được kết nối. Hãy bấm xem Hướng dẫn!</div>
                )}
                {accounts.map((acc: any) => (
                  <div key={acc.id} className="bg-slate-50/50 p-6 rounded-[35px] border-2 border-transparent hover:border-blue-500 hover:bg-white transition-all group shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg"><Globe size={20} /></div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => startEdit(acc)} className="p-2 bg-white text-slate-400 hover:text-orange-500 rounded-xl border"><Edit3 size={16} /></button>
                           <button onClick={() => handleDelete(acc.id)} className="p-2 bg-white text-slate-400 hover:text-red-500 rounded-xl border"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <h3 className="font-black text-lg text-black uppercase truncate" title={acc.accountName}>{acc.accountName}</h3>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">ID: {acc.platformId}</p>
                    </div>
                    
                    <div className="mt-6 flex items-center justify-between border-t pt-4">
                       <span className="text-[10px] font-black text-slate-400 uppercase">Trợ lý AI Rep Inbox</span>
                       <button onClick={() => toggleAiAutopilot(acc.id, acc.isAiAutoReply)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${acc.isAiAutoReply ? "bg-black text-white shadow-lg shadow-black/20" : "bg-slate-200 text-slate-400"}`}>
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

      {/* POPUP (MODAL) HƯỚNG DẪN LẤY TOKEN */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[35px] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative border-4 border-white/20">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between p-6 md:px-8 border-b border-slate-100 bg-white sticky top-0 z-10">
              <h2 className="text-xl md:text-2xl font-black text-black uppercase italic tracking-tighter flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md"><BookOpen size={24} /></div>
                Hướng dẫn lấy Token thủ công
              </h2>
              <button 
                onClick={() => setShowGuideModal(false)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
              >
                <X size={28} strokeWidth={3} />
              </button>
            </div>
            
            {/* Nội dung hướng dẫn */}
            <div className="p-6 md:p-8 overflow-y-auto text-slate-700 space-y-8 bg-slate-50/50">
              
              <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-2xl">
                <p className="text-sm md:text-base text-blue-900 leading-relaxed font-medium">
                  <strong className="text-blue-700 uppercase font-black tracking-wider block mb-1">Lưu ý cho khách hàng:</strong> Để đảm bảo tính bảo mật tuyệt đối cho Fanpage của bạn, Kpost sử dụng phương thức kết nối thủ công qua API. Điều này giúp bạn kiểm soát 100% quyền truy cập mà không lo bị lộ tài khoản Facebook cá nhân.
                </p>
              </div>

              <div className="space-y-6 font-medium">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 transition">
                  <h3 className="font-black text-lg text-black mb-3 uppercase tracking-wide flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span> 
                    Trở thành Nhà phát triển Facebook
                  </h3>
                  <ul className="list-disc pl-10 space-y-2 text-slate-600">
                    <li>Truy cập trang <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold">Meta for Developers</a>.</li>
                    <li>Bấm vào nút <strong>Bắt đầu</strong> ở góc phải trên cùng và làm theo hướng dẫn của Facebook (Xác minh số điện thoại hoặc Email nếu họ yêu cầu).</li>
                  </ul>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 transition">
                  <h3 className="font-black text-lg text-black mb-3 uppercase tracking-wide flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span> 
                    Tạo Ứng dụng (App) riêng của bạn
                  </h3>
                  <ul className="list-disc pl-10 space-y-2 text-slate-600">
                    <li>Bấm vào <strong>Tạo ứng dụng mới (Create App)</strong>.</li>
                    <li>Chọn mục đích ứng dụng: Chọn <strong>Kinh doanh (Business)</strong> (hoặc chọn <em>"Khác" &gt; "Kinh doanh"</em>).</li>
                    <li>Điền "Tên ứng dụng hiển thị" (Ví dụ: <em>Token Kpost của tôi</em>) và nhập Email của bạn.</li>
                    <li>Bấm <strong>Tạo ứng dụng</strong> (Điền mật khẩu Facebook để xác nhận).</li>
                  </ul>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 transition">
                  <h3 className="font-black text-lg text-black mb-3 uppercase tracking-wide flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span> 
                    Thêm Facebook Login cho Doanh nghiệp
                  </h3>
                  <ul className="list-disc pl-10 space-y-2 text-slate-600">
                    <li>Trong trang tổng quan của ứng dụng vừa tạo, cuộn xuống tìm phần <strong>Facebook Login cho Doanh nghiệp (Facebook Login for Business)</strong> và bấm nút <strong>Thiết lập</strong>.</li>
                    <li>(Có thể bỏ qua phần chọn nền tảng Web/iOS/Android).</li>
                  </ul>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 transition">
                  <h3 className="font-black text-lg text-black mb-3 uppercase tracking-wide flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span> 
                    Dùng Graph API Explorer để tạo Token
                  </h3>
                  <ul className="list-disc pl-10 space-y-2 text-slate-600">
                    <li>Nhìn lên thanh Menu trên cùng, chọn <strong>Công cụ (Tools)</strong> &gt; <strong>Trình khám phá API Đồ thị (Graph API Explorer)</strong>.</li>
                    <li>Ở cột bên phải, mục <strong>Ứng dụng Meta (Meta App)</strong>: Đảm bảo bạn đang chọn tên Ứng dụng vừa tạo.</li>
                    <li>Mục <strong>Loại (Type)</strong>: Đảm bảo chọn <strong>Mã truy cập người dùng (User Access Token)</strong>.</li>
                    <li>Mục <strong>Quyền (Permissions)</strong>: Bấm vào và thêm 3 quyền sau đây (Rất quan trọng):
                      <ul className="list-disc pl-6 mt-3 space-y-2 font-mono text-sm text-pink-600 bg-pink-50/50 p-4 rounded-xl border border-pink-100">
                        <li>pages_show_list</li>
                        <li>pages_manage_posts <span className="text-slate-500 font-sans italic">- Nếu dùng để đăng bài</span></li>
                        <li>pages_messaging <span className="text-slate-500 font-sans italic">- Nếu dùng để Rep Inbox</span></li>
                      </ul>
                    </li>
                    <li>Bấm nút <strong>Generate Access Token</strong>. Một cửa sổ Facebook sẽ hiện ra hỏi bạn muốn cấp quyền cho Fanpage nào, hãy tick chọn các Fanpage bạn muốn kết nối.</li>
                  </ul>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 transition">
                  <h3 className="font-black text-lg text-black mb-3 uppercase tracking-wide flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span> 
                    Lấy Token cho Fanpage (1-2 tiếng)
                  </h3>
                  <ul className="list-disc pl-10 space-y-2 text-slate-600">
                    <li>Sau khi cấp quyền xong, nhìn lại cột bên phải, tại mục <strong>Mã truy cập (User/Page)</strong>, bấm vào mũi tên thả xuống và chọn Tên Fanpage của bạn.</li>
                    <li>Nhìn lên thanh nhập liệu có chữ GET, gõ <code className="bg-slate-100 px-2 py-1 rounded-md border text-black font-bold">me?fields=id,name,access_token</code> và bấm <strong>Gửi (Submit)</strong>.</li>
                    <li>Khung kết quả bên dưới sẽ hiện ra một đoạn mã, bạn copy chuỗi kí tự dài trong dấu ngoặc kép sau chữ <code className="bg-slate-100 px-2 py-1 rounded text-blue-600">"access_token":</code>. <br/><span className="text-red-500 text-sm mt-1 flex items-center gap-1 font-bold"><X size={14}/> Lưu ý: Token này chỉ sống được khoảng 1-2 tiếng.</span></li>
                  </ul>
                </div>

                <div className="bg-orange-50 p-6 rounded-2xl shadow-sm border border-orange-200 hover:border-orange-400 transition">
                  <h3 className="font-black text-lg text-orange-600 mb-3 uppercase tracking-wide flex items-center gap-2">
                    <span className="bg-orange-200 text-orange-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">6</span> 
                    Lấy Token Vĩnh Viễn (Quan trọng nhất)
                  </h3>
                  <ul className="list-disc pl-10 space-y-2 text-slate-700">
                    <li>Trở lại thanh Menu trên cùng, chọn <strong>Công cụ (Tools)</strong> &gt; <strong>Công cụ gỡ lỗi mã truy cập (Access Token Debugger)</strong>.</li>
                    <li>Dán đoạn Token vừa copy ở Bước 5 vào ô trống và bấm <strong>Gỡ lỗi (Debug)</strong>.</li>
                    <li>Cuộn xuống dưới cùng, bấm nút <strong>Mở rộng mã truy cập (Extend Access Token)</strong>.</li>
                    <li>Copy đoạn Token mới hiện ra (Đây là Token sống 60 ngày).</li>
                    <li>Quay lại trang <strong>Graph API Explorer</strong> (như Bước 4), dán cái Token 60 ngày vào ô Mã truy cập ở cột bên phải.</li>
                    <li>Trên thanh nhập liệu GET, tiếp tục gõ <code className="bg-white/60 px-2 py-1 rounded border border-orange-200 font-bold">me?fields=id,name,access_token</code> và bấm <strong>Gửi</strong>.</li>
                    <li>Kết quả bên dưới sẽ hiện ra Token mới. <strong className="text-green-600 uppercase bg-green-100 px-2 py-0.5 rounded ml-1">ĐÂY CHÍNH LÀ TOKEN SỐNG VĨNH VIỄN!</strong></li>
                    <li>Bạn copy đoạn <code className="bg-white/60 px-2 py-1 rounded text-blue-700 border border-orange-200 font-bold">"id"</code> (chính là Fanpage ID) và đoạn <code className="bg-white/60 px-2 py-1 rounded text-blue-700 border border-orange-200 font-bold">"access_token"</code> (chính là Token vĩnh viễn).</li>
                  </ul>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 transition">
                  <h3 className="font-black text-lg text-black mb-3 uppercase tracking-wide flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">7</span> 
                    Kết nối vào phần mềm Kpost
                  </h3>
                  <ul className="list-disc pl-10 space-y-2 text-slate-600">
                    <li>Đóng bảng hướng dẫn này lại bằng nút <X size={14} className="inline"/> ở góc phải trên.</li>
                    <li>Nhập tên gợi nhớ (tùy ý).</li>
                    <li>Dán Fanpage ID và Page Access Token (vừa lấy ở bước 6) vào 2 ô tương ứng ở bên trái màn hình.</li>
                    <li>Bấm <strong className="bg-black text-white px-2 py-1 rounded text-xs uppercase tracking-wider mx-1">Lưu kết nối</strong>. Chúc mừng bạn đã hoàn thành!</li>
                  </ul>
                </div>
                
                {/* Thông tin liên hệ hỗ trợ */}
                <div className="mt-10 text-center bg-blue-600 p-8 rounded-3xl border border-blue-500 shadow-xl shadow-blue-200 text-white relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-20 transform group-hover:scale-110 transition duration-500">
                     <Sparkles size={80} />
                   </div>
                   <p className="mb-2 font-medium text-blue-100 uppercase tracking-widest text-sm relative z-10">Cần sự trợ giúp?</p>
                   <p className="text-xl mb-6 font-bold relative z-10">Hãy liên hệ với Kpost ngay nếu bạn gặp khó khăn</p>
                   <a href="mailto:support@kpost.vn" className="inline-block bg-white text-blue-600 px-8 py-3 rounded-full text-lg font-black hover:bg-slate-50 hover:scale-105 transition-all shadow-lg relative z-10">support@kpost.vn</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- COMPONENT CHA (BỌC SUSPENSE) ---
export default function Page() {
  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-900 font-sans">
      <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={32} /></div>}>
        <SocialContent />
      </Suspense>
    </div>
  );
}