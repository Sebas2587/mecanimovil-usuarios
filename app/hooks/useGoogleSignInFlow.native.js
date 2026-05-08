import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

const IS_EXPO_GO = Constants.appOwnership === 'expo';
const ACCOUNTS_KEY = 'mecanimovil:connectedGoogleAccounts';
const MAX_ACCOUNTS = 5;

function decodeJwtPayload(token) {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const padded = part
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(part.length + ((4 - (part.length % 4)) % 4), '=');
    // global atob existe en Hermes >= RN 0.76; fallback Buffer si no
    if (typeof atob === 'function') {
      return JSON.parse(atob(padded));
    }
    // eslint-disable-next-line no-undef
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

export async function getConnectedGoogleAccountsAsync() {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((a) => a && a.email) : [];
  } catch {
    return [];
  }
}

/** Sync stub para compat con web. En native no hay storage sync; usa async. */
export function getConnectedGoogleAccounts() {
  return [];
}

async function rememberGoogleAccount({ email, name, picture }) {
  if (!email) return;
  try {
    const list = (await getConnectedGoogleAccountsAsync()).filter(
      (a) => a.email !== email,
    );
    list.unshift({ email, name: name || '', picture: picture || '' });
    if (list.length > MAX_ACCOUNTS) list.length = MAX_ACCOUNTS;
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  } catch {}
}

export async function clearConnectedGoogleAccountsAsync() {
  try {
    await AsyncStorage.removeItem(ACCOUNTS_KEY);
  } catch {}
}

// Compat helpers
export const getLastGoogleEmail = () => null;
export const clearLastGoogleEmail = () => clearConnectedGoogleAccountsAsync();

/** Google Sign-In en iOS/Android (fuera de Expo Go): SDK nativo. */
export function useGoogleSignInFlow(loginWithGoogle, options = {}) {
  const flow = options.flow || 'login';
  const onUserNotFound = options.onUserNotFound;
  const [googleLoading, setGoogleLoading] = useState(false);

  const _doSignIn = useCallback(
    async (forceAccountChooser, loginHint) => {
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
          await GoogleSignin.hasPlayServices({
            showPlayServicesUpdateDialog: true,
          });
        }
        // Forzar selector: signOut() → próxima signIn() muestra picker nativo
        if (forceAccountChooser) {
          try { await GoogleSignin.signOut(); } catch {}
        }

        // signIn admite { loginHint } en versiones recientes; ignora si no soporta
        let response;
        try {
          response = await GoogleSignin.signIn(loginHint ? { loginHint } : undefined);
        } catch (eHint) {
          // Fallback sin opciones si la versión instalada no acepta arg
          response = await GoogleSignin.signIn();
        }
        const idToken = response?.data?.idToken || response?.idToken;
        if (!idToken) throw new Error('No se obtuvo idToken de Google.');

        const result = await loginWithGoogle(idToken, flow);

        const payload = decodeJwtPayload(idToken);
        if (
          payload?.email &&
          (result?.success || result?.code === 'USER_NOT_FOUND')
        ) {
          await rememberGoogleAccount({
            email: payload.email,
            name: payload.name || response?.data?.user?.name,
            picture: payload.picture || response?.data?.user?.photo || '',
          });
        }

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
        if (e?.code === statusCodes.SIGN_IN_CANCELLED) {
          // usuario canceló
        } else if (e?.code === statusCodes.IN_PROGRESS) {
          // en curso
        } else {
          Alert.alert(
            'Google',
            e?.message || 'No se pudo iniciar sesión con Google.',
          );
        }
      } finally {
        setGoogleLoading(false);
      }
    },
    [loginWithGoogle, flow, onUserNotFound],
  );

  const handleGoogleSignIn = useCallback(() => _doSignIn(false, null), [_doSignIn]);

  const signInWithAccountChooser = useCallback(
    (opts = {}) => _doSignIn(!opts.loginHint, opts.loginHint || null),
    [_doSignIn],
  );

  return {
    handleGoogleSignIn,
    googleLoading,
    googleButtonDisabled: IS_EXPO_GO,
    isWebOAuthReady: false,
    renderNativeGoogleButton: undefined,
    signInWithAccountChooser,
  };
}
