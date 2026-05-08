import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../../design-system/tokens';

const COUNTRIES = [
  { code: '+56', name: 'Chile', flag: '🇨🇱', digits: 9 },
  { code: '+54', name: 'Argentina', flag: '🇦🇷', minDigits: 10, maxDigits: 11 },
  { code: '+57', name: 'Colombia', flag: '🇨🇴', digits: 10 },
  { code: '+52', name: 'México', flag: '🇲🇽', digits: 10 },
  { code: '+51', name: 'Perú', flag: '🇵🇪', digits: 9 },
  { code: '+58', name: 'Venezuela', flag: '🇻🇪', digits: 10 },
  { code: '+34', name: 'España', flag: '🇪🇸', digits: 9 },
  { code: '+1', name: 'EE.UU. / Canadá', flag: '🇺🇸', digits: 10 },
  { code: '+55', name: 'Brasil', flag: '🇧🇷', minDigits: 10, maxDigits: 11 },
  { code: '+598', name: 'Uruguay', flag: '🇺🇾', digits: 8 },
  { code: '+595', name: 'Paraguay', flag: '🇵🇾', digits: 9 },
  { code: '+591', name: 'Bolivia', flag: '🇧🇴', digits: 8 },
  { code: '+593', name: 'Ecuador', flag: '🇪🇨', digits: 9 },
  { code: '+507', name: 'Panamá', flag: '🇵🇦', digits: 8 },
  { code: '+506', name: 'Costa Rica', flag: '🇨🇷', digits: 8 },
  { code: '+502', name: 'Guatemala', flag: '🇬🇹', digits: 8 },
  { code: '+504', name: 'Honduras', flag: '🇭🇳', digits: 8 },
  { code: '+503', name: 'El Salvador', flag: '🇸🇻', digits: 8 },
  { code: '+505', name: 'Nicaragua', flag: '🇳🇮', digits: 8 },
  { code: '+44', name: 'Reino Unido', flag: '🇬🇧', digits: 10 },
  { code: '+39', name: 'Italia', flag: '🇮🇹', digits: 10 },
  { code: '+49', name: 'Alemania', flag: '🇩🇪', digits: 11 },
];

/**
 * Parse a stored phone string (e.g. "+56912345678") into { country, number }.
 * Defaults to Chile if no match is found.
 */
export function parsePhoneValue(value) {
  if (!value) return { country: COUNTRIES[0], number: '' };
  const str = String(value).trim();
  if (str.startsWith('+')) {
    const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
    for (const c of sorted) {
      if (str.startsWith(c.code)) {
        return { country: c, number: str.slice(c.code.length).replace(/\D/g, '') };
      }
    }
  }
  return { country: COUNTRIES[0], number: str.replace(/\D/g, '') };
}

/**
 * Validate phone number digits for a given country.
 * Returns an error string or null if valid.
 */
export function validatePhoneNumber(country, number) {
  const digits = number.replace(/\D/g, '');
  if (!digits) return 'El teléfono es requerido';
  const min = country.minDigits ?? country.digits;
  const max = country.maxDigits ?? country.digits;
  if (digits.length < min || digits.length > max) {
    const expected = min === max ? `${min}` : `${min}–${max}`;
    return `El número debe tener ${expected} dígitos para ${country.name}`;
  }
  return null;
}

/**
 * PhoneInput — selector de indicativo de país + campo de número.
 *
 * Props:
 *  - value: string (full phone, e.g. "+56912345678")
 *  - onChangeText: (fullPhone: string) => void
 *  - error: string | null
 *  - label: string
 *  - editable: bool (default true)
 */
