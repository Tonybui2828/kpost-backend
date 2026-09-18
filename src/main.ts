// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. MỞ GIỚI HẠN NHẬN PAYLOAD LÊN 50MB (CHO PHÉP TẢI ẢNH/VIDEO BASE64)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // 2. PHỤC VỤ THƯ MỤC ẢNH STATIC ĐỂ FACEBOOK VÀ TRÌNH DUYỆT TRUY CẬP ĐƯỢC
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // 3. MỞ KHOÁ CORS MẠNH NHẤT
  app.enableCors({
    origin: (origin, callback) => {
      // Cho phép tất cả các nguồn gửi đến để tránh lỗi đỏ trình duyệt
      callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 4. Lắng nghe cổng 3001 và IP 0.0.0.0
  await app.listen(3001, '0.0.0.0');

  console.log('--- 🚀 HỆ THỐNG BACKEND KPOST.VN ĐÃ ONLINE TẠI CỔNG 3001 ---');
}
bootstrap();