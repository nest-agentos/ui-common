import {formatDateTime} from './time-format';
/** Keep visible dates and machine-readable timestamps consistent across views. */
export function setTimePresentation(element: HTMLTimeElement, value: number | null | undefined, fallback: string, locale?: string | string[]): void {
    const date = typeof value === 'number' && value > 0 ? new Date(value) : undefined;
    if (!date || !Number.isFinite(date.getTime())) {
        element.textContent = fallback;
        element.removeAttribute('datetime'); element.removeAttribute('title');
        return;
    }
    element.textContent = formatDateTime(date,locale);
    element.dateTime = date.toISOString(); element.title = element.textContent;
}
