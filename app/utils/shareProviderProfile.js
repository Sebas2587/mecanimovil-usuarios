import { Platform, Share, Alert } from 'react-native';
import { buildPublicProviderUrl, buildDeepLinkProviderUrl } from '../config/publicListing';
import { showAlert } from './platformAlert';

/**
 * Construye el texto y URL pública para compartir un perfil de proveedor.
 * El mensaje NO incluye la URL: iOS/Android/Web Share la añaden vía el campo `url`
 * (si va en ambos, el link se duplica).
 */
export function buildProviderSharePayload(provider, providerType, providerId) {
  const webUrl = buildPublicProviderUrl(providerType, providerId);
  const deepUrl = buildDeepLinkProviderUrl(providerType, providerId);
  const isTaller = providerType === 'taller';
  const titleSpec = isTaller ? 'Taller especializado' : 'Mecánico a domicilio';
  const name = provider?.nombre || 'Especialista';

  const zonasComunas = provider?.zonas_servicio
    ? provider.zonas_servicio.flatMap((z) => z.comunas || [])
    : [];
  const comunasRaw =
    zonasComunas.length > 0
      ? zonasComunas
      : provider?.comunas_cobertura_nombres ||
        provider?.comunas_cobertura?.map((c) => c?.nombre || c) ||
        [];
  const comunasArr = Array.isArray(comunasRaw) ? comunasRaw.filter(Boolean) : [];

  let comunasText = '';
  if (comunasArr.length > 0) {
    comunasText =
      comunasArr.length > 3
        ? `Atiende en ${comunasArr.slice(0, 3).join(', ')} y más comunas.`
        : `Atiende en ${comunasArr.join(', ')}.`;
  } else if (isTaller && provider?.comuna) {
    comunasText = `Atiende en ${provider.comuna}.`;
  } else if (!isTaller) {
    comunasText = 'Atiende a domicilio.';
  }

  const marcasArr = provider?.marcas_atendidas_nombres || ['Multimarca'];
  const marcasText =
    marcasArr.length > 6 ? `${marcasArr.slice(0, 6).join(', ')}...` : marcasArr.join(', ');

  const message = [
    `Conoce a ${name}, ${titleSpec}.`,
    comunasText,
    `Especialista en: ${marcasText}`,
    'Ver perfil en MecaniMovil:',
  ]
    .filter((line) => line !== undefined && line !== null && String(line).trim() !== '')
    .join('\n')
    .trim();

  return {
    title: `${name} · MecaniMóvil`,
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
 * Comparte el perfil del proveedor. En web usa Web Share API o copia el enlace;
 * en nativo usa Share.share.
 * @returns {{ ok: boolean, method?: 'native'|'web-share'|'clipboard' }}
 */
export async function shareProviderProfile(provider, providerType, providerId) {
  if (providerId == null || providerId === '' || !providerType) {
    return { ok: false };
  }

  const payload = buildProviderSharePayload(provider, providerType, providerId);

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
          // Usuario canceló o el browser no completó: caer a clipboard.
          if (err?.name === 'AbortError') return { ok: false, method: 'cancelled' };
        }
      }

      const copied = await copyText(payload.url);
      if (copied) {
        showAlert('Enlace copiado', 'El perfil quedó en el portapapeles para que lo compartas.');
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
    console.error('shareProviderProfile', error);
    try {
      const copied = await copyText(payload.url);
      if (copied) {
        showAlert('Enlace copiado', 'No se pudo abrir el menú de compartir; copiamos el enlace.');
        return { ok: true, method: 'clipboard' };
      }
    } catch {
      /* ignore */
    }
    Alert.alert('No se pudo compartir', 'Intenta de nuevo en un momento.');
    return { ok: false };
  }
}
