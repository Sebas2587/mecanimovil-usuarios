import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Navigation, X, Search } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, SHADOWS, GRADIENTS } from '../../design-system/tokens';
import { useManualAddressEntry } from '../../hooks/useManualAddressEntry';
import * as locationService from '../../services/location';
import { showAlert } from '../../utils/platformAlert';

/**
 * Selector de dirección para invitados — patrón Airbnb sheet + acentos Tinder.
 */
const GuestAddressPicker = ({ visible, onClose, onSelectAddress, currentAddress }) => {
  const [isLocating, setIsLocating] = useState(false);

  const {
    query: manualQuery,
    onChangeQuery: onManualQueryChange,
    suggestions: manualSuggestions,
    loadingSuggestions: manualLoadingSuggestions,
    resolving: manualResolving,
    selectSuggestion: selectManualSuggestion,
    reset: resetManualEntry,
  } = useManualAddressEntry();

  useEffect(() => {
    if (visible) {
      resetManualEntry();
      setIsLocating(false);
    }
  }, [visible, resetManualEntry]);

  /** Arma "Calle Número, Comuna" a partir de las piezas que devuelve el servicio de ubicación. */
  const buildAddressLabel = (info) => {
    const parts = [];
    if (info?.street) {
      parts.push(`${info.street} ${info.streetNumber || ''}`.trim());
    }
    if (info?.district) parts.push(info.district);
    if (info?.city && info.city !== info.district) parts.push(info.city);
    return parts.join(', ') || info?.name || null;
  };

  const emitAddress = useCallback(
    (addr) => {
      const direccion = addr?.direccion || buildAddressLabel(addr) || addr?.name;
      if (!direccion || addr?.latitude == null || addr?.longitude == null) return;
      onSelectAddress({
        direccion,
        latitud: addr.latitude,
        longitud: addr.longitude,
        comuna: addr.district || addr.comuna || null,
        region: addr.region || null,
      });
      onClose?.();
    },
    [onClose, onSelectAddress],
  );

  const handleUseGps = useCallback(async () => {
    setIsLocating(true);
    try {
      const location = await locationService.getCurrentLocation();
      const latitude = location?.coords?.latitude;
      const longitude = location?.coords?.longitude;
      if (latitude == null || longitude == null) {
        showAlert('Ubicación', 'No pudimos obtener tu ubicación. Intenta ingresar la dirección manualmente.');
        return;
      }
      const addressInfo = await locationService.reverseGeocode(latitude, longitude);
      emitAddress({
        ...addressInfo,
        latitude,
        longitude,
      });
    } catch {
      showAlert('Ubicación', 'No pudimos usar el GPS. Prueba ingresando tu dirección.');
    } finally {
      setIsLocating(false);
    }
  }, [emitAddress]);

  const handleSelectSuggestion = useCallback(
    (suggestion) => {
      const detected = selectManualSuggestion(suggestion);
      if (detected?.latitude != null && detected?.longitude != null) {
        emitAddress({ ...detected, direccion: detected.name });
      }
    },
    [emitAddress, selectManualSuggestion],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            <View style={styles.header}>
              <View style={styles.headerTextCol}>
                <Text style={styles.title}>¿Dónde necesitas el servicio?</Text>
                <Text style={styles.subtitle}>
                  Talleres y mecánicos cerca de tu ubicación
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Cerrar">
                <X size={20} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            {currentAddress?.direccion ? (
              <View style={styles.currentPill}>
                <MapPin size={15} color={COLORS.icon.active} strokeWidth={2.25} />
                <Text style={styles.currentText} numberOfLines={2}>
                  {currentAddress.direccion}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.gpsTouch}
              onPress={handleUseGps}
              disabled={isLocating}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={GRADIENTS.guestCta}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.gpsGradient}
              >
                {isLocating ? (
                  <ActivityIndicator color={COLORS.base.white} />
                ) : (
                  <>
                    <Navigation size={18} color={COLORS.base.white} strokeWidth={2.25} />
                    <Text style={styles.gpsBtnText}>Usar mi ubicación actual</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.searchFieldWrap}>
              <Search size={16} color={COLORS.text.tertiary} />
              <TextInput
                style={styles.input}
                placeholder="Buscar dirección en Chile"
                placeholderTextColor={COLORS.text.tertiary}
                value={manualQuery}
                onChangeText={onManualQueryChange}
                autoCorrect={false}
              />
            </View>

            <ScrollView
              style={styles.suggestions}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {manualLoadingSuggestions || manualResolving ? (
                <ActivityIndicator style={styles.loader} color={COLORS.primary[500]} />
              ) : null}
              {(manualSuggestions || []).slice(0, 8).map((item, idx) => (
                <TouchableOpacity
                  key={`suggestion-${item.id ?? idx}`}
                  style={styles.suggestionRow}
                  onPress={() => handleSelectSuggestion(item)}
                  activeOpacity={0.85}
                >
                  <View style={styles.suggestionIconWrap}>
                    <MapPin size={14} color={COLORS.icon.active} />
                  </View>
                  <View style={styles.suggestionTextCol}>
                    <Text style={styles.suggestionMain} numberOfLines={1}>
                      {item.mainText || item.fullAddress || 'Dirección'}
                    </Text>
                    {item.secondaryText ? (
                      <Text style={styles.suggestionSecondary} numberOfLines={1}>
                        {item.secondaryText}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
              {!manualLoadingSuggestions &&
              !manualResolving &&
              manualQuery.length > 2 &&
              (manualSuggestions || []).length === 0 ? (
                <Text style={styles.noResults}>No encontramos direcciones. Prueba con otra búsqueda.</Text>
              ) : null}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: COLORS.background.overlay,
  },
  keyboardWrap: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background.default,
    borderTopLeftRadius: BORDERS.radius.xl,
    borderTopRightRadius: BORDERS.radius.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: '88%',
    ...SHADOWS.modal,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.neutral.gray[300],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    letterSpacing: -0.2,
  },
  subtitle: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.neutral.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.brand.orange,
  },
  currentText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
    flex: 1,
  },
  gpsTouch: {
    borderRadius: BORDERS.radius.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.button,
  },
  gpsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    minHeight: 52,
  },
  gpsBtnText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.base.white,
  },
  searchFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    borderRadius: BORDERS.radius.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'web' ? SPACING.sm : SPACING.xs,
    backgroundColor: COLORS.background.paper,
    marginBottom: SPACING.sm,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.primary,
    paddingVertical: SPACING.sm,
    minWidth: 0,
  },
  suggestions: {
    maxHeight: 260,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
  },
  suggestionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  suggestionTextCol: {
    flex: 1,
    minWidth: 0,
  },
  suggestionMain: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  suggestionSecondary: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
    fontSize: 12,
  },
  noResults: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  loader: {
    marginVertical: SPACING.md,
  },
});

export default GuestAddressPicker;
