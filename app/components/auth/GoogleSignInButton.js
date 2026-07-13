import React from 'react';
import { Pressable, Text, View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS, withOpacity } from '../../design-system/tokens';
import Icon from '../base/Icon/Icon';

/**
 * Botón estilo "Sign in with Google" (fondo claro, borde, logo + texto).
 */
const GoogleSignInButton = ({ onPress, isLoading = false, disabled = false, style }) => {
  const isDisabled = disabled || isLoading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={{ color: withOpacity(COLORS.base.inkBlack, 0.06) }}
      style={({ pressed }) => [
        styles.root,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        isLoading && styles.loadingState,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={COLORS.text.primary} />
      ) : (
        <View style={styles.row}>
          <Icon name="logo-google" size={22} color={COLORS.info.main} />
          <Text style={styles.label}>Continuar con Google</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: BORDERS.radius?.sm ?? 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray[500],
    backgroundColor: COLORS.background.paper,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: SHADOWS.sm,
      android: { elevation: 1 },
    }),
  },
  pressed: {
    backgroundColor: COLORS.neutral.gray[50],
    borderColor: COLORS.text.secondary,
  },
  loadingState: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.45,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    letterSpacing: 0.15,
    lineHeight: 22,
    color: COLORS.text.primary,
  },
});

export default GoogleSignInButton;
