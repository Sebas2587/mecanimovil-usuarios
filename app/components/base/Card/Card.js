import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS } from '../../../design-system/tokens';

const PADDING = {
  none: 0,
  sm: SPACING.sm,
  md: SPACING.md,
  lg: SPACING.lg,
  xl: SPACING.xl,
};

const Card = ({
  children,
  style,
  variant = 'outlined',
  elevation = 'sm',
  padding = 'md',
  onPress,
  header,
  footer,
  ...props
}) => {
  const Container = onPress ? TouchableOpacity : View;
  const shadow = variant === 'elevated' ? SHADOWS[elevation] || SHADOWS.sm : SHADOWS.none;
  const borderStyle =
    variant === 'outlined' || variant === 'elevated'
      ? { borderWidth: BORDERS.width.thin, borderColor: COLORS.border.light }
      : null;

  return (
    <Container
      style={[
        styles.container,
        {
          backgroundColor: COLORS.background.paper,
          borderRadius: BORDERS.radius.card.lg,
          padding: PADDING[padding] ?? PADDING.md,
        },
        shadow,
        borderStyle,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.92}
      disabled={!onPress}
      {...props}
    >
      {header ? (
        <View style={styles.header}>
          {typeof header === 'string' ? (
            <Text style={[TYPOGRAPHY.styles.h4, styles.headerText]}>{header}</Text>
          ) : (
            header
          )}
        </View>
      ) : null}
      <View style={styles.content}>{children}</View>
      {footer ? (
        <View style={styles.footer}>
          {typeof footer === 'string' ? (
            <Text style={[TYPOGRAPHY.styles.caption, styles.footerText]}>{footer}</Text>
          ) : (
            footer
          )}
        </View>
      ) : null}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  header: {
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
  },
  headerText: { color: COLORS.text.primary },
  content: {},
  footer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
  },
  footerText: { color: COLORS.text.secondary },
});

export default Card;
