import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, BORDERS, SPACING } from '../../design-system/tokens';
import { getHealthStatus } from '../../utils/healthFormat';
import Button from '../base/Button/Button';
import GuestGradientButton from '../guest/GuestGradientButton';

/**
 * Estado legible: color semántico solo en texto/punto (Airbnb).
 */
const STATUS_META = {
  OPTIMO: { label: 'Buena salud', color: COLORS.success.main },
  ATENCION: { label: 'Requiere atención', color: COLORS.warning.main },
  URGENTE: { label: 'Urgente', color: COLORS.error.main },
  CRITICO: { label: 'Crítico', color: COLORS.error.main },
  SIN_DATOS: { label: 'Sin datos', color: COLORS.text.tertiary },
};

/**
 * Resumen de salud del vehículo (hero limpio).
 */
const HealthCard = ({
  score,
  label,
  componentsCount,
  needingCount,
  onPressDetail,
  onAgendar,
}) => {
  const status = STATUS_META[getHealthStatus(score)] || STATUS_META.SIN_DATOS;
  const subtitle =
    needingCount > 0
      ? `${needingCount} componente${needingCount === 1 ? '' : 's'} por atender · ordenados abajo`
      : componentsCount != null
        ? `Basado en ${componentsCount} componente${componentsCount === 1 ? '' : 's'} evaluado${componentsCount === 1 ? '' : 's'}`
        : label;

  return (
    <View style={styles.card}>
      <Text style={[TYPOGRAPHY.styles.h5, styles.title]}>Salud del vehículo</Text>

      <View style={styles.scoreRow}>
        {score != null ? (
          <Text style={[TYPOGRAPHY.styles.h1, { color: status.color }]}>
            {Math.round(score)}%
          </Text>
        ) : null}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[TYPOGRAPHY.styles.bodyBold, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      {subtitle ? (
        <Text style={[TYPOGRAPHY.styles.caption, styles.subtitle]}>{subtitle}</Text>
      ) : null}

      {onAgendar || onPressDetail ? (
        <View style={styles.actions}>
          {onPressDetail ? (
            <Button
              title="Ver detalle"
              type="secondary"
              variant="outline"
              size="sm"
              onPress={onPressDetail}
            />
          ) : null}
          {onAgendar ? (
            <GuestGradientButton
              title="Agendar"
              onPress={onAgendar}
              size="compact"
              style={styles.agendarBtn}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  title: { color: COLORS.text.secondary },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subtitle: {
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  agendarBtn: {
    flex: 1,
  },
});

export default HealthCard;
