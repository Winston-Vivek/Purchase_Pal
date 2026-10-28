import { Attachment } from './attachment.entity';

export interface AttachmentResponse {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
}

/** storageKey is deliberately absent: it is how the file is found on disk, and
 *  nothing outside the server needs it. */
export function toAttachmentResponse(attachment: Attachment): AttachmentResponse {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    fileSize: attachment.fileSize,
    uploadedAt: attachment.uploadedAt,
  };
}
