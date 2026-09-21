FROM node:22-slim

# 1. Cài đặt các thư viện hệ thống cần thiết cho Puppeteer, Bcrypt VÀ FFMPEG ĐỂ PHÁT LIVESTREAM
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    make \
    g++ \
    unzip \
    curl \
    openssl \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libgtk-3-0 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Copy file cấu hình
COPY package*.json ./

# 3. Cài đặt thư viện npm
RUN npm install

# 4. Copy toàn bộ mã nguồn
COPY . .

# 5. Khởi tạo Prisma và Build Backend
RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]