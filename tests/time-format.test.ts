import {afterEach,expect,it,vi} from 'vitest';
import {formatDateTime,formatClockTime,formatCalendarDate,localDateTimeInput,parseLocalDateTimeInput,getDisplayTimeZone} from '../src/time-format';
afterEach(()=>vi.unstubAllEnvs());
it('keeps calendar dates separate from instants and renders invalid or unzoned instants without guessing',()=>{
    vi.stubEnv('TZ','America/New_York');
    expect(formatDateTime('2026-11-11')).toBe('—');expect(formatDateTime('not-a-time')).toBe('—');
    expect(formatDateTime(new Date(NaN))).toBe('—');
    expect(formatCalendarDate('2026-11-11','en-GB')).toBe('11/11/2026');
});
it.each([['UTC','00:30','GMT'],['Asia/Shanghai','08:30','GMT+8'],['America/New_York','19:30','GMT-5']])('displays one UTC instant in browser zone %s with its actual offset',(zone,clock,offset)=>{
    vi.stubEnv('TZ',zone);const instant='2026-11-11T00:30:00.000Z';
    expect(getDisplayTimeZone()).toBe(zone);
    const display=formatDateTime(instant,'en-GB');expect(display).toContain(clock);expect(display).toContain(offset);
    expect(new Date(instant).toISOString()).toBe(instant);
    expect(formatDateTime(instant,'en-GB',{hour12:false})).toContain(clock);
    expect(formatClockTime(instant,'en-GB',{hour:'2-digit',minute:'2-digit'})).toContain(offset);
});
it('round trips local form controls to UTC milliseconds and rejects invalid/ambiguous DST input',()=>{
    vi.stubEnv('TZ','Asia/Shanghai');const value=Date.parse('2026-11-11T00:30:00Z');
    expect(localDateTimeInput(value)).toBe('2026-11-11T08:30');expect(parseLocalDateTimeInput('2026-11-11T08:30')).toBe(value);
    expect(()=>parseLocalDateTimeInput('2026-02-30T10:00')).toThrow('TIME_LOCAL_INVALID');
    vi.stubEnv('TZ','America/New_York');
    expect(()=>parseLocalDateTimeInput('2026-03-08T02:30')).toThrow('TIME_LOCAL_NONEXISTENT');
    expect(()=>parseLocalDateTimeInput('2026-11-01T01:30')).toThrow('TIME_LOCAL_AMBIGUOUS');
    expect(formatDateTime('2026-07-01T00:00:00Z','en-GB')).toContain('GMT-4');
});
