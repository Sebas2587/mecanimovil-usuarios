import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../design-system/tokens';
import HomeSectionSeeAll from './HomeSectionSeeAll';

/**
 * Encabezado de sección del feed (título + Ver todos).
 * Airbnb: título sentence-case, tipografía h4, sin ícono ni hint; layout estático.
 */
const HomeSectionHeader = ({ title, onSeeAll, seeAllLabel, seeAllDisabled }) => {
  const showSeeAll = Boolean(onSeeAll) && !seeAllDisabled;

  return (
    <View style={styles.headerRow}>
      <Text
        style={[styles.title, showSeeAll && styles.titleWithAction]}
        numberOfLines={2}
      >
        {title}
      </Text>
      <HomeSectionSeeAll onPress={onSeeAll} label={seeAllLabel} disabled={seeAllDisabled} />
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.styles.h4,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    flexShrink: 1,
  },
  titleWithAction: {
    flex: 1,
    minWidth: 0,
    marginRight: SPACING.sm,
  },
});

export default React.memo(HomeSectionHeader);
