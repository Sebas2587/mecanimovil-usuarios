/**
 * Comparte ficha pública de vehículo (/marketplace/vehicle/:id).
 * El mensaje no incluye la URL cuando también se pasa `url` (evita duplicado).
 */
import { Platform, Share, Alert } from 'react-native';
import { buildPublicListingUrl } from '../config/publicListing';
import { showAlert } from './platformAlert';

export function buildVehicleSharePayload(vehicle) {
  const id = vehicle?.id;
  const webUrl = buildPublicListingUrl(id);
  const marca = vehicle?.marca_nombre || vehicle?.marca || '';
  const modelo = vehicle?.modelo_nombre || vehicle?.modelo || '';
  const anio = vehicle?.year || vehicle?.anio || '';
  const name = [marca, modelo, anio].filter(Boolean).join(' ') || 'mi vehículo';

  const message = [
    `Revisa la ficha de salud de ${name} en MecaniMovil.`,
    'Historial de servicios, talleres y métricas — sin datos sensibles.',
    'Ver ficha:',
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
  const payload = buildVehicleSharePayload(vehicle);

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
