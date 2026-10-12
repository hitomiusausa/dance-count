// 段7 fix 1（レビュー I1）: 「…」“…” の UI の語は 1 つの塊（折らない）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { splitQuotedLabels } from '../../../src/app/lib/quoted-labels.ts';

test('quoted UI labels become unbreakable parts; the rest stays as is', () => {
  assert.deepEqual(splitQuotedLabels('「もっと見る」を押し、「ホーム画面に追加」を押します。'), [
    { text: '「もっと見る」', label: true }, { text: 'を', label: false }, { text: '押し、', label: true },
    { text: '「ホーム画面に追加」', label: true }, { text: 'を', label: false }, { text: '押します。', label: true }
  ]);
  // 段7 Task 12: 括弧の後の動詞も折らない（375 幅の Android の手順 2 が「押しま／す。」と折れた）
  assert.deepEqual(splitQuotedLabels('「ホーム画面に追加」（または「アプリをインストール」）を押します。').map(part => part.text),
    ['「ホーム画面に追加」', '（または', '「アプリをインストール」', '）を', '押します。']);
  assert.deepEqual(splitQuotedLabels('Tap “See More”, then “Add to Home Screen”.'), [
    { text: 'Tap ', label: false }, { text: '“See More”', label: true }, { text: ', then ', label: false },
    { text: '“Add to Home Screen”', label: true }, { text: '.', label: false }
  ]);
  assert.deepEqual(splitQuotedLabels('引用の無い文'), [{ text: '引用の無い文', label: false }]);
  assert.deepEqual(splitQuotedLabels(''), []);
  // 文字はひとつも失わない
  const text = '（追加の方法は、設定の「ホーム画面に追加する方法」）';
  assert.equal(splitQuotedLabels(text).map(part => part.text).join(''), text);
});
