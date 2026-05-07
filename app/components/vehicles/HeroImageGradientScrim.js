import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';

const INK = COLORS.base.inkBlack;

/**
 * Degradado vertical sobre foto de vehículo (hero o tarjeta).
 * Sustituye overlays planos que dejan una línea cortada a mitad de imagen.
 *
 * @param {'default' | 'strong' | 'card'} intensity
 */
export default function HeroImageGradientScrim({ style, intensity = 'default' }) {
  const presets = {
    /** Perfil / detalle: equilibrio legibilidad vs foto */
    default: {
      colors: [
        withOpacity(INK, 0),
        withOpacity(INK, 0.05),
        withOpacity(INK, 0.32),
        withOpacity(INK, 0.68),
      ],
      locations: [0, 0.4, 0.74, 1],
    },
    /** Marketplace header: título grande, un poco más de contraste abajo */
    strong: {
      colors: [
        withOpacity(INK, 0),
        withOpacity(INK, 0.08),
        withOpacity(INK, 0.4),
        withOpacity(INK, 0.76),
      ],
      locations: [0, 0.36, 0.7, 1],
    },
    /** Tarjeta compacta (lista): menos altura, mismo principio */
    card: {
      colors: [
        withOpacity(INK, 0),
        withOpacity(INK, 0.12),
        withOpacity(INK, 0.58),
      ],
      locations: [0, 0.48, 1],
    },
  };

  const p = presets[intensity] || presets.default;

  return (
    <LinearGradient
      pointerEvents="none"
      colors={p.colors}
      locations={p.locations}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[StyleSheet.absoluteFillObject, style]}
    />
  );
}
