import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Gauge, History, ChevronRight } from 'lucide-react-native';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { getHealthColorToken } from '../../utils/healthFormat';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';

/** Dígitos tabulares (tipografía / métricas). */
const tabularNumericStyle = { fontVariant: ['tabular-nums'] };

const ICON_SM = 18;
const ICON_STROKE = 2;

/**
 * Accesos compactos a Salud e Historial (perfil vehículo).
 * Layout horizontal + tipografía tokenizada; números con variantes tabulares.
 */
const QuickActionGrid = ({ healthScore, serviceCount, onHealthPress, onHistoryPress }) => {
  const score = Math.round(Number(healthScore) || 0);
  const healthColor = getHealthColorToken(COLORS, score);
  const count = Math.max(0, Math.round(Number(serviceCount) || 0));

  const ActionCard = ({ children, onPress, accessibilityLabel }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ActionCard
        onPress={onHealthPress}
        accessibilityLabel={`Salud del motor, ${score} por ciento. Abrir detalle`}
      >
        <View style={[styles.iconWrap, { backgroundColor: withOpacity(healthColor, 0.12) }]}>
          <Gauge size={ICON_SM} color={healthColor} strokeWidth={ICON_STROKE} />
        </View>
        <View style={styles.body}>
          <Text style={styles.label} numberOfLines={1}>
            Salud motor
          </Text>
          <View style={styles.metricRow}>
            <Text style={[styles.metricValue, { color: healthColor }, tabularNumericStyle]}>
              {score}
              <Text style={[styles.metricUnit, { color: healthColor }]}>%</Text>
            </Text>
            <Text style={styles.metricHint} numberOfLines={1}>
              óptimo
            </Text>
          </View>
        </View>
        <ChevronRight size={16} color={COLORS.text.tertiary} strokeWidth={ICON_STROKE} />
      </ActionCard>

      <ActionCard
        onPress={onHistoryPress}
        accessibilityLabel={`Historial de servicios, ${count} registrados. Abrir`}
      >
        <View style={[styles.iconWrap, { backgroundColor: COLORS.warning[50] }]}>
          <History size={ICON_SM} color={COLORS.warning[700]} strokeWidth={ICON_STROKE} />
        </View>
        <View style={styles.body}>
          <Text style={styles.label} numberOfLines={1}>
            Historial
          </Text>
          <View style={styles.metricRow}>
            <Text style={[styles.metricValue, styles.metricValueNeutral, tabularNumericStyle]}>
              {count}
            </Text>
            <Text style={styles.metricHint} numberOfLines={1}>
              {count === 1 ? 'servicio' : 'servicios'}
            </Text>
          </View>
        </View>
        <ChevronRight size={16} color={COLORS.text.tertiary} strokeWidth={ICON_STROKE} />
      </ActionCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.container.horizontal,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    gap: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: BORDERS.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
    marginBottom: 2,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: 4,
  },
  metricValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  metricValueNeutral: {
    color: COLORS.text.primary,
  },
  metricUnit: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  metricHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.tertiary,
    flexShrink: 1,
  },
});

export default QuickActionGrid;
