import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { COLORS, BORDERS } from '../../design-system/tokens';
import { resolveToAbsoluteMediaUrl } from '../../utils/providerUtils';

/**
 * Carrusel liviano para fotos asociadas a un servicio/oferta.
 * Espera items tipo: { imagen_url?: string, imagen?: string, url?: string, image?: string }
 */
export default function ServicePhotosCarousel({ photos, height = 120 }) {
  const items = useMemo(() => (Array.isArray(photos) ? photos.filter(Boolean) : []), [photos]);
  if (items.length === 0) return null;

  const resolved = items
    .map((p) => {
      // Prioridad: imagen_url (URL absoluta del backend) > otros campos > fallback con resolveToAbsoluteMediaUrl
      const rawUri = p.imagen_url || p.image || p.url || p.imagen || null;
      const uri = resolveToAbsoluteMediaUrl(rawUri);
      return {
        id: p.id ?? rawUri ?? '',
        uri,
      };
    })
    .filter((p) => !!p.uri);

  if (resolved.length === 0) return null;

  const showDots = resolved.length > 1;

  return (
    <View style={[styles.wrap, { height }]}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={Platform.OS === 'web' ? styles.horizontalScrollWeb : undefined}
      >
        {resolved.map((p, idx) => (
          <Image
            key={`${p.id}-${idx}`}
            source={{ uri: p.uri }}
            style={[styles.image, { height }]}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ))}
      </ScrollView>

      {showDots && (
        <View style={styles.dots}>
          {resolved.map((p, i) => (
            <View key={`${p.id}-dot-${i}`} style={styles.dot} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.neutral.gray[100],
  },
  image: {
    width: 260,
  },
  dots: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.background.paper,
    opacity: 0.85,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  horizontalScrollWeb: {
    touchAction: 'pan-x',
    overscrollBehaviorX: 'contain',
  },
});
