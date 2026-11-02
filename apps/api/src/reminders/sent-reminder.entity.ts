import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * BR-16. One row per reminder that has actually been sent.
 *
 * The unique index is the mechanism, not a safety net: a second send is
 * impossible because the database refuses the row, which holds even if the
 * job runs twice at once. Application logic that "checks first" has a race
 * in it; a constraint does not.
 *
 * `deadlineDate` is part of the identity on purpose. A deadline the user
 * moves is a different deadline and may be reminded about again.
 */
@Entity('sent_reminders')
@Index(['userId', 'purchaseId', 'kind', 'deadlineDate'], { unique: true })
export class SentReminder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'purchase_id', type: 'uuid' })
  purchaseId!: string;

  /** RETURN, WARRANTY or SERVICE — a purchase can owe all three. */
  @Column({ length: 16 })
  kind!: string;

  @Column({ name: 'deadline_date', type: 'date' })
  deadlineDate!: string;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt!: Date;
}
