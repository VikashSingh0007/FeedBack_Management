// src/feedback/feedback.service.ts
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Feedback } from './entities/feedback.entity';
import { Repository } from 'typeorm';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { User } from '../users/user.entity';
import { FeedbackResponseDto } from './dto/feedback-response.dto';
import { CategoriesService } from '../categories/categories.service';
import { IdGenerationUtil } from '../utils/id-generation.util';
import { Not, IsNull } from 'typeorm';
@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback) 
    private readonly repo: Repository<Feedback>,
    @Inject(CategoriesService)
    private readonly categoriesService: CategoriesService,
  ) {
    this.initializeIdGenerator();
  }

 // src/feedback/feedback.service.ts
private async initializeIdGenerator() {
  try {
    // Get the last feedback with a cardId
    const lastFeedback = await this.repo.findOne({
      where: { cardId: Not(IsNull()) },
      order: { id: 'DESC' },
    });

    if (lastFeedback?.cardId) {
      const lastNumber = parseInt(lastFeedback.cardId.split('-')[1], 10);
      IdGenerationUtil.initialize(lastNumber);
    } else {
      IdGenerationUtil.initialize(0); // Start from 0 if no records exist
    }
  } catch (error) {
    console.error('Error initializing ID generator:', error);
    IdGenerationUtil.initialize(0); // Fallback to 0 on error
  }
}

  async create(dto: CreateFeedbackDto, user: any, files?: Express.Multer.File[]) {
    if (dto.category) {
      const [mainCat, subCat] = dto.category.split(' - ');
      const categories = await this.categoriesService.findAll();
      
      if (!categories[mainCat] || !categories[mainCat].includes(subCat)) {
        throw new Error('Invalid category selected');
      }
    }

    if (dto.type === 'feedback' && !dto.rating) {
      throw new Error('Rating is required for feedback submissions');
    }
    
    const cardId = IdGenerationUtil.generateFeedbackId();

    const feedback = this.repo.create({
      type: dto.type as 'feedback' | 'request',
      content: dto.content,
      category: dto.category,
      rating: dto.rating,
      status: 'pending',
      attachments: files?.map(file => file.path),
      cardId,
      user: { id: user.userId } as User
    });
    
    const savedFeedback = await this.repo.save(feedback);
    return FeedbackResponseDto.fromEntity(savedFeedback);
  }

  async findAllByUser(userId: number) {
    const feedbacks = await this.repo.find({ 
      where: { user: { id: userId } }, 
      relations: ['user'],
      order: { id: 'DESC' }
    });
    return feedbacks.map(FeedbackResponseDto.fromEntity);
  }

  async findAll() {
    const feedbacks = await this.repo.find({ 
      relations: ['user'],
      order: { id: 'DESC' }
    });
    return feedbacks.map(FeedbackResponseDto.fromEntity);
  }

  async getFeedbackDetails(cardId: string, userId?: number) {
    const where: any = { cardId };
    if (userId) {
      where.user = { id: userId };
    }
    
    const feedback = await this.repo.findOne({ 
      where,
      relations: ['user']
    });
    
    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }
    
    return FeedbackResponseDto.fromEntity(feedback);
  }

  async updateStatus(cardId: string, status: string) {
    const feedback = await this.repo.findOne({ where: { cardId } });
    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }
    
    feedback.status = status as any;
    await this.repo.save(feedback);
    return FeedbackResponseDto.fromEntity(feedback);
  }

  async getStatistics() {
    try {
      const totalCount = await this.repo.count();
      const feedbackCount = await this.repo.count({ where: { type: 'feedback' } });
      const requestCount = await this.repo.count({ where: { type: 'request' } });
      
      const statusCounts = await this.repo
        .createQueryBuilder('feedback')
        .select('feedback.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('feedback.status')
        .getRawMany();

      const averageRatingResult = await this.repo
        .createQueryBuilder('feedback')
        .select('AVG(feedback.rating)', 'average')
        .where('feedback.rating IS NOT NULL')
        .getRawOne();

      const averageRating = averageRatingResult?.average ? 
        parseFloat(averageRatingResult.average) : 0;

      const ratingDistribution = await this.repo
        .createQueryBuilder('feedback')
        .select('feedback.rating', 'rating')
        .addSelect('COUNT(*)', 'count')
        .where('feedback.rating IS NOT NULL')
        .groupBy('feedback.rating')
        .orderBy('feedback.rating')
        .getRawMany();

      const categoryStats = await this.repo
        .createQueryBuilder('feedback')
        .select('feedback.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .where('feedback.category IS NOT NULL')
        .groupBy('feedback.category')
        .orderBy('count', 'DESC')
        .limit(5)
        .getRawMany();

      return {
        totalCount,
        feedbackCount,
        requestCount,
        statusCounts,
        averageRating,
        ratingDistribution,
        popularCategories: categoryStats,
      };
    } catch (error) {
      console.error('Error in getStatistics:', error);
      throw error;
    }
  }

  async getUserStatistics(userId: number) {
    const where = { user: { id: userId } };
    
    const totalCount = await this.repo.count({ where });
    const feedbackCount = await this.repo.count({ where: { ...where, type: 'feedback' } });
    const requestCount = await this.repo.count({ where: { ...where, type: 'request' } });
    
    const statusCounts = await this.repo
      .createQueryBuilder('feedback')
      .select('feedback.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where({ user: { id: userId } })
      .groupBy('feedback.status')
      .getRawMany();

    const averageRating = await this.repo
      .createQueryBuilder('feedback')
      .select('AVG(feedback.rating)', 'average')
      .where({ user: { id: userId } })
      .andWhere('feedback.rating IS NOT NULL')
      .getRawOne();

    return {
      totalCount,
      feedbackCount,
      requestCount,
      statusCounts,
      averageRating: parseFloat(averageRating?.average) || 0,
    };
  }
}