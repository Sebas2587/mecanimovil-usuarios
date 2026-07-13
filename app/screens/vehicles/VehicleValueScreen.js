import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, TrendingDown, TrendingUp, Minus } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import { useVehicleValuationForecast } from '../../hooks/useVehicleValuationForecast';
import VehicleValueHistogramChart from '../../components/vehicle/VehicleValueHistogramChart';

const LIQUIDEZ_CONFIG = {
  facil: { label: 'Fácil de vender', color: COLORS.success.main, desc: 'Tu auto tiene buena demanda en el mercado actual.' },
  moderado: { label: 'Venta moderada', color: COLORS.warning.main, desc: 'Podrías necesitar más tiempo o ajustar el precio.' },
  dificil: { label: 'Difícil de vender', color: COLORS.error.main, desc: 'Hay mucha oferta similar o tu precio está alto.' },
  calculando: { label: 'Calculando liquidez', color: COLORS.text.secondary, desc: 'Aún recopilamos datos del mercado para tu modelo.' },
};

const formatCLP = (v) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v || 0);

const TrendIcon = ({ tendencia }) => {
  if (tendencia === 'depreciacion') return <TrendingDown size={16} color={COLORS.error.main} strokeWidth={2} />;
  if (tendencia === 'apreciacion') return <TrendingUp size={16} color={COLORS.success.main} strokeWidth={2} />;
  return <Minus size={16} color={COLORS.text.tertiary} strokeWidth={2} />;
};

const VehicleValueScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const vehicle = route.params?.vehicle;
  const vehicleId = route.params?.vehicleId || vehicle?.id;

  const { data, isLoading, isRefetching, refetch, isError } = useVehicleValuationForecast(
    vehicle || { id: vehicleId },
    { enabled: !!vehicleId },
  );

  const onRefresh = useCallback(() => refetch(), [refetch]);

  const liquidez = data?.liquidez || {};
  const liquCfg = LIQUIDEZ_CONFIG[liquidez.label] || LIQUIDEZ_CONFIG.calculando;
  const proyeccion = data?.proyeccion || [];
  const meta = data?.meta || {};

  const fuentesLabel = useMemo(() => {
    const f = meta.fuentes || [];
    if (!f.length) return 'Basado en tasación GetAPI y salud del vehículo';
    const names = f.map((x) => (x === 'mercadolibre' ? 'MercadoLibre' : x === 'chileautos' ? 'Chileautos' : 'GetAPI'));
    const n = meta.n_comparables || 0;
    return `Basado en ${n} anuncios comparables (${names.join(', ')})`;
  }, [meta]);

  const gaugeWidth = Math.min(100, Math.max(0, liquidez.score || 0));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button">
          <ArrowLeft size={22} color={COLORS.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Valor de tu auto</Text>
        <View style={styles.backBtn} />
      </View>

      {isLoading && !data ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary[500]} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={COLORS.primary[500]} />
          }
        >
          {isError ? (
            <Text style={styles.error}>No pudimos cargar la valoración. Desliza para reintentar.</Text>
          ) : null}

          <Text style={styles.heroLabel}>Valor real estimado hoy</Text>
          <Text style={styles.heroValue}>{formatCLP(data?.valor_real_hoy)}</Text>
          {data?.valor_real_rango_min > 0 ? (
            <Text style={styles.heroRange}>
              Rango probable: {formatCLP(data.valor_real_rango_min)} – {formatCLP(data.valor_real_rango_max)}
            </Text>
          ) : null}

          <VehicleValueHistogramChart
            histogram={data?.histograma}
            valorReal={data?.valor_real_hoy}
            rangoMin={data?.valor_real_rango_min}
            rangoMax={data?.valor_real_rango_max}
            confianza={data?.confianza}
            height={100}
          />

          <Text style={styles.sectionTitle}>Proyección si vendieras</Text>
          <View style={styles.projRow}>
            {proyeccion.map((p) => (
              <View key={p.anio_offset} style={styles.projChip}>
                <Text style={styles.projLabel}>{p.label || `+${p.anio_offset}a`}</Text>
                <View style={styles.projValueRow}>
                  <TrendIcon tendencia={p.tendencia} />
                  <Text style={styles.projValue}>{formatCLP(p.valor)}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Facilidad de venta</Text>
          <View style={styles.liquidezCard}>
            <Text style={[styles.liquidezTitle, { color: liquCfg.color }]}>{liquCfg.label}</Text>
            <Text style={styles.liquidezDesc}>{liquCfg.desc}</Text>
            <View style={styles.gaugeTrack}>
              <View style={[styles.gaugeFill, { width: `${gaugeWidth}%` }]} />
            </View>
            <Text style={styles.gaugeScore}>{liquidez.score ?? 0}/100</Text>
            {(liquidez.razones || []).map((r, i) => (
              <Text key={i} style={styles.reason}>• {r}</Text>
            ))}
          </View>

          <Text style={styles.meta}>{fuentesLabel}</Text>
          {meta.tasa_depreciacion_anual_pct != null ? (
            <Text style={styles.meta}>
              Depreciación estimada: {meta.tasa_depreciacion_anual_pct}%/año ({meta.fuente_tasa || 'estándar'})
            </Text>
          ) : null}
          {data?.confianza === 'estimado' ? (
            <Text style={styles.disclaimer}>
              Estimación inicial: aún no hay suficientes datos externos de tu segmento. Mejorará en las próximas semanas.
            </Text>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background.default },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...TYPOGRAPHY.styles.h5, color: COLORS.text.primary },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroLabel: { ...TYPOGRAPHY.styles.caption, color: COLORS.text.secondary },
  heroValue: { ...TYPOGRAPHY.styles.h2, color: COLORS.text.primary, marginTop: 4 },
  heroRange: { ...TYPOGRAPHY.styles.caption, color: COLORS.text.tertiary, marginTop: 4, marginBottom: SPACING.md },
  sectionTitle: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  projRow: { flexDirection: 'row', gap: SPACING.sm },
  projChip: {
    flex: 1,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    padding: SPACING.sm,
  },
  projLabel: { ...TYPOGRAPHY.styles.caption, color: COLORS.text.secondary },
  projValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  projValue: { ...TYPOGRAPHY.styles.captionBold, color: COLORS.text.primary },
  liquidezCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
  },
  liquidezTitle: { ...TYPOGRAPHY.styles.bodyBold },
  liquidezDesc: { ...TYPOGRAPHY.styles.caption, color: COLORS.text.secondary, marginTop: 4 },
  gaugeTrack: {
    height: 8,
    backgroundColor: COLORS.neutral.gray[200],
    borderRadius: 4,
    marginTop: SPACING.md,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    backgroundColor: COLORS.primary[500],
    borderRadius: 4,
  },
  gaugeScore: { ...TYPOGRAPHY.styles.caption, color: COLORS.text.tertiary, marginTop: 4 },
  reason: { ...TYPOGRAPHY.styles.caption, color: COLORS.text.secondary, marginTop: SPACING.xs },
  meta: { ...TYPOGRAPHY.styles.caption, color: COLORS.text.tertiary, marginTop: SPACING.md },
  disclaimer: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.warning.dark,
    backgroundColor: COLORS.warning.light,
    padding: SPACING.sm,
    borderRadius: BORDERS.radius.md,
    marginTop: SPACING.md,
  },
  error: { ...TYPOGRAPHY.styles.caption, color: COLORS.error.main, marginBottom: SPACING.md },
});

export default VehicleValueScreen;
