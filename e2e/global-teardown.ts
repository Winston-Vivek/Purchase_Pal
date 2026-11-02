import { request } from '@playwright/test';
import { DEMO, OTHER } from './helpers';

/**
 * Sweeps anything the journeys created, including from a run that failed
 * part-way. A per-test cleanup only runs when the test reaches it, so a
 * failure half-way leaves rows behind and the next run then fails on
 * "resolved to 5 elements" for a reason that is not a bug.
 *
 * Only touches purchases named with the E2E prefix, so seeded demo data and
 * anything a person added by hand are left alone.
 */
const PREFIX = 'E2E ';

export default async function globalTeardown(): Promise<void> {
  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5199';

  for (const who of [DEMO, OTHER]) {
    const context = await request.newContext({ baseURL });

    try {
      const signIn = await context.post('/api/v1/auth/login', { data: who });
      if (!signIn.ok()) continue;

      const list = await context.get('/api/v1/purchases?pageSize=50');
      if (!list.ok()) continue;

      const { items } = (await list.json()) as { items: { id: string; productName: string }[] };
      const mine = items.filter((p) => p.productName.startsWith(PREFIX));

      for (const purchase of mine) {
        await context.delete(`/api/v1/purchases/${purchase.id}`);
      }

      if (mine.length > 0) {
        // stderr, not stdout: when a suite is run with --reporter=json its
        // stdout is the report, and a stray line here makes it unparseable.
        // eslint-disable-next-line no-console
        console.error(
          `[e2e teardown] removed ${mine.length} leftover purchase(s) for ${who.email}`,
        );
      }
    } finally {
      await context.dispose();
    }
  }
}
