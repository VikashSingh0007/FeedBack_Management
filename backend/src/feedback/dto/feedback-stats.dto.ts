// src/feedback/dto/feedback-stats.dto.ts
export class FeedbackStatsDto {
  totalCount: number;
  feedbackCount: number;
  requestCount: number;
  statusCounts: { status: string; count: string }[];
  averageRating: number;
  ratingDistribution?: { rating: number; count: string }[];
}