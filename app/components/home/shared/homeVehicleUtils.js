export function resolveVehicleMarcaId(vehicle) {
  if (!vehicle) return null;
  if (typeof vehicle.marca === 'number') return vehicle.marca;
  if (vehicle.marca && typeof vehicle.marca === 'object' && vehicle.marca.id != null) {
    return Number(vehicle.marca.id);
  }
  if (vehicle.marca_id != null) return Number(vehicle.marca_id);
  return null;
}

export function coordsFromSavedAddress(addr) {
  if (!addr?.ubicacion?.coordinates || addr.ubicacion.coordinates.length < 2) return null;
  const [lng, lat] = addr.ubicacion.coordinates;
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  return { lat: la, lng: lo };
}
