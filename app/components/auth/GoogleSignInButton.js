import React from 'react';
import { Pressable, Text, View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';

/**
 * Botón estilo "Sign in with Google" (fondo claro, borde, logo + texto).
 */
const GoogleSignInButton = ({ onPress, isLoading = false, disabled = false, style }) => {
  const isDisabled = disabled || isLoading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
      style={({ pressed }) => [
        styles.root,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        isLoading && styles.loadingState,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#1F1F1F" />
      ) : (
        <View style={styles.row}>
          <Ionicons name="logo-google" size={22} color="#4285F4" />
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
    borderColor: '#747775',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    }),
  },
  pressed: {
    backgroundColor: '#F8F9FA',
    borderColor: '#5F6368',
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
    color: COLORS.text?.primary ?? '#1F1F1F',
  },
});

export default GoogleSignInButton;
