// src/categories/dto/create-category.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateMainCategoryDto {
  @IsNotEmpty()
  @IsString()
  department: string;

  @IsNotEmpty()
  @IsString()
  name: string;
}

export class CreateSubCategoryDto {
  @IsString()
  @IsNotEmpty()
  department: string;

  @IsString()
  @IsNotEmpty()
  mainCategory: string;

  @IsString()
  @IsNotEmpty()
  subCategory: string;
}