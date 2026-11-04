interface IRegularMenuItem<TItem extends object = Record<string, unknown>> {
    id: string;
    label: string;
    iconHTML?: string; iconOnly?: boolean;
    disabled?: boolean;
    danger?: boolean;
    type?: 'item';
    hidden?: (item: TItem) => boolean;
    /** Custom click handler. When provided, bypasses the command-bus dispatch. */
    onClick?: (item: TItem) => void | Promise<void>;
}

// Separators do not carry an action.
interface ISeparatorMenuItem {
    type: 'separator';
}

// Menu entries are a discriminated union.
export type MenuItem<TItem extends object = Record<string, unknown>> =
    | IRegularMenuItem<TItem>
    | ISeparatorMenuItem;

export type ContextMenuBuilder<TItem extends object = Record<string, unknown>> = (
    item: TItem,
    defaultItems: MenuItem<TItem>[],
) => MenuItem<TItem>[];

export interface ContextMenuConfig<TItem extends object = Record<string, unknown>> {
    /** Present individually resolved resources consistently with list projections. */
    mapItem?(item: TItem): TItem;
    items?: ContextMenuBuilder<TItem>;
    bulkItems?: (items: TItem[], defaults: MenuItem<TItem>[]) => MenuItem<TItem>[];
}

