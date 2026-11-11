type Instant=Date|number|string;
const formatters=new Map<string,Intl.DateTimeFormat>();

/** Display follows this browser's IANA zone; absolute wire values remain UTC. */
export function getDisplayTimeZone():string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
function formatter(locale:string|string[]|undefined,options:Intl.DateTimeFormatOptions):Intl.DateTimeFormat {
    const resolved={...options,timeZone:getDisplayTimeZone()},language=locale,key=JSON.stringify([language,resolved]);
    let value=formatters.get(key);
    if(!value){value=new Intl.DateTimeFormat(language,resolved);if(formatters.size>=64)formatters.clear();formatters.set(key,value);}
    return value;
}
function date(value:Instant):Date|undefined {
    if(typeof value==='string'&&!/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value))return;
    const result=value instanceof Date?value:new Date(value);
    return Number.isFinite(result.getTime())?result:undefined;
}
function localTimeError(code:string):RangeError&{code:string} {return Object.assign(new RangeError(code),{code});}
function display(value:Instant,locale:string|string[]|undefined,options:Intl.DateTimeFormatOptions):string {
    const at=date(value),styled=options.dateStyle!==undefined||options.timeStyle!==undefined;
    if(!at)return '—';
    const text=formatter(locale,styled?options:{...options,timeZoneName:'shortOffset'}).format(at);
    if(!styled)return text;
    const zone=formatter(locale,{timeZoneName:'shortOffset'}).formatToParts(at).find(part=>part.type==='timeZoneName')!.value;
    return text+' '+zone;
}
export function formatDateTime(value:Instant,locale?:string|string[],options?:Intl.DateTimeFormatOptions):string {
    const defaults:Intl.DateTimeFormatOptions={year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'};
    return display(value,locale,hasFields(options)?options!:{...defaults,...options});
}
export function formatClockTime(value:Instant,locale?:string|string[],options?:Intl.DateTimeFormatOptions):string {
    return display(value,locale,hasFields(options)?options!:{hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',...options});
}
function hasFields(options?:Intl.DateTimeFormatOptions):boolean {
    return !!options&&['year','month','day','weekday','hour','minute','second','dateStyle','timeStyle'].some(key=>key in options);
}
/** Calendar labels have no instant/offset suffix; their day is still resolved in the host zone. */
export function formatCalendarDate(value:Instant,locale?:string|string[],options?:Intl.DateTimeFormatOptions):string {
    const at=typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?new Date(value+'T12:00:00'):date(value);
    return at&&Number.isFinite(at.getTime())?formatter(locale,options??{year:'numeric',month:'2-digit',day:'2-digit'}).format(at):'—';
}
/** Local form controls use the same zone as their visible timestamps. */
export function localDateTimeInput(value:Instant):string {
    const at=date(value);if(!at)throw localTimeError('TIME_LOCAL_INVALID');
    const parts=formatter('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(at);
    const get=(type:string)=>parts.find(part=>part.type===type)!.value;
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
/** Reject missing and ambiguous DST wall times instead of silently choosing a different instant. */
export function parseLocalDateTimeInput(value:string):number {
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw localTimeError('TIME_LOCAL_INVALID');
    const wall=Date.parse(value+':00Z');
    if(!Number.isFinite(wall)||new Date(wall).toISOString().slice(0,16)!==value)throw localTimeError('TIME_LOCAL_INVALID');
    const offsets=new Set<number>();
    for(let hours=-36;hours<=36;hours+=6){
        const instant=wall+hours*3600000;
        offsets.add(Date.parse(localDateTimeInput(instant)+':00Z')-instant);
    }
    const matches=[...offsets].map(offset=>wall-offset).filter(instant=>localDateTimeInput(instant)===value);
    if(matches.length!==1)throw localTimeError(matches.length?'TIME_LOCAL_AMBIGUOUS':'TIME_LOCAL_NONEXISTENT');
    return matches[0];
}
