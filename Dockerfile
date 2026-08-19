FROM node:22-slim

# Cài đặt các thư viện hệ thống cần thiết
RUN apt-get update && apt-get install -y \
    unzip \
    curl \
    openssl \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# BIẾN NÀY ĐỂ BỎ QUA LỖI CÀI ĐẶT PUPPETEER
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Chỉ copy file package trước để tối ưu tốc độ build
COPY package*.json ./

# Cài đặt thư viện (Bỏ qua các script tự chạy gây lỗi)
RUN npm install --ignore-scripts

# Copy toàn bộ mã nguồn (trừ những thứ trong .dockerignore)
COPY . .

# Cấp quyền và chạy Prisma
RUN npx prisma generate

# Build dự án
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]