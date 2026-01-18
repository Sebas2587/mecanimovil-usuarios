import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';

// Safe access to TYPOGRAPHY with fallback values - MUST be before any usage
const getSafeTypography = () => {
  try {
    if (TYPOGRAPHY && TYPOGRAPHY?.fontSize && TYPOGRAPHY?.fontWeight &&
      typeof TYPOGRAPHY?.fontSize?.xs !== 'undefined' &&
      typeof TYPOGRAPHY?.fontWeight?.semibold !== 'undefined') {
      return TYPOGRAPHY;
    }
  } catch (e) {
    console.warn('TYPOGRAPHY not ready in ConnectionStatusIndicator:', e);
  }
  return {
    fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36 },
    fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
  };
};

const SAFE_TYPOGRAPHY = getSafeTypography();

const ConnectionStatusIndicator = ({ isConnected, lastConnection, showDetails = false, status = 'offline' }) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isConnected) {
      // Animación de pulso para indicar conexión activa
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Detener animación si está desconectado
      pulseAnim.setValue(1);
    }
  }, [isConnected]);

  const getStatusColor = () => {
    if (status === 'online') return COLORS.success[500];
    if (status === 'busy') return COLORS.warning[500];
    return COLORS.error[500];
  };

  const getStatusText = () => {
    if (status === 'online') return 'En línea';
    if (status === 'busy') return 'En servicio';
    return 'Desconectado';
  };

  const getStatusIcon = () => {
    if (status === 'online') return 'wifi';
    if (status === 'busy') return 'build';
    return 'wifi-off';
  };

  const formatLastConnection = (lastConnection) => {
    if (!lastConnection) return 'Nunca';
    
    try {
      const date = new Date(lastConnection);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Ahora';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)}h`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'N/A';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <Animated.View style={{ opacity: pulseAnim }}>
          <MaterialIcons
            name={getStatusIcon()}
            size={12}
            color={getStatusColor()}
          />
        </Animated.View>
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>
      
      {showDetails && (
        <Text style={styles.detailsText}>
          Última conexión: {formatLastConnection(lastConnection)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: SPACING.xs / 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  statusText: {
    fontSize: SAFE_TYPOGRAPHY.fontSize.xs,
    fontWeight: SAFE_TYPOGRAPHY.fontWeight.semibold,
    marginLeft: SPACING.xs,
  },
  detailsText: {
    fontSize: SAFE_TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginLeft: SPACING.xs,
  },
});

export default ConnectionStatusIndicator; 