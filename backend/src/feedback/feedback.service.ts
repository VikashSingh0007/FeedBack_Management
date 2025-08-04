import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Feedback } from './entities/feedback.entity';
import { Repository, Not, IsNull } from 'typeorm';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { User } from '../users/user.entity';
import { FeedbackResponseDto } from './dto/feedback-response.dto';
import { CategoriesService } from '../categories/categories.service';
import { IdGenerationUtil } from '../utils/id-generation.util';
import { MailgunService } from 'src/email/mailgun.service';
// import { MailgunService } from '../email/mailgun.service';

type FeedbackStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback) 
    private readonly repo: Repository<Feedback>,
    private readonly categoriesService: CategoriesService,
    private readonly mailgunService: MailgunService,
  ) {
    this.initializeIdGenerator();
  }

  private async initializeIdGenerator() {
    try {
      this.logger.log('Initializing ID generator...');
      const lastFeedback = await this.repo.findOne({
        where: { cardId: Not(IsNull()) },
        order: { id: 'DESC' },
      });

      if (lastFeedback?.cardId) {
        const lastNumber = parseInt(lastFeedback.cardId.split('-')[1], 10);
        IdGenerationUtil.initialize(lastNumber);
        this.logger.log(`ID generator initialized with last number: ${lastNumber}`);
      } else {
        IdGenerationUtil.initialize(0);
        this.logger.log('ID generator initialized with default value: 0');
      }
    } catch (error) {
      this.logger.error('Error initializing ID generator:', error);
      IdGenerationUtil.initialize(0);
    }
  }

  async create(dto: CreateFeedbackDto, user: any, files?: Express.Multer.File[]) {
    this.logger.log(`Creating new feedback for user ${user.userId}`);
    
    // Validate category
    if (dto.category) {
      const [mainCat, subCat] = dto.category.split(' - ');
      const categories = await this.categoriesService.findAll();
      
      if (!categories[mainCat] || !categories[mainCat].includes(subCat)) {
        this.logger.warn(`Invalid category selected: ${dto.category}`);
        throw new Error('Invalid category selected');
      }
    }

    // Validate rating for feedback
    if (dto.type === 'feedback' && !dto.rating) {
      this.logger.warn('Feedback submission missing required rating');
      throw new Error('Rating is required for feedback submissions');
    }
    
    const cardId = IdGenerationUtil.generateFeedbackId();
    this.logger.log(`Generated feedback card ID: ${cardId}`);

    const feedback = this.repo.create({
      type: dto.type as 'feedback' | 'request',
      content: dto.content,
      category: dto.category,
      rating: dto.rating,
      status: 'pending' as FeedbackStatus,
      attachments: files?.map(file => file.path),
      cardId,
      user: { id: user.userId } as User
    });
    
    const savedFeedback = await this.repo.save(feedback);
    this.logger.log(`Feedback ${cardId} created successfully`);

    // Send notifications
    await this.sendNotifications(savedFeedback, user.email);

    return FeedbackResponseDto.fromEntity(savedFeedback);
  }

  private async sendNotifications(feedback: Feedback, userEmail?: string) {
    try {
      this.logger.log(`Sending notifications for feedback ${feedback.cardId}`);
      
      if (userEmail) {
        this.logger.log(`Sending confirmation email to ${userEmail}`);
        await this.mailgunService.sendFeedbackConfirmation(
          userEmail,
          feedback.cardId,
          feedback.type
        );
        this.logger.log(`Confirmation email sent to ${userEmail}`);
      }

      this.logger.log('Sending admin notification');
      await this.mailgunService.sendAdminNotification(feedback);
      this.logger.log('Admin notification sent successfully');
    } catch (error) {
      this.logger.error('Error sending notifications:', error);
      throw error;
    }
  }

  async findAllByUser(userId: number) {
    this.logger.log(`Fetching all feedback for user ${userId}`);
    const feedbacks = await this.repo.find({ 
      where: { user: { id: userId } }, 
      relations: ['user'],
      order: { createdAt: 'DESC' }
    });
    this.logger.log(`Found ${feedbacks.length} feedback items for user ${userId}`);
    return feedbacks.map(FeedbackResponseDto.fromEntity);
  }

  async findAll() {
    this.logger.log('Fetching all feedback');
    const feedbacks = await this.repo.find({ 
      relations: ['user'],
      order: { createdAt: 'DESC' }
    });
    this.logger.log(`Found ${feedbacks.length} feedback items in total`);
    return feedbacks.map(FeedbackResponseDto.fromEntity);
  }

  async findOne(cardId: string, userId?: number) {
    this.logger.log(`Fetching feedback ${cardId} ${userId ? `for user ${userId}` : ''}`);
    const where: any = { cardId };
    if (userId) {
      where.user = { id: userId };
    }
    
    const feedback = await this.repo.findOne({ 
      where,
      relations: ['user']
    });
    
    if (!feedback) {
      this.logger.warn(`Feedback ${cardId} not found`);
      throw new NotFoundException('Feedback not found');
    }
    
    this.logger.log(`Successfully retrieved feedback ${cardId}`);
    return FeedbackResponseDto.fromEntity(feedback);
  }

  async getFeedbackDetails(cardId: string, userId?: number) {
    this.logger.log(`Getting details for feedback ${cardId}`);
    return this.findOne(cardId, userId);
  }

  async updateStatus(cardId: string, status: FeedbackStatus) {
    this.logger.log(`Updating status of feedback ${cardId} to ${status}`);
    const feedback = await this.repo.findOne({ where: { cardId } });
    if (!feedback) {
      this.logger.warn(`Feedback ${cardId} not found for status update`);
      throw new NotFoundException('Feedback not found');
    }
    
    feedback.status = status;
    feedback.resolvedAt = status === 'resolved' ? new Date() : undefined;
    
    const updatedFeedback = await this.repo.save(feedback);
    this.logger.log(`Status updated successfully for feedback ${cardId}`);
    
    return FeedbackResponseDto.fromEntity(updatedFeedback);
  }

  async getStatistics() {
    this.logger.log('Generating feedback statistics');
    const [totalCount, feedbackCount, requestCount] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { type: 'feedback' } }),
      this.repo.count({ where: { type: 'request' } })
    ]);

    const statusCounts = await this.repo
      .createQueryBuilder('feedback')
      .select('feedback.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('feedback.status')
      .getRawMany();

    const averageRating = await this.repo
      .createQueryBuilder('feedback')
      .select('AVG(feedback.rating)', 'average')
      .where('feedback.rating IS NOT NULL')
      .getRawOne();

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

    this.logger.log('Statistics generated successfully');
    return {
      totalCount,
      feedbackCount,
      requestCount,
      statusCounts,
      averageRating: parseFloat(averageRating?.average) || 0,
      ratingDistribution,
      popularCategories: categoryStats,
    };
  }

  async getUserStatistics(userId: number) {
    this.logger.log(`Generating statistics for user ${userId}`);
    const where = { user: { id: userId } };
    
    const [totalCount, feedbackCount, requestCount] = await Promise.all([
      this.repo.count({ where }),
      this.repo.count({ where: { ...where, type: 'feedback' } }),
      this.repo.count({ where: { ...where, type: 'request' } })
    ]);

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

    this.logger.log(`Statistics generated for user ${userId}`);
    return {
      totalCount,
      feedbackCount,
      requestCount,
      statusCounts,
      averageRating: parseFloat(averageRating?.average) || 0,
    };
  }

  async getRecentFeedbacks(limit: number = 5) {
    this.logger.log(`Fetching ${limit} most recent feedbacks`);
    const feedbacks = await this.repo.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['user']
    });
    this.logger.log(`Found ${feedbacks.length} recent feedbacks`);
    return feedbacks.map(FeedbackResponseDto.fromEntity);
  }
}