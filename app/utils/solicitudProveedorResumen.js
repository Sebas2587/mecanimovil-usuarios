import { resolveToAbsoluteMediaUrl } from './providerUtils';

/**
 * Resuelve la URL de foto de una oferta (Cloudflare/R2 o media local).
 */
export function resolveOfertaProveedorFotoUrl(oferta) {
  if (!oferta) return null;

  const raw =
    oferta.proveedor_foto
    || oferta.proveedor_info?.foto
    || oferta.proveedor_info?.foto_perfil_url
    || oferta.proveedor_info?.usuario?.foto_perfil_url
    || oferta.taller_info?.foto_perfil_url
    || oferta.taller_info?.usuario?.foto_perfil_url
    || oferta.mecanico_info?.foto_perfil_url
    || oferta.mecanico_info?.usuario?.foto_perfil_url
    || oferta.proveedor_info?.foto_perfil
    || oferta.taller_info?.foto_perfil
    || oferta.mecanico_info?.foto_perfil
    || null;

  return resolveToAbsoluteMediaUrl(raw);
}

function resolveOfertaResumenFromOferta(oferta) {
  if (!oferta?.nombre_proveedor) return null;
  const esMecanico = oferta.tipo_proveedor === 'mecanico';
  return {
    nombre: oferta.nombre_proveedor,
    fotoUrl: resolveOfertaProveedorFotoUrl(oferta),
    label: esMecanico ? 'Mecánico' : 'Taller',
  };
}

/**
 * Taller o proveedor visible en listados/resumen de solicitud (no el técnico del equipo).
 */
export function resolveProveedorSolicitudResumen(solicitud) {
  if (!solicitud) return null;

  const fromSeleccionada = resolveOfertaResumenFromOferta(solicitud.oferta_seleccionada_detail);
  if (fromSeleccionada) return fromSeleccionada;

  const ofertas = Array.isArray(solicitud.ofertas) ? solicitud.ofertas : [];
  for (const oferta of ofertas) {
    const resumen = resolveOfertaResumenFromOferta(oferta);
    if (resumen) return resumen;
  }

  const prov = Array.isArray(solicitud.proveedores_dirigidos_detail)
    ? solicitud.proveedores_dirigidos_detail[0]
    : null;
  if (prov) {
    const nombre =
      prov.nombre_comercial
      || [prov.first_name, prov.last_name].filter(Boolean).join(' ').trim()
      || prov.username
      || null;
    if (!nombre) return null;
    return {
      nombre,
      fotoUrl: resolveToAbsoluteMediaUrl(prov.foto_perfil_url || prov.foto_perfil),
      label: 'Taller',
    };
  }

  return null;
}
