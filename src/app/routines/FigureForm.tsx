import { DANCE_PROFILES } from '../../engine/dance-profiles.js';
import { Icon } from '../components/Icon.tsx';
import type { MessageKey } from '../i18n/index.ts';
import { formatCounts } from '../lib/count-display.ts';
import { useI18n } from '../state/i18n.ts';
import { allowedSymbols } from './counts.ts';
import type { DraftCheck, DraftReason, FigureDraft } from './editor.ts';
import { figureNameSuggestions, hasFigureNameSuggestions } from './figure-names.ts';
import { COUNTS_MAX, FIGURE_NAME_MAX } from './limits.ts';

// 開いた行の入力（Ruling 36-3・38・39）。名前（候補は verified 名だけ）・カウント（種目のよく使うカウント）・決定。
// 全部で1つの [data-group="figure-form"]（名前・カウント・候補5・よく使う2・決定＝最大10で U5 に収まる）。
const REASON_TEXT: Record<Exclude<DraftReason, null>, MessageKey> = {
  symbols: 'allowedSymbols', leading: 'startWithBeat', invalid: 'countsInvalid', name: 'nameNeeded'
};
const TEMPLATES = DANCE_PROFILES as Record<string, { templates: readonly string[] }>;

export function FigureForm({ idPrefix, danceId, draft, check, adding, onDraft, onDecide }: {
  idPrefix: string; danceId: string; draft: FigureDraft; check: DraftCheck; adding: boolean;
  onDraft(patch: Partial<FigureDraft>): void; onDecide(): void;
}) {
  const { translator } = useI18n();
  const suggestions = hasFigureNameSuggestions(danceId) ? figureNameSuggestions(danceId, draft.name, translator.locale) : [];
  const countsBad = check.reason === 'symbols' || check.reason === 'leading' || check.reason === 'invalid';
  const reasonId = `${idPrefix}-reason`;
  return (
    <div class="dc-figure-form" data-group="figure-form">
      <div class="dc-field">
        <div class="dc-field-label" id={`${idPrefix}-name-label`}>{translator.t('figureName')}</div>
        <input class="dc-input" type="text" aria-labelledby={`${idPrefix}-name-label`} value={draft.name} maxLength={FIGURE_NAME_MAX}
          autocomplete="off" onInput={event => onDraft({ name: (event.currentTarget as HTMLInputElement).value })} />
        {suggestions.length > 0 && (
          <div class="dc-suggestions" role="group" aria-label={translator.t('figureSuggestions')}>
            {suggestions.map(name => <button key={name} type="button" class="dc-suggestion" onClick={() => onDraft({ name })}>{name}</button>)}
          </div>
        )}
      </div>
      <div class="dc-field">
        <div class="dc-field-label" id={`${idPrefix}-counts-label`}>{translator.t('counts')}</div>
        <input class={`dc-input dc-input--counts${countsBad ? ' dc-input--bad' : ''}`} type="text" aria-labelledby={`${idPrefix}-counts-label`}
          aria-invalid={countsBad ? 'true' : undefined} aria-describedby={check.reason ? reasonId : undefined}
          value={draft.counts} maxLength={COUNTS_MAX} autocomplete="off" autocapitalize="characters" spellcheck={false}
          onInput={event => onDraft({ counts: (event.currentTarget as HTMLInputElement).value })}
          onKeyDown={event => { if (event.key === 'Enter' && check.valid) onDecide(); }} />
        {check.reason && (
          <div class="dc-reason" id={reasonId}>
            {check.reason !== 'name' && <Icon name="alert" />}
            <span>{translator.t(REASON_TEXT[check.reason], { symbols: allowedSymbols(danceId) })}</span>
          </div>
        )}
      </div>
      <div class="dc-field">
        <div class="dc-field-label">{translator.t('commonCounts')}</div>
        <div class="dc-chips">
          {TEMPLATES[danceId]!.templates.map(counts => (
            <button key={counts} type="button" class="dc-chip" onClick={() => onDraft({ counts })}>{formatCounts(danceId, counts)}</button>
          ))}
        </div>
      </div>
      <button type="button" class="dc-button dc-primary dc-wide" disabled={!check.valid} onClick={onDecide}>
        <Icon name={adding ? 'plus' : 'check'} /><span>{translator.t(adding ? 'add' : 'done')}</span>
      </button>
    </div>
  );
}
