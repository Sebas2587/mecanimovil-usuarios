import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

const IS_EXPO_GO = Constants.appOwnership === 'expo';

// Stubs de helpers web (no-op en native) — para que el código compartido pueda importarlos.
export const getLastGoogleEmail = () => null;
export const clearLastGoogleEmail = () => {};

/** Google Sign-In en iOS/Android (fuera de Expo Go): SDK nativo. */
export function useGoogleSignInFlow(loginWithGoogle, options = {}) {
  const flow = options.flow || 'login';
  const onUserNotFound = options.onUserNotFound;
  const [googleLoading, setGoogleLoading] = useState(false);

  const _doSignIn = useCallback(async (forceAccountChooser) => {
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
      // Para "otra cuenta": cerrar sesión local de Google → próxima llamada
      // muestra selector de cuentas (incluye "Agregar otra cuenta").
      if (forceAccountChooser) {
        try { await GoogleSignin.signOut(); } catch {}
      }
      const response = await GoogleSignin.signIn();
      const idToken = response?.data?.idToken;
      if (!idToken) throw new Error('No se obtuvo idToken de Google.');
      const result = await loginWithGoogle(idToken, flow);
      if (result?.code === 'USER_NOT_FOUND') {
        onUserNotFound?.(result?.profile);
        return;
      }
      if (result?.code === 'PROVIDER_ACCOUNT') {
        Alert.alert(
          'Cuenta de Proveedor',
          'Esta cuenta está registrada como mecánico o taller.\n\nPara acceder, descarga y usa la aplicación MecaniMóvil Proveedores.',
          [{ text: 'Entendido' }],
        );
        return;
      }
      if (!result?.success) {
        Alert.alert('Error', result?.error || 'No se pudo iniciar sesión con Google.');
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
  }, [loginWithGoogle, flow, onUserNotFound]);

  const handleGoogleSignIn = useCallback(() => _doSignIn(false), [_doSignIn]);
  const signInWithAccountChooser = useCallback(() => _doSignIn(true), [_doSignIn]);

  return {
    handleGoogleSignIn,
    googleLoading,
    googleButtonDisabled: IS_EXPO_GO,
    isWebOAuthReady: false,
    renderNativeGoogleButton: undefined,
    signInWithAccountChooser,
  };
}
