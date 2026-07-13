import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    TextInput,
    ScrollView,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import Icon from '../base/Icon/Icon';
import { useTheme } from '../../design-system/theme/useTheme';
import { COLORS, withOpacity, SHADOWS } from '../../design-system/tokens';
import { useUserAddresses, useSaveAddress, useDeleteAddress } from '../../hooks/useAddress';
import { useManualAddressEntry } from '../../hooks/useManualAddressEntry';
import { showAlert, showConfirm } from '../../utils/platformAlert';
import * as locationService from '../../services/location';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DEFAULT_HERO_SUBTITLE = 'Activa el GPS para encontrar talleres o mecánicos cercanos.';

const AddressSelectionModal = ({
    visible,
    onClose,
    onSelectAddress,
    currentAddress,
    variant = 'default',
    heroSubtitle = DEFAULT_HERO_SUBTITLE,
}) => {
    const theme = useTheme();
    const colors = theme.colors;
    const typography = theme.typography;
    const spacing = theme.spacing;
    const borders = theme.borders;
    const styles = getStyles(colors, typography, spacing, borders);

    const [isLocating, setIsLocating] = useState(false);
    const [detectedAddress, setDetectedAddress] = useState(null);
    const [addressLabel, setAddressLabel] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    /** null | 'manual' — GPS va directo a detectedAddress */
    const [entryMode, setEntryMode] = useState(null);
    const [confirmingManual, setConfirmingManual] = useState(false);

    const {
        query: manualQuery,
        onChangeQuery: onManualQueryChange,
        suggestions: manualSuggestions,
        loadingSuggestions: manualLoadingSuggestions,
        resolving: manualResolving,
        resolvedMeta: manualResolvedMeta,
        selectSuggestion: selectManualSuggestion,
        confirmFromQuery: confirmManualFromQuery,
        reset: resetManualEntry,
    } = useManualAddressEntry();

    // Hooks
    const { data: savedAddresses, isLoading: isLoadingAddresses, refetch } = useUserAddresses();
    const { mutateAsync: saveAddressMutation } = useSaveAddress();
    const { mutateAsync: deleteAddressMutation } = useDeleteAddress();

    // Reset state when modal opens/closes
    useEffect(() => {
        if (visible) {
            setDetectedAddress(null);
            setAddressLabel('');
            setIsLocating(false);
            setEntryMode(null);
            setConfirmingManual(false);
            resetManualEntry();
        }
    }, [visible, resetManualEntry]);

    const handleStartManualEntry = useCallback(() => {
        setEntryMode('manual');
        setDetectedAddress(null);
        setAddressLabel('');
        resetManualEntry();
    }, [resetManualEntry]);

    const handleSelectManualSuggestion = useCallback((suggestion) => {
        const detected = selectManualSuggestion(suggestion);
        if (detected.latitude != null && detected.longitude != null) {
            setDetectedAddress(detected);
            setEntryMode(null);
        }
    }, [selectManualSuggestion]);

    const handleConfirmManualAddress = useCallback(async () => {
        setConfirmingManual(true);
        try {
            const detected = await confirmManualFromQuery();
            if (detected.latitude == null || detected.longitude == null) {
                Alert.alert(
                    'Ubicación incompleta',
                    'Selecciona una sugerencia de la lista o escribe una dirección más específica (calle, número y comuna).',
                );
                return;
            }
            setDetectedAddress(detected);
            setEntryMode(null);
        } catch (e) {
            Alert.alert('Dirección no válida', e?.message || 'No pudimos ubicar esta dirección.');
        } finally {
            setConfirmingManual(false);
        }
    }, [confirmManualFromQuery]);

    const handleRetryCapture = useCallback(() => {
        setDetectedAddress(null);
        setEntryMode(null);
        resetManualEntry();
    }, [resetManualEntry]);

    const detectedHeaderLabel =
        detectedAddress?.source === 'manual'
            ? 'Dirección confirmada (puedes editar antes de guardar)'
            : 'Ubicación detectada (edita si faltan datos)';

    const handleUseCurrentLocation = async () => {
        setIsLocating(true);
        try {
            // 1. Get Coordinates
            const location = await locationService.getCurrentLocation();
            if (!location) {
                // Error already handled in service logging, but good to show alert if null
                Alert.alert("Error", "No pudimos obtener tu ubicación.");
                setIsLocating(false);
                return;
            }

            // 2. Reverse Geocode
            const addressInfo = await locationService.reverseGeocode(
                location.coords.latitude,
                location.coords.longitude
            );

            if (addressInfo) {
                // Format: "Street Number, District, City"
                // Including district (comuna) and city ensures the weather API can resolve the station.
                let parts = [];
                if (addressInfo.street) {
                    parts.push(`${addressInfo.street} ${addressInfo.streetNumber || ''}`.trim());
                }
                if (addressInfo.district) {
                    parts.push(addressInfo.district);
                }
                if (addressInfo.city && addressInfo.city !== addressInfo.district) {
                    parts.push(addressInfo.city);
                }
                let formattedAddress = parts.length > 0
                    ? parts.join(', ')
                    : `${location.coords.latitude}, ${location.coords.longitude}`;

                setDetectedAddress({
                    ...addressInfo,
                    name: formattedAddress,
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    source: 'gps',
                });
                setEntryMode(null);
            } else {
                Alert.alert("Error", "No pudimos identificar la dirección exacta.");
            }

        } catch (error) {
            console.error("Geolocation error:", error);
            Alert.alert("Permiso Denegado", "Necesitamos acceso a tu ubicación. Ve a configuración para activarlo.");
        } finally {
            setIsLocating(false);
        }
    };

    const handleSaveAddress = async () => {
        if (!detectedAddress) return;
        if (!addressLabel.trim()) {
            Alert.alert("Falta información", "Por favor, ponle un nombre a esta ubicación (ej: Casa).");
            return;
        }

        const addressToSave = (detectedAddress.name || `${detectedAddress.street} ${detectedAddress.streetNumber}`).trim();
        if (!addressToSave) {
            Alert.alert("Falta información", "La dirección no puede estar vacía.");
            return;
        }

        const normalizedNewAddress = addressToSave.toLowerCase();
        const isDuplicate = savedAddresses?.some(addr =>
            addr.direccion.trim().toLowerCase() === normalizedNewAddress
        );

        if (isDuplicate) {
            Alert.alert("Dirección Duplicada", "Ya tienes guardada esta dirección.");
            return;
        }

        setIsSaving(true);
        try {
            let latitude = detectedAddress.latitude;
            let longitude = detectedAddress.longitude;

            if (latitude == null || longitude == null) {
                const geo = await locationService.geocodeAddress(addressToSave);
                if (geo?.latitude != null && geo?.longitude != null) {
                    latitude = geo.latitude;
                    longitude = geo.longitude;
                }
            }

            if (latitude == null || longitude == null) {
                Alert.alert(
                    "Ubicación incompleta",
                    "No pudimos obtener coordenadas para esta dirección. Elige una sugerencia al escribir o usa GPS.",
                );
                setIsSaving(false);
                return;
            }

            const comunaCity = [detectedAddress.district, detectedAddress.city]
                .filter(Boolean)
                .filter((v, i, a) => a.indexOf(v) === i)
                .join(', ');
            const newAddress = {
                direccion: addressToSave,
                etiqueta: addressLabel.trim(),
                detalles: comunaCity || detectedAddress.city || '',
                latitude,
                longitude,
                es_principal: false,
            };

            const saved = await saveAddressMutation(newAddress);

            // Select immediately and close
            onSelectAddress(saved);
            onClose();

        } catch (error) {
            Alert.alert("Error", "No se pudo guardar la dirección.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = useCallback((id) => {
        showConfirm('Eliminar dirección', '¿Estás seguro de que quieres eliminar esta dirección?', {
            confirmText: 'Eliminar',
            onConfirm: async () => {
                try {
                    await deleteAddressMutation(id);
                    await refetch();
                } catch (e) {
                    console.error('Error eliminando dirección:', e);
                    showAlert('Error', 'No se pudo eliminar la dirección');
                }
            },
        });
    }, [deleteAddressMutation, refetch]);

    // Icon helper
    const getIconForLabel = (label) => {
        const lower = label.toLowerCase();
        if (lower.includes('casa') || lower.includes('home')) return 'home';
        if (lower.includes('trabajo') || lower.includes('oficina') || lower.includes('work')) return 'briefcase';
        return 'map-pin';
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity style={styles.dismissArea} onPress={onClose} activeOpacity={1} />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <View style={styles.modalContent}>
                        {/* Handle Indicator */}
                        <View style={styles.handleIndicator} />

                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>¿Dónde estás?</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Icon
                                    name="close"
                                    size={22}
                                    color={colors.text.secondary}
                                />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            keyboardShouldPersistTaps="handled"
                        >

                            {/* 1. GPS o enlace a ingreso manual */}
                            {!detectedAddress && entryMode !== 'manual' && (
                                <>
                                    <TouchableOpacity
                                        style={styles.heroButton}
                                        onPress={handleUseCurrentLocation}
                                        disabled={isLocating}
                                    >
                                        <View style={styles.heroIconContainer}>
                                            {isLocating ? (
                                                <ActivityIndicator color={colors.primary.main} />
                                            ) : (
                                                <Icon
                                                    name="navigation"
                                                    size={24}
                                                    color={colors.primary.main}
                                                />
                                            )}
                                        </View>
                                        <View style={styles.heroTextContainer}>
                                            <Text style={styles.heroTitle}>
                                                {isLocating ? 'Buscando satélites...' : 'Usar mi ubicación actual'}
                                            </Text>
                                            <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
                                        </View>
                                        <Icon
                                            name="chevron-forward"
                                            size={20}
                                            color={colors.primary.light}
                                        />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.manualEntryLink}
                                        onPress={handleStartManualEntry}
                                        activeOpacity={0.85}
                                    >
                                        <Icon
                                            name="edit-3"
                                            size={18}
                                            color={colors.primary.main}
                                        />
                                        <Text style={styles.manualEntryLinkText}>Ingresar dirección manualmente</Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            {/* 1b. Ingreso manual con autocompletado */}
                            {!detectedAddress && entryMode === 'manual' && (
                                <View style={styles.manualEntryBox}>
                                    <View style={styles.detectedHeader}>
                                        <Icon
                                            name="map-pin"
                                            size={18}
                                            color={colors.primary.main}
                                        />
                                        <Text style={[styles.detectedLabel, styles.manualEntryTitle]}>
                                            Escribe tu dirección en Chile
                                        </Text>
                                    </View>

                                    <TextInput
                                        style={[styles.input, styles.inputDetected]}
                                        value={manualQuery}
                                        onChangeText={onManualQueryChange}
                                        placeholder="Calle, número, comuna..."
                                        placeholderTextColor={colors.text.tertiary}
                                        autoFocus
                                        autoCorrect={false}
                                    />

                                    {(manualLoadingSuggestions || manualSuggestions.length > 0) && (
                                        <View style={styles.suggestionsList}>
                                            {manualLoadingSuggestions && manualSuggestions.length === 0 ? (
                                                <ActivityIndicator
                                                    style={{ padding: 12 }}
                                                    color={colors.primary.main}
                                                />
                                            ) : (
                                                manualSuggestions.map((s, index) => (
                                                    <TouchableOpacity
                                                        key={`${s.id ?? index}-${s.mainText}`}
                                                        style={styles.suggestionItem}
                                                        onPress={() => handleSelectManualSuggestion(s)}
                                                    >
                                                        <Icon
                                                            name="map-pin"
                                                            size={14}
                                                            color={colors.primary.main}
                                                        />
                                                        <View style={styles.suggestionTextWrap}>
                                                            <Text style={styles.suggestionMain} numberOfLines={2}>
                                                                {s.mainText}
                                                            </Text>
                                                            {s.secondaryText ? (
                                                                <Text style={styles.suggestionSecondary} numberOfLines={1}>
                                                                    {s.secondaryText}
                                                                </Text>
                                                            ) : null}
                                                        </View>
                                                    </TouchableOpacity>
                                                ))
                                            )}
                                        </View>
                                    )}

                                    <View style={styles.metaRow}>
                                        {manualResolving ? (
                                            <ActivityIndicator
                                                size="small"
                                                color={colors.primary.main}
                                            />
                                        ) : manualResolvedMeta?.district || manualResolvedMeta?.city ? (
                                            <Text style={styles.metaText}>
                                                {[
                                                    manualResolvedMeta.district
                                                        ? `Comuna: ${manualResolvedMeta.district}`
                                                        : null,
                                                    manualResolvedMeta.city
                                                        ? `Ciudad: ${manualResolvedMeta.city}`
                                                        : null,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </Text>
                                        ) : (
                                            <Text style={styles.metaHint}>
                                                Escribe al menos 5 caracteres para reconocer comuna y ciudad.
                                            </Text>
                                        )}
                                    </View>

                                    {manualResolvedMeta?.error && !manualResolving ? (
                                        <Text style={styles.metaError}>{manualResolvedMeta.error}</Text>
                                    ) : null}

                                    <TouchableOpacity
                                        style={[
                                            styles.saveButton,
                                            (!manualResolvedMeta?.isValid || confirmingManual) && styles.saveButtonDisabled,
                                        ]}
                                        onPress={handleConfirmManualAddress}
                                        disabled={confirmingManual}
                                    >
                                        {confirmingManual ? (
                                            <ActivityIndicator color={COLORS.text.inverse} />
                                        ) : (
                                            <Text style={styles.saveButtonText}>Continuar con esta dirección</Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.retryButton} onPress={handleRetryCapture}>
                                        <Text style={styles.retryText}>Volver a opciones de ubicación</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* 2. Save Form (Visible after detection) */}
                            {detectedAddress && (
                                <View style={styles.saveForm}>
                                    <View style={styles.detectedHeader}>
                                        <View style={styles.greenIconValues}>
                                            <Icon
                                                name="checkmark-circle"
                                                size={20}
                                                color={colors.success.main}
                                            />
                                        </View>
                                        <Text style={styles.detectedLabel}>{detectedHeaderLabel}</Text>
                                    </View>

                                    <TextInput
                                        style={[styles.input, styles.inputDetected]}
                                        value={detectedAddress.name}
                                        onChangeText={(text) => setDetectedAddress(prev => ({ ...prev, name: text }))}
                                        placeholder="Dirección y Número"
                                        placeholderTextColor={colors.text.tertiary}
                                    />

                                    <Text style={styles.inputLabel}>Nombre para guardar (ej: Casa, Oficina)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ej: Casa, Oficina, Gimnasio"
                                        placeholderTextColor={colors.text.tertiary}
                                        value={addressLabel}
                                        onChangeText={setAddressLabel}
                                    />

                                    <TouchableOpacity
                                        style={styles.saveButton}
                                        onPress={handleSaveAddress}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <ActivityIndicator color={COLORS.text.inverse} />
                                        ) : (
                                            <Text style={styles.saveButtonText}>Confirmar y Guardar</Text>
                                        )}
                                    </TouchableOpacity>

                                    {(detectedAddress.district || detectedAddress.city) ? (
                                        <Text style={styles.metaText}>
                                            {[
                                                detectedAddress.district ? `Comuna: ${detectedAddress.district}` : null,
                                                detectedAddress.city ? `Ciudad: ${detectedAddress.city}` : null,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </Text>
                                    ) : null}

                                    <TouchableOpacity style={styles.retryButton} onPress={handleRetryCapture}>
                                        <Text style={styles.retryText}>No es correcto, intentar de nuevo</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* 3. Saved Addresses List */}
                            <Text style={styles.sectionTitle}>Mis Direcciones Guardadas</Text>

                            {isLoadingAddresses ? (
                                <ActivityIndicator
                                    style={{ marginTop: 20 }}
                                    color={colors.primary.main}
                                />
                            ) : (
                                <View style={styles.listContainer}>
                                    {savedAddresses?.length > 0 ? (
                                        savedAddresses.map((addr) => {
                                            const isSelected = currentAddress?.id === addr.id;
                                            const iconColor = isSelected
                                                ? colors.primary.main
                                                : colors.neutral.gray[500];
                                            return (
                                                <View
                                                    key={addr.id}
                                                    style={[styles.addressItem, isSelected && styles.addressItemSelected]}
                                                >
                                                    <TouchableOpacity
                                                        style={styles.addressItemMain}
                                                        onPress={() => {
                                                            onSelectAddress(addr);
                                                            onClose();
                                                        }}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={[styles.itemIcon, isSelected && styles.itemIconSelected]}>
                                                            <Icon
                                                                name={getIconForLabel(addr.etiqueta)}
                                                                size={20}
                                                                color={iconColor}
                                                            />
                                                        </View>
                                                        <View style={styles.itemContent}>
                                                            <View style={styles.itemLabelRow}>
                                                                <Text
                                                                    style={[styles.itemLabel, isSelected && styles.itemLabelSelected]}
                                                                    numberOfLines={1}
                                                                >
                                                                    {addr.etiqueta || 'Dirección'}
                                                                </Text>
                                                                {addr.es_principal ? (
                                                                    <View style={styles.principalBadge}>
                                                                        <Text style={styles.principalBadgeText}>Principal</Text>
                                                                    </View>
                                                                ) : null}
                                                            </View>
                                                            <Text style={styles.itemAddress} numberOfLines={2}>
                                                                {addr.direccion || 'Sin detalle de calle'}
                                                            </Text>
                                                        </View>
                                                        {isSelected ? (
                                                            <View style={styles.selectedCheck}>
                                                                <Icon
                                                                    name="checkmark"
                                                                    size={18}
                                                                    color={colors.primary.main}
                                                                />
                                                            </View>
                                                        ) : null}
                                                    </TouchableOpacity>
                                                    {!isSelected ? (
                                                        <TouchableOpacity
                                                            style={styles.deleteButton}
                                                            onPress={() => handleDelete(addr.id)}
                                                            accessibilityRole="button"
                                                            accessibilityLabel={`Eliminar dirección ${addr.etiqueta}`}
                                                        >
                                                            <Icon
                                                                name="trash-outline"
                                                                size={18}
                                                                color={colors.neutral.gray[400]}
                                                            />
                                                        </TouchableOpacity>
                                                    ) : null}
                                                </View>
                                            );
                                        })
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <Icon
                                                name="map-outline"
                                                size={64}
                                                color={
colors.neutral.gray[300]
                                                }
                                                style={{ marginBottom: spacing.md }}
                                            />
                                            <Text style={styles.emptyText}>No tienes direcciones guardadas aún.</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const getStyles = (colors, typography, spacing, borders) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: withOpacity(COLORS.base.inkBlack, 0.5),
        justifyContent: 'flex-end',
    },
    dismissArea: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: colors.background.paper,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        maxHeight: SCREEN_HEIGHT * 0.85,
        minHeight: SCREEN_HEIGHT * 0.5,
        shadowColor: COLORS.base.inkBlack,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    keyboardView: {
        width: '100%',
    },
    handleIndicator: {
        width: 40,
        height: 4,
        backgroundColor: colors.neutral.gray[300],
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: typography.fontSize['xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
    },
    closeButton: {
        padding: 4,
    },
    heroButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.neutral.gray[100],
        borderWidth: 1,
        borderColor: colors.border.light,
        borderRadius: borders.radius.lg,
        padding: spacing.md,
        marginBottom: spacing.lg,
    },
    heroIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    heroTextContainer: {
        flex: 1,
    },
    heroTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        marginBottom: 2,
    },
    heroSubtitle: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
    },
    manualEntryLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: spacing.sm,
        marginBottom: spacing.lg,
    },
    manualEntryLinkText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.primary.main,
        textDecorationLine: 'underline',
    },
    manualEntryBox: {
        backgroundColor: colors.neutral.gray[50],
        borderRadius: borders.radius.lg,
        padding: spacing.md,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    manualEntryTitle: {
        marginLeft: 8,
    },
    suggestionsList: {
        borderRadius: borders.radius.md,
        borderWidth: 1,
        borderColor: colors.border.light,
        backgroundColor: colors.background.paper,
        marginBottom: spacing.sm,
        overflow: 'hidden',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral.gray[200],
    },
    suggestionTextWrap: {
        flex: 1,
    },
    suggestionMain: {
        fontSize: typography.fontSize.sm,
        color: colors.text.primary,
        fontWeight: typography.fontWeight.medium,
    },
    suggestionSecondary: {
        fontSize: typography.fontSize.xs,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    metaRow: {
        minHeight: 22,
        marginBottom: spacing.xs,
    },
    metaText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        fontWeight: typography.fontWeight.medium,
    },
    metaHint: {
        fontSize: typography.fontSize.xs,
        color: colors.text.tertiary,
    },
    metaError: {
        fontSize: typography.fontSize.xs,
        color: colors.error.main,
        marginBottom: spacing.sm,
    },
    saveButtonDisabled: {
        opacity: 0.55,
    },

    // Save Form
    saveForm: {
        backgroundColor: colors.success.light,
        borderRadius: borders.radius.lg,
        padding: spacing.md,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    detectedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    greenIconValues: {
        marginRight: 8,
    },
    detectedText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.primary,
        fontWeight: typography.fontWeight.medium,
        flex: 1,
    },
    detectedLabel: {
        fontSize: typography.fontSize.sm,
        color: colors.text.primary,
        fontWeight: typography.fontWeight.medium,
        flex: 1,
        marginBottom: 0,
    },
    inputLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        marginBottom: 6,
        fontWeight: typography.fontWeight.medium,
    },
    input: {
        backgroundColor: colors.background.paper,
        borderWidth: 1,
        borderColor: colors.border.light,
        borderRadius: borders.radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    inputDetected: {
        marginBottom: 12,
        backgroundColor: colors.background.paper,
    },
    saveButton: {
        backgroundColor: colors.success.main, // Using theme token
        borderRadius: borders.radius.md,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    saveButtonText: {
        color: COLORS.text.inverse,
        fontWeight: typography.fontWeight.semibold,
        fontSize: typography.fontSize.base,
    },
    retryButton: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    retryText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.tertiary,
        textDecorationLine: 'underline',
    },

    // List
    sectionTitle: {
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    listContainer: {
        gap: spacing.sm,
    },
    addressItem: {
        flexDirection: 'row',
        alignItems: 'stretch',
        borderRadius: borders.radius.lg,
        backgroundColor: colors.background.paper,
        borderWidth: 1,
        borderColor: colors.border.light,
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    addressItemMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
        minWidth: 0,
    },
    addressItemSelected: {
        backgroundColor: colors.primary[50],
        borderColor: colors.primary[200],
    },
    itemIcon: {
        width: 40,
        height: 40,
        borderRadius: borders.radius.md,
        backgroundColor: colors.neutral.gray[100],
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    itemIconSelected: {
        backgroundColor: colors.primary[100],
    },
    itemContent: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
        gap: 4,
    },
    itemLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minWidth: 0,
    },
    itemLabel: {
        flexShrink: 1,
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
    },
    itemLabelSelected: {
        color: colors.text.primary,
    },
    principalBadge: {
        flexShrink: 0,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: borders.radius.full,
        backgroundColor: colors.neutral.gray[100],
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    principalBadgeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.secondary,
    },
    itemAddress: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: 18,
    },
    selectedCheck: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary[100],
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    deleteButton: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        borderLeftWidth: 1,
        borderLeftColor: colors.border.light,
        ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
    },
    emptyImage: {
        width: 100,
        height: 100,
        marginBottom: spacing.md,
        opacity: 0.5,
    },
    emptyText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.tertiary,
    },
});

export default AddressSelectionModal;
