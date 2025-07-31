// src/categories/categories.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateMainCategoryDto, CreateSubCategoryDto } from './dto/create-category.dto';
import { UpdateMainCategoryDto, UpdateSubCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('feedback/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }
@Roles('admin')
  @Post('main')
  createMainCategory(@Body() dto: CreateMainCategoryDto) {
    return this.categoriesService.createMainCategory(dto);
  }
@Roles('admin')
@Post('sub')
async addSubCategory(@Body() dto: CreateSubCategoryDto) {
  return this.categoriesService.addSubCategory(dto.mainCategory, dto.subCategory);
}


@Roles('admin')
  @Patch('main/:oldName')
  updateMainCategory(
    @Param('oldName') oldName: string,
    @Body() dto: UpdateMainCategoryDto,
  ) {
    return this.categoriesService.updateMainCategory(oldName, dto);
  }

@Roles('admin')
  @Patch('sub/:mainCategory/:oldSubCategory')
  updateSubCategory(
    @Param('mainCategory') mainCategory: string,
    @Param('oldSubCategory') oldSubCategory: string,
    @Body() dto: UpdateSubCategoryDto,
  ) {
    return this.categoriesService.updateSubCategory(mainCategory, oldSubCategory, dto);
  }
@Roles('admin')
  @Delete('main/:mainCategory')
  removeMainCategory(@Param('mainCategory') mainCategory: string) {
    return this.categoriesService.deleteMainCategory(mainCategory);
  }
@Roles('admin')
  @Delete('sub/:mainCategory/:subCategory')
  removeSubCategory(
    @Param('mainCategory') mainCategory: string,
    @Param('subCategory') subCategory: string,
  ) {
    return this.categoriesService.deleteSubCategory(mainCategory, subCategory);
  }
}