export const HISTOGRAM_BUCKETS = 40;

/**
 * Distribución estilo Airbnb (colina) centrada en el valor del auto.
 * Si hay histograma real del backend, se usa; si no, se sintetiza desde el rango GetAPI.
 */
export function resolvePriceHistogram({
  histogram = [],
  valorReal = 0,
  rangoMin = 0,
  rangoMax = 0,
  buckets = HISTOGRAM_BUCKETS,
}) {
  if (Array.isArray(histogram) && histogram.length > 0) {
    return { buckets: histogram, origen: 'mercado' };
  }
  return {
    buckets: buildMountainHistogram(valorReal, rangoMin, rangoMax, buckets),
    origen: 'estimado',
  };
}

export function buildMountainHistogram(valorReal, rangoMin, rangoMax, buckets = HISTOGRAM_BUCKETS) {
  const valor = Number(valorReal) || 0;
  if (valor <= 0) return [];

  const lo = Number(rangoMin) > 0 ? Number(rangoMin) : Math.round(valor * 0.82);
  const hi = Number(rangoMax) > 0 ? Number(rangoMax) : Math.round(valor * 1.18);
  // Ampliar un poco fuera del rango probable para que las barras grises
  // fuera del selection se vean como en Airbnb.
  const pad = Math.round((hi - lo) * 0.35);
  const axisLo = Math.max(0, lo - pad);
  const axisHi = hi + pad;
  const span = Math.max(axisHi - axisLo, 1);
  const step = Math.max(1, Math.floor(span / buckets));
  const center = valor;
  const sigma = Math.max(span / 5.5, step * 2.2);

  const raw = [];
  for (let i = 0; i < buckets; i += 1) {
    const edgeLo = axisLo + i * step;
    const edgeHi = i === buckets - 1 ? axisHi : edgeLo + step;
    const mid = (edgeLo + edgeHi) / 2;
    const gaussian = Math.exp(-0.5 * ((mid - center) / sigma) ** 2);
    // Ruido leve para que no se vea una campana perfecta (más “Airbnb”)
    const jitter = 0.85 + ((i * 17) % 7) * 0.03;
    raw.push({ edgeLo, edgeHi, gaussian: gaussian * jitter });
  }

  const maxG = Math.max(...raw.map((b) => b.gaussian), 0.01);
  return raw.map((b) => ({
    bucket_start: b.edgeLo,
    bucket_end: b.edgeHi,
    count: Math.round(b.gaussian * 100),
    normalized: Number((b.gaussian / maxG).toFixed(3)),
    is_user_bucket: b.edgeLo <= valor && valor < b.edgeHi,
  }));
}

export function formatCLP(value) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatCompactMillions(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

/**
 * Ajusta la tasa anual de depreciación según salud del vehículo.
 * Salud alta protege valor (baja la tasa); salud baja acelera la pérdida.
 */
export function adjustRateByHealth(tasaAnualPct, healthScore) {
  const tasa = Number(tasaAnualPct);
  if (!Number.isFinite(tasa)) return 7;
  const health = Math.max(0, Math.min(100, Number(healthScore) || 70));
  // 100 salud → ~0.55x tasa; 70 → 1.0x; 40 → ~1.35x; 0 → ~1.6x
  const factor = 1.6 - (health / 100) * 1.05;
  return Number((tasa * factor).toFixed(2));
}

export function projectValueAtYears(valorHoy, tasaAnualPct, years) {
  const valor = Number(valorHoy) || 0;
  if (valor <= 0) return 0;
  const rate = (Number(tasaAnualPct) || 0) / 100;
  return Math.max(0, Math.round(valor * (1 - rate) ** years));
}

export function projectValueAtMonths(valorHoy, tasaAnualPct, months) {
  return projectValueAtYears(valorHoy, tasaAnualPct, Number(months) / 12);
}

/**
 * Trayectoria de PRECIO (no demanda): cuándo el valor proyectado
 * caería dentro del rango elegido. No afirma “mejor momento de vender”.
 */
export function buildPricePathInsight({
  valorHoy,
  tasaAnualPct,
  minPrice,
  maxPrice,
  maxMonths = 36,
}) {
  const valor = Number(valorHoy) || 0;
  const min = Number(minPrice) || 0;
  const max = Number(maxPrice) || 0;
  const tasa = Number(tasaAnualPct) || 0;

  if (valor <= 0 || max <= min) {
    return { kind: 'none', title: '', detail: '', months: null };
  }

  const inRangeNow = valor >= min && valor <= max;
  if (inRangeNow) {
    return {
      kind: 'in_range',
      title: 'Tu valor de hoy está en este rango',
      detail: 'Eso es precio objetivo, no demanda. Mira la señal de mercado abajo para decidir si vender ya.',
      months: 0,
      midPrice: Math.round((min + max) / 2),
    };
  }

  let hitMonth = null;
  for (let m = 1; m <= maxMonths; m += 1) {
    const v = projectValueAtMonths(valor, tasa, m);
    if (v >= min && v <= max) {
      hitMonth = m;
      break;
    }
  }

  if (hitMonth != null) {
    const label =
      hitMonth < 12
        ? `~${hitMonth} mes${hitMonth === 1 ? '' : 'es'}`
        : `~${(hitMonth / 12).toFixed(1).replace('.0', '')} años`;
    return {
      kind: 'path',
      title: `Tu valor llegaría a este rango en ${label}`,
      detail: 'Proyección por depreciación/salud. No indica si habrá más o menos compradores ese mes.',
      months: hitMonth,
      midPrice: Math.round((min + max) / 2),
    };
  }

  if (valor > max && tasa >= 0) {
    for (let m = 1; m <= maxMonths; m += 1) {
      if (projectValueAtMonths(valor, tasa, m) <= max) {
        const label = m < 12 ? `~${m}m` : `~${(m / 12).toFixed(1)}a`;
        return {
          kind: 'path',
          title: `Bajaría a tu máximo en ${label}`,
          detail: 'Solo trayectoria de precio. La demanda puede cambiar antes.',
          months: m,
          midPrice: max,
        };
      }
    }
  }

  if (valor < min && tasa > 0) {
    return {
      kind: 'unreachable',
      title: 'Ese mínimo no se alcanza depreciando',
      detail: 'El valor tiende a bajar, no a subir hacia ese piso. Ajusta el rango.',
      months: null,
      midPrice: min,
    };
  }

  if (valor < min && tasa <= 0) {
    return {
      kind: 'unreachable',
      title: 'Rango por encima de la proyección',
      detail: 'Con la tasa actual no llegarías a ese mínimo. Baja el mínimo o mejora salud.',
      months: null,
      midPrice: min,
    };
  }

  return {
    kind: 'info',
    title: 'Fuera de trayectoria',
    detail: 'Mueve el rango para ver cuándo tu valor proyectado lo cruzaría.',
    months: null,
    midPrice: Math.round((min + max) / 2),
  };
}

/** @deprecated alias — usar buildPricePathInsight */
export function buildSellTimingInsight(args) {
  return buildPricePathInsight(args);
}

export function buildHorizonChips(valorHoy, tasaAnualPct) {
  const horizons = [
    { key: '0', label: 'Hoy', months: 0 },
    { key: '6', label: '6m', months: 6 },
    { key: '12', label: '1a', months: 12 },
    { key: '36', label: '3a', months: 36 },
  ];
  return horizons.map((h) => ({
    ...h,
    valor: projectValueAtMonths(valorHoy, tasaAnualPct, h.months),
  }));
}
