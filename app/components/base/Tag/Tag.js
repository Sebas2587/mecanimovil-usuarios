import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, BORDERS, SPACING } from '../../../design-system/tokens';

const VARIANT_STYLES = {
  primary: { bg: COLORS.primary[50], text: COLORS.primary[600] },
  secondary: { bg: COLORS.secondary[50], text: COLORS.secondary[700] },
  success: { bg: COLORS.success.light, text: COLORS.success.main },
  warning: { bg: COLORS.warning.light, text: COLORS.warning.main },
  error: { bg: COLORS.error.light, text: COLORS.error.main },
  accent: { bg: COLORS.accent[50], text: COLORS.accent[600] },
  neutral: { bg: COLORS.neutral.gray[100], text: COLORS.text.secondary },
};

const Tag = ({
  label,
  variant = 'neutral',
  size = 'md',
  selected = false,
  closable = false,
  onPress,
  onClose,
  icon,
  style,
  textStyle,
}) => {
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.neutral;
  const isSmall = size === 'sm';

  const content = (
    <View
      style={[
        styles.tag,
        {
          backgroundColor: selected ? COLORS.primary[500] : v.bg,
          borderRadius: BORDERS.radius.pill,
          paddingHorizontal: isSmall ? 10 : 12,
          paddingVertical: isSmall ? 4 : 6,
        },
        style,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text
        style={[
          isSmall ? TYPOGRAPHY.styles.small : TYPOGRAPHY.styles.caption,
          styles.label,
          { color: selected ? COLORS.text.inverse : v.text },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {closable && onClose ? (
        <Pressable onPress={onClose} hitSlop={8} style={styles.close}>
          <X size={14} color={selected ? COLORS.text.inverse : v.text} />
        </Pressable>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {content}
      </Pressable>
    );
  }
  return content;
};

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xxs,
    flexShrink: 0,
  },
  label: {
    flexShrink: 0,
  },
  icon: { marginRight: 2 },
  close: { marginLeft: 4 },
});

export default Tag;
