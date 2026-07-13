import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Gauge, History, Navigation, ChevronRight } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING, withOpacity } from '../../design-system/tokens';
import { getHealthColorToken, getHealthLabel } from '../../utils/healthFormat';

/**
 * Accesos del perfil — grilla (Airbnb listing shortcuts).
 * Círculo + icono alineados al color semántico de cada acción.
 */
const QuickActionGrid = ({ healthScore, serviceCount, onHealthPress, onHistoryPress, onTripPress }) => {
  const score = Math.round(Number(healthScore) || 0);
  const healthColor = getHealthColorToken(COLORS, score);
  const count = Math.max(0, Math.round(Number(serviceCount) || 0));
  const healthLabel = getHealthLabel(score);

  const tiles = [
    {
      key: 'health',
      title: 'Salud',
      subtitle: `${score}% · ${healthLabel}`,
      icon: <Gauge size={18} color={healthColor} strokeWidth={2} />,
      circleBg: withOpacity(healthColor, 0.12),
      onPress: onHealthPress,
    },
    {
      key: 'history',
      title: 'Historial',
      subtitle: `${count} ${count === 1 ? 'servicio' : 'servicios'}`,
      icon: <History size={18} color={COLORS.text.primary} strokeWidth={2} />,
      circleBg: COLORS.neutral.gray[100],
      onPress: onHistoryPress,
    },
  ];

  if (onTripPress) {
    tiles.push({
      key: 'trip',
      title: 'Viaje GPS',
      subtitle: 'Actualizar km',
      icon: <Navigation size={18} color={COLORS.primary[600]} strokeWidth={2} />,
      circleBg: COLORS.primary[50],
      onPress: onTripPress,
    });
  }

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <TouchableOpacity
          key={tile.key}
          style={styles.tile}
          onPress={tile.onPress}
          activeOpacity={0.92}
          disabled={!tile.onPress}
          accessibilityRole="button"
          accessibilityLabel={`${tile.title}. ${tile.subtitle}`}
        >
          <View style={styles.tileTop}>
            <View style={[styles.iconCircle, { backgroundColor: tile.circleBg }]}>
              {tile.icon}
            </View>
            <ChevronRight size={14} color={COLORS.text.tertiary} strokeWidth={2} />
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {tile.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {tile.subtitle}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.container.horizontal,
    marginBottom: SPACING.md,
  },
  tile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    minHeight: 96,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: BORDERS.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  subtitle: {
    ...TYPOGRAPHY.styles.small,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
});

export default QuickActionGrid;
