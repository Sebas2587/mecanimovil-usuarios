import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import {
  adjustRateByHealth,
  projectValueAtMonths,
  formatCLP,
} from '../../utils/vehicleValueChart';

const LIQUIDEZ = {
  facil: { label: 'Fácil de vender', color: COLORS.success.main, bg: COLORS.success.light },
  moderado: { label: 'Venta moderada', color: COLORS.warning.main, bg: COLORS.warning.light },
  dificil: { label: 'Difícil de vender', color: COLORS.error.main, bg: COLORS.error.light },
  calculando: { label: 'Midiendo demanda', color: COLORS.text.secondary, bg: COLORS.neutral.gray[100] },
};

function formatDeltaPct(vsHoy, base) {
  if (!base) return null;
  const pct = (vsHoy / base) * 100;
  if (Math.abs(pct) < 0.15) return { text: 'estable', color: COLORS.text.tertiary };
  const sign = pct > 0 ? '+' : '';
  return {
    text: `${sign}${pct.toFixed(1)}%`,
    color: pct > 0 ? COLORS.success.main : COLORS.error.main,
  };
}

/**
 * Fila Hoy / 1 año / 3 años. Usa `proyeccion` del backend cuando existe;
 * si no, estima localmente con tasa + salud.
 */
export function VehicleValueHorizonRow({
  valorHoy,
  tasaAnualPct,
  healthScore,
  fuenteTasa,
  proyeccion,
}) {
  const items = useMemo(() => {
    const hoy = Number(valorHoy) || 0;
    const porOffset = {};
    if (Array.isArray(proyeccion)) {
      proyeccion.forEach((p) => {
        if (p && typeof p.anio_offset === 'number') porOffset[p.anio_offset] = p;
      });
    }
    if (porOffset[1] && porOffset[3]) {
      const items = [
        { key: '0', label: 'Hoy', valor: hoy, saludFuente: porOffset[0]?.salud_fuente },
        {
          key: '1',
          label: 'En 1 año',
          valor: Number(porOffset[1].valor) || 0,
          saludFuente: porOffset[1].salud_fuente,
        },
      ];
      if (porOffset[2]) {
        items.push({
          key: '2',
          label: 'En 2 años',
          valor: Number(porOffset[2].valor) || 0,
          saludFuente: porOffset[2].salud_fuente,
        });
      }
      items.push({
        key: '3',
        label: 'En 3 años',
        valor: Number(porOffset[3].valor) || 0,
        saludFuente: porOffset[3].salud_fuente,
      });
      // En cards compactas preferimos Hoy / 1a / 3a (sin saturar).
      return items.filter((it) => it.key !== '2');
    }
    // Fallback sin proyección real del backend: tasa fija estimada localmente.
    const base = tasaAnualPct ?? 7;
    const tasaFallback = String(fuenteTasa || '').includes('salud')
      ? Number(base)
      : adjustRateByHealth(base, healthScore);
    return [
      { key: '0', label: 'Hoy', valor: hoy },
      { key: '6', label: '6 meses', valor: projectValueAtMonths(hoy, tasaFallback, 6) },
      { key: '12', label: '1 año', valor: projectValueAtMonths(hoy, tasaFallback, 12) },
    ];
  }, [valorHoy, proyeccion, tasaAnualPct, healthScore, fuenteTasa]);

  if (!valorHoy) return null;

  return (
    <View style={styles.horizonBlock}>
      <View style={styles.horizonRow}>
        {items.map((item, idx) => {
          const vsHoy = item.valor - items[0].valor;
          const delta = idx > 0 ? formatDeltaPct(vsHoy, items[0].valor) : null;
          let Trend = Minus;
          let trendColor = COLORS.text.tertiary;
          if (idx > 0 && delta) {
            if (vsHoy < -1000) {
              Trend = TrendingDown;
              trendColor = COLORS.error.main;
            } else if (vsHoy > 1000) {
              Trend = TrendingUp;
              trendColor = COLORS.success.main;
            }
          }
          return (
            <View key={item.key} style={styles.horizonChip}>
              <Text style={styles.horizonLabel}>{item.label}</Text>
              <View style={styles.horizonValueRow}>
                {idx > 0 ? <Trend size={12} color={trendColor} strokeWidth={2.5} /> : null}
                <Text
                  style={styles.horizonValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {formatCLP(item.valor)}
                </Text>
              </View>
              {delta ? (
                <Text style={[styles.horizonDelta, { color: delta.color }]} numberOfLines={1}>
                  {delta.text}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Chip de liquidez / scrape en una sola línea.
 * Sin comparables de mercado no hay señal real que mostrar (estado permanente
 * por ahora): se omite el chip en vez de exhibir un badge de "estimado".
 */
export function VehicleLiquidityChip({ liquidez, scrape, nComparables = 0 }) {
  const label = liquidez?.label || 'calculando';
  const cfg = LIQUIDEZ[label] || LIQUIDEZ.calculando;
  const scrapeActive = scrape?.state === 'pending' || scrape?.state === 'running';
  const pct = Math.max(0, Math.min(100, Number(scrape?.progress_pct) || 0));
  const hasScore = typeof liquidez?.score === 'number';

  if (!scrapeActive && !hasScore && nComparables <= 0) return null;

  let text = cfg.label;
  if (scrapeActive) {
    text = `Buscando mercado ${pct}%`;
  } else if (label === 'calculando' && nComparables > 0) {
    text = `Demanda aproximada · ${nComparables} avisos`;
  } else if (hasScore) {
    text = `${cfg.label} · ${liquidez.score}/100`;
  }

  return (
    <View style={[styles.chip, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.chipText, { color: cfg.color }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

/**
 * Línea con las fuentes de mercado usadas. Sin comparables no agrega valor
 * repetir un disclaimer — se omite para mantener la card minimalista.
 */
export function VehicleMarketSourcesLine({ meta }) {
  const n = meta?.n_comparables || 0;
  const fuentes = meta?.fuentes || [];
  if (n <= 0) return null;
  const names = fuentes
    .filter((f) => f !== 'getapi')
    .map((f) => (f === 'mercadolibre' ? 'MercadoLibre' : f === 'chileautos' ? 'Chileautos' : f));
  const src = names.length ? names.join(' · ') : 'mercado';
  return (
    <Text style={styles.sources}>
      {n} avisos {src}
      {meta?.n_semanas_tracking ? ` · ${meta.n_semanas_tracking} sem.` : ''}
    </Text>
  );
}

const styles = StyleSheet.create({
  horizonBlock: {
    marginTop: SPACING.sm,
  },
  horizonRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  horizonChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: 2,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  horizonLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
  },
  horizonValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  horizonValue: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  horizonDelta: {
    ...TYPOGRAPHY.styles.caption,
    marginTop: 2,
    fontSize: 11,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
    marginTop: SPACING.sm,
  },
  chipText: {
    ...TYPOGRAPHY.styles.captionBold,
  },
  sources: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
});
