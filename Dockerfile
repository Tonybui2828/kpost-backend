FROM node:22-slim
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# 1. Cài đặt các thư viện hệ thống CẦN THIẾT cho bcrypt và puppeteer
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    unzip \
    curl \
    openssl \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Copy file cấu hình
COPY package*.json ./

# 3. Cài đặt thư viện và BIÊN DỊCH LẠI bcrypt cho Linux
RUN npm install

# 4. Copy toàn bộ mã nguồn
COPY . .

# 5. Khởi tạo Prisma và Build
RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]