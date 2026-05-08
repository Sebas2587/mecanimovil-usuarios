import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

/**
 * Google Sign-In en web: OAuth (expo-auth-session) → id_token → mismo backend que nativo.
 * En Google Cloud → cliente OAuth Web: orígenes JS autorizados + URIs de redirección
 * para cada dominio (producción y localhost).
 */
export function useGoogleSignInFlow(loginWithGoogle, options = {}) {
  const flow = options.flow || 'login';
  const onUserNotFound = options.onUserNotFound;
  const [googleLoading, setGoogleLoading] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({ path: 'redirect' });
  // Ayuda de debugging: confirma el redirectUri exacto que Google recibe.
  // (Esto aparece en consola del navegador.)
  // eslint-disable-next-line no-console
  console.log('[GoogleAuth][web] redirectUri:', redirectUri);

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  });

  useEffect(() => {
    const idToken = googleResponse?.authentication?.idToken;
    if (!idToken) return;

    let cancelled = false;
    (async () => {
      setGoogleLoading(true);
      try {
        // eslint-disable-next-line no-console
        console.log('[GoogleAuth][web] auth response received. flow=', flow);

        const result = await loginWithGoogle(idToken, flow);
        // eslint-disable-next-line no-console
        console.log('[GoogleAuth][web] backend result:', {
          success: result?.success,
          code: result?.code,
          hasProfile: !!result?.profile,
        });

        if (!cancelled && result?.code === 'USER_NOT_FOUND') {
          onUserNotFound?.(result?.profile);
          return;
        }
        if (!cancelled && !result?.success) {
          Alert.alert('Google', result?.error || 'No se pudo iniciar sesión con Google.');
        }
      } catch {
        if (!cancelled) Alert.alert('Google', 'No se pudo iniciar sesión con Google.');
      } finally {
        if (!cancelled) setGoogleLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [googleResponse, loginWithGoogle]);

  const handleGoogleSignIn = useCallback(async () => {
    if (!googleRequest) {
      Alert.alert(
        'Google',
        'No se pudo iniciar el acceso con Google. Configura EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID y en Google Cloud las URIs autorizadas para esta URL.',
      );
      return;
    }
    setGoogleLoading(true);
    try {
      // eslint-disable-next-line no-console
      console.log('[GoogleAuth][web] promptAsync starting. flow=', flow);
      const result = await googlePromptAsync();
      // eslint-disable-next-line no-console
      console.log('[GoogleAuth][web] promptAsync result:', { type: result?.type });
      if (result?.type === 'cancel' || result?.type === 'dismiss') {
        setGoogleLoading(false);
        return;
      }
      // Si fue success pero no llegó idToken por alguna razón, no dejar loading infinito.
      const idToken = googleResponse?.authentication?.idToken;
      if (result?.type === 'success' && !idToken) {
        setGoogleLoading(false);
        Alert.alert('Google', 'No se pudo completar el acceso con Google (sin idToken).');
      }
    } catch {
      setGoogleLoading(false);
    }
  }, [googleRequest, googlePromptAsync, googleResponse, flow, onUserNotFound]);

  return {
    handleGoogleSignIn,
    googleLoading,
    googleButtonDisabled: !googleRequest,
    isWebOAuthReady: !!googleRequest,
  };
}
