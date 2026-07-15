import { createTranslator } from './localization.js';

export const UI_LOCALE_STORAGE_KEY = 'dance-count-v2-ui-locale';

export const DANCE_NAMES = Object.freeze({
  waltz: names('Waltz', 'ワルツ'),
  tango: names('Tango', 'タンゴ'),
  vwaltz: names('Viennese Waltz', 'ヴィエニーズワルツ'),
  slowfox: names('Slow Foxtrot', 'スローフォックス'),
  quickstep: names('Quickstep', 'クイックステップ'),
  rumba: names('Rumba', 'ルンバ'),
  chacha: names('Cha Cha Cha', 'チャチャチャ'),
  samba: names('Samba', 'サンバ'),
  pasodoble: names('Paso Doble', 'パソドブレ'),
  jive: names('Jive', 'ジャイブ')
});

export const PRACTICE_MESSAGES = Object.freeze({
  en: Object.freeze({
    title: 'Simple player', tagline: 'Focused count practice', editor: 'Practice & edit list', interfaceLanguage: 'Interface language',
    practiceContent: 'Practice content', basicCounts: 'Basic counts', routinePractice: 'Routine practice', dance: 'Dance', count: 'Count', routine: 'Routine',
    routineNotice: 'Routine timing has passed mechanical checks, but the dance content has not yet been reviewed. It is shown for testing only. Verified terminology appears in English; unverified source names remain in Japanese.',
    startFigure: 'Start figure', endFigure: 'End figure', figureList: 'Figure list', chooseFigure: 'Select one to play that figure', idleCounts: 'Counts light up during playback', playbackProgress: 'Playback progress',
    practiceSpeed: 'Practice speed', loop: 'Loop', metronome: 'Metronome', countIn: 'Count-in', none: 'None', oneBar: '1 bar', twoBars: '2 bars',
    voice: 'Voice', standardVoice: 'Standard voice', manageVoice: 'Record & manage voices', standardVoiceHint: 'The standard voice is aligned to the beat.',
    playAfterBars: '▶ Count {bars} {barWord}, then {action}', play: '▶ Play', playRange: '▶ Play selection', stop: '■ Stop',
    editorHelp: 'For detailed voice timing or figure editing, use', storageError: 'Settings could not be saved on this device.', routineLoadError: 'Routine data could not be loaded ({message}).',
    voiceOption: '{name} ({language} · {recorded}/12)', voiceRecordedHint: 'Using 12 recorded {language} words. Audio is trimmed and beat-aligned.', voiceCompleteHint: 'Completed recorded voice sets are available.', voiceIncompleteHint: 'A voice set is in progress. It becomes selectable after all 12 words are recorded.', voiceNoneHint: 'To use your own voice, create an English or Japanese set on the recording screen.', voiceStorageError: 'Recorded voices could not be read. The standard voice is still available.',
    noRoutine: 'No routine is available.', figureOption: '{index}. {name}', chooseOnly: '{index}. Select only {name}', rangeSummary: 'Play {figures} {figureWord} · {beats} beats', meter: '{dance} · {beats}/4',
    nextFigure: '{figure} → Next: {next}', rangeLoop: '{figure} → Return to selection start', rangeEnd: '{figure} → End of selection', figurePosition: 'Figure {index} / {total} · Selection {start}–{end}',
    tempoGuide: 'Competition guide {min}–{max} BPM · about {percent}% of the lower limit', preparingAudio: 'Preparing audio…', playError: 'Could not start playback: {message}', countInStatus: 'Count-in…', current: 'Now: ', loopNumber: ' · loop {iteration}', usingRecorded: 'Using the recorded {language} voice.', usingStandard: 'Using the standard voice.',
    figureSingular: 'figure', figurePlural: 'figures', jiveStructure: 'Rock step | Chassé | Chassé', chachaStructure: 'Walk | Cha-cha-cha', sqStructure: 'Practice Slow / Quick durations', sambaStructure: '“a” is the final quarter of the beat', languageToggle: 'Switch display language'
  }),
  'ja-JP': Object.freeze({
    title: 'シンプル再生', tagline: '操作を絞ったカウント練習', editor: '一覧で練習・編集', interfaceLanguage: '画面表示',
    practiceContent: '練習内容', basicCounts: '基本カウント', routinePractice: 'ルーティン練習', dance: '種目', count: 'カウント', routine: 'ルーティン',
    routineNotice: 'ルーティンは機械的な拍計算のみ確認済みで、ダンス内容は未監修です。現在は検証用として表示しています。',
    startFigure: '開始フィガー', endFigure: '終了フィガー', figureList: 'フィガー一覧', chooseFigure: '選ぶとそのフィガーを再生', idleCounts: '再生するとカウントが光ります', playbackProgress: '再生の進み具合',
    practiceSpeed: '練習速度', loop: '繰り返す', metronome: 'メトロノーム', countIn: 'カウントイン', none: 'なし', oneBar: '1小節', twoBars: '2小節',
    voice: '再生する音声', standardVoice: '標準音声', manageVoice: '録音・音声パック管理', standardVoiceHint: '標準音声は拍に合わせて調整済みです。',
    playAfterBars: '▶ {bars}小節数えて{action}', play: '▶ 再生', playRange: '▶ 区間を再生', stop: '■ 停止',
    editorHelp: '音声タイミングやフィガーを詳しく調整する場合は、', storageError: '設定を端末に保存できませんでした。', routineLoadError: 'ルーティンデータを読み込めませんでした（{message}）。',
    voiceOption: '{name}（{language}・{recorded}/12）', voiceRecordedHint: '{language}の録音済み12語を使用します。音声は自動カット・拍位置補正済みです。', voiceCompleteHint: '完成した録音音声セットを選べます。', voiceIncompleteHint: '録音中の音声セットがあります。12語完成すると選べます。', voiceNoneHint: '自分の声を使う場合は、録音画面で英語または日本語のセットを作成します。', voiceStorageError: '録音音声の保存領域を確認できませんでした。標準音声は使用できます。',
    noRoutine: '利用できるルーティンがありません。', figureOption: '{index}. {name}', chooseOnly: '{index}. {name}だけを選択', rangeSummary: '{figures}{figureWord} · {beats}拍を再生', meter: '{dance} · {beats}拍子',
    nextFigure: '{figure} → 次：{next}', rangeLoop: '{figure} → 区間の先頭へ戻る', rangeEnd: '{figure} → 区間の最後', figurePosition: 'フィガー {index} / {total} · 選択区間 {start}–{end}',
    tempoGuide: '競技速度の目安 {min}–{max} BPM · 下限の約{percent}%', preparingAudio: '音声を準備しています…', playError: '再生を開始できませんでした：{message}', countInStatus: 'カウントイン…', current: '現在: ', loopNumber: ' · {iteration}周目', usingRecorded: '{language}の録音音声を使用します。', usingStandard: '標準音声を使用します。',
    figureSingular: 'フィガー', figurePlural: 'フィガー', jiveStructure: 'ロック ｜ シャッセ ｜ シャッセ', chachaStructure: 'ウォーク ｜ チャ・チャ・チャ', sqStructure: 'Slow / Quick の長さで練習', sambaStructure: 'a は拍の最後の1/4', languageToggle: '表示言語を切り替え'
  })
});

