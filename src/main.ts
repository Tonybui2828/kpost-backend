// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. MỞ KHOÁ CORS MẠNH NHẤT
  app.enableCors({
    origin: (origin, callback) => {
      // Cho phép tất cả các nguồn gửi đến để tránh lỗi đỏ trình duyệt
      callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 2. Lắng nghe cổng 3001 và IP 0.0.0.0
  await app.listen(3001, '0.0.0.0');

  console.log('--- 🚀 HỆ THỐNG BACKEND KPOST.VN ĐÃ ONLINE TẠI CỔNG 3001 ---');
}
bootstrap();