/**
 * Input — Airbnb-style, tokens only, sin darkGlass
 */
import React, { useState, useMemo } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS } from '../../../design-system/tokens';
import Icon from '../Icon/Icon';

const SIZES = {
  sm: { height: 40, px: 12, fontSize: TYPOGRAPHY.fontSize.sm },
  md: { height: 48, px: 16, fontSize: TYPOGRAPHY.fontSize.md },
  lg: { height: 52, px: 18, fontSize: TYPOGRAPHY.fontSize.lg },
};

const Input = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  label,
  error,
  style,
  keyboardType = 'default',
  autoCapitalize = 'none',
  size = 'md',
  variant = 'default',
  appearance = 'light',
  leftIcon,
  rightIcon,
  onLeftIconPress,
  onRightIconPress,
  helperText,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const sizeSpec = SIZES[size] || SIZES.md;

  const containerStyles = useMemo(() => {
    const borderColor = error
      ? COLORS.border.error
      : isFocused
        ? COLORS.border.focus
        : COLORS.border.light;

    let backgroundColor = COLORS.background.paper;
    if (variant === 'filled') {
      backgroundColor = error ? COLORS.background.error : COLORS.neutral.gray[100];
    } else if (error) {
      backgroundColor = COLORS.background.error;
    }

    return {
      height: sizeSpec.height,
      paddingHorizontal: sizeSpec.px,
      borderRadius: BORDERS.radius.input.md,
      borderColor,
      borderWidth: BORDERS.width.thin,
      backgroundColor,
      ...(isFocused && !error ? SHADOWS.inputFocus : SHADOWS.none),
    };
  }, [error, isFocused, sizeSpec, variant]);

  const iconColor = COLORS.text.secondary;

  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <Text style={[TYPOGRAPHY.styles.label, styles.label]}>{label}</Text>
      ) : null}
      <View style={[styles.container, containerStyles]}>
        {leftIcon ? (
          <TouchableOpacity
            onPress={onLeftIconPress}
            disabled={!onLeftIconPress}
            style={styles.iconBtn}
          >
            {typeof leftIcon === 'string' ? (
              <Icon name={leftIcon} size={20} color={iconColor} />
            ) : (
              leftIcon
            )}
          </TouchableOpacity>
        ) : null}
        <TextInput
          style={[
            styles.input,
            TYPOGRAPHY.styles.body,
            { fontSize: sizeSpec.fontSize, color: COLORS.text.primary },
          ]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.text.hint}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible((v) => !v)}
            style={styles.iconBtn}
            hitSlop={8}
          >
            {isPasswordVisible ? (
              <EyeOff size={20} color={iconColor} />
            ) : (
              <Eye size={20} color={iconColor} />
            )}
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={styles.iconBtn}
          >
            {typeof rightIcon === 'string' ? (
              <Icon name={rightIcon} size={20} color={iconColor} />
            ) : (
              rightIcon
            )}
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <Text style={[TYPOGRAPHY.styles.small, styles.error]}>{error}</Text>
      ) : helperText ? (
        <Text style={[TYPOGRAPHY.styles.small, styles.helper]}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.md },
  label: { color: COLORS.text.primary, marginBottom: SPACING.xs },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  iconBtn: { paddingHorizontal: 4 },
  error: { color: COLORS.error.main, marginTop: SPACING.xxs },
  helper: { color: COLORS.text.tertiary, marginTop: SPACING.xxs },
});

export default Input;
