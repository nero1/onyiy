'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
type Theme = 'light' | 'dark';
type NavigationUser = { role: string; status: string } | null;
type Appearance = { locale: Locale; theme: Theme; navigationUser: NavigationUser; setNavigationUser(value: NavigationUser): void; setLocale(value: Locale): void; setTheme(value: Theme): void };
const Context = createContext<Appearance | null>(null);

export default function AppearanceProvider({ locale: initialLocale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();
  const [locale, setLocale] = useState(initialLocale), [theme, setTheme] = useState<Theme>('light'), [ready, setReady] = useState(false);
  const [navigationUser, setNavigationUser] = useState<NavigationUser>(null);
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
    } catch { /* Browser preference persistence is optional. */ }
    setReady(true);
    const changed = (event: StorageEvent) => {
      if (event.key === 'locale') setLocale(event.newValue === 'fr' ? 'fr' : 'en');
      if (event.key === 'theme') setTheme(event.newValue === 'dark' ? 'dark' : 'light');
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [initialLocale, router]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    if (ready) try { localStorage.setItem('locale', locale); localStorage.setItem('theme', theme); } catch { /* Optional. */ }
  }, [locale, theme, ready]);
  const changeLocale = (value: Locale) => {
    setLocale(value);
    const url = new URL(location.href);
    if (value === 'fr') url.searchParams.set('locale', 'fr');
    else url.searchParams.delete('locale');
    router.replace(url.pathname + url.search + url.hash, { scroll: false });
  };
  return <Context.Provider value={{ locale, theme, setLocale: changeLocale, setTheme, navigationUser, setNavigationUser }}>{children}</Context.Provider>;
}

export function useAppearance() {
  const value = useContext(Context);
  if (!value) throw new Error('AppearanceProvider is required');
  return value;
}

export function useNavigationIdentity(user: { role: string; status: string } | null | undefined) {
  const { setNavigationUser } = useAppearance();
  const role = user?.role, status = user?.status;
  useEffect(() => {
    setNavigationUser(role && status ? { role, status } : null);
    return () => setNavigationUser(null);
  }, [role, status, setNavigationUser]);
}
