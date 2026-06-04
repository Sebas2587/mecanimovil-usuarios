/**
 * Elige candidato del comparador (proveedor fijo del catálogo o mejor del pool).
 */
export function pickCandidatoPreferido(pool, { provider, ofertaServicioId } = {}) {
  if (!Array.isArray(pool) || pool.length === 0) return null;

  const entityId = provider?.proveedor_entity_id ?? provider?.id;
  const ofertaNum = ofertaServicioId != null ? Number(ofertaServicioId) : null;

  if (ofertaNum != null && Number.isFinite(ofertaNum)) {
    const byOferta = pool.find((c) => Number(c.oferta_servicio_id) === ofertaNum);
    if (byOferta) return byOferta;
    const byIds = pool.find(
      (c) => Array.isArray(c.oferta_servicio_ids)
        && c.oferta_servicio_ids.some((id) => Number(id) === ofertaNum),
    );
    if (byIds) return byIds;
  }

  if (entityId != null) {
    const tipo = provider?.tipo || provider?.tipo_proveedor || provider?._panelKind;
    const byProv = pool.find((c) => {
      const pid = c.proveedor?.proveedor_id;
      if (pid == null || Number(pid) !== Number(entityId)) return false;
      if (!tipo) return true;
      const ct = c.tipo_proveedor || c.proveedor?.tipo;
      return ct === tipo || (tipo === 'mecanico' && ct === 'domicilio');
    });
    if (byProv) return byProv;
  }

  const exact = pool.find((c) => c.es_coincidencia_exacta || c.es_recomendado);
  return exact || pool[0];
}

export function listCandidatosPreferidos(pool, { provider, ofertaServicioId } = {}) {
  if (!Array.isArray(pool) || pool.length === 0) return [];
  const primary = pickCandidatoPreferido(pool, { provider, ofertaServicioId });
  if (!primary) return [];
  const rest = pool.filter((c) => c !== primary);
  return [primary, ...rest];
}
