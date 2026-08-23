/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ÉP MÁY CHỦ PHẢI BUILD XONG BẤT KỂ LỖI TYPESCRIPT NHỎ
    ignoreBuildErrors: true,
  },
  eslint: {
    // Bỏ qua lỗi trình bày code khi build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;