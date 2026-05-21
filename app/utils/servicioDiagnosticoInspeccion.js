/**
 * Servicios de diagnóstico / inspección no requieren elegir con/sin repuestos.
 */

const PALABRAS_DIAGNOSTICO = [
  'diagnóstico',
  'diagnostico',
  'inspección',
  'inspeccion',
  'revisión',
  'revision',
  'evaluación',
  'evaluacion',
];

function normalizarTexto(value) {
  return String(value || '').toLowerCase().trim();
}

function textoIndicaDiagnostico(texto) {
  const t = normalizarTexto(texto);
  if (!t) return false;
  return PALABRAS_DIAGNOSTICO.some((p) => t.includes(p));
}

function resolverCategoriaNombre(servicio, context = {}) {
  if (!servicio || typeof servicio !== 'object') return '';

  let nombre = servicio.categoria_nombre || servicio.categoria || '';

  const cats = servicio.categorias_completas || servicio.categorias_info;
  if (!nombre && Array.isArray(cats) && cats.length > 0) {
    nombre = cats[0]?.nombre || '';
  }

  if (!nombre && servicio.categoria_id && Array.isArray(context.categorias)) {
    const cat = context.categorias.find((c) => c.id === servicio.categoria_id);
    nombre = cat?.nombre || '';
  }

  if (!nombre && servicio.id && Array.isArray(context.serviciosDisponibles)) {
    const completo = context.serviciosDisponibles.find(
      (s) => String(s.id) === String(servicio.id),
    );
    if (completo) {
      nombre = completo.categoria_nombre || completo.categoria || '';
      if (!nombre && completo.categorias_ids?.length && context.categorias) {
        const cat = context.categorias.find((c) => c.id === completo.categorias_ids[0]);
        nombre = cat?.nombre || '';
      }
      if (!nombre && completo.categorias_info?.[0]?.nombre) {
        nombre = completo.categorias_info[0].nombre;
      }
    }
  }

  return normalizarTexto(nombre);
}

/** true si el servicio es de diagnóstico o inspección. */
export function esServicioDiagnosticoInspeccion(servicio, context = {}) {
  if (!servicio) return false;
  if (servicio.es_diagnostico === true) return true;

  const categoria = resolverCategoriaNombre(servicio, context);
  if (textoIndicaDiagnostico(categoria)) return true;

  const nombre = normalizarTexto(servicio.nombre || servicio.nombre_servicio);
  if (textoIndicaDiagnostico(nombre)) return true;

  return false;
}

/** true si todos los servicios seleccionados son diagnóstico/inspección. */
export function todosServiciosSonDiagnosticoInspeccion(servicios, context = {}) {
  const lista = Array.isArray(servicios) ? servicios.filter(Boolean) : [];
  if (lista.length === 0) return false;
  return lista.every((s) => esServicioDiagnosticoInspeccion(s, context));
}
