import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';
import BackButton from './BackButton';

/**
 * Header estándar de stack — back canónico + título centrado
 */
const AppHeader = ({
  title,
  onBack,
  rightComponent,
  backgroundColor = COLORS.background.default,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + SPACING.xs,
          backgroundColor,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.side}>
          {onBack ? <BackButton onPress={onBack} /> : null}
        </View>
        <Text style={[TYPOGRAPHY.styles.h5, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.side}>{rightComponent || null}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  side: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.text.primary,
  },
});

export default AppHeader;
