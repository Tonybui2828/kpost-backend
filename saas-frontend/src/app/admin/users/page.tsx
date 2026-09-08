'use client';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast'; // Cài thêm react-hot-toast nếu chưa có: npm i react-hot-toast

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, FREE, PRO, GOLD, DIAMOND, DELETED

  // State cho Modal Nâng cấp
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [planForm, setPlanForm] = useState({ plan: 'PRO', extraDays: 30 });

  // State cho Modal Voucher
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');

  // 1. Fetch dữ liệu
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.kpost.vn'}/admin/users`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      toast.error('Lỗi tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Lọc user theo Tab
  const filteredUsers = users.filter(user => {
    if (activeTab === 'DELETED') return user.status === 'deleted';
    if (activeTab === 'ALL') return user.status === 'active';
    return user.status === 'active' && user.plan === activeTab;
  });

  // 2. Hàm Nâng cấp gói
  const handleUpgradePlan = async (e: any) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/${selectedUser.id}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planForm)
      });
      if (res.ok) {
        toast.success('Nâng cấp thành công!');
        setShowPlanModal(false);
        fetchUsers();
      }
    } catch (err) {
      toast.error('Lỗi nâng cấp');
    }
  };

  // 3. Hàm Tặng Voucher
  const handleAddVoucher = async (e: any) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/${selectedUser.id}/voucher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherCode })
      });
      if (res.ok) {
        toast.success('Đã tặng Voucher!');
        setShowVoucherModal(false);
        fetchUsers();
      }
    } catch (err) {
      toast.error('Lỗi tặng Voucher');
    }
  };

  // 4. Hàm Xóa / Khôi phục
  const toggleUserStatus = async (user: any) => {
    const isDeleting = user.status === 'active';
    const action = isDeleting ? 'delete' : 'restore';
    const method = isDeleting ? 'DELETE' : 'PUT';

    if (!confirm(`Bạn có chắc muốn ${isDeleting ? 'Khóa' : 'Khôi phục'} tài khoản này?`)) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/${user.id}${isDeleting ? '' : '/restore'}`, {
        method
      });
      if (res.ok) {
        toast.success('Cập nhật trạng thái thành công!');
        fetchUsers();
      }
    } catch (err) {
      toast.error('Lỗi hệ thống');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Quản lý Khách hàng</h1>

      {/* TABS PHÂN LOẠI */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2 overflow-x-auto">
        {['ALL', 'FREE', 'PRO', 'GOLD', 'DIAMOND', 'DELETED'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
              activeTab === tab 
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab === 'ALL' ? 'Tất cả' : tab === 'DELETED' ? 'Đã khóa' : `Gói ${tab}`}
          </button>
        ))}
      </div>

      {/* BẢNG DANH SÁCH */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-sm">
            <tr>
              <th className="p-4 font-medium">Khách hàng</th>
              <th className="p-4 font-medium">Gói hiện tại</th>
              <th className="p-4 font-medium">Ngày hết hạn</th>
              <th className="p-4 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="p-4 text-center">Đang tải...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    {user.vouchers?.length > 0 && (
                      <div className="text-xs text-orange-500 mt-1">
                        Voucher: {user.vouchers.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full 
                      ${user.plan === 'DIAMOND' ? 'bg-purple-100 text-purple-700' : 
                        user.plan === 'GOLD' ? 'bg-yellow-100 text-yellow-700' : 
                        user.plan === 'PRO' ? 'bg-blue-100 text-blue-700' : 
                        'bg-gray-100 text-gray-700'}`}
                    >
                      {user.plan}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {user.planExpire ? new Date(user.planExpire).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {user.status === 'active' ? (
                      <>
                        <button onClick={() => { setSelectedUser(user); setShowVoucherModal(true); }} className="text-xs px-3 py-1.5 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 font-medium">
                          + Voucher
                        </button>
                        <button onClick={() => { setSelectedUser(user); setShowPlanModal(true); }} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium">
                          Nâng cấp
                        </button>
                        <button onClick={() => toggleUserStatus(user)} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium">
                          Khóa
                        </button>
                      </>
                    ) : (
                      <button onClick={() => toggleUserStatus(user)} className="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 font-medium">
                        Khôi phục
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL NÂNG CẤP GÓI --- */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleUpgradePlan} className="bg-white p-6 rounded-xl w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-lg mb-4">Nâng cấp: {selectedUser?.name}</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Chọn gói</label>
                <select 
                  className="w-full border rounded-lg px-3 py-2"
                  value={planForm.plan}
                  onChange={e => setPlanForm({...planForm, plan: e.target.value})}
                >
                  <option value="PRO">Gói PRO</option>
                  <option value="GOLD">Gói GOLD</option>
                  <option value="DIAMOND">Gói DIAMOND</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Số ngày tặng thêm</label>
                <input 
                  type="number" 
                  className="w-full border rounded-lg px-3 py-2"
                  value={planForm.extraDays}
                  onChange={e => setPlanForm({...planForm, extraDays: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowPlanModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Hủy</button>
              <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">Lưu thay đổi</button>
            </div>
          </form>
        </div>
      )}

      {/* --- MODAL TẶNG VOUCHER --- */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleAddVoucher} className="bg-white p-6 rounded-xl w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-lg mb-4">Tặng Voucher: {selectedUser?.name}</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Nhập mã Voucher</label>
              <input 
                type="text" 
                required
                className="w-full border rounded-lg px-3 py-2 uppercase"
                placeholder="VD: KHVIP50"
                value={voucherCode}
                onChange={e => setVoucherCode(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowVoucherModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Hủy</button>
              <button type="submit" className="px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700">Tặng ngay</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}