/**
 * Catálogo de servicios — paso 1 nueva solicitud.
 * Unión especialista + multimarca (datos desde GET por_modelo / por vehículo).
 */
import {
  filtrarServiciosConProveedores,
  servicioTieneProveedoresAsociados,
} from './servicioProveedores';

export { servicioTieneProveedoresAsociados };

/**
 * Servicios con al menos una oferta activa de especialista o multimarca.
 */
export function prepararServiciosPaso1NuevaSolicitud(servicios) {
  const list = Array.isArray(servicios) ? servicios : [];
  return filtrarServiciosConProveedores(list);
}

export function contarCoberturaProveedoresEnCatalogo(servicios) {
  const list = prepararServiciosPaso1NuevaSolicitud(servicios);
  let conMultimarca = 0;
  let soloEspecialista = 0;
  list.forEach((s) => {
    const od = s?.ofertas_disponibles || {};
    const mm = Number(od.multimarca) || 0;
    const esp = Number(od.especialistas) || 0;
    if (mm > 0) conMultimarca += 1;
    if (esp > 0 && mm === 0) soloEspecialista += 1;
  });
  return {
    total: list.length,
    conMultimarca,
    soloEspecialista,
    conAmbosTipos: list.filter((s) => {
      const od = s?.ofertas_disponibles || {};
      return (Number(od.multimarca) || 0) > 0 && (Number(od.especialistas) || 0) > 0;
    }).length,
  };
}

export function mensajeCoberturaPaso1(cobertura) {
  if (!cobertura?.total) {
    return 'No hay servicios con proveedores disponibles para tu vehículo en este momento.';
  }
  if (cobertura.conMultimarca > 0 && cobertura.soloEspecialista > 0) {
    return 'Incluye servicios de especialistas en tu marca y de talleres o mecánicos multimarca. En el comparador verás recomendados por marca, distancia y precio.';
  }
  if (cobertura.conMultimarca > 0) {
    return 'Catálogo con proveedores multimarca. En el comparador verás opciones cercanas y precio.';
  }
  return 'Servicios con especialistas para la marca de tu vehículo. En el comparador verás los más recomendados.';
}
