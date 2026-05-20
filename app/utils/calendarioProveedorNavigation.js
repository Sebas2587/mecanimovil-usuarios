import { ROUTES } from './constants';

/**
 * ID de entidad Taller/MecanicoDomicilio (no usuario) para APIs de agenda.
 */
export function resolveProveedorEntityId(proveedor, tipo) {
  if (!proveedor) return null;
  if (proveedor.proveedor_entity_id) return proveedor.proveedor_entity_id;
  if (tipo === 'taller' || proveedor.tipo === 'taller' || proveedor.tipo_proveedor === 'taller') {
    return proveedor.taller_id ?? proveedor.id;
  }
  return proveedor.mecanico_id ?? proveedor.id;
}

export function resolveOfertaServicioId(servicios = []) {
  const s = servicios[0];
  if (!s) return null;
  return s.oferta_servicio_id ?? s.oferta_id ?? null;
}

export function navigateCalendarioProveedor(navigation, {
  proveedor,
  tipoProveedor,
  ofertaServicioId,
  returnParams = {},
}) {
  const tipo = tipoProveedor || proveedor?.tipo || proveedor?.tipo_proveedor || 'taller';
  const proveedorId = resolveProveedorEntityId(proveedor, tipo);
  if (!proveedorId) return false;

  navigation.navigate(ROUTES.CALENDARIO_PROVEEDOR, {
    tipoProveedor: tipo,
    proveedorId,
    proveedorNombre: proveedor?.nombre || proveedor?.nombre_comercial || 'Proveedor',
    ofertaServicioId: ofertaServicioId ?? resolveOfertaServicioId(returnParams?.servicios_seleccionados),
    returnRoute: ROUTES.CREAR_SOLICITUD,
    returnParams,
  });
  return true;
}
