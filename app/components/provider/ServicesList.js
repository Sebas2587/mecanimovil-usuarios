import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import Icon from '../base/Icon/Icon';
import PrimaryGradientFill from '../base/PrimaryGradientFill/PrimaryGradientFill';

const ServicesList = ({ services, onServicePress }) => {
  if (!services || services.length === 0) return null;

  const formatPrice = (price) => {
    if (price == null || price === '' || isNaN(Number(price))) return null;
    return `$${Number(price).toLocaleString('es-CL')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon name="construct" size={18} color={COLORS.icon.active} />
        </View>
        <Text style={styles.title}>Servicios Principales</Text>
      </View>

      <View style={styles.listContainer}>
        {services.map((service, index) => {
          const price = service.precio_desde ?? service.precio_publicado_cliente ?? service.price;
          const formattedPrice = formatPrice(price);
          return (
            <View key={service.id || index} style={styles.serviceCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <Icon name="construct-outline" size={20} color={COLORS.icon.active} />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.serviceName}>{service.nombre || service.name}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                {formattedPrice ? (
                  <View style={styles.priceRow}>
                    <Text style={styles.startLabel}>Desde</Text>
                    <Text style={styles.priceText}>{formattedPrice}</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.agendarButtonWrap}
                  onPress={() => onServicePress?.(service)}
                  activeOpacity={0.85}
                >
                  <PrimaryGradientFill style={styles.agendarButton}>
                    <Icon
                      name="calendar-outline"
                      size={16}
                      color={COLORS.text.inverse}
                      style={styles.agendarIcon}
                    />
                    <Text style={styles.agendarButtonText}>Agendar</Text>
                  </PrimaryGradientFill>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.container.horizontal,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  listContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.background.secondary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTextContainer: {
    width: '100%',
  },
  serviceName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: 2,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  priceRow: {
    marginBottom: 10,
  },
  startLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    marginBottom: 2,
  },
  priceText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  agendarButtonWrap: {
    borderRadius: BORDERS.radius.button?.md ?? BORDERS.radius.full,
    overflow: 'hidden',
  },
  agendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.buttonPadding?.horizontal ?? 20,
    paddingVertical: SPACING.buttonPadding?.vertical ?? 14,
  },
  agendarIcon: {
    marginRight: 6,
  },
  agendarButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
});

export default ServicesList;
