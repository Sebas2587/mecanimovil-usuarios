/**
 * Token de traspaso: el QR / link llevan el secreto de un solo uso (~15 min).
 */
import { Platform, Share, Alert } from 'react-native';
import {
  buildTransferClaimUrl,
  buildDeepLinkTransferClaimUrl,
} from '../config/publicListing';
import { showAlert } from './platformAlert';

const TOKEN_IN_PATH_RE = /transferencia\/claim\/([^/?#]+)/i;

/**
 * Acepta token crudo o URL de reclamo (QR / WhatsApp).
 */
export function extractTransferToken(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  const pathMatch = s.match(TOKEN_IN_PATH_RE);
  if (pathMatch?.[1]) {
    try {
      return decodeURIComponent(pathMatch[1]);
    } catch {
      return pathMatch[1];
    }
  }

  try {
    if (/^https?:\/\//i.test(s) || s.startsWith('mecanimovil://')) {
      const u = new URL(s.replace(/^mecanimovil:\/\//i, 'https://app/'));
      const q = u.searchParams.get('token');
      if (q) return q.trim();
      const m = u.pathname.match(TOKEN_IN_PATH_RE);
      if (m?.[1]) return decodeURIComponent(m[1]);
    }
  } catch {
    /* fall through */
  }

  // Token urlsafe típico (sin espacios / sin http)
  if (!/\s/.test(s) && !/^https?:/i.test(s) && s.length >= 16) {
    return s;
  }

  return null;
}

export function parseTransferTokenFromUrl(url) {
  return extractTransferToken(url);
}

export function buildTransferSharePayload(token, vehicleLabel = '') {
  const webUrl = buildTransferClaimUrl(token);
  const deepUrl = buildDeepLinkTransferClaimUrl(token);
  const name = String(vehicleLabel || '').trim() || 'el vehículo';

  const message = [
    `Código de traspaso de ${name}`,
    'MecaniMovil · historial y salud del vehículo',
    'Ábrelo con tu cuenta. Expira en 15 minutos.',
  ].join('\n');

  return {
    title: 'Código de traspaso · MecaniMovil',
    message,
    url: webUrl,
    deepUrl,
  };
}

async function copyText(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

/**
 * Comparte el link de reclamo (equivalente a mostrar el QR).
 */
export async function shareTransferCode(token, vehicleLabel) {
  const clean = extractTransferToken(token) || String(token || '').trim();
  if (!clean) return { ok: false };

  const payload = buildTransferSharePayload(clean, vehicleLabel);

  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: payload.title,
            text: payload.message,
            url: payload.url,
          });
          return { ok: true, method: 'web-share' };
        } catch (err) {
          if (err?.name === 'AbortError') return { ok: false, method: 'cancelled' };
        }
      }
      const copied = await copyText(payload.url);
      if (copied) {
        showAlert(
          'Enlace copiado',
          'Pégalo en WhatsApp. Quien lo abra (logueado) puede reclamar el vehículo en 15 minutos.',
        );
        return { ok: true, method: 'clipboard' };
      }
      showAlert('Compartir', payload.url);
      return { ok: true, method: 'alert' };
    }

    await Share.share(
      Platform.OS === 'ios'
        ? { message: payload.message, url: payload.url }
        : { message: `${payload.message}\n${payload.url}`, title: payload.title },
    );
    return { ok: true, method: 'native' };
  } catch (error) {
    console.error('shareTransferCode', error);
    try {
      const copied = await copyText(payload.url);
      if (copied) {
        showAlert('Enlace copiado', 'El código de traspaso quedó en el portapapeles.');
        return { ok: true, method: 'clipboard' };
      }
    } catch {
      /* ignore */
    }
    Alert.alert('No se pudo compartir', 'Intenta de nuevo en un momento.');
    return { ok: false };
  }
}
