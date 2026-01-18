import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';
import { COLORS, SPACING, BORDERS } from '../../utils/constants';

/**
 * Componente de conteo regresivo para solicitudes y ofertas
 * @param {string} targetDate - Fecha objetivo en formato ISO string
 * @param {string} type - Tipo de contador: 'solicitud' | 'pago'
 * @param {string} size - Tamaño: 'small' | 'medium' | 'large'
 * @param {boolean} showIcon - Si muestra el icono
 * @param {Object} style - Estilos adicionales
 */
const CountdownTimer = ({ 
  targetDate, 
  type = 'solicitud',
  size = 'medium',
  showIcon = true,
  style 
}) => {
  const theme = useTheme();
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  // Extraer valores del tema
  const colors = theme?.colors || {};
  const typography = theme?.typography || {};
  const spacing = theme?.spacing || {};
  const borders = theme?.borders || {};

  useEffect(() => {
    if (!targetDate) {
      setTimeRemaining(null);
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date();
      const target = new Date(targetDate);
      const diff = target - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining(null);
        return;
      }

      setIsExpired(false);
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds, totalSeconds: diff / 1000 });
    };

    // Calcular inmediatamente
    calculateTimeRemaining();

    // Actualizar cada segundo
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  // Si no hay fecha objetivo o ya expiró, no mostrar nada
  if (!targetDate || isExpired) {
    return null;
  }

  if (!timeRemaining) {
    return null;
  }

  // Determinar color según tiempo restante
  const getColorConfig = () => {
    const totalHours = timeRemaining.days * 24 + timeRemaining.hours;
    
    if (totalHours > 24) {
      // Verde: más de 24 horas
      return {
        backgroundColor: colors.success?.[50] || '#ECFDF5',
        borderColor: colors.success?.[300] || '#6EE7B7',
        textColor: colors.success?.[700] || '#047857',
        iconColor: colors.success?.[600] || '#10B981',
      };
    } else if (totalHours > 6) {
      // Amarillo: 6-24 horas
      return {
        backgroundColor: colors.warning?.[50] || '#FFFBEB',
        borderColor: colors.warning?.[300] || '#FCD34D',
        textColor: colors.warning?.[700] || '#B45309',
        iconColor: colors.warning?.[600] || '#F59E0B',
      };
    } else {
      // Rojo: menos de 6 horas
      return {
        backgroundColor: colors.error?.[50] || '#FEF2F2',
        borderColor: colors.error?.[300] || '#FCA5A5',
        textColor: colors.error?.[700] || '#B91C1C',
        iconColor: colors.error?.[600] || '#EF4444',
      };
    }
  };

  const colorConfig = getColorConfig();

  // Formatear tiempo restante
  const formatTime = () => {
    const { days, hours, minutes } = timeRemaining;
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Mensaje contextual según tipo
  const getMessage = () => {
    if (type === 'pago') {
      return 'Tiempo para pagar';
    } else {
      return 'Tiempo para recibir ofertas';
    }
  };

  // Tamaños de fuente según size prop
  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          fontSize: typography.fontSize?.xs || 10,
          iconSize: 12,
          padding: spacing.xs || 4,
          gap: spacing.xs || 4,
        };
      case 'large':
        return {
          fontSize: typography.fontSize?.sm || 13,
          iconSize: 16,
          padding: spacing.sm || 8,
          gap: spacing.sm || 8,
        };
      default: // medium
        return {
          fontSize: typography.fontSize?.xs || 11,
          iconSize: 14,
          padding: spacing.xs || 6,
          gap: spacing.xs || 6,
        };
    }
  };

  const sizeConfig = getSizeConfig();

  const styles = createStyles(colorConfig, sizeConfig, borders);

  return (
    <View style={[styles.container, style]}>
      {showIcon && (
        <Ionicons 
          name="time-outline" 
          size={sizeConfig.iconSize} 
          color={colorConfig.iconColor} 
        />
      )}
      <View style={styles.textContainer}>
        <Text style={styles.message} numberOfLines={1}>
          {getMessage()}
        </Text>
        <Text style={styles.time} numberOfLines={1}>
          {formatTime()}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (colorConfig, sizeConfig, borders) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorConfig.backgroundColor,
    borderWidth: 1,
    borderColor: colorConfig.borderColor,
    borderRadius: borders.radius?.sm || BORDERS.radius.sm,
    paddingHorizontal: sizeConfig.padding,
    paddingVertical: sizeConfig.padding / 2,
    gap: sizeConfig.gap,
  },
  textContainer: {
    flex: 1,
    flexDirection: 'column',
    gap: 1,
  },
  message: {
    fontSize: sizeConfig.fontSize - 1,
    color: colorConfig.textColor,
    fontWeight: '500',
    lineHeight: sizeConfig.fontSize,
  },
  time: {
    fontSize: sizeConfig.fontSize,
    color: colorConfig.textColor,
    fontWeight: '700',
    lineHeight: sizeConfig.fontSize + 2,
  },
});

export default CountdownTimer;

