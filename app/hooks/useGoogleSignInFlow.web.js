import { useState, useEffect, useCallback, useRef } from 'react';
import { showAlert } from '../utils/platformAlert';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const ACCOUNTS_KEY = 'mecanimovil:connectedGoogleAccounts';
const OLD_EMAIL_KEY = 'mecanimovil:lastGoogleEmail';
const MAX_ACCOUNTS = 5;

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

function decodeJwtPayload(token) {
  try {
    const part = token.split('.')[1];
    const padded = part
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(part.length + ((4 - (part.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function _readAccountsSync() {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    // Migrate from old single-email key (mecanimovil:lastGoogleEmail)
    const oldEmail = window.localStorage.getItem(OLD_EMAIL_KEY);
    if (oldEmail) {
      try {
        const existing = JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) || '[]');
        if (Array.isArray(existing) && !existing.some((a) => a.email === oldEmail)) {
          existing.unshift({ email: oldEmail, name: '', picture: '' });
          window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(existing));
        }
      } catch {}
      window.localStorage.removeItem(OLD_EMAIL_KEY);
    }

    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter((a) => a && typeof a.email === 'string');
  } catch {
    return [];
  }
}

/**
 * Lista persistida de cuentas Google con las que el usuario ha iniciado sesión
 * en MecaniMóvil en este dispositivo (más reciente primero).
 * Es solo un hint de UX; no contiene tokens ni datos sensibles.
 */
export async function getConnectedGoogleAccountsAsync() {
  return _readAccountsSync();
}

/** Versión sync para web (localStorage). */
export function getConnectedGoogleAccounts() {
  return _readAccountsSync();
}

function rememberGoogleAccount({ email, name, picture }) {
  if (!email || typeof window === 'undefined' || !window.localStorage) return;
  try {
    const current = _readAccountsSync().filter((a) => a.email !== email);
    current.unshift({ email, name: name || '', picture: picture || '' });
    if (current.length > MAX_ACCOUNTS) current.length = MAX_ACCOUNTS;
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(current));
  } catch {}
}

export async function clearConnectedGoogleAccountsAsync() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(ACCOUNTS_KEY);
  } catch {}
}

// Compat helpers (código previo)
export function getLastGoogleEmail() {
  return _readAccountsSync()[0]?.email || null;
}
export function clearLastGoogleEmail() {
  return clearConnectedGoogleAccountsAsync();
}

/**
 * Abre popup OAuth2 implícito (response_type=id_token).
 * @param {{ loginHint?: string, forceChooser?: boolean }} opts
 *   - loginHint: pasa email a Google → preselecciona cuenta (skip chooser si ya logueado)
 *   - forceChooser: prompt=select_account → siempre muestra selector
 */
