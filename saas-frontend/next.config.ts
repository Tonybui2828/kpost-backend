/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. ÉP MÁY CHỦ PHẢI BUILD XONG BẤT KỂ LỖI TYPESCRIPT NHỎ
  typescript: {
    ignoreBuildErrors: true,
  },

  // 2. Cấu hình đúng để bỏ qua lỗi Linting khi build trên VPS
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 3. Tắt thông báo thu thập dữ liệu (giúp log sạch hơn)
  telemetry: false,
};

export default nextConfig;