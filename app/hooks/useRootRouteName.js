import { useSyncExternalStore } from 'react';
import {
  getRootRouteName,
  subscribeRootNavigationState,
} from '../navigation/rootNavigationRef';

/** Ruta raíz del stack (TabNavigator vs pantallas modales) sin estar dentro del navigator. */
export function useRootRouteName() {
  return useSyncExternalStore(
    subscribeRootNavigationState,
    getRootRouteName,
    () => 'TabNavigator',
  );
}
