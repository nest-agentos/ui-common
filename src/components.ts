export interface ModalOptions {
    confirmText?: string;
    cancelText?: string;
    closeLabel?: string;
    type?: 'default' | 'danger' | 'success';
    width?: string;
    onConfirm?(element: HTMLElement): void | boolean | Promise<void | boolean>;
    onCancel?(): void;
}
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const make = <K extends keyof HTMLElementTagNameMap>(tag: K, classes: string, text?: string) => {
    const node = document.createElement(tag); node.className = classes; if (text !== undefined) node.textContent = text; return node;
};
/** Content markup is supplied by trusted host code. Titles and labels are always plain text. */
export class Modal {
    private element?: HTMLElement;
    constructor(private readonly title: string, private readonly contentHTML: string, private readonly options: ModalOptions = {}) {}
    show(): void {
        if (this.element) return;
        const overlay = make('div', 'ui-modal-overlay settings-modal-overlay'), dialog = make('div', 'ui-modal settings-modal');
        dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', this.title);
        if (this.options.width) dialog.style.width = this.options.width;
        const header = make('div', 'ui-modal__header settings-modal__header'), body = make('div', 'ui-modal__body settings-modal__body');
        const footer = make('div', 'ui-modal__footer settings-modal__footer'), close = this.button(this.options.closeLabel ?? 'Close', () => this.hide(), 'settings-modal-close');
        header.append(make('h3', '', this.title), close); body.innerHTML = this.contentHTML;
        const cancel = this.button(this.options.cancelText ?? 'Cancel', () => this.hide(), 'settings-modal-cancel');
        const confirm = this.button(this.options.confirmText ?? 'Confirm', () => {void this.confirm(confirm, overlay);}, 'settings-modal-confirm');
        confirm.dataset.tone = this.options.type ?? 'default'; footer.append(cancel, confirm); dialog.append(header, body, footer); overlay.append(dialog);
        overlay.addEventListener('click', event => {if (event.target === overlay) this.hide();});
        overlay.addEventListener('keydown', event => {if (event.key === 'Escape') {event.stopPropagation(); this.hide();}});
        this.element = overlay; document.body.append(overlay); overlay.classList.add('show');
    }
    private button(label: string, run: () => void, classes: string): HTMLButtonElement {
        const button = make('button', 'ui-modal__button settings-btn settings-btn--secondary ' + classes, label);
        button.type = 'button'; button.addEventListener('click', run); return button;
    }
    private async confirm(button: HTMLButtonElement, overlay: HTMLElement): Promise<void> {
        if (button.disabled) return;
        button.disabled = true;
        try {if (await this.options.onConfirm?.(overlay) !== false && this.element === overlay) this.hide();}
        catch (error) {Toast.error(error instanceof Error ? error.message : String(error));}
        finally {button.disabled = false;}
    }
    hide(): void {
        const element = this.element; if (!element) return;
        this.element = undefined; element.classList.remove('show');
        setTimeout(() => {element.remove(); this.options.onCancel?.();}, 300);
    }
    static confirm(title: string, message: string, onConfirm: () => void): void {
        new Modal(title, `<p>${escape(message)}</p>`, {type: 'danger', onConfirm}).show();
    }
}
export type ToastType = 'info' | 'success' | 'warning' | 'error';
export class Toast {
    static show(message: string, type: ToastType = 'info', duration = 3000): void {this.mount(message, type, duration);}
    private static mount(message: string, type: ToastType, duration: number, action?: {label: string; run(): void}): void {
        let container = document.querySelector<HTMLElement>('.ui-toast-container');
        if (!container) {container = make('div', 'ui-toast-container settings-toast-container'); document.body.append(container);}
        const toast = make('div', `ui-toast ui-toast--${type} settings-toast settings-toast--${type}`);
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toast.append(make('span', 'ui-toast__message settings-toast__message', message));
        let timer: ReturnType<typeof setTimeout>;
        const dismiss = () => {clearTimeout(timer); toast.remove(); if (!container!.childElementCount) container!.remove();};
        if (action) {
            const button = make('button', 'ui-toast__action settings-toast__action', action.label); button.type = 'button';
            button.addEventListener('click', () => {dismiss(); action.run();}); toast.append(button);
        }
        container.append(toast); toast.classList.add('show'); timer = setTimeout(dismiss, duration);
    }
    static success(message: string): void {this.show(message, 'success');}
    static error(message: string): void {this.show(message, 'error');}
    static warning(message: string): void {this.show(message, 'warning');}
    static info(message: string): void {this.show(message, 'info');}
    static action(message: string, label: string, run: () => void, duration = 8000): void {this.mount(message, 'info', duration, {label, run});}
}
export function showConfirmDialog(message: string, options: Pick<ModalOptions, 'confirmText' | 'cancelText' | 'closeLabel'> & {title?: string} = {}): Promise<boolean> {
    return new Promise(resolve => {
        new Modal(options.title ?? 'Confirmation', `<p>${escape(message)}</p>`, {...options, type: 'danger',
            onConfirm: () => {resolve(true);}, onCancel: () => resolve(false)}).show();
    });
}
