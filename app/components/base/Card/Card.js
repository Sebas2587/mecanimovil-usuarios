import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TOKENS } from '../../../design-system/tokens';

// Fallback values in case tokens are not ready
const SAFE_COLORS = TOKENS?.colors || {
  background: { paper: '#FFFFFF' },
  text: { primary: '#111827', secondary: '#4B5563' },
  border: { light: '#E5E7EB' }
};

const SAFE_TYPOGRAPHY = TOKENS?.typography || {
  fontSize: { sm: 14, lg: 18 },
  fontWeight: { bold: '700' }
};

const SAFE_SPACING = TOKENS?.spacing || {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32
};

const SAFE_BORDERS = TOKENS?.borders || {
  radius: { card: { sm: 8, md: 12, lg: 16 } },
  width: { thin: 1 }
};

const SAFE_SHADOWS = TOKENS?.shadows || {
  sm: {}, md: {}, lg: {}, none: {}
};

/**
 * Card Component
 * 
 * @param {ReactNode} children - Contenido de la tarjeta
 * @param {object} style - Estilos adicionales
 * @param {string} variant - Variante: 'elevated', 'outlined', 'flat'
 * @param {string} elevation - Nivel de elevación: 'sm', 'md', 'lg'
 * @param {string} padding - Padding interno: 'none', 'sm', 'md', 'lg', 'xl'
 * @param {function} onPress - Función al presionar la tarjeta
 * @param {string|ReactNode} header - Encabezado de la tarjeta
 * @param {string|ReactNode} footer - Pie de la tarjeta
 */
const Card = ({
  children,
  style,
  variant = 'elevated', // elevated, outlined, flat
  elevation = 'sm', // sm, md, lg (solo para elevated)
  padding = 'md', // none, sm, md, lg, xl
  onPress,
  header,
  footer,
  ...props
}) => {
  // Obtener estilos de elevación
  const getElevationStyle = () => {
    if (variant !== 'elevated') return {};
    return SAFE_SHADOWS[elevation] || SAFE_SHADOWS.sm;
  };

  // Obtener estilos de borde
  const getBorderStyle = () => {
    if (variant !== 'outlined') return {};
    return {
      borderWidth: SAFE_BORDERS.width?.thin || 1,
      borderColor: SAFE_COLORS.border?.light || '#E5E7EB',
    };
  };

  // Obtener padding
  const getPadding = () => {
    if (padding === 'none') return 0;
    return SAFE_SPACING[padding] || SAFE_SPACING.md;
  };

  const ContainerComponent = onPress ? TouchableOpacity : View;

  return (
    <ContainerComponent
      style={[
        styles.container,
        {
          backgroundColor: SAFE_COLORS.background?.paper || '#FFF',
          borderRadius: SAFE_BORDERS.radius?.card?.md || 12,
          padding: getPadding(),
        },
        getElevationStyle(),
        getBorderStyle(),
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
      {...props}
    >
      {header && (
        <View style={styles.header}>
          {typeof header === 'string' ? (
            <Text style={styles.headerText}>{header}</Text>
          ) : (
            header
          )}
        </View>
      )}

      <View style={styles.content}>
        {children}
      </View>

      {footer && (
        <View style={styles.footer}>
          {typeof footer === 'string' ? (
            <Text style={styles.footerText}>{footer}</Text>
          ) : (
            footer
          )}
        </View>
      )}
    </ContainerComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SAFE_SPACING.md || 16,
    overflow: 'hidden', // Para que el contenido respete el borde redondeado
  },
  header: {
    marginBottom: SAFE_SPACING.md || 16,
    borderBottomWidth: SAFE_BORDERS.width?.thin || 1,
    borderBottomColor: SAFE_COLORS.border?.light || '#E5E7EB',
    paddingBottom: SAFE_SPACING.sm || 8,
  },
  headerText: {
    fontSize: SAFE_TYPOGRAPHY.fontSize?.lg || 18,
    fontWeight: SAFE_TYPOGRAPHY.fontWeight?.bold || '700',
    color: SAFE_COLORS.text?.primary || '#111827',
  },
  content: {
    // Flexibilidad para el contenido
  },
  footer: {
    marginTop: SAFE_SPACING.md || 16,
    borderTopWidth: SAFE_BORDERS.width?.thin || 1,
    borderTopColor: SAFE_COLORS.border?.light || '#E5E7EB',
    paddingTop: SAFE_SPACING.sm || 8,
  },
  footerText: {
    fontSize: SAFE_TYPOGRAPHY.fontSize?.sm || 14,
    color: SAFE_COLORS.text?.secondary || '#4B5563',
  },
});

export default Card;
