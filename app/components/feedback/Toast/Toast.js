/**
 * Toast Component - MecaniMóvil
 * Componente de notificación toast
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS } from '../../../design-system/tokens';

// Safe access to TYPOGRAPHY with fallback values - MUST be before any usage
const getSafeTypography = () => {
  try {
    if (TYPOGRAPHY && TYPOGRAPHY?.fontSize && TYPOGRAPHY?.fontWeight &&
      typeof TYPOGRAPHY?.fontSize?.md !== 'undefined' &&
      typeof TYPOGRAPHY?.fontSize?.sm !== 'undefined' &&
      typeof TYPOGRAPHY?.fontWeight?.bold !== 'undefined' &&
      typeof TYPOGRAPHY?.fontWeight?.semibold !== 'undefined') {
      return TYPOGRAPHY;
    }
  } catch (e) {
    console.warn('TYPOGRAPHY not ready in Toast:', e);
  }
  return {
    fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36 },
    fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
  };
};

const SAFE_TYPOGRAPHY = getSafeTypography();

/**
 * Toast Component
 * 
 * @param {string} message - Mensaje a mostrar
 * @param {string} variant - Variante: 'success', 'warning', 'error', 'info'
 * @param {string} position - Posición: 'top', 'bottom', 'center'
 * @param {number} duration - Duración en ms (0 = no auto-ocultar)
 * @param {function} onClose - Función a ejecutar al cerrar
 * @param {boolean} visible - Si el toast es visible
 * @param {string} title - Título del toast (opcional)
 * @param {string} actionLabel - Label del botón de acción (opcional)
 * @param {function} onAction - Función del botón de acción
 */
const Toast = ({ 
  message,
  variant = 'info',
  position = 'top',
  duration = 3000,
  onClose,
  visible = false,
  title,
  actionLabel,
  onAction,
  ...props 
}) => {
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(position === 'top' ? -100 : position === 'bottom' ? 100 : 0);

  useEffect(() => {
    if (visible) {
      // Animar entrada
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-ocultar si hay duración
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      handleClose();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: position === 'top' ? -100 : position === 'bottom' ? 100 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onClose) onClose();
    });
  };

  // Obtener colores según la variante
  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return {
          background: COLORS.success[500],
          text: COLORS.text.onSuccess,
          icon: 'checkmark-circle',
        };
      case 'warning':
        return {
          background: COLORS.warning[500],
          text: COLORS.text.onWarning,
          icon: 'warning',
        };
      case 'error':
        return {
          background: COLORS.error[500],
          text: COLORS.text.onError,
          icon: 'close-circle',
        };
      default: // 'info'
        return {
          background: COLORS.info[500],
          text: COLORS.text.onInfo,
          icon: 'information-circle',
        };
    }
  };

  const variantColors = getVariantColors();

  // Obtener posición
  const getPositionStyles = () => {
    switch (position) {
      case 'top':
        return {
          top: 50,
          bottom: 'auto',
        };
      case 'bottom':
        return {
          top: 'auto',
          bottom: 50,
        };
      default: // 'center'
        return {
          top: '50%',
          bottom: 'auto',
          transform: [{ translateY: -25 }],
        };
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: variantColors.background,
          borderRadius: BORDERS.radius.md,
          padding: SPACING.md,
          ...SHADOWS.lg,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          ...getPositionStyles(),
        },
        styles[position],
      ]}
      {...props}
    >
      <View style={styles.content}>
        <Ionicons
          name={variantColors.icon}
          size={24}
          color={variantColors.text}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          {title && (
            <Text
              style={[
                styles.title,
                {
                  color: variantColors.text,
                  fontSize: SAFE_TYPOGRAPHY.fontSize.md,
                  fontWeight: SAFE_TYPOGRAPHY.fontWeight.bold,
                  marginBottom: SPACING.xs / 2,
                },
              ]}
            >
              {title}
            </Text>
          )}
          <Text
            style={[
              styles.message,
              {
                color: variantColors.text,
                fontSize: SAFE_TYPOGRAPHY.fontSize.md,
                fontWeight: SAFE_TYPOGRAPHY.fontWeight.medium,
              },
            ]}
          >
            {message}
          </Text>
        </View>
        {actionLabel && onAction && (
          <TouchableOpacity onPress={onAction} style={styles.actionButton}>
            <Text
              style={[
                styles.actionText,
                {
                  color: variantColors.text,
                  fontSize: SAFE_TYPOGRAPHY.fontSize.sm,
                  fontWeight: SAFE_TYPOGRAPHY.fontWeight.semibold,
                },
              ]}
            >
              {actionLabel}
            </Text>
          </TouchableOpacity>
        )}
        {onClose && (
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={variantColors.text} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 9999,
    alignSelf: 'center',
  },
  top: {
    // Estilos específicos para top
  },
  bottom: {
    // Estilos específicos para bottom
  },
  center: {
    // Estilos específicos para center
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    // Estilos definidos inline
  },
  message: {
    // Estilos definidos inline
  },
  actionButton: {
    marginLeft: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionText: {
    // Estilos definidos inline
  },
  closeButton: {
    marginLeft: SPACING.sm,
    padding: SPACING.xs,
  },
});

export default Toast;

