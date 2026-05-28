/**
 * Tiempos de ejecución desde catálogo del proveedor (duracion_min/max en detalles).
 */

function parseMinutos(val) {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function parseTimedeltaToMinutos(val) {
  if (!val) return null;
  const s = String(val);
  const match = s.match(/(\d+):(\d+):(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export function resolveDuracionLineaServicio(detalle) {
  if (!detalle) return null;
  const min = parseMinutos(detalle.duracion_minima_minutos);
  const max = parseMinutos(detalle.duracion_maxima_minutos);
  if (min == null && max == null) {
    const fromTd = parseTimedeltaToMinutos(detalle.tiempo_estimado);
    if (fromTd == null) return null;
    return {
      minutosMin: fromTd,
      minutosMax: fromTd,
      minutosPromedio: fromTd,
    };
  }
  const minEff = min ?? max;
  const maxEff = max ?? min;
  const promedio = Math.round((minEff + maxEff) / 2);
  return {
    minutosMin: minEff,
    minutosMax: maxEff,
    minutosPromedio: promedio,
  };
}

export function aggregateDuracionOferta(oferta) {
  const detalles = oferta?.detalles_servicios_detail || oferta?.detalles_servicios;
  if (!Array.isArray(detalles) || detalles.length === 0) {
    return null;
  }
  let minSum = 0;
  let maxSum = 0;
  let hasAny = false;
  const lineas = [];

  detalles.forEach((d) => {
    const dur = resolveDuracionLineaServicio(d);
    if (!dur) return;
    hasAny = true;
    minSum += dur.minutosMin;
    maxSum += dur.minutosMax;
    lineas.push({
      id: d.id ?? d.servicio,
      nombre: d.servicio_nombre || d.servicio?.nombre || 'Servicio',
      ...dur,
    });
  });

  if (!hasAny) return null;

  const promedioTotal = Math.round((minSum + maxSum) / 2);
  return {
    minutosMinTotal: minSum,
    minutosMaxTotal: maxSum,
    minutosPromedioTotal: promedioTotal,
    lineas,
  };
}

export function formatMinutosDuracion(minutos) {
  const m = Math.round(Number(minutos) || 0);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (r === 0) return `${h} h`;
  return `${h} h ${r} min`;
}

export function formatRangoDuracion(minutosMin, minutosMax) {
  const a = parseMinutos(minutosMin);
  const b = parseMinutos(minutosMax);
  if (a == null && b == null) return null;
  if (a != null && b != null && a !== b) {
    return `${formatMinutosDuracion(a)} – ${formatMinutosDuracion(b)}`;
  }
  return formatMinutosDuracion(a ?? b);
}

function normalizarHora(hora) {
  if (!hora) return null;
  const s = String(hora).trim();
  if (!s) return null;
  const parts = s.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] ?? '0', 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function sumarMinutosAHora(horaStr, minutos) {
  const base = normalizarHora(horaStr);
  if (!base) return null;
  const [h, m] = base.split(':').map((x) => parseInt(x, 10));
  const total = h * 60 + m + Math.round(Number(minutos) || 0);
  const nh = Math.floor(total / 60) % 24;
  const nm = ((total % 60) + 60) % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

/**
 * Hora de inicio: preferencia del cliente salvo fecha alternativa del proveedor.
 */
export function resolveHoraInicioServicio(solicitud, oferta) {
  const esAlt = oferta?.es_fecha_alternativa === true;
  if (esAlt && oferta?.hora_disponible) {
    return normalizarHora(oferta.hora_disponible);
  }
  return (
    normalizarHora(solicitud?.hora_preferida)
    || normalizarHora(oferta?.hora_disponible)
  );
}

export function buildVentanaTiemposEstimados(solicitud, oferta) {
  const agg = aggregateDuracionOferta(oferta);
  if (!agg) return null;

  const horaInicio = resolveHoraInicioServicio(solicitud, oferta);
  const horaFinPromedio = horaInicio
    ? sumarMinutosAHora(horaInicio, agg.minutosPromedioTotal)
    : null;
  const horaFinMin = horaInicio
    ? sumarMinutosAHora(horaInicio, agg.minutosMinTotal)
    : null;
  const horaFinMax = horaInicio
    ? sumarMinutosAHora(horaInicio, agg.minutosMaxTotal)
    : null;

  return {
    ...agg,
    horaInicio,
    horaFinPromedio,
    horaFinMin,
    horaFinMax,
    rangoDuracionTexto: formatRangoDuracion(
      agg.minutosMinTotal,
      agg.minutosMaxTotal,
    ),
  };
}

export function formatDurationFromTimedelta(duration) {
  if (!duration) return null;
  const s = String(duration);
  const match = s.match(/(\d+):(\d+):(\d+)/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const total = hours * 60 + mins;
    return formatMinutosDuracion(total);
  }
  return s;
}
