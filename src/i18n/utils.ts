import es from './es.json';
import en from './en.json';

const translations = { es, en };

export function useTranslations(lang: 'es' | 'en') {
  return function t(key: keyof typeof es) {
    return translations[lang][key] || translations['es'][key] || key;
  };
}

export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split('/');
  if (lang === 'en') return 'en';
  return 'es';
}