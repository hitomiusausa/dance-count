import { Fragment } from 'preact';
import type { AppTranslator, MessageKey } from './index.ts';
import JA_PHRASES from './ja-phrases.json' with { type: 'json' };
import { APP_MESSAGES } from './messages.ts';
import { phraseParts } from './phrase-parts.ts';

const PHRASES: Record<string, readonly string[] | undefined> = JA_PHRASES;

// 段8（Ruling 97）: 本文の文を句の境で折る（日本語）。textContent は translator.t() と同じ（<wbr> は文字を足さない）。
// 使うのは本文だけ（p.dc-body・ol.dc-steps li・.dc-hint・.dc-alert-text・.dc-result・S13 の段落 など）。見出し・ボタン・チップ・行の名前には使わない。
// 包みの .dc-phrased が word-break: keep-all（句の境だけで折る）・overflow-wrap: anywhere（入らない長い名前の安全弁）を持つ。
export function PhrasedText({ template, phraseKey, locale, variables }: {
  template: string; phraseKey: string; locale: string; variables?: Record<string, string | number>;
}) {
  const parts = phraseParts(template, locale === 'ja-JP' ? PHRASES[phraseKey] : undefined, variables);
  return (
    <span class="dc-phrased">
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part.breakBefore && <wbr />}
          {part.label ? <span class="dc-nowrap">{part.text}</span> : part.free ? <span class="dc-free">{part.text}</span> : part.text}
        </Fragment>
      ))}
    </span>
  );
}

export function phrased(translator: AppTranslator, key: MessageKey, variables?: Record<string, string | number>) {
  const template = (APP_MESSAGES[translator.locale] as Record<string, string>)[key] ?? APP_MESSAGES.en[key];
  return <PhrasedText template={template} phraseKey={key} locale={translator.locale} variables={variables} />;
}
