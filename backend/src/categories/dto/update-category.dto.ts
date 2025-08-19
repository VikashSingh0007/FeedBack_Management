// src/categories/dto/update-category.dto.ts
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UpdateMainCategoryDto {
  @IsOptional()
  @IsString()
  department?: string;

  @IsNotEmpty()
  @IsString()
  newName: string;
}

export class UpdateSubCategoryDto {
  @IsNotEmpty()
  @IsString()
  newSubCategory: string;
}