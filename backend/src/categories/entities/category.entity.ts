// src/categories/entities/category.entity.ts
import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class Category {
  @PrimaryColumn()
  mainCategory: string;

  @Column('simple-array')
  subCategories: string[];
}