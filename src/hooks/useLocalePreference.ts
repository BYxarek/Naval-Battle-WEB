import { useAppStore } from '../store';

export function useLocalePreference() {
  const locale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);
  return { locale, setLocale };
}
