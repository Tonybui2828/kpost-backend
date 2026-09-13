import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar Menu */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 p-4 shrink-0">
        <h2 className="text-xl font-black text-blue-600 mb-8 px-2">KPOST ADMIN</h2>
        <nav className="space-y-2">
          <Link href="/admin" className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors">
            📊 Tổng quan & Voucher
          </Link>
          <Link href="/admin/users" className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors">
            👥 Quản lý Khách hàng
          </Link>
          {/* MỤC MỚI THÊM VÀO ĐÂY */}
          <Link href="/admin/guides" className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors">
            📚 Tài liệu & Prompt
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}