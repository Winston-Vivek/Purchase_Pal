import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Purchase } from '../purchases/purchase.entity';

@Entity('attachments')
@Index(['purchaseId'])
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'purchase_id', type: 'uuid' })
  purchaseId!: string;

  @ManyToOne(() => Purchase, (purchase) => purchase.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_id' })
  purchase!: Purchase;

  /** BR-10: a random key, never the user's filename. Unique so a generated
      key cannot silently overwrite an existing receipt. */
  @Column({ name: 'storage_key', unique: true })
  storageKey!: string;

  @Column({ name: 'file_name', length: 255 })
  fileName!: string;

  @Column({ name: 'mime_type', length: 100 })
  mimeType!: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize!: number;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt!: Date;
}
