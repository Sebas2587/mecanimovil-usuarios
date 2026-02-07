import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Animated, Easing } from 'react-native';
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
  // Animación de pulso para el logo
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in inicial
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();

    // Loop de pulso suave
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo animado */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim
            }
          ]}
        >
          {/* Intentar usar el logo de la marca, fallback al ícono si no existe */}
          <Image
            source={require('../../../assets/images/Group 27logo_negro_mecanimovil.png')}
            style={styles.logo}
            resizeMode="contain"
            defaultSource={require('../../../assets/icon.png')}
          />
        </Animated.View>

        {/* Indicador de carga minimalista */}
        <View style={styles.loaderContainer}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary[500]} // Deep Space Blue
            style={styles.loader}
          />

          {/* Texto de carga estilizado */}
          <Text style={styles.loadingText}>
            Iniciando <Text style={styles.highlightText}>motores...</Text>
          </Text>
        </View>
      </View>

      {/* Footer minimalista opcional */}
      <View style={styles.footer}>
        <View style={styles.footerLine} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.base.white, // Fondo blanco minimalista
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: DESIGN_SPACING?.xl || 24,
  },
  logoContainer: {
    marginBottom: 60,
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    // Sombra sutil para dar profundidad en diseño minimalista
    shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    backgroundColor: COLORS.base.white,
    borderRadius: 30,
    padding: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  loaderContainer: {
    alignItems: 'center',
    position: 'absolute',
    bottom: '15%', // Posición inferior similar al diseño de referencia
  },
  loader: {
    marginBottom: 16,
    transform: [{ scale: 1.2 }], // Ligeramente más grande
  },
  loadingText: {
    fontSize: SAFE_TYPOGRAPHY?.fontSize?.lg || 18,
    color: COLORS.neutral.gray[600],
    letterSpacing: 0.5,
    fontWeight: SAFE_TYPOGRAPHY?.fontWeight?.medium || '500',
  },
  highlightText: {
    color: COLORS.primary[500], // Deep Space Blue highlight
    fontWeight: SAFE_TYPOGRAPHY?.fontWeight?.bold || '700',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
    overflow: 'hidden',
  },
  footerLine: {
    height: '100%',
    width: '100%',
    backgroundColor: COLORS.primary[500],
    opacity: 0.1,
  },
});

export default SplashScreen;

