'use client';
import {useState} from 'react';
import {errorMessage} from '@/lib/error-messages';
import type {Locale} from '@/lib/i18n';

/** Keep exceptions ephemeral and translate them using the current language. */
export function useLocalizedNotice(locale:Locale){
 const [value,setValue]=useState<string|{error:unknown}|{copy:Record<Locale,string>}>('');
 return [typeof value==='string'?value:'error'in value?errorMessage(value.error,locale):value.copy[locale],setValue] as const;
}
