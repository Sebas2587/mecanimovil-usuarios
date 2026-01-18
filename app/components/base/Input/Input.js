/**
 * Input Component - MecaniMóvil
 * Componente de entrada de texto reutilizable con nueva paleta de colores
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TOKENS } from '../../../design-system/tokens';

// Fallback values in case tokens are not ready
const SAFE_COLORS = TOKENS?.colors || {
  border: { error: '#EF4444', focus: '#3B82F6', main: '#E5E7EB' },
  background: { paper: '#FFFFFF', error: '#FEF2F2' },
  neutral: { gray: { 100: '#F3F4F6' } },
  text: { primary: '#111827', secondary: '#4B5563', hint: '#9CA3AF' },
  error: { main: '#EF4444' }
};

const SAFE_TYPOGRAPHY = TOKENS?.typography || {
  fontSize: { xs: 12, sm: 14, md: 16, lg: 18 },
  fontWeight: { medium: '500' }
};

const SAFE_SPACING = TOKENS?.spacing || {
  xs: 4, sm: 8, md: 16, lg: 24,
  inputPadding: 16
};

const SAFE_BORDERS = TOKENS?.borders || {
  radius: { input: { md: 8 } },
  width: { thin: 1 }
};

const SAFE_SHADOWS = TOKENS?.shadows || {
  inputFocus: {},
  none: {}
};

/**
 * Input Component
 * ... (docs remain same)
 */
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
  leftIcon,
  rightIcon,
  onLeftIconPress,
  onRightIconPress,
  helperText,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Memoizar estilos según el tamaño
  const sizeStyles = useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          height: 40,
          paddingHorizontal: (SAFE_SPACING.inputPadding || 16) * 0.75,
          fontSize: SAFE_TYPOGRAPHY.fontSize?.sm || 14,
        };
      case 'lg':
        return {
          height: 56,
          paddingHorizontal: (SAFE_SPACING.inputPadding || 16) * 1.25,
          fontSize: SAFE_TYPOGRAPHY.fontSize?.lg || 18,
        };
      default: // md
        return {
          height: 48,
          paddingHorizontal: SAFE_SPACING.inputPadding || 16,
          fontSize: SAFE_TYPOGRAPHY.fontSize?.md || 16,
        };
    }
  }, [size]);

  const borderRadius = SAFE_BORDERS.radius?.input?.md || 8;

  // Memoizar estilos según la variante y estado
  const containerStyles = useMemo(() => {
    const borderColor = error 
      ? SAFE_COLORS.border?.error 
      : (isFocused ? SAFE_COLORS.border?.focus : SAFE_COLORS.border?.main);
    
    let backgroundColor = SAFE_COLORS.background?.paper || '#FFF';
    if (variant === 'filled') {
      backgroundColor = error ? SAFE_COLORS.background?.error : SAFE_COLORS.neutral?.gray?.[100];
    } else if (error) {
      backgroundColor = SAFE_COLORS.background?.error;
    }

    return {
      height: sizeStyles.height,
      paddingHorizontal: sizeStyles.paddingHorizontal,
      borderRadius,
      borderColor,
      borderWidth: SAFE_BORDERS.width?.thin || 1,
      backgroundColor,
    };
  }, [sizeStyles, borderRadius, variant, error, isFocused]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const togglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible(prev => !prev);
  }, []);

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: SAFE_COLORS.text?.primary,
              fontSize: SAFE_TYPOGRAPHY.fontSize?.sm || 14,
              fontWeight: SAFE_TYPOGRAPHY.fontWeight?.medium || '500',
              marginBottom: SAFE_SPACING.xs || 4,
            },
          ]}
        >
          {label}
        </Text>
      )}
      <View style={[styles.inputContainer, containerStyles]}>
        {leftIcon && (
          <TouchableOpacity
            onPress={onLeftIconPress}
            style={styles.leftIcon}
            disabled={!onLeftIconPress}
            activeOpacity={0.7}
          >
            <Ionicons
              name={leftIcon}
              size={20}
              color={SAFE_COLORS.text?.secondary}
            />
          </TouchableOpacity>
        )}
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={SAFE_COLORS.text?.hint}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          editable={true}
          selectTextOnFocus={false}
          style={[
            styles.input,
            {
              fontSize: sizeStyles.fontSize,
              color: SAFE_COLORS.text?.primary,
              paddingLeft: leftIcon ? (SAFE_SPACING.xs || 4) : 0,
              paddingRight: secureTextEntry 
                ? 36 // Espacio suficiente para el icono del ojo (22px icono + 8px padding + 6px margin)
                : (rightIcon ? (SAFE_SPACING.xs || 4) : 0),
            },
          ]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          {...props}
        />
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            disabled={!onRightIconPress}
            activeOpacity={0.7}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={SAFE_COLORS.text?.secondary}
            />
          </TouchableOpacity>
        )}
        {secureTextEntry && (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.eyeIcon}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={SAFE_COLORS.text?.secondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {(helperText || error) && (
        <Text
          style={[
            styles.helperText,
            {
              color: error ? SAFE_COLORS.error?.main : SAFE_COLORS.text?.hint,
              fontSize: SAFE_TYPOGRAPHY.fontSize?.xs || 12,
              marginTop: SAFE_SPACING.xs || 4,
            },
          ]}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    // Estilos definidos inline para usar tokens
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    margin: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
    minHeight: 0,
  },
  eyeIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  leftIcon: {
    marginRight: SAFE_SPACING.xs || 4,
  },
  rightIcon: {
    marginLeft: SAFE_SPACING.xs || 4,
  },
  helperText: {
    // Estilos definidos inline
  },
  errorText: {
    // Estilos definidos inline para usar tokens
  },
});

export default Input;

