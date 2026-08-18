import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ["https://kpost.vn", "http://localhost:3000"],
    credentials: true,
  });
  await app.listen(3001, '0.0.0.0');
  console.log('--- HỆ THỐNG ĐÃ SẴN SÀNG TẠI CỔNG 3001 ---');
}
bootstrap();