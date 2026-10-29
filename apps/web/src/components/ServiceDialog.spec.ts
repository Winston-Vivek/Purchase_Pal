import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import ServiceDialog from './ServiceDialog.vue';

/** FE-PAGE-22..23 from docs/test-cases.md §4, dialog side. */
describe('ServiceDialog', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const open = async (props: Record<string, unknown> = {}) => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();

    const wrapper = mount(ServiceDialog, {
      props: { open: true, purchaseDate: '2026-10-01', today: '2026-10-29', ...props },
      attachTo: document.body,
    });
    await nextTick();
    return { wrapper, trigger };
  };

  const field = (id: string) => document.body.querySelector<HTMLInputElement>(`#${id}`);

  it('FE-PAGE-22 collects the visit and hands it back on submit', async () => {
    const { wrapper } = await open();

    field('serviceDate')!.value = '2026-10-20';
    field('serviceDate')!.dispatchEvent(new Event('input'));
    field('description')!.value = 'Replaced the cooling fan';
    field('description')!.dispatchEvent(new Event('input'));
    field('provider')!.value = 'Croma Service Centre';
    field('provider')!.dispatchEvent(new Event('input'));
    field('cost')!.value = '1450.50';
    field('cost')!.dispatchEvent(new Event('input'));
    await nextTick();

    document.body.querySelector('form')!.dispatchEvent(new Event('submit'));
    await nextTick();

    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({
      serviceDate: '2026-10-20',
      description: 'Replaced the cooling fan',
      provider: 'Croma Service Centre',
      cost: 1450.5,
      notes: undefined,
    });

    wrapper.unmount();
  });

  it('FE-PAGE-22 the date defaults to today, which is what most people want', async () => {
    const { wrapper } = await open();

    expect(field('serviceDate')!.value).toBe('2026-10-29');

    wrapper.unmount();
  });

  it('FE-PAGE-23 a server error is shown on its field and the dialog stays open', async () => {
    const { wrapper } = await open({
      errors: { serviceDate: 'A service cannot be before the purchase date' },
    });
    await nextTick();

    expect(document.body.textContent).toContain('A service cannot be before the purchase date');
    expect(field('serviceDate')!.getAttribute('aria-invalid')).toBe('true');
    // Closing on a rejected save would throw away what was typed.
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(wrapper.emitted('cancel')).toBeUndefined();

    wrapper.unmount();
  });

  it('FE-PAGE-23 the date input cannot offer a day outside the allowed window', async () => {
    const { wrapper } = await open();

    // §7: on or after the purchase, not in the future. The picker should not
    // offer what the API will refuse.
    expect(field('serviceDate')!.getAttribute('min')).toBe('2026-10-01');
    expect(field('serviceDate')!.getAttribute('max')).toBe('2026-10-29');

    wrapper.unmount();
  });

  it('traps focus, closes on Escape and gives focus back', async () => {
    const { wrapper, trigger } = await open();

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.contains(document.activeElement)).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();
    expect(wrapper.emitted('cancel')).toHaveLength(1);

    await wrapper.setProps({ open: false });
    await nextTick();
    expect(document.activeElement).toBe(trigger);

    wrapper.unmount();
  });

  it('says it is editing when it is given a record', async () => {
    const { wrapper } = await open({
      record: {
        id: 's1',
        purchaseId: 'p1',
        serviceDate: '2026-10-20',
        description: 'Gas top-up',
        provider: 'Samsung',
        cost: 2450,
        notes: null,
      },
    });

    expect(field('description')!.value).toBe('Gas top-up');
    expect(document.body.textContent).toMatch(/edit service record/i);

    wrapper.unmount();
  });
});
