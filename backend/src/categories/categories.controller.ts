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
  Put,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateMainCategoryDto, CreateSubCategoryDto } from './dto/create-category.dto';
import { UpdateMainCategoryDto, UpdateSubCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('test')
  test() {
    console.log('[CategoriesController] GET /categories/test - test endpoint called');
    return { message: 'Categories controller is working!', timestamp: new Date().toISOString() };
  }

  @Get()
  findAll() {
    console.log('[CategoriesController] GET /categories - findAll called');
    return this.categoriesService.findAll();
  }

  @Get('departments')
  getDepartments() {
    console.log('[CategoriesController] GET /categories/departments - getDepartments called');
    return this.categoriesService.getDepartments();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('departments')
  createDepartment(@Body() dto: { name: string }) {
    console.log('[CategoriesController] POST /categories/departments - createDepartment called');
    // For now, we'll create a category with the department name
    // In a real app, you might want a separate departments table
    return this.categoriesService.createMainCategory({
      department: dto.name,
      name: 'General'
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('departments/:department')
  deleteDepartment(@Param('department') department: string) {
    console.log(`[CategoriesController] DELETE /categories/departments/${department} - deleteDepartment called`);
    // This would need to be implemented in the service
    // For now, we'll return a success message
    return { message: 'Department deletion not yet implemented' };
  }

  @Get('department/:department')
  getCategoriesByDepartment(@Param('department') department: string) {
    console.log(`[CategoriesController] GET /categories/department/${department} - getCategoriesByDepartment called`);
    return this.categoriesService.getCategoriesByDepartment(department);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('main')
  createMainCategory(@Body() dto: CreateMainCategoryDto) {
    return this.categoriesService.createMainCategory(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('sub')
  async addSubCategory(@Body() dto: CreateSubCategoryDto) {
    return this.categoriesService.addSubCategory(dto.department, dto.mainCategory, dto.subCategory);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('main/:department/:oldName')
  updateMainCategory(
    @Param('department') department: string,
    @Param('oldName') oldName: string,
    @Body() dto: UpdateMainCategoryDto,
  ) {
    return this.categoriesService.updateMainCategory(department, oldName, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('sub/:department/:mainCategory/:oldSubCategory')
  updateSubCategory(
    @Param('department') department: string,
    @Param('mainCategory') mainCategory: string,
    @Param('oldSubCategory') oldSubCategory: string,
    @Body() dto: UpdateSubCategoryDto,
  ) {
    return this.categoriesService.updateSubCategory(department, mainCategory, oldSubCategory, dto);
  }

  // Add PUT endpoints for compatibility with frontend
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('main/:oldName')
  updateMainCategoryPut(
    @Param('oldName') oldName: string,
    @Body() dto: { newName: string },
  ) {
    // For now, we'll use a default department
    // In a real app, you'd need to handle this properly
    return this.categoriesService.updateMainCategory('General', oldName, { newName: dto.newName });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('sub/:mainCategory/:oldSubCategory')
  updateSubCategoryPut(
    @Param('mainCategory') mainCategory: string,
    @Param('oldSubCategory') oldSubCategory: string,
    @Body() dto: { newSubCategory: string },
  ) {
    // For now, we'll use a default department
    // In a real app, you'd need to handle this properly
    return this.categoriesService.updateSubCategory('General', mainCategory, oldSubCategory, { newSubCategory: dto.newSubCategory });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('main/:department/:mainCategory')
  removeMainCategory(
    @Param('department') department: string,
    @Param('mainCategory') mainCategory: string
  ) {
    return this.categoriesService.deleteMainCategory(department, mainCategory);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('sub/:department/:mainCategory/:subCategory')
  removeSubCategory(
    @Param('department') department: string,
    @Param('mainCategory') mainCategory: string,
    @Param('subCategory') subCategory: string,
  ) {
    return this.categoriesService.deleteSubCategory(department, mainCategory, subCategory);
  }

  // Add DELETE endpoints for compatibility with frontend
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('main/:mainCategory')
  removeMainCategorySimple(
    @Param('mainCategory') mainCategory: string
  ) {
    // For now, we'll use a default department
    // In a real app, you'd need to handle this properly
    return this.categoriesService.deleteMainCategory('General', mainCategory);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('sub/:mainCategory/:subCategory')
  removeSubCategorySimple(
    @Param('mainCategory') mainCategory: string,
    @Param('subCategory') subCategory: string,
  ) {
    // For now, we'll use a default department
    // In a real app, you'd need to handle this properly
    return this.categoriesService.deleteSubCategory('General', mainCategory, subCategory);
  }
}