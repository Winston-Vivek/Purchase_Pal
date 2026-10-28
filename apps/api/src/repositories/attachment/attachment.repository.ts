import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from '../../attachments/attachment.entity';

@Injectable()
export class AttachmentRepository {
  constructor(@InjectRepository(Attachment) private readonly attachments: Repository<Attachment>) {}

  /** Joins through the purchase so another user's receipt is simply not
   *  found — 404, never 403 (BR-09). */
  findOwned(userId: string, attachmentId: string): Promise<Attachment | null> {
    return this.attachments.findOne({
      where: { id: attachmentId, purchase: { userId } },
      relations: { purchase: true },
    });
  }

  countForPurchase(purchaseId: string): Promise<number> {
    return this.attachments.countBy({ purchaseId });
  }

  store(data: Partial<Attachment>): Promise<Attachment> {
    return this.attachments.save(this.attachments.create(data));
  }

  async remove(attachment: Attachment): Promise<void> {
    await this.attachments.remove(attachment);
  }
}
