import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Car, Search } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, SHADOWS, GRADIENTS } from '../../design-system/tokens';

const WEB_INPUT_NO_FOCUS_RING = Platform.OS === 'web'
  ? {
      outlineStyle: 'none',
      outlineWidth: 0,
      outlineColor: 'transparent',
      boxShadow: 'none',
    }
  : null;

/**
 * Densidad del pill Airbnb según ancho real del contenedor.
 * Siempre una fila: nunca apila el CTA (evita hueco vertical / deformación).
 */
function resolveDensity(shellWidth) {
  if (!shellWidth || shellWidth >= 480) {
    return {
      key: 'roomy',
      padV: 10,
      padL: SPACING.lg,
      padR: 8,
      patenteW: 124,
      btn: 52,
      icon: 20,
      showCar: true,
      letterSpacing: 1.6,
      dividerMx: SPACING.md,
      searchPlaceholder: 'Taller o servicio',
    };
  }
  if (shellWidth >= 380) {
    return {
      key: 'comfortable',
      padV: 10,
      padL: SPACING.md,
      padR: 6,
      patenteW: 110,
      btn: 48,
      icon: 20,
      showCar: true,
      letterSpacing: 1.2,
      dividerMx: SPACING.sm,
      searchPlaceholder: 'Taller o servicio',
    };
  }
  return {
    key: 'phone',
    padV: 9,
    padL: SPACING.sm + 2,
    padR: 5,
    patenteW: 96,
    btn: 46,
    icon: 19,
    showCar: false,
    letterSpacing: 0.9,
    dividerMx: 8,
    searchPlaceholder: 'Taller o servicio',
  };
}

/**
 * Barra Airbnb: Patente | Buscar | botón circular — una sola fila con presencia visual.
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
  const [shellWidth, setShellWidth] = useState(0);
  const density = useMemo(() => resolveDensity(shellWidth), [shellWidth]);
  const hasSearchText = Boolean(String(searchText || '').trim());
  const btnLoading = hasSearchText ? searchLoading : patenteLoading;
  const btnDisabled = hasSearchText
    ? false
    : patenteDisabled || patenteLoading;

  const onShellLayout = useCallback((e) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0) setShellWidth((prev) => (prev === w ? prev : w));
  }, []);

  const handlePrimarySubmit = useCallback(() => {
    if (hasSearchText) {
      onSearchTextSubmit?.();
      return;
    }
    onPatenteSubmit?.();
  }, [hasSearchText, onPatenteSubmit, onSearchTextSubmit]);

  return (
    <View
      onLayout={onShellLayout}
      style={[
        styles.shell,
        {
          paddingVertical: density.padV,
          paddingLeft: density.padL,
          paddingRight: density.padR,
        },
      ]}
    >
      <View style={styles.segments}>
        <View style={[styles.segment, { width: density.patenteW }]}>
          <Text style={styles.segmentLabel}>Patente</Text>
          <View style={styles.segmentInputRow}>
            {density.showCar ? (
              <Car size={16} color={COLORS.icon.active} strokeWidth={2} />
            ) : null}
            <TextInput
              style={[styles.patenteInput, { letterSpacing: density.letterSpacing }]}
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

        <View style={[styles.dividerV, { marginHorizontal: density.dividerMx }]} />

        <View style={[styles.segment, styles.segmentFlex]}>
          <Text style={styles.segmentLabel}>Buscar</Text>
          <TextInput
            style={styles.textInput}
            placeholder={density.searchPlaceholder}
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
          style={[styles.searchBtn, { width: density.btn, height: density.btn }]}
        >
          {btnLoading ? (
            <ActivityIndicator color={COLORS.base.white} size="small" />
          ) : (
            <Search size={density.icon} color={COLORS.base.white} strokeWidth={2.25} />
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
    width: '100%',
    maxWidth: '100%',
    minHeight: 64,
    ...SHADOWS.cardElevated,
    zIndex: 2,
    ...(Platform.OS === 'web'
      ? { outlineStyle: 'none', outlineWidth: 0 }
      : null),
  },
  segments: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  segment: {
    minWidth: 0,
    justifyContent: 'center',
    flexShrink: 0,
  },
  segmentFlex: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  segmentLabel: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: 12,
    lineHeight: 15,
    color: COLORS.text.primary,
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  segmentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },
  patenteInput: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 20,
    color: COLORS.text.primary,
    paddingVertical: 0,
    flex: 1,
    minWidth: 0,
    ...WEB_INPUT_NO_FOCUS_RING,
  },
  textInput: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 20,
    color: COLORS.text.primary,
    paddingVertical: 0,
    minWidth: 0,
    width: '100%',
    ...WEB_INPUT_NO_FOCUS_RING,
  },
  dividerV: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: COLORS.border.light,
  },
  searchBtnWrap: {
    borderRadius: BORDERS.radius.full,
    overflow: 'hidden',
    marginLeft: 8,
    flexShrink: 0,
    ...SHADOWS.button,
  },
  searchBtnDisabled: {
    opacity: 0.5,
  },
  searchBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GuestSearchBar;
