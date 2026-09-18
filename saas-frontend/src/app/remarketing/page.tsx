"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { 
  Users, Search, Clock, Send, MessageSquare, 
  Sparkles, ShieldCheck, CheckSquare, Square, Loader2, RefreshCw
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  status: "chua_mua" | "da_mua";
  lastChat: string;
  rawDate: Date;
  page: string;
}

export default function RemarketingPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const [activeTab, setActiveTab] = useState<"chua_mua" | "da_mua">("chua_mua");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [scheduleTime, setScheduleTime] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);

  // --- HÀM TÍNH THỜI GIAN TƯƠNG TÁC TƯƠNG ĐỐI ---
  const formatRelativeTime = (dateInput: string | Date) => {
    if (!dateInput) return "Vừa xong";
    const date = new Date(dateInput);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Vừa xong";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} ngày trước`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} tháng trước`;
  };

  // --- GỌI API LẤY KHÁCH HÀNG THỰC TẾ TỪ BACKEND / INBOX ---
  const fetchCustomers = useCallback(async () => {
    setFetching(true);
    try {
      const workspaceId = localStorage.getItem("workspaceId") || "default_workspace";
      const token = localStorage.getItem("token");
      const headers = { Authorization: token ? `Bearer ${token}` : "" };

      let loadedCustomers: Customer[] = [];

      // 1. Thử gọi API chuyên dụng của Remarketing (nếu có)
      try {
        const res = await axios.get(`${API_URL}/remarketing/customers?workspaceId=${workspaceId}`, { headers });
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          loadedCustomers = res.data.map((c: any) => ({
            id: String(c.id || c.senderId),
            name: c.name || c.senderName || "Khách hàng",
            status: c.status === "da_mua" ? "da_mua" : "chua_mua",
            lastChat: formatRelativeTime(c.lastChat || c.updatedAt || c.createdAt),
            rawDate: new Date(c.lastChat || c.updatedAt || c.createdAt || Date.now()),
            page: c.page || c.pageName || "Fanpage"
          }));
        }
      } catch (e) {
        // Nếu API chuyên dụng chưa có, tiếp tục fallback sang Hộp thư
      }

      // 2. Fallback: Lấy danh sách khách hàng thật từ Hộp thư Inbox
      if (loadedCustomers.length === 0) {
        const inboxRes = await axios.get(`${API_URL}/social/inbox?workspaceId=${workspaceId}`, { headers });
        const messages = inboxRes.data || [];

        // Gom nhóm theo senderId để lấy danh sách khách hàng duy nhất
        const customerMap = new Map<string, any>();
        for (const msg of messages) {
          if (!msg.senderId || msg.type === "outbound") continue;

          const existing = customerMap.get(msg.senderId);
          const msgDate = new Date(msg.createdAt);

          if (!existing || msgDate > existing.rawDate) {
            customerMap.set(msg.senderId, {
              id: msg.senderId,
              name: msg.senderName && msg.senderName !== "Khách hàng" ? msg.senderName : `Khách #${msg.senderId.slice(-4)}`,
              status: msg.hasOrder ? "da_mua" : "chua_mua",
              lastChat: formatRelativeTime(msg.createdAt),
              rawDate: msgDate,
              page: msg.pageName || "Fanpage"
            });
          }
        }

        loadedCustomers = Array.from(customerMap.values());
      }

      setCustomers(loadedCustomers);
    } catch (error) {
      console.error("Lỗi tải danh sách khách hàng:", error);
    } finally {
      setFetching(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // --- LỌC KHÁCH HÀNG THEO TAB VÀ TÌM KIẾM ---
  const filteredCustomers = useMemo(() => {
    return customers
      .filter(c => c.status === activeTab)
      .filter(c => {
        if (!searchTerm.trim()) return true;
        const search = searchTerm.toLowerCase();
        return c.name.toLowerCase().includes(search) || c.page.toLowerCase().includes(search);
      });
  }, [customers, activeTab, searchTerm]);

  // Chọn / Bỏ chọn tất cả
  const toggleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  // Chọn / Bỏ chọn từng khách
  const toggleSelect = (id: string) => {
    setSelectedCustomers(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  // --- KÍCH HOẠT CHIẾN DỊCH AI REMARKETING ---
  const handleLaunchCampaign = async () => {
    if (selectedCustomers.length === 0) return alert("Vui lòng chọn ít nhất 1 khách hàng!");
    if (!aiPrompt.trim()) return alert("Vui lòng nhập kịch bản/yêu cầu cho AI!");
    
    setLoading(true);
    try {
      const workspaceId = localStorage.getItem("workspaceId") || "default_workspace";
      const token = localStorage.getItem("token");

      const res = await axios.post(
        `${API_URL}/remarketing/schedule`,
        { 
          customerIds: selectedCustomers, 
          prompt: aiPrompt, 
          scheduledAt: scheduleTime || new Date().toISOString(),
          workspaceId: workspaceId,
          campaignType: activeTab
        },
        {
          headers: { Authorization: token ? `Bearer ${token}` : "" }
        }
      );

      alert(res.data?.message || "✅ Đã kích hoạt chiến dịch AI Remarketing thành công!");
      setSelectedCustomers([]);
      setAiPrompt("");
    } catch (error: any) {
      alert("Lỗi: " + (error.response?.data?.message || error.message || "Không thể khởi chạy chiến dịch"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen text-black">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <h1 className="text-3xl font-black uppercase italic">AI Remarketing & Chăm Sóc</h1>
          <button 
            onClick={fetchCustomers}
            disabled={fetching}
            className="flex items-center gap-2 self-start px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={fetching ? "animate-spin text-blue-600" : ""} />
            Làm mới dữ liệu
          </button>
        </div>

        <p className="text-slate-500 mb-8 flex items-center gap-2 text-sm">
          <ShieldCheck size={18} className="text-green-600"/> 
          Tự động Spin nội dung chống Spam & Tuân thủ thuật toán Facebook
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* CỘT TRÁI: DANH SÁCH KHÁCH HÀNG */}
          <div className="lg:col-span-2 bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              {/* TABS CHUYỂN ĐỔI */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b pb-4">
                <div className="flex gap-2 sm:gap-4">
                  <button 
                    onClick={() => { setActiveTab("chua_mua"); setSelectedCustomers([]); }}
                    className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
                      activeTab === 'chua_mua' 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    Khách Chưa Mua ({customers.filter(c => c.status === "chua_mua").length})
                  </button>
                  <button 
                    onClick={() => { setActiveTab("da_mua"); setSelectedCustomers([]); }}
                    className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
                      activeTab === 'da_mua' 
                        ? 'bg-green-600 text-white shadow-md shadow-green-600/20' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    Khách Đã Mua ({customers.filter(c => c.status === "da_mua").length})
                  </button>
                </div>

                {/* Ô TÌM KIẾM NHANH */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs w-full sm:w-56 focus-within:border-blue-500 transition">
                  <Search size={14} className="text-slate-400 shrink-0" />
                  <input 
                    type="text"
                    placeholder="Tìm tên, Fanpage..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="bg-transparent outline-none w-full font-medium text-slate-700"
                  />
                </div>
              </div>

              {/* BẢNG KHÁCH HÀNG THẬT */}
              <div className="overflow-x-auto min-h-[300px]">
                {fetching ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                    <Loader2 size={32} className="animate-spin text-blue-600" />
                    <p className="text-xs font-bold uppercase tracking-wider">Đang tải danh sách khách hàng...</p>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
                    <Users size={44} className="text-slate-300 mb-3" />
                    <p className="text-sm font-black text-slate-700 uppercase">Chưa có khách hàng nào</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      {searchTerm ? "Không có kết quả khớp với từ khóa tìm kiếm." : "Khi khách hàng gửi tin nhắn vào Fanpage, họ sẽ tự động được thu thập vào đây."}
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-100 text-slate-400 text-[11px] font-black uppercase tracking-wider">
                        <th className="p-3 w-12 cursor-pointer" onClick={toggleSelectAll}>
                          {selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0 ? (
                            <CheckSquare className="text-blue-600" size={20} />
                          ) : (
                            <Square className="text-slate-300 hover:text-slate-500" size={20} />
                          )}
                        </th>
                        <th className="p-3">Tên Khách Hàng</th>
                        <th className="p-3">Fanpage</th>
                        <th className="p-3">Tương tác cuối</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map(customer => {
                        const isSelected = selectedCustomers.includes(customer.id);
                        return (
                          <tr key={customer.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 cursor-pointer" onClick={() => toggleSelect(customer.id)}>
                              {isSelected ? (
                                <CheckSquare className="text-blue-600" size={20} />
                              ) : (
                                <Square className="text-slate-300 hover:text-slate-500" size={20} />
                              )}
                            </td>
                            <td className="p-3 font-bold flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs shrink-0">
                                {customer.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-bold text-slate-800">{customer.name}</span>
                            </td>
                            <td className="p-3 text-xs font-semibold text-slate-600">{customer.page}</td>
                            <td className="p-3 text-xs">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                customer.lastChat.includes("phút") || customer.lastChat.includes("giờ") || customer.lastChat.includes("xong")
                                  ? "bg-green-100 text-green-700 border border-green-200" 
                                  : "bg-orange-100 text-orange-700 border border-orange-200"
                              }`}>
                                {customer.lastChat}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* THANH THỐNG KÊ ĐÃ CHỌN DƯỚI BẢNG */}
            {filteredCustomers.length > 0 && (
              <div className="pt-4 mt-4 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-500">
                <span>Đã chọn: <strong className="text-blue-600">{selectedCustomers.length}</strong> / {filteredCustomers.length} khách</span>
                {selectedCustomers.length > 0 && (
                  <button onClick={() => setSelectedCustomers([])} className="text-slate-400 hover:text-red-500 transition">
                    Bỏ chọn tất cả
                  </button>
                )}
              </div>
            )}
          </div>

          {/* CỘT PHẢI: THIẾT LẬP CHIẾN DỊCH AI */}
          <div className="bg-white rounded-[32px] p-6 shadow-xl border-t-8 border-blue-600 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                <Sparkles className="text-blue-600"/> Thiết Lập Chiến Dịch AI
              </h3>
              
              <div className="mb-6">
                <label className="text-xs font-black uppercase text-slate-500 mb-2 block">Kịch bản AI (Prompt)</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:border-blue-500 focus:bg-white min-h-[150px] font-medium text-sm text-slate-800 transition"
                  placeholder={
                    activeTab === 'chua_mua' 
                      ? 'Vd: Đóng vai CSKH, hỏi thăm nhẹ nhàng xem khách còn quan tâm sản phẩm không, đang lăn tăn về giá hay phí ship...' 
                      : 'Vd: Cảm ơn khách đã mua hàng, hỏi xem dùng sản phẩm có tốt không, tặng mã giảm giá 10% cho lần mua sau...'
                  }
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 mt-2 italic">
                  * AI sẽ tự động lấy tên khách hàng và viết lại (spin) nội dung cho từng người để tránh bị Facebook đánh dấu Spam.
                </p>
              </div>

              <div className="mb-8">
                <label className="text-xs font-black uppercase text-slate-500 mb-2 block flex items-center gap-2">
                  <Clock size={14}/> Thời gian bắt đầu gửi
                </label>
                <input 
                  type="datetime-local" 
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none focus:border-blue-500 focus:bg-white font-bold text-sm text-slate-700 transition"
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                />
              </div>
            </div>

            <button 
              onClick={handleLaunchCampaign}
              disabled={loading || selectedCustomers.length === 0}
              className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 active:scale-95 transition-all flex justify-center items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  ĐANG XỬ LÝ...
                </>
              ) : (
                <>
                  <Send size={18}/> 
                  KÍCH HOẠT CHO {selectedCustomers.length} KHÁCH
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}