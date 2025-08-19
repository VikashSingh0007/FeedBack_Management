// src/categories/entities/category.entity.ts
import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity()
@Index(['department', 'mainCategory'], { unique: true }) // Create unique composite index
export class Category {
  @Column({ nullable: true }) // Allow nullable during migration
  department: string;

  @PrimaryColumn()
  mainCategory: string;

  @Column('simple-array')
  subCategories: string[];
}