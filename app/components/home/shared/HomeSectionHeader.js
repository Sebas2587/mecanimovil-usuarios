import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../design-system/tokens';
import HomeSectionSeeAll from './HomeSectionSeeAll';

/**
 * Encabezado de sección del feed (título + Ver todos). Patrón Airbnb: sin ícono ni hint.
 */
const HomeSectionHeader = ({ title, onSeeAll, seeAllLabel, seeAllDisabled }) => (
  <View style={styles.headerRow}>
    <Text style={styles.title} numberOfLines={1}>
      {title}
    </Text>
    <HomeSectionSeeAll onPress={onSeeAll} label={seeAllLabel} disabled={seeAllDisabled} />
  </View>
);

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: -0.25,
    color: COLORS.text.primary,
    marginRight: SPACING.sm,
  },
});

export default React.memo(HomeSectionHeader);
