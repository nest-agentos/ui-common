import {outlineErrorCode, OutlineView, type OutlineOptions, type OutlineItem} from './outline';
let sequence = 0;
/** A bounded popup shared by hosts; loading never outlives the owning lease. */
export function mountOutlinePopup(trigger: HTMLButtonElement, options: OutlineOptions & {
    read(): readonly OutlineItem[] | Promise<readonly OutlineItem[]>; errorLabel: string;
}): () => void {
    const panel = document.createElement('section'), status = document.createElement('p'), lifetime = new AbortController();
    const view = new OutlineView(options); panel.className = 'ui-outline-popup'; panel.hidden = true;
    panel.id = `ui-outline-popup-${++sequence}`; panel.setAttribute('aria-label', options.label); status.setAttribute('role', 'status');
    trigger.setAttribute('aria-controls', panel.id); trigger.setAttribute('aria-expanded', 'false');
    panel.append(view.element, status); trigger.after(panel); let generation = 0;
    const close = () => {generation++; panel.hidden = true; trigger.setAttribute('aria-expanded', 'false');};
    const open = async () => {
        const current = ++generation, started = performance.now(); panel.hidden = false; status.textContent = ''; trigger.setAttribute('aria-expanded', 'true');
        const rect = trigger.getBoundingClientRect(); panel.style.top = `${rect.bottom + 4}px`; panel.style.right = `${Math.max(8, innerWidth - rect.right)}px`;
        try {
            const items = await options.read(); if (current !== generation || lifetime.signal.aborted) return;
            view.update(items); (view.element.querySelector('button') ?? trigger).focus();
            report('success', 'OK', started, current, items.length);
        } catch (error) {
            if (current !== generation || lifetime.signal.aborted) return;
            view.update([]); status.textContent = options.errorLabel; report('failure', outlineErrorCode(error, 'OUTLINE_READ_FAILED'), started, current);
        }
    };
    const report = (result: 'success' | 'failure', code: string, started: number, current: number, count?: number) => {
        try {options.onDiagnostic?.({operationId: `${panel.id}-${current}`, operation: 'outline', stage: 'read', result, code, durationMs: performance.now() - started, count});} catch {/* Diagnostics are observational. */}
    };
    trigger.addEventListener('click', () => {if (panel.hidden) void open(); else close();}, {signal: lifetime.signal});
    document.addEventListener('pointerdown', event => {if (!panel.contains(event.target as Node) && !trigger.contains(event.target as Node)) close();}, {signal: lifetime.signal});
    panel.addEventListener('keydown', event => {if (event.key === 'Escape') {event.preventDefault(); event.stopPropagation(); close(); trigger.focus();}}, {signal: lifetime.signal});
    return () => {close(); lifetime.abort(); view.destroy(); panel.remove(); trigger.removeAttribute('aria-controls'); trigger.removeAttribute('aria-expanded');};
}
