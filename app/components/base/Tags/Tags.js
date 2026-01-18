/**
 * Tags Component - MecaniMóvil
 * Componente de tags/etiquetas para categorías, filtros, etc.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS } from '../../../design-system/tokens';

/**
 * Tags Component
 * 
 * @param {string|React.ReactNode} children - Contenido del tag (texto o componente)
 * @param {string} variant - Variante: 'primary', 'secondary', 'accent', 'success', 'warning', 'error', 'info', 'neutral'
 * @param {string} size - Tamaño: 'sm', 'md', 'lg'
 * @param {boolean} closable - Si el tag puede ser cerrado
 * @param {function} onClose - Función a ejecutar al cerrar
 * @param {function} onPress - Función a ejecutar al presionar
 * @param {boolean} selected - Si el tag está seleccionado
 * @param {object} style - Estilos adicionales
 * @param {object} textStyle - Estilos adicionales para el texto
 */
const Tags = ({
  children,
  variant = 'neutral',
  size = 'md',
  closable = false,
  onClose,
  onPress,
  selected = false,
  style,
  textStyle,
  icon,
  ...props
}) => {
  // Obtener colores según la variante
  const getVariantColors = () => {
    if (selected) {
      switch (variant) {
        case 'primary':
          return {
            background: COLORS.primary[500],
            text: COLORS.text.onPrimary,
            border: COLORS.primary[500],
          };
        case 'secondary':
          return {
            background: COLORS.secondary[500],
            text: COLORS.text.onSecondary,
            border: COLORS.secondary[500],
          };
        case 'accent':
          return {
            background: COLORS.accent[500],
            text: COLORS.text.onAccent,
            border: COLORS.accent[500],
          };
        case 'success':
          return {
            background: COLORS.success[500],
            text: COLORS.text.onSuccess,
            border: COLORS.success[500],
          };
        case 'warning':
          return {
            background: COLORS.warning[500],
            text: COLORS.text.onWarning,
            border: COLORS.warning[500],
          };
        case 'error':
          return {
            background: COLORS.error[500],
            text: COLORS.text.onError,
            border: COLORS.error[500],
          };
        case 'info':
          return {
            background: COLORS.info[500],
            text: COLORS.text.onInfo,
            border: COLORS.info[500],
          };
        default: // 'neutral'
          return {
            background: COLORS.neutral.gray[700],
            text: COLORS.text.inverse,
            border: COLORS.neutral.gray[700],
          };
      }
    } else {
      switch (variant) {
        case 'primary':
          return {
            background: COLORS.primary[50],
            text: COLORS.primary[700],
            border: COLORS.primary[200],
          };
        case 'secondary':
          return {
            background: COLORS.secondary[50],
            text: COLORS.secondary[700],
            border: COLORS.secondary[200],
          };
        case 'accent':
          return {
            background: COLORS.accent[50],
            text: COLORS.accent[700],
            border: COLORS.accent[200],
          };
        case 'success':
          return {
            background: COLORS.success[50],
            text: COLORS.success[700],
            border: COLORS.success[200],
          };
          // Obtener estilos según el tamaño
          const getSizeStyles = () => {
            const basePaddingH = SAFE_SPACING.tagPadding?.horizontal || 12;
            const basePaddingV = SAFE_SPACING.tagPadding?.vertical || 6;

            switch (size) {
              case 'sm':
                return {
                  paddingHorizontal: basePaddingH * 0.75,
                  paddingVertical: basePaddingV * 0.75,
                  fontSize: SAFE_TYPOGRAPHY.fontSize?.xs || 12,
                  iconSize: 14,
                };
              case 'lg':
                return {
                  paddingHorizontal: basePaddingH * 1.25,
                  paddingVertical: basePaddingV * 1.25,
                  fontSize: SAFE_TYPOGRAPHY.fontSize?.sm || 14,
                  iconSize: 18,
                };
              default: // md
                return {
                  paddingHorizontal: basePaddingH,
                  paddingVertical: basePaddingV,
                  fontSize: SAFE_TYPOGRAPHY.fontSize?.xs || 12,
                  iconSize: 16,
                };
            }
          };

          const sizeStyles = getSizeStyles();
          const borderRadius = SAFE_BORDERS.radius?.full || 9999;

          // Colores
          const getColors = () => {
            if (disabled) {
              return {
                background: SAFE_COLORS.neutral?.gray?.[200] || '#E5E7EB',
                text: SAFE_COLORS.text?.secondary || '#9CA3AF',
                border: 'transparent',
              };
            }

            if (selected) {
              return {
                background: SAFE_COLORS.primary?.[500] || '#3B82F6',
                text: SAFE_COLORS.text?.onPrimary || '#FFF',
                border: 'transparent',
              };
            }

            return {
              background: SAFE_COLORS.background?.paper || '#FFF',
              text: SAFE_COLORS.neutral?.gray?.[700] || '#374151',
              border: SAFE_COLORS.neutral?.gray?.[200] || '#E5E7EB',
            };
          };

          const colors = getColors();

          return (
            <TouchableOpacity
              style={[
                styles.container,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderWidth: selected ? 0 : (SAFE_BORDERS.width?.thin || 1),
                  borderRadius,
                  paddingHorizontal: sizeStyles.paddingHorizontal,
                  paddingVertical: sizeStyles.paddingVertical,
                },
                disabled && styles.disabled,
                style,
              ]}
              onPress={onPress}
              disabled={disabled || !onPress}
              activeOpacity={0.7}
            >
              {icon && (
                <Ionicons
                  name={icon}
                  size={sizeStyles.iconSize}
                  color={colors.text}
                  style={styles.icon}
                />
              )}

              <Text
                style={[
                  styles.label,
                  {
                    color: colors.text,
                    fontSize: sizeStyles.fontSize,
                    fontWeight: selected
                      ? (SAFE_TYPOGRAPHY.fontWeight?.semibold || '600')
                      : (SAFE_TYPOGRAPHY.fontWeight?.medium || '500'),
                  },
                ]}
              >
                {label}
              </Text>

              {onClose && !disabled && (
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={sizeStyles.iconSize}
                    color={colors.text}
                  />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
      };

      const styles = StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'flex-start',
          marginRight: SAFE_SPACING.xs || 4,
          marginBottom: SAFE_SPACING.xs || 4,
        },
        label: {
          textAlign: 'center',
        },
        icon: {
          marginRight: SAFE_SPACING.xs || 4,
        },
        closeButton: {
          marginLeft: SAFE_SPACING.xs || 4,
        },
        disabled: {
          opacity: 0.6,
        },
      });

      export default Tag;
