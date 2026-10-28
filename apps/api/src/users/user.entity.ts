import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Purchase } from '../purchases/purchase.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 80 })
  name!: string;

  /** Stored lower-cased, so a duplicate in any case collides here (API-AUTH-03). */
  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  /** BR-04 thresholds. Defaults from D-08. */
  @Column({ name: 'warranty_alert_days', default: 30 })
  warrantyAlertDays!: number;

  @Column({ name: 'return_alert_days', default: 7 })
  returnAlertDays!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Purchase, (purchase) => purchase.user)
  purchases!: Purchase[];
}
