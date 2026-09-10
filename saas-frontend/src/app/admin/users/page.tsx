'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.kpost.vn';
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, FREE, PRO, GOLD, DIAMOND, DELETED
  
  // State cho thanh tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');

  // STATE MỚI: Quản lý các user đang được tick chọn
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

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
      const res = await fetch(`${API_URL}/admin/users-list`);
      const data = await res.json();
      setUsers(data);
      // Khi reload lại danh sách, reset lựa chọn
      setSelectedUserIds([]);
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

  // ----------------------------------------------------
  // XỬ LÝ CHECKBOX CHỌN NHIỀU
  // ----------------------------------------------------
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Chọn tất cả user ĐANG HIỂN THỊ (đã lọc)
      setSelectedUserIds(filteredUsers.map(u => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedUserIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(userId => userId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // 2. Hàm Nâng cấp gói
  const handleUpgradePlan = async (e: any) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/users/${selectedUser.id}/plan`, {
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
      const res = await fetch(`${API_URL}/admin/users/${selectedUser.id}/voucher`, {
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

  // 4. Hàm Xóa / Khôi phục (Mềm - Soft Delete) dành cho 1 user (nút cũ)
  const toggleUserStatus = async (user: any) => {
    const isDeleting = user.status === 'active';
    const method = isDeleting ? 'DELETE' : 'PUT';

    if (!confirm(`Bạn có chắc muốn ${isDeleting ? 'Khóa' : 'Khôi phục'} tài khoản này?`)) return;

    try {
      const res = await fetch(`${API_URL}/admin/users/${user.id}${isDeleting ? '' : '/restore'}`, {
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

  // 5. Hàm XÓA CỨNG (Hard Delete) 1 user
  const hardDeleteUser = async (userId: string) => {
    if (!confirm('CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn tài khoản khỏi hệ thống và không thể khôi phục. Bạn có chắc chắn?')) return;
    
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/hard-delete`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Đã xóa vĩnh viễn tài khoản');
        fetchUsers();
      } else {
         toast.error('Lỗi xóa tài khoản (Backend chưa cập nhật)');
      }
    } catch (err) {
      toast.error('Lỗi hệ thống');
    }
  };

  // 6. THAO TÁC HÀNG LOẠT (Bulk Actions)
  const handleBulkAction = async (actionType: 'lock' | 'restore' | 'hard-delete') => {
    if (selectedUserIds.length === 0) return;

    let confirmMsg = '';
    let urlEndpoint = '';
    let httpMethod = '';

    if (actionType === 'lock') {
        confirmMsg = `Bạn có chắc muốn KHÓA ${selectedUserIds.length} tài khoản này?`;
        urlEndpoint = '/admin/users/bulk-lock';
        httpMethod = 'POST';
    } else if (actionType === 'restore') {
        confirmMsg = `Bạn có chắc muốn KHÔI PHỤC ${selectedUserIds.length} tài khoản này?`;
        urlEndpoint = '/admin/users/bulk-restore';
        httpMethod = 'POST';
    } else if (actionType === 'hard-delete') {
        confirmMsg = `CẢNH BÁO NGUY HIỂM: Bạn có chắc muốn XÓA VĨNH VIỄN ${selectedUserIds.length} tài khoản này khỏi Database? Không thể khôi phục!`;
        urlEndpoint = '/admin/users/bulk-hard-delete';
        httpMethod = 'POST';
    }

    if (!confirm(confirmMsg)) return;

    try {
        const res = await fetch(`${API_URL}${urlEndpoint}`, {
            method: httpMethod,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: selectedUserIds })
        });

        if (res.ok) {
            toast.success('Thao tác hàng loạt thành công!');
            fetchUsers();
            setSelectedUserIds([]);
        } else {
            toast.error('Có lỗi xảy ra khi thực hiện thao tác');
        }
    } catch (err) {
        toast.error('Lỗi hệ thống');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Khách hàng</h1>
        
        {/* Thanh tìm kiếm */}
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
      <div className="flex gap-2 mb-4 border-b border-gray-200 pb-2 overflow-x-auto">
        {['ALL', 'FREE', 'PRO', 'GOLD', 'DIAMOND', 'DELETED'].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSelectedUserIds([]); }} // Đổi tab thì reset mảng chọn
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

      {/* THANH THAO TÁC HÀNG LOẠT (Chỉ hiện khi có chọn user) */}
      {selectedUserIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-center justify-between mb-4 animate-in slide-in-from-top-2">
            <span className="text-sm font-semibold text-blue-800">
                Đã chọn <span className="text-blue-600">{selectedUserIds.length}</span> khách hàng
            </span>
            <div className="flex gap-2">
                <button onClick={() => handleBulkAction('lock')} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
                    Khóa tài khoản
                </button>
                <button onClick={() => handleBulkAction('restore')} className="px-3 py-1.5 bg-white border border-gray-200 text-green-600 text-sm font-medium rounded-md hover:bg-green-50">
                    Khôi phục
                </button>
                <button onClick={() => handleBulkAction('hard-delete')} className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700">
                    Xóa vĩnh viễn
                </button>
            </div>
        </div>
      )}

      {/* BẢNG DANH SÁCH */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-sm">
            <tr>
              {/* CỘT CHECKBOX CHỌN TẤT CẢ */}
              <th className="p-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    onChange={handleSelectAll}
                    checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                  />
              </th>
              <th className="p-4 font-medium">Khách hàng</th>
              <th className="p-4 font-medium">Gói hiện tại</th>
              <th className="p-4 font-medium">Ngày hết hạn</th>
              <th className="p-4 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">Đang tải...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">Không có khách hàng nào.</td></tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${selectedUserIds.includes(user.id) ? 'bg-blue-50/50 hover:bg-blue-50/80' : ''}`}>
                  {/* CHECKBOX TỪNG DÒNG */}
                  <td className="p-4 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => handleSelectOne(user.id)}
                      />
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-gray-900">{user.name}</div>
                    <div className="text-gray-500">{user.email}</div>
                    <div className="text-xs text-gray-400 mt-1">ID: {user.id}</div>
                    {user.vouchers?.length > 0 && (
                        <div className="text-[11px] mt-1 bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-md inline-block font-medium">
                            Kho Voucher: {Array.isArray(user.vouchers) ? user.vouchers.join(', ') : 'Đã có'}
                        </div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${
                      user.plan === 'DIAMOND' ? 'bg-purple-100 text-purple-700' :
                      user.plan === 'GOLD' ? 'bg-yellow-100 text-yellow-700' :
                      user.plan === 'PRO' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {user.plan || 'FREE'}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">
                    {user.planExpire ? new Date(user.planExpire).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                  </td>
                  <td className="p-4 text-right">
                    {user.status === 'active' ? (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setSelectedUser(user); setShowPlanModal(true); }} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 font-medium transition">
                          Nâng cấp
                        </button>
                        <button onClick={() => { setSelectedUser(user); setShowVoucherModal(true); }} className="text-xs px-3 py-1.5 bg-yellow-50 text-yellow-600 rounded-md hover:bg-yellow-100 font-medium transition">
                          Tặng Voucher
                        </button>
                        <button onClick={() => toggleUserStatus(user)} className="text-xs px-3 py-1.5 bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100 font-medium transition">
                          Khóa
                        </button>
                        {/* NÚT XÓA HẲN */}
                        <button onClick={() => hardDeleteUser(user.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 font-medium transition">
                          Xóa hẳn
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => toggleUserStatus(user)} className="text-xs px-4 py-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 font-medium transition">
                            Khôi phục
                        </button>
                        <button onClick={() => hardDeleteUser(user.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 font-medium transition">
                            Xóa hẳn
                        </button>
                      </div>
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
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={planForm.plan} 
                  onChange={e => setPlanForm({...planForm, plan: e.target.value})}
                >
                  <option value="PRO">Gói PRO</option>
                  <option value="GOLD">Gói GOLD</option>
                  <option value="DIAMOND">Gói DIAMOND</option>
                  <option value="FREE">Hạ về FREE</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700">Số ngày thêm</label>
                <input 
                  type="number" 
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={planForm.extraDays} 
                  onChange={e => setPlanForm({...planForm, extraDays: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowPlanModal(false)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Hủy</button>
              <button type="submit" className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md shadow-blue-200">Xác nhận</button>
            </div>
          </form>
        </div>
      )}

      {/* --- MODAL TẶNG VOUCHER --- */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddVoucher} className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-xl mb-1 text-gray-900">Tặng Voucher</h3>
            <p className="text-sm text-gray-500 mb-5">Cho: <span className="font-semibold text-gray-700">{selectedUser?.email}</span></p>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1.5 text-gray-700">Mã Voucher</label>
              <input 
                type="text" 
                placeholder="VD: KPOST50"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase placeholder:normal-case"
                value={voucherCode} 
                onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowVoucherModal(false)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Hủy</button>
              <button type="submit" className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md shadow-blue-200">Tặng mã</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}