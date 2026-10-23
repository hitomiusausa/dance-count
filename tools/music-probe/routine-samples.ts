import { REVIEWED_COUNTS } from '../../src/app/routines/reviewed-counts.ts';
import { figureDisplayName } from '../../src/app/routines/figure-names.ts';

// In-memory experiments only: never insert examples into the user's routines DB.
const waltzNames=['Whisk','Chasse from PP','Hesitation Change'];
const waltz=waltzNames.map((name,index)=>{
  const reviewed=REVIEWED_COUNTS.find(entry=>entry.danceId==='waltz'&&entry.englishName===name);
  if(!reviewed)throw new Error('Missing reviewed waltz count');
  return {id:`experiment-w-${index}`,name:figureDisplayName('waltz',name,'ja-JP'),counts:reviewed.counts};
});
export const MUSIC_ROUTINE_SAMPLES=[
  {id:'sample-waltz',name:'実験：ワルツ',danceId:'waltz',figures:waltz,
    note:'監修済みのカウントを組み合わせた切替の実験です。踊りの接続順を認定したものではありません。'},
  ...(['rumba','chacha'] as const).map(danceId=>({
    id:`sample-${danceId}`,name:danceId==='rumba'?'実験：ルンバ':'実験：チャチャ',danceId,
    figures:(danceId==='rumba'?['2341','2&341','2341']:['234&1','23&41','234&1'])
      .map((counts,index)=>({id:`experiment-${danceId}-${index}`,name:`リズムの確認 ${index+1}`,counts})),
    note:'時間合わせ用のリズム例です。実際のフィガー構成は監修していません。'
  }))
];
