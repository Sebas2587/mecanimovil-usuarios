import React, { useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Car, Search } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, SHADOWS, GRADIENTS } from '../../design-system/tokens';

const STACK_BREAKPOINT = 560;

const WEB_INPUT_NO_FOCUS_RING = Platform.OS === 'web'
  ? {
      outlineStyle: 'none',
      outlineWidth: 0,
      outlineColor: 'transparent',
      boxShadow: 'none',
    }
  : null;

/**
 * Barra de búsqueda estilo Airbnb: patente + texto libre en pill, botón circular Tinder.
 * El botón circular prioriza búsqueda por texto si hay query; si no, consulta patente.
 */
const GuestSearchBar = ({
  patente,
  onPatenteChange,
  searchText,
  onSearchTextChange,
  onPatenteSubmit,
  onSearchTextSubmit,
  onSearchFocus,
  onSearchBlur,
  patenteLoading = false,
  searchLoading = false,
  patenteDisabled = false,
}) => {
  const { width } = useWindowDimensions();
  const stacked = width < STACK_BREAKPOINT;
  const hasSearchText = Boolean(String(searchText || '').trim());
  const btnLoading = hasSearchText ? searchLoading : patenteLoading;
  const btnDisabled = hasSearchText
    ? false
    : patenteDisabled || patenteLoading;

  const handlePrimarySubmit = useCallback(() => {
    if (hasSearchText) {
      onSearchTextSubmit?.();
      return;
    }
    onPatenteSubmit?.();
  }, [hasSearchText, onPatenteSubmit, onSearchTextSubmit]);

  return (
    <View style={[styles.shell, stacked && styles.shellStacked]}>
      <View style={[styles.segments, stacked && styles.segmentsStacked]}>
        <View style={[styles.segment, stacked && styles.segmentStacked]}>
          <Text style={styles.segmentLabel}>Patente</Text>
          <View style={styles.segmentInputRow}>
            <Car size={16} color={COLORS.icon.active} strokeWidth={2} />
            <TextInput
              style={styles.patenteInput}
              placeholder="ABCD12"
              placeholderTextColor={COLORS.text.tertiary}
              value={patente}
              onChangeText={onPatenteChange}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              returnKeyType="search"
              onSubmitEditing={onPatenteSubmit}
              underlineColorAndroid="transparent"
              selectionColor={COLORS.brand.orange}
              {...WEB_INPUT_NO_FOCUS_RING}
            />
          </View>
        </View>

        {!stacked ? <View style={styles.dividerV} /> : <View style={styles.dividerH} />}

        <View style={[styles.segment, styles.segmentFlex, stacked && styles.segmentStacked]}>
          <Text style={styles.segmentLabel}>Buscar</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Taller o servicio"
            placeholderTextColor={COLORS.text.tertiary}
            value={searchText}
            onChangeText={onSearchTextChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={onSearchTextSubmit}
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
            underlineColorAndroid="transparent"
            selectionColor={COLORS.brand.orange}
            {...WEB_INPUT_NO_FOCUS_RING}
          />
        </View>
      </View>

      <TouchableOpacity
        onPress={handlePrimarySubmit}
        disabled={btnDisabled}
        activeOpacity={0.88}
        style={[styles.searchBtnWrap, btnDisabled && styles.searchBtnDisabled]}
        accessibilityRole="button"
        accessibilityLabel={hasSearchText ? 'Buscar taller o servicio' : 'Buscar por patente'}
      >
        <LinearGradient
          colors={GRADIENTS.guestCta}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.searchBtn}
        >
          {btnLoading ? (
            <ActivityIndicator color={COLORS.base.white} size="small" />
          ) : (
            <Search size={20} color={COLORS.base.white} strokeWidth={2.25} />
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.full,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    paddingVertical: SPACING.sm,
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.sm,
    ...SHADOWS.cardElevated,
    zIndex: 2,
    ...(Platform.OS === 'web'
      ? { outlineStyle: 'none', outlineWidth: 0 }
      : null),
  },
  shellStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    borderRadius: BORDERS.radius.xl,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  segments: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  segmentsStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  segment: {
    minWidth: 0,
  },
  segmentFlex: {
    flex: 1,
  },
  segmentStacked: {
    width: '100%',
  },
  segmentLabel: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
    fontSize: 11,
    marginBottom: 2,
  },
  segmentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patenteInput: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.primary,
    letterSpacing: 2,
    minWidth: 72,
    paddingVertical: 2,
    flex: 1,
    ...WEB_INPUT_NO_FOCUS_RING,
  },
  textInput: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.primary,
    paddingVertical: 2,
    minWidth: 0,
    ...WEB_INPUT_NO_FOCUS_RING,
  },
  dividerV: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: COLORS.border.light,
    marginHorizontal: SPACING.md,
  },
  dividerH: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: SPACING.sm,
  },
  searchBtnWrap: {
    borderRadius: BORDERS.radius.full,
    overflow: 'hidden',
    marginLeft: SPACING.sm,
    ...SHADOWS.button,
  },
  searchBtnDisabled: {
    opacity: 0.5,
  },
  searchBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GuestSearchBar;
