import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { showAlert } from '../utils/platformAlert';

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

  /**
   * Intenta One Tap (google.accounts.id.prompt). Si está en cooldown o suprimido,
   * falla silenciosamente — el usuario puede usar el botón nativo de Google renderizado
   * en la UI vía renderNativeGoogleButton().
   */
  const handleGoogleSignIn = useCallback(async () => {
    if (!gisReady || !window.google?.accounts?.id) {
      showAlert('Google', 'Google Sign-In aún se está cargando. Espera un momento e intenta nuevamente.');
      return;
    }

    if (!WEB_CLIENT_ID) {
      showAlert('Google', 'Google Sign-In no está configurado para web (falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).');
      return;
    }

    setGoogleLoading(true);

    try {
      const credential = await new Promise((resolve, reject) => {
        _pendingResolve = resolve;

        const timeout = setTimeout(() => {
          if (_pendingResolve === resolve) {
            _pendingResolve = null;
            reject(new Error('timeout'));
          }
        }, 120_000);

        window.google.accounts.id.prompt((notification) => {
          clearTimeout(timeout);

          if (notification.isNotDisplayed()) {
            _pendingResolve = null;
            reject(new Error('not_displayed:' + notification.getNotDisplayedReason()));
          } else if (notification.isSkippedMoment()) {
            _pendingResolve = null;
            reject(new Error('skipped:' + notification.getSkippedReason()));
          }
        });
      });

      // eslint-disable-next-line no-console
      console.log('[GoogleAuth][web][GIS] credential recibido, flow=', flow);
      const result = await loginWithGoogle(credential, flow);

      if (result?.code === 'USER_NOT_FOUND') {
        onUserNotFound?.(result?.profile);
        return;
      }
      if (result?.code === 'PROVIDER_ACCOUNT') {
        showAlert(
          'Cuenta de Proveedor',
          'Esta cuenta está registrada como mecánico o taller.\n\nPara acceder, descarga y usa la aplicación MecaniMóvil Proveedores.',
        );
        return;
      }
      if (!result?.success) {
        showAlert('Error', result?.error || 'No se pudo iniciar sesión con Google.');
      }
    } catch (e) {
      const msg = String(e?.message || '');
      if (msg.startsWith('not_displayed') || msg.startsWith('skipped')) {
        // Cooldown / supresión / cancelación — silencioso.
        // El botón nativo de Google (renderNativeGoogleButton) no tiene estas restricciones.
      } else if (msg !== 'timeout') {
        showAlert('Google', 'No se pudo iniciar sesión con Google. Intenta nuevamente.');
      }
    } finally {
      if (mountedRef.current) setGoogleLoading(false);
    }
  }, [gisReady, loginWithGoogle, flow, onUserNotFound]);

  /**
   * Renderiza el botón nativo de Google Identity Services en un elemento DOM.
   * El botón nativo no tiene cooldown y permite "Usar otra cuenta" (cualquier email).
   * El credential (id_token) llega por el mismo callback _handleGISCredential.
   * @param {HTMLElement} domElement - elemento DOM donde Google renderiza el botón
   */
  const renderNativeGoogleButton = useCallback((domElement) => {
    if (!domElement || !window.google?.accounts?.id || !gisReady) return;
    domElement.innerHTML = '';
    window.google.accounts.id.renderButton(domElement, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      width: Math.min(300, (typeof window !== 'undefined' ? window.innerWidth : 400) - 80),
      logo_alignment: 'left',
    });
  }, [gisReady]);

  return {
    handleGoogleSignIn,
    googleLoading,
    googleButtonDisabled: !gisReady,
    isWebOAuthReady: gisReady,
    renderNativeGoogleButton,
  };
}
