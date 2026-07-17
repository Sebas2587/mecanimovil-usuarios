import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Wrench } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
import { resolveToAbsoluteMediaUrl } from '../../utils/providerUtils';

/**
 * Card de servicio estilo Airbnb: media dominante cuadrada + título/precio/taller debajo.
 * Ancho lo fija el contenedor (no usa el shell 48% del catálogo proveedor).
 */
const GuestAirbnbServiceCard = ({
  servicio,
  precioLabel,
  metaLabel,
  tipoLabel,
  onPress,
  width,
}) => {
  const nombre = servicio?.nombre || servicio?.servicio_nombre || 'Servicio';
  const fotos = Array.isArray(servicio?.fotos_servicio) ? servicio.fotos_servicio : [];
  const coverUri = useMemo(() => {
    const first = fotos[0];
    if (first) {
      const raw = first.imagen_url || first.image || first.url || first.imagen || null;
      return resolveToAbsoluteMediaUrl(raw);
    }
    /** ServicioListSerializer / relacionados: campo plano `foto`. */
    return resolveToAbsoluteMediaUrl(servicio?.foto || null);
  }, [fotos, servicio?.foto]);

  return (
    <TouchableOpacity
      style={[styles.card, width != null && { width }]}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={nombre}
    >
      <View style={styles.media}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.mediaImage} contentFit="cover" />
        ) : (
          <View style={styles.mediaPlaceholder}>
            <Wrench size={28} color={COLORS.neutral.gray[400]} strokeWidth={1.75} />
          </View>
        )}
        {tipoLabel ? (
          <View style={styles.badge} pointerEvents="none">
            <Text style={styles.badgeText} numberOfLines={1}>
              {tipoLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {nombre}
        </Text>
        {precioLabel ? (
          <Text style={styles.price} numberOfLines={1}>
            {precioLabel}
          </Text>
        ) : null}
        {metaLabel ? (
          <Text style={styles.provider} numberOfLines={1}>
            {metaLabel}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexShrink: 0,
  },
  media: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BORDERS.radius.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.gray[100],
    position: 'relative',
    ...(Platform.OS === 'web' ? { boxShadow: '0 1px 2px rgba(0,0,0,0.06)' } : SHADOWS.sm),
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.gray[100],
  },
  badge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    maxWidth: '80%',
    backgroundColor: COLORS.base.white,
    borderRadius: BORDERS.radius.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  badgeText: {
    ...TYPOGRAPHY.styles.captionBold,
    fontSize: 11,
    color: COLORS.text.primary,
  },
  body: {
    paddingTop: SPACING.sm,
    gap: 2,
  },
  title: {
    ...TYPOGRAPHY.styles.captionBold,
    fontSize: 15,
    color: COLORS.text.primary,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  price: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  provider: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
  },
});

export default React.memo(GuestAirbnbServiceCard);
