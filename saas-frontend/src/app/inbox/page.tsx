"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { 
  MessageSquare, RefreshCw, Send, Loader2, Sparkles, 
  ShoppingCart, X, Package, CheckCircle, User, CheckCircle2,
  Trash2, Plus, Minus, Search, MapPin, Phone
} from "lucide-react";

export default function InboxPage() {
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false); // Thêm state loading cho AI

  // --- NEW STATE: THÔNG TIN KHÁCH HÀNG ---
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [products, setProducts] = useState([]); 
  const [orderItems, setOrderItems] = useState<any[]>([]); 
  const [searchTerm, setSearchTerm] = useState("");
  
  const workspaceId = "workspace-01";
  const chatEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  // Tự động điền tên khách từ tin nhắn khi mở Modal
  useEffect(() => {
    if (showOrderModal && selectedMsg) {
      setCustomerName(selectedMsg.senderName);
    }
  }, [showOrderModal, selectedMsg]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      await axios.post("http://localhost:3001/social/sync-inbox", { workspaceId });
      const res = await axios.get(`http://localhost:3001/social/inbox?workspaceId=${workspaceId}`);
      setMessages(res.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchChatHistory = async (msg: any) => {
    setSelectedMsg(msg);
    try {
      const res = await axios.get(`http://localhost:3001/social/chat-history?senderId=${msg.senderId}&workspaceId=${workspaceId}`);
      setChatHistory(res.data || []);
      const prodRes = await axios.get(`http://localhost:3001/products?workspaceId=${workspaceId}`);
      setProducts(prodRes.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchConversations(); }, []);

  const addToCart = (p: any) => {
    setOrderItems(prev => {
      const existing = prev.find(item => item.productId === p.id);
      if (existing) return prev.map(item => item.productId === p.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { productId: p.id, name: p.name, price: p.price, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setOrderItems(prev => prev.filter(item => item.productId !== productId));
  };

  const handleSend = async () => {
    if (!selectedMsg || !replyText.trim()) return;
    setSending(true);
    try {
      await axios.post("http://localhost:3001/social/reply", {
        workspaceId, senderId: selectedMsg.senderId, text: replyText, pageName: selectedMsg.pageName,
        type: selectedMsg.type, platformId: selectedMsg.platformId
      });
      setChatHistory(prev => [...prev, { content: replyText, type: 'outbound', createdAt: new Date() }]);
      setReplyText("");
    } catch (error: any) { 
      alert("FACEBOOK TỪ CHỐI: " + (error.response?.data?.message || "Lỗi")); 
    } finally { setSending(false); }
  };

  // --- HÀM AI TỰ ĐIỀN THÔNG TIN (MỚI THÊM) ---
  const handleAiFill = async () => {
    if (chatHistory.length === 0) return;
    
    // SỬA TẠI ĐÂY: Lọc tất cả tin nhắn KHÔNG PHẢI của Admin (outbound)
    const fullChatText = chatHistory
      .filter(c => c.type !== 'outbound') 
      .map(c => c.content)
      .join("\n");

    if (!fullChatText.trim()) {
        alert("Không có tin nhắn nào từ khách để bóc tách.");
        return;
    }

    setAiLoading(true);
    try {
      const res = await axios.post("http://localhost:3001/social/extract-info", {
        text: fullChatText
      });

      if (res.data) {
        // Cập nhật State và kiểm tra dữ liệu trả về
        if (res.data.phone) setCustomerPhone(res.data.phone);
        if (res.data.address) setCustomerAddress(res.data.address);
        
        if (!res.data.phone && !res.data.address) {
            alert("AI không tìm thấy SĐT hoặc địa chỉ trong đoạn chat.");
        } else {
            alert("AI đã bóc tách thông tin thành công! ✨");
        }
      }
    } catch (e) {
      alert("Lỗi kết nối AI.");
    } finally {
      setAiLoading(false);
    }
  };

  // --- HÀM CHỐT ĐƠN ---
  const submitOrder = async () => {
    if (orderItems.length === 0) return alert("Giỏ hàng trống!");
    if (!customerPhone || !customerAddress) return alert("Vui lòng nhập SĐT và Địa chỉ để giao hàng!");

    setSending(true);
    try {
      const resOrder = await axios.post("http://localhost:3001/orders", {
        workspaceId, customerName, customerPhone, customerAddress, items: orderItems
      });

      const orderId = resOrder.data.id.substring(0,8).toUpperCase();
      const total = orderItems.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString();
      const list = orderItems.map(i => `• ${i.name} (x${i.quantity})`).join('\n');
      const bill = `✅ XÁC NHẬN CHỐT ĐƠN!\n\nMã đơn: #${orderId}\nKhách hàng: ${customerName}\nSĐT: ${customerPhone}\nĐịa chỉ: ${customerAddress}\n\nSản phẩm:\n${list}\n--------------------------\nTổng: ${total}đ\nCảm ơn bạn! ❤️`;

      await axios.post("http://localhost:3001/social/reply", {
        workspaceId, senderId: selectedMsg.senderId, text: bill, pageName: selectedMsg.pageName,
        type: selectedMsg.type, platformId: selectedMsg.platformId
      });

      setChatHistory(prev => [...prev, { content: bill, type: 'outbound', createdAt: new Date() }]);
      alert("Đã chốt đơn & gửi hóa đơn thành công! 🚀");
      setShowOrderModal(false);
      setOrderItems([]);
      setCustomerPhone("");
      setCustomerAddress("");
    } catch (e: any) {
        alert("THẤT BẠI: " + (e.response?.data?.message || "Lỗi"));
    } finally { setSending(false); }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black flex items-center gap-3 italic text-black">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg"><MessageSquare size={28} /></div>
            CRM Smart Inbox
        </h1>
        <button onClick={fetchConversations} className="bg-white px-6 py-3 rounded-2xl shadow-sm border font-bold flex items-center gap-2 hover:bg-slate-50 transition-all text-slate-500">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-black font-medium">
        <div className="lg:col-span-1 bg-white rounded-[40px] shadow-sm border border-slate-100 h-[75vh] flex flex-col overflow-hidden">
           <div className="p-6 border-b bg-slate-50/50 font-black text-slate-400 text-[10px] uppercase">Hội thoại</div>
           <div className="flex-1 overflow-y-auto">
              {messages.map((msg: any) => (
                <div key={msg.id} onClick={() => fetchChatHistory(msg)} className={`p-6 border-b cursor-pointer transition-all border-l-4 ${selectedMsg?.senderId === msg.senderId ? 'bg-blue-50 border-l-blue-600 shadow-inner' : 'hover:bg-slate-50'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-black text-sm text-slate-800">{msg.senderName}</span>
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase ${msg.type === 'comment' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>{msg.type}</span>
                  </div>
                  <p className="text-sm text-slate-500 truncate italic">"{msg.content}"</p>
                </div>
              ))}
           </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-[40px] shadow-xl border border-slate-100 flex flex-col h-[75vh] overflow-hidden relative">
            {selectedMsg ? (
              <>
                <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                   <div className="flex items-center gap-3 text-black">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">{selectedMsg.senderName[0]}</div>
                      <p className="font-black">{selectedMsg.senderName}</p>
                   </div>
                   <button onClick={() => setShowOrderModal(true)} className="bg-green-600 text-white px-6 py-2 rounded-full text-[10px] font-black flex items-center gap-2 hover:bg-green-700 shadow-lg transition-all active:scale-95">
                        <ShoppingCart size={14} /> TẠO ĐƠN NHANH
                   </button>
                </div>
                
                <div className="flex-1 p-8 overflow-y-auto bg-slate-50/20 flex flex-col gap-4">
                    {chatHistory.map((chat: any, index: number) => (
                      <div key={index} className={`flex ${chat.type === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-4 rounded-2xl max-w-[85%] font-medium whitespace-pre-wrap ${chat.type === 'outbound' ? 'bg-blue-600 text-white rounded-tr-none shadow-md' : 'bg-white text-slate-700 border rounded-tl-none'}`}>{chat.content}</div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>

                <div className="p-8 border-t bg-white">
                   <div className="flex gap-4">
                      <input className="flex-1 p-4 bg-slate-100 rounded-xl outline-none text-slate-900 font-medium" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Nhập tin nhắn..." onKeyPress={(e) => e.key === 'Enter' && handleSend()} />
                      <button onClick={handleSend} disabled={sending} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-800 transition-all">
                        {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />} GỬI
                      </button>
                   </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300 italic font-bold">Chọn hội thoại để bắt đầu</div>
            )}

            {showOrderModal && (
              <div className="absolute inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-right duration-300 text-black">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-black flex items-center gap-2 text-black"><ShoppingCart className="text-green-600" /> CHI TIẾT ĐƠN HÀNG</h2>
                    <button onClick={() => setShowOrderModal(false)} className="text-slate-400 hover:text-red-500"><X size={24}/></button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                    <div className="w-full lg:w-1/2 p-6 border-r flex flex-col overflow-hidden">
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-3 text-slate-300" size={18} />
                            <input className="w-full p-3 pl-10 bg-slate-100 rounded-xl outline-none text-sm font-medium text-black" placeholder="Tìm tên sản phẩm..." onChange={(e) => setSearchTerm(e.target.value.toLowerCase())} />
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {products.filter(p => p.name.toLowerCase().includes(searchTerm)).map((p: any) => (
                                <div key={p.id} onClick={() => addToCart(p)} className="p-4 border rounded-2xl hover:border-blue-500 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-all bg-white group shadow-sm">
                                    <div className="text-black font-medium">
                                        <p className="text-sm font-bold">{p.name}</p>
                                        <p className="text-xs text-blue-600 font-black">{Number(p.price).toLocaleString()}đ</p>
                                    </div>
                                    <Plus className="text-slate-200 group-hover:text-blue-500" size={20} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="w-full lg:w-1/2 p-6 bg-slate-50/50 flex flex-col overflow-y-auto">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6">
                           <div className="flex justify-between items-center mb-4">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thông tin giao hàng</p>
                              {/* SỬA NÚT AI TỰ ĐIỀN TẠI ĐÂY */}
                              <button 
                                onClick={handleAiFill}
                                disabled={aiLoading}
                                className="text-[9px] bg-blue-100 text-blue-600 px-2 py-1 rounded-lg font-black flex items-center gap-1 hover:bg-blue-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                              >
                                {aiLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} AI TỰ ĐIỀN
                              </button>
                           </div>
                           <div className="space-y-3">
                              <div className="relative">
                                <User className="absolute left-3 top-3 text-slate-300" size={16} />
                                <input className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold" placeholder="Họ tên khách hàng" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                              </div>
                              <div className="relative">
                                <Phone className="absolute left-3 top-3 text-slate-300" size={16} />
                                <input className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold" placeholder="Số điện thoại" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                              </div>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-slate-300" size={16} />
                                <textarea className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-bold h-20 resize-none font-sans" placeholder="Địa chỉ giao hàng chi tiết..." value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                              </div>
                           </div>
                        </div>

                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 font-sans">Sản phẩm khách chọn</p>
                        <div className="flex-1 space-y-3">
                            {orderItems.map((item) => (
                                <div key={item.productId} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center text-black">
                                    <div className="text-black font-medium">
                                        <p className="text-sm font-bold truncate max-w-[150px]">{item.name}</p>
                                        <p className="text-xs text-green-600 font-black font-sans">x{item.quantity} - {Number(item.price * item.quantity).toLocaleString()}đ</p>
                                    </div>
                                    <button onClick={() => removeFromCart(item.productId)} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={20}/></button>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-6 border-t bg-white p-6 rounded-[32px] shadow-lg sticky bottom-0">
                            <div className="flex justify-between items-end mb-6 font-sans">
                                <span className="text-xs font-bold text-slate-400">TỔNG THANH TOÁN:</span>
                                <span className="text-3xl font-black text-blue-600">{orderItems.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()}đ</span>
                            </div>
                            <button onClick={submitOrder} disabled={sending || orderItems.length === 0} className="w-full bg-blue-600 text-white font-black py-5 rounded-[24px] shadow-xl hover:bg-blue-700 flex justify-center items-center gap-3 transition-all active:scale-95 disabled:bg-slate-200">
                                {sending ? <Loader2 className="animate-spin" /> : <CheckCircle size={24} />} XÁC NHẬN CHỐT ĐƠN 🚀
                            </button>
                        </div>
                    </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}