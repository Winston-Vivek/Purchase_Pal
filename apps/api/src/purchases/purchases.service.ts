import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatesService, InvalidDateError } from '../common/dates/dates.service';
import { ErrorCode } from '../common/errors/error-codes';
import { PurchaseRepository } from '../repositories/purchase/purchase.repository';
import { User } from '../users/user.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { ListPurchasesDto } from './dto/list-purchases.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { Purchase } from './purchase.entity';

/** The fields the business rules in §7 relate to each other. */
interface DateState {
  purchaseDate: string;
  returnDeadline: string | null;
  warrantyStartDate: string | null;
  warrantyMonths: number | null;
}

@Injectable()
export class PurchasesService {
  constructor(
    private readonly purchases: PurchaseRepository,
    private readonly dates: DatesService,
  ) {}

  async create(user: User, dto: CreatePurchaseDto): Promise<Purchase> {
    this.assertValid({
      purchaseDate: dto.purchaseDate,
      returnDeadline: dto.returnDeadline ?? null,
      warrantyStartDate: dto.warrantyStartDate ?? null,
      warrantyMonths: dto.warrantyMonths ?? null,
    });

    return this.purchases.store({
      ...dto,
      price: dto.price.toFixed(2),
      currency: dto.currency ?? 'INR',
      seller: dto.seller ?? null,
      returnWindowDays: dto.returnWindowDays ?? null,
      returnDeadline: dto.returnDeadline ?? null,
      warrantyStartDate: dto.warrantyStartDate ?? null,
      warrantyMonths: dto.warrantyMonths ?? null,
      notes: dto.notes ?? null,
      userId: user.id,
      attachments: [],
      serviceRecords: [],
    });
  }

  async list(
    user: User,
    query: ListPurchasesDto,
  ): Promise<{
    items: Purchase[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { items, total } = await this.purchases.paginateForUser(
      user.id,
      query.page,
      query.pageSize,
    );

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  /** Every read is scoped by userId, so another user's row is simply not
   *  there — 404, never 403, so its existence stays hidden (BR-09). */
  async findOwned(user: User, id: string, withRelations = false): Promise<Purchase> {
    const purchase = await this.purchases.findOwned(user.id, id, withRelations);

    if (!purchase) throw new NotFoundException('Purchase not found');
    return purchase;
  }

  async update(user: User, id: string, dto: UpdatePurchaseDto): Promise<Purchase> {
    const purchase = await this.findOwned(user, id);

    // Cross-field rules are checked against the result of the patch, not the
    // patch alone: clearing warrantyStartDate while months stays set is only
    // invalid once the two are seen together (API-PUR-26).
    const merged: DateState = {
      purchaseDate: dto.purchaseDate ?? purchase.purchaseDate,
      returnDeadline:
        dto.returnDeadline !== undefined ? dto.returnDeadline : purchase.returnDeadline,
      warrantyStartDate:
        dto.warrantyStartDate !== undefined ? dto.warrantyStartDate : purchase.warrantyStartDate,
      warrantyMonths:
        dto.warrantyMonths !== undefined ? dto.warrantyMonths : purchase.warrantyMonths,
    };
    this.assertValid(merged);

    // Only the keys the request actually carried. The DTO instance holds every
    // declared property, with the absent ones set to undefined, and TypeORM
    // writes an own property of undefined as NULL — so assigning the whole DTO
    // would clear the fields the patch never mentioned.
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) (purchase as unknown as Record<string, unknown>)[key] = value;
    }
    if (dto.price !== undefined) purchase.price = dto.price.toFixed(2);

    return this.purchases.save(purchase);
  }

  async remove(user: User, id: string): Promise<void> {
    const purchase = await this.findOwned(user, id);
    await this.purchases.remove(purchase);
  }

  private assertValid(state: DateState): void {
    const fields: Record<string, string> = {};

    const parse = (value: string, field: string): boolean => {
      try {
        this.dates.parseIsoDate(value);
        return true;
      } catch (error) {
        if (error instanceof InvalidDateError) {
          fields[field] = 'Enter a date that exists, as YYYY-MM-DD';
          return false;
        }
        throw error;
      }
    };

    const purchaseDateValid = parse(state.purchaseDate, 'purchaseDate');

    if (purchaseDateValid && state.purchaseDate > this.dates.today()) {
      fields.purchaseDate = 'A purchase cannot be in the future';
    }

    if (state.returnDeadline !== null && parse(state.returnDeadline, 'returnDeadline')) {
      if (purchaseDateValid && state.returnDeadline < state.purchaseDate) {
        fields.returnDeadline = 'The return deadline cannot be before the purchase date';
      }
    }

    // The warranty pair is all-or-nothing, and the field named is the missing
    // half — that is the one the user has to fill in.
    if (state.warrantyStartDate !== null && state.warrantyMonths === null) {
      fields.warrantyMonths = 'Give the warranty length in months';
    }
    if (state.warrantyMonths !== null && state.warrantyStartDate === null) {
      fields.warrantyStartDate = 'Give the date the warranty starts';
    }

    if (state.warrantyStartDate !== null && parse(state.warrantyStartDate, 'warrantyStartDate')) {
      if (purchaseDateValid && state.warrantyStartDate < state.purchaseDate) {
        fields.warrantyStartDate = 'The warranty cannot start before the purchase';
      }
    }

    if (Object.keys(fields).length > 0) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid input',
        fields,
      });
    }
  }
}
