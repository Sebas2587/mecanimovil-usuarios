/**
 * AlertaPagoProximo Component - MecaniMóvil
 * Componente snackbar para alertar al cliente sobre pago próximo a expirar
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS } from '../../design-system/tokens';

const { width: screenWidth } = Dimensions.get('window');

/**
 * AlertaPagoProximo Component
 * 
 * @param {boolean} visible - Si la alerta es visible
 * @param {string} mensaje - Mensaje a mostrar
 * @param {number} tiempoRestanteHoras - Horas restantes para pagar
 * @param {number} tiempoRestanteMinutos - Minutos restantes para pagar
 * @param {function} onDismiss - Función a ejecutar al descartar la alerta
 * @param {function} onPagar - Función a ejecutar al presionar "Pagar ahora"
 * @param {number} duration - Duración en ms antes de auto-ocultar (0 = no auto-ocultar)
 */
const AlertaPagoProximo = ({
  visible = false,
  mensaje,
  tiempoRestanteHoras = 0,
  tiempoRestanteMinutos = 0,
  onDismiss,
  onPagar,
  duration = 0, // Por defecto no auto-ocultar
  ...props
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animar entrada
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-ocultar si hay duración
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      handleDismiss();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) {
        onDismiss();
      }
    });
  };

  const formatTiempoRestante = () => {
    if (tiempoRestanteHoras > 0) {
      return `${tiempoRestanteHoras}h ${tiempoRestanteMinutos}m`;
    }
    return `${tiempoRestanteMinutos}m`;
  };

  if (!visible) {
    return null;
  }

  const warningColor = COLORS?.warning?.[500] || COLORS?.warning?.main || '#FFB84D';
  const textColor = '#FFFFFF';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom + (SPACING?.md || 16),
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View
        style={[
          styles.snackbar,
          {
            backgroundColor: warningColor,
            borderRadius: BORDERS?.radius?.lg || 12,
            paddingHorizontal: SPACING?.md || 16,
            paddingVertical: SPACING?.md || 16,
            ...(SHADOWS?.md || {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }),
          },
        ]}
      >
        <Ionicons
          name="time-outline"
          size={24}
          color={textColor}
          style={styles.icon}
        />
        <View style={styles.content}>
          <Text
            style={[
              styles.message,
              {
                color: textColor,
                fontSize: TYPOGRAPHY?.fontSize?.base || 14,
                fontWeight: TYPOGRAPHY?.fontWeight?.medium || '500',
              },
            ]}
            numberOfLines={2}
          >
            {mensaje || `Quedan ${formatTiempoRestante()} para pagar esta solicitud`}
          </Text>
          {tiempoRestanteHoras > 0 || tiempoRestanteMinutos > 0 ? (
            <Text
              style={[
                styles.tiempo,
                {
                  color: textColor,
                  fontSize: TYPOGRAPHY?.fontSize?.sm || 12,
                  fontWeight: TYPOGRAPHY?.fontWeight?.regular || '400',
                },
              ]}
            >
              Tiempo restante: {formatTiempoRestante()}
            </Text>
          ) : null}
        </View>
        {onPagar && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onPagar}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.actionText,
                {
                  color: textColor,
                  fontSize: TYPOGRAPHY?.fontSize?.sm || 12,
                  fontWeight: TYPOGRAPHY?.fontWeight?.semibold || '600',
                },
              ]}
            >
              Pagar
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleDismiss}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color={textColor} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SPACING?.md || 16,
    right: SPACING?.md || 16,
    zIndex: 9999,
  },
  snackbar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  icon: {
    marginRight: SPACING?.sm || 8,
  },
  content: {
    flex: 1,
    marginRight: SPACING?.sm || 8,
  },
  message: {
    marginBottom: SPACING?.xs || 4,
  },
  tiempo: {
    opacity: 0.9,
  },
  actionButton: {
    paddingHorizontal: SPACING?.md || 16,
    paddingVertical: SPACING?.xs || 4,
    marginRight: SPACING?.xs || 4,
    borderRadius: (BORDERS?.radius?.sm || 4) + 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionText: {
    textTransform: 'uppercase',
  },
  closeButton: {
    padding: SPACING?.xs || 4,
  },
});

export default AlertaPagoProximo;
