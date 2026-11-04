// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest';
import {Modal, Toast, showConfirmDialog, setTimePresentation} from '../src';

afterEach(() => {vi.useRealTimers(); document.body.replaceChildren();});
it('keeps host fields on rejected confirmation, renders labels as text and closes once', async () => {
    vi.useFakeTimers(); const cancel = vi.fn(), confirm = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const modal = new Modal('<unsafe>', '<input value="draft">', {confirmText: 'Save', onConfirm: confirm, onCancel: cancel}); modal.show();
    const input = document.querySelector('input'), button = document.querySelector<HTMLButtonElement>('.settings-modal-confirm')!;
    button.click(); await Promise.resolve(); expect(document.querySelector('input')).toBe(input); expect(button.disabled).toBe(false);
    expect(document.querySelector('h3')!.textContent).toBe('<unsafe>'); expect(document.querySelector('unsafe')).toBeNull();
    button.click(); await Promise.resolve(); modal.hide(); await vi.runAllTimersAsync(); expect(cancel).toHaveBeenCalledOnce();
    expect(document.querySelector('.ui-modal')).toBeNull();
});
it('resolves confirmation through injected labels and treats the message as text', async () => {
    vi.useFakeTimers(); const accepted = showConfirmDialog('<img src=x onerror=run()>', {confirmText: 'Proceed'});
    expect(document.querySelector('.ui-modal__body img')).toBeNull();
    document.querySelector<HTMLButtonElement>('.settings-modal-confirm')!.click(); expect(await accepted).toBe(true);
    await vi.runAllTimersAsync();
    const cancelled = showConfirmDialog('cancel'); document.querySelector<HTMLButtonElement>('.settings-modal-cancel')!.click();
    await vi.runAllTimersAsync(); expect(await cancelled).toBe(false);
});
it('keeps toast messages inert and releases an action notification and its timer', async () => {
    vi.useFakeTimers(); const action = vi.fn(); Toast.action('<b>untrusted</b>', 'Open', action);
    expect(document.querySelector('.ui-toast__message')!.textContent).toBe('<b>untrusted</b>'); expect(document.querySelector('.ui-toast b')).toBeNull();
    document.querySelector<HTMLButtonElement>('.ui-toast__action')!.click(); expect(action).toHaveBeenCalledOnce();
    expect(document.querySelector('.ui-toast-container')).toBeNull(); expect(vi.getTimerCount()).toBe(0);
});
it('formats times with caller locale and clears stale timestamp attributes for invalid dates', () => {
    const time = document.createElement('time'); setTimePresentation(time, 1000, '?', 'en-US'); expect(time.dateTime).toBe('1970-01-01T00:00:01.000Z');
    setTimePresentation(time, NaN, '?', 'zh-CN'); expect(time.textContent).toBe('?'); expect(time.hasAttribute('datetime')).toBe(false); expect(time.hasAttribute('title')).toBe(false);
});
