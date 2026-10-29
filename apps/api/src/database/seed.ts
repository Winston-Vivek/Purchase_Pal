import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { DatesService } from '../common/dates/dates.service';
import { Category } from '../purchases/purchase.entity';
import { PurchaseRepository } from '../repositories/purchase/purchase.repository';
import { UserRepository } from '../repositories/user/user.repository';

export const DEMO_EMAIL = 'demo@proofly.test';
export const OTHER_EMAIL = 'other@proofly.test';
export const DEMO_PASSWORD = 'demo1234';

export interface SeedResult {
  created: boolean;
}

/**
 * Every date is an offset from today, never a fixed day.
 *
 * A seed with hard-coded dates is correct for about a week: run the demo a
 * month later and every "expiring soon" item has quietly expired. These offsets
 * reproduce the seven purchases from the design mockups with the same statuses
 * whenever the seed runs, which is what docs/test-plan.md §5 asks for.
 */
function demoPurchases(ago: (days: number) => string): Record<string, unknown>[] {
  return [
    {
      // Return closes in 4 days — the most urgent thing on the dashboard.
      productName: 'Nike Pegasus 41',
      category: Category.FASHION,
      seller: 'Nike.com',
      purchaseDate: ago(3),
      price: '12995.00',
      returnWindowDays: 7,
    },
    {
      // Return closes in exactly 7 days: the boundary of the default window.
      productName: 'AirPods Pro (2nd generation)',
      category: Category.ELECTRONICS,
      seller: 'Amazon',
      purchaseDate: ago(0),
      price: '24900.00',
      returnWindowDays: 7,
      warrantyStartDate: ago(0),
      warrantyMonths: 12,
    },
    {
      // Return closed 5 days ago — shows in "recently expired".
      productName: 'Philips Air Fryer',
      category: Category.HOME_KITCHEN,
      seller: 'Croma',
      purchaseDate: ago(15),
      price: '8999.00',
      returnWindowDays: 10,
      warrantyStartDate: ago(15),
      warrantyMonths: 24,
      notes: 'Bought in the Diwali sale; the extended warranty card is in the kitchen drawer',
    },
    {
      // Warranty ends within days — the warranty half of "needs action".
      productName: 'Samsung 1.5 Ton Inverter Split AC',
      category: Category.APPLIANCES,
      seller: 'Croma',
      purchaseDate: ago(364),
      price: '38990.00',
      warrantyStartDate: ago(364),
      warrantyMonths: 12,
    },
    {
      productName: 'iPhone 15',
      category: Category.MOBILE,
      seller: 'Apple Store',
      purchaseDate: ago(285),
      price: '71999.00',
      warrantyStartDate: ago(285),
      warrantyMonths: 12,
    },
    {
      productName: 'Dell XPS 13',
      category: Category.ELECTRONICS,
      seller: 'Dell India',
      purchaseDate: ago(600),
      price: '124990.00',
      warrantyStartDate: ago(600),
      warrantyMonths: 24,
    },
    {
      // Warranty ended about 11 days ago — the second "recently expired" item.
      productName: 'LG washing machine',
      category: Category.APPLIANCES,
      seller: 'Reliance Digital',
      purchaseDate: ago(740),
      price: '32499.00',
      warrantyStartDate: ago(740),
      warrantyMonths: 24,
    },
  ];
}

/**
 * Idempotent: if the demo account is already there, nothing is written. A seed
 * that duplicates on a second run turns a nervous re-run before a demo into
 * fourteen purchases.
 */
export async function seed(app: INestApplicationContext): Promise<SeedResult> {
  const users = app.get(UserRepository);
  const purchases = app.get(PurchaseRepository);
  const dates = app.get(DatesService);
  const config = app.get(ConfigService);

  if (await users.findByEmail(DEMO_EMAIL)) return { created: false };

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, config.getOrThrow<number>('BCRYPT_ROUNDS'));

  const demo = await users.store({ name: 'Demo User', email: DEMO_EMAIL, passwordHash });
  const other = await users.store({ name: 'Other User', email: OTHER_EMAIL, passwordHash });

  const today = dates.today();
  const ago = (days: number): string => dates.addDays(today, -days);

  for (const purchase of demoPurchases(ago)) {
    await purchases.store({ ...purchase, userId: demo.id });
  }

  // The second account owns something of its own, so the privacy step of the
  // demo shows a real user with real data rather than an empty screen.
  await purchases.store({
    productName: 'Prestige electric kettle',
    category: Category.HOME_KITCHEN,
    purchaseDate: ago(5),
    price: '1999.00',
    returnWindowDays: 7,
    userId: other.id,
  });

  return { created: true };
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  try {
    const result = await seed(app);

    console.log(
      result.created
        ? `Seeded ${DEMO_EMAIL} and ${OTHER_EMAIL} (password: ${DEMO_PASSWORD})`
        : `${DEMO_EMAIL} already exists — nothing to do`,
    );
  } finally {
    await app.close();
  }
}

if (require.main === module) void main();
