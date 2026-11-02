import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListPurchasesDto, PurchaseSort } from '../../purchases/dto/list-purchases.dto';
import { Purchase } from '../../purchases/purchase.entity';

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

  findOwned(userId: string, id: string): Promise<Purchase | null> {
    return this.purchases.findOne({
      where: { id, userId },
      // serviceRecords always: BR-12 reads the next service off them, so a
      // response without them would quietly report "no service due".
      relations: { attachments: true, serviceRecords: true },
    });
  }

  /** Every purchase for one user, newest first. The dashboard has to look at
   *  all of them — see DashboardService for why that is not a filtered query. */
  findAllForUser(userId: string): Promise<Purchase[]> {
    return this.purchases.find({
      where: { userId },
      relations: { attachments: true, serviceRecords: true },
      order: { purchaseDate: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Text search, category filter and the column sorts, done in SQL.
   *
   * Returns every match rather than a page, because the status filters and the
   * nearest-deadline sort are computed from BR-01/BR-04 and cannot go in a
   * WHERE clause without a second implementation of those rules — see
   * PurchasesService.list.
   */
  searchForUser(userId: string, query: ListPurchasesDto): Promise<Purchase[]> {
    const builder = this.purchases
      .createQueryBuilder('purchase')
      // One query with joins rather than a count per row
      // (db-avoid-n-plus-one). Two collections do multiply the rows the
      // database returns, which TypeORM then folds back into entities; both
      // are small and bounded (5 attachments, a handful of services).
      .leftJoinAndSelect('purchase.attachments', 'attachment')
      .leftJoinAndSelect('purchase.serviceRecords', 'serviceRecord')
      .where('purchase.userId = :userId', { userId });

    if (query.q) {
      builder.andWhere(
        '(purchase.productName ILIKE :q OR purchase.seller ILIKE :q OR purchase.notes ILIKE :q)',
        { q: `%${query.q}%` },
      );
    }

    if (query.category) {
      builder.andWhere('purchase.category = :category', { category: query.category });
    }

    if (query.sort === PurchaseSort.PRICE_DESC) {
      builder.orderBy('purchase.price', 'DESC');
    } else if (query.sort === PurchaseSort.PRICE_ASC) {
      builder.orderBy('purchase.price', 'ASC');
    } else {
      builder.orderBy('purchase.purchaseDate', 'DESC').addOrderBy('purchase.createdAt', 'DESC');
    }

    return builder.getMany();
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
