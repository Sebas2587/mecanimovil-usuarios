import Constants from 'expo-constants';

const DEFAULT_WEB_ORIGIN = 'https://mecanimovil-usuarios.vercel.app';

/**
 * Origen HTTPS de la app web (Expo export en Vercel). Sirve para compartir fichas públicas.
 */
export function getPublicListingWebOrigin() {
  const o = Constants.expoConfig?.extra?.publicListingWebOrigin;
  return typeof o === 'string' && o.trim() ? o.trim().replace(/\/$/, '') : DEFAULT_WEB_ORIGIN;
}

export function buildPublicListingPath(vehicleId) {
  return `/marketplace/vehicle/${vehicleId}`;
}

export function buildPublicListingUrl(vehicleId) {
  return `${getPublicListingWebOrigin()}${buildPublicListingPath(vehicleId)}`;
}

export function buildDeepLinkListingUrl(vehicleId) {
  const path = buildPublicListingPath(vehicleId).replace(/^\//, '');
  return `mecanimovil://${path}`;
}

export function buildPublicProviderPath(providerType, providerId) {
  return `/provider/${providerType}/${providerId}`;
}

export function buildPublicProviderUrl(providerType, providerId) {
  return `${getPublicListingWebOrigin()}${buildPublicProviderPath(providerType, providerId)}`;
}

export function buildDeepLinkProviderUrl(providerType, providerId) {
  const path = buildPublicProviderPath(providerType, providerId).replace(/^\//, '');
  return `mecanimovil://${path}`;
}

export function getPlayStoreUrl() {
  return Constants.expoConfig?.extra?.playStoreUrl || 'https://play.google.com/store/apps/details?id=com.mecanimovil.app';
}

export function getAppStoreUrl() {
  return Constants.expoConfig?.extra?.appStoreUrl || 'https://apps.apple.com/search?term=MecaniMovil';
}
