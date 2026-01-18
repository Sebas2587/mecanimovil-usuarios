import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING as DESIGN_SPACING } from '../../design-system/tokens';

// Acceso seguro a TYPOGRAPHY con valores fallback
const getSafeTypography = () => {
  try {
    if (TYPOGRAPHY &&
      TYPOGRAPHY?.fontSize &&
      TYPOGRAPHY?.fontWeight &&
      TYPOGRAPHY?.letterSpacing &&
      typeof TYPOGRAPHY?.fontSize?.['4xl'] !== 'undefined') {
      return TYPOGRAPHY;
    }
  } catch (e) {
    console.warn('⚠️ TYPOGRAPHY not ready in SplashScreen, using fallback');
  }
  // Fallback values
  return {
    fontSize: {
      xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20,
      '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36
    },
    fontWeight: {
      light: '300', regular: '400', medium: '500',
      semibold: '600', bold: '700'
    },
    letterSpacing: {
      tighter: -0.5, tight: -0.25, normal: 0,
      wide: 0.25, wider: 0.5
    },
  };
};

const SAFE_TYPOGRAPHY = getSafeTypography();

const SplashScreen = () => {
  return (
    <LinearGradient
      colors={COLORS?.gradients?.ocean || ['#1976D2', '#42A5F5', '#64B5F6']} // Deep Space Blue → Cerulean → Fresh Sky
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo o ícono de la aplicación */}
        <View style={styles.logoContainer}>
          <Ionicons name="car-sport" size={80} color={COLORS?.text?.inverse || '#FFFFFF'} />
        </View>

        {/* Nombre de la aplicación */}
        <Text style={styles.appName}>Mecanimovil</Text>

        {/* Indicador de carga */}
        <ActivityIndicator
          size="large"
          color={COLORS?.text?.inverse || '#FFFFFF'}
          style={styles.loader}
        />

        {/* Texto opcional */}
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: DESIGN_SPACING?.xl || 24,
  },
  logoContainer: {
    marginBottom: DESIGN_SPACING?.lg || 16,
    backgroundColor: COLORS?.glass?.light?.background || 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: SAFE_TYPOGRAPHY?.fontSize?.['4xl'] || 32,
    fontWeight: SAFE_TYPOGRAPHY?.fontWeight?.bold || '700',
    color: COLORS?.text?.inverse || '#FFFFFF',
    marginBottom: DESIGN_SPACING?.xl || 24,
    letterSpacing: SAFE_TYPOGRAPHY?.letterSpacing?.wide || 0.25,
  },
  loader: {
    marginBottom: DESIGN_SPACING?.md || 12,
  },
  loadingText: {
    fontSize: SAFE_TYPOGRAPHY?.fontSize?.md || 16,
    color: COLORS?.text?.inverse || '#FFFFFF',
    opacity: 0.9,
    fontWeight: SAFE_TYPOGRAPHY?.fontWeight?.medium || '500',
  },
});

export default SplashScreen;

