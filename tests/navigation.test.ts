// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest';
import {contentTitleBar, mountTitleBar, MOBILE_NAVIGATION_QUERY, navigationButton} from '../src';

afterEach(() => {vi.unstubAllGlobals(); document.body.replaceChildren();});
function viewport() {
    let matches = true; const listeners = new Set<() => void>();
    vi.stubGlobal('matchMedia', vi.fn(() => ({get matches() {return matches;},
        addEventListener: (_name: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_name: string, listener: () => void) => listeners.delete(listener)})));
    return {listeners, resize(value: boolean) {matches = value; for (const listener of [...listeners]) listener();}};
}
it('moves the original secondary controls into More on mobile without losing handlers, disabled state or editable title', () => {
    const media = viewport(), title = document.createElement('input'), menu = document.createElement('details');
    const menuBody = document.createElement('div'); menu.append(menuBody);
    const run = vi.fn(), action = navigationButton({icon: '', label: 'Action', run}); action.disabled = true;
    const view = contentTitleBar({title, contextEmbedded: true, actions: [action], menu, menuBody}); document.body.append(view.element);
    title.value = 'Unsaved draft'; view.update({title: 'Other title', context: 'Project'});
    expect(title.value).toBe('Unsaved draft'); expect(menuBody.contains(action)).toBe(true); expect(action.disabled).toBe(true);
    media.resize(false); expect(view.actions.contains(action)).toBe(true); action.disabled = false; action.click(); expect(run).toHaveBeenCalledOnce();
    expect(view.element.querySelector('.ui-content-titlebar__context')?.textContent).toBe('');
    view.destroy(); expect(media.listeners.size).toBe(0); expect(window.matchMedia).toHaveBeenCalledWith(MOBILE_NAVIGATION_QUERY);
});
it('separates editable and dirty presentation and hides redundant or absent context', () => {
    const view = contentTitleBar({statePresentation: {dirtyLabel: 'Unsaved'}});
    view.update({title: 'Project · Conversation', context: 'Project', editable: true});
    const context = view.element.querySelector<HTMLElement>('.ui-content-titlebar__context')!;
    const state = view.element.querySelector<HTMLElement>('.ui-content-titlebar__state')!;
    expect(context.hidden).toBe(true); expect(state.hidden).toBe(true); expect(state.querySelector('svg')).toBeNull();
    view.update({title: 'Conversation', context: 'Project', dirty: true});
    expect(context.hidden).toBe(false); expect(state.dataset.state).toBe('dirty'); expect(state.getAttribute('aria-label')).toBe('Unsaved');
    view.update({title: 'Conversation'}); expect(context.hidden).toBe(true); expect(state.hidden).toBe(true); view.destroy();
});
it('hands ownership to a new mount before delayed cleanup and restores original control order', () => {
    const media = viewport(), root = document.createElement('header'); document.body.append(root);
    const title = document.createElement('input'), menu = document.createElement('details'), body = document.createElement('div');
    const click = vi.fn(), action = navigationButton({icon: '', label: 'Action', run: click}); menu.append(body); root.append(title, action, menu);
    const first = mountTitleBar(root, {title, actions: [action], menu, menuBody: body}); title.value = 'Keep draft';
    const second = mountTitleBar(root, {title, actions: [action], menu, menuBody: body}); first.destroy(); first.update({title: 'Retired'});
    expect(root.querySelectorAll('.ui-content-titlebar')).toHaveLength(1); expect(title.value).toBe('Keep draft');
    action.click(); expect(click).toHaveBeenCalledOnce(); second.destroy(); second.destroy();
    expect([...root.children]).toEqual([title, action, menu]); expect(media.listeners.size).toBe(0);
});
