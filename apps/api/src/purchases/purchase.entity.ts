import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Attachment } from '../attachments/attachment.entity';
import { ServiceRecord } from '../service-records/service-record.entity';
import { User } from '../users/user.entity';

export enum Category {
  ELECTRONICS = 'ELECTRONICS',
  APPLIANCES = 'APPLIANCES',
  MOBILE = 'MOBILE',
  FURNITURE = 'FURNITURE',
  FASHION = 'FASHION',
  VEHICLE = 'VEHICLE',
  HOME_KITCHEN = 'HOME_KITCHEN',
  OTHER = 'OTHER',
}

/**
 * No returnStatus or warrantyStatus column: BR-04 computes status per response
 * from the user's own alert window, so a stored one would be stale by morning.
 */
@Entity('purchases')
@Index(['userId'])
@Index(['userId', 'purchaseDate'])
export class Purchase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.purchases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'product_name', length: 120 })
  productName!: string;

  @Column({ type: 'enum', enum: Category })
  category!: Category;

  @Column({ type: 'varchar', length: 120, nullable: true })
  seller!: string | null;

  /** BR-05: DATE, not timestamp. TypeORM hands these back as 'YYYY-MM-DD'. */
  @Column({ name: 'purchase_date', type: 'date' })
  purchaseDate!: string;

  /** Decimal, returned as a string, so cents never round away in binary. */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price!: string;

  @Column({ type: 'char', length: 3, default: 'INR' })
  currency!: string;

  @Column({ name: 'return_window_days', type: 'int', nullable: true })
  returnWindowDays!: number | null;

  @Column({ name: 'return_deadline', type: 'date', nullable: true })
  returnDeadline!: string | null;

  @Column({ name: 'warranty_start_date', type: 'date', nullable: true })
  warrantyStartDate!: string | null;

  @Column({ name: 'warranty_months', type: 'int', nullable: true })
  warrantyMonths!: number | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Attachment, (attachment) => attachment.purchase)
  attachments!: Attachment[];

  @OneToMany(() => ServiceRecord, (record) => record.purchase)
  serviceRecords!: ServiceRecord[];
}
