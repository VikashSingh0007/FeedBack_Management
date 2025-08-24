import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Param,
  UseInterceptors,
  UploadedFiles,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

export type FeedbackStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';

@Controller('feedback')
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FilesInterceptor('files', 5, {
    storage: diskStorage({
      destination: './uploads/feedback',
      filename: (req, file, callback) => {
        const randomName = Array(32)
          .fill(null)
          .map(() => Math.round(Math.random() * 16).toString(16))
          .join('');
        return callback(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/)) {
        return callback(new Error('Only image and PDF files are allowed!'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  }))
  async create(
    @Body() dto: CreateFeedbackDto,
    @Request() req,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    console.log(`[FeedbackController] Creating new feedback for user ${req.user.userId}`);
    console.log('Feedback data:', dto);
    console.log(`Received ${files?.length || 0} attachment files`);

    try {
      const result = await this.feedbackService.create(dto, req.user, files);
      console.log(`[FeedbackController] Successfully created feedback with ID: ${result.cardId}`);
      return result;
    } catch (error) {
      console.error('[FeedbackController] Error creating feedback:', error.message);
      console.error(error.stack);
      throw new BadRequestException(error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('user')
  findUserFeedback(@Request() req) {
    console.log(`[FeedbackController] Fetching all feedback for user ${req.user.userId}`);
    return this.feedbackService.findAllByUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/stats')
  async getUserStats(@Request() req) {
    console.log(`[FeedbackController] Getting statistics for user ${req.user.userId}`);
    try {
      const stats = await this.feedbackService.getUserStatistics(req.user.userId);
      console.log(`[FeedbackController] Successfully retrieved stats for user ${req.user.userId}`);
      return stats;
    } catch (error) {
      console.error(`[FeedbackController] Error getting stats for user ${req.user.userId}:`, error);
      throw new BadRequestException('Failed to fetch user statistics');
    }
  }
  
  @UseGuards(JwtAuthGuard)
  @Get('user/:cardId')
  async getUserFeedbackDetails(
    @Param('cardId') cardId: string,
    @Request() req,
  ) {
    console.log(`[FeedbackController] Getting feedback details for card ${cardId} (user ${req.user.userId})`);
    try {
      const feedback = await this.feedbackService.getFeedbackDetails(cardId, req.user.userId);
      console.log(`[FeedbackController] Successfully retrieved feedback ${cardId}`);
      return feedback;
    } catch (error) {
      console.error(`[FeedbackController] Error getting feedback ${cardId}:`, error);
      throw new BadRequestException('Feedback not found');
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/stats')
  async getAdminStats() {
    console.log('[FeedbackController] Admin requesting system statistics');
    try {
      const stats = await this.feedbackService.getStatistics();
      console.log('[FeedbackController] Successfully retrieved admin statistics');
      return stats;
    } catch (error) {
      console.error('[FeedbackController] Error getting admin statistics:', error);
      throw new BadRequestException('Failed to fetch statistics');
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin')
  findAll() {
    console.log('[FeedbackController] Admin requesting all feedback');
    return this.feedbackService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/:cardId')
  async getAdminFeedbackDetails(@Param('cardId') cardId: string) {
    console.log(`[FeedbackController] Admin requesting details for feedback ${cardId}`);
    try {
      const feedback = await this.feedbackService.getFeedbackDetails(cardId);
      console.log(`[FeedbackController] Successfully retrieved admin details for ${cardId}`);
      return feedback;
    } catch (error) {
      console.error(`[FeedbackController] Error getting admin details for ${cardId}:`, error);
      throw new BadRequestException('Feedback not found');
    }
  }

  @Patch('admin/:cardId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateStatus(
    @Param('cardId') cardId: string,
    @Body() body: { status: FeedbackStatus; adminResponse?: string }
  ) {
    console.log(`[FeedbackController] ===== STATUS UPDATE REQUEST START =====`);
    console.log(`[FeedbackController] Card ID: ${cardId}`);
    console.log(`[FeedbackController] New Status: ${body.status}`);
    console.log(`[FeedbackController] Admin Response: ${body.adminResponse || 'None'}`);
    console.log(`[FeedbackController] Request Body:`, JSON.stringify(body, null, 2));
    
    try {
      console.log(`[FeedbackController] Calling feedback service updateStatus...`);
      const result = await this.feedbackService.updateStatus(cardId, body.status, body.adminResponse);
      console.log(`[FeedbackController] Service returned result:`, JSON.stringify(result, null, 2));
      console.log(`[FeedbackController] ===== STATUS UPDATE REQUEST SUCCESS =====`);
      return result;
    } catch (error) {
      console.error(`[FeedbackController] ===== STATUS UPDATE REQUEST FAILED =====`);
      console.error(`[FeedbackController] Error updating status for ${cardId}:`, error);
      console.error(`[FeedbackController] Error stack:`, error.stack);
      throw new BadRequestException('Failed to update feedback status');
    }
  }

  @Post(':cardId/chat')
  @UseGuards(JwtAuthGuard)
  async addChatMessage(
    @Param('cardId') cardId: string,
    @Body() body: { message: string },
    @Request() req
  ) {
    console.log(`🚀 [CHAT] ===== CHAT MESSAGE REQUEST START =====`);
    console.log(`🚀 [CHAT] Card ID: ${cardId}`);
    console.log(`🚀 [CHAT] Message: ${body.message}`);
    console.log(`🚀 [CHAT] User ID: ${req.user.userId}`);
    console.log(`🚀 [CHAT] User Role: ${req.user.role}`);
    console.log(`🚀 [CHAT] Request Body:`, JSON.stringify(body, null, 2));
    
    try {
      console.log(`🔍 [CHAT] Searching for feedback with cardId: ${cardId}`);
      
      // First check if this is a request type
      let feedback;
      if (req.user.role === 'admin') {
        // Admin can chat on any request - no user filter
        feedback = await this.feedbackService.findOne(cardId);
        console.log(`✅ [CHAT] Admin access - no user filter applied`);
      } else {
        // Regular user can only chat on their own requests
        feedback = await this.feedbackService.findOne(cardId, req.user.userId);
        console.log(`✅ [CHAT] User access - user filter applied for user ID: ${req.user.userId}`);
      }
      
      console.log(`✅ [CHAT] Feedback found:`, {
        id: feedback.id,
        cardId: feedback.cardId,
        type: feedback.type,
        status: feedback.status,
        userId: feedback.user?.id
      });
      
      if (feedback.type !== 'request') {
        console.log(`❌ [CHAT] Feedback type is not request: ${feedback.type}`);
        throw new BadRequestException('Chat is only available for requests');
      }
      
      console.log(`✅ [CHAT] Feedback type is request, proceeding with chat message`);
      console.log(`🚀 [CHAT] Calling feedbackService.addChatMessage...`);

      const result = await this.feedbackService.addChatMessage(
        feedback.id, // Use the actual database ID
        body.message,
        req.user.role === 'admin',
        req.user.userId
      );
      
      console.log(`✅ [CHAT] Chat message added successfully:`, result);
      console.log(`🚀 [CHAT] ===== CHAT MESSAGE REQUEST SUCCESS =====`);
      return result;
    } catch (error) {
      console.error(`❌ [CHAT] ===== CHAT MESSAGE REQUEST FAILED =====`);
      console.error(`❌ [CHAT] Error type:`, error.constructor.name);
      console.error(`❌ [CHAT] Error message:`, error.message);
      console.error(`❌ [CHAT] Error stack:`, error.stack);
      console.error(`❌ [CHAT] Full error object:`, JSON.stringify(error, null, 2));
      throw new BadRequestException('Failed to add chat message');
    }
  }
}