import { createRoutine, type Routine } from '../../../src/app/routines/routine.ts';

// 段5のテスト用のルーティン（鳴らせるワルツ）。ID は r-／f- の形。
export function waltzRoutine(id: string, name = 'ワルツのルーティン', now = '2026-10-12T00:00:00.000Z'): Routine {
  return {
    ...createRoutine({ id, danceId: 'waltz', name, now }),
    figures: [{ id: `f-${id.slice(2)}-1`, name: 'ナチュラルターン', counts: '123' }, { id: `f-${id.slice(2)}-2`, name: 'ウィスク', counts: '123' }]
  };
}
