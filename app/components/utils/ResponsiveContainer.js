import React from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Platform,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../utils/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Componente contenedor responsivo que maneja:
 * - Áreas seguras en todos los dispositivos
 * - Diseño responsivo para diferentes tamaños de pantalla
 * - StatusBar consistente
 * - Keyboard avoidance
 * - Scroll opcional
 */
const ResponsiveContainer = ({
  children,
  style,
  contentContainerStyle,
  scrollable = false,
  keyboardAware = true,
  statusBarStyle = 'dark-content',
  statusBarBackgroundColor = COLORS.background,
  backgroundColor = COLORS.background,
  padding = SPACING.md,
  showsVerticalScrollIndicator = false,
  refreshControl,
  onScroll,
  scrollEventThrottle = 16,
  bounces = true,
}) => {
  const insets = useSafeAreaInsets();

  // Calcular padding dinámico basado en el dispositivo
  const dynamicPadding = {
    paddingTop: Math.max(insets.top, SPACING.sm),
    paddingBottom: Math.max(insets.bottom, SPACING.sm),
    paddingLeft: Math.max(insets.left, padding),
    paddingRight: Math.max(insets.right, padding),
  };

  // Estilos del contenedor principal
  const containerStyle = [
    styles.container,
    { backgroundColor },
    style,
  ];

  // Estilos del contenido
  const contentStyle = [
    styles.content,
    dynamicPadding,
    contentContainerStyle,
  ];

  // Componente de contenido (con o sin scroll)
  const ContentComponent = scrollable ? ScrollView : View;

  // Props para ScrollView
  const scrollProps = scrollable ? {
    showsVerticalScrollIndicator,
    refreshControl,
    onScroll,
    scrollEventThrottle,
    bounces,
    contentContainerStyle: scrollable ? contentStyle : undefined,
  } : {};

  // Contenido principal
  const content = (
    <ContentComponent
      style={scrollable ? styles.scrollView : contentStyle}
      {...scrollProps}
    >
      {children}
    </ContentComponent>
  );

  return (
    <SafeAreaView style={containerStyle}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarBackgroundColor}
        translucent={false}
      />
      
      {keyboardAware ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
});

// Hook personalizado para obtener dimensiones responsivas
export const useResponsiveDimensions = () => {
  const insets = useSafeAreaInsets();
  
  return {
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    safeAreaTop: insets.top,
    safeAreaBottom: insets.bottom,
    safeAreaLeft: insets.left,
    safeAreaRight: insets.right,
    contentWidth: SCREEN_WIDTH - insets.left - insets.right,
    contentHeight: SCREEN_HEIGHT - insets.top - insets.bottom,
    isSmallScreen: SCREEN_WIDTH < 375,
    isMediumScreen: SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414,
    isLargeScreen: SCREEN_WIDTH >= 414,
    isTablet: SCREEN_WIDTH >= 768,
  };
};

// Utilidades para diseño responsivo
export const ResponsiveUtils = {
  // Obtener padding responsivo
  getResponsivePadding: (base = SPACING.md) => {
    if (SCREEN_WIDTH < 375) return base * 0.75; // Pantallas pequeñas
    if (SCREEN_WIDTH >= 414) return base * 1.25; // Pantallas grandes
    return base; // Pantallas medianas
  },

  // Obtener tamaño de fuente responsivo
  getResponsiveFontSize: (base) => {
    if (SCREEN_WIDTH < 375) return base * 0.9;
    if (SCREEN_WIDTH >= 414) return base * 1.1;
    return base;
  },

  // Obtener dimensiones de componente responsivo
  getResponsiveSize: (base) => {
    const scale = SCREEN_WIDTH / 375; // Base iPhone 8
    return Math.round(base * scale);
  },

  // Verificar si es una pantalla con notch/island
  hasNotch: () => {
    const insets = useSafeAreaInsets();
    return insets.top > 20;
  },
};

export default ResponsiveContainer; 