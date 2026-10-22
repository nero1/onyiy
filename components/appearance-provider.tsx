'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
import {defaultTimeZone,validTimeZone} from '@/lib/display-time';
type Theme = 'light' | 'dark';
type NavigationUser = { id:string;locale:string;role: string; status: string; time_zone?:string } | null;
type Appearance = { locale: Locale; theme: Theme; timeZone:string;setTimeZone(value:string):void;navigationUser: NavigationUser; setNavigationUser(value: NavigationUser): void; setLocale(value: Locale): void; setTheme(value: Theme): void };
const Context = createContext<Appearance | null>(null);
const DisplayZone=createContext<string|null>(null);

export default function AppearanceProvider({ locale: initialLocale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();
  const [locale, setLocale] = useState(initialLocale), [theme, setTheme] = useState<Theme>('light'), [ready, setReady] = useState(false);
  const activeLocale=useRef(locale);activeLocale.current=locale;
  const [navigationUser, setNavigationUser] = useState<NavigationUser>(null);
  const [timeZone,setTimeZone]=useState(defaultTimeZone);
  const languageChoice=useRef({initialized:false,explicit:false,identity:null as string|null});
  useEffect(()=>{if(navigationUser?.time_zone&&validTimeZone(navigationUser.time_zone))setTimeZone(navigationUser.time_zone)},[navigationUser?.time_zone]);
  useEffect(() => {
    try {
      const explicit = new URL(location.href).searchParams.get('locale');
      if(!languageChoice.current.initialized){languageChoice.current.initialized=true;languageChoice.current.explicit=explicit==='en'||explicit==='fr';}
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
      if (event.key === 'locale'){
        const next=event.newValue==='fr'?'fr':'en';languageChoice.current.explicit=true;setLocale(next);
        const url=new URL(location.href);url.searchParams.set('locale',next);
        if(url.href!==location.href&&navigator.onLine)router.replace(url.pathname+url.search+url.hash,{scroll:false});
      }
      if(event.key==='display_time_zone')setTimeZone(event.newValue&&validTimeZone(event.newValue)?event.newValue:defaultTimeZone);
      if (event.key === 'theme') setTheme(event.newValue === 'dark' ? 'dark' : 'light');
    };
    window.addEventListener('storage', changed);
    const connected=()=>{const next=activeLocale.current;const url=new URL(location.href);url.searchParams.set('locale',next);router.replace(url.pathname+url.search+url.hash,{scroll:false});};
    window.addEventListener('online',connected);
    return () => {window.removeEventListener('storage', changed);window.removeEventListener('online',connected);};
  }, [initialLocale, router]);
  useEffect(()=>{
    if(!ready)return;
    if(!navigationUser){languageChoice.current.identity=null;return;}
    if(languageChoice.current.identity===navigationUser.id)return;
    languageChoice.current.identity=navigationUser.id;
    const saved=navigationUser.locale;
    if(languageChoice.current.explicit||saved!=='en'&&saved!=='fr')return;
    setLocale(saved);
    try{localStorage.setItem('locale',saved)}catch{/* Optional browser storage. */}
    const url=new URL(location.href);url.searchParams.set('locale',saved);
    if(url.href!==location.href){
      const target=url.pathname+url.search+url.hash;
      if(navigator.onLine)router.replace(target,{scroll:false});
      else window.history.replaceState(null,'',target);
    }
  },[ready,navigationUser?.id,navigationUser?.locale,router]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    if (ready) try { localStorage.setItem('locale', locale); localStorage.setItem('theme', theme);localStorage.setItem('display_time_zone',timeZone); } catch { /* Optional. */ }
  }, [locale, theme,timeZone, ready]);
  const changeLocale = (value: Locale) => {
    languageChoice.current.explicit=true;
    setLocale(value);
    try{localStorage.setItem('locale',value)}catch{/* Optional. */}
    const url = new URL(location.href);
    url.searchParams.set('locale',value);
    const target=url.pathname + url.search + url.hash;
    if(navigator.onLine)router.replace(target, { scroll: false });
    else window.history.replaceState(null,'',target);
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

export function useNavigationIdentity(user: NavigationUser | undefined) {
  const { setNavigationUser } = useAppearance();
  const id=user?.id,locale=user?.locale,role = user?.role, status = user?.status,timeZone=user?.time_zone;
  useEffect(() => {
    setNavigationUser(id&&locale&&role && status ? { id,locale,role, status,time_zone:timeZone } : null);
    return () => setNavigationUser(null);
  }, [id,locale,role, status,timeZone, setNavigationUser]);
}
