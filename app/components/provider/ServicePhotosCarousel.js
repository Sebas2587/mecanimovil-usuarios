import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { COLORS, SPACING } from '../../design-system/tokens';
import { resolveToAbsoluteMediaUrl } from '../../utils/providerUtils';

/** Ancho aproximado de columna (~48% del ancho útil) antes del primer onLayout. */
function estimateServicePhotoSlideWidth() {
  const w = Dimensions.get('window').width;
  const hPad = (SPACING.container?.horizontal ?? 16) * 2;
  const inner = Math.max(0, w - hPad);
  return Math.max(100, Math.floor(inner * 0.48 - 4));
}

/**
 * Carrusel liviano para fotos asociadas a un servicio/oferta.
 * Espera items tipo: { imagen_url?: string, imagen?: string, url?: string, image?: string }
 */
export default function ServicePhotosCarousel({ photos, height = 120 }) {
  const [slideWidth, setSlideWidth] = useState(estimateServicePhotoSlideWidth);
  const onWrapLayout = useCallback((e) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0) setSlideWidth((prev) => (prev === w ? prev : w));
  }, []);

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
    <View style={[styles.wrap, { height }]} onLayout={onWrapLayout}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={[styles.scrollFill, Platform.OS === 'web' ? styles.horizontalScrollWeb : undefined]}
      >
        {resolved.map((p, idx) => (
          <Image
            key={`${p.id}-${idx}`}
            source={{ uri: p.uri }}
            style={{ width: slideWidth, height }}
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
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.gray[100],
  },
  scrollFill: {
    flexGrow: 0,
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
