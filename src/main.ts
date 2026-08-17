import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module'; // Dòng này phải là ./app.module

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); 
  await app.listen(3001);
  console.log('--- HỆ THỐNG ĐÃ SẴN SÀNG TẠI CỔNG 3001 ---');
}
bootstrap();