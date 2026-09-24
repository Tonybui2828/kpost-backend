// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. TỰ ĐỘNG KHỞI TẠO THƯ MỤC LƯU TRỮ NẾU CHƯA CÓ
  const uploadsPath = join(process.cwd(), 'uploads');
  const tempPath = join(uploadsPath, 'temp');
  const spunVideosPath = join(uploadsPath, 'spun-videos');

  [uploadsPath, tempPath, spunVideosPath].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // 2. MỞ RỘNG GIỚI HẠN NHẬN PAYLOAD LÊN 300MB (CHO PHÉP TẢI VIDEO DUNG LƯỢNG LỚN)
  app.use(json({ limit: '300mb' }));
  app.use(urlencoded({ extended: true, limit: '300mb' }));

  // 3. PHỤC VỤ THƯ MỤC TĨNH VỚI HỖ TRỢ VIDEO STREAMING & TẢI FILE ZIP
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
    setHeaders: (res, path) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Headers', '*');
      res.set('Accept-Ranges', 'bytes'); // Cho phép tua video (Range requests)
    },
  });

  // 4. MỞ KHOÁ CORS TOÀN DIỆN
  app.enableCors({
    origin: (origin, callback) => {
      // Cho phép tất cả các domain frontend gửi request đến
      callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,Range',
    exposedHeaders: 'Content-Range,Content-Length,Accept-Ranges',
    credentials: true,
  });

  // 5. LẮNG NGHE CỔNG 3001 VÀ MỌI GIAO DIỆN MẠNG (0.0.0.0)
  await app.listen(3001, '0.0.0.0');

  console.log('--- 🚀 HỆ THỐNG BACKEND KPOST.VN ĐÃ ONLINE TẠI CỔNG 3001 ---');
  console.log(`--- 🎬 THƯ MỤC MEDIA & VIDEO SPINNER: ${uploadsPath} ---`);
}
bootstrap();