/**
 * Tabs Component - MecaniMóvil
 * Componente de pestañas con nueva paleta
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS } from '../../../design-system/tokens';
import { getSafeTypography } from '../../../utils/safeTypography';

// Safe access to TYPOGRAPHY with fallback values - MUST be before any usage
const getSafeTypographyLocal = () => {
  try {
    if (TYPOGRAPHY && TYPOGRAPHY?.fontSize && TYPOGRAPHY?.fontWeight &&
      typeof TYPOGRAPHY?.fontSize?.md !== 'undefined' &&
      typeof TYPOGRAPHY?.fontWeight?.semibold !== 'undefined') {
      return TYPOGRAPHY;
    }
  } catch (e) {
    console.warn('TYPOGRAPHY not ready in Tabs:', e);
  }
  return {
    fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36 },
    fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
  };
};

const SAFE_TYPOGRAPHY = getSafeTypographyLocal();

// Safe access to BORDERS with fallback values - MUST be before StyleSheet.create()
const getSafeBorders = () => {
  try {
    if (BORDERS && BORDERS.radius && typeof BORDERS.radius.full !== 'undefined') {
      return {
        radius: BORDERS.radius,
        width: BORDERS.width || { none: 0, thin: 1, medium: 2, thick: 4 },
      };
    }
  } catch (e) {
    console.warn('BORDERS not ready:', e);
  }
  return {
    radius: { none: 0, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20, '3xl': 24, full: 9999 },
    width: { none: 0, thin: 1, medium: 2, thick: 4 },
  };
};

const SAFE_BORDERS = getSafeBorders();
const safeBordersRadius = SAFE_BORDERS.radius;
const safeBordersWidth = SAFE_BORDERS.width;

/**
 * Tabs Component
 * 
 * @param {array} tabs - Array de objetos { id, label, icon (opcional) }
 * @param {string} activeTab - ID del tab activo
 * @param {function} onTabChange - Función a ejecutar al cambiar de tab
 * @param {string} variant - Variante: 'default', 'pills', 'underline'
 * @param {boolean} scrollable - Si las tabs son scrolleables
 * @param {object} style - Estilos adicionales
 */
const Tabs = ({ 
  tabs = [],
  activeTab,
  onTabChange,
  variant = 'default',
  scrollable = false,
  style,
  ...props 
}) => {
  const renderTab = (tab) => {
    const isActive = activeTab === tab.id;
    
    // Obtener estilos según la variante
    const getTabStyles = () => {
      switch (variant) {
        case 'pills':
          return {
            container: [
              styles.tabPill,
              isActive && {
                backgroundColor: COLORS.accent[500],
              },
            ],
            text: [
              styles.tabText,
              {
                color: isActive ? COLORS.text.onAccent : COLORS.text.secondary,
                fontWeight: isActive ? SAFE_TYPOGRAPHY.fontWeight.semibold : SAFE_TYPOGRAPHY.fontWeight.regular,
              },
            ],
          };
        case 'underline':
          return {
            container: [
              styles.tabUnderline,
              isActive && styles.tabUnderlineActive,
            ],
            text: [
              styles.tabText,
              {
                color: isActive ? COLORS.accent[500] : COLORS.text.secondary,
                fontWeight: isActive ? SAFE_TYPOGRAPHY.fontWeight.semibold : SAFE_TYPOGRAPHY.fontWeight.regular,
              },
            ],
            indicator: isActive && (
              <View
                style={[
                  styles.underlineIndicator,
                  {
                    backgroundColor: COLORS.accent[500],
                  },
                ]}
              />
            ),
          };
        default: // 'default'
          return {
            container: [
              styles.tabDefault,
              isActive && styles.tabDefaultActive,
            ],
            text: [
              styles.tabText,
              {
                color: isActive ? COLORS.accent[500] : COLORS.text.secondary,
                fontWeight: isActive ? SAFE_TYPOGRAPHY.fontWeight.semibold : SAFE_TYPOGRAPHY.fontWeight.regular,
              },
            ],
          };
      }
    };

    const tabStyles = getTabStyles();

    return (
      <TouchableOpacity
        key={tab.id}
        style={[styles.tab, tabStyles.container]}
        onPress={() => onTabChange && onTabChange(tab.id)}
        activeOpacity={0.7}
      >
        {tab.icon && (
          <tab.icon
            size={20}
            color={isActive ? COLORS.accent[500] : COLORS.text.secondary}
            style={styles.tabIcon}
          />
        )}
        <Text style={tabStyles.text}>{tab.label}</Text>
        {tabStyles.indicator}
      </TouchableOpacity>
    );
  };

  const Container = scrollable ? ScrollView : View;
  const containerProps = scrollable
    ? {
        horizontal: true,
        showsHorizontalScrollIndicator: false,
        contentContainerStyle: styles.scrollContent,
      }
    : {};

  return (
    <Container
      style={[styles.container, style]}
      {...containerProps}
      {...props}
    >
      {tabs.map(renderTab)}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: safeBordersWidth.thin,
    borderBottomColor: COLORS.border.light,
  },
  scrollContent: {
    flexDirection: 'row',
  },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 48,
  },
  tabDefault: {
    // Estilos base
  },
  tabDefaultActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent[500],
  },
  tabPill: {
    borderRadius: safeBordersRadius.full,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.xs,
    backgroundColor: COLORS.neutral.gray[100],
  },
  tabUnderline: {
    position: 'relative',
  },
  tabUnderlineActive: {
    // Estilos para activo
  },
  underlineIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  tabText: {
    fontSize: SAFE_TYPOGRAPHY.fontSize.md,
  },
  tabIcon: {
    marginRight: SPACING.xs,
  },
});

export default Tabs;

