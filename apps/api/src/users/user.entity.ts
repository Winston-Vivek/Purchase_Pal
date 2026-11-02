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

  /**
   * BR-13: when the password last changed.
   *
   * The guard refuses any token issued before this, which is how a stateless
   * JWT gets revocation for the one case that matters — "someone has my
   * account". Null for accounts that have never changed it.
   */
  @Column({ name: 'password_changed_at', type: 'timestamptz', nullable: true })
  passwordChangedAt!: Date | null;

  /** BR-04 thresholds. Defaults from D-08. */
  @Column({ name: 'warranty_alert_days', default: 30 })
  warrantyAlertDays!: number;

  @Column({ name: 'return_alert_days', default: 7 })
  returnAlertDays!: number;

  /** BR-12. Two weeks: long enough to book a slot, short enough that a yearly
   *  service is not sitting on the dashboard for a month. */
  @Column({ name: 'service_alert_days', default: 14 })
  serviceAlertDays!: number;

  /** BR-16. On by default: a product whose job is to warn you is not much use
   *  silent, and turning it off is one click away. */
  @Column({ name: 'email_reminders', type: 'boolean', default: true })
  emailReminders!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Purchase, (purchase) => purchase.user)
  purchases!: Purchase[];
}
