import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * BR-15. A requested email change, not yet applied.
 *
 * The address lives here rather than on the user until the link is opened,
 * which is the whole point: an account is never pointed at an inbox whose
 * owner has not proved they read it. Token handling follows BR-14 — digest
 * only, single use, short life.
 */
@Entity('email_change_tokens')
@Index(['userId'])
export class EmailChangeToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /** Lower-cased on the way in, like every other address in the system. */
  @Column({ name: 'new_email', length: 255 })
  newEmail!: string;

  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
