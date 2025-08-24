// src/feedback/dto/feedback-response.dto.ts
import { User } from '../../users/user.entity';

export class FeedbackResponseDto {
  id: number;  // Add database ID
  cardId: string;  // Only expose cardId
  type: string;
  content: string;
  department?: string;
  category?: string;
  rating?: number;
  priority?: string;
  assignedTo?: string;
  isAnonymous?: boolean;
  requiresFollowUp?: boolean;
  status: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  adminResponse?: string;
  chatMessages: Array<{
    message: string;
    isAdmin: boolean;
    timestamp: string;
    userId?: number;
    adminId?: number;
  }>;
  user: {
    id: number;
    email: string;
  };

  static fromEntity(feedback: any): FeedbackResponseDto {
    const dto = new FeedbackResponseDto();
    dto.id = feedback.id;  // Add database ID
    dto.cardId = feedback.cardId;
    dto.type = feedback.type;
    dto.content = feedback.content;
    dto.department = feedback.department;
    dto.category = feedback.category;
    dto.rating = feedback.rating;
    dto.priority = feedback.priority;
    dto.assignedTo = feedback.assignedTo;
    dto.isAnonymous = feedback.isAnonymous;
    dto.requiresFollowUp = feedback.requiresFollowUp;
    dto.status = feedback.status;
    dto.attachments = feedback.attachments;
    dto.createdAt = feedback.createdAt;
    dto.updatedAt = feedback.updatedAt;
    dto.resolvedAt = feedback.resolvedAt;
    dto.adminResponse = feedback.adminResponse;
    dto.chatMessages = feedback.chatMessages || [];  // Always ensure chatMessages is an array
    
    if (feedback.user) {
      dto.user = {
        id: feedback.user.id,
        email: feedback.user.email,
      };
    }
    
    return dto;
  }
}