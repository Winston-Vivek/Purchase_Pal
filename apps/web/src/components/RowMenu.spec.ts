import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import RowMenu from './RowMenu.vue';

/** FE-CMP-19 from docs/test-cases.md §3.2. */
describe('RowMenu', () => {
  const menu = () =>
    mount(RowMenu, {
      attachTo: document.body,
      props: { label: 'Actions for AirPods Pro' },
      slots: {
        default: '<button role="menuitem">View</button><button role="menuitem">Edit</button>',
      },
    });

  it('FE-CMP-19 starts closed, and says so', () => {
    const wrapper = menu();
    const trigger = wrapper.get('button');

    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(trigger.attributes('aria-haspopup')).toBe('menu');
    // The three dots are a picture; the name is for everyone else.
    expect(trigger.attributes('aria-label')).toBe('Actions for AirPods Pro');
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
  });

  it('FE-CMP-19 opening focuses the first item', async () => {
    const wrapper = menu();

    await wrapper.get('button').trigger('click');

    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true');
    expect(wrapper.find('[role="menu"]').exists()).toBe(true);
    expect(document.activeElement?.textContent).toBe('View');
  });

  it('FE-CMP-19 arrows move between items and wrap', async () => {
    const wrapper = menu();
    await wrapper.get('button').trigger('click');

    const list = wrapper.get('[role="menu"]');
    await list.trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toBe('Edit');

    await list.trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toBe('View');

    await list.trigger('keydown', { key: 'ArrowUp' });
    expect(document.activeElement?.textContent).toBe('Edit');
  });

  it('FE-CMP-19 Escape closes it and gives focus back', async () => {
    const wrapper = menu();
    await wrapper.get('button').trigger('click');

    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'Escape' });

    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    // Losing focus to the page body after Esc strands a keyboard user.
    expect(document.activeElement).toBe(wrapper.get('button').element);
  });

  it('FE-CMP-19 choosing an item closes it', async () => {
    const wrapper = menu();
    await wrapper.get('button').trigger('click');

    const second = wrapper.get('[role="menu"]').findAll('button')[1];
    await second!.trigger('click');

    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
  });
});
