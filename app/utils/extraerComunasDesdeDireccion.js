/**
 * Extrae nombres de comuna para filtro de mecánicos a domicilio.
 */
export function extraerComunasDesdeDireccion(direccion) {
  if (!direccion) return [];
  const explicit = direccion.comuna || direccion.commune || direccion.locality;
  if (explicit && String(explicit).trim()) {
    return [String(explicit).trim()];
  }
  const texto = String(direccion.direccion || '').trim();
  if (!texto) return [];
  const partes = texto.split(',').map((p) => p.trim()).filter(Boolean);
  if (partes.length >= 2) {
    const candidata = partes[partes.length - 2];
    if (candidata && candidata.length > 2 && candidata.length < 60) {
      return [candidata];
    }
  }
  return [];
}
