/**
 * Vehículo activo del cliente: ruta explícita > selección del panel home > fallback.
 */

export function resolveVehiclePanelSeleccionado({
  vehicleFromRoute = null,
  vehicles = [],
  panelSelectedVehicleId = null,
} = {}) {
  if (vehicleFromRoute?.id) return vehicleFromRoute;

  const list = (Array.isArray(vehicles) ? vehicles : []).filter(
    (v) => v?.id && v.is_active !== false,
  );
  if (!list.length) return null;

  if (panelSelectedVehicleId != null) {
    const fromPanel = list.find((v) => v.id === panelSelectedVehicleId);
    if (fromPanel) return fromPanel;
  }

  return list.find((v) => v.is_active !== false) || list[0] || null;
}

/** Lee vehículos y selección del panel desde React Query (misma fuente que UserPanel). */
export function resolveVehicleParaAgendar(userId, queryClient, vehicleFromRoute = null) {
  if (vehicleFromRoute?.id) return vehicleFromRoute;
  if (!queryClient) return null;

  const cached =
    queryClient.getQueryData(['userVehicles', userId])
    ?? queryClient.getQueryData(['userVehicles']);
  const list = Array.isArray(cached) ? cached : cached?.results || [];
  const panelSelectedId = userId
    ? queryClient.getQueryData(['panelSelectedVehicleId', userId])
    : null;

  return resolveVehiclePanelSeleccionado({
    vehicles: list,
    panelSelectedVehicleId: panelSelectedId,
  });
}
