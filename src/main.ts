import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. MỞ KHOÁ CORS: Cho phép website kpost.vn truy cập vào API
  app.enableCors({
    origin: [
      'https://kpost.vn',
      'https://www.kpost.vn',
      'http://localhost:3000' // Giữ lại để bạn vẫn test được dưới máy tính
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 2. Lắng nghe cổng 3001 và IP 0.0.0.0 để VPS nhận diện được
  await app.listen(3001, '0.0.0.0');

  console.log('--- 🚀 HỆ THỐNG BACKEND KPOST.VN ĐÃ ONLINE TẠI CỔNG 3001 ---');
}
bootstrap();