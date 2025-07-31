// src/categories/dto/create-category.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateMainCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class CreateSubCategoryDto {
  @IsString()
  @IsNotEmpty()
  mainCategory: string;

  @IsString()
  @IsNotEmpty()
  subCategory: string;
}