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
    this.logger.log(`Received DTO data:`, {
      type: dto.type,
      content: dto.content,
      department: dto.department,
      category: dto.category,
      rating: dto.rating,
      priority: dto.priority,
      assignedTo: dto.assignedTo,
      isAnonymous: dto.isAnonymous,
      requiresFollowUp: dto.requiresFollowUp
    });
    
    // Validate department, category, and subcategory
    if (dto.department && dto.category) {
      const [mainCat, subCat] = dto.category.split(' - ');
      this.logger.log(`Parsed category - Main: ${mainCat}, Sub: ${subCat}`);
      
      const categories = await this.categoriesService.getCategoriesByDepartment(dto.department);
      
      if (!categories[mainCat] || !categories[mainCat].includes(subCat)) {
        this.logger.warn(`Invalid category selected: ${dto.department} - ${dto.category}`);
        throw new Error('Invalid department or category selected');
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
      department: dto.department,
      category: dto.category,
      rating: dto.rating,
      priority: dto.priority || 'medium',
      assignedTo: dto.assignedTo || null,
      isAnonymous: dto.isAnonymous || false,
      requiresFollowUp: dto.requiresFollowUp || false,
      status: 'pending' as FeedbackStatus,
      attachments: files?.map(file => file.path),
      cardId,
      user: { id: user.userId } as User,
      chatMessages: [] // Initialize empty chat messages array
    });
    
    this.logger.log(`Created feedback entity:`, {
      cardId: feedback.cardId,
      type: feedback.type,
      status: feedback.status,
      priority: feedback.priority,
      assignedTo: feedback.assignedTo,
      isAnonymous: feedback.isAnonymous,
      requiresFollowUp: feedback.requiresFollowUp
    });
    
    const savedFeedback = await this.repo.save(feedback);
    this.logger.log(`Feedback ${cardId} created successfully`);
    this.logger.log(`Saved feedback data:`, {
      id: savedFeedback.id,
      cardId: savedFeedback.cardId,
      status: savedFeedback.status,
      priority: savedFeedback.priority,
      assignedTo: savedFeedback.assignedTo,
      isAnonymous: savedFeedback.isAnonymous,
      requiresFollowUp: savedFeedback.requiresFollowUp
    });

    // Send notifications (non-blocking)
    this.sendNotifications(savedFeedback, user.email)
      .catch(err => this.logger.error('Notification sending failed:', err));

    return FeedbackResponseDto.fromEntity(savedFeedback);
  }

  private async sendNotifications(feedback: Feedback, userEmail?: string) {
    try {
      this.logger.log(`Sending notifications for feedback ${feedback.cardId}`);
      
      const notificationPromises: Promise<void>[] = [];
      
      // User confirmation email
      if (userEmail) {
        notificationPromises.push(
          this.mailgunService.sendFeedbackConfirmation(
            userEmail,
            feedback.cardId,
            feedback.type
          ).then(() => this.logger.log(`Confirmation sent to ${userEmail}`))
          .catch(err => this.logger.error(`Failed to send confirmation to ${userEmail}:`, err))
        );

        // Also send ticket update notification
        notificationPromises.push(
          this.mailgunService.sendTicketUpdateNotification(
            userEmail,
            feedback.cardId,
            'status',
            { status: feedback.status, priority: feedback.priority || 'medium' }
          ).then(() => this.logger.log(`Ticket update notification sent to ${userEmail}`))
          .catch(err => this.logger.error(`Failed to send ticket update notification to ${userEmail}:`, err))
        );
      }

      // Admin notification
      notificationPromises.push(
        this.mailgunService.sendAdminNotification({
          cardId: feedback.cardId,
          type: feedback.type,
          user: { email: userEmail },
          content: feedback.content,
          category: feedback.category,
          rating: feedback.rating
        }).then(() => this.logger.log('Admin notification sent'))
        .catch(err => this.logger.error('Failed to send admin notification:', err))
      );

      await Promise.all(notificationPromises);
    } catch (error) {
      this.logger.error('Error in notification process:', {
        error: error.message,
        stack: error.stack
      });
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
    this.logger.log(`🔍 [FINDONE] ===== FINDING FEEDBACK START =====`);
    this.logger.log(`🔍 [FINDONE] Card ID: ${cardId}`);
    this.logger.log(`🔍 [FINDONE] User ID: ${userId || 'Not provided'}`);
    
    const where: any = { cardId };
    if (userId) {
      where.user = { id: userId };
      this.logger.log(`🔍 [FINDONE] Adding user filter: ${userId}`);
    }
    
    this.logger.log(`🔍 [FINDONE] Final where clause:`, JSON.stringify(where, null, 2));
    
    const feedback = await this.repo.findOne({ 
      where,
      relations: ['user']
    });
    
    if (!feedback) {
      this.logger.warn(`❌ [FINDONE] Feedback ${cardId} not found`);
      this.logger.warn(`❌ [FINDONE] Search criteria:`, JSON.stringify(where, null, 2));
      throw new NotFoundException('Feedback not found');
    }
    
    this.logger.log(`✅ [FINDONE] Feedback found successfully:`, {
      id: feedback.id,
      cardId: feedback.cardId,
      type: feedback.type,
      status: feedback.status,
      userId: feedback.user?.id,
      userEmail: feedback.user?.email,
      chatMessagesCount: feedback.chatMessages?.length || 0,
      chatMessages: feedback.chatMessages
    });
    
    this.logger.log(`🔍 [FINDONE] ===== FINDING FEEDBACK SUCCESS =====`);
    return FeedbackResponseDto.fromEntity(feedback);
  }

  async getFeedbackDetails(cardId: string, userId?: number) {
    this.logger.log(`Getting details for feedback ${cardId}`);
    return this.findOne(cardId, userId);
  }

  async updateStatus(cardId: string, status: FeedbackStatus, adminResponse?: string) {
    this.logger.log(`[FeedbackService] ===== UPDATE STATUS START =====`);
    this.logger.log(`[FeedbackService] Card ID: ${cardId}`);
    this.logger.log(`[FeedbackService] New Status: ${status}`);
    this.logger.log(`[FeedbackService] Admin Response: ${adminResponse || 'None'}`);
    
    try {
      this.logger.log(`[FeedbackService] Finding feedback in database...`);
      const feedback = await this.repo.findOne({ 
        where: { cardId },
        relations: ['user']
      });
      
      if (!feedback) {
        this.logger.warn(`[FeedbackService] Feedback ${cardId} not found for status update`);
        throw new NotFoundException('Feedback not found');
      }
      
      this.logger.log(`[FeedbackService] Found feedback:`, {
        id: feedback.id,
        cardId: feedback.cardId,
        currentStatus: feedback.status,
        userEmail: feedback.user?.email || 'No user email',
        hasUser: !!feedback.user
      });
      
      this.logger.log(`[FeedbackService] Updating feedback status...`);
      feedback.status = status;
      feedback.resolvedAt = status === 'resolved' ? new Date() : undefined;
      
      // Update admin response if provided
      if (adminResponse !== undefined) {
        this.logger.log(`[FeedbackService] Updating admin response: ${adminResponse}`);
        feedback.adminResponse = adminResponse;
      }
      
      this.logger.log(`[FeedbackService] Saving updated feedback to database...`);
      const updatedFeedback = await this.repo.save(feedback);
      this.logger.log(`[FeedbackService] Feedback saved successfully. New status: ${updatedFeedback.status}`);
      this.logger.log(`[FeedbackService] Admin response saved: ${updatedFeedback.adminResponse || 'None'}`);
      this.logger.log(`[FeedbackService] Full updated feedback object:`, {
        id: updatedFeedback.id,
        cardId: updatedFeedback.cardId,
        status: updatedFeedback.status,
        adminResponse: updatedFeedback.adminResponse,
        resolvedAt: updatedFeedback.resolvedAt,
        updatedAt: updatedFeedback.updatedAt
      });
      
      // Send status update notification if user has email
      if (feedback.user?.email) {
        this.logger.log(`[FeedbackService] User has email (${feedback.user.email}), sending notifications...`);
        this.sendStatusUpdateNotification(updatedFeedback)
          .then(() => this.logger.log(`[FeedbackService] Status update notifications sent successfully`))
          .catch(err => this.logger.error(`[FeedbackService] Status update notification failed:`, err));
      } else {
        this.logger.warn(`[FeedbackService] No user email found, skipping notifications`);
      }
      
      this.logger.log(`[FeedbackService] ===== UPDATE STATUS SUCCESS =====`);
      return FeedbackResponseDto.fromEntity(updatedFeedback);
    } catch (error) {
      this.logger.error(`[FeedbackService] ===== UPDATE STATUS FAILED =====`);
      this.logger.error(`[FeedbackService] Error in updateStatus:`, error);
      this.logger.error(`[FeedbackService] Error stack:`, error.stack);
      throw error;
    }
  }

  private async sendStatusUpdateNotification(feedback: Feedback) {
    this.logger.log(`[FeedbackService] ===== SEND STATUS UPDATE NOTIFICATIONS START =====`);
    this.logger.log(`[FeedbackService] Feedback ID: ${feedback.id}`);
    this.logger.log(`[FeedbackService] Card ID: ${feedback.cardId}`);
    this.logger.log(`[FeedbackService] Status: ${feedback.status}`);
    this.logger.log(`[FeedbackService] User Email: ${feedback.user?.email || 'No email'}`);
    this.logger.log(`[FeedbackService] Admin Response: ${feedback.adminResponse || 'No response'}`);
    
    try {
      this.logger.log(`[FeedbackService] Preparing notification promises...`);
      const notificationPromises: Promise<void>[] = [];
      
      // Send notification to user
      if (feedback.user?.email) {
        this.logger.log(`[FeedbackService] Adding user notification promise for: ${feedback.user.email}`);
        notificationPromises.push(
          this.mailgunService.sendFeedbackStatusUpdate(
            feedback.user.email,
            feedback.cardId,
            feedback.type,
            feedback.status
          ).then(() => this.logger.log(`[FeedbackService] ✅ User notification sent successfully to ${feedback.user.email}`))
          .catch(err => this.logger.error(`[FeedbackService] ❌ Failed to send user notification to ${feedback.user.email}:`, err))
        );

        // Also send ticket update notification
        notificationPromises.push(
          this.mailgunService.sendTicketUpdateNotification(
            feedback.user.email,
            feedback.cardId,
            'status',
            { status: feedback.status, adminResponse: feedback.adminResponse }
          ).then(() => this.logger.log(`[FeedbackService] ✅ Ticket update notification sent successfully to ${feedback.user.email}`))
          .catch(err => this.logger.error(`[FeedbackService] ❌ Failed to send ticket update notification to ${feedback.user.email}:`, err))
        );
      } else {
        this.logger.warn(`[FeedbackService] No user email found, skipping user notification`);
      }

      // Send notification to admin
      this.logger.log(`[FeedbackService] Adding admin notification promise...`);
      notificationPromises.push(
        this.mailgunService.sendAdminStatusUpdateNotification({
          cardId: feedback.cardId,
          type: feedback.type,
          user: { email: feedback.user?.email },
          status: feedback.status,
          adminResponse: feedback.adminResponse
        }).then(() => this.logger.log(`[FeedbackService] ✅ Admin notification sent successfully`))
        .catch(err => this.logger.error(`[FeedbackService] ❌ Failed to send admin notification:`, err))
      );

      this.logger.log(`[FeedbackService] Executing ${notificationPromises.length} notification promises...`);
      await Promise.all(notificationPromises);
      this.logger.log(`[FeedbackService] ===== SEND STATUS UPDATE NOTIFICATIONS SUCCESS =====`);
    } catch (error) {
      this.logger.error(`[FeedbackService] ===== SEND STATUS UPDATE NOTIFICATIONS FAILED =====`);
      this.logger.error(`[FeedbackService] Error in notification process:`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async addChatMessage(feedbackId: number, message: string, isAdmin: boolean, userId: number) {
    this.logger.log(`Adding chat message to request ${feedbackId}`);
    
    try {
      const feedback = await this.repo.findOne({ 
        where: { id: feedbackId },
        relations: ['user']
      });
      
      if (!feedback) {
        throw new Error('Request not found');
      }

      // Check if this is a request type
      if (feedback.type !== 'request') {
        throw new Error('Chat is only available for requests');
      }

      // Create chat message object
      const chatMessage = {
        message,
        isAdmin,
        timestamp: new Date().toISOString(),
        userId: isAdmin ? undefined : userId,
        adminId: isAdmin ? userId : undefined
      };

      // Save chat message to database
      if (!feedback.chatMessages) {
        feedback.chatMessages = [];
      }
      feedback.chatMessages.push(chatMessage);
      
      // Save updated feedback with chat message
      await this.repo.save(feedback);
      this.logger.log(`✅ Chat message saved to database for request ${feedbackId}`);

      // Store chat message (you can implement this based on your needs)
      this.logger.log(`Chat message stored for request ${feedbackId}:`, chatMessage);

      // Send email notifications
      try {
        if (isAdmin) {
          // Admin sent message - notify user
          if (feedback.user?.email) {
            await this.mailgunService.sendChatMessageNotification(
              feedback.user.email,
              feedback.cardId,
              message,
              'Admin',
              true
            );
            this.logger.log(`✅ Chat notification sent to user ${feedback.user.email}`);
          }
        } else {
          // User sent message - notify admin
          await this.mailgunService.sendChatMessageNotification(
            this.mailgunService['adminEmail'],
            feedback.cardId,
            message,
            feedback.user?.email || 'Anonymous User',
            false
          );
          this.logger.log(`✅ Chat notification sent to admin`);
        }
      } catch (emailError) {
        this.logger.error(`Failed to send chat notification:`, emailError);
        // Don't fail the chat message if email fails
      }

      return chatMessage;
    } catch (error) {
      this.logger.error(`Error adding chat message to request ${feedbackId}:`, error);
      throw error;
    }
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

    // Convert statusCounts array to individual count properties
    const statusCountsMap = statusCounts.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {} as Record<string, number>);

    const averageRating = await this.repo
      .createQueryBuilder('feedback')
      .select('AVG(feedback.rating)', 'average')
      .where({ user: { id: userId } })
      .andWhere('feedback.rating IS NOT NULL')
      .getRawOne();

    this.logger.log(`Statistics generated for user ${userId}:`, {
      totalCount,
      feedbackCount,
      requestCount,
      statusCounts: statusCountsMap,
      averageRating: parseFloat(averageRating?.average) || 0,
    });

    return {
      totalCount,
      feedbackCount,
      requestCount,
      inProgressCount: statusCountsMap['in_progress'] || 0,
      resolvedCount: statusCountsMap['resolved'] || 0,
      rejectedCount: statusCountsMap['rejected'] || 0,
      pendingCount: statusCountsMap['pending'] || 0,
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