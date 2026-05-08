import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// Módulo-level state to avoid re-initializing GIS across component mounts
let _gisInitialized = false;
let _pendingResolve = null;

function _handleGISCredential(response) {
  const credential = response?.credential;
  if (_pendingResolve && credential) {
    const resolve = _pendingResolve;
    _pendingResolve = null;
    resolve(credential);
  }
}

function _ensureGISInitialized() {
  if (_gisInitialized) return;
  if (!window.google?.accounts?.id) return;
  if (!WEB_CLIENT_ID) return;
  window.google.accounts.id.initialize({
    client_id: WEB_CLIENT_ID,
    callback: _handleGISCredential,
    auto_select: false,
    cancel_on_tap_outside: true,
    use_fedcm_for_prompt: false,
  });
  _gisInitialized = true;
}

/**
 * Google Sign-In en web usando Google Identity Services (GIS).
 * Usa google.accounts.id.prompt() — sin popup, sin COOP issues.
 * El credential (id_token) llega por callback al mismo contexto de ventana.
 *
 * Requiere en Google Cloud Console (OAuth Web Client):
 *   - Orígenes JS autorizados: https://mecanimovil-usuarios.vercel.app, http://localhost:8081
 *   - No necesita Redirect URIs (no hay popup/redirect)
 */
export function useGoogleSignInFlow(loginWithGoogle, options = {}) {
  const flow = options.flow || 'login';
  const onUserNotFound = options.onUserNotFound;
  const [googleLoading, setGoogleLoading] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load GIS script once and initialize
  useEffect(() => {
    if (!WEB_CLIENT_ID) return;

    const tryInit = () => {
      _ensureGISInitialized();
      if (_gisInitialized && mountedRef.current) {
        setGisReady(true);
      }
    };

    if (window.google?.accounts?.id) {
      tryInit();
      return;
    }

    // Script already queued by another component instance — just wait
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', tryInit);
      return () => existing.removeEventListener('load', tryInit);
    }

    // Load the GIS client script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = tryInit;
    script.onerror = () => {
      // eslint-disable-next-line no-console
      console.warn('[GoogleAuth][web] No se pudo cargar el script de Google GIS.');
    };
    document.head.appendChild(script);
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    if (!gisReady || !window.google?.accounts?.id) {
      Alert.alert('Google', 'Google Sign-In aún se está cargando. Espera un momento e intenta nuevamente.');
      return;
    }

    if (!WEB_CLIENT_ID) {
      Alert.alert('Google', 'Google Sign-In no está configurado para web (falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).');
      return;
    }

    setGoogleLoading(true);

    try {
      const credential = await new Promise((resolve, reject) => {
        // Guardar el resolve para que el callback global lo llame
        _pendingResolve = resolve;

        // Timeout de 120 segundos
        const timeout = setTimeout(() => {
          if (_pendingResolve === resolve) {
            _pendingResolve = null;
            reject(new Error('timeout'));
          }
        }, 120_000);

        window.google.accounts.id.prompt((notification) => {
          clearTimeout(timeout);

          if (notification.isNotDisplayed()) {
            // GIS no pudo mostrar el selector (usuario no logueado en Google, etc.)
            _pendingResolve = null;
            reject(new Error('not_displayed:' + notification.getNotDisplayedReason()));
          } else if (notification.isSkippedMoment()) {
            // Usuario cerró el selector sin seleccionar cuenta
            _pendingResolve = null;
            reject(new Error('skipped'));
          }
          // Si se muestra y el usuario selecciona cuenta → _handleGISCredential() llama resolve()
        });
      });

      // credential es el id_token de Google
      // eslint-disable-next-line no-console
      console.log('[GoogleAuth][web][GIS] credential recibido, llamando backend. flow=', flow);
      const result = await loginWithGoogle(credential, flow);
      // eslint-disable-next-line no-console
      console.log('[GoogleAuth][web][GIS] backend result:', {
        success: result?.success,
        code: result?.code,
        hasProfile: !!result?.profile,
      });

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
      const msg = String(e?.message || '');
      if (msg.startsWith('not_displayed')) {
        Alert.alert(
          'Google Sign-In',
          'Para continuar con Google asegúrate de:\n• Estar con sesión iniciada en google.com\n• Que Google no esté bloqueado en el navegador\n\nLuego intenta nuevamente.',
          [{ text: 'OK' }],
        );
      } else if (msg === 'skipped') {
        // Usuario canceló — no mostrar error
      } else if (msg !== 'timeout') {
        Alert.alert('Google', 'No se pudo iniciar sesión con Google. Intenta nuevamente.');
      }
    } finally {
      if (mountedRef.current) setGoogleLoading(false);
    }
  }, [gisReady, loginWithGoogle, flow, onUserNotFound]);

  return {
    handleGoogleSignIn,
    googleLoading,
    googleButtonDisabled: !gisReady,
    isWebOAuthReady: gisReady,
  };
}
