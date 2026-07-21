/**
 * Comparte ficha pública de vehículo (/marketplace/vehicle/:id).
 * El mensaje no incluye la URL cuando también se pasa `url` (evita duplicado).
 */
import { Platform, Share, Alert } from 'react-native';
import { buildPublicFichaUrl } from '../config/publicListing';
import { enablePublicVehicleFicha } from '../services/privacyService';
import { showAlert } from './platformAlert';

export function buildVehicleSharePayload(vehicle, shareMeta) {
  const id = vehicle?.id;
  const token = shareMeta?.ficha_publica_token || vehicle?.ficha_publica_token;
  const webUrl = shareMeta?.url_publica || (token ? buildPublicFichaUrl(token) : null);
  const marca = vehicle?.marca_nombre || vehicle?.marca?.nombre || vehicle?.marca || '';
  const modelo = vehicle?.modelo_nombre || vehicle?.modelo?.nombre || vehicle?.modelo || '';
  const anio = vehicle?.year || vehicle?.anio || '';
  const cilindraje = vehicle?.cilindraje || vehicle?.cilindrada || '';
  const healthRaw = vehicle?.health_score ?? vehicle?.salud_general_porcentaje;
  const healthPct =
    healthRaw != null && Number.isFinite(Number(healthRaw))
      ? Math.round(Number(healthRaw))
      : null;

  const name = [marca, modelo, anio].filter(Boolean).join(' ') || 'este vehículo';
  const facts = [
    cilindraje ? String(cilindraje) : null,
    healthPct != null ? `salud ${healthPct}%` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const message = [
    `Ficha de ${name}${facts ? ` (${facts})` : ''} en MecaniMovil.`,
    'Regístrate y lleva el control de tu auto: salud, servicios y talleres.',
  ].join('\n');

  return {
    title: `${name} · MecaniMovil`,
    message,
    url: webUrl,
  };
}

async function copyText(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

export async function shareVehicleFicha(vehicle) {
  if (!vehicle?.id) return { ok: false };
  let shareMeta = null;
  try {
    shareMeta = await enablePublicVehicleFicha(vehicle.id);
  } catch (error) {
    console.error('habilitar ficha pública', error);
    showAlert('No se pudo compartir', 'Intenta de nuevo en un momento.');
    return { ok: false };
  }
  const payload = buildVehicleSharePayload(vehicle, shareMeta);

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
        showAlert('Enlace copiado', 'La ficha pública quedó en el portapapeles.');
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
    console.error('shareVehicleFicha', error);
    try {
      const copied = await copyText(payload.url);
      if (copied) {
        showAlert('Enlace copiado', 'Copiamos el enlace de la ficha.');
        return { ok: true, method: 'clipboard' };
      }
    } catch {
      /* ignore */
    }
    Alert.alert('No se pudo compartir', 'Intenta de nuevo en un momento.');
    return { ok: false };
  }
}
