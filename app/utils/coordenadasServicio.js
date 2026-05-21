/**
 * Resuelve lat/lng del servicio (GeoJSON [lng, lat] o campos latitude/longitude).
 */

function looksLikeLatChile(value) {
  const a = Math.abs(Number(value));
  return a >= 17 && a <= 56;
}

function looksLikeLngChile(value) {
  const a = Math.abs(Number(value));
  return a >= 64 && a <= 76;
}

function enRangoChile(lat, lng) {
  return lat <= -17 && lat >= -56 && lng <= -66 && lng >= -80;
}

/**
 * Interpreta par [c0, c1] como GeoJSON [lng, lat] o corrige si está [lat, lng].
 */
export function parseCoordenadasArray(coords) {
  if (!Array.isArray(coords) || coords.length < 2) return null;

  const c0 = Number(coords[0]);
  const c1 = Number(coords[1]);
  if (!Number.isFinite(c0) || !Number.isFinite(c1)) return null;

  if (looksLikeLngChile(c0) && looksLikeLatChile(c1)) {
    return validarCoordenadasChile(c1, c0);
  }
  if (looksLikeLatChile(c0) && looksLikeLngChile(c1)) {
    return validarCoordenadasChile(c0, c1);
  }

  return validarCoordenadasChile(c1, c0);
}

/**
 * Valida lat/lng ya separados (no intercambia si el par es válido para Chile).
 */
export function validarCoordenadasChile(lat, lng) {
  let la = Number(lat);
  let lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  if (Math.abs(la) > 90 || Math.abs(lo) > 180) return null;

  if (looksLikeLatChile(lo) && looksLikeLngChile(la) && !enRangoChile(la, lo)) {
    [la, lo] = [lo, la];
  }

  if (la > 0 && lo < 0) la = -Math.abs(la);
  if (lo > 0 && la < 0) lo = -Math.abs(lo);

  if (!enRangoChile(la, lo)) return null;
  return { lat: la, lng: lo };
}

export function resolveCoordenadasServicio(formData) {
  const direccion = formData?.direccion_usuario;

  if (direccion?.latitude != null && direccion?.longitude != null) {
    const fromFields = validarCoordenadasChile(
      direccion.latitude,
      direccion.longitude,
    );
    if (fromFields) return fromFields;
  }

  const sources = [
    formData?.ubicacion_servicio,
    direccion?.ubicacion,
  ];

  for (const ub of sources) {
    const fromArray = parseCoordenadasArray(ub?.coordinates);
    if (fromArray) return fromArray;
  }

  return null;
}