const PhoneInput = ({
  value = '',
  onChangeText,
  error,
  label = 'Teléfono',
  editable = true,
}) => {
  const parsed = useMemo(() => parsePhoneValue(value), []);
  const [selectedCountry, setSelectedCountry] = useState(parsed.country);
  const [number, setNumber] = useState(parsed.number);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [touched, setTouched] = useState(false);

  const filteredCountries = useMemo(() => {
    if (!search) return COUNTRIES;
    const q = search.toLowerCase();
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.includes(q),
    );
  }, [search]);

  const handleNumberChange = useCallback(
    (text) => {
      const digits = text.replace(/\D/g, '');
      setNumber(digits);
      setTouched(true);
      onChangeText?.(digits ? `${selectedCountry.code}${digits}` : '');
    },
    [selectedCountry, onChangeText],
  );

  const handleCountrySelect = useCallback(
    (country) => {
      setSelectedCountry(country);
      setModalVisible(false);
      setSearch('');
      onChangeText?.(number ? `${country.code}${number}` : '');
    },
    [number, onChangeText],
  );

  const validationError = touched ? validatePhoneNumber(selectedCountry, number) : null;
  const displayError = error || validationError;

  const renderCountryItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={[
          styles.countryItem,
          item.code === selectedCountry.code && item.name === selectedCountry.name && styles.countryItemSelected,
        ]}
        onPress={() => handleCountrySelect(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.countryFlag}>{item.flag}</Text>
        <Text style={styles.countryName}>{item.name}</Text>
        <Text style={styles.countryCode}>{item.code}</Text>
      </TouchableOpacity>
    ),
    [selectedCountry, handleCountrySelect],
  );

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.inputRow, displayError && styles.inputRowError]}>
        {/* Country code selector */}
        <TouchableOpacity
          style={styles.countrySelector}
          onPress={() => editable && setModalVisible(true)}
          activeOpacity={editable ? 0.7 : 1}
          accessibilityLabel={`País: ${selectedCountry.name}`}
        >
          <Text style={styles.flag}>{selectedCountry.flag}</Text>
          <Text style={styles.dialCode}>{selectedCountry.code}</Text>
          {editable && (
            <Ionicons name="chevron-down" size={14} color={COLORS.text.tertiary} style={{ marginLeft: 2 }} />
          )}
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Number input */}
        <TextInput
          style={styles.numberInput}
          value={number}
          onChangeText={handleNumberChange}
          placeholder="912 345 678"
          placeholderTextColor={COLORS.text.disabled ?? COLORS.text.tertiary}
          keyboardType="phone-pad"
          editable={editable}
          maxLength={15}
          onBlur={() => setTouched(true)}
          accessibilityLabel={label}
        />
      </View>

      {displayError ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={COLORS.error?.[500] ?? '#EF4444'} />
          <Text style={styles.errorText}>{displayError}</Text>
        </View>
      ) : null}

      {/* Country picker modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar país</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setSearch(''); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={16} color={COLORS.text.tertiary} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar país o código..."
                placeholderTextColor={COLORS.text.tertiary}
                autoCorrect={false}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.text.tertiary} />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => `${item.code}-${item.name}`}
              renderItem={renderCountryItem}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 0,
  },
  label: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.semibold ?? '600',
    color: COLORS.text.secondary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.default,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin ?? 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    minHeight: 48,
  },
  inputRowError: {
    borderColor: COLORS.error?.[500] ?? '#EF4444',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
  },
  flag: {
    fontSize: 20,
    lineHeight: Platform.OS === 'android' ? 24 : 22,
  },
  dialCode: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize + 1,
    fontWeight: TYPOGRAPHY.fontWeight.medium ?? '500',
    color: COLORS.text.primary,
    minWidth: 36,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border.light,
    marginVertical: 12,
  },
  numberInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: TYPOGRAPHY.styles.body.fontSize,
    color: COLORS.text.primary,
    height: 48,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error?.[500] ?? '#EF4444',
    flex: 1,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.styles.h4?.fontSize ?? 16,
    fontWeight: TYPOGRAPHY.fontWeight.bold ?? '700',
    color: COLORS.text.primary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: SPACING.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.background.default,
    borderRadius: BORDERS.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.styles.body.fontSize,
    color: COLORS.text.primary,
    height: 36,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  countryItemSelected: {
    backgroundColor: COLORS.primary?.[50] ?? '#EFF6FF',
  },
  countryFlag: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },
  countryName: {
    flex: 1,
    fontSize: TYPOGRAPHY.styles.body.fontSize,
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.regular ?? '400',
  },
  countryCode: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.medium ?? '500',
    minWidth: 44,
    textAlign: 'right',
  },
});

export default PhoneInput;
