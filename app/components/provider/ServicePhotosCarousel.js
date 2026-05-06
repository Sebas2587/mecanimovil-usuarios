import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Image, Platform } from 'react-native';

/**
 * Carrusel liviano para fotos asociadas a un servicio/oferta.
 * Espera items tipo: { imagen_url?: string, imagen?: string, url?: string, image?: string }
 */
export default function ServicePhotosCarousel({ photos, height = 120 }) {
  const items = useMemo(() => (Array.isArray(photos) ? photos.filter(Boolean) : []), [photos]);
  if (items.length === 0) return null;

  const resolved = items
    .map((p) => ({
      id: p.id ?? `${p.imagen_url || p.imagen || p.url || p.image || ''}`,
      uri: p.imagen_url || p.image || p.url || p.imagen || null,
    }))
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
            resizeMode="cover"
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
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
  },
  image: {
    width: 260, // será sobreescrito al medir el contenedor en cada card (ver uso)
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
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  /** En web, deja el scroll vertical para el contenedor padre. */
  horizontalScrollWeb: {
    touchAction: 'pan-x',
    overscrollBehaviorX: 'contain',
  },
});

