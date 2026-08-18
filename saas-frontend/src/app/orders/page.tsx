"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShoppingBag, Truck, Loader2, RefreshCw, 
  Trash2, PackageCheck, Edit3, X, Save, User, Phone, MapPin
} from 'lucide-react';

export default function OrdersPage() {
  // --- 1. LẤY URL API TỪ BIẾN MÔI TRƯỜNG ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const [orders, setOrders] = useState<any[]>([]); // Thêm <any[]> để hết lỗi build
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // --- STATE DÀNH CHO CHỈNH SỬA ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "", total: 0 });

  const workspaceId = "workspace-01"; 

  // --- 2. SỬA LINK LẤY ĐƠN HÀNG ---
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/orders?workspaceId=${workspaceId}`);
      setOrders(res.data || []);
    } catch (e) {
      console.error("Lỗi lấy đơn hàng:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleEditClick = (order: any) => {
    setEditingOrder(order);
    setEditForm({
        name: order.customerName,
        phone: order.customerPhone,
        address: order.customerAddress,
        total: order.totalAmount
    });
    setIsEditModalOpen(true);
  };

  // --- 3. SỬA LINK CẬP NHẬT ĐƠN HÀNG ---
  const handleUpdateOrder = async () => {
    try {
      await axios.patch(`${API_URL}/orders/${editingOrder.id}`, {
        customerName: editForm.name,
        customerPhone: editForm.phone,
        customerAddress: editForm.address,
        totalAmount: editForm.total
      });
      alert("✅ Đã cập nhật thông tin đơn hàng!");
      setIsEditModalOpen(false);
      fetchOrders(); 
    } catch (e) {
      alert("❌ Lỗi khi cập nhật đơn hàng.");
    }
  };

  // --- 4. SỬA LINK XÓA ĐƠN ---
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa đơn hàng này?")) return;
    try {
      await axios.delete(`${API_URL}/orders/${orderId}`);
      setOrders(prev => prev.filter((o: any) => o.id !== orderId));
    } catch (error) {
      alert("❌ Lỗi xóa đơn.");
    }
  };

  // --- 5. SỬA LINK GIAO HÀNG VIETTELPOST ---
  const handleShipOrder = async (orderId: string) => {
    try {
      await axios.post(`${API_URL}/orders/${orderId}/ship`);
      alert("✅ Đã đẩy đơn sang ViettelPost thành công!");
      fetchOrders(); 
    } catch (error: any) {
      alert("❌ THẤT BẠI: " + (error.response?.data?.message || "Lỗi vận chuyển"));
    }
  };

  const filteredOrders = orders.filter((o: any) => {
    if (filter === 'all') return true;
    return o.status === filter;
  });

  return (
    <div className="p-8 text-slate-800 font-sans relative">
      
      {/* --- MODAL CHỈNH SỬA THÔNG TIN --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in duration-300 text-black">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black italic uppercase flex items-center gap-3 text-black">
                        <Edit3 className="text-blue-600" /> Chỉnh sửa thông tin
                    </h2>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-slate-300 hover:text-red-500"><X size={32} /></button>
                </div>

                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Họ tên khách</label>
                        <div className="relative text-black">
                            <User className="absolute left-4 top-4 text-slate-300" size={18} />
                            <input className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-blue-500 transition-all text-black" value={editForm.name} onChange={(e)=>setEditForm({...editForm, name: e.target.value})} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Số điện thoại</label>
                        <div className="relative text-black">
                            <Phone className="absolute left-4 top-4 text-slate-300" size={18} />
                            <input className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-blue-500 transition-all text-black" value={editForm.phone} onChange={(e)=>setEditForm({...editForm, phone: e.target.value})} />
                        </div>
                    </div>

                    <div className="space-y-2 text-black">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Địa chỉ giao hàng</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-4 text-slate-300" size={18} />
                            <textarea rows={3} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-blue-500 transition-all resize-none text-black" value={editForm.address} onChange={(e)=>setEditForm({...editForm, address: e.target.value})} />
                        </div>
                    </div>
                </div>

                <button onClick={handleUpdateOrder} className="w-full mt-8 bg-blue-600 text-white font-black py-5 rounded-[25px] shadow-xl shadow-blue-100 flex justify-center items-center gap-3 hover:bg-blue-700 active:scale-95 transition-all">
                    <Save size={20} /> LƯU THAY ĐỔI
                </button>
            </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-10 text-black">
        <h1 className="text-3xl font-black flex items-center gap-4 italic uppercase tracking-tighter text-black">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100"><ShoppingBag size={28} /></div>
            Quản lý Đơn hàng
        </h1>
        <button onClick={fetchOrders} className="p-3 bg-white border rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
            <RefreshCw size={20} className={loading ? "animate-spin text-blue-600" : "text-slate-400"} />
        </button>
      </div>

      {/* Bộ lọc */}
      <div className="flex gap-2 mb-8">
        {['all', 'confirmed', 'shipping', 'pending_shipping'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all ${filter === s ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white border text-slate-400 hover:bg-slate-50"}`}>
            {s === 'all' ? 'Tất cả' : s === 'confirmed' ? 'Đã chốt' : s === 'shipping' ? 'Đang giao' : 'Chờ vận chuyển'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b">
            <tr>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase">Khách hàng</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase text-center">Trạng thái</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y text-black font-medium">
            {filteredOrders.map((order: any) => (
              <tr key={order.id} className="hover:bg-slate-50/30 transition-all group">
                <td className="px-8 py-6">
                  <p className="font-black text-slate-900 text-base">{order.customerName}</p>
                  <p className="text-[11px] text-slate-400 font-medium">{order.customerPhone} • {order.customerAddress}</p>
                  <p className="text-[11px] text-blue-600 font-black mt-1 uppercase italic tracking-tighter">Tổng tiền: {order.totalAmount.toLocaleString()}đ</p>
                </td>
                <td className="px-8 py-6 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${order.status === 'confirmed' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                      {order.status === 'confirmed' ? 'CHỜ GIAO HÀNG' : 'ĐÃ ĐẨY SANG VTP'}
                    </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex justify-end items-center gap-2">
                    {order.status === 'confirmed' ? (
                      <>
                        <button 
                          onClick={() => handleEditClick(order)}
                          className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-2xl transition-all shadow-sm"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => handleShipOrder(order.id)}
                          className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase italic shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
                        >
                          <Truck size={16} /> Giao ngay
                        </button>
                      </>
                    ) : (
                        <div className="text-right">
                            <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1">Mã vận đơn</p>
                            <p className="text-sm font-black text-slate-900">{order.shippingCode || "Đang xử lý..."}</p>
                        </div>
                    )}
                    <button onClick={() => handleDeleteOrder(order.id)} className="p-3 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredOrders.length === 0 && (
          <div className="py-24 text-center">
              <ShoppingBag size={48} className="mx-auto text-slate-100 mb-4" />
              <p className="text-slate-300 font-black italic uppercase text-sm tracking-widest">Danh sách trống</p>
          </div>
        )}
      </div>
    </div>
  );
}