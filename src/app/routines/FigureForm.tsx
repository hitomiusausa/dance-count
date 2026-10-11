import { Icon } from '../components/Icon.tsx';
import type { MessageKey } from '../i18n/index.ts';
import { formatCounts } from '../lib/count-display.ts';
import { useI18n } from '../state/i18n.ts';
import { beatsPerBar } from './bar-check.ts';
import { countPatterns, pressedPattern } from './count-patterns.ts';
import { allowedSymbols } from './counts.ts';
import type { IconName } from '../components/icon-names.ts';
import type { DraftAction, DraftCheck, DraftReason, FigureDraft } from './editor.ts';
import { figureNameSuggestions, hasFigureNameSuggestions } from './figure-names.ts';
import { COUNTS_MAX, FIGURE_NAME_MAX } from './limits.ts';

// 開いた行の入力（Ruling 36-3・38・39・50・53）。名前（候補は verified 名だけ）・カウント・カウントの形・主ボタン。
// 外側の .dc-figure-form には data-group を付けない（入れ子にすると U5 で外側が内側ぶんも数える）。中は 2 グループ:
// [data-group="figure-form"]＝名前・候補5・カウント欄（7）、[data-group="count-patterns"]＝形（≤8）＋主ボタン（≤9）。
// 形は countPatterns(danceId)（プロファイルの数から規則で作る。名前では変わらない＝Ruling 3 との線引き）。タップで欄を置き換える。
// カウント欄の下には常に「使える文字：…」（Ruling 50 D14）。文字の誤りはこの行が赤くなり、ほかの理由はその下に1行。
// 理由が無い時だけ、止めない知らせ（まとめて変更の予告 → 小節の注意の短い形。Ruling 52-3）を同じ位置に出す。
// 主ボタンは editor の action で文字・アイコンを替えるだけ（ボタンは増やさない。Ruling 50-6）。
// 「複製して追加」の時は形を押した見た目にしない（欄のカウントは捨てるため。pressedPattern）。
const REASON_TEXT: Record<Exclude<DraftReason, 'symbols' | null>, MessageKey> = {
  leading: 'startWithBeat', invalid: 'countsInvalid', sameName: 'sameNameExists', name: 'nameNeeded'
};
const PRIMARY: Record<DraftAction, { text: MessageKey; icon: IconName | null }> = {
  add: { text: 'add', icon: 'plus' }, done: { text: 'done', icon: 'check' }, addCopy: { text: 'addCopy', icon: 'copy' },
  matchCounts: { text: 'matchCounts', icon: null }, updateAll: { text: 'updateAll', icon: 'check' }
};

// onPrimary は主ボタン（画面が check.action で処理を選ぶ）。Enter は有効な時だけ（＝確定の働きの時だけ）。
export function FigureForm({ idPrefix, danceId, draft, check, onDraft, onPrimary }: {
  idPrefix: string; danceId: string; draft: FigureDraft; check: DraftCheck;
  onDraft(patch: Partial<FigureDraft>): void; onPrimary(): void;
}) {
  const { translator } = useI18n();
  const suggestions = hasFigureNameSuggestions(danceId) ? figureNameSuggestions(danceId, draft.name, translator.locale) : [];
  const countsBad = check.reason === 'symbols' || check.reason === 'leading' || check.reason === 'invalid';
  const hintId = `${idPrefix}-hint`;
  const reasonId = `${idPrefix}-reason`;
  const symbolsBad = check.reason === 'symbols';
  const others = check.same?.others ?? 0;
  const reasonText = check.reason && check.reason !== 'symbols'
    ? translator.t(REASON_TEXT[check.reason], { counts: check.same ? formatCounts(danceId, check.same.counts) : '' })
    : check.note === 'othersWillChange' ? translator.t('othersWillChange', { count: others })
    : check.note === 'offBar' ? translator.t('offBarFigure', { beats: beatsPerBar(danceId) }) : null;
  const primary = PRIMARY[check.action];
  const alwaysPressable = check.action === 'addCopy' || check.action === 'matchCounts';
  const pressed = pressedPattern(draft.counts, check.action);
  const patternsLabel = translator.t('commonCounts');
  return (
    <div class="dc-figure-form">
      <div class="dc-figure-fields" data-group="figure-form">
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
            aria-invalid={countsBad ? 'true' : undefined} aria-describedby={reasonText ? `${hintId} ${reasonId}` : hintId}
            value={draft.counts} maxLength={COUNTS_MAX} autocomplete="off" autocapitalize="characters" spellcheck={false}
            onInput={event => onDraft({ counts: (event.currentTarget as HTMLInputElement).value })}
            onKeyDown={event => { if (event.key === 'Enter' && check.valid) onPrimary(); }} />
          <div class={`dc-hint${symbolsBad ? ' dc-hint--bad' : ''}`} id={hintId}>
            {symbolsBad && <Icon name="alert" />}
            <span>{translator.t('allowedSymbols', { symbols: allowedSymbols(danceId, translator.locale) })}</span>
          </div>
          {reasonText && (
            <div class="dc-reason" id={reasonId}>
              {check.reason !== 'name' && <Icon name="alert" />}
              <span>{reasonText}</span>
            </div>
          )}
        </div>
      </div>
      <div class="dc-count-patterns" data-group="count-patterns">
        <div class="dc-field">
          <div class="dc-field-label">{patternsLabel}</div>
          <div class="dc-chips" role="group" aria-label={patternsLabel}>
            {countPatterns(danceId).map(counts => (
              <button key={counts} type="button" class="dc-chip" aria-pressed={counts === pressed ? 'true' : 'false'}
                onClick={() => onDraft({ counts })}>{formatCounts(danceId, counts)}</button>
            ))}
          </div>
        </div>
        <button type="button" class="dc-button dc-primary dc-wide" disabled={!alwaysPressable && !check.valid} onClick={onPrimary}>
          {primary.icon && <Icon name={primary.icon} />}<span>{translator.t(primary.text, { count: others + 1 })}</span>
        </button>
      </div>
    </div>
  );
}
