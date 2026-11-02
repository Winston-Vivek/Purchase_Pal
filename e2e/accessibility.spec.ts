import { expect, test } from '@playwright/test';
import { hasHorizontalScroll, isoToday, signIn } from './helpers';

/**
 * NFR-01..09 from docs/test-cases.md §7, automated rather than eyeballed.
 *
 * A checklist someone ticks once is worth less than a check that runs on every
 * push: these are exactly the properties that regress quietly when a class is
 * changed three screens away.
 */

const SIGNED_IN = ['/dashboard', '/purchases', '/purchases/new', '/settings'];
const WIDTHS = [360, 768, 1024, 1440];

/** WCAG 2.1 relative luminance and contrast ratio, computed in the page from
 *  the colours that actually ended up on screen. */
const CONTRAST_HELPERS = `
  const channel = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const parse = (value) => (value.match(/\\d+(\\.\\d+)?/g) || []).slice(0, 3).map(Number);
  const ratio = (fg, bg) => {
    const a = luminance(parse(fg)), b = luminance(parse(bg));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const effectiveBackground = (el) => {
    let node = el;
    while (node) {
      const bg = getComputedStyle(node).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
      node = node.parentElement;
    }
    return 'rgb(255, 255, 255)';
  };
`;

test.describe('Non-functional checks', () => {
  test('NFR-01 no page scrolls sideways at any of the four widths', async ({ page, context }) => {
    await signIn(context);

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });

      for (const path of ['/login', ...SIGNED_IN]) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        expect(await hasHorizontalScroll(page), `${path} at ${width}px`).toBe(false);
      }
    }
  });

  test('NFR-02 text clears 4.5:1 and badges clear it on their own tint', async ({
    page,
    context,
  }) => {
    await signIn(context);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const failures = await page.evaluate(`(() => {
      ${CONTRAST_HELPERS}
      const bad = [];
      const candidates = document.querySelectorAll('p, span, a, button, h1, h2, td, th, label, dd, dt');

      for (const el of candidates) {
        const text = (el.textContent || '').trim();
        if (!text || el.children.length > 0) continue;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') continue;

        const size = parseFloat(style.fontSize);
        const bold = Number(style.fontWeight) >= 700;
        // WCAG: large text is 18.66px bold or 24px regular.
        const required = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
        const found = ratio(style.color, effectiveBackground(el));

        if (found < required) {
          bad.push(text.slice(0, 40) + ' :: ' + found.toFixed(2) + ' < ' + required);
        }
      }
      return bad;
    })()`);

    expect(failures, `contrast failures:\n${(failures as string[]).join('\n')}`).toEqual([]);
  });

  test('NFR-03 every status badge carries an icon and words, never colour alone', async ({
    page,
    context,
  }) => {
    await signIn(context);
    await page.goto('/purchases');
    await page.waitForLoadState('networkidle');

    // Direct child only: the wrapper span around several badges also matches
    // `:has(svg)` and would hold three icons.
    const badges = page.locator('td span:has(> svg), li span:has(> svg)');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      const badge = badges.nth(i);
      await expect(badge.locator('svg')).toHaveAttribute('aria-hidden', 'true');
      expect((await badge.innerText()).trim().length).toBeGreaterThan(3);
    }
  });

  test('NFR-04 sign in and reach Add purchase using only the keyboard', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // Start from a known place: without this the first Tab sometimes goes to
    // browser chrome rather than into the page, and the test is flaky.
    await page.locator('body').click({ position: { x: 2, y: 2 } });

    // Tab to the email field rather than clicking it.
    for (let i = 0; i < 8; i += 1) {
      const id = await page.evaluate(() => document.activeElement?.id ?? '');
      if (id === 'email') break;
      await page.keyboard.press('Tab');
    }
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('email');

    await page.keyboard.type('demo@proofly.test');
    await page.keyboard.press('Tab');
    await page.keyboard.type('demo1234');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/dashboard$/);

    // And the main navigation is reachable the same way.
    await page.keyboard.press('Tab');
    const reached = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
    expect(reached.length).toBeGreaterThan(0);
  });

  test('NFR-05 every focused control shows a ring', async ({ page, context }) => {
    await signIn(context);
    await page.goto('/purchases/new');
    await page.waitForLoadState('networkidle');

    const invisible = await page.evaluate(`(() => {
      const bad = [];
      const controls = [...document.querySelectorAll('button, a[href], input, select, textarea')]
        .filter((el) => el.offsetParent !== null);

      for (const el of controls.slice(0, 25)) {
        el.focus();
        const style = getComputedStyle(el);
        const ringed =
          (style.boxShadow && style.boxShadow !== 'none') ||
          (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0);
        if (!ringed) bad.push(el.tagName + ' ' + (el.id || el.textContent || '').trim().slice(0, 30));
      }
      return bad;
    })()`);

    expect(invisible, `no visible focus on:\n${(invisible as string[]).join('\n')}`).toEqual([]);
  });

  test('NFR-06 every input has a real label, and an error is linked to its field', async ({
    page,
    context,
  }) => {
    await signIn(context);
    await page.goto('/purchases/new');
    await page.waitForLoadState('networkidle');

    const unlabelled = await page.evaluate(`(() => {
      const bad = [];
      for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=file]), select, textarea')) {
        const labelled =
          (el.id && document.querySelector('label[for="' + el.id + '"]')) ||
          el.getAttribute('aria-label') ||
          el.closest('label');
        if (!labelled) bad.push(el.tagName + ' ' + (el.id || el.name || '(no id)'));
      }
      return bad;
    })()`);
    expect(unlabelled, `unlabelled: ${(unlabelled as string[]).join(', ')}`).toEqual([]);

    // Force a server rejection, then check the message is tied to its input.
    await page.fill('#productName', 'NFR check');
    await page.fill('#price', '-1');
    await page.fill('#purchaseDate', isoToday());
    await page.getByRole('button', { name: /save purchase/i }).click();

    const price = page.locator('#price');
    await expect(price).toHaveAttribute('aria-invalid', 'true');

    const describedBy = await price.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    for (const id of (describedBy ?? '').split(' ')) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }

    // The summary takes focus so the reason is never off-screen.
    await expect(page.locator('[role="alert"]').first()).toBeVisible();
  });

  test('NFR-07 touch targets are at least 44px on a phone', async ({ page, context }) => {
    await signIn(context);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/purchases/new');
    await page.waitForLoadState('networkidle');

    const small = await page.evaluate(`(() => {
      const bad = [];
      for (const el of document.querySelectorAll('button, a[href], input:not([type=hidden]):not([type=file]), select')) {
        if (el.offsetParent === null) continue;
        const { height } = el.getBoundingClientRect();
        // Radios and checkboxes sit inside a label that carries the target.
        if (el.type === 'radio' || el.type === 'checkbox') continue;
        if (height > 0 && height < 44) bad.push(el.tagName + ' ' + (el.id || el.textContent || '').trim().slice(0, 24) + ' = ' + Math.round(height));
      }
      return bad;
    })()`);

    expect(small, `under 44px:\n${(small as string[]).join('\n')}`).toEqual([]);
  });

  test('NFR-08 reduced motion turns transitions and animations off', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await signIn(context);
    const page = await context.newPage();
    await page.goto('/purchases');
    await page.waitForLoadState('networkidle');

    const moving = await page.evaluate(`(() => {
      const bad = [];
      for (const el of [...document.querySelectorAll('*')].slice(0, 400)) {
        const style = getComputedStyle(el);
        // motion-reduce:transition-none sets transition-property to none and
        // leaves the duration alone, so duration on its own proves nothing.
        const transition =
          style.transitionProperty !== 'none' && (parseFloat(style.transitionDuration) || 0) > 0;
        const animation = style.animationName !== 'none' && (parseFloat(style.animationDuration) || 0) > 0;
        if (transition || animation) bad.push(el.tagName + '.' + String(el.className).slice(0, 40));
      }
      return bad;
    })()`);

    expect(moving, `still animating:\n${(moving as string[]).join('\n')}`).toEqual([]);
    await context.close();
  });

  test('NFR-09 the title changes per route and there is one h1 per page', async ({
    page,
    context,
  }) => {
    await signIn(context);
    const seen = new Set<string>();

    for (const path of SIGNED_IN) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const title = await page.title();
      expect(title, `${path} has no useful title`).toMatch(/Purchase Tracker/);
      seen.add(title);

      await expect(page.locator('h1'), `${path} should have exactly one h1`).toHaveCount(1);
    }

    // Four routes, four distinct titles: a tab or history entry has to say
    // which screen it is (ui-guide §8).
    expect(seen.size).toBe(SIGNED_IN.length);
  });

  // NFR-13. A control that spills out of its card does not make the page
  // scroll, so NFR-01 never saw it: the warranty unit select sat 64px outside
  // the Warranty fieldset at every desktop width and the suite stayed green.
  test('NFR-13 no control escapes the card it belongs to', async ({ page, context }) => {
    await signIn(context);

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/purchases/new');
      await page.waitForLoadState('networkidle');
      // The warranty fields only exist once there is a warranty to describe.
      await page.locator('#hasWarranty').check();

      const escapees = await page.evaluate(() => {
        const bad: string[] = [];

        for (const control of document.querySelectorAll('input, select, textarea, button')) {
          const card = control.closest('fieldset, section');
          if (!card) continue;

          const a = control.getBoundingClientRect();
          const b = card.getBoundingClientRect();
          if (a.width === 0) continue;

          // 1px for sub-pixel rounding; anything more is a real overflow.
          if (a.right > b.right + 1 || a.left < b.left - 1) {
            bad.push(`${control.id || control.tagName} spills out of its card`);
          }
        }

        return bad;
      });

      expect(escapees, `at ${width}px`).toEqual([]);
    }
  });
});
