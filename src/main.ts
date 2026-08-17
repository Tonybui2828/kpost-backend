import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Cho phép Frontend gọi API (CORS)
  app.enableCors(); 

  // 2. SỬA LẠI DÒNG NÀY: Lắng nghe trên cổng 3001 và ép IP 0.0.0.0 để Docker kết nối được
  await app.listen(3001, '0.0.0.0'); 

  console.log('--- HỆ THỐNG ĐÃ SẴN SÀNG TẠI CỔNG 3001 ---');
}
bootstrap();