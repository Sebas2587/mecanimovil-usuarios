/**
 * Utilidades compartidas para formatear datos de proveedores en cards.
 * Usar esta función en todos los lugares donde se muestren cards de proveedores
 * para garantizar información consistente sin excepciones.
 */

/**
 * Devuelve la cadena de especialidad/marcas de un proveedor.
 * Prioridad: marcas_atendidas_nombres → especialidades_nombres → especialidades[].nombre → fallback
 */
export const getProviderSpecialty = (provider, fallback = 'Especialidad general') => {
  if (provider?.marcas_atendidas_nombres?.length > 0) {
    return provider.marcas_atendidas_nombres.join(', ');
  }
  if (provider?.especialidades_nombres?.length > 0) {
    return provider.especialidades_nombres.join(', ');
  }
  if (Array.isArray(provider?.especialidades) && provider.especialidades.length > 0) {
    return provider.especialidades
      .map((e) => e?.nombre || e)
      .filter(Boolean)
      .join(', ');
  }
  return fallback;
};

/**
 * Devuelve la calificación formateada (string "4.5") o null si no hay datos.
 */
export const getProviderRating = (provider) => {
  const raw =
    provider?.calificacion_promedio ??
    provider?.rating ??
    provider?.calificacion ??
    null;
  if (raw == null) return null;
  const parsed = parseFloat(raw);
  return isNaN(parsed) ? null : parsed > 0 ? parsed.toFixed(1) : null;
};

/**
 * Devuelve el número de reseñas del proveedor.
 */
export const getProviderReviews = (provider) =>
  provider?.numero_de_calificaciones ??
  provider?.total_resenas ??
  provider?.total_reviews ??
  provider?.reviews_count ??
  0;

/**
 * Devuelve la URL de foto del proveedor.
 */
export const getProviderImage = (provider) =>
  provider?.usuario?.foto_perfil ||
  provider?.usuario?.foto_perfil_url ||
  provider?.foto_perfil ||
  provider?.foto_perfil_url ||
  provider?.imagen ||
  null;

/**
 * Devuelve la distancia formateada del proveedor o null.
 */
export const getProviderDistance = (provider) => {
  const km =
    provider?.distance ??
    provider?.distancia_km ??
    provider?.distancia ??
    null;
  if (km == null) return null;
  const d = parseFloat(km);
  if (isNaN(d)) return null;
  if (d < 0.1) return '< 100m';
  if (d < 1) return `${Math.round(d * 1000)}m`;
  if (d < 10) return `${d.toFixed(1)} km`;
  return `${Math.round(d)} km`;
};

/**
 * Formatea un proveedor al shape que espera ProviderPreviewCard.
 * Usar esta función en UserPanelScreen, TalleresScreen, MecanicosScreen
 * y cualquier otra pantalla que muestre ProviderPreviewCard.
 */
export const formatProviderForCard = (provider) => ({
  id: provider?.id,
  name: provider?.nombre || 'Proveedor',
  specialty: getProviderSpecialty(provider),
  rating: getProviderRating(provider),
  reviews: getProviderReviews(provider),
  distance: getProviderDistance(provider),
  verified: provider?.verificado ?? false,
  image: getProviderImage(provider),
});
