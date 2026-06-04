import { getMainAddress } from '../services/location';
import { resolveVehicleParaAgendar } from './vehiclePanelContext';
import { esServicioDiagnosticoInspeccion } from './servicioDiagnosticoInspeccion';
import {
  buildProviderForSolicitud,
  catalogoIncluyeRepuestos,
  mapOfertaCatalogoParaSolicitud,
  resolveServicioId,
} from '../components/home/shared/providerCatalogSchedule';

/**
 * Defaults inteligentes para el wizard, **después** de que el usuario elige servicio
 * (y opcionalmente proveedor). No infiere servicio desde salud/trending.
 */
export async function buildAgendamientoSmartDefaults({
  userId,
  queryClient,
  vehicle = null,
  servicio = null,
  provider = null,
  providerType = null,
  descripcion = '',
  urgencia = 'normal',
}) {
  const vehiculo = resolveVehicleParaAgendar(userId, queryClient, vehicle);
  const direccion_usuario = await getMainAddress();

  let servicioMapeado = servicio;
  let proveedorNorm = null;
  if (provider && servicio) {
    proveedorNorm = buildProviderForSolicitud(provider, providerType || provider?._panelKind);
    const tipo = proveedorNorm._panelKind === 'taller' ? 'taller' : 'mecanico';
    servicioMapeado = mapOfertaCatalogoParaSolicitud(servicio, proveedorNorm, tipo, vehiculo);
  }

  const servicioId = resolveServicioId(servicioMapeado || servicio);
  const servicios_seleccionados = servicioId
    ? [servicioMapeado || { id: servicioId, nombre: servicio?.nombre || 'Servicio' }]
    : [];

  let requiere_repuestos = true;
  if (servicios_seleccionados[0]) {
    requiere_repuestos = esServicioDiagnosticoInspeccion(servicios_seleccionados[0])
      ? false
      : catalogoIncluyeRepuestos(servicios_seleccionados[0]);
  }

  const descripcionTrim = String(descripcion || '').trim();
  const nombreServicio = servicios_seleccionados[0]?.nombre || 'servicio';
  const descripcion_problema = descripcionTrim || `Solicitud de ${nombreServicio}`;

  return {
    vehiculo,
    servicios_seleccionados,
    descripcion_problema,
    urgencia: urgencia || 'normal',
    requiere_repuestos,
    tipo_solicitud: proveedorNorm ? 'dirigida' : 'global',
    proveedores_dirigidos: proveedorNorm ? [proveedorNorm] : [],
    direccion_usuario,
    direccion_servicio_texto: direccion_usuario?.direccion || '',
    detalles_ubicacion: '',
    fecha_preferida: '',
    hora_preferida: '',
    ubicacion_servicio: direccion_usuario?.ubicacion || null,
    fotos_necesidad: [],
    tipo_proveedor_preseleccionado: proveedorNorm?._panelKind === 'taller' ? 'taller' : 'mecanico',
  };
}
