import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GuestGradientButton from '../../guest/GuestGradientButton';
import { COLORS, TYPOGRAPHY, SPACING } from '../../../design-system/tokens';

const EmptyState = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}) => (
  <View style={styles.wrap}>
    {icon ? <View style={styles.icon}>{icon}</View> : null}
    {title ? (
      <Text style={[TYPOGRAPHY.styles.h3, styles.title]}>{title}</Text>
    ) : null}
    {message ? (
      <Text style={[TYPOGRAPHY.styles.body, styles.message]}>{message}</Text>
    ) : null}
    {actionLabel && onAction ? (
      <GuestGradientButton title={actionLabel} onPress={onAction} style={styles.btn} />
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING['2xl'],
    paddingHorizontal: SPACING.lg,
  },
  icon: { marginBottom: SPACING.md },
  title: {
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  message: {
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  btn: { minWidth: 200 },
});

export default EmptyState;
