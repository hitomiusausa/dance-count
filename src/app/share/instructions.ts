import { withExternalBrowser } from '../app-url.ts';
import type { AppTranslator } from '../i18n/index.ts';

// 生徒への案内文（仕様 §8 の定型文を段5の現実に合わせた物。Ruling 82-6）。文はすべて messages.ts（禁止語の検査が効く）。
// 最後の「アプリ:」の行は公開 URL が無い（開発中）なら出さない。URL には LINE の外で開かせる印を付ける（F26）。
export function studentInstructions(translator: AppTranslator, { hasVoice, appUrl }: { hasVoice: boolean; appUrl: string }): string {
  const lines = [
    translator.t(hasVoice ? 'instructionsVoiceLead' : 'instructionsRoutinesLead'),
    translator.t('instructionsIphone'),
    translator.t('instructionsStep2'),
    translator.t('instructionsStep3'),
    translator.t('instructionsAndroid'),
    translator.t('instructionsPhone')
  ];
  const url = appUrl ? withExternalBrowser(appUrl) : null;
  if (url) lines.push(translator.t('instructionsApp', { url }));
  return lines.join('\n');
}
