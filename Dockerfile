FROM node:22-slim

# Cài đặt unzip (BẮT BUỘC để Puppeteer cài chrome) và các thư viện hệ thống
RUN apt-get update && apt-get install -y \
    unzip \
    curl \
    openssl \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libasound2 \
    libxss1 \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy file cấu hình trước
COPY package*.json ./

# Cài đặt thư viện (Lần này sẽ giải nén Chrome thành công vì đã có unzip)
RUN npm install

# Copy toàn bộ mã nguồn
COPY . .

# Khởi tạo Prisma và Build dự án
RUN npx prisma generate
RUN rm -rf dist && npm run build

EXPOSE 3001

# Lệnh khởi chạy
CMD ["npm", "run", "start:prod"]