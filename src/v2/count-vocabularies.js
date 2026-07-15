import { canonicalLanguageTag } from './localization.js';

export const COUNT_VOCABULARIES = Object.freeze({
  en: vocabulary('en', 'en', { en: 'English counts', 'ja-JP': '英語カウント' }, {
    slow: ['Slow', 'Slow'], quick: ['Quick', 'Quick'], one: ['One', '1'], two: ['Two', '2'],
    three: ['Three', '3'], four: ['Four', '4'], five: ['Five', '5'], six: ['Six', '6'],
    seven: ['Seven', '7'], eight: ['Eight', '8'], and: ['And', '&'], ah: ['a', 'a']
  }),
  'ja-JP': vocabulary('ja-JP', 'ja-JP', { en: 'Japanese counts', 'ja-JP': '日本語カウント' }, {
    slow: ['スロー', 'Slow'], quick: ['クイック', 'Quick'], one: ['いち', '1'], two: ['に', '2'],
    three: ['さん', '3'], four: ['よん', '「し」でも可 / “shi” is also used'], five: ['ご', '5'], six: ['ろく', '6'],
    seven: ['なな', '「しち」でも可 / “shichi” is also used'], eight: ['はち', '8'], and: ['アンド', '&'], ah: ['ア', 'a']
  })
});

export function getCountVocabulary(idOrLocale = 'en') {
  const canonical = canonicalLanguageTag(idOrLocale);
  const base = canonical.split('-')[0];
  return COUNT_VOCABULARIES[idOrLocale]
    ?? COUNT_VOCABULARIES[canonical]
    ?? COUNT_VOCABULARIES[base]
    ?? Object.values(COUNT_VOCABULARIES).find(item => item.locale.split('-')[0] === base)
    ?? COUNT_VOCABULARIES.en;
}

export function vocabularyDisplayName(vocabulary, uiLocale = 'en') {
  const canonical = canonicalLanguageTag(uiLocale);
  return vocabulary.names[canonical] ?? vocabulary.names[canonical.split('-')[0]] ?? vocabulary.names.en;
}

function vocabulary(id, locale, names, prompts) {
  return Object.freeze({ id, locale, names: Object.freeze(names), prompts: Object.freeze(prompts) });
}
