// src/main.ts của Backend
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
  origin: ["https://kpost.vn", "http://localhost:3000"], // Cho phép cả web thật và máy bạn
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
});

  await app.listen(3001, '0.0.0.0');
}
bootstrap();