export const EDITOR_MESSAGES = Object.freeze({
  en: Object.freeze({
    title: 'Routine practice & editor', simplePlayer: 'Simple player', interfaceLanguage: 'Interface language', notice: 'This is legacy data that passed mechanical beat checks. The dance content has not been reviewed, so it is not yet available as a beginner preset. Verified terminology appears in English; unverified source names remain in Japanese.',
    sourceRoutine: 'Source routine', draftName: 'Draft name', previewSpeed: 'Preview speed (BPM)', standard: 'Standard', practiceAudio: 'Practice audio', voice: 'Voice', standardVoice: 'Standard voice', metronome: 'Metronome', manageVoice: 'Record & manage voices',
    timingSummary: 'Fine-tune voice timing', timingGuide: 'If the voice sounds late, move it toward Earlier. A/B plays the original first and the adjusted version second. Start around ±40 ms, then return in 10 ms steps.', allVoices: 'All words', earlier: 'Earlier', later: 'Later', resetOffsets: 'Reset all to 0', commitTiming: 'Finish voice-set adjustment', draftTimingHint: 'Adjustments are saved automatically as a draft.', individualVoices: 'Individual words',
    undo: '↶ Undo', redo: '↷ Redo', addFigure: 'Add figure', resetData: 'Restore source data', loadingRoutine: 'Loading routine…', loadFailed: 'Routine data could not be loaded.', loadDetail: 'Open this screen through the local server instead of opening the file directly.', reopen: 'Open the correct URL', figureList: 'Figure list',
    fullCountIn: 'Full-routine count-in', none: 'None', oneBar: '1 bar', twoBars: '2 bars', previewAll: '▶ Preview full routine', stopped: 'Stopped', deleteTitle: 'Delete this figure?', deleteDescription: 'Remove {name} from the routine. You can restore it with Undo.', cancel: 'Cancel', delete: 'Delete', createTitle: 'Add a figure', createEnd: 'Choose a name to add a figure at the end of the routine.', createBefore: 'Choose a name to insert a figure before figure {index}.', figureName: 'Figure name', count: 'Count', add: 'Add', chooseFigure: 'Choose a figure',
    voiceOption: '{name} ({language} · {recorded}/12)', figureCount: '{count} items', validRoutine: '✓ Ready in v2: {figures} figures · {beats} beats{warning}', needsFix: 'Needs fixing: {message}', moveFigure: 'Move {name}', moveTitle: 'Drag to reorder (keyboard: arrow keys)', previewFigure: 'Preview only {name}', duplicateFigure: 'Duplicate {name}', deleteFigure: 'Delete {name}', insertAfterFigure: 'Add a figure after {name}', previewButton: 'Preview', duplicate: 'Duplicate', deleteShort: 'Delete', insertAfter: 'Add after', figureLabel: 'Figure name', countsLabel: 'Count', timeline: 'Beat timeline for {name}',
    timingNeedsPack: 'Record all 12 words and select the recorded voice set to confirm timing.', timingSelectPack: 'Select a recorded voice set to confirm timing values.', timingDirty: 'Changes are saved as a draft. Finish to store them in the voice set and export data.', timingSaved: 'Timing is confirmed in the voice set and will be included in exports.', timingCommitted: 'Voice timing was saved to the voice set and will be included in the next export.', timingCommitError: 'Could not save timing to the voice set: {message}', usingRecorded: 'Using the recorded {language} voice.', usingStandard: 'Using the standard voice.',
    noFigures: 'Add at least one figure.', playError: 'Playback error: {message}', previewError: 'Preview error: {message}', countInStatus: 'Count-in…', firstOriginal: '{label}: first is original; second is {direction}.', faster: '{ms} ms earlier', slower: '{ms} ms later', noChange: 'unchanged', selectFigureError: 'Choose a figure name.', countValid: '✓ Available ({beats} beats)', resetConfirmStatus: 'Restored the source routine.', stop: '■ Stop', timingAria: '{label} timing', abAria: 'Compare {label} timing before and after', abCompare: 'A/B compare', barEndsEarly: '⚠ Routine ends partway through a bar (beat {beat})', barContinues: '↳ Count continues into the next figure because this figure ends partway through a bar', draftStorageError: 'The draft could not be saved on this device. Check it before closing the screen.', tokenNotAllowed: '{dance} cannot use “{token}”.', ambiguousLeading: 'Specify whether the leading “{token}” belongs to the previous beat, current beat, or pickup.', unsupportedToken: '“{token}” is not a supported count token.', languageToggle: 'Switch display language', speedShort: 'Speed', voiceShort: 'Voice', countInShort: 'Count-in', settingsSummary: 'Advanced settings', closePanel: 'Close'
  }),
  'ja-JP': Object.freeze({
    title: 'ルーティン練習・編集', simplePlayer: 'シンプル再生へ', interfaceLanguage: '画面表示', notice: 'ここに表示するのは機械的に拍計算できた旧データです。ダンス内容は未監修のため、初心者向けプリセットとしてはまだ公開しません。',
    sourceRoutine: '元ルーティン', draftName: '下書き名', previewSpeed: '試聴速度（BPM）', standard: '標準', practiceAudio: '練習の音声設定', voice: '再生する音声', standardVoice: '標準音声', metronome: 'メトロノーム', manageVoice: '録音・音声パック管理',
    timingSummary: '音声タイミングを微調整', timingGuide: '声が拍より遅く聞こえる場合は「早く」へ。個別の「A/B比較」は、1回目に調整前、2回目に調整後を再生します。まず±40ms程度で方向を確認し、10msずつ戻すと合わせやすくなります。', allVoices: 'すべての音声', earlier: '早く', later: '遅く', resetOffsets: 'すべて0に戻す', commitTiming: '音声セット調整完了', draftTimingHint: '調整値は下書きとして自動保存されます。', individualVoices: '個別の音声',
    undo: '↶ 元に戻す', redo: '↷ やり直す', addFigure: 'フィガー追加', resetData: '元データに戻す', loadingRoutine: 'ルーティンを読み込んでいます…', loadFailed: 'ルーティンデータを読み込めませんでした。', loadDetail: 'この画面はファイルを直接開かず、ローカルサーバー経由で開く必要があります。', reopen: '正しいURLで開き直す', figureList: 'フィガー一覧',
    fullCountIn: '全体のカウントイン', none: 'なし', oneBar: '1小節', twoBars: '2小節', previewAll: '▶ 全体を試聴', stopped: '停止中', deleteTitle: 'フィガーを削除しますか？', deleteDescription: '{name} をルーティンから削除します。削除後も「元に戻す」で復元できます。', cancel: 'キャンセル', delete: '削除する', createTitle: 'フィガーを追加', createEnd: '名前を選んで、ルーティンの末尾へ追加します。', createBefore: '名前を選んで、{index}番の前へ追加します。', figureName: 'フィガー名', count: 'カウント', add: '追加する', chooseFigure: 'フィガーを選ぶ',
    voiceOption: '{name}（{language}・{recorded}/12）', figureCount: '{count}件', validRoutine: '✓ v2で再生可能：{figures}フィガー・{beats}拍{warning}', needsFix: '要修正：{message}', moveFigure: '{name}を移動', moveTitle: 'ドラッグして並べ替え（キーボードは上下矢印）', previewFigure: '{name}だけ試聴', duplicateFigure: '{name}を複製', deleteFigure: '{name}を削除', insertAfterFigure: '{name}の直後にフィガーを追加', previewButton: '試聴', duplicate: '複製', deleteShort: '削除', insertAfter: '直後に追加', figureLabel: 'フィガー名', countsLabel: 'カウント', timeline: '{name}の拍タイムライン',
    timingNeedsPack: '確定するには、12語を録音して「自分の録音音声」を選びます。', timingSelectPack: '「自分の録音音声」を選ぶと、調整値を音声セットへ確定できます。', timingDirty: '変更は下書きに自動保存済みです。完了ボタンで音声セットと書き出しデータへ確定します。', timingSaved: '音声セットに確定済みです。録音画面から書き出すファイルにも含まれます。', timingCommitted: '音声タイミングを音声セットへ記録しました。次のファイル書き出しにも含まれます。', timingCommitError: '音声セットへ記録できませんでした：{message}', usingRecorded: '{language}の録音音声を使用します。', usingStandard: '標準音声を使用します。',
    noFigures: 'フィガーを1件以上追加してください。', playError: '再生エラー：{message}', previewError: '試聴エラー：{message}', countInStatus: 'カウントイン…', firstOriginal: '{label}：1回目は調整前、2回目は{direction}した音声です。', faster: '{ms}ms早く', slower: '{ms}ms遅く', noChange: '調整なし', selectFigureError: 'フィガー名を選んでください。', countValid: '✓ 使用できます（{beats}拍）', resetConfirmStatus: '元データに戻しました。', stop: '■ 停止', timingAria: '{label}のタイミング', abAria: '{label}の調整前後を比較試聴', abCompare: 'A/B比較', barEndsEarly: '⚠ ルーティンが小節途中（{beat}拍目）で終わります', barContinues: '↳ 小節途中のため、次のフィガーへカウントが続きます', draftStorageError: '下書きを端末へ保存できません。画面を閉じる前に内容を確認してください。', tokenNotAllowed: '{dance}では「{token}」を使用できません。', ambiguousLeading: '先頭の「{token}」が前の拍・現在拍・アウフタクトのどれに属するか指定してください。', unsupportedToken: '「{token}」はカウントとして使用できません。', languageToggle: '表示言語を切り替え', speedShort: '速度', voiceShort: '音声', countInShort: 'カウントイン', settingsSummary: '詳細設定', closePanel: '閉じる'
  })
});

export function createPracticeTranslator(requestedLocale) {
  return createTranslator(PRACTICE_MESSAGES, requestedLocale);
}

export function createEditorTranslator(requestedLocale) {
  return createTranslator(EDITOR_MESSAGES, requestedLocale);
}

export function danceDisplayName(danceId, uiLocale = 'en') {
  const namesForDance = DANCE_NAMES[danceId];
  if (!namesForDance) return danceId;
  return uiLocale.startsWith('ja') ? namesForDance['ja-JP'] : namesForDance.en;
}

function names(en, ja) {
  return Object.freeze({ en, 'ja-JP': ja });
}
