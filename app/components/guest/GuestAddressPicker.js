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
} from 'react-native';
import { MapPin, Navigation, X } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
import { useManualAddressEntry } from '../../hooks/useManualAddressEntry';
import * as locationService from '../../services/location';
import { showAlert } from '../../utils/platformAlert';

/**
 * Selector de dirección para invitados (sin APIs autenticadas de perfil).
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

  const emitAddress = useCallback(
    (addr) => {
      if (!addr?.direccion && !addr?.latitude) return;
      onSelectAddress({
        direccion: addr.direccion || addr.formattedAddress || 'Mi ubicación',
        latitud: addr.latitude ?? addr.latitud,
        longitud: addr.longitude ?? addr.longitud,
        comuna: addr.comuna || null,
        region: addr.region || null,
      });
      onClose?.();
    },
    [onClose, onSelectAddress],
  );

  const handleUseGps = useCallback(async () => {
    setIsLocating(true);
    try {
      const coords = await locationService.getCurrentLocation();
      if (!coords?.latitude || !coords?.longitude) {
        showAlert('Ubicación', 'No pudimos obtener tu ubicación. Intenta ingresar la dirección manualmente.');
        return;
      }
      const reversed = await locationService.reverseGeocode(coords.latitude, coords.longitude);
      emitAddress({
        ...reversed,
        latitude: coords.latitude,
        longitude: coords.longitude,
        direccion: reversed?.direccion || reversed?.formattedAddress || 'Mi ubicación actual',
      });
    } catch (e) {
      showAlert('Ubicación', 'No pudimos usar el GPS. Prueba ingresando tu dirección.');
    } finally {
      setIsLocating(false);
    }
  }, [emitAddress]);

  const handleSelectSuggestion = useCallback(
    (suggestion) => {
      const detected = selectManualSuggestion(suggestion);
      if (detected?.latitude != null && detected?.longitude != null) {
        emitAddress(detected);
      }
    },
    [emitAddress, selectManualSuggestion],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>¿Dónde necesitas el servicio?</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Cerrar">
              <X size={20} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Activa el GPS o busca tu dirección para ver talleres cerca de ti.
          </Text>

          {currentAddress?.direccion ? (
            <View style={styles.currentPill}>
              <MapPin size={14} color={COLORS.primary[500]} />
              <Text style={styles.currentText} numberOfLines={2}>
                {currentAddress.direccion}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.gpsBtn} onPress={handleUseGps} disabled={isLocating}>
            {isLocating ? (
              <ActivityIndicator color={COLORS.primary[600]} />
            ) : (
              <>
                <Navigation size={18} color={COLORS.primary[600]} />
                <Text style={styles.gpsBtnText}>Usar mi ubicación actual</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.orLabel}>o busca tu dirección</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Manuel de Amat 2960, Santiago"
            placeholderTextColor={COLORS.text.tertiary}
            value={manualQuery}
            onChangeText={onManualQueryChange}
            autoCorrect={false}
          />

          <ScrollView style={styles.suggestions} keyboardShouldPersistTaps="handled">
            {manualLoadingSuggestions || manualResolving ? (
              <ActivityIndicator style={styles.loader} color={COLORS.primary[500]} />
            ) : null}
            {(manualSuggestions || []).slice(0, 6).map((item, idx) => (
              <TouchableOpacity
                key={`${item.place_id || item.display_name}-${idx}`}
                style={styles.suggestionRow}
                onPress={() => handleSelectSuggestion(item)}
              >
                <MapPin size={14} color={COLORS.text.tertiary} />
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {item.display_name || item.description || item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: COLORS.background.default,
    borderTopLeftRadius: BORDERS.radius.xl,
    borderTopRightRadius: BORDERS.radius.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: '85%',
    ...SHADOWS.modal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    flex: 1,
  },
  closeBtn: {
    padding: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  currentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  currentText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.primary,
    flex: 1,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[200],
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
  },
  gpsBtnText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.primary[600],
  },
  orLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.paper,
    marginBottom: SPACING.sm,
  },
  suggestions: {
    maxHeight: 220,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
  },
  suggestionText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.primary,
    flex: 1,
  },
  loader: {
    marginVertical: SPACING.md,
  },
});

export default GuestAddressPicker;
