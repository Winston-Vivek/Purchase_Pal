import { Module } from '@nestjs/common';
import { DatesModule } from '../common/dates/dates.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { ServiceRecordsController } from './service-records.controller';
import { ServiceRecordsService } from './service-records.service';

@Module({
  imports: [PurchasesModule, DatesModule],
  controllers: [ServiceRecordsController],
  providers: [ServiceRecordsService],
  exports: [ServiceRecordsService],
})
export class ServiceRecordsModule {}
