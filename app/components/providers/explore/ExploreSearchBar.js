import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../../design-system/tokens';

const ExploreSearchBar = ({ value, onChangeText, placeholder = 'Buscar taller o servicio…' }) => (
  <View style={styles.wrap}>
    <Search size={18} color={COLORS.text.tertiary} />
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.text.tertiary}
      returnKeyType="search"
      autoCorrect={false}
      clearButtonMode="while-editing"
    />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    padding: 0,
  },
});

export default React.memo(ExploreSearchBar);
