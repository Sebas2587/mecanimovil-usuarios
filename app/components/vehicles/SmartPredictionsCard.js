import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Brain, AlertTriangle, TrendingDown, Cloud, Calendar } from 'lucide-react-native';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import { getHealthColorToken, formatHealthActionWindow } from '../../utils/healthFormat';

const PredictionItem = memo(({ prediction, onPress }) => {
  const salud = prediction.salud_actual ?? 0;
  const color = getHealthColorToken(COLORS, salud);
  const dias = prediction.dias_hasta_atencion;
  const actionWindow = formatHealthActionWindow({
    km: prediction.km_hasta_servicio,
    days: dias,
  });
  const isUrgent = salud < 40 || (dias != null && dias <= 30);
  const factorClima = prediction.factor_clima ?? 1.0;

  return (
    <TouchableOpacity
      style={styles.itemCard}
      activeOpacity={0.75}
      onPress={() => onPress?.(prediction)}
    >
      <View style={styles.itemHeader}>
        <View style={[styles.iconBubble, { backgroundColor: withOpacity(color, 0.12) }]}>
          {isUrgent
            ? <AlertTriangle size={18} color={color} />
            : <TrendingDown size={18} color={color} />}
        </View>
        <View style={styles.itemHeaderText}>
          <Text style={styles.itemName} numberOfLines={1}>
            {prediction.componente || 'Componente'}
          </Text>
          <Text style={[styles.itemHealth, { color }]}>
            {Math.round(salud)}% salud actual
          </Text>
        </View>
      </View>

      <View style={styles.itemMetrics}>
        <View style={styles.metricBlock}>
          <Calendar size={12} color={COLORS.text.tertiary} />
          <Text style={styles.metricLabel}>Próxima revisión</Text>
          <Text style={styles.metricValue}>
            {actionWindow || 'Sin proyección'}
          </Text>
        </View>
        {prediction.probabilidad_falla_30 != null && (
          <>
            <View style={styles.metricSep} />
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Riesgo 30 días</Text>
              <Text style={[
                styles.metricValue,
                { color: prediction.probabilidad_falla_30 > 50 ? COLORS.error.main : COLORS.text.primary },
              ]}>
                {Math.round(prediction.probabilidad_falla_30)}%
              </Text>
            </View>
          </>
        )}
      </View>

      {!!prediction.recomendacion && (
        <Text style={styles.recommendation} numberOfLines={2}>
          {prediction.recomendacion}
        </Text>
      )}

      <View style={styles.itemFooter}>
        {factorClima > 1.0 && (
          <View style={styles.climateChip}>
            <Cloud size={10} color={COLORS.warning.main} />
            <Text style={styles.climateText}>
              Clima +{Math.round((factorClima - 1) * 100)}%
            </Text>
          </View>
        )}
        {!!prediction.basado_en && (
          <Text style={styles.sourceText} numberOfLines={1}>
            {prediction.basado_en}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const SmartPredictionsCard = ({
  predicciones,
  resumen,
  loading,
  onItemPress,
  kilometrajeActual,
}) => {
  const keyExtractor = useCallback((item) => String(item.componente_id || item.slug), []);
  const renderItem = useCallback(
    ({ item }) => <PredictionItem prediction={item} onPress={onItemPress} />,
    [onItemPress],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={[styles.headerIcon, { backgroundColor: withOpacity(COLORS.primary[500], 0.12) }]}>
            <Brain size={18} color={COLORS.primary[500]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Predicciones inteligentes</Text>
            <Text style={styles.headerSubtitle}>Calculando...</Text>
          </View>
          <ActivityIndicator size="small" color={COLORS.primary[500]} />
        </View>
      </View>
    );
  }

  if (!predicciones || predicciones.length === 0) {
    return null;
  }

  const total = resumen?.total_componentes ?? predicciones.length;
  const criticos = resumen?.componentes_criticos ?? 0;
  const proximos = resumen?.componentes_atencion_30d ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={[styles.headerIcon, { backgroundColor: withOpacity(COLORS.primary[500], 0.12) }]}>
          <Brain size={18} color={COLORS.primary[500]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Predicciones inteligentes</Text>
          <Text style={styles.headerSubtitle}>
            {kilometrajeActual ? `${kilometrajeActual.toLocaleString('es-CL')} km · ` : ''}
            {total} componentes analizados
          </Text>
        </View>
      </View>

      {(criticos > 0 || proximos > 0) && (
        <View style={styles.summaryRow}>
          {criticos > 0 && (
            <View style={[styles.summaryChip, { borderColor: COLORS.error.main }]}>
              <AlertTriangle size={12} color={COLORS.error.main} />
              <Text style={[styles.summaryChipText, { color: COLORS.error.main }]}>
                {criticos} crítico{criticos > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {proximos > 0 && (
            <View style={[styles.summaryChip, { borderColor: COLORS.warning.main }]}>
              <Calendar size={12} color={COLORS.warning.main} />
              <Text style={[styles.summaryChipText, { color: COLORS.warning.main }]}>
                {proximos} en 30 días
              </Text>
            </View>
          )}
        </View>
      )}

      <FlatList
        data={predicciones.slice(0, 5)}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.xs }} />}
      />

      <Text style={styles.footerNote}>
        Análisis basado en kilometraje, historial, clima local y patrones de tu uso.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  summaryChipText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  itemCard: {
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: BORDERS.radius.card.md,
    padding: SPACING.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  itemHeaderText: { flex: 1 },
  itemName: {
    fontSize: 14,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  itemHealth: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginTop: 2,
  },
  itemMetrics: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.xs,
  },
  metricBlock: {
    flex: 1,
    minWidth: 70,
  },
  metricSep: {
    width: 1,
    backgroundColor: COLORS.border.light,
    marginHorizontal: SPACING.xs,
    alignSelf: 'stretch',
  },
  metricLabel: {
    fontSize: 9,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginTop: 2,
  },
  recommendation: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
    lineHeight: 16,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  climateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: withOpacity(COLORS.warning.main, 0.12),
  },
  climateText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.warning.main,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sourceText: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    flex: 1,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  footerNote: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});

export default memo(SmartPredictionsCard);
