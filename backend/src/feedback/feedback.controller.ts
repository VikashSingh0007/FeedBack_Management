// src/feedback/feedback.controller.ts
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
    try {
      return await this.feedbackService.create(dto, req.user, files);
    } catch (error) {
      console.error('Error creating feedback:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('user')
  findUserFeedback(@Request() req) {
    return this.feedbackService.findAllByUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/stats')
  async getUserStats(@Request() req) {
    return this.feedbackService.getUserStatistics(req.user.userId);
  }
  
  @UseGuards(JwtAuthGuard)
  @Get('user/:cardId')
  async getUserFeedbackDetails(
    @Param('cardId') cardId: string,
    @Request() req,
  ) {
    return this.feedbackService.getFeedbackDetails(cardId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/stats')
  async getAdminStats() {
    try {
      const stats = await this.feedbackService.getStatistics();
      return stats;
    } catch (error) {
      throw new BadRequestException('Failed to fetch statistics');
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin')
  findAll() {
    return this.feedbackService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/:cardId')
  getAdminFeedbackDetails(@Param('cardId') cardId: string) {
    return this.feedbackService.getFeedbackDetails(cardId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('admin/:cardId/status')
  async updateStatus(
    @Param('cardId') cardId: string,
    @Body('status') status: string,
  ) {
    return this.feedbackService.updateStatus(cardId, status);
  }
}