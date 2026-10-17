'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
import {defaultTimeZone,validTimeZone} from '@/lib/display-time';
type Theme = 'light' | 'dark';
type NavigationUser = { role: string; status: string; time_zone?:string } | null;
type Appearance = { locale: Locale; theme: Theme; timeZone:string;setTimeZone(value:string):void;navigationUser: NavigationUser; setNavigationUser(value: NavigationUser): void; setLocale(value: Locale): void; setTheme(value: Theme): void };
const Context = createContext<Appearance | null>(null);
const DisplayZone=createContext<string|null>(null);

export default function AppearanceProvider({ locale: initialLocale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();
  const [locale, setLocale] = useState(initialLocale), [theme, setTheme] = useState<Theme>('light'), [ready, setReady] = useState(false);
  const [navigationUser, setNavigationUser] = useState<NavigationUser>(null);
  const [timeZone,setTimeZone]=useState(defaultTimeZone);
  useEffect(()=>{if(navigationUser?.time_zone&&validTimeZone(navigationUser.time_zone))setTimeZone(navigationUser.time_zone)},[navigationUser?.time_zone]);
  useEffect(() => {
    try {
      const explicit = new URL(location.href).searchParams.get('locale');
      const preferred = explicit === 'fr' ? 'fr' : explicit === 'en' ? 'en' : localStorage.getItem('locale') === 'fr' ? 'fr' : initialLocale;
      setLocale(preferred);
      if (preferred !== initialLocale) {
        const url = new URL(location.href);
        url.searchParams.set('locale', preferred);
        router.replace(url.pathname + url.search + url.hash, { scroll: false });
      }
      setTheme(localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');
      const zone=localStorage.getItem('display_time_zone');if(zone&&validTimeZone(zone))setTimeZone(zone);
    } catch { /* Browser preference persistence is optional. */ }
    setReady(true);
    const changed = (event: StorageEvent) => {
      if (event.key === 'locale') setLocale(event.newValue === 'fr' ? 'fr' : 'en');
      if(event.key==='display_time_zone')setTimeZone(event.newValue&&validTimeZone(event.newValue)?event.newValue:defaultTimeZone);
      if (event.key === 'theme') setTheme(event.newValue === 'dark' ? 'dark' : 'light');
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [initialLocale, router]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    if (ready) try { localStorage.setItem('locale', locale); localStorage.setItem('theme', theme);localStorage.setItem('display_time_zone',timeZone); } catch { /* Optional. */ }
  }, [locale, theme,timeZone, ready]);
  const changeLocale = (value: Locale) => {
    setLocale(value);
    const url = new URL(location.href);
    if (value === 'fr') url.searchParams.set('locale', 'fr');
    else url.searchParams.delete('locale');
    router.replace(url.pathname + url.search + url.hash, { scroll: false });
  };
  return <Context.Provider value={{ locale, theme,timeZone,setTimeZone, setLocale: changeLocale, setTheme, navigationUser, setNavigationUser }}>{children}</Context.Provider>;
}

export function useAppearance() {
  const value = useContext(Context);
  if (!value) throw new Error('AppearanceProvider is required');
  return value;
}

export function DisplayTimeZoneProvider({zone,children}:{zone:string;children:ReactNode}){return <DisplayZone.Provider value={validTimeZone(zone)?zone:defaultTimeZone}>{children}</DisplayZone.Provider>}
export function useDisplayTimeZone(){const override=useContext(DisplayZone),{timeZone}=useAppearance();return override??timeZone;}

export function useNavigationIdentity(user: { role: string; status: string;time_zone?:string } | null | undefined) {
  const { setNavigationUser } = useAppearance();
  const role = user?.role, status = user?.status,timeZone=user?.time_zone;
  useEffect(() => {
    setNavigationUser(role && status ? { role, status,time_zone:timeZone } : null);
    return () => setNavigationUser(null);
  }, [role, status,timeZone, setNavigationUser]);
}
