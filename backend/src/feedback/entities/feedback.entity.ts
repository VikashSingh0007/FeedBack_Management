// src/feedback/entities/feedback.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from '../../users/user.entity';

@Entity()
export class Feedback {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index({ unique: true })
  cardId: string;  // Made this required and unique

  @Column()
  type: 'feedback' | 'request';

  @Column()
  content: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ nullable: true, type: 'float' })
  rating?: number;

  @Column({ default: 'pending' })
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';

  @Column('text', { array: true, nullable: true })
  attachments: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  resolvedAt?: Date;

  @ManyToOne(() => User, user => user.feedbacks, { eager: false })
  user: User;
}