/**
 * Avatar Component - MecaniMóvil
 * Componente de avatar para mostrar imágenes de perfil, iniciales o iconos
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, BORDERS } from '../../../design-system/tokens';

// Safe access to BORDERS with fallback values - MUST be before StyleSheet.create()
const getSafeBorders = () => {
  try {
    if (BORDERS && BORDERS.radius && typeof BORDERS.radius.full !== 'undefined') {
      return {
        radius: BORDERS.radius,
        avatar: BORDERS.radius.avatar || { sm: 16, md: 24, lg: 32, full: 9999 },
      };
    }
  } catch (e) {
    console.warn('BORDERS not ready:', e);
  }
  return {
    radius: { none: 0, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20, '3xl': 24, full: 9999 },
    avatar: { sm: 16, md: 24, lg: 32, full: 9999 },
  };
};

const SAFE_BORDERS = getSafeBorders();
const safeBordersRadius = SAFE_BORDERS.radius;
const safeBordersAvatar = SAFE_BORDERS.avatar;

/**
 * Avatar Component
 * 
 * @param {string} source - URI de la imagen (opcional)
 * @param {string} name - Nombre para generar iniciales (opcional)
 * @param {string} size - Tamaño: 'sm' (32), 'md' (48), 'lg' (64), 'xl' (80)
 * @param {string} variant - Variante: 'circular' (redondo), 'rounded' (redondeado)
 * @param {string} icon - Nombre del icono de Ionicons (opcional, si no hay imagen ni nombre)
 * @param {boolean} showBadge - Mostrar badge de estado
 * @param {string} badgeColor - Color del badge (success, error, warning, etc.)
 * @param {object} style - Estilos adicionales
 */
const Avatar = ({
  source,
  name,
  size = 'md',
  variant = 'circular',
  icon = 'person',
  showBadge = false,
  badgeColor = COLORS.success[500],
  style,
  ...props
}) => {
  // Obtener dimensiones según el tamaño
  const getSize = () => {
    switch (size) {
      case 'sm':
        return 32;
      case 'lg':
        return 64;
      case 'xl':
        return 80;
      default: // md
        return 48;
    }
  };

  // Obtener radio de borde según la variante
  const getBorderRadius = () => {
    if (variant === 'circular') {
      return safeBordersRadius.full;
    }
    return safeBordersAvatar[size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'];
  };

  // Generar iniciales del nombre
  const getInitials = (nameString) => {
    if (!nameString) return '';
    const parts = nameString.trim().split(' ');
    const getDimensions = () => {
      switch (size) {
        case 'sm': return 32;
        case 'lg': return 56;
        case 'xl': return 72;
        default: return 40; // md
      }
    };

    // Obtener tamaño de fuente para las iniciales
    const getFontSize = () => {
      switch (size) {
        case 'sm': return SAFE_TYPOGRAPHY.fontSize?.xs || 12;
        case 'lg': return SAFE_TYPOGRAPHY.fontSize?.lg || 18;
        case 'xl': return SAFE_TYPOGRAPHY.fontSize?.xl || 20;
        default: return SAFE_TYPOGRAPHY.fontSize?.md || 16;
      }
    };

    // Obtener iniciales del nombre
    const getInitials = () => {
      if (!name) return '?';
      const parts = name.split(' ');
      if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Obtener color de estado
    const getStatusColor = () => {
      switch (status) {
        case 'online': return '#10B981'; // Success
        case 'busy': return '#EF4444'; // Error
        case 'away': return '#F59E0B'; // Warning
        default: return '#9CA3AF'; // Neutral
      }
    };

    const dimension = getDimensions();
    const fontSize = getFontSize();
    const borderRadius = SAFE_BORDERS.radius?.full || 9999;

    const ContainerComponent = onPress ? TouchableOpacity : View;

    return (
      <ContainerComponent
        style={[styles.container, style]}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.avatarContainer,
            {
              width: dimension,
              height: dimension,
              borderRadius,
              backgroundColor: source ? 'transparent' : (SAFE_COLORS.primary?.[500] || '#3B82F6'),
            },
          ]}
        >
          {source ? (
            <Image
              source={typeof source === 'string' ? { uri: source } : source}
              style={{
                width: dimension,
                height: dimension,
                borderRadius,
              }}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <Text
              style={[
                styles.initials,
                {
                  fontSize,
                  color: SAFE_COLORS.text?.onPrimary || '#FFF',
                  fontWeight: SAFE_TYPOGRAPHY.fontWeight?.semibold || '600',
                },
              ]}
            >
              {getInitials()}
            </Text>
          )}
        </View>

        {showStatus && (
          <View
            style={[
              styles.statusIndicator,
              {
                backgroundColor: getStatusColor(),
                width: dimension * 0.25,
                height: dimension * 0.25,
                borderRadius: SAFE_BORDERS.radius?.full || 9999,
                borderWidth: 2,
                borderColor: SAFE_COLORS.background?.paper || '#FFF',
                bottom: 0,
                right: 0,
              },
            ]}
          />
        )}
      </ContainerComponent>
    );
  };

  return renderAvatar();
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initials: {
    textAlign: 'center',
  },
  statusIndicator: {
    position: 'absolute',
  },
});

export default Avatar;
