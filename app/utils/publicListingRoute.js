import { Platform } from 'react-native';

/**
 * ID de vehículo en ruta pública /marketplace/vehicle/:id (web, pathname).
 */
export function getMarketplaceVehicleIdFromWebPath() {
  if (Platform.OS !== 'web') return null;
  if (typeof window === 'undefined') return null;
  const raw = String(window.location?.pathname || '');
  const path = raw.split('?')[0].split('#')[0];
  const m = path.match(/\/marketplace\/vehicle\/(\d+)\/?$/i);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Extrae vehicleId de una URL (deep link o https).
 */
export function parseMarketplaceVehicleIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/marketplace\/vehicle\/(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}
