import {expect, it} from 'vitest';
it('can be imported without DOM globals', async () => {
    expect(typeof document).toBe('undefined');
    const ui = await import('../src'); expect(ui.MOBILE_NAVIGATION_QUERY).toBe('(max-width: 768px)');
});
