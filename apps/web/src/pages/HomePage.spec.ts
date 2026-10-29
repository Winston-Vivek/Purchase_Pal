import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import HomePage from './HomePage.vue';

/**
 * Slice 0 smoke test. No test-case ID: it proves the harness, not a rule —
 * that Vitest renders a real SFC, that the Lucide icon resolves, and that the
 * ui-guide token classes reach the DOM. Every component slice depends on all
 * three.
 */
describe('Frontend scaffold', () => {
  it('renders a single-file component through Vue Test Utils', () => {
    const wrapper = mount(HomePage);

    expect(wrapper.find('h1').text()).toBe('Proofly');
    expect(wrapper.text()).toContain('Every receipt, return and warranty in one place.');
  });

  it('uses only ui-guide tokens for colour, never a raw hex or a Tailwind palette class', () => {
    const html = mount(HomePage).html();

    expect(html).toContain('bg-ok-bg');
    expect(html).toContain('text-ok-fg');
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(html).not.toMatch(/\b(bg|text|border)-(slate|blue|green|red|amber|gray)-\d{2,3}\b/);
  });

  it('renders a Lucide icon that is hidden from assistive tech', () => {
    // ui-guide §3: meaning lives in the words; the icon is decoration.
    const icon = mount(HomePage).find('svg');

    expect(icon.exists()).toBe(true);
    expect(icon.attributes('aria-hidden')).toBe('true');
  });
});
