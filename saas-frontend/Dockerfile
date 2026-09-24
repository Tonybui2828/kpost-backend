# 1. Base image
FROM node:22-alpine AS builder
WORKDIR /app

# 2. Cài đặt dependencies
COPY package*.json ./
RUN npm ci

# 3. Copy mã nguồn và build Next.js
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# 4. Image chạy siêu nhẹ (Runner)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy các file cần thiết từ builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "run", "start"]