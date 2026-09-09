'use client';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, FREE, PRO, GOLD, DIAMOND, DELETED
  
  // MỚI: State cho thanh tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');

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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.kpost.vn'}/admin/users-list`);
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

  // Lọc user theo Tab VÀ Từ khóa tìm kiếm
  const filteredUsers = users.filter(user => {
    // 1. Lọc theo tìm kiếm (name hoặc email)
    const matchSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;

    // 2. Lọc theo tab trạng thái/gói cước
    if (activeTab === 'DELETED') return user.status === 'deleted';
    if (activeTab === 'ALL') return user.status === 'active';
    return user.status === 'active' && user.plan?.toUpperCase() === activeTab;
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
        setVoucherCode('');
        fetchUsers();
      }
    } catch (err) {
      toast.error('Lỗi tặng Voucher');
    }
  };

  // 4. Hàm Xóa / Khôi phục
  const toggleUserStatus = async (user: any) => {
    const isDeleting = user.status === 'active';
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Khách hàng</h1>
        
        {/* --- THANH TÌM KIẾM MỚI THÊM --- */}
        <div className="w-full md:w-80 relative">
          <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            type="text" 
            placeholder="Tìm theo email, tên khách hàng..." 
            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* TABS PHÂN LOẠI */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2 overflow-x-auto">
        {['ALL', 'FREE', 'PRO', 'GOLD', 'DIAMOND', 'DELETED'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap ${
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
              <tr><td colSpan={4} className="p-8 text-center text-gray-400">Đang tải dữ liệu...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">Không tìm thấy khách hàng nào.</td></tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    {user.vouchers?.length > 0 && (
                      <div className="text-xs text-orange-600 mt-1.5 font-medium bg-orange-50 inline-block px-2 py-0.5 rounded">
                        Kho Voucher: {user.vouchers.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wide
                      ${user.plan?.toUpperCase() === 'DIAMOND' ? 'bg-purple-100 text-purple-700' : 
                        user.plan?.toUpperCase() === 'GOLD' ? 'bg-yellow-100 text-yellow-700' : 
                        user.plan?.toUpperCase() === 'PRO' ? 'bg-blue-100 text-blue-700' : 
                        'bg-gray-100 text-gray-700'}`}
                    >
                      {user.plan || 'FREE'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600 font-medium">
                    {user.planExpire ? new Date(user.planExpire).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {user.status === 'active' ? (
                      <div className="flex justify-end items-center gap-2">
                        <button onClick={() => { setSelectedUser(user); setShowVoucherModal(true); }} className="text-xs px-3 py-1.5 bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100 font-medium transition">
                          + Voucher
                        </button>
                        <button onClick={() => { setSelectedUser(user); setShowPlanModal(true); }} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 font-medium transition">
                          Nâng cấp
                        </button>
                        <button onClick={() => toggleUserStatus(user)} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 font-medium transition">
                          Khóa
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => toggleUserStatus(user)} className="text-xs px-4 py-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 font-medium transition">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleUpgradePlan} className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-xl mb-1 text-gray-900">Nâng cấp gói</h3>
            <p className="text-sm text-gray-500 mb-5">Khách hàng: <span className="font-semibold text-gray-700">{selectedUser?.name}</span></p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700">Chọn gói</label>
                <select 
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={planForm.plan}
                  onChange={e => setPlanForm({...planForm, plan: e.target.value})}
                >
                  <option value="PRO">Gói PRO</option>
                  <option value="GOLD">Gói GOLD</option>
                  <option value="DIAMOND">Gói DIAMOND</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700">Số ngày tặng thêm</label>
                <input 
                  type="number" 
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={planForm.extraDays}
                  onChange={e => setPlanForm({...planForm, extraDays: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowPlanModal(false)} className="px-5 py-2.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition">Hủy</button>
              <button type="submit" className="px-5 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition">Lưu thay đổi</button>
            </div>
          </form>
        </div>
      )}

      {/* --- MODAL TẶNG VOUCHER --- */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddVoucher} className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-xl mb-1 text-gray-900">Tặng Voucher riêng</h3>
            <p className="text-sm text-gray-500 mb-5">Khách hàng: <span className="font-semibold text-gray-700">{selectedUser?.name}</span></p>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1.5 text-gray-700">Nhập mã Voucher</label>
              <input 
                type="text" 
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 uppercase focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="VD: KHVIP50"
                value={voucherCode}
                onChange={e => setVoucherCode(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowVoucherModal(false)} className="px-5 py-2.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition">Hủy</button>
              <button type="submit" className="px-5 py-2.5 text-white bg-orange-600 rounded-lg hover:bg-orange-700 font-medium shadow-sm transition">Tặng ngay</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}