import type {ContentTitleBarParts} from './content-titlebar';
export type SettingsTranslate = (key: string, params?: Record<string, string | number>) => string;
export interface SettingsPresentation {t: SettingsTranslate; escapeAttr(value: string): string; entityIcon: string; iconChoices?: readonly string[]; operationId?(): string}
export interface SettingsResourcePort {rename(name: string): Promise<unknown>; updateMetadata(changes: Record<string, unknown>): Promise<unknown>}
export interface SettingsHostContext {toggleSidebar?(collapsed?: boolean): void; saveContent?(id: string, content: string): Promise<void>}
export interface SettingsEditorOptions {
    target?: {kind: 'file'; path: string} | {kind: 'entity'; entityType: 'agent'|'skill'|'flow'|'mcp'|'tool'|'provider'|'connection'|'system-prompt'; id: string} | {kind: 'session'; sessionId: string};
    title?: string; language?: string; readOnly?: boolean; signal?: AbortSignal; initialContent?: string;
    mountTitleBar?(container: HTMLElement, parts?: ContentTitleBarParts): () => void;
    mountCompactNavigation?(container: HTMLElement, label?: HTMLElement): () => void;
    mountWindowList?(container: HTMLElement): () => void;
    mountSettings?(container: HTMLElement): Promise<{flush(): Promise<void>; destroy(): Promise<void>; isDirty(): boolean}>;
    onStartConversation?(): Promise<void>;
    hostContext?: SettingsHostContext;
    resource?: SettingsResourcePort;
}
export interface Heading {level:number; text:string; id:string; children:Heading[]}
export type UnifiedSearchResult = {text: string; context: string} & ({source: 'editor'; details: {from: number; to: number}} | {source: 'renderer'; details: {element: HTMLElement}});
export interface CollapseExpandResult {affectedCount: number; allCollapsed: boolean}
export interface EditorEventMap {change: undefined; interactiveChange: undefined; ready: undefined; modeChanged: {mode: 'edit'|'render'}; blur: undefined; focus: undefined; optimisticUpdate: undefined; saved: undefined; saveError: unknown; contentLoaded: undefined; error: unknown; blocksCollapsed: CollapseExpandResult; blocksExpanded: CollapseExpandResult}
export type EditorEvent = keyof EditorEventMap;
export type EditorEventCallback<E extends EditorEvent = EditorEvent> = (payload: EditorEventMap[E]) => void;
export interface SettingsEditor {
    init(container: HTMLElement, content?: string): Promise<void>; destroy(): Promise<void>;
    getText(): string; setText(text: string): void; focus(): void;
    getMode(): 'edit'|'render'; switchToMode(mode: 'edit'|'render'): Promise<void>; setTitle(title: string): void; setReadOnly(value: boolean): void;
    isDirty(): boolean; setDirty(value: boolean): void; flushPendingSave(): Promise<void>; cancelPendingRender?(): void;
    captureRecovery?(): unknown; restoreRecovery?(state: unknown): void; suspendForRecovery?(): void;
    readonly commands: Readonly<Record<string, Function>>;
    getHeadings(): Promise<Heading[]>; getSearchableText(): Promise<string>; getSummary(): Promise<string|null>;
    navigateTo(target: {elementId: string}): Promise<void>; search(query: string): Promise<UnifiedSearchResult[]>; gotoMatch(result: UnifiedSearchResult): void; clearSearch(): void;
    collapseBlocks(): Promise<CollapseExpandResult>; expandBlocks(): Promise<CollapseExpandResult>; toggleBlocks(): Promise<CollapseExpandResult>; pruneAssets(): Promise<number|null>;
    on<E extends EditorEvent>(event: E, callback: EditorEventCallback<E>): () => void;
    render(): void|Promise<void>;
}
