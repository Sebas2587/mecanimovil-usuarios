import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

const IS_EXPO_GO = Constants.appOwnership === 'expo';

/** Google Sign-In en iOS/Android (fuera de Expo Go): SDK nativo. */
export function useGoogleSignInFlow(loginWithGoogle) {
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = useCallback(async () => {
    if (IS_EXPO_GO) {
      Alert.alert(
        'Google Sign-In',
        'Usa la app instalada o la versión web. En Expo Go no está disponible el módulo nativo de Google.',
      );
      return;
    }

    let GoogleSignin;
    let statusCodes = {};
    try {
      const lib = require('@react-native-google-signin/google-signin');
      GoogleSignin = lib.GoogleSignin;
      statusCodes = lib.statusCodes;
    } catch {
      Alert.alert('Google', 'Google Sign-In no está disponible en este entorno.');
      return;
    }

    setGoogleLoading(true);
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      const response = await GoogleSignin.signIn();
      const idToken = response?.data?.idToken;
      if (!idToken) throw new Error('No se obtuvo idToken de Google.');
      const result = await loginWithGoogle(idToken);
      if (!result?.success) {
        Alert.alert('Google', result?.error || 'No se pudo iniciar sesión con Google.');
      }
    } catch (e) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) {
        /* usuario canceló */
      } else if (e.code === statusCodes.IN_PROGRESS) {
        /* en curso */
      } else {
        Alert.alert('Google', e.message || 'No se pudo iniciar sesión con Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [loginWithGoogle]);

  return {
    handleGoogleSignIn,
    googleLoading,
    googleButtonDisabled: IS_EXPO_GO,
    isWebOAuthReady: false,
  };
}
