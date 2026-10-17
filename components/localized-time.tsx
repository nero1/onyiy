'use client';
import type {Locale} from '@/lib/i18n';
import {formatDisplayDate} from '@/lib/display-time';
import {useDisplayTimeZone} from './appearance-provider';
export default function LocalizedTime({value,locale}:{value:string;locale:Locale}){const zone=useDisplayTimeZone();return <time dateTime={value}>{formatDisplayDate(value,locale,zone)}</time>}
