/**
 * Extrae nombres de comuna para filtro de mecánicos a domicilio.
 */
export function extraerComunasDesdeDireccion(direccion) {
  if (!direccion) return [];
  const explicit = direccion.comuna || direccion.commune || direccion.locality;
  if (explicit && String(explicit).trim()) {
    return [String(explicit).trim()];
  }
  // No inferir comuna desde calle/número: el backend resuelve con ChileanCommune + direccion_texto.
  return [];
}
