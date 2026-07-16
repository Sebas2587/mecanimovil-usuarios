import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { Apple } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import { getAppStoreUrl, getPlayStoreUrl } from '../../config/publicListing';

/** Glifo Play (blanco) para badge negro estilo tienda oficial. */
function PlayStoreGlyph({ size = 22, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path d="M8 5.5v13l11-6.5L8 5.5z" fill={color} />
    </Svg>
  );
}

/**
 * Badge externo estilo badge oficial (fondo negro, tipografía en 2 líneas).
 * No usa CTA Tinder — son destinos de terceros con branding propio.
 */
function StoreBadge({ eyebrow, title, icon, onPress, accessibilityLabel }) {
  return (
    <TouchableOpacity
      style={styles.badge}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.iconWrap}>{icon}</View>
      <View style={styles.textCol}>
        <Text style={styles.eyebrow} numberOfLines={1}>
          {eyebrow}
        </Text>
        <Text style={styles.storeName} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Par App Store + Google Play — layout Airbnb (misma altura, gap, sin cards).
 */
const StoreDownloadBadges = ({ style }) => {
  const openAppStore = useCallback(() => {
    Linking.openURL(getAppStoreUrl()).catch(() => {});
  }, []);

  const openPlayStore = useCallback(() => {
    Linking.openURL(getPlayStoreUrl()).catch(() => {});
  }, []);

  return (
    <View style={[styles.row, style]}>
      <StoreBadge
        eyebrow="Descargar en"
        title="App Store"
        accessibilityLabel="Descargar en App Store"
        icon={<Apple size={22} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1.75} />}
        onPress={openAppStore}
      />
      <StoreBadge
        eyebrow="Disponible en"
        title="Google Play"
        accessibilityLabel="Disponible en Google Play"
        icon={<PlayStoreGlyph size={22} color="#FFFFFF" />}
        onPress={openPlayStore}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.sm,
  },
  badge: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#000000',
    borderRadius: BORDERS.radius.md,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    minHeight: 48,
    borderWidth: BORDERS.width.thin,
    borderColor: '#000000',
    ...(Platform.OS === 'web'
      ? { cursor: 'pointer' }
      : null),
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  eyebrow: {
    ...TYPOGRAPHY.styles.small,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.2,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
  },
  storeName: {
    ...TYPOGRAPHY.styles.captionBold,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
});

export default StoreDownloadBadges;
