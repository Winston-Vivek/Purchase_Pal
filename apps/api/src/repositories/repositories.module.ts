import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attachment } from '../attachments/attachment.entity';
import { Purchase } from '../purchases/purchase.entity';
import { ServiceRecord } from '../service-records/service-record.entity';
import { PasswordResetToken } from '../auth/password-reset-token.entity';
import { EmailChangeToken } from '../users/email-change-token.entity';
import { User } from '../users/user.entity';
import { AttachmentRepository } from './attachment/attachment.repository';
import { HealthRepository } from './health/health.repository';
import { EmailChangeRepository } from './email-change/email-change.repository';
import { PasswordResetRepository } from './password-reset/password-reset.repository';
import { PurchaseRepository } from './purchase/purchase.repository';
import { ServiceRecordRepository } from './service-record/service-record.repository';
import { UserRepository } from './user/user.repository';

const repositories = [
  UserRepository,
  PasswordResetRepository,
  EmailChangeRepository,
  PurchaseRepository,
  AttachmentRepository,
  ServiceRecordRepository,
  HealthRepository,
];

/**
 * Global, so a feature module injects a repository without re-importing this.
 * Shared infrastructure with no feature logic, so it cannot create the circular
 * imports arch-avoid-circular-deps warns about.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Purchase,
      Attachment,
      ServiceRecord,
      PasswordResetToken,
      EmailChangeToken,
    ]),
  ],
  providers: repositories,
  exports: repositories,
})
export class RepositoriesModule {}
