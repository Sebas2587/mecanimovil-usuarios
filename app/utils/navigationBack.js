import { Platform } from 'react-native';
import { ROUTES } from './constants';

/**
 * Atrás con fallback en web (deep link / stack de un solo nivel).
 */
export function goBackFromProviderProfile(navigation, { fallbackRoute = ROUTES.HOME } = {}) {
  if (!navigation) return;

  if (Platform.OS === 'web') {
    if (typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    navigation.navigate(fallbackRoute);
    return;
  }

  if (typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  navigation.navigate(fallbackRoute);
}
