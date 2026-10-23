import { cancelAutoplay } from '../state/autoplay.ts';
import { Icon } from '../components/Icon.tsx';
import { buildHash, type RouteParams } from '../router/routes.ts';
import { useI18n } from '../state/i18n.ts';
import { musicPreviewEnabled } from '../platform/music.ts';
import { musicPickerTarget, musicRangeQuery } from './navigation.ts';
import type { MusicFigureRange } from './routines.ts';

export function MusicEntry({source,range,onLeave}:{source:RouteParams;range?:MusicFigureRange;onLeave():void}) {
  const {translator:t}=useI18n();
  if(!musicPreviewEnabled())return null;
  return <a class="dc-link-row" data-add-music href={buildHash(musicPickerTarget(source,musicRangeQuery(range)))} onClick={()=>{cancelAutoplay();onLeave();}}>
    <Icon name="play"/><span class="dc-link-label">{t.t('musicAdd')}</span><Icon name="chev-r"/>
  </a>;
}
