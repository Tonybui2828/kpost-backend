FROM node:22-slim

# Cài đặt các thư viện cần thiết cho Prisma và Puppeteer
RUN apt-get update && apt-get install -y \
    openssl \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Chạy Prisma Generate
RUN npx prisma generate

RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]