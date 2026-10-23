import type { RouteParams, RouteQuery, RouteTarget } from '../router/routes.ts';
import type { MusicFigureRange } from './routines.ts';

export function musicSourceParams(params: RouteParams): RouteParams {
  if(params.routineId)return {routineId:params.routineId};
  if(params.danceId)return {danceId:params.danceId,...(params.figureSlug?{figureSlug:params.figureSlug}:{})};
  return {};
}
export function musicRangeQuery(range?: MusicFigureRange): RouteQuery {
  return range?{from:range.startIndex,to:range.endIndex}:{};
}
export function musicRouteRange(query: RouteQuery): MusicFigureRange | undefined {
  return query.from!==undefined&&query.to!==undefined?{startIndex:query.from,endIndex:query.to}:undefined;
}
export function musicPickerTarget(params: RouteParams={},query: RouteQuery={}): RouteTarget {
  const source=musicSourceParams(params);
  return Object.keys(source).length?{screen:'U5',params:source,query}:{screen:'U3',params:{}};
}
export function musicTrackTarget(trackId:string,params:RouteParams={},query:RouteQuery={}): RouteTarget {
  return {screen:'U4',params:{trackId,...musicSourceParams(params)},query};
}
export function musicOriginTarget(params:RouteParams):RouteTarget {
  if(params.routineId)return {screen:'S5',params:{routineId:params.routineId}};
  if(params.danceId)return {screen:'S2',params:musicSourceParams(params)};
  return {screen:'U3',params:{}};
}
