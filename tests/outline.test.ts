// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest';
import {OutlineView, WindowOutline, mountOutlinePopup} from '../src';
const cleanups: (() => void)[] = [];
afterEach(() => {cleanups.splice(0).forEach(close => close()); document.body.replaceChildren(); vi.unstubAllGlobals();});
function fixture() {
    const select = vi.fn(), diagnostic = vi.fn();
    const view = new OutlineView({label: 'Contents', emptyLabel: 'Empty', expandLabel: 'Expand', collapseLabel: 'Collapse', errorLabel: 'Retry navigation', select, onDiagnostic: diagnostic});
    document.body.append(view.element); cleanups.push(() => view.destroy());
    view.update([{id: 'one', label: 'Duplicate', level: 1}, {id: 'two', label: 'Duplicate', level: 2}, {id: 'three', label: '<script>Private</script>', level: 3}]);
    return {view, select, diagnostic, button: (id: string) => view.element.querySelector<HTMLButtonElement>(`[data-outline-id="${id}"]`)!};
}
it('shares default H3 folding, explicit touch expansion and arrow navigation without interpreting names', async () => {
    const f = fixture(), child = f.button('three'), toggle = f.view.element.querySelector<HTMLButtonElement>('.ui-outline__toggle')!;
    expect(child.closest('[hidden]')).not.toBeNull(); expect(f.view.element.querySelector('script')).toBeNull();
    f.button('two').focus(); f.button('two').dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
    expect(child.closest('[hidden]')).toBeNull(); expect(toggle.getAttribute('aria-expanded')).toBe('true');
    child.click(); await Promise.resolve(); expect(f.select).toHaveBeenCalledWith('three');
    toggle.click(); expect(child.closest('[hidden]')).not.toBeNull();
    f.button('one').focus(); f.button('one').dispatchEvent(new KeyboardEvent('keydown', {key: 'End', bubbles: true}));
    expect(document.activeElement).toBe(toggle);
    expect(JSON.stringify(f.diagnostic.mock.calls)).not.toContain('Private');
});
it('expands H2 on desktop mouse hover, ignores touch hover and keeps disclosures after updates', () => {
    const f = fixture(); vi.stubGlobal('matchMedia', () => ({matches: true}));
    const row = f.button('two').closest<HTMLElement>('.ui-outline__item')!;
    const pointer = (type: string, pointerType: string) => {const event = new Event(type); Object.defineProperty(event, 'pointerType', {value: pointerType}); row.dispatchEvent(event);};
    pointer('pointerenter', 'touch'); expect(f.button('three').closest('[hidden]')).not.toBeNull();
    pointer('pointerenter', 'mouse'); expect(f.button('three').closest('[hidden]')).toBeNull();
    pointer('pointerleave', 'mouse'); expect(f.button('three').closest('[hidden]')).not.toBeNull();
});
it('keeps replacement leases, duplicate names and updated names separate from identity, then clears references', () => {
    const index = new WindowOutline(), first = document.createElement('div'), second = document.createElement('div'); document.body.append(first, second);
    let name = 'Same'; const old = index.register('a', () => name, () => first);
    index.register('a', () => name, () => second); old(); index.register('b', () => name, () => first);
    index.register('unnamed', () => undefined, () => first);
    expect(index.items().map(item => item.id)).toEqual(['a', 'b']); expect(index.reveal('a')).toBe(second);
    name = 'Changed'; expect(index.items()[0]).toEqual({id: 'a', label: 'Changed'});
    second.remove(); expect(() => index.reveal('a')).toThrow('OUTLINE_TARGET_DETACHED');
    expect(() => index.reveal('unnamed')).toThrow('OUTLINE_UNNAMED_TARGET'); index.clear(); expect(index.items()).toEqual([]);
});
it('discards late popup reads after cleanup and reports only classified failures', async () => {
    const trigger = document.createElement('button'); document.body.append(trigger); const diagnostic = vi.fn();
    let complete!: (value: []) => void;
    const close = mountOutlinePopup(trigger, {label: 'Contents', emptyLabel: 'Empty', expandLabel: 'Expand', collapseLabel: 'Collapse', errorLabel: 'Retry', select() {},
        read: () => new Promise<[]>(resolve => {complete = resolve;}), onDiagnostic: diagnostic});
    trigger.click(); close(); complete([]); await Promise.resolve(); expect(document.querySelector('.ui-outline-popup')).toBeNull(); expect(diagnostic).not.toHaveBeenCalled();
    const release = mountOutlinePopup(trigger, {label: 'Contents', emptyLabel: 'Empty', expandLabel: 'Expand', collapseLabel: 'Collapse', errorLabel: 'Retry', select() {},
        read: () => {throw new Error('Secret body');}, onDiagnostic: diagnostic}); cleanups.push(release);
    trigger.click(); await Promise.resolve(); expect(document.body.textContent).toContain('Retry'); expect(JSON.stringify(diagnostic.mock.calls)).not.toContain('Secret');
    expect(diagnostic.mock.calls[0][0].code).toBe('OUTLINE_READ_FAILED');
});
it('classifies unavailable targets without recording identifiers or labels', async () => {
    const diagnostic = vi.fn(), view = new OutlineView({label: 'Index', emptyLabel: 'Empty', expandLabel: 'Expand', collapseLabel: 'Collapse', errorLabel: 'Retry',
        select() {throw new Error('OUTLINE_TARGET_DETACHED');}, onDiagnostic: diagnostic}); cleanups.push(() => view.destroy()); document.body.append(view.element);
    view.update([{id: 'sensitive-id', label: 'Secret sender'}]); view.element.querySelector('button')!.click(); await Promise.resolve();
    expect(view.element.textContent).toContain('Retry'); expect(diagnostic.mock.calls[0][0].code).toBe('OUTLINE_TARGET_DETACHED');
    expect(JSON.stringify(diagnostic.mock.calls)).not.toMatch(/sensitive|Secret/);
});
