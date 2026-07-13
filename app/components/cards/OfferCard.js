import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, TYPOGRAPHY, BORDERS, SPACING } from '../../design-system/tokens';

/** Summary/listing row Airbnb para ofertas. */
const OfferCard = ({ providerName, amountLabel, statusLabel, onPress }) => (
  <TouchableOpacity
    style={styles.card}
    onPress={onPress}
    activeOpacity={0.92}
    disabled={!onPress}
  >
    <Text style={[TYPOGRAPHY.styles.bodyBold, styles.name]} numberOfLines={1}>
      {providerName}
    </Text>
    {amountLabel ? (
      <Text style={[TYPOGRAPHY.styles.h4, styles.amount]}>{amountLabel}</Text>
    ) : null}
    {statusLabel ? (
      <Text style={[TYPOGRAPHY.styles.caption, styles.status]}>{statusLabel}</Text>
    ) : null}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  name: { color: COLORS.text.primary },
  amount: { color: COLORS.text.primary, marginTop: 4 },
  status: { color: COLORS.primary[500], marginTop: SPACING.xs },
});

export default React.memo(OfferCard);
