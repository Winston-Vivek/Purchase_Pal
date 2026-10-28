import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Purchase } from '../../purchases/purchase.entity';

export interface PaginatedPurchases {
  items: Purchase[];
  total: number;
}

/**
 * Owns persistence for Purchase.
 *
 * Every method takes userId and folds it into the WHERE clause, so there is no
 * way to read or write another user's row through this class (BR-09). An
 * ownership check that lives in the query cannot be forgotten by a caller.
 */
@Injectable()
export class PurchaseRepository {
  constructor(@InjectRepository(Purchase) private readonly purchases: Repository<Purchase>) {}

  findOwned(userId: string, id: string, withRelations = false): Promise<Purchase | null> {
    return this.purchases.findOne({
      where: { id, userId },
      relations: withRelations
        ? { attachments: true, serviceRecords: true }
        : { attachments: true },
    });
  }

  /** Filtering and paging happen in the database, never in memory. */
  async paginateForUser(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedPurchases> {
    const [items, total] = await this.purchases.findAndCount({
      where: { userId },
      // One query with a join rather than a count per row (db-avoid-n-plus-one).
      relations: { attachments: true },
      order: { purchaseDate: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total };
  }

  store(data: Partial<Purchase>): Promise<Purchase> {
    return this.purchases.save(this.purchases.create(data));
  }

  save(purchase: Purchase): Promise<Purchase> {
    return this.purchases.save(purchase);
  }

  async remove(purchase: Purchase): Promise<void> {
    await this.purchases.remove(purchase);
  }
}
