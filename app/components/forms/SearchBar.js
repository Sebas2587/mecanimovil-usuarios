import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';

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
        <Ionicons 
          name="search" 
          size={20} 
          color={COLORS.textLight || '#666'} 
        />
      </View>
      
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight || '#666'}
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
          <Ionicons name="close-circle" size={20} color={COLORS.textLight || '#666'} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white || '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: SPACING?.md || 16,
    paddingVertical: SPACING?.sm || 12,
    minHeight: 48,
    borderWidth: 1,
    borderColor: COLORS.borderLight || '#E5E5E5',
    shadowColor: '#000',
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
    color: COLORS.text || '#333333',
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: SPACING?.sm || 8,
    padding: 4,
  },
});

export default SearchBar; 