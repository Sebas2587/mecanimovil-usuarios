import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';
import PrimaryGradientBadge from '../base/PrimaryGradientBadge/PrimaryGradientBadge';

const HistoryItemCard = ({ title, dateLabel, providerName, amountLabel, isLast }) => (
  <View style={[styles.row, !isLast && styles.border]}>
    <View style={styles.dotCol}>
      <PrimaryGradientBadge style={styles.dot} />
      {!isLast ? <View style={styles.line} /> : null}
    </View>
    <View style={styles.body}>
      <Text style={[TYPOGRAPHY.styles.h5, styles.title]}>{title}</Text>
      <Text style={[TYPOGRAPHY.styles.caption, styles.meta]}>
        {[dateLabel, providerName].filter(Boolean).join(' · ')}
      </Text>
      {amountLabel ? (
        <Text style={[TYPOGRAPHY.styles.captionBold, styles.amount]}>{amountLabel}</Text>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingBottom: SPACING.md },
  border: {},
  dotCol: { width: 24, alignItems: 'center' },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: COLORS.border.light,
    marginTop: 4,
  },
  body: { flex: 1, paddingLeft: SPACING.sm },
  title: { color: COLORS.text.primary },
  meta: { color: COLORS.text.secondary, marginTop: 2 },
  amount: { color: COLORS.text.primary, marginTop: 4 },
});

export default React.memo(HistoryItemCard);
