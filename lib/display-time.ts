import type {Locale} from './i18n';
export const defaultTimeZone='Africa/Lagos';
export function validTimeZone(value:string){try{new Intl.DateTimeFormat('en',{timeZone:value});return value.length<=100;}catch{return false;}}
function stamp(value:string|number|Date){const date=value instanceof Date?value:new Date(value);return Number.isFinite(date.getTime())?date:null;}
export function formatDisplayDate(value:string|number|Date,locale:Locale,timeZone=defaultTimeZone){const date=stamp(value);return date?new Intl.DateTimeFormat(locale,{timeZone:validTimeZone(timeZone)?timeZone:defaultTimeZone,dateStyle:'medium',timeStyle:'long'}).format(date):'—';}
export function formatDisplayTime(value:string|number|Date,locale:Locale,timeZone=defaultTimeZone){const date=stamp(value);return date?new Intl.DateTimeFormat(locale,{timeZone:validTimeZone(timeZone)?timeZone:defaultTimeZone,timeStyle:'long'}).format(date):'—';}
