export const MOBILE_NAVIGATION_QUERY = '(max-width: 768px)';

export interface NavigationButtonOptions {
    icon: string;
    label: string;
    run(button: HTMLButtonElement): void;
    popup?: 'dialog' | 'menu';
}

/** Shared presentation leaves routing, permissions and resource ownership to the host. */
export function navigationButton(options: NavigationButtonOptions): HTMLButtonElement {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'ui-nav-button';
    button.innerHTML = options.icon; button.title = options.label; button.setAttribute('aria-label', options.label);
    if (options.popup) button.setAttribute('aria-haspopup', options.popup);
    button.onclick = () => options.run(button); return button;
}

export function navigationItem(element: HTMLElement): void {element.classList.add('ui-nav-item');}
