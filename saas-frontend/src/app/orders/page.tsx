"use client";
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  ShoppingBag, Truck, Loader2, RefreshCw, 
  Trash2, Edit3, X, Save, User, Phone, MapPin
} from 'lucide-react';

export default function OrdersPage() {
  // --- 1. CẤU HÌNH API ĐỘNG ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [orders, setOrders] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // --- STATE DÀNH CHO CHỈNH SỬA ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editForm, setEditForm] = useState({ 
    name: "", phone: "", address: "", 
    province: "", district: "", ward: "", total: 0 
  });

  // 1. Lấy ID thật của khách hàng từ bộ nhớ máy ngay khi mở trang
  useEffect(() => {
    const savedId = localStorage.getItem("workspaceId");
    if (savedId) {
      setWorkspaceId(savedId);
    } else {
      setWorkspaceId("workspace-01"); 
    }
  }, []);

  // 2. HÀM LẤY DANH SÁCH ĐƠN HÀNG (DUY NHẤT 1 HÀM)
  const fetchOrders = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/orders?workspaceId=${workspaceId}`);
      setOrders(res.data || []);
    } catch (e) {
      console.error("Lỗi lấy đơn hàng:", e);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, API_URL]);

  // Tự động tải đơn hàng khi ID đã sẵn sàng
  useEffect(() => {
    if (workspaceId) {
      fetchOrders();
    }
  }, [workspaceId, fetchOrders]);

  const handleEditClick = (order: any) => {
    setEditingOrder(order);
    setEditForm({
        name: order.customerName || "",
        phone: order.customerPhone || "",
        address: order.customerAddress || "",
        province: order.province || "",
        district: order.district || "",
        ward: order.ward || "",
        total: order.totalAmount || 0
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateOrder = async () => {
    if(!editForm.province || !editForm.district) return alert("Vui lòng điền Tỉnh và Huyện!");
    try {
      await axios.patch(`${API_URL}/orders/${editingOrder.id}`, {
        customerName: editForm.name,
        customerPhone: editForm.phone,
        customerAddress: editForm.address,
        province: editForm.province,
        district: editForm.district,
        ward: editForm.ward,
        totalAmount: editForm.total
      });
      alert("✅ Đã cập nhật thông tin đơn hàng!");
      setIsEditModalOpen(false);
      fetchOrders(); 
    } catch (e) {
      alert("❌ Lỗi khi cập nhật.");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa đơn hàng này?")) return;
    try {
      await axios.delete(`${API_URL}/orders/${orderId}`);
      setOrders(prev => prev.filter((o: any) => o.id !== orderId));
    } catch (error) {
      alert("❌ Lỗi xóa đơn.");
    }
  };

  const handleShipOrder = async (orderId: string) => {
    try {
      await axios.post(`${API_URL}/orders/${orderId}/ship`);
      alert("🚀 THÀNH CÔNG: Đơn đã vào mục ĐƠN NHÁP trên ViettelPost!");
      fetchOrders(); 
    } catch (error: any) {
      alert("❌ THẤT BẠI: " + (error.response?.data?.message || "Lỗi vận chuyển"));
    }
  };

  const filteredOrders = orders.filter((o: any) => filter === 'all' ? true : o.status === filter);

  return (
    <div className="p-8 text-slate-800 font-sans relative">
      
      {/* --- MODAL CHỈNH SỬA --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] p-8 max-w-xl w-full shadow-2xl animate-in zoom-in duration-300 text-black">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black italic uppercase flex items-center gap-3">
                        <Edit3 className="text-blue-600" /> Chỉnh sửa đơn hàng
                    </h2>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-slate-300 hover:text-red-500"><X size={28} /></button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input className="w-full p-4 bg-slate-50 rounded-2xl border outline-none font-bold" placeholder="Họ tên" value={editForm.name} onChange={(e)=>setEditForm({...editForm, name: e.target.value})} />
                        <input className="w-full p-4 bg-slate-50 rounded-2xl border outline-none font-bold" placeholder="SĐT" value={editForm.phone} onChange={(e)=>setEditForm({...editForm, phone: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input placeholder="Tỉnh / Thành phố" className="w-full p-4 bg-white border-2 border-blue-100 rounded-2xl outline-none font-bold text-blue-600" value={editForm.province} onChange={(e)=>setEditForm({...editForm, province: e.target.value})} />
                        <input placeholder="Quận / Huyện" className="w-full p-4 bg-white border-2 border-blue-100 rounded-2xl outline-none font-bold text-blue-600" value={editForm.district} onChange={(e)=>setEditForm({...editForm, district: e.target.value})} />
                    </div>
                    <input placeholder="Phường / Xã" className="w-full p-4 bg-slate-50 rounded-2xl border outline-none font-bold" value={editForm.ward} onChange={(e)=>setEditForm({...editForm, ward: e.target.value})} />
                    <textarea rows={2} className="w-full p-4 bg-slate-50 rounded-2xl border outline-none font-bold resize-none" placeholder="Số nhà / Tên đường" value={editForm.address} onChange={(e)=>setEditForm({...editForm, address: e.target.value})} />
                </div>

                <button onClick={handleUpdateOrder} className="w-full mt-6 bg-blue-600 text-white font-black py-4 rounded-[20px] shadow-lg hover:bg-blue-700 transition-all">
                    <Save size={20} /> LƯU THÔNG TIN
                </button>
            </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-10 text-black">
        <h1 className="text-3xl font-black flex items-center gap-4 italic uppercase tracking-tighter">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg"><ShoppingBag size={28} /></div>
            Quản lý Đơn hàng
        </h1>
        <button onClick={fetchOrders} className="p-3 bg-white border rounded-2xl hover:bg-slate-50 transition-all">
            <RefreshCw size={20} className={loading ? "animate-spin text-blue-600" : "text-slate-400"} />
        </button>
      </div>

      <div className="flex gap-2 mb-8">
        {['all', 'confirmed', 'shipping'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all ${filter === s ? "bg-blue-600 text-white shadow-md" : "bg-white border text-slate-400"}`}>
            {s === 'all' ? 'Tất cả' : s === 'confirmed' ? 'Chờ giao' : 'Đang giao'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b">
            <tr>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase">Khách hàng / Địa chỉ</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase text-center">Trạng thái</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y text-black">
            {filteredOrders.map((order: any) => (
              <tr key={order.id} className="hover:bg-slate-50/30 transition-all">
                <td className="px-8 py-6">
                  <p className="font-black text-slate-900 text-base">{order.customerName}</p>
                  <div className="flex items-center gap-1 mt-1 text-slate-500">
                    <MapPin size={10} className="text-blue-500" />
                    <p className="text-[10px] font-medium italic">{order.province ? `${order.province} - ${order.district}` : order.customerAddress}</p>
                  </div>
                  <p className="text-[11px] text-blue-600 font-black mt-2 italic tracking-tighter">Tổng: {order.totalAmount.toLocaleString()}đ</p>
                </td>
                <td className="px-8 py-6 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${order.status === 'confirmed' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                      {order.status === 'confirmed' ? 'Chờ giao' : 'Đã đẩy VTP'}
                    </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex justify-end items-center gap-2">
                    {order.status === 'confirmed' ? (
                      <>
                        <button onClick={() => handleEditClick(order)} className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 rounded-2xl transition-all shadow-sm"><Edit3 size={18} /></button>
                        <button onClick={() => handleShipOrder(order.id)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase italic shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"><Truck size={16} /> Giao ngay</button>
                      </>
                    ) : (
                        <div className="text-right">
                            <p className="text-[9px] font-black text-green-600 uppercase mb-1">Vận đơn VTP</p>
                            <p className="text-sm font-black text-slate-900">{order.shippingCode || "DRAFT"}</p>
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
              <p className="text-slate-300 font-black italic uppercase text-sm">Danh sách trống</p>
          </div>
        )}
      </div>
    </div>
  );
}