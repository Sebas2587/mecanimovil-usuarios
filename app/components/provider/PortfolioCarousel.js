import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import Icon from '../base/Icon/Icon';

const PortfolioCarousel = ({ portfolio }) => {
  if (!portfolio || portfolio.length === 0) return null;
  const items = portfolio;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon name="images" size={18} color={COLORS.icon.active} />
        </View>
        <Text style={styles.title}>Trabajos Realizados</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={Platform.OS === 'web' ? styles.horizontalScrollWeb : undefined}
      >
        {items.map((item, index) => (
          <TouchableOpacity key={item.id || index} style={styles.card} activeOpacity={0.9}>
            <Image
              source={{ uri: item.image || item.url }}
              style={styles.image}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title || item.descripcion || 'Trabajo realizado'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: SPACING.container.horizontal,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: -0.25,
    color: COLORS.text.primary,
  },
  scrollContent: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingBottom: 8,
  },
  card: {
    width: 240,
    marginRight: 16,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.neutral.gray[100],
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
  },
  horizontalScrollWeb: {
    touchAction: 'pan-x',
    overscrollBehaviorX: 'contain',
  },
});

export default PortfolioCarousel;
