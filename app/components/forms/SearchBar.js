import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard
} from 'react-native';
import Icon from '../base/Icon/Icon';
import { COLORS } from '../../design-system/tokens';
import { SPACING, FONT_SIZES } from '../../utils/constants';

const SearchBar = ({ 
  placeholder = "Buscar...",
  value = '',
  onChangeText = () => {},
  style = null,
  autoFocus = false
}) => {
  const handleClear = () => {
    if (typeof onChangeText === 'function') {
      onChangeText('');
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Icon 
          name="search" 
          size={20} 
          color={COLORS.text.tertiary} 
        />
      </View>
      
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.text.tertiary}
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
        returnKeyType="search"
        onSubmitEditing={Keyboard.dismiss}
      />
      
      {value && value.length > 0 && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClear}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="close-circle" size={20} color={COLORS.text.tertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    paddingHorizontal: SPACING?.md || 16,
    paddingVertical: SPACING?.sm || 12,
    minHeight: 48,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    shadowColor: COLORS.base.inkBlack,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    marginRight: SPACING?.sm || 8,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES?.body || 16,
    color: COLORS.text.primary,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: SPACING?.sm || 8,
    padding: 4,
  },
});

export default SearchBar; 