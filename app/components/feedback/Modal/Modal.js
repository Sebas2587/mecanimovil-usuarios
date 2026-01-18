/**
 * Modal Component - MecaniMóvil
 * Componente de modal con nueva paleta
 */

import React from 'react';
import { Modal as RNModal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS } from '../../../design-system/tokens';

// Safe access to TYPOGRAPHY with fallback values - MUST be before any usage
const getSafeTypography = () => {
  try {
    if (TYPOGRAPHY && TYPOGRAPHY?.fontSize && TYPOGRAPHY?.fontWeight &&
      typeof TYPOGRAPHY?.fontSize?.xl !== 'undefined' &&
      typeof TYPOGRAPHY?.fontWeight?.bold !== 'undefined') {
      return TYPOGRAPHY;
    }
  } catch (e) {
    console.warn('TYPOGRAPHY not ready in Modal:', e);
  }
  return {
    fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36 },
    fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
  };
};

const SAFE_TYPOGRAPHY = getSafeTypography();

/**
 * Modal Component
 * 
 * @param {boolean} visible - Si el modal es visible
 * @param {function} onClose - Función a ejecutar al cerrar
 * @param {React.ReactNode} children - Contenido del modal
 * @param {string} title - Título del modal
 * @param {boolean} showCloseButton - Mostrar botón de cerrar
 * @param {string} size - Tamaño: 'sm', 'md', 'lg', 'full'
 * @param {boolean} dismissible - Si se puede cerrar tocando fuera
 * @param {React.ReactNode} footer - Footer personalizado
 * @param {object} style - Estilos adicionales
 */
const Modal = ({ 
  visible,
  onClose,
  children,
  title,
  showCloseButton = true,
  size = 'md',
  dismissible = true,
  footer,
  style,
  ...props 
}) => {
  // Obtener estilos según el tamaño
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          width: '75%',
          maxHeight: '50%',
        };
      case 'lg':
        return {
          width: '90%',
          maxHeight: '85%',
        };
      case 'full':
        return {
          width: '100%',
          height: '100%',
          borderRadius: 0,
        };
      default: // 'md'
        return {
          width: '85%',
          maxHeight: '75%',
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      {...props}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={dismissible ? onClose : undefined}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        
        <View
          style={[
            styles.modal,
            {
              backgroundColor: COLORS.background.paper,
              borderRadius: size === 'full' ? 0 : BORDERS.radius.modal.md,
              ...SHADOWS.modal,
              ...sizeStyles,
            },
            style,
          ]}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <View style={styles.header}>
              {title && (
                <Text
                  style={[
                    styles.title,
                    {
                      color: COLORS.text.primary,
                      fontSize: SAFE_TYPOGRAPHY.fontSize.xl,
                      fontWeight: SAFE_TYPOGRAPHY.fontWeight.bold,
                    },
                  ]}
                >
                  {title}
                </Text>
              )}
              {showCloseButton && (
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={COLORS.text.secondary}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {/* Footer */}
          {footer && (
            <View style={styles.footer}>
              {footer}
            </View>
          )}
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background.overlay,
  },
  modal: {
    maxWidth: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
  },
  title: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
  },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
  },
});

export default Modal;

