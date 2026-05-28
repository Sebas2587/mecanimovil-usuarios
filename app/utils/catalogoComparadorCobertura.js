/**
 * Cobertura de marca (especialista vs multimarca) en comparador de catálogo.
 */
import { isProviderMultimarca } from './providerUtils';

export function resolveMarcaVehiculoNombre(vehiculo) {
  if (!vehiculo) return null;
  const nombre =
    vehiculo.marca_nombre
    || vehiculo.marca?.nombre
    || (typeof vehiculo.marca === 'string' ? vehiculo.marca : null);
  const t = nombre != null ? String(nombre).trim() : '';
  return t || null;
}

export function isCandidatoCatalogoMultimarca(candidatoOrOferta) {
  if (!candidatoOrOferta) return false;
  const proveedor = candidatoOrOferta.proveedor || candidatoOrOferta;
  return isProviderMultimarca({
    ...proveedor,
    tipo_cobertura_marca:
      candidatoOrOferta.tipo_cobertura_marca
      ?? proveedor.tipo_cobertura_marca,
    _esMultimarca: candidatoOrOferta._esMultimarca ?? proveedor._esMultimarca,
  });
}

export function getCoberturaMarcaBadge(candidatoOrOferta, marcaVehiculoNombre) {
  const esMultimarca = isCandidatoCatalogoMultimarca(candidatoOrOferta);
  if (esMultimarca) {
    return {
      variant: 'multimarca',
      label: 'Multimarca',
      hint: 'Atiende todas las marcas',
    };
  }
  const marca = marcaVehiculoNombre?.trim();
  return {
    variant: 'especialista',
    label: marca ? `Especialista ${marca}` : 'Especialista',
    hint: marca ? `Enfocado en ${marca}` : 'Especialista en tu marca',
  };
}

export function partitionOfertasPorCoberturaMarca(ofertas) {
  const list = Array.isArray(ofertas) ? ofertas : [];
  const especialistas = [];
  const multimarca = [];
  list.forEach((oferta) => {
    if (isCandidatoCatalogoMultimarca(oferta)) multimarca.push(oferta);
    else especialistas.push(oferta);
  });
  return { especialistas, multimarca };
}

export function tituloGrupoEspecialistas(marcaVehiculoNombre) {
  const m = marcaVehiculoNombre?.trim();
  return m ? `Especialistas en ${m}` : 'Especialistas en tu marca';
}

export function subtituloGrupoEspecialistas(marcaVehiculoNombre, radioKm) {
  const m = marcaVehiculoNombre?.trim();
  const radio = radioKm != null ? Math.round(Number(radioKm)) : null;
  const zona = radio ? `, a hasta ${radio} km` : '';
  return m
    ? `Talleres y mecánicos especializados en ${m}${zona}.`
    : `Proveedores enfocados en la marca de tu vehículo${zona}.`;
}

export function tituloGrupoMultimarca() {
  return 'Proveedores multimarca';
}

export function subtituloGrupoMultimarca(marcaVehiculoNombre, radioKm) {
  const m = marcaVehiculoNombre?.trim();
  const radio = radioKm != null ? Math.round(Number(radioKm)) : null;
  const zona = radio ? `, a hasta ${radio} km` : '';
  return m
    ? `Atienden ${m} y otras marcas con el mismo servicio${zona}.`
    : `Atienden vehículos de cualquier marca${zona}.`;
}
