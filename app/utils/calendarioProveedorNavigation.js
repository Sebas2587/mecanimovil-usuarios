import { ROUTES } from './constants';

/** Paso del formulario de ubicación (tras confirmar horario en calendario). */
export const PASO_FORMULARIO_UBICACION = 5;

/**
 * ID de entidad Taller/MecanicoDomicilio (no usuario) para APIs de agenda.
 */
export function resolveProveedorEntityId(proveedor, tipo) {
  if (!proveedor) return null;
  const entityFromField = proveedor.proveedor_entity_id ?? proveedor.proveedorEntityId;
  if (entityFromField != null && entityFromField !== '') {
    const n = Number(entityFromField);
    return Number.isFinite(n) ? n : entityFromField;
  }
  const tipoNorm = resolveTipoProveedor(proveedor, tipo);
  if (tipoNorm === 'taller') {
    const id = proveedor.taller_id ?? proveedor.id;
    return id != null ? Number(id) || id : null;
  }
  const id = proveedor.mecanico_id ?? proveedor.id;
  return id != null ? Number(id) || id : null;
}

export function resolveTipoProveedor(proveedor, tipoHint) {
  if (tipoHint === 'taller' || tipoHint === 'mecanico' || tipoHint === 'domicilio') {
    return tipoHint === 'domicilio' ? 'mecanico' : tipoHint;
  }
  const t = proveedor?.tipo || proveedor?.tipo_proveedor;
  if (t === 'taller' || t === 'mecanico' || t === 'domicilio') {
    return t === 'domicilio' ? 'mecanico' : t;
  }
  if (proveedor?._panelKind === 'taller') return 'taller';
  if (proveedor?._panelKind === 'mecanico') return 'mecanico';
  return null;
}

export function resolveOfertaServicioId(servicios = [], fallbackId = null) {
  const s = Array.isArray(servicios) ? servicios[0] : null;
  const raw =
    fallbackId
    ?? s?.oferta_servicio_id
    ?? s?.oferta_id
    ?? s?.ofertaServicioId;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : raw;
}

/**
 * Unifica IDs para APIs de agenda (perfil proveedor, paso 4 manual, comparador).
 */
export function resolveAgendaParams({
  proveedor = null,
  tipoProveedor = null,
  ofertaServicioId = null,
  servicios = [],
  routeParams = {},
} = {}) {
  const tipo = resolveTipoProveedor(proveedor, tipoProveedor)
    || resolveTipoProveedor(null, routeParams.tipoProveedor)
    || resolveTipoProveedor(null, routeParams.tipoProveedorPreseleccionado)
    || resolveTipoProveedor(null, routeParams.tipo_proveedor_preseleccionado);

  const proveedorId = resolveProveedorEntityId(proveedor, tipo)
    ?? (routeParams.proveedorEntityId != null ? Number(routeParams.proveedorEntityId) : null)
    ?? (routeParams.proveedor_entity_id != null ? Number(routeParams.proveedor_entity_id) : null)
    ?? (routeParams.proveedorId != null ? Number(routeParams.proveedorId) : null);

  const ofertaResolved = resolveOfertaServicioId(
    servicios,
    ofertaServicioId
      ?? routeParams.ofertaServicioId
      ?? routeParams.oferta_servicio_id_preseleccionada,
  );

  return {
    tipoProveedor: tipo,
    proveedorId: proveedorId != null && Number.isFinite(Number(proveedorId)) ? Number(proveedorId) : proveedorId,
    ofertaServicioId: ofertaResolved,
  };
}

/**
 * Contexto de agenda (OpenSpec REQ-CALENDARIO-PROVEEDOR / REQ-SLOTS-DURACION).
 * Mismo contrato para flujo desde cero, perfil catálogo y comparador.
 */
export function buildAgendaContext({
  proveedor = null,
  tipoProveedor = null,
  servicios = [],
  routeParams = {},
  requireOferta = false,
} = {}) {
  const params = resolveAgendaParams({
    proveedor,
    tipoProveedor,
    servicios,
    routeParams,
    ofertaServicioId:
      routeParams.ofertaServicioId ?? routeParams.oferta_servicio_id_preseleccionada,
  });

  const valid =
    (params.tipoProveedor === 'taller' || params.tipoProveedor === 'mecanico')
    && params.proveedorId != null
    && (!requireOferta || params.ofertaServicioId != null);

  return {
    ...params,
    valid,
    agendaContext: {
      tipoProveedor: params.tipoProveedor,
      proveedorId: params.proveedorId,
      proveedorEntityId: params.proveedorId,
      ofertaServicioId: params.ofertaServicioId,
    },
  };
}

export function navigateCalendarioProveedor(navigation, {
  proveedor,
  tipoProveedor,
  ofertaServicioId,
  servicios = [],
  returnParams = {},
  pasoDestinoTrasCalendario = PASO_FORMULARIO_UBICACION,
  requireOferta = false,
}) {
  const built = buildAgendaContext({
    proveedor,
    tipoProveedor,
    servicios: servicios.length ? servicios : returnParams?.servicios_seleccionados,
    routeParams: {
      ...returnParams,
      ofertaServicioId: ofertaServicioId ?? returnParams?.ofertaServicioId,
    },
    requireOferta,
  });

  if (!built.valid) return false;

  const { agendaContext } = built;

  navigation.navigate(ROUTES.CALENDARIO_PROVEEDOR, {
    ...agendaContext,
    tipoProveedor: agendaContext.tipoProveedor,
    proveedorId: agendaContext.proveedorId,
    proveedorEntityId: agendaContext.proveedorEntityId,
    proveedorNombre: proveedor?.nombre || proveedor?.nombre_comercial || 'Proveedor',
    ofertaServicioId: agendaContext.ofertaServicioId,
    agendaContext,
    returnRoute: ROUTES.CREAR_SOLICITUD,
    returnParams: {
      ...returnParams,
      servicios_seleccionados: servicios.length ? servicios : returnParams?.servicios_seleccionados,
      proveedorEntityId: agendaContext.proveedorEntityId,
      ofertaServicioId: agendaContext.ofertaServicioId,
      tipoProveedorPreseleccionado: agendaContext.tipoProveedor,
      tipo_proveedor_preseleccionado: agendaContext.tipoProveedor,
      oferta_servicio_id_preseleccionada: agendaContext.ofertaServicioId,
    },
    pasoDestinoTrasCalendario,
  });
  return true;
}

/**
 * Confirmar solicitud al elegir horario en calendario (sin volver a resumen).
 * - Comparador catálogo (modoCatalogo)
 * - Perfil proveedor → CREAR_SOLICITUD con flujoCatalogoProveedor
 */
export function shouldFinalizarSolicitudEnCalendario({ returnRoute, returnParams }) {
  const tienePayloadConfirmacion =
    !!returnParams?.formPayload?.vehiculo?.id
    && !!returnParams?.pendingConfirmOferta?.oferta_servicio_id;

  if (!tienePayloadConfirmacion) return false;

  if (
    returnRoute === ROUTES.COMPARADOR_OFERTAS
    && returnParams?.modoCatalogo === true
  ) {
    return true;
  }

  if (
    returnRoute === ROUTES.CREAR_SOLICITUD
    && (
      returnParams?.flujoCatalogoProveedor === true
      || returnParams?.fromProviderDetail === true
    )
  ) {
    return true;
  }

  return false;
}
