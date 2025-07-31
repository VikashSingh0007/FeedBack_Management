// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: ['http://localhost:5173',
      'https://feed-back-management.vercel.app'],
    credentials: true,
  });

  // Ensure upload directory exists
  const fs = require('fs');
  const uploadDir = join(__dirname, '..', 'uploads', 'feedback');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();