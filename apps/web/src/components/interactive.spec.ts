import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import ConfirmDialog from './ConfirmDialog.vue';
import ErrorSummary from './ErrorSummary.vue';
import FileDrop from './FileDrop.vue';

/** FE-CMP-10, 11, 12, 15 from docs/test-cases.md §3.2. */
describe('Interactive components', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('ErrorSummary', () => {
    it('FE-CMP-10 announces itself, takes focus, and links each field', async () => {
      // The fields it links to have to exist for the links to go anywhere.
      document.body.insertAdjacentHTML(
        'beforeend',
        '<form><input id="productName" /><input id="price" /></form>',
      );

      const wrapper = mount(ErrorSummary, {
        props: {
          errors: { productName: 'Enter a product name', price: 'Must be 0 or more' },
        },
        attachTo: document.body,
      });
      await nextTick();

      const summary = wrapper.get('[role="alert"]');
      expect(summary.attributes('tabindex')).toBe('-1');
      // Focus moves here after a failed save so the problem is not off-screen
      // (ui-guide §6, skill rule Focusable Error Summary).
      expect(document.activeElement).toBe(summary.element);

      const links = wrapper.findAll('a');
      expect(links).toHaveLength(2);
      expect(links.map((a) => a.attributes('href'))).toEqual(['#productName', '#price']);
      expect(wrapper.text()).toContain('Enter a product name');

      await links[0]!.trigger('click');
      expect(document.activeElement?.id).toBe('productName');

      wrapper.unmount();
    });

    it('FE-CMP-10 renders nothing when there are no errors', () => {
      const wrapper = mount(ErrorSummary, { props: { errors: {} } });

      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    });
  });

  describe('ConfirmDialog', () => {
    const openDialog = async () => {
      const trigger = document.createElement('button');
      trigger.id = 'trigger';
      document.body.append(trigger);
      trigger.focus();

      const wrapper = mount(ConfirmDialog, {
        props: {
          open: true,
          title: 'Delete Samsung 1.5 Ton Inverter Split AC?',
          body: 'Its 2 receipts and 1 service record go with it.',
          confirmLabel: 'Delete',
        },
        attachTo: document.body,
      });
      await nextTick();
      return { wrapper, trigger };
    };

    it('FE-CMP-11 traps focus, names what is being deleted, and closes on Escape', async () => {
      const { wrapper, trigger } = await openDialog();

      const dialog = document.body.querySelector('[role="dialog"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      // ui-guide §7: the dialog names the thing and what goes with it.
      expect(dialog?.textContent).toContain('Samsung 1.5 Ton Inverter Split AC');
      expect(dialog?.textContent).toContain('2 receipts');

      expect(dialog?.contains(document.activeElement)).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await nextTick();
      expect(wrapper.emitted('cancel')).toHaveLength(1);

      // Focus goes back where it came from, or the user is lost on the page.
      await wrapper.setProps({ open: false });
      await nextTick();
      expect(document.activeElement).toBe(trigger);

      wrapper.unmount();
    });

    it('FE-CMP-12 confirming emits once; cancelling emits no confirm', async () => {
      const { wrapper } = await openDialog();

      const buttons = [...document.body.querySelectorAll('button')];
      const confirm = buttons.find((b) => b.textContent?.includes('Delete'));
      confirm?.click();
      await nextTick();

      expect(wrapper.emitted('confirm')).toHaveLength(1);
      expect(wrapper.emitted('cancel')).toBeUndefined();

      wrapper.unmount();
    });

    it('FE-CMP-12 cancelling emits cancel and never confirm', async () => {
      const { wrapper } = await openDialog();

      const cancel = [...document.body.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Cancel'),
      );
      cancel?.click();
      await nextTick();

      expect(wrapper.emitted('cancel')).toHaveLength(1);
      expect(wrapper.emitted('confirm')).toBeUndefined();

      wrapper.unmount();
    });
  });

  describe('FileDrop', () => {
    const fileOf = (name: string, type: string, bytes: number) =>
      new File([new Uint8Array(bytes)], name, { type });

    it('FE-CMP-15 refuses a file over 5 MB before anything is sent', async () => {
      const wrapper = mount(FileDrop);

      await wrapper.vm.accept([fileOf('big.pdf', 'application/pdf', 6 * 1024 * 1024)]);

      expect(wrapper.text()).toMatch(/5 MB|too large/i);
      // The parent is never told to upload, so no request is made.
      expect(wrapper.emitted('select')).toBeUndefined();
    });

    it('FE-CMP-15 refuses a type the API would reject anyway', async () => {
      const wrapper = mount(FileDrop);

      await wrapper.vm.accept([fileOf('malware.exe', 'application/x-msdownload', 512)]);

      expect(wrapper.text()).toMatch(/PDF|JPG|PNG|WEBP/i);
      expect(wrapper.emitted('select')).toBeUndefined();
    });

    it('FE-CMP-15 passes on a file that is actually allowed', async () => {
      const wrapper = mount(FileDrop);
      const file = fileOf('receipt.pdf', 'application/pdf', 1024);

      await wrapper.vm.accept([file]);

      expect(wrapper.emitted('select')?.[0]).toEqual([file]);
      expect(wrapper.text()).not.toMatch(/too large/i);
    });

    it('FE-CMP-15 states the limits before a file is chosen', () => {
      // ui-guide §4: the rules are shown up front, not discovered by failing.
      const text = mount(FileDrop).text();

      expect(text).toMatch(/PDF/i);
      expect(text).toMatch(/5 MB/i);
    });
  });
});
