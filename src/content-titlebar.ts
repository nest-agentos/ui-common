import {MOBILE_NAVIGATION_QUERY} from './navigation';
const mounted = new WeakMap<HTMLElement, () => void>();

export interface ContentTitleBarParts {
    title?: HTMLElement;
    contextEmbedded?: boolean;
    back?: HTMLElement;
    status?: HTMLElement;
    /** Existing mode control supplied only by editors with distinct view/edit modes. */
    modeToggle?: HTMLElement;
    actions?: HTMLElement[];
    leading?: HTMLElement[];
    trailing?: HTMLElement[];
    menu?: HTMLElement;
    menuBody?: HTMLElement;
    editable?: boolean;
}
export interface ContentTitleBarOptions extends ContentTitleBarParts {
    statePresentation?: {dirtyLabel: string};
}
export interface ContentTitleBarState {title: string; context?: string; dirty?: boolean; editable?: boolean}

/** Own the layout only; supplied controls retain their DOM, focus and event bindings. */
export function contentTitleBar(options: ContentTitleBarOptions = {}) {
    const element = node('div', 'ui-content-titlebar'), identity = node('div', 'ui-content-titlebar__identity');
    const title = node('strong', 'ui-content-titlebar__title'), context = node('span', 'ui-content-titlebar__context');
    const indicator = node('span', 'ui-content-titlebar__state'), actions = node('div', 'ui-content-titlebar__actions');
    identity.append(...(options.modeToggle ? [options.modeToggle] : []), indicator, context, options.title ?? title);
    if (options.title) options.title.classList.add('ui-content-titlebar__custom-title');
    options.modeToggle?.classList.add('ui-content-titlebar__mode-toggle');
    actions.append(...(options.actions ?? []), ...(options.trailing ?? []), ...(options.menu ? [options.menu] : []));
    element.append(...(options.leading ?? []), ...(options.back ? [options.back] : []), ...(options.status ? [options.status] : []), identity, actions);
    const releaseOverflow = titleBarOverflow(options.actions ?? [], options.menuBody, actions);
    const releaseTitleFocus = editableTitleFocus(element, options);
    return {element, identity, actions, update(state: ContentTitleBarState) {
        title.textContent = state.title; title.title = state.title;
        if (options.title && !options.editable) options.title.title = state.title;
        context.textContent = options.contextEmbedded ? '' : state.context ?? ''; context.title = state.context ?? '';
        context.hidden = !!options.contextEmbedded || !state.context || state.title === state.context || state.title.startsWith(state.context + ' · ');
        indicator.hidden = !state.dirty; indicator.dataset.state = 'dirty';
        indicator.title = options.statePresentation?.dirtyLabel ?? '';
        indicator.setAttribute('aria-label', indicator.title);
    }, destroy() {releaseTitleFocus(); releaseOverflow(); options.title?.classList.remove('ui-content-titlebar__custom-title'); options.modeToggle?.classList.remove('ui-content-titlebar__mode-toggle'); element.remove();}};
}
function editableTitleFocus(element: HTMLElement, options: ContentTitleBarOptions): () => void {
    const title = options.title;
    if (!title || !options.editable) return () => {};
    const focus = () => {element.dataset.titleEditing = 'true';};
    const blur = () => {delete element.dataset.titleEditing;};
    title.addEventListener('focusin', focus); title.addEventListener('focusout', blur);
    return () => {title.removeEventListener('focusin', focus); title.removeEventListener('focusout', blur); blur();};
}
function titleBarOverflow(items: HTMLElement[], menu: HTMLElement | undefined, actions: HTMLElement): () => void {
    if (!menu || !items.length) return () => {};
    const media = window.matchMedia?.(MOBILE_NAVIGATION_QUERY);
    const update = () => {for (const item of [...items].reverse()) (media?.matches ? menu : actions).prepend(item);};
    media?.addEventListener?.('change', update); update();
    return () => media?.removeEventListener?.('change', update);
}
function node<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag); element.className = className; return element;
}

/** Restore adopted controls to their original slots before the owner disposes or remounts them. */
export function retainTitleBarNodes(nodes: HTMLElement[]): () => void {
    const anchors = [...new Set(nodes)].filter(node => node.parentNode).map(node => {
        const anchor = document.createComment('titlebar slot'); node.before(anchor); return {node, anchor};
    });
    return () => {for (const {node, anchor} of anchors) if (anchor.parentNode) anchor.replaceWith(node);};
}

/** Exclusively mount a title bar; delayed cleanup of an older lease is harmless. */
export function mountTitleBar(container: HTMLElement, options: ContentTitleBarOptions = {}) {
    mounted.get(container)?.();
    const nodes = [options.title, options.back, options.status, options.modeToggle, options.menu, ...(options.actions ?? []),
        ...(options.leading ?? []), ...(options.trailing ?? [])].filter((node): node is HTMLElement => !!node);
    const restore = retainTitleBarNodes(nodes), view = contentTitleBar(options);
    container.prepend(view.element); let closed = false;
    const destroy = () => {
        if (closed) return; closed = true; restore(); view.destroy();
        if (mounted.get(container) === destroy) mounted.delete(container);
    };
    mounted.set(container, destroy);
    return {...view, update(state: ContentTitleBarState) {if (!closed) view.update(state);}, destroy};
}
