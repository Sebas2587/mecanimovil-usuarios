import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChevronRight, TrendingDown, TrendingUp, Minus } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import { useVehicleValuationForecast } from '../../hooks/useVehicleValuationForecast';
import VehicleValueHistogramChart from './VehicleValueHistogramChart';

const LIQUIDEZ_CONFIG = {
  facil: { label: 'Fácil de vender', color: COLORS.success.main, bg: COLORS.success.light },
  moderado: { label: 'Venta moderada', color: COLORS.warning.main, bg: COLORS.warning.light },
  dificil: { label: 'Difícil de vender', color: COLORS.error.main, bg: COLORS.error.light },
  calculando: { label: 'Calculando…', color: COLORS.text.secondary, bg: COLORS.neutral.gray[100] },
};

const formatCLP = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value || 0);

/**
 * Teaser del home: valor hoy + liquidez + mini histograma.
 */
const VehicleValueTeaserCard = ({ vehicle, onPress }) => {
  const { data, isLoading, isError } = useVehicleValuationForecast(vehicle, {
    enabled: !!vehicle?.id,
  });

  const liquidez = data?.liquidez || {};
  const liquCfg = LIQUIDEZ_CONFIG[liquidez.label] || LIQUIDEZ_CONFIG.calculando;
  const proyeccion1y = useMemo(() => {
    const items = data?.proyeccion || [];
    return items.find((p) => p.anio_offset === 1) || null;
  }, [data?.proyeccion]);

  if (!vehicle?.id) return null;

  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={COLORS.primary[500]} />
        <Text style={styles.loadingText}>Calculando valor de tu auto…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
        <Text style={styles.title}>¿Cuánto vale tu auto hoy?</Text>
        <Text style={styles.errorText}>No pudimos cargar la valoración. Toca para reintentar.</Text>
      </TouchableOpacity>
    );
  }

  const valorHoy = data?.valor_real_hoy || vehicle.precio_sugerido_final || vehicle.precio_mercado_promedio || 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={`Valor estimado ${formatCLP(valorHoy)}. ${liquCfg.label}. Ver detalle.`}
    >
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>¿Cuánto vale tu auto hoy?</Text>
          <Text style={styles.value}>{formatCLP(valorHoy)}</Text>
        </View>
        <ChevronRight size={20} color={COLORS.text.tertiary} strokeWidth={2} />
      </View>

      <View style={[styles.liquidezBadge, { backgroundColor: liquCfg.bg }]}>
        <Text style={[styles.liquidezText, { color: liquCfg.color }]}>{liquCfg.label}</Text>
      </View>

      <VehicleValueHistogramChart
        histogram={data?.histograma}
        valorReal={valorHoy}
        rangoMin={data?.valor_real_rango_min}
        rangoMax={data?.valor_real_rango_max}
        confianza={data?.confianza}
        compact
        height={64}
      />

      {proyeccion1y ? (
        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>En 1 año (estimado)</Text>
          <View style={styles.footerValueRow}>
            {proyeccion1y.tendencia === 'depreciacion' ? (
              <TrendingDown size={14} color={COLORS.error.main} strokeWidth={2} />
            ) : proyeccion1y.tendencia === 'apreciacion' ? (
              <TrendingUp size={14} color={COLORS.success.main} strokeWidth={2} />
            ) : (
              <Minus size={14} color={COLORS.text.tertiary} strokeWidth={2} />
            )}
            <Text style={styles.footerValue}>{formatCLP(proyeccion1y.valor)}</Text>
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.secondary,
  },
  value: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    marginTop: 2,
  },
  liquidezBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
  },
  liquidezText: {
    ...TYPOGRAPHY.styles.captionBold,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.xxs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
  },
  footerLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  footerValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerValue: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  loadingText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  errorText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
});

export default React.memo(VehicleValueTeaserCard);
