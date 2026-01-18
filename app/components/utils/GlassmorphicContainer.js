import React from 'react';
import { View, StyleSheet, ImageBackground, StatusBar, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ResponsiveContainer from './ResponsiveContainer';
import { SPACING } from '../../utils/constants';
import { COLORS as DESIGN_COLORS, SPACING as DESIGN_SPACING } from '../../design-system/tokens';

/**
 * Componente de contenedor con estilo glassmórfico para pantallas
 * Ahora usa ResponsiveContainer internamente para mejor compatibilidad
 * @param {node} children - Contenido del contenedor
 * @param {string} backgroundImage - Imagen de fondo (opcional)
 * @param {object} style - Estilos adicionales
 * @param {boolean} scrollable - Si el contenido debe ser desplazable
 * @param {string} statusBarStyle - Estilo de la barra de estado
 * @param {boolean} keyboardAware - Si debe evitar el teclado
 */
const GlassmorphicContainer = ({ 
  children, 
  backgroundImage,
  style,
  scrollable = false,
  statusBarStyle = 'light-content',
  keyboardAware = true,
  refreshControl,
  onScroll,
  showsVerticalScrollIndicator = false,
}) => {
  // Fondo por defecto si no se proporciona una imagen - usando nueva paleta
  const defaultBackground = (
    <LinearGradient
      colors={DESIGN_COLORS.gradients.dark} // Ink Black → Deep Space Blue
      style={styles.gradient}
    />
  );

  // Fondo con imagen si se proporciona
  const imageBackground = backgroundImage ? (
    <ImageBackground
      source={backgroundImage}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
    </ImageBackground>
  ) : defaultBackground;

  return (
    <View style={styles.container}>
      {/* Fondo glassmórfico */}
      {imageBackground}
      
      {/* Contenido responsivo */}
      <ResponsiveContainer
        style={[styles.contentContainer, style]}
        scrollable={scrollable}
        keyboardAware={keyboardAware}
        statusBarStyle={statusBarStyle}
        statusBarBackgroundColor="transparent"
        backgroundColor="transparent"
        padding={SPACING.md}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        refreshControl={refreshControl}
        onScroll={onScroll}
      >
        {children}
      </ResponsiveContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  backgroundImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DESIGN_COLORS.background.overlay,
  },
  contentContainer: {
    flex: 1,
  },
});

export default GlassmorphicContainer; 