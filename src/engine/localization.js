export const DEFAULT_UI_LOCALE = 'en';
export const SUPPORTED_UI_LOCALES = Object.freeze(['en', 'ja-JP']);

export function canonicalLanguageTag(value, fallback = DEFAULT_UI_LOCALE) {
  try {
    return Intl.getCanonicalLocales(String(value ?? ''))[0] ?? fallback;
  } catch {
    return fallback;
  }
}

export function isValidLanguageTag(value) {
  try {
    return Boolean(Intl.getCanonicalLocales(String(value ?? ''))[0]);
  } catch {
    return false;
  }
}

export function resolveUiLocale(requested, supported = SUPPORTED_UI_LOCALES) {
  const canonical = canonicalLanguageTag(requested);
  if (supported.includes(canonical)) return canonical;
  const base = canonical.split('-')[0];
  return supported.find(locale => locale.split('-')[0] === base) ?? DEFAULT_UI_LOCALE;
}

export function createTranslator(messages, requestedLocale, fallbackLocale = DEFAULT_UI_LOCALE) {
  const locale = resolveUiLocale(requestedLocale, Object.keys(messages));
  return {
    locale,
    t(key, variables = {}) {
      const template = messages[locale]?.[key] ?? messages[fallbackLocale]?.[key] ?? key;
      return String(template).replace(/\{(\w+)\}/g, (_, name) => variables[name] ?? `{${name}}`);
    }
  };
}
