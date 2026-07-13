import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Car } from 'lucide-react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import { formatCurrency } from '../../utils/format';

/**
 * Listing card estilo Airbnb para vehículos (Mis vehículos):
 * imagen dominante + badge salud + título/marca + meta valor · km.
 */
const VehicleCard = ({
  marca,
  modelo,
  year,
  imageUri,
  healthPct,
  healthColor,
  healthLoading = false,
  valuation = 0,
  km,
  badgeLabel,
  onPress,
  style,
}) => {
  const imageHeight = 180;
  const imageRadius = BORDERS.radius.lg;
  const title = [marca, modelo].filter(Boolean).join(' ').trim() || 'Vehículo';
  const hasValuation = Number(valuation) > 0;
  const valueLabel = hasValuation ? formatCurrency(valuation) : 'Establecer valor';
  const kmLabel = km != null && km !== '' ? `${Number(km).toLocaleString('es-CL')} km` : null;
  const metaParts = [valueLabel, kmLabel, year ? String(year) : null].filter(Boolean);
  const metaLine = metaParts.join(' · ');
  const healthDisplay =
    healthLoading ? null : healthPct != null ? `Salud ${Math.round(healthPct)}%` : null;

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      activeOpacity={0.92}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${metaLine}`}
    >
      <View style={[styles.imageWrap, { height: imageHeight, borderRadius: imageRadius }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Car size={32} color={COLORS.text.tertiary} strokeWidth={1.75} />
          </View>
        )}

        {healthLoading ? (
          <View style={styles.badge} accessibilityRole="text">
            <ActivityIndicator size="small" color={COLORS.text.primary} />
          </View>
        ) : healthDisplay ? (
          <View
            style={[
              styles.badge,
              healthColor ? { borderColor: healthColor, borderWidth: 1 } : null,
            ]}
            accessibilityRole="text"
          >
            <View
              style={[
                styles.healthDot,
                { backgroundColor: healthColor || COLORS.success.main },
              ]}
            />
            <Text style={styles.badgeText} numberOfLines={1}>
              {healthDisplay}
            </Text>
          </View>
        ) : null}

        {badgeLabel ? (
          <View style={styles.statusBadge} accessibilityRole="text">
            <Text style={styles.statusBadgeText} numberOfLines={1}>
              {badgeLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {metaLine}
        </Text>
        {!hasValuation ? (
          <Text style={styles.hint} numberOfLines={1}>
            Toca para ver valorización y salud
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  imageWrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.gray[100],
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.gray[100],
  },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '72%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: COLORS.background.paper,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  badgeText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    maxWidth: '40%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: COLORS.background.paper,
  },
  statusBadgeText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  body: {
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  title: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
  },
  meta: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  hint: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.primary[600],
    marginTop: 4,
  },
});

export default React.memo(VehicleCard);
