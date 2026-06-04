import { ROUTES } from '../../../utils/constants';
import { resolveVehicleParaAgendar } from '../../../utils/vehiclePanelContext';
import {
  buildProviderForSolicitud,
  mapOfertaCatalogoParaSolicitud,
  resolveOfertaServicioId,
  resolveServicioId,
} from './providerCatalogSchedule';

export { resolveVehicleParaAgendar };

/** Parámetros del flujo inteligente (comparador IA, sin proveedor fijo). */
function inteligenteExtras() {
  return {
    agendamientoInteligente: true,
    fromDashboard: true,
  };
}

export function navigateCrearSolicitudConServicio(navigation, { vehicle, servicio, descripcion = '' }) {
  if (!vehicle?.id || !servicio?.id) return;
  navigation.navigate(ROUTES.CREAR_SOLICITUD, {
    vehicle,
    servicioPreseleccionado: servicio,
    descripcionPrellenada: descripcion,
    ...inteligenteExtras(),
  });
}

/** Solicitud dirigida a un proveedor concreto (explorar / perfil). */
export function navigateCrearSolicitudConProveedor(navigation, { vehicle, provider }) {
  if (!vehicle?.id || !provider?.id) return;
  const tipo = provider._panelKind === 'taller' ? 'taller' : 'mecanico';
  navigation.navigate(ROUTES.CREAR_SOLICITUD, {
    vehicle,
    proveedorPreseleccionado: provider,
    tipoProveedorPreseleccionado: tipo,
    fromProviderDetail: true,
  });
}

/** Proveedor + servicio de catálogo desde perfil (oferta con precios del proveedor). */
export function navigateCrearSolicitudConProveedorYServicio(
  navigation,
  { vehicle, provider, servicio, providerType, descripcion = '' },
) {
  const servicioId = resolveServicioId(servicio);
  const ofertaId = resolveOfertaServicioId(servicio);
  const providerNorm = buildProviderForSolicitud(
    provider,
    providerType || provider?._panelKind,
  );
  if (!vehicle?.id || !servicioId || !providerNorm?.id) return;

  const tipo = providerNorm._panelKind === 'taller' ? 'taller' : 'mecanico';
  const servicioMapeado = mapOfertaCatalogoParaSolicitud(servicio, providerNorm, tipo, vehicle);

  navigation.navigate(ROUTES.CREAR_SOLICITUD, {
    vehicle,
    servicioPreseleccionado: servicioMapeado,
    proveedorPreseleccionado: providerNorm,
    tipoProveedorPreseleccionado: tipo,
    proveedorEntityId: providerNorm.proveedor_entity_id,
    oferta_servicio_id_preseleccionada: ofertaId,
    fromProviderDetail: true,
    flujoCatalogoProveedor: true,
    ofertaServicioId: ofertaId,
    descripcionPrellenada: descripcion,
  });
}

export function navigateCrearSolicitudDesdeTrending(navigation, { vehicle, row }) {
  if (!vehicle?.id || !row) return;
  const servicioId = row.servicio_id;
  if (servicioId) {
    navigation.navigate(ROUTES.CREAR_SOLICITUD, {
      vehicle,
      servicioPreseleccionado: {
        id: servicioId,
        nombre: row.servicio_nombre || 'Servicio',
      },
      ...inteligenteExtras(),
    });
    return;
  }
  navigation.navigate(ROUTES.CREAR_SOLICITUD, {
    vehicle,
    descripcionPrellenada: row.servicio_nombre || '',
    ...inteligenteExtras(),
  });
}

export function navigateCrearSolicitudConServicios(
  navigation,
  { vehicle, servicios = [], descripcion = '' },
) {
  if (!vehicle?.id || !servicios.length) return;
  if (servicios.length === 1) {
    navigateCrearSolicitudConServicio(navigation, {
      vehicle,
      servicio: servicios[0],
      descripcion,
    });
    return;
  }
  navigation.navigate(ROUTES.CREAR_SOLICITUD, {
    vehicle,
    serviciosPreSeleccionados: servicios.map((s) => s.id).filter(Boolean),
    descripcionPrellenada: descripcion,
    ...inteligenteExtras(),
  });
}

/** Abre nueva solicitud en modo comparador IA (sin proveedor preseleccionado). */
export function navigateAgendamientoInteligente(navigation, { vehicle, descripcion = '' } = {}) {
  if (!vehicle?.id) return;
  navigation.navigate(ROUTES.CREAR_SOLICITUD, {
    vehicle,
    descripcionPrellenada: descripcion,
    ...inteligenteExtras(),
  });
}

/** Nueva solicitud estándar desde el home (sin sheet IA). */
export function navigateCrearSolicitudDesdeHome(navigation, { vehicle } = {}) {
  if (!vehicle?.id) return;
  navigation.navigate(ROUTES.CREAR_SOLICITUD, {
    vehicle,
    fromDashboard: true,
    ...inteligenteExtras(),
  });
}

/**
 * Tab bar central «Agendar»: abre CrearSolicitud con el vehículo elegido en el panel.
 */
export function navigateAgendarDesdeTab(rootNavigation, userId, queryClient, panelVehicle = null) {
  if (!rootNavigation?.navigate) return;

  const vehicle = resolveVehicleParaAgendar(userId, queryClient, panelVehicle);

  if (vehicle?.id) {
    rootNavigation.navigate(ROUTES.CREAR_SOLICITUD, {
      vehicle,
      fromDashboard: true,
      ...inteligenteExtras(),
    });
    return;
  }

  rootNavigation.navigate(ROUTES.CREAR_SOLICITUD, {
    fromDashboard: true,
    ...inteligenteExtras(),
  });
}
