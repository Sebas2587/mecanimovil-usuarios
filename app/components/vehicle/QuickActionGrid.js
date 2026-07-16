import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Gauge, History, Navigation, ChevronRight } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';
import { getHealthLabel } from '../../utils/healthFormat';
import BrandIconWell from '../base/BrandIconWell/BrandIconWell';

/**
 * Accesos del perfil — grilla 3 columnas (Airbnb summary tiles + Tinder primary).
 */
const QuickActionGrid = ({ healthScore, serviceCount, onHealthPress, onHistoryPress, onTripPress }) => {
  const score = Math.round(Number(healthScore) || 0);
  const count = Math.max(0, Math.round(Number(serviceCount) || 0));
  const healthLabel = getHealthLabel(score);

  const tiles = [
    {
      key: 'health',
      title: 'Salud',
      subtitle: `${score}% · ${healthLabel}`,
      icon: <Gauge size={18} strokeWidth={2} />,
      onPress: onHealthPress,
    },
    {
      key: 'history',
      title: 'Historial',
      subtitle: `${count} ${count === 1 ? 'servicio' : 'servicios'}`,
      icon: <History size={18} strokeWidth={2} />,
      onPress: onHistoryPress,
    },
  ];

  if (onTripPress) {
    tiles.push({
      key: 'trip',
      title: 'Viaje GPS',
      subtitle: 'Actualizar km',
      icon: <Navigation size={18} strokeWidth={2} />,
      onPress: onTripPress,
    });
  }

  return (
    <View style={styles.grid} accessibilityRole="list">
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
            <BrandIconWell size={36}>{tile.icon}</BrandIconWell>
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
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    minHeight: 108,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  subtitle: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
});

export default React.memo(QuickActionGrid);
