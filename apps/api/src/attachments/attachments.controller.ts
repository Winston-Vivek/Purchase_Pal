import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/user.entity';
import { AttachmentResponse, toAttachmentResponse } from './attachment-response';
import { AttachmentsService } from './attachments.service';

/** BR-10: 5 MB. multer rejects anything larger before a byte reaches us, and
 *  Nest maps that to 413 PAYLOAD_TOO_LARGE. */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

@ApiTags('receipts')
@Controller()
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post('purchases/:purchaseId/attachments')
  @HttpCode(201)
  @ApiOperation({ summary: 'Attach a receipt to a purchase' })
  @ApiParam({ name: 'purchaseId', format: 'uuid' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      // In memory, not on disk: the signature check has to happen before the
      // bytes are persisted, and a disk-backed upload writes attacker-supplied
      // content first and validates afterwards.
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  async store(
    @CurrentUser() user: User,
    @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<AttachmentResponse> {
    if (!file) throw new BadRequestException('Attach a file in the "file" field');

    return toAttachmentResponse(await this.attachments.upload(user, purchaseId, file));
  }

  @Get('attachments/:attachmentId')
  @ApiOperation({ summary: 'Download a receipt (owner only)' })
  @ApiParam({ name: 'attachmentId', format: 'uuid' })
  async show(
    @CurrentUser() user: User,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { attachment, stream } = await this.attachments.openStream(user, attachmentId);

    response.set({
      'Content-Type': attachment.mimeType,
      // The user gets their own filename back, not the random storage key.
      'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
      'Content-Length': String(attachment.fileSize),
    });

    return new StreamableFile(stream);
  }

  @Delete('attachments/:attachmentId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a receipt and its stored file' })
  @ApiParam({ name: 'attachmentId', format: 'uuid' })
  async destroy(
    @CurrentUser() user: User,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ): Promise<void> {
    await this.attachments.remove(user, attachmentId);
  }
}
