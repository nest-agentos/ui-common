/** Domain-neutral navigation data; labels never serve as target identity. */
export interface OutlineItem {readonly id: string; readonly label: string; readonly level?: number}
export interface OutlineDiagnostic {operationId: string; operation: 'outline'; stage: 'read' | 'navigate'; result: 'success' | 'failure'; code: string; durationMs: number; count?: number}
export interface OutlineOptions {
    label: string; emptyLabel: string; expandLabel: string; collapseLabel: string;
    errorLabel?: string;
    select(id: string): void | Promise<void>;
    onDiagnostic?(event: OutlineDiagnostic): void;
}
const safeCodes = new Set(['OUTLINE_DUPLICATE_ID', 'OUTLINE_UNNAMED_TARGET', 'OUTLINE_TARGET_DETACHED', 'OUTLINE_TARGET_MISSING', 'OUTLINE_RENDER_TARGET_UNAVAILABLE', 'OUTLINE_SOURCE_TARGET_MISSING']);
export function outlineErrorCode(error: unknown, fallback: string): string {return error instanceof Error && safeCodes.has(error.message) ? error.message : fallback;}
let sequence = 0;
/** Shared list, disclosure and keyboard behavior for document and window indexes. */
export class OutlineView {
    readonly element = document.createElement('nav');
    private readonly status = document.createElement('p');
    private readonly abort = new AbortController();
    private readonly expanded = new Set<string>();
    private closed = false;
    private operation = 0;
    private readonly identity = `outline-${++sequence}`;
    constructor(private readonly options: OutlineOptions) {
        this.status.setAttribute('role', 'status'); this.status.className = 'ui-outline__status';
        this.element.className = 'ui-outline'; this.element.setAttribute('aria-label', options.label);
        this.element.addEventListener('keydown', event => this.keydown(event), {signal: this.abort.signal});
    }
    update(items: readonly OutlineItem[]): void {
        if (this.closed) return;
        if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('OUTLINE_DUPLICATE_ID');
        const focused = (document.activeElement as HTMLElement)?.dataset.outlineId, top = this.element.scrollTop;
        const retained = new Set(items.map(item => item.id));
        for (const id of this.expanded) if (!retained.has(id)) this.expanded.delete(id);
        this.status.textContent = ''; this.element.replaceChildren(this.status);
        const stack: {level: number; children: HTMLElement}[] = [{level: 0, children: this.element}];
        for (const item of items) {
            const level = item.level ?? 1;
            while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
            const row = this.row(item); stack[stack.length - 1].children.append(row.element);
            stack.push({level, children: row.children});
        }
        this.element.querySelectorAll<HTMLElement>('.ui-outline__item').forEach(row => this.disclosure(row));
        if (!items.length) {const empty = document.createElement('p'); empty.textContent = this.options.emptyLabel; this.element.append(empty);}
        if (focused) this.buttons().find(button => button.dataset.outlineId === focused)?.focus({preventScroll: true});
        this.element.scrollTop = top;
    }
    private row(item: OutlineItem): {element: HTMLElement; children: HTMLElement} {
        const element = document.createElement('div'), line = document.createElement('div'), children = document.createElement('div');
        element.className = 'ui-outline__item'; element.dataset.level = String(item.level ?? 1); element.dataset.outlineKey = item.id;
        line.className = 'ui-outline__row'; children.className = 'ui-outline__children';
        const button = document.createElement('button'); button.type = 'button'; button.className = 'ui-outline__link';
        button.textContent = item.label; button.dataset.outlineId = item.id;
        button.onclick = () => {void this.select(item.id);}; line.append(button); element.append(line, children);
        return {element, children};
    }
    private disclosure(row: HTMLElement): void {
        const children = row.lastElementChild as HTMLElement;
        if (!children.childElementCount || Number(row.dataset.level) < 2) return;
        const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'ui-outline__toggle'; toggle.textContent = '›';
        children.id = `${this.identity}-children-${++this.operation}`; toggle.setAttribute('aria-controls', children.id);
        const apply = (open: boolean) => {children.hidden = !open; toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? this.options.collapseLabel : this.options.expandLabel);};
        apply(this.expanded.has(row.dataset.outlineKey!));
        toggle.onclick = () => {const open = children.hidden; this.setExpanded(row, open);};
        row.firstElementChild!.append(toggle);
        row.onpointerenter = event => {if (event.pointerType === 'mouse' && window.matchMedia?.('(hover: hover)').matches) this.setExpanded(row, true);};
        row.onpointerleave = event => {if (event.pointerType === 'mouse' && !row.contains(document.activeElement)) this.setExpanded(row, false);};
    }
    private setExpanded(row: HTMLElement, open: boolean): void {
        const toggle = row.firstElementChild?.querySelector<HTMLButtonElement>('.ui-outline__toggle'); if (!toggle) return;
        (row.lastElementChild as HTMLElement).hidden = !open; toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? this.options.collapseLabel : this.options.expandLabel);
        if (open) this.expanded.add(row.dataset.outlineKey!); else this.expanded.delete(row.dataset.outlineKey!);
    }
    private buttons(): HTMLButtonElement[] {
        return [...this.element.querySelectorAll<HTMLButtonElement>('button')].filter(button => !button.closest('[hidden]'));
    }
    private keydown(event: KeyboardEvent): void {
        const target = event.target as HTMLElement, row = target.closest<HTMLElement>('.ui-outline__item');
        if (!row || event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault(); this.expandByKey(row, event.key); return;
        }
        const buttons = this.buttons(), index = buttons.indexOf(target as HTMLButtonElement);
        const next = navigationIndex(event.key, index, buttons.length);
        if (next >= 0) {event.preventDefault(); event.stopPropagation(); buttons[next]?.focus(); buttons[next]?.scrollIntoView?.({block: 'nearest'});}
    }
    private expandByKey(row: HTMLElement, key: string): void {
        const owner = row.firstElementChild?.querySelector('.ui-outline__toggle') ? row : row.parentElement?.closest<HTMLElement>('.ui-outline__item');
        if (!owner) return;
        this.setExpanded(owner, key === 'ArrowRight');
        if (owner !== row) owner.querySelector<HTMLButtonElement>('[data-outline-id]')?.focus();
    }

    private async select(id: string): Promise<void> {
        if (this.closed) return;
        const started = performance.now(), operationId = `${this.identity}-${++this.operation}`;
        try {await this.options.select(id); if (this.closed) return; this.status.textContent = ''; this.diagnostic({operationId, operation: 'outline', stage: 'navigate', result: 'success', code: 'OK', durationMs: performance.now() - started});}
        catch (error) {if (this.closed) return; this.status.textContent = this.options.errorLabel ?? ''; this.diagnostic({operationId, operation: 'outline', stage: 'navigate', result: 'failure', code: outlineErrorCode(error, 'OUTLINE_TARGET_UNAVAILABLE'), durationMs: performance.now() - started});}
    }
    private diagnostic(event: OutlineDiagnostic): void {try {this.options.onDiagnostic?.(event);} catch {/* Diagnostics cannot break navigation. */}}
    destroy(): void {if (this.closed) return; this.closed = true; this.abort.abort(); this.expanded.clear(); this.element.replaceChildren(); this.element.remove();}
}

