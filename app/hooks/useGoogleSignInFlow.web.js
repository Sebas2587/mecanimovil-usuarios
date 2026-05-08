import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

/**
 * Google Sign-In en web: OAuth (expo-auth-session) → id_token → mismo backend que nativo.
 * En Google Cloud → cliente OAuth Web: orígenes JS autorizados + URIs de redirección
 * para cada dominio (producción y localhost).
 */
export function useGoogleSignInFlow(loginWithGoogle) {
  const [googleLoading, setGoogleLoading] = useState(false);

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    const idToken = googleResponse?.authentication?.idToken;
    if (!idToken) return;

    let cancelled = false;
    (async () => {
      setGoogleLoading(true);
      try {
        const result = await loginWithGoogle(idToken);
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
      const result = await googlePromptAsync();
      if (result?.type === 'cancel' || result?.type === 'dismiss') {
        setGoogleLoading(false);
      }
    } catch {
      setGoogleLoading(false);
    }
  }, [googleRequest, googlePromptAsync]);

  return {
    handleGoogleSignIn,
    googleLoading,
    googleButtonDisabled: !googleRequest,
    isWebOAuthReady: !!googleRequest,
  };
}
