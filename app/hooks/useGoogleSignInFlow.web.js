import { useState, useEffect, useCallback, useRef } from 'react';
import { showAlert } from '../utils/platformAlert';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const LAST_EMAIL_KEY = 'mecanimovil:lastGoogleEmail';

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
 * Decode JWT payload (no verification — backend verifies). Used to extract email
 * from id_token to remember last connected account.
 */
function decodeJwtPayload(token) {
  try {
    const part = token.split('.')[1];
    const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(part.length + ((4 - (part.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function getLastGoogleEmail() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return window.localStorage.getItem(LAST_EMAIL_KEY) || null;
  } catch {
    return null;
  }
}

function saveLastGoogleEmail(email) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (email) window.localStorage.setItem(LAST_EMAIL_KEY, email);
  } catch {}
}

export function clearLastGoogleEmail() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(LAST_EMAIL_KEY);
  } catch {}
}

/**
 * Abre popup de Google con prompt=select_account para forzar el selector
 * de cuentas. Usa OIDC implicit flow (response_type=id_token) — id_token llega
 * en el hash fragment de la URL de redirect, popup se cierra y devuelve el token.
 *
 * Requiere en Google Cloud Console:
 *   - JS origins autorizados: https://mecanimovil-usuarios.vercel.app, http://localhost:8081
 *   - Redirect URI autorizada: https://mecanimovil-usuarios.vercel.app, http://localhost:8081
 */
function openGoogleAccountChooserPopup() {
  return new Promise((resolve, reject) => {
    if (!WEB_CLIENT_ID) {
      reject(new Error('no_client_id'));
      return;
    }
    const NONCE = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const REDIRECT_URI = window.location.origin + window.location.pathname;
    const url =
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      'client_id=' +
      encodeURIComponent(WEB_CLIENT_ID) +
      '&response_type=id_token' +
      '&scope=' +
      encodeURIComponent('openid email profile') +
      '&redirect_uri=' +
      encodeURIComponent(REDIRECT_URI) +
      '&nonce=' +
      encodeURIComponent(NONCE) +
      '&prompt=select_account';

    const w = 500;
    const h = 600;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(
      url,
      'mecanimovil-google-auth',
      `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`,
    );
    if (!popup) {
      reject(new Error('popup_blocked'));
      return;
    }

    let settled = false;
    const interval = setInterval(() => {
      try {
        if (popup.closed) {
          if (!settled) {
            settled = true;
            clearInterval(interval);
            reject(new Error('cancelled'));
          }
          return;
        }
        // Cross-origin throws while user is on accounts.google.com
        const hash = popup.location.hash;
        if (hash && hash.includes('id_token=')) {
          const params = new URLSearchParams(hash.slice(1));
          const idToken = params.get('id_token');
          settled = true;
          clearInterval(interval);
          try { popup.close(); } catch {}
          if (idToken) resolve(idToken);
          else reject(new Error('no_id_token'));
        } else if (hash && hash.includes('error=')) {
          const params = new URLSearchParams(hash.slice(1));
          const err = params.get('error');
          settled = true;
          clearInterval(interval);
          try { popup.close(); } catch {}
          reject(new Error('oauth_error:' + err));
        }
      } catch {
        // cross-origin durante login en accounts.google.com — ignorar
      }
    }, 400);

    setTimeout(() => {
      if (!settled) {
        settled = true;
        clearInterval(interval);
        try { popup.close(); } catch {}
        reject(new Error('timeout'));
      }
    }, 180_000);
  });
}

/**
 * Hook de Google Sign-In en web.
 *
 * Flujo soportado:
 *   1. handleGoogleSignIn(): One Tap GIS (rápido si Google ya tiene sesión).
 *   2. renderNativeGoogleButton(el): botón oficial de Google (popup OAuth interno).
 *   3. signInWithAccountChooser(): popup OAuth2 con prompt=select_account →
 *      siempre deja al usuario elegir/agregar otra cuenta. Devuelve id_token.
 *
 * Usa el mismo backend (POST /usuarios/google_login/ con id_token) en los 3 casos.
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

  // Carga script GIS y inicializa una sola vez
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

    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', tryInit);
      return () => existing.removeEventListener('load', tryInit);
    }

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

  // Procesa id_token contra backend y maneja routing común (USER_NOT_FOUND, PROVIDER, etc.)
  const _processCredential = useCallback(
    async (idToken, source) => {
      // eslint-disable-next-line no-console
      console.log('[GoogleAuth][web] credential recibido, source=', source, 'flow=', flow);
      const result = await loginWithGoogle(idToken, flow);

      if (result?.success) {
        const payload = decodeJwtPayload(idToken);
        if (payload?.email) saveLastGoogleEmail(payload.email);
        return;
      }
      if (result?.code === 'USER_NOT_FOUND') {
        const payload = decodeJwtPayload(idToken);
        if (payload?.email) saveLastGoogleEmail(payload.email);
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
      showAlert('Error', result?.error || 'No se pudo iniciar sesión con Google.');
    },
    [loginWithGoogle, flow, onUserNotFound],
  );

  /**
   * One Tap (google.accounts.id.prompt). Falla silenciosamente en cooldown.
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

      await _processCredential(credential, 'one_tap');
    } catch (e) {
      const msg = String(e?.message || '');
      if (msg.startsWith('not_displayed') || msg.startsWith('skipped')) {
        // Cooldown / supresión — silencioso. Usar botón nativo o "otra cuenta".
      } else if (msg !== 'timeout') {
        showAlert('Google', 'No se pudo iniciar sesión con Google. Intenta nuevamente.');
      }
    } finally {
      if (mountedRef.current) setGoogleLoading(false);
    }
  }, [gisReady, _processCredential]);

  /**
   * Forza selector de cuentas de Google (popup OAuth2 con prompt=select_account).
   * Siempre permite elegir o agregar otra cuenta — sin cache de cuenta anterior.
   */
  const signInWithAccountChooser = useCallback(async () => {
    if (!WEB_CLIENT_ID) {
      showAlert('Google', 'Google Sign-In no está configurado para web (falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).');
      return;
    }
    setGoogleLoading(true);
    try {
      // Limpia hint local + estado GIS para que NO se reuse la cuenta anterior
      clearLastGoogleEmail();
      try { window.google?.accounts?.id?.disableAutoSelect?.(); } catch {}

      const idToken = await openGoogleAccountChooserPopup();
      await _processCredential(idToken, 'popup_select_account');
    } catch (e) {
      const msg = String(e?.message || '');
      if (msg === 'cancelled') {
        // usuario cerró popup
      } else if (msg === 'popup_blocked') {
        showAlert(
          'Popup bloqueado',
          'El navegador bloqueó la ventana de Google. Permite popups para este sitio e intenta nuevamente.',
        );
      } else if (msg !== 'timeout') {
        showAlert('Google', 'No se pudo iniciar sesión con Google. Intenta nuevamente.');
      }
    } finally {
      if (mountedRef.current) setGoogleLoading(false);
    }
  }, [_processCredential]);

  /**
   * Renderiza botón nativo de GIS (popup interno de Google con cuenta cacheada).
   * Útil cuando ya hay una cuenta conectada y el usuario solo quiere reusarla.
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
    signInWithAccountChooser,
  };
}
