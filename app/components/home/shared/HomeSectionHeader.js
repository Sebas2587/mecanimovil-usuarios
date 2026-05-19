import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../../../design-system/tokens';
import HomeSectionSeeAll from './HomeSectionSeeAll';

/**
 * Encabezado de sección del feed de descubrimiento (icono + título + hint + Ver todos).
 */
const HomeSectionHeader = ({ icon, title, hint, onSeeAll, seeAllLabel, seeAllDisabled }) => (
  <View style={styles.wrap}>
    <View style={styles.headerRow}>
      <View style={styles.titleRow}>
        {icon}
        <Text style={styles.title}>{title}</Text>
      </View>
      <HomeSectionSeeAll onPress={onSeeAll} label={seeAllLabel} disabled={seeAllDisabled} />
    </View>
    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: -0.25,
    color: COLORS.text.primary,
  },
  hint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 17,
    marginBottom: 12,
  },
});

export default React.memo(HomeSectionHeader);
