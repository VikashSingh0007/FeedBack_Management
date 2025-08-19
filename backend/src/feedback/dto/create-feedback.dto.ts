// src/feedback/dto/create-feedback.dto.ts
import { IsIn, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateFeedbackDto {
  @IsIn(['feedback', 'request'])
  type: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}