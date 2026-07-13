import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../../design-system/tokens';

const SectionHeader = ({ title, hint, actionLabel, onAction, icon }) => (
  <View style={styles.row}>
    <View style={styles.left}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View>
        <Text style={[TYPOGRAPHY.styles.h3, styles.title]}>{title}</Text>
        {hint ? (
          <Text style={[TYPOGRAPHY.styles.caption, styles.hint]}>{hint}</Text>
        ) : null}
      </View>
    </View>
    {actionLabel && onAction ? (
      <TouchableOpacity onPress={onAction} hitSlop={8}>
        <Text style={[TYPOGRAPHY.styles.captionBold, styles.action]}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flex: 1 },
  icon: { marginRight: SPACING.xxs },
  title: { color: COLORS.text.primary },
  hint: { color: COLORS.text.secondary, marginTop: 2 },
  action: { color: COLORS.primary[500] },
});

export default SectionHeader;