function navigationIndex(key: string, index: number, count: number): number {
    if (key === 'Home') return 0;
    if (key === 'End') return count - 1;
    if (key === 'ArrowDown') return Math.min(count - 1, index + 1);
    if (key === 'ArrowUp') return Math.max(0, index - 1);
    return -1;
}

/** Registry owns only current leases; replacing a lease cannot invalidate its successor. */
export class WindowOutline {
    private readonly entries = new Map<string, {name: () => string | undefined; reveal: () => HTMLElement | null}>();
    register(id: string, name: () => string | undefined, reveal: () => HTMLElement | null): () => void {
        const entry = {name, reveal}; this.entries.set(id, entry);
        return () => {if (this.entries.get(id) === entry) this.entries.delete(id);};
    }
    items(): OutlineItem[] {return [...this.entries].flatMap(([id, entry]) => {const label = entry.name(); return label?.trim() ? [{id, label}] : [];});}
    reveal(id: string): HTMLElement {
        const entry = this.entries.get(id);
        if (!entry) throw new Error('OUTLINE_TARGET_MISSING');
        if (!entry.name()?.trim()) throw new Error('OUTLINE_UNNAMED_TARGET');
        const element = entry.reveal(); if (!element) throw new Error('OUTLINE_TARGET_MISSING');
        if (!element.isConnected) throw new Error('OUTLINE_TARGET_DETACHED');
        element.scrollIntoView?.({block: 'start'}); element.tabIndex = -1; element.focus({preventScroll: true}); return element;
    }
    clear(): void {this.entries.clear();}
}
