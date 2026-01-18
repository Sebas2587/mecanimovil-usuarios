/**
 * Menu Component - MecaniMóvil
 * Componente de menú desplegable/contextual
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS } from '../../../design-system/tokens';

// Safe access to TYPOGRAPHY with fallback values - MUST be before any usage
const getSafeTypography = () => {
  try {
    if (TYPOGRAPHY && TYPOGRAPHY?.fontSize && TYPOGRAPHY?.fontWeight &&
      typeof TYPOGRAPHY?.fontSize?.md !== 'undefined') {
      return TYPOGRAPHY;
    }
  } catch (e) {
    console.warn('TYPOGRAPHY not ready in Menu:', e);
  }
  return {
    fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36 },
    fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
  };
};

const SAFE_TYPOGRAPHY = getSafeTypography();

/**
 * Menu Component
 * 
 * @param {React.ReactNode} trigger - Elemento que activa el menú
 * @param {array} items - Array de items del menú: [{ label, icon, onPress, disabled, variant }]
 * @param {string} position - Posición: 'bottom-left', 'bottom-right', 'top-left', 'top-right', 'bottom-center', 'top-center'
 * @param {boolean} visible - Control externo de visibilidad
 * @param {function} onOpen - Función cuando se abre
 * @param {function} onClose - Función cuando se cierra
 */
const Menu = ({ 
  trigger,
  items = [],
  position = 'bottom-left',
  visible: controlledVisible = null,
  onOpen,
  onClose,
  ...props 
}) => {
  const [internalVisible, setInternalVisible] = useState(false);
  const isControlled = controlledVisible !== null;
  const visible = isControlled ? controlledVisible : internalVisible;

  const handleOpen = () => {
    if (!isControlled) setInternalVisible(true);
    onOpen && onOpen();
  };

  const handleClose = () => {
    if (!isControlled) setInternalVisible(false);
    onClose && onClose();
  };

  const handleItemPress = (item) => {
    if (!item.disabled && item.onPress) {
      item.onPress();
      handleClose();
    }
  };

  // Obtener estilos según la posición
  const getPositionStyles = () => {
    const baseStyles = {
      position: 'absolute',
      zIndex: 1000,
    };

    switch (position) {
      case 'bottom-right':
        return {
          ...baseStyles,
          bottom: 0,
          right: 0,
        };
      case 'top-left':
        return {
          ...baseStyles,
          top: 0,
          left: 0,
        };
      case 'top-right':
        return {
          ...baseStyles,
          top: 0,
          right: 0,
        };
      case 'bottom-center':
        return {
          ...baseStyles,
          bottom: 0,
          left: '50%',
          transform: [{ translateX: -100 }],
        };
      case 'top-center':
        return {
          ...baseStyles,
          top: 0,
          left: '50%',
          transform: [{ translateX: -100 }],
        };
      default: // 'bottom-left'
        return {
          ...baseStyles,
          bottom: 0,
          left: 0,
        };
    }
  };

  return (
    <View style={styles.container} {...props}>
      <TouchableOpacity onPress={handleOpen} activeOpacity={0.7}>
        {trigger}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.menu,
                  {
                    backgroundColor: COLORS.background.paper,
                    borderRadius: BORDERS.radius.md,
                    ...SHADOWS.lg,
                    ...getPositionStyles(),
                  },
                ]}
              >
                {items.map((item, index) => {
                  const getItemColors = () => {
                    if (item.disabled) {
                      return {
                        text: COLORS.text.disabled,
                        background: 'transparent',
                      };
                    }
                    if (item.variant === 'danger') {
                      return {
                        text: COLORS.error[500],
                        background: 'transparent',
                      };
                    }
                    return {
                      text: COLORS.text.primary,
                      background: 'transparent',
                    };
                  };

                  const itemColors = getItemColors();

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.menuItem,
                        {
                          backgroundColor: itemColors.background,
                          opacity: item.disabled ? 0.5 : 1,
                        },
                        index === 0 && styles.menuItemFirst,
                        index === items.length - 1 && styles.menuItemLast,
                      ]}
                      onPress={() => handleItemPress(item)}
                      disabled={item.disabled}
                      activeOpacity={0.7}
                    >
                      {item.icon && (
                        <Ionicons
                          name={item.icon}
                          size={20}
                          color={itemColors.text}
                          style={styles.menuIcon}
                        />
                      )}
                      <Text
                        style={[
                          styles.menuText,
                          {
                            color: itemColors.text,
                            fontSize: SAFE_TYPOGRAPHY.fontSize.md,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  overlay: {
    flex: 1,
    backgroundColor: COLORS.background.overlay,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  menu: {
    minWidth: 200,
    paddingVertical: SPACING.xs,
    margin: SPACING.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  menuItemFirst: {
    // Estilos específicos para primer item
  },
  menuItemLast: {
    // Estilos específicos para último item
  },
  menuIcon: {
    marginRight: SPACING.sm,
  },
  menuText: {
    flex: 1,
  },
});

export default Menu;

