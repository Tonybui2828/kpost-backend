'use client';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast'; 

export default function AdminDashboardPage() {
  // --- STATES THỐNG KÊ & VOUCHER ---
  const [stats, setStats] = useState<any>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [voucherForm, setVoucherForm] = useState({
    code: '',
    discount: 0,
    type: 'fixed', // 'fixed' hoặc 'percent'
    minOrder: 0,
    usageLimit: 100,
    validUntil: '' // MỚI: Thêm trường Hạn sử dụng
  });

  // --- STATES KHÁCH HÀNG ---
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); 
  const [searchTerm, setSearchTerm] = useState('');

  // --- STATES MODALS ---
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [planForm, setPlanForm] = useState({ plan: 'PRO', extraDays: 30 });

  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [userVoucherCode, setUserVoucherCode] = useState('');

  // ==========================================
  // FETCH DỮ LIỆU
  // ==========================================
  const fetchData = async () => {
    try {
      // Lấy danh sách users
      const usersRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users-list`);
      if (usersRes.ok) setUsers(await usersRes.json());

      // Lấy thống kê
      const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/stats`);
      if (statsRes.ok) setStats(await statsRes.json());

      // Lấy danh sách vouchers toàn hệ thống
      const vouchersRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/vouchers`);
      if (vouchersRes.ok) setVouchers(await vouchersRes.json());

    } catch (err) {
      toast.error('Lỗi tải dữ liệu hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ==========================================
  // XỬ LÝ KHÁCH HÀNG
  // ==========================================
  const filteredUsers = users.filter(user => {
    // 1. Lọc theo từ khóa tìm kiếm (Tên hoặc Email)
    const matchSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchSearch) return false;

    // 2. Lọc theo Tab (Gói cước / Trạng thái)
    if (activeTab === 'DELETED') return user.status === 'deleted';
    if (activeTab === 'ALL') return user.status === 'active';
    return user.status === 'active' && user.plan?.toUpperCase() === activeTab;
  });

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
        fetchData();
      }
    } catch (err) {
      toast.error('Lỗi nâng cấp');
    }
  };

  const handleAddVoucherToUser = async (e: any) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/${selectedUser.id}/voucher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherCode: userVoucherCode })
      });
      if (res.ok) {
        toast.success('Đã tặng Voucher cho khách!');
        setShowVoucherModal(false);
        setUserVoucherCode('');
        fetchData();
      }
    } catch (err) {
      toast.error('Lỗi tặng Voucher');
    }
  };

  const toggleUserStatus = async (user: any) => {
    const isDeleting = user.status === 'active';
    if (!confirm(`Bạn có chắc muốn ${isDeleting ? 'Khóa' : 'Khôi phục'} tài khoản này?`)) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/${user.id}${isDeleting ? '' : '/restore'}`, {
        method: isDeleting ? 'DELETE' : 'PUT'
      });
      if (res.ok) {
        toast.success('Cập nhật trạng thái thành công!');
        fetchData();
      }
    } catch (err) {
      toast.error('Lỗi hệ thống');
    }
  };

  // ==========================================
  // XỬ LÝ VOUCHER HỆ THỐNG
  // ==========================================
  const handleCreateVoucher = async (e: any) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/vouchers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...voucherForm,
          // Gửi thêm validUntil lên Backend (Chuyển sang ISO String nếu có nhập)
          validUntil: voucherForm.validUntil ? new Date(voucherForm.validUntil).toISOString() : null
        })
      });
      if (res.ok) {
        toast.success('Tạo Voucher thành công!');
        // Reset form bao gồm cả validUntil
        setVoucherForm({ code: '', discount: 0, type: 'fixed', minOrder: 0, usageLimit: 100, validUntil: '' });
        fetchData();
      } else {
        toast.error('Có lỗi xảy ra khi tạo Voucher');
      }
    } catch (error) {
      toast.error('Lỗi hệ thống');
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa Voucher này?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/vouchers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Đã xóa Voucher');
        fetchData();
      }
    } catch (error) {
      toast.error('Lỗi xóa Voucher');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu Admin...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Quản trị Hệ thống</h1>

      {/* --- PHẦN 1: THỐNG KÊ DOANH THU --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Tổng khách hàng</p>
          <p className="text-3xl font-bold mt-2">{stats?.totalUsers || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Khách mới tháng này</p>
          <p className="text-3xl font-bold mt-2 text-green-600">+{stats?.newUsersThisMonth || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Doanh thu tháng này</p>
          <p className="text-3xl font-bold mt-2 text-blue-600">{(stats?.thisMonthRevenue || 0).toLocaleString()}đ</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Tăng trưởng: <span className={Number(stats?.growthRate?.replace('%','')) > 0 ? 'text-green-500' : 'text-red-500'}>{stats?.growthRate}</span></p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Tổng doanh thu</p>
          <p className="text-3xl font-bold mt-2">{(stats?.totalRevenue || 0).toLocaleString()}đ</p>
        </div>
      </div>

      {/* --- PHẦN 2: QUẢN LÝ VOUCHER HỆ THỐNG --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1">
          <h2 className="text-lg font-bold mb-4 text-gray-800">Tạo mã Voucher mới</h2>
          <form onSubmit={handleCreateVoucher} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Mã Voucher</label>
              <input type="text" required className="w-full border rounded-lg px-3 py-2 uppercase focus:ring-2 focus:ring-blue-500 outline-none" placeholder="VD: TET2024" value={voucherForm.code} onChange={e => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Loại giảm giá</label>
                <select className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" value={voucherForm.type} onChange={e => setVoucherForm({ ...voucherForm, type: e.target.value })}>
                  <option value="fixed">Số tiền (VNĐ)</option>
                  <option value="percent">Phần trăm (%)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Mức giảm</label>
                <input type="number" required className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="VD: 50000 hoặc 20" value={voucherForm.discount || ''} onChange={e => setVoucherForm({ ...voucherForm, discount: Number(e.target.value) })} />
              </div>
            </div>
            
            {/* TRƯỜNG MỚI: Hạn sử dụng */}
            <div>
               <label className="block text-sm font-medium mb-1 text-gray-700">Ngày hết hạn</label>
               <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={voucherForm.validUntil} onChange={e => setVoucherForm({ ...voucherForm, validUntil: e.target.value })} />
               <p className="text-[10px] text-gray-400 mt-1">Để trống nếu mã có hiệu lực vĩnh viễn.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Đơn tối thiểu</label>
                <input type="number" className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" value={voucherForm.minOrder || ''} onChange={e => setVoucherForm({ ...voucherForm, minOrder: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Giới hạn dùng</label>
                <input type="number" className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" value={voucherForm.usageLimit || ''} onChange={e => setVoucherForm({ ...voucherForm, usageLimit: Number(e.target.value) })} />
              </div>
            </div>
            <button type="submit" className="w-full bg-gray-900 text-white font-medium py-2.5 rounded-lg hover:bg-gray-800 transition">Thêm Voucher</button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2 overflow-x-auto">
          <h2 className="text-lg font-bold mb-4 text-gray-800">Kho Voucher đang hoạt động</h2>
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm">
              <tr>
                <th className="p-3 font-medium rounded-tl-lg">Mã Code</th>
                <th className="p-3 font-medium">Mức giảm</th>
                {/* MỚI: Cột Hạn dùng */}
                <th className="p-3 font-medium">Hạn dùng</th>
                <th className="p-3 font-medium">Đơn tối thiểu</th>
                <th className="p-3 font-medium">Đã dùng / Giới hạn</th>
                <th className="p-3 font-medium text-right rounded-tr-lg">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vouchers.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="p-3 font-bold text-orange-600">{v.code}</td>
                  <td className="p-3 font-medium">{v.type === 'percent' ? `${v.discount}%` : `${v.discount.toLocaleString()}đ`}</td>
                  {/* MỚI: Dữ liệu Hạn dùng */}
                  <td className="p-3 text-sm text-gray-600">
                    {v.validUntil ? new Date(v.validUntil).toLocaleDateString('vi-VN') : 'Vô thời hạn'}
                  </td>
                  <td className="p-3 text-gray-600">{v.minOrder.toLocaleString()}đ</td>
                  <td className="p-3 text-gray-600">{v.usedCount} / {v.usageLimit}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleDeleteVoucher(v.id)} className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 bg-red-50 rounded-md">Xóa</button>
                  </td>
                </tr>
              ))}
              {vouchers.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">Hệ thống chưa có voucher nào.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- PHẦN 3: QUẢN LÝ DANH SÁCH KHÁCH HÀNG --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold mb-6 text-gray-900">Quản lý Khách hàng</h2>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
              {['ALL', 'FREE', 'PRO', 'GOLD', 'DIAMOND', 'DELETED'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'ALL' ? 'Tất cả' : tab === 'DELETED' ? 'Đã khóa' : `Gói ${tab}`}
                </button>
              ))}
            </div>

            {/* Ô TÌM KIẾM THEO EMAIL/TÊN */}
            <div className="w-full md:w-72 relative">
              <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input 
                type="text" 
                placeholder="Tìm khách bằng email, tên..." 
                className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-gray-50 focus:bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 font-medium">Khách hàng</th>
                <th className="p-4 font-medium">Gói hiện tại</th>
                <th className="p-4 font-medium">Ngày hết hạn</th>
                <th className="p-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">Không tìm thấy khách hàng nào phù hợp.</td></tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50/80 transition-colors">
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
                          'bg-gray-100 text-gray-600'}`}
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
                            + Tặng Voucher
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
      </div>

      {/* --- MODAL NÂNG CẤP GÓI CHO KHÁCH --- */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleUpgradePlan} className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-xl mb-1 text-gray-900">Nâng cấp gói</h3>
            <p className="text-sm text-gray-500 mb-5">Khách hàng: <span className="font-semibold text-gray-700">{selectedUser?.name}</span></p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700">Chọn gói</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" value={planForm.plan} onChange={e => setPlanForm({...planForm, plan: e.target.value})}>
                  <option value="PRO">Gói PRO</option>
                  <option value="GOLD">Gói GOLD</option>
                  <option value="DIAMOND">Gói DIAMOND</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700">Số ngày tặng thêm</label>
                <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" value={planForm.extraDays} onChange={e => setPlanForm({...planForm, extraDays: Number(e.target.value)})} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowPlanModal(false)} className="px-5 py-2.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition">Hủy</button>
              <button type="submit" className="px-5 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium shadow-sm shadow-blue-600/20 transition">Nâng cấp ngay</button>
            </div>
          </form>
        </div>
      )}

      {/* --- MODAL TẶNG VOUCHER RIÊNG CHO KHÁCH --- */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddVoucherToUser} className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-xl mb-1 text-gray-900">Tặng Voucher riêng</h3>
            <p className="text-sm text-gray-500 mb-5">Khách hàng: <span className="font-semibold text-gray-700">{selectedUser?.name}</span></p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1.5 text-gray-700">Nhập mã Voucher hiện có</label>
              <input type="text" required className="w-full border border-gray-200 rounded-lg px-3 py-2.5 uppercase focus:ring-2 focus:ring-orange-500 outline-none" placeholder="VD: KHVIP50" value={userVoucherCode} onChange={e => setUserVoucherCode(e.target.value)} />
              <p className="text-xs text-gray-400 mt-2">Mã voucher này sẽ được thêm trực tiếp vào kho voucher của khách hàng.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowVoucherModal(false)} className="px-5 py-2.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition">Hủy</button>
              <button type="submit" className="px-5 py-2.5 text-white bg-orange-600 rounded-lg hover:bg-orange-700 font-medium shadow-sm shadow-orange-600/20 transition">Tặng mã</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}