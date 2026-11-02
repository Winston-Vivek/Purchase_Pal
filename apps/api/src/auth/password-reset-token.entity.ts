import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * BR-14. One row per reset request.
 *
 * The token itself is never here — only its SHA-256 digest — so a dump of
 * this table cannot be used to reset anyone's password. SHA-256 rather than
 * bcrypt because the input is already 256 bits of randomness: stretching buys
 * nothing and would cost a slow comparison on every lookup.
 */
@Entity('password_reset_tokens')
@Index(['userId'])
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /** Unique so the lookup is a single indexed read, and a collision is a
   *  database error rather than a silent mix-up. */
  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  /** Set in the same transaction as the password write, so a token cannot be
   *  spent twice even by two requests arriving together. */
  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
