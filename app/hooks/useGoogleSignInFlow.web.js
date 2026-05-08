import { useState, useEffect, useCallback, useRef } from 'react';
import { showAlert } from '../utils/platformAlert';

/**
 * Web Google Sign-In flow.
 *
 * Estrategia:
 *  - OAuth2 implicit flow vía popup → siempre devuelve `id_token`
 *    (que es el formato que acepta nuestro backend).
 *  - El popup redirige a `/oauth-callback.html` (servido estáticamente desde
 *    `public/oauth-callback.html`). Ese HTML hace `postMessage` al opener con el
 *    fragmento (`#id_token=...`) y se auto-cierra. Evita problemas de cross-origin
 *    polling y mantiene UNA sola redirect_uri por entorno para registrar en GCP.
 *  - `prompt=select_account` → fuerza selector de cuenta.
 *  - `login_hint=email` → preselecciona cuenta concreta (login rápido).
 *
 * Configuración Google Cloud Console requerida (una sola vez por entorno):
 *  - Authorized JavaScript origins:
 *      https://mecanimovil-usuarios.vercel.app
 *      http://localhost:8081
 *  - Authorized redirect URIs:
 *      https://mecanimovil-usuarios.vercel.app/oauth-callback.html
 *      http://localhost:8081/oauth-callback.html
 */

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const ACCOUNTS_KEY = 'mecanimovil:connectedGoogleAccounts';
const OLD_EMAIL_KEY = 'mecanimovil:lastGoogleEmail';
const MAX_ACCOUNTS = 5;
const CALLBACK_PATH = '/oauth-callback.html';

/* ─── localStorage helpers (cuentas conectadas — solo hint UX) ──────────────── */

function _readAccountsSync() {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    // Migrar del formato viejo (single email) → nueva lista
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
    return Array.isArray(list) ? list.filter((a) => a && typeof a.email === 'string') : [];
  } catch {
    return [];
  }
}

export async function getConnectedGoogleAccountsAsync() {
  return _readAccountsSync();
}
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

// Compat aliases
export const getLastGoogleEmail = () => _readAccountsSync()[0]?.email || null;
export const clearLastGoogleEmail = () => clearConnectedGoogleAccountsAsync();

/* ─── JWT decoding ──────────────────────────────────────────────────────────── */

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

/* ─── OAuth2 popup flow vía postMessage ─────────────────────────────────────── */

function buildAuthUrl({ loginHint, forceChooser, nonce, redirectUri }) {
  const params = new URLSearchParams({
    client_id: WEB_CLIENT_ID,
    response_type: 'id_token',
    scope: 'openid email profile',
    redirect_uri: redirectUri,
    nonce,
  });
  if (forceChooser) params.set('prompt', 'select_account');
  if (loginHint) params.set('login_hint', loginHint);
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
}

function openGoogleAuthPopup({ loginHint, forceChooser } = {}) {
  return new Promise((resolve, reject) => {
    if (!WEB_CLIENT_ID) {
      reject(new Error('no_client_id'));
      return;
    }
    const NONCE =
      Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const REDIRECT_URI = window.location.origin + CALLBACK_PATH;
    const url = buildAuthUrl({ loginHint, forceChooser, nonce: NONCE, redirectUri: REDIRECT_URI });

    const w = 500;
    const h = 620;
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
    let messageReceived = false;
    const startTime = Date.now();
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      clearInterval(closeWatcher);
      clearTimeout(timeoutId);
    };

    function onMessage(event) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.type !== 'mecanimovil:google-oauth') return;
      messageReceived = true;
      const hash = (data.hash || '').replace(/^#/, '');
      const search = (data.search || '').replace(/^\?/, '');
      // Errores en query (?error=...) ó en fragmento (#error=...)
      const params = new URLSearchParams(hash || search);
      const idToken = params.get('id_token');
      const err = params.get('error');
      const errDesc = params.get('error_description');
      settled = true;
      cleanup();
      try { popup.close(); } catch {}
      if (idToken) {
        resolve(idToken);
      } else if (err) {
        reject(new Error(`oauth_error:${err}${errDesc ? ':' + errDesc : ''}`));
      } else {
        reject(new Error('no_id_token'));
      }
    }
    window.addEventListener('message', onMessage);

    const closeWatcher = setInterval(() => {
      if (!settled && popup.closed) {
        settled = true;
        cleanup();
        // Heurística: si el popup estuvo abierto >4s y NUNCA llegó al callback
        // (no hubo postMessage), probablemente Google rechazó la solicitud
        // (redirect_uri_mismatch, client_id inválido, etc) y mostró su propia
        // página de error en lugar de redirigir.
        const elapsed = Date.now() - startTime;
        if (!messageReceived && elapsed > 4000) {
          reject(new Error('likely_oauth_misconfig'));
        } else {
          reject(new Error('cancelled'));
        }
      }
    }, 500);

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        try { popup.close(); } catch {}
        reject(new Error('timeout'));
      }
    }, 180_000);
  });
}

