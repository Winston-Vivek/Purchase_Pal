import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceRecord } from '../../service-records/service-record.entity';

@Injectable()
export class ServiceRecordRepository {
  constructor(
    @InjectRepository(ServiceRecord) private readonly records: Repository<ServiceRecord>,
  ) {}

  /** Newest service first — the most recent visit is what you look for. */
  findForPurchase(purchaseId: string): Promise<ServiceRecord[]> {
    return this.records.find({
      where: { purchaseId },
      order: { serviceDate: 'DESC', createdAt: 'DESC' },
    });
  }

  /** Joins through the purchase, so another user's record is not found
   *  rather than forbidden (BR-09). */
  findOwned(userId: string, recordId: string): Promise<ServiceRecord | null> {
    return this.records.findOne({
      where: { id: recordId, purchase: { userId } },
      relations: { purchase: true },
    });
  }

  store(data: Partial<ServiceRecord>): Promise<ServiceRecord> {
    return this.records.save(this.records.create(data));
  }

  save(record: ServiceRecord): Promise<ServiceRecord> {
    return this.records.save(record);
  }

  async remove(record: ServiceRecord): Promise<void> {
    await this.records.remove(record);
  }
}
