/**
 * Resuelve navegación a ficha pública del proveedor desde una oferta.
 * Nunca usa oferta.proveedor (FK Usuario): la API es /talleres/{id}/ o /mecanicos-domicilio/{id}/.
 *
 * @returns {{ providerId: number|string, providerType: 'taller'|'mecanico' } | null}
 */
export function resolveOfertaProviderNav(oferta) {
  if (!oferta) return null;

  const tipoFromApi = String(
    oferta.proveedor_tipo_detail
    || oferta.tipo_proveedor
    || '',
  ).toLowerCase();

  const idDetail = oferta.proveedor_id_detail;
  if (idDetail != null && idDetail !== '' && (tipoFromApi === 'taller' || tipoFromApi === 'mecanico')) {
    return {
      providerId: idDetail,
      providerType: tipoFromApi === 'mecanico' ? 'mecanico' : 'taller',
    };
  }

  const tallerId =
    oferta.taller_info?.id
    ?? oferta.taller?.id
    ?? oferta.proveedor_info?.taller_id
    ?? null;
  const mecanicoId =
    oferta.mecanico_info?.id
    ?? oferta.mecanico_domicilio?.id
    ?? oferta.proveedor_info?.mecanico_domicilio_id
    ?? null;

  if (tipoFromApi === 'taller' && tallerId != null) {
    return { providerId: tallerId, providerType: 'taller' };
  }
  if (tipoFromApi === 'mecanico' && mecanicoId != null) {
    return { providerId: mecanicoId, providerType: 'mecanico' };
  }
  if (tallerId != null) {
    return { providerId: tallerId, providerType: 'taller' };
  }
  if (mecanicoId != null) {
    return { providerId: mecanicoId, providerType: 'mecanico' };
  }

  // Sin perfil de taller/mecánico resoluble: no navegar con Usuario.id
  return null;
}
