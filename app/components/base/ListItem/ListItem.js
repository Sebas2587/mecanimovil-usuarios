import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../../design-system/tokens';

const ListItem = ({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onPress,
  showChevron = !!onPress,
  badge,
  style,
}) => {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.row, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {leftIcon ? <View style={styles.left}>{leftIcon}</View> : null}
      <View style={styles.textCol}>
        <Text style={[TYPOGRAPHY.styles.body, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[TYPOGRAPHY.styles.caption, styles.subtitle]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge ? <View style={styles.badgeWrap}>{badge}</View> : null}
      {rightIcon || (showChevron && onPress) ? (
        <View style={styles.right}>
          {rightIcon || <ChevronRight size={20} color={COLORS.text.tertiary} />}
        </View>
      ) : null}
    </Container>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  left: { width: 40, alignItems: 'center' },
  textCol: { flex: 1 },
  title: { color: COLORS.text.primary },
  subtitle: { color: COLORS.text.secondary, marginTop: 2 },
  badgeWrap: { marginRight: SPACING.xs },
  right: { marginLeft: SPACING.xs },
});

export default ListItem;
