import { useEffect, useState } from 'preact/hooks';
import { onHashChange, readHash } from '../platform/hash.ts';
import { parseHash, type Route } from '../router/routes.ts';

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(readHash()));
  useEffect(() => onHashChange(hash => setRoute(parseHash(hash))), []);
  return route;
}
