// src/categories/dto/update-category.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateMainCategoryDto {
  @IsNotEmpty()
  @IsString()
  newName: string;
}

export class UpdateSubCategoryDto {
  @IsNotEmpty()
  @IsString()
  newSubCategory: string;
}