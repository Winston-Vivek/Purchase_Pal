import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatesService, InvalidDateError } from '../common/dates/dates.service';
import { ErrorCode } from '../common/errors/error-codes';
import { PurchasesService } from '../purchases/purchases.service';
import { ServiceRecordRepository } from '../repositories/service-record/service-record.repository';
import { User } from '../users/user.entity';
import { CreateServiceRecordDto } from './dto/create-service-record.dto';
import { UpdateServiceRecordDto } from './dto/update-service-record.dto';
import { ServiceRecord } from './service-record.entity';

@Injectable()
export class ServiceRecordsService {
  constructor(
    private readonly records: ServiceRecordRepository,
    private readonly purchases: PurchasesService,
    private readonly dates: DatesService,
  ) {}

  /** Both reads and writes start by proving the purchase is the caller's, so
   *  B never learns that A's purchase exists (BR-07, BR-09). */
  async listForPurchase(user: User, purchaseId: string): Promise<ServiceRecord[]> {
    await this.purchases.findOwned(user, purchaseId);
    return this.records.findForPurchase(purchaseId);
  }

  async create(
    user: User,
    purchaseId: string,
    dto: CreateServiceRecordDto,
  ): Promise<ServiceRecord> {
    const purchase = await this.purchases.findOwned(user, purchaseId);

    this.assertServiceDate(dto.serviceDate, purchase.purchaseDate);
    this.assertNextService(dto.nextServiceDate ?? null, dto.serviceDate);

    return this.records.store({
      purchaseId,
      serviceDate: dto.serviceDate,
      nextServiceDate: dto.nextServiceDate ?? null,
      description: dto.description,
      provider: dto.provider ?? null,
      cost: dto.cost === undefined ? null : dto.cost.toFixed(2),
      notes: dto.notes ?? null,
    });
  }

  async update(user: User, recordId: string, dto: UpdateServiceRecordDto): Promise<ServiceRecord> {
    const record = await this.findOwned(user, recordId);

    if (dto.serviceDate !== undefined) {
      this.assertServiceDate(dto.serviceDate, record.purchase.purchaseDate);
    }

    // Checked against the result of the patch, not the patch alone: moving
    // the service date alone can invalidate a next-service date set earlier.
    this.assertNextService(
      dto.nextServiceDate !== undefined ? dto.nextServiceDate : record.nextServiceDate,
      dto.serviceDate ?? record.serviceDate,
    );

    // Only the keys the request carried: a DTO instance holds every declared
    // property with the absent ones undefined, and TypeORM writes an own
    // property of undefined as NULL (the bug API-PUR-25 caught).
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) (record as unknown as Record<string, unknown>)[key] = value;
    }
    if (dto.cost !== undefined && dto.cost !== null) record.cost = dto.cost.toFixed(2);

    return this.records.save(record);
  }

  async remove(user: User, recordId: string): Promise<void> {
    await this.records.remove(await this.findOwned(user, recordId));
  }

  private async findOwned(user: User, recordId: string): Promise<ServiceRecord> {
    const record = await this.records.findOwned(user.id, recordId);
    if (!record) throw new NotFoundException('Service record not found');
    return record;
  }

  /** BR-12: on or after the service itself. Same day is allowed — something
   *  can be handed back and be due again immediately. Unlike a service date,
   *  this one is meant to be in the future. */
  private assertNextService(nextServiceDate: string | null, serviceDate: string): void {
    if (nextServiceDate === null) return;

    this.dates.parseIsoDate(nextServiceDate);

    if (nextServiceDate < serviceDate) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'The next service cannot be before the service itself',
        fields: { nextServiceDate: 'The next service cannot be before the service itself' },
      });
    }
  }

  /** §7: on or after the purchase date, and not in the future. A repair cannot
   *  predate the thing it repaired. */
  private assertServiceDate(serviceDate: string, purchaseDate: string): void {
    const fail = (message: string): never => {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid input',
        fields: { serviceDate: message },
      });
    };

    try {
      this.dates.parseIsoDate(serviceDate);
    } catch (error) {
      if (error instanceof InvalidDateError) fail('Enter a date that exists, as YYYY-MM-DD');
      throw error;
    }

    if (serviceDate < purchaseDate) fail('A service cannot be before the purchase date');
    if (serviceDate > this.dates.today()) fail('A service cannot be in the future');
  }
}
