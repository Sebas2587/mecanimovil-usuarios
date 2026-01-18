import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';

/**
 * Componente para mostrar mensajes de validación de vehículos
 * Se usa cuando el usuario no tiene vehículos o no hay servicios compatibles
 */
const VehicleValidationMessage = ({ 
  title, 
  message, 
  actionText, 
  actionRoute, 
  icon = 'car-outline',
  style 
}) => {
  const navigation = useNavigation();

  const handleActionPress = () => {
    if (actionRoute) {
      navigation.navigate(actionRoute);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={64} color={COLORS.textLight} />
      </View>
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      
      {actionText && actionRoute && (
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleActionPress}
        >
          <Text style={styles.actionButtonText}>{actionText}</Text>
          <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },
  iconContainer: {
    marginBottom: SPACING.lg,
    opacity: 0.6,
  },
  title: {
    fontSize: FONT_SIZES.h3,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  message: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
});

export default VehicleValidationMessage; 