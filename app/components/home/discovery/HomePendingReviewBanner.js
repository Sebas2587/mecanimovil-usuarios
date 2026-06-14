import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../../design-system/tokens';
import Button from '../../base/Button/Button';

const HomePendingReviewBanner = ({ count = 0, onPress }) => {
  if (!count || count < 1) return null;

  const label =
    count === 1
      ? 'Tienes 1 servicio pendiente de calificar'
      : `Tienes ${count} servicios pendientes de calificar`;

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Star size={20} color={COLORS.warning.dark} fill={COLORS.warning[100]} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Califica tu experiencia</Text>
        <Text style={styles.subtitle}>{label}</Text>
      </View>
      <Button
        title="Calificar"
        onPress={onPress}
        type="primary"
        variant="solid"
        size="sm"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.container.horizontal,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.warning[200],
    backgroundColor: COLORS.warning[50],
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
});

export default React.memo(HomePendingReviewBanner);
