"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Users, Search, Clock, Send, MessageSquare, 
  Sparkles, ShieldCheck, CheckSquare, Square
} from "lucide-react";

export default function RemarketingPage() {
  const [activeTab, setActiveTab] = useState("chua_mua");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [scheduleTime, setScheduleTime] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  // Dữ liệu mẫu (Sau này bạn fetch từ API Backend của bạn)
  const mockCustomers = [
    { id: "1", name: "Nguyễn Văn Khang", status: "chua_mua", lastChat: "2 giờ trước", page: "Kpost 01" },
    { id: "2", name: "Trần Thị Mai", status: "da_mua", lastChat: "1 ngày trước", page: "Điện Máy Anh Kỳ" },
    { id: "3", name: "Lê Hoàng", status: "chua_mua", lastChat: "3 ngày trước", page: "Kpost 02" },
  ];

  const filteredCustomers = mockCustomers.filter(c => c.status === activeTab);

  const toggleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedCustomers(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleLaunchCampaign = async () => {
    if (selectedCustomers.length === 0) return alert("Vui lòng chọn ít nhất 1 khách hàng!");
    if (!aiPrompt) return alert("Vui lòng nhập kịch bản/yêu cầu cho AI!");
    
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const workspaceId = localStorage.getItem('workspaceId') || "default_workspace";

      // 🚀 Gọi API gửi dữ liệu xuống Backend
      const res = await axios.post(`${API_URL}/remarketing/schedule`, { 
        customerIds: selectedCustomers, 
        prompt: aiPrompt, 
        scheduledAt: scheduleTime || new Date().toISOString(),
        workspaceId: workspaceId
      });

      alert(res.data.message);
      setSelectedCustomers([]);
    } catch (error: any) {
      alert("Lỗi: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen text-black">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black uppercase italic mb-2">AI Remarketing & Chăm Sóc</h1>
        <p className="text-slate-500 mb-8 flex items-center gap-2">
          <ShieldCheck size={18} className="text-green-600"/> 
          Tự động Spin nội dung chống Spam & Tuân thủ thuật toán Facebook
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* CỘT TRÁI: DANH SÁCH KHÁCH HÀNG */}
          <div className="lg:col-span-2 bg-white rounded-[32px] p-6 shadow-sm border">
            {/* TABS */}
            <div className="flex gap-4 mb-6 border-b pb-4">
              <button 
                onClick={() => setActiveTab("chua_mua")}
                className={`px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === 'chua_mua' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                Khách Chưa Mua (Hỏi thăm/Thuyết phục)
              </button>
              <button 
                onClick={() => setActiveTab("da_mua")}
                className={`px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === 'da_mua' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                Khách Đã Mua (Xin Feedback/Upsale)
              </button>
            </div>

            {/* BẢNG KHÁCH HÀNG */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-100 text-slate-400 text-sm uppercase">
                    <th className="p-3 cursor-pointer" onClick={toggleSelectAll}>
                      {selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0 ? <CheckSquare className="text-blue-600"/> : <Square/>}
                    </th>
                    <th className="p-3">Tên Khách Hàng</th>
                    <th className="p-3">Fanpage</th>
                    <th className="p-3">Tương tác cuối</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(customer => (
                    <tr key={customer.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="p-3 cursor-pointer" onClick={() => toggleSelect(customer.id)}>
                        {selectedCustomers.includes(customer.id) ? <CheckSquare className="text-blue-600"/> : <Square className="text-slate-300"/>}
                      </td>
                      <td className="p-3 font-bold flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black">{customer.name.charAt(0)}</div>
                        {customer.name}
                      </td>
                      <td className="p-3 text-sm text-slate-600">{customer.page}</td>
                      <td className="p-3 text-sm text-slate-500">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${customer.lastChat.includes('giờ') ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {customer.lastChat}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CỘT PHẢI: SETUP CHIẾN DỊCH AI */}
          <div className="bg-white rounded-[32px] p-6 shadow-xl border-t-8 border-blue-600">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2"><Sparkles className="text-blue-600"/> Thiết Lập Chiến Dịch AI</h3>
            
            <div className="mb-6">
              <label className="text-xs font-black uppercase text-slate-500 mb-2 block">Kịch bản AI (Prompt)</label>
              <textarea 
                className="w-full bg-slate-50 border p-4 rounded-2xl outline-none focus:border-blue-500 min-h-[150px] font-medium"
                placeholder={activeTab === 'chua_mua' ? 'Vd: Đóng vai CSKH, hỏi thăm nhẹ nhàng xem khách còn quan tâm đèn chống cận không, đang lăn tăn về giá hay phí ship...' : 'Vd: Cảm ơn khách đã mua hàng, hỏi xem dùng sp có tốt không, tặng mã giảm giá 10% cho lần mua sau...'}
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-2 italic">
                * AI sẽ tự động lấy tên khách hàng và viết lại (spin) nội dung cho từng người để tránh bị Facebook đánh dấu Spam.
              </p>
            </div>

            <div className="mb-8">
              <label className="text-xs font-black uppercase text-slate-500 mb-2 block flex items-center gap-2"><Clock size={14}/> Thời gian bắt đầu gửi</label>
              <input 
                type="datetime-local" 
                className="w-full bg-slate-50 border p-3 rounded-xl outline-none focus:border-blue-500 font-bold"
                value={scheduleTime}
                onChange={e => setScheduleTime(e.target.value)}
              />
            </div>

            <button 
              onClick={handleLaunchCampaign}
              disabled={loading}
              className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 active:scale-95 transition-all flex justify-center items-center gap-2 shadow-lg shadow-blue-200"
            >
              {loading ? "ĐANG XỬ LÝ..." : <><Send size={18}/> KÍCH HOẠT CHIẾN DỊCH</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}