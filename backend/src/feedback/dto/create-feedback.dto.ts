// src/feedback/dto/create-feedback.dto.ts
import { IsIn, IsInt, IsOptional, IsString, Min, Max, IsBoolean, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

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

  @ValidateIf(o => o.type === 'feedback')
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseInt(value, 10);
    }
    return value;
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  @IsBoolean()
  isAnonymous?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  @IsBoolean()
  requiresFollowUp?: boolean;
}