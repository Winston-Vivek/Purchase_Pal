import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import RowMenu from './RowMenu.vue';

/**
 * FE-CMP-19 from docs/test-cases.md §3.2.
 *
 * The menu is teleported to the body (NFR-14), so it is queried there rather
 * than through the wrapper — the same way the dialog tests work.
 */
describe('RowMenu', () => {
  const menu = () =>
    mount(RowMenu, {
      attachTo: document.body,
      props: { label: 'Actions for AirPods Pro' },
      slots: {
        default: '<button role="menuitem">View</button><button role="menuitem">Edit</button>',
      },
    });

  const list = () => document.body.querySelector('[role="menu"]');
  const menuItems = () =>
    Array.from(list()?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('FE-CMP-19 starts closed, and says so', () => {
    const wrapper = menu();
    const trigger = wrapper.get('button');

    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(trigger.attributes('aria-haspopup')).toBe('menu');
    // The three dots are a picture; the name is for everyone else.
    expect(trigger.attributes('aria-label')).toBe('Actions for AirPods Pro');
    expect(list()).toBeNull();
  });

  it('FE-CMP-19 opening focuses the first item', async () => {
    const wrapper = menu();

    await wrapper.get('button').trigger('click');

    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true');
    expect(list()).not.toBeNull();
    expect(document.activeElement?.textContent).toBe('View');
  });

  it('FE-CMP-19 arrows move between items and wrap', async () => {
    const wrapper = menu();
    await wrapper.get('button').trigger('click');

    const press = (key: string) =>
      list()!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

    press('ArrowDown');
    expect(document.activeElement?.textContent).toBe('Edit');

    press('ArrowDown');
    expect(document.activeElement?.textContent).toBe('View');

    press('ArrowUp');
    expect(document.activeElement?.textContent).toBe('Edit');
  });

  it('FE-CMP-19 Escape closes it and gives focus back', async () => {
    const wrapper = menu();
    await wrapper.get('button').trigger('click');

    list()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(list()).toBeNull();
    // Losing focus to the page body after Esc strands a keyboard user.
    expect(document.activeElement).toBe(wrapper.get('button').element);
  });

  it('FE-CMP-19 choosing an item closes it', async () => {
    const wrapper = menu();
    await wrapper.get('button').trigger('click');

    menuItems()[1]!.click();
    await wrapper.vm.$nextTick();

    expect(list()).toBeNull();
  });
});
