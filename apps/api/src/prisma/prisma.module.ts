import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global so feature modules inject PrismaService without re-importing this
 * module everywhere. This is the one module we mark global — it is shared
 * infrastructure with no feature logic, so it cannot create the circular
 * imports that arch-avoid-circular-deps warns about.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
