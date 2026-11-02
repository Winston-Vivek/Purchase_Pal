import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import BaseButton from './BaseButton.vue';
import BaseInput from './BaseInput.vue';
import EmptyState from './EmptyState.vue';
import SkeletonBlock from './SkeletonBlock.vue';
import ToastMessage from './ToastMessage.vue';

/** FE-CMP-08, 09, 13, 14, 16 from docs/test-cases.md §3.2. */
describe('Base components', () => {
  describe('BaseButton', () => {
    it('FE-CMP-08 while loading it is disabled, says so, and does not resize', () => {
      const wrapper = mount(BaseButton, {
        props: { loading: true, loadingLabel: 'Saving…' },
        slots: { default: 'Save' },
      });
      const button = wrapper.get('button');

      expect(button.attributes('disabled')).toBeDefined();
      expect(button.attributes('aria-busy')).toBe('true');
      expect(wrapper.text()).toContain('Saving…');
      // The original label stays in the layout, hidden, so the button keeps
      // its width and the page does not jump mid-save (ui-guide §4).
      expect(wrapper.html()).toContain('Save');
    });

    // FE-CMP-18. Tailwind's Preflight sets `svg { display: block }`, so an
    // icon inside an inline wrapper drops onto its own line and every button
    // with an icon renders two-storey. The wrapper has to be a flex row.
    it('FE-CMP-18 an icon and its label stay on one line', () => {
      const wrapper = mount(BaseButton, {
        slots: { default: '<svg data-testid="icon"></svg> Add service record' },
      });

      const slotWrapper = wrapper.get('[data-testid="icon"]').element.parentElement!;
      expect(slotWrapper.className).toMatch(/\binline-flex\b|\bflex\b/);
      expect(slotWrapper.className).toContain('items-center');
    });

    it('FE-CMP-08 a loading button cannot be clicked twice', async () => {
      const wrapper = mount(BaseButton, { props: { loading: true }, slots: { default: 'Save' } });

      await wrapper.get('button').trigger('click');

      expect(wrapper.emitted('click')).toBeUndefined();
    });

    it('has a visible focus ring and a 44px minimum target', () => {
      const html = mount(BaseButton, { slots: { default: 'Save' } }).html();

      expect(html).toContain('focus-visible:ring-2');
      expect(html).toContain('min-h-11'); // 44px — ui-guide §8
      expect(html).toContain('cursor-pointer');
    });
  });

  describe('BaseInput', () => {
    it('FE-CMP-09 an error is announced and tied to the field', () => {
      const wrapper = mount(BaseInput, {
        props: { id: 'price', label: 'Price', modelValue: '', error: 'Must be 0 or more' },
      });
      const input = wrapper.get('input');

      expect(input.attributes('aria-invalid')).toBe('true');

      const describedBy = input.attributes('aria-describedby');
      expect(describedBy).toBeTruthy();
      // The id must actually resolve, or a screen reader announces nothing.
      const described = wrapper.find(`#${describedBy?.split(' ')[0]}`);
      expect(described.exists()).toBe(true);
      expect(wrapper.text()).toContain('Must be 0 or more');
    });

    it('FE-CMP-09 every input has a visible label bound to it', () => {
      const wrapper = mount(BaseInput, {
        props: { id: 'price', label: 'Price', modelValue: '' },
      });

      const label = wrapper.get('label');
      expect(label.text()).toContain('Price');
      expect(label.attributes('for')).toBe('price');
      expect(wrapper.get('input').attributes('id')).toBe('price');
      expect(wrapper.get('input').attributes('aria-invalid')).toBeUndefined();
    });

    it('FE-CMP-09 a hint is also linked, alongside the error', () => {
      const wrapper = mount(BaseInput, {
        props: { id: 'price', label: 'Price', modelValue: '', hint: 'In rupees', error: 'Too low' },
      });

      const describedBy = wrapper.get('input').attributes('aria-describedby') ?? '';
      expect(describedBy.split(' ')).toHaveLength(2);
    });
  });

  describe('EmptyState', () => {
    it('FE-CMP-13 says why it is empty and offers the next step', () => {
      const wrapper = mount(EmptyState, {
        props: { message: 'No purchases yet' },
        slots: { action: '<a href="/purchases/new">Add purchase</a>' },
      });

      expect(wrapper.text()).toContain('No purchases yet');
      expect(wrapper.get('a').text()).toBe('Add purchase');
    });
  });

  describe('ToastMessage', () => {
    it('FE-CMP-14 is announced politely and clears itself', async () => {
      vi.useFakeTimers();
      const wrapper = mount(ToastMessage, { props: { message: 'Purchase saved', duration: 4000 } });

      // role=status, not alert: a success is not an interruption.
      expect(wrapper.get('[role="status"]').text()).toContain('Purchase saved');

      vi.advanceTimersByTime(4000);
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('dismiss')).toHaveLength(1);
      vi.useRealTimers();
    });
  });

  describe('SkeletonBlock', () => {
    it('FE-CMP-16 marks the region busy while it stands in for content', () => {
      const wrapper = mount(SkeletonBlock, { props: { lines: 3 } });

      expect(wrapper.attributes('aria-busy')).toBe('true');
      expect(wrapper.attributes('aria-live')).toBe('polite');
      // Placeholder bars are decoration; the busy state is the message.
      expect(wrapper.findAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
    });
  });
});
