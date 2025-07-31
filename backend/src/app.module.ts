// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FeedbackModule } from './feedback/feedback.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
  useFactory: (config: ConfigService) => {
    const isProd = config.get<string>('NODE_ENV') === 'production';
    const dbUrl = config.get<string>('DATABASE_URL');

    return dbUrl
      ? {
          type: 'postgres',
          url: dbUrl,
          autoLoadEntities: true,
          synchronize: !isProd,
          ssl: {
            rejectUnauthorized: false,
          },
        }
      : {
          type: 'postgres',
          host: config.get<string>('DATABASE_HOST'),
          port: config.get<number>('DATABASE_PORT'),
          username: config.get<string>('DATABASE_USER'),
          password: config.get<string>('DATABASE_PASSWORD'),
          database: config.get<string>('DATABASE_NAME'),
          autoLoadEntities: true,
          synchronize: !isProd,
        };
  },
  inject: [ConfigService],
}),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    AuthModule,
    UsersModule,
    FeedbackModule,
     CategoriesModule,
  ],
})
export class AppModule {}