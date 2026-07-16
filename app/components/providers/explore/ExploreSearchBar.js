import React from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import { Search } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING, SHADOWS } from '../../../design-system/tokens';

/**
 * Buscador explore — Airbnb: paper elevado sobre canvas #F9F9F9.
 * (Tonal #F3F3F3 sobre canvas se funde; el buscador debe leerse como campo.)
 * Sin outline de focus naranja en web.
 */
const ExploreSearchBar = ({ value, onChangeText, placeholder = 'Buscar taller o servicio…' }) => (
  <View style={styles.wrap}>
    <Search size={18} color={COLORS.icon.default} strokeWidth={2} />
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.tab.unselected}
      returnKeyType="search"
      autoCorrect={false}
      clearButtonMode="while-editing"
      underlineColorAndroid="transparent"
      selectionColor={COLORS.brand.orange}
      {...(Platform.OS === 'web'
        ? { outlineStyle: 'none', outlineWidth: 0 }
        : null)}
    />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    minHeight: 44,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.primary,
    padding: 0,
    margin: 0,
    ...(Platform.OS === 'web'
      ? { outlineStyle: 'none', outlineWidth: 0 }
      : null),
  },
});

export default React.memo(ExploreSearchBar);
