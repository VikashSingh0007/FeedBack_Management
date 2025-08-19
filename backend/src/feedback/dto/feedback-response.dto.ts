// src/feedback/dto/feedback-response.dto.ts
import { User } from '../../users/user.entity';

export class FeedbackResponseDto {
  cardId: string;  // Only expose cardId
  type: string;
  content: string;
  department?: string;
  category?: string;
  rating?: number;
  status: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  adminResponse?: string;
  user: {
    id: number;
    email: string;
  };

  static fromEntity(feedback: any): FeedbackResponseDto {
    const dto = new FeedbackResponseDto();
    dto.cardId = feedback.cardId;
    dto.type = feedback.type;
    dto.content = feedback.content;
    dto.department = feedback.department;
    dto.category = feedback.category;
    dto.rating = feedback.rating;
    dto.status = feedback.status;
    dto.attachments = feedback.attachments;
    dto.createdAt = feedback.createdAt;
    dto.updatedAt = feedback.updatedAt;
    dto.resolvedAt = feedback.resolvedAt;
    dto.adminResponse = feedback.adminResponse;
    
    if (feedback.user) {
      dto.user = {
        id: feedback.user.id,
        email: feedback.user.email,
      };
    }
    
    return dto;
  }
}