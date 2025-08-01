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
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('cardId') cardId: string,
    @Body('status') status: FeedbackStatus
  ) {
    console.log(`[FeedbackController] Updating status for feedback ${cardId} to ${status}`);
    try {
      const result = await this.feedbackService.updateStatus(cardId, status);
      console.log(`[FeedbackController] Successfully updated status for ${cardId}`);
      return result;
    } catch (error) {
      console.error(`[FeedbackController] Error updating status for ${cardId}:`, error);
      throw new BadRequestException('Failed to update feedback status');
    }
  }
}