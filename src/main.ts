import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. MỞ KHOÁ CORS TOÀN DIỆN
  // Việc để origin: true giúp Backend tự động nhận diện và cho phép website của bạn (kpost.vn) truy cập
  app.enableCors({
    origin: true, 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 2. Lắng nghe cổng 3001 và IP 0.0.0.0 (Bắt buộc để chạy trên VPS)
  await app.listen(3001, '0.0.0.0');

  console.log('--- 🚀 HỆ THỐNG BACKEND KPOST.VN ĐÃ ONLINE TẠI CỔNG 3001 ---');
}
bootstrap();