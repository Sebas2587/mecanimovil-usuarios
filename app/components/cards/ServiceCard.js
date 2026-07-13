import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Wrench, ChevronRight } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, BORDERS, SPACING } from '../../design-system/tokens';

/** Summary row Airbnb para servicios. */
const ServiceCard = ({ name, priceLabel, providerName, onPress }) => (
  <TouchableOpacity
    style={styles.card}
    onPress={onPress}
    activeOpacity={0.92}
    disabled={!onPress}
  >
    <View style={styles.icon}>
      <Wrench size={20} color={COLORS.text.primary} strokeWidth={1.75} />
    </View>
    <View style={styles.body}>
      <Text style={[TYPOGRAPHY.styles.bodyBold, styles.name]} numberOfLines={2}>
        {name}
      </Text>
      {providerName ? (
        <Text style={[TYPOGRAPHY.styles.caption, styles.provider]} numberOfLines={1}>
          {providerName}
        </Text>
      ) : null}
    </View>
    {priceLabel ? (
      <Text style={[TYPOGRAPHY.styles.captionBold, styles.price]}>{priceLabel}</Text>
    ) : (
      <ChevronRight size={18} color={COLORS.text.tertiary} strokeWidth={2} />
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.full,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: { flex: 1, minWidth: 0 },
  name: { color: COLORS.text.primary },
  provider: { color: COLORS.text.secondary, marginTop: 2 },
  price: { color: COLORS.text.primary, flexShrink: 0 },
});

export default React.memo(ServiceCard);
