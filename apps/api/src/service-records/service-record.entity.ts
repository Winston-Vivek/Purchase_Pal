import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Purchase } from '../purchases/purchase.entity';

@Entity('service_records')
@Index(['purchaseId'])
export class ServiceRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** BR-07: exactly one purchase. Ownership is checked by joining to its userId. */
  @Column({ name: 'purchase_id', type: 'uuid' })
  purchaseId!: string;

  @ManyToOne(() => Purchase, (purchase) => purchase.serviceRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_id' })
  purchase!: Purchase;

  @Column({ name: 'service_date', type: 'date' })
  serviceDate!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  provider!: string | null;

  @Column({ length: 500 })
  description!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost!: string | null;

  /** BR-12: when this thing is next due for a service. On or after
   *  serviceDate; null means nothing was scheduled. */
  @Column({ name: 'next_service_date', type: 'date', nullable: true })
  nextServiceDate!: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
