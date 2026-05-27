import { createNavigationContainerRef } from '@react-navigation/native';

/** Ref global del NavigationContainer (App.js). */
export const rootNavigationRef = createNavigationContainerRef();

const listeners = new Set();

export function subscribeRootNavigationState(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyRootNavigationStateChange() {
  listeners.forEach((listener) => listener());
}

export function getRootRouteName() {
  if (!rootNavigationRef.isReady()) return 'TabNavigator';
  const state = rootNavigationRef.getRootState();
  if (!state?.routes?.length) return 'TabNavigator';
  return state.routes[state.index]?.name ?? 'TabNavigator';
}

export function navigateRoot(name, params) {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate(name, params);
  }
}
