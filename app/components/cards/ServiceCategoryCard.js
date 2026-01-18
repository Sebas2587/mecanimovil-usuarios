import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';

const ServiceCategoryCard = ({ category, servicesCount, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(category);
    }
  };

  return (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name={category.icon} 
          size={48} 
          color={category.color} 
        />
      </View>
      
      <Text style={styles.categoryName}>{category.name}</Text>
      
      {servicesCount !== undefined && (
        <Text style={styles.servicesCount}>
          {servicesCount} servicio{servicesCount !== 1 ? 's' : ''}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  categoryCard: {
    backgroundColor: COLORS.glass.white,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    marginBottom: SPACING.md,
  },
  categoryName: {
    fontSize: FONT_SIZES.body,
    fontWeight: 'bold',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  servicesCount: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});

export default ServiceCategoryCard; 