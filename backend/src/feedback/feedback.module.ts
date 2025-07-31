// src/feedback/feedback.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from './entities/feedback.entity';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { CategoriesModule } from '../categories/categories.module'; // ✅ import this

@Module({
  imports: [
    TypeOrmModule.forFeature([Feedback]),
    CategoriesModule, // ✅ add this to resolve CategoriesService
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService,],
})
export class FeedbackModule {}