/* ─── Hook ──────────────────────────────────────────────────────────────────── */

export function useGoogleSignInFlow(loginWithGoogle, options = {}) {
  const flow = options.flow || 'login';
  const onUserNotFound = options.onUserNotFound;
  const [googleLoading, setGoogleLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const _processCredential = useCallback(
    async (idToken, source) => {
      // eslint-disable-next-line no-console
      console.log('[GoogleAuth][web] credential received, source=', source);
      const result = await loginWithGoogle(idToken, flow);

      const payload = decodeJwtPayload(idToken);
      // Recordar SOLO si el backend acepta (login OK o usuario nuevo válido).
      // NO recordar cuentas rechazadas (PROVIDER_ACCOUNT, etc) — privacidad.
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
          'Cuenta de proveedor',
          'La cuenta de Google que seleccionaste está registrada como mecánico o taller.\n\nPara acceder, descarga la app MecaniMóvil Proveedores.',
        );
        return;
      }
      showAlert('Error', result?.error || 'No se pudo iniciar sesión con Google.');
    },
    [loginWithGoogle, flow, onUserNotFound],
  );

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
          // popup cerrado manualmente — silencioso
        } else if (msg === 'popup_blocked') {
          showAlert(
            'Popup bloqueado',
            'Tu navegador bloqueó la ventana de Google. Habilita popups para este sitio e intenta nuevamente.',
          );
        } else if (msg === 'likely_oauth_misconfig') {
          showAlert(
            'Configuración de Google',
            `Google rechazó la solicitud de inicio de sesión.\n\nLa causa más común es que la URL de redirección no esté autorizada en Google Cloud Console:\n\n${window.location.origin}${CALLBACK_PATH}\n\nContacta al administrador para registrar esta URL.`,
          );
        } else if (msg.startsWith('oauth_error:')) {
          const errDetail = msg.replace('oauth_error:', '');
          if (errDetail.startsWith('redirect_uri_mismatch')) {
            showAlert(
              'Configuración de Google',
              `La URL de redirección no está autorizada en Google Cloud Console.\n\nAgrega:\n${window.location.origin}${CALLBACK_PATH}`,
            );
          } else if (errDetail.startsWith('access_denied')) {
            // usuario rechazó permisos — silencioso
          } else {
            showAlert('Google', `No se pudo iniciar sesión con Google.\n${errDetail}`);
          }
        } else if (msg !== 'timeout' && msg !== 'no_id_token') {
          showAlert('Google', 'No se pudo iniciar sesión con Google. Intenta nuevamente.');
        }
      } finally {
        if (mountedRef.current) setGoogleLoading(false);
      }
    },
    [_processCredential],
  );

  // One Tap legacy — no usado en LoginScreen actual; se mantiene por compat.
  const handleGoogleSignIn = useCallback(() => signInWithAccountChooser(), [signInWithAccountChooser]);

  return {
    handleGoogleSignIn,
    googleLoading,
    googleButtonDisabled: false,
    isWebOAuthReady: true,
    renderNativeGoogleButton: undefined,
    signInWithAccountChooser,
  };
}