function openGoogleAuthPopup(opts = {}) {
  return new Promise((resolve, reject) => {
    if (!WEB_CLIENT_ID) {
      reject(new Error('no_client_id'));
      return;
    }
    const NONCE =
      Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const REDIRECT_URI = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({
      client_id: WEB_CLIENT_ID,
      response_type: 'id_token',
      scope: 'openid email profile',
      redirect_uri: REDIRECT_URI,
      nonce: NONCE,
    });
    if (opts.forceChooser) params.set('prompt', 'select_account');
    if (opts.loginHint) params.set('login_hint', opts.loginHint);
    const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();

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
        const hash = popup.location.hash;
        if (hash && hash.includes('id_token=')) {
          const p = new URLSearchParams(hash.slice(1));
          const idToken = p.get('id_token');
          settled = true;
          clearInterval(interval);
          try { popup.close(); } catch {}
          if (idToken) resolve(idToken);
          else reject(new Error('no_id_token'));
        } else if (hash && hash.includes('error=')) {
          const p = new URLSearchParams(hash.slice(1));
          const err = p.get('error');
          settled = true;
          clearInterval(interval);
          try { popup.close(); } catch {}
          reject(new Error('oauth_error:' + err));
        }
      } catch {
        // cross-origin: usuario navegando en accounts.google.com
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

  // Carga script GIS (solo para One Tap fallback)
  useEffect(() => {
    if (!WEB_CLIENT_ID) return;
    const tryInit = () => {
      _ensureGISInitialized();
      if (_gisInitialized && mountedRef.current) setGisReady(true);
    };
    if (window.google?.accounts?.id) {
      tryInit();
      return;
    }
    const existing = document.querySelector(
      'script[src*="accounts.google.com/gsi/client"]',
    );
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
      console.warn('[GoogleAuth][web] No se pudo cargar Google GIS.');
    };
    document.head.appendChild(script);
  }, []);

  const _processCredential = useCallback(
    async (idToken, source) => {
      // eslint-disable-next-line no-console
      console.log('[GoogleAuth][web] credential, source=', source, 'flow=', flow);
      const result = await loginWithGoogle(idToken, flow);

      const payload = decodeJwtPayload(idToken);
      // Recordar cuenta solo si backend acepta (login OK o usuario nuevo válido)
      if (payload?.email && (result?.success || result?.code === 'USER_NOT_FOUND')) {
        rememberGoogleAccount({
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        });
      }

      if (result?.success) return;
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
      showAlert('Error', result?.error || 'No se pudo iniciar sesión con Google.');
    },
    [loginWithGoogle, flow, onUserNotFound],
  );

  /** Compat: One Tap GIS (rápido si Google ya tiene sesión). */
  const handleGoogleSignIn = useCallback(async () => {
    if (!gisReady || !window.google?.accounts?.id) {
      showAlert('Google', 'Google Sign-In aún se está cargando. Espera un momento.');
      return;
    }
    if (!WEB_CLIENT_ID) {
      showAlert('Google', 'Google Sign-In no está configurado para web.');
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
        // silencioso
      } else if (msg !== 'timeout') {
        showAlert('Google', 'No se pudo iniciar sesión con Google.');
      }
    } finally {
      if (mountedRef.current) setGoogleLoading(false);
    }
  }, [gisReady, _processCredential]);

  /**
   * Sign-in vía popup OAuth2.
   * @param {{ loginHint?: string }} opts
   *   - loginHint: email → preselecciona cuenta (sin chooser si ya logueado)
   *   - sin opts → fuerza selector (prompt=select_account)
   */
  const signInWithAccountChooser = useCallback(
    async (opts = {}) => {
      if (!WEB_CLIENT_ID) {
        showAlert('Google', 'Google Sign-In no está configurado para web.');
        return;
      }
      setGoogleLoading(true);
      try {
        try { window.google?.accounts?.id?.disableAutoSelect?.(); } catch {}
        const idToken = await openGoogleAuthPopup({
          loginHint: opts.loginHint,
          forceChooser: !opts.loginHint,
        });
        await _processCredential(
          idToken,
          opts.loginHint ? 'login_hint' : 'select_account',
        );
      } catch (e) {
        const msg = String(e?.message || '');
        if (msg === 'cancelled') {
          // popup cerrado por usuario
        } else if (msg === 'popup_blocked') {
          showAlert(
            'Popup bloqueado',
            'Permite popups para iniciar sesión con Google e intenta nuevamente.',
          );
        } else if (msg !== 'timeout') {
          showAlert('Google', 'No se pudo iniciar sesión con Google.');
        }
      } finally {
        if (mountedRef.current) setGoogleLoading(false);
      }
    },
    [_processCredential],
  );

  /**
   * Renderiza botón nativo de GIS — NO usado en LoginScreen (toma cuenta global
   * sin permitir chooser). Se mantiene por compat para otros call sites.
   */
  const renderNativeGoogleButton = useCallback(
    (domElement) => {
      if (!domElement || !window.google?.accounts?.id || !gisReady) return;
      domElement.innerHTML = '';
      window.google.accounts.id.renderButton(domElement, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: Math.min(
          300,
          (typeof window !== 'undefined' ? window.innerWidth : 400) - 80,
        ),
        logo_alignment: 'left',
      });
    },
    [gisReady],
  );

  return {
    handleGoogleSignIn,
    googleLoading,
    // The popup (OAuth2) flow does NOT need GIS — never disable the button for it.
    // Only One Tap (handleGoogleSignIn) needs gisReady.
    googleButtonDisabled: false,
    isWebOAuthReady: gisReady,
    renderNativeGoogleButton,
    signInWithAccountChooser,
  };
}
