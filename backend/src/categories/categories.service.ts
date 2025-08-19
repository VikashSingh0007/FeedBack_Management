import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateMainCategoryDto, CreateSubCategoryDto } from './dto/create-category.dto';
import { UpdateMainCategoryDto, UpdateSubCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async findAll(): Promise<Record<string, Record<string, string[]>>> {
    const categories = await this.categoryRepository.find();
    const result: Record<string, Record<string, string[]>> = {};

    categories.forEach(cat => {
      if (!result[cat.department]) {
        result[cat.department] = {};
      }
      result[cat.department][cat.mainCategory] = cat.subCategories;
    });

    return result;
  }

  async getDepartments(): Promise<string[]> {
    const categories = await this.categoryRepository.find();
    const departments = [...new Set(categories.map(cat => cat.department))];
    return departments;
  }

  async getCategoriesByDepartment(department: string): Promise<Record<string, string[]>> {
    const categories = await this.categoryRepository.find({ where: { department } });
    const result: Record<string, string[]> = {};

    categories.forEach(cat => {
      result[cat.mainCategory] = cat.subCategories;
    });

    return result;
  }

  async createMainCategory(dto: CreateMainCategoryDto): Promise<Category> {
    const existing = await this.categoryRepository.findOne({ 
      where: { 
        department: dto.department,
        mainCategory: dto.name 
      } 
    });

    if (existing) {
      throw new BadRequestException('Main category already exists in this department');
    }

    const category = this.categoryRepository.create({
      department: dto.department,
      mainCategory: dto.name,
      subCategories: [],
    });

    return this.categoryRepository.save(category);
  }

  async addSubCategory(department: string, mainCategory: string, subCategory: string) {
    const category = await this.categoryRepository.findOne({
      where: { 
        department,
        mainCategory 
      },
    });

    if (!category) {
      throw new Error(`Category "${mainCategory}" not found in department "${department}"`);
    }

    if (category.subCategories.includes(subCategory)) {
      throw new Error(`Subcategory "${subCategory}" already exists`);
    }

    category.subCategories.push(subCategory);
    return this.categoryRepository.save(category);
  }

  async updateMainCategory(department: string, oldName: string, dto: UpdateMainCategoryDto): Promise<Category> {
    const category = await this.categoryRepository.findOne({ 
      where: { 
        department,
        mainCategory: oldName 
      } 
    });

    if (!category) {
      throw new NotFoundException('Main category not found');
    }

    const duplicate = await this.categoryRepository.findOne({ 
      where: { 
        department: dto.department || department,
        mainCategory: dto.newName 
      } 
    });

    if (duplicate && (duplicate.department !== department || duplicate.mainCategory !== oldName)) {
      throw new BadRequestException('Another category with this name already exists');
    }

    category.department = dto.department || category.department;
    category.mainCategory = dto.newName;
    return this.categoryRepository.save(category);
  }

  async updateSubCategory(
    department: string,
    mainCategory: string,
    oldSubCategory: string,
    dto: UpdateSubCategoryDto
  ): Promise<Category> {
    const category = await this.categoryRepository.findOne({ 
      where: { 
        department,
        mainCategory 
      } 
    });

    if (!category) {
      throw new NotFoundException('Main category not found');
    }

    if (!category.subCategories.includes(oldSubCategory)) {
      throw new NotFoundException('Sub-category not found');
    }

    if (
      category.subCategories.includes(dto.newSubCategory) &&
      dto.newSubCategory !== oldSubCategory
    ) {
      throw new BadRequestException('Another sub-category with this name already exists');
    }

    category.subCategories = category.subCategories.map(sc =>
      sc === oldSubCategory ? dto.newSubCategory : sc
    );

    return this.categoryRepository.save(category);
  }

  async deleteMainCategory(department: string, mainCategory: string): Promise<void> {
    const result = await this.categoryRepository.delete({ 
      department,
      mainCategory 
    });

    if (result.affected === 0) {
      throw new NotFoundException('Main category not found');
    }
  }

  async deleteSubCategory(department: string, mainCategory: string, subCategory: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ 
      where: { 
        department,
        mainCategory 
      } 
    });

    if (!category) {
      throw new NotFoundException('Main category not found');
    }

    if (!category.subCategories.includes(subCategory)) {
      throw new NotFoundException('Sub-category not found');
    }

    category.subCategories = category.subCategories.filter(sc => sc !== subCategory);
    return this.categoryRepository.save(category);
  }
}
