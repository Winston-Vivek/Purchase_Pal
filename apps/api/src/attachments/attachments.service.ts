import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Readable } from 'node:stream';
import { isAcceptableUpload } from '../common/files/file-signature';
import { ErrorCode } from '../common/errors/error-codes';
import { STORAGE, Storage } from '../common/storage/storage.interface';
import { AttachmentRepository } from '../repositories/attachment/attachment.repository';
import { PurchasesService } from '../purchases/purchases.service';
import { User } from '../users/user.entity';
import { Attachment } from './attachment.entity';

/** BR-10. Five is the cap per purchase; the size cap is enforced by multer
 *  before the bytes ever reach this service. */
export const MAX_FILES_PER_PURCHASE = 5;

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly attachments: AttachmentRepository,
    private readonly purchases: PurchasesService,
    @Inject(STORAGE) private readonly storage: Storage,
  ) {}

  async upload(user: User, purchaseId: string, file: Express.Multer.File): Promise<Attachment> {
    // Ownership first: B must not learn anything about A's purchase, not even
    // whether its receipt slots are full.
    await this.purchases.findOwned(user, purchaseId);

    if (!isAcceptableUpload(file.mimetype, file.buffer)) {
      throw new UnsupportedMediaTypeException('Upload a PDF, JPEG, PNG or WEBP file');
    }

    const existing = await this.attachments.countForPurchase(purchaseId);
    if (existing >= MAX_FILES_PER_PURCHASE) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: `A purchase can have at most ${MAX_FILES_PER_PURCHASE} receipts`,
        fields: { file: `Delete one first — this purchase already has ${existing}` },
      });
    }

    // Nothing touches the disk until both checks above have passed.
    const storageKey = await this.storage.save(file.buffer);

    return this.attachments.store({
      purchaseId,
      storageKey,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    });
  }

  async findOwned(user: User, attachmentId: string): Promise<Attachment> {
    const attachment = await this.attachments.findOwned(user.id, attachmentId);
    if (!attachment) throw new NotFoundException('Receipt not found');
    return attachment;
  }

  async openStream(
    user: User,
    attachmentId: string,
  ): Promise<{ attachment: Attachment; stream: Readable }> {
    const attachment = await this.findOwned(user, attachmentId);
    return { attachment, stream: this.storage.createReadStream(attachment.storageKey) };
  }

  async remove(user: User, attachmentId: string): Promise<void> {
    const attachment = await this.findOwned(user, attachmentId);

    // Row first: if the unlink fails we are left with an unreferenced file,
    // which is harmless. The reverse would leave a row pointing at nothing.
    await this.attachments.remove(attachment);
    await this.storage.remove(attachment.storageKey);
  }
}
