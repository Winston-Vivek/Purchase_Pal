import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import StatusBadge from './StatusBadge.vue';

/**
 * FE-CMP-01..06 from docs/test-cases.md §3.2.
 *
 * ui-guide §3: every badge is icon + words + colour, never colour alone, and
 * the words say what happened rather than naming a state. "Return closes in
 * 3 days" beats "Expiring".
 */
interface BadgeProps {
  kind: 'RETURN' | 'WARRANTY' | 'RECEIPT';
  status: 'NOT_SET' | 'EXPIRED' | 'EXPIRING_SOON' | 'ACTIVE' | 'CLOSED' | 'MISSING';
  daysLeft?: number | null;
  date?: string | null;
}

describe('StatusBadge', () => {
  const badge = (props: BadgeProps) => mount(StatusBadge, { props });

  // FE-CMP-17. An expired window already reads "Return closed <date>", so a
  // return the user chose to close has to say something you cannot mistake
  // for it.
  it('FE-CMP-17 a return kept on purpose says so, in neutral tokens', () => {
    const wrapper = badge({ kind: 'RETURN', status: 'CLOSED', daysLeft: null, date: '2026-11-03' });

    expect(wrapper.text()).toContain('Keeping it');
    expect(wrapper.text()).not.toContain('Return closed');
    expect(wrapper.text()).not.toMatch(/days? left|closes in/);
    expect(wrapper.classes().join(' ')).toContain('bg-none-bg');
  });

  it('FE-CMP-01 a return closing soon says how long is left, in warn tokens', () => {
    const wrapper = badge({ kind: 'RETURN', status: 'EXPIRING_SOON', daysLeft: 3 });

    expect(wrapper.text()).toContain('Return closes in 3 days');
    expect(wrapper.html()).toContain('bg-warn-bg');
    expect(wrapper.html()).toContain('text-warn-fg');
  });

  it('FE-CMP-02 the last day says today, not "in 0 days"', () => {
    const wrapper = badge({ kind: 'RETURN', status: 'EXPIRING_SOON', daysLeft: 0 });

    expect(wrapper.text()).toContain('Return closes today');
    expect(wrapper.text()).not.toContain('0 days');
  });

  it('FE-CMP-02 one day is singular', () => {
    expect(badge({ kind: 'RETURN', status: 'EXPIRING_SOON', daysLeft: 1 }).text()).toContain(
      'Return closes in 1 day',
    );
    expect(badge({ kind: 'RETURN', status: 'EXPIRING_SOON', daysLeft: 1 }).text()).not.toContain(
      '1 days',
    );
  });

  it('FE-CMP-03 an expired warranty says when it ended, in bad tokens', () => {
    const wrapper = badge({ kind: 'WARRANTY', status: 'EXPIRED', date: '2026-10-19' });

    expect(wrapper.text()).toContain('Warranty ended 19 Oct 2026');
    expect(wrapper.html()).toContain('bg-bad-bg');
    expect(wrapper.html()).toContain('text-bad-fg');
  });

  it('FE-CMP-04 an active warranty says it is covered and for how long', () => {
    const wrapper = badge({ kind: 'WARRANTY', status: 'ACTIVE', daysLeft: 364 });

    expect(wrapper.text()).toContain('Covered · 364 days left');
    expect(wrapper.html()).toContain('bg-ok-bg');
  });

  it('FE-CMP-04 an open return says so in its own words', () => {
    expect(badge({ kind: 'RETURN', status: 'ACTIVE', daysLeft: 12 }).text()).toContain(
      'Return open · 12 days left',
    );
  });

  it('FE-CMP-05 nothing set reads as an absence, per kind', () => {
    expect(badge({ kind: 'RETURN', status: 'NOT_SET' }).text()).toContain('No return window');
    expect(badge({ kind: 'WARRANTY', status: 'NOT_SET' }).text()).toContain('No warranty');
  });

  it('FE-CMP-05 a missing receipt is its own badge', () => {
    const wrapper = badge({ kind: 'RECEIPT', status: 'MISSING' });

    expect(wrapper.text()).toContain('Receipt missing');
    expect(wrapper.html()).toContain('bg-warn-bg');
  });

  it('FE-CMP-06 the meaning is in the text; the icon is hidden from assistive tech', () => {
    const everyStatus: BadgeProps[] = [
      { kind: 'RETURN', status: 'EXPIRING_SOON', daysLeft: 3 },
      { kind: 'WARRANTY', status: 'EXPIRED', date: '2026-10-19' },
      { kind: 'WARRANTY', status: 'ACTIVE', daysLeft: 364 },
      { kind: 'RETURN', status: 'NOT_SET' },
      { kind: 'RECEIPT', status: 'MISSING' },
    ];

    for (const props of everyStatus) {
      const wrapper = badge(props);
      const icon = wrapper.find('svg');

      expect(icon.exists()).toBe(true);
      expect(icon.attributes('aria-hidden')).toBe('true');
      // Colour alone is never the signal: there is always wording too.
      expect(wrapper.text().trim().length).toBeGreaterThan(3);
    }
  });

  it('FE-CMP-06 each status gets a different icon, so shape carries meaning too', () => {
    const iconOf = (props: BadgeProps) =>
      badge(props).find('svg').attributes('class') ?? badge(props).find('svg').html().slice(0, 200);

    const active = iconOf({ kind: 'WARRANTY', status: 'ACTIVE', daysLeft: 10 });
    const soon = iconOf({ kind: 'WARRANTY', status: 'EXPIRING_SOON', daysLeft: 2 });
    const expired = iconOf({ kind: 'WARRANTY', status: 'EXPIRED', date: '2026-01-01' });

    expect(new Set([active, soon, expired]).size).toBe(3);
  });
});
