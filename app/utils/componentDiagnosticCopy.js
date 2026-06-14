import { formatHealthActionWindow } from './healthFormat';
import {
  resolveAlertLevel,
  resolveHealthComponentKey,
  resolveKmRestantes,
  resolveMaintenanceIntervalHint,
} from '../components/home/shared/homeHealthRecommendations';

function normalizeDiagnosticText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Acepta "40000", "40,000", "40.000" o número. */
function parseKmNumber(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const cleaned = String(raw).replace(/[^\d]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveComponentVidaUtilKm(comp) {
  return (
    parseKmNumber(comp?.vida_util_proyectada)
    ?? parseKmNumber(comp?.vida_util_total)
    ?? null
  );
}

function formatKmLabel(km) {
  const n = parseKmNumber(km);
  return n != null ? `${n.toLocaleString('es-CL')} km` : null;
}

/** Extrae estimación por ciclos (sin mostrar el párrafo crudo). */
function extractCycleInsight(mensaje, comp) {
  const text = normalizeDiagnosticText(mensaje);
  if (!text) return null;

  const ciclosMatch = text.match(
    /~(\d+)\s*ciclos?\s*previos?\s*estimados?\s*de\s*([\d.,]+)\s*km/i,
  );
  if (ciclosMatch) {
    const count = ciclosMatch[1];
    const km =
      parseKmNumber(ciclosMatch[2])
      ?? resolveComponentVidaUtilKm(comp);
    const kmLabel = formatKmLabel(km);
    if (kmLabel) {
      return `Consideramos ~${count} ciclos de uso previo (referencia: cada ${kmLabel}).`;
    }
    return `Consideramos ~${count} ciclos de uso previo según el kilometraje acumulado del vehículo.`;
  }

  if (/estimaci[oó]n conservadora/i.test(text)) {
    const kmLabel = formatKmLabel(resolveComponentVidaUtilKm(comp));
    if (kmLabel) {
      return `Estimación conservadora según vida útil de ${kmLabel}.`;
    }
    return 'Estimación conservadora según el kilometraje actual del vehículo.';
  }

  return null;
}

/** Extrae aviso de intervalo por tiempo desde mensajes del motor. */
function extractTimeInsight(...sources) {
  for (const raw of sources) {
    const text = normalizeDiagnosticText(raw);
    const match = text.match(/intervalo por tiempo\s*\(~(\d+)\s*meses?\s*desde[^.)]*\)/i);
    if (match) {
      return `Han pasado ~${match[1]} meses desde el último servicio; el tiempo también influye en el desgaste.`;
    }
  }
  return null;
}

/** Extrae aviso de antigüedad desde mensajes del motor (sin mostrar el párrafo completo). */
function extractAgeInsight(...sources) {
  for (const raw of sources) {
    const text = normalizeDiagnosticText(raw);
    if (!text) continue;

    const ultimoCambio = text.match(/[ÚU]ltimo cambio hace ~?(\d+)\s*años/i);
    if (ultimoCambio) {
      const years = ultimoCambio[1];
      const maxMatch = text.match(/m[aá]ximo recomendado (\d+) a[nñ]os/i);
      if (maxMatch) {
        return `Último cambio registrado hace ~${years} años. Se recomienda revisar cada ${maxMatch[1]} años.`;
      }
      return `Último cambio registrado hace ~${years} años. Conviene revisar por antigüedad.`;
    }

    const vehiculoAnios = text.match(/veh[ií]culo de (\d+) a[nñ]os/i);
    if (vehiculoAnios && /sin registro de cambio|supera su vida/i.test(text)) {
      const maxMatch = text.match(/m[aá]ximo recomendado (\d+) a[nñ]os/i);
      if (maxMatch) {
        return `Auto de ${vehiculoAnios[1]} años sin registro de cambio. Referencia: cada ${maxMatch[1]} años.`;
      }
      return `Auto de ${vehiculoAnios[1]} años sin registro de cambio en este componente.`;
    }
  }
  return null;
}

function resolveHistorialConfianza(comp) {
  if (comp?.confianza_historial) return comp.confianza_historial;
  const fuente = comp?.historial_fuente;
  if (fuente === 'CHECKLIST' || fuente === 'REGISTRO_INICIAL') return 'alta';
  if (fuente === 'USUARIO_DECLARADO') return 'media';
  if (comp?.historial_conocido === false) return 'baja';
  return 'alta';
}

/**
 * Secciones legibles para el modal de detalle (evita el párrafo crudo de mensaje_alerta).
 * @returns {Array<{ id: string, title: string, text: string }>}
 */
export function buildComponentDiagnosticInsights(comp, prediction = null) {
  if (!comp) return [];

  const compKey = resolveHealthComponentKey(comp);
  const confianza = resolveHistorialConfianza(comp);
  const historialConocido = comp.historial_conocido !== false;
  const scheduleLine = resolveMaintenanceIntervalHint(compKey);
  const rawMessage = comp.mensaje_alerta || comp.mensaje;
  const sections = [];

  if (!historialConocido || confianza === 'baja') {
    const cycleText = extractCycleInsight(rawMessage, comp);
    let text = 'Estimamos el desgaste con el kilometraje actual y la vida útil típica del componente.';
    if (cycleText) {
      text = `${text} ${cycleText}`;
    } else {
      text = `${text} Aún no hay un cambio registrado en tu historial.`;
    }
    sections.push({
      id: 'method',
      title: 'Cómo lo calculamos',
      text,
    });
  } else if (confianza === 'alta') {
    sections.push({
      id: 'method',
      title: 'Cómo lo calculamos',
      text: 'Basado en tu último servicio registrado y el kilometraje recorrido desde entonces.',
    });
  } else if (confianza === 'media') {
    sections.push({
      id: 'method',
      title: 'Cómo lo calculamos',
      text: 'Usamos el kilometraje que declaraste en tu último servicio. Un taller puede confirmarlo para mayor precisión.',
    });
  }

  if (scheduleLine) {
    sections.push({
      id: 'interval',
      title: 'Revisión periódica',
      text: scheduleLine,
    });
  }

  const timeText = extractTimeInsight(rawMessage, prediction?.recomendacion);
  if (timeText) {
    sections.push({
      id: 'time',
      title: 'Uso por tiempo',
      text: timeText,
    });
  }

  const ageText = extractAgeInsight(rawMessage, prediction?.recomendacion);
  if (ageText) {
    sections.push({
      id: 'age',
      title: 'Antigüedad',
      text: ageText,
    });
  }

  return sections;
}

/** Resumen corto para descripciones de solicitud (sin párrafo del motor). */
export function buildShortDiagnosticSummary(comp, prediction = null) {
  const compLevel = resolveAlertLevel(comp);
  const compHealth = comp.salud_porcentaje ?? comp.salud ?? 0;
  const compKey = resolveHealthComponentKey(comp);
  const km = resolveKmRestantes(comp, prediction);
  const days = prediction?.dias_hasta_atencion ?? null;
  const parts = [];

  if (compLevel === 'CRITICO' || compHealth < 10 || (km != null && Number(km) <= 0)) {
    parts.push('Revisión urgente recomendada');
  } else {
    const window = formatHealthActionWindow({ km, days });
    if (window) parts.push(`Próxima revisión: ${window}`);
  }

  const schedule = resolveMaintenanceIntervalHint(compKey);
  if (schedule) parts.push(schedule);

  return parts.join(' · ');
}
