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
import { Ionicons, Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../design-system/theme/useTheme';
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
    const isDarkGlass = variant === 'darkGlass';
    const styles = isDarkGlass
        ? getDarkGlassStyles(typography, spacing, borders)
        : getStyles(colors, typography, spacing, borders);

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
                        {isDarkGlass && (
                            <>
                                <LinearGradient
                                    colors={['#0a1628', '#030712']}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />
                                {Platform.OS === 'ios' && (
                                    <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
                                )}
                                <View
                                    style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.03)' }]}
                                    pointerEvents="none"
                                />
                            </>
                        )}
                        {/* Handle Indicator */}
                        <View style={styles.handleIndicator} />

                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>¿Dónde estás?</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons
                                    name="close"
                                    size={22}
                                    color={isDarkGlass ? 'rgba(255,255,255,0.7)' : colors.text.secondary}
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
                                                <ActivityIndicator color={isDarkGlass ? '#00A8E8' : colors.primary.main} />
                                            ) : (
                                                <Feather
                                                    name="navigation"
                                                    size={24}
                                                    color={isDarkGlass ? '#00A8E8' : colors.primary.main}
                                                />
                                            )}
                                        </View>
                                        <View style={styles.heroTextContainer}>
                                            <Text style={styles.heroTitle}>
                                                {isLocating ? 'Buscando satélites...' : 'Usar mi ubicación actual'}
                                            </Text>
                                            <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
                                        </View>
                                        <Ionicons
                                            name="chevron-forward"
                                            size={20}
                                            color={isDarkGlass ? 'rgba(255,255,255,0.35)' : colors.primary.light}
                                        />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.manualEntryLink}
                                        onPress={handleStartManualEntry}
                                        activeOpacity={0.85}
                                    >
                                        <Feather
                                            name="edit-3"
                                            size={18}
                                            color={isDarkGlass ? '#00A8E8' : colors.primary.main}
                                        />
                                        <Text style={styles.manualEntryLinkText}>Ingresar dirección manualmente</Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            {/* 1b. Ingreso manual con autocompletado */}
                            {!detectedAddress && entryMode === 'manual' && (
                                <View style={styles.manualEntryBox}>
                                    <View style={styles.detectedHeader}>
                                        <Feather
                                            name="map-pin"
                                            size={18}
                                            color={isDarkGlass ? '#67E8F9' : colors.primary.main}
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
                                        placeholderTextColor={isDarkGlass ? 'rgba(255,255,255,0.35)' : colors.text.tertiary}
                                        autoFocus
                                        autoCorrect={false}
                                    />

                                    {(manualLoadingSuggestions || manualSuggestions.length > 0) && (
                                        <View style={styles.suggestionsList}>
                                            {manualLoadingSuggestions && manualSuggestions.length === 0 ? (
                                                <ActivityIndicator
                                                    style={{ padding: 12 }}
                                                    color={isDarkGlass ? '#00A8E8' : colors.primary.main}
                                                />
                                            ) : (
                                                manualSuggestions.map((s, index) => (
                                                    <TouchableOpacity
                                                        key={`${s.id ?? index}-${s.mainText}`}
                                                        style={styles.suggestionItem}
                                                        onPress={() => handleSelectManualSuggestion(s)}
                                                    >
                                                        <Feather
                                                            name="map-pin"
                                                            size={14}
                                                            color={isDarkGlass ? '#67E8F9' : colors.primary.main}
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
                                                color={isDarkGlass ? '#00A8E8' : colors.primary.main}
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

                                    {isDarkGlass ? (
                                        <TouchableOpacity
                                            style={styles.saveButtonWrap}
                                            onPress={handleConfirmManualAddress}
                                            disabled={confirmingManual}
                                            activeOpacity={0.85}
                                        >
                                            <LinearGradient
                                                colors={['#007EA7', '#00A8E8']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.saveButtonGradient}
                                            >
                                                {confirmingManual ? (
                                                    <ActivityIndicator color="#FFF" />
                                                ) : (
                                                    <Text style={styles.saveButtonText}>Continuar con esta dirección</Text>
                                                )}
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            style={[
                                                styles.saveButton,
                                                (!manualResolvedMeta?.isValid || confirmingManual) && styles.saveButtonDisabled,
                                            ]}
                                            onPress={handleConfirmManualAddress}
                                            disabled={confirmingManual}
                                        >
                                            {confirmingManual ? (
                                                <ActivityIndicator color="#FFF" />
                                            ) : (
                                                <Text style={styles.saveButtonText}>Continuar con esta dirección</Text>
                                            )}
                                        </TouchableOpacity>
                                    )}

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
                                            <Ionicons
                                                name="checkmark-circle"
                                                size={20}
                                                color={isDarkGlass ? '#6EE7B7' : colors.success.main}
                                            />
                                        </View>
                                        <Text style={styles.detectedLabel}>{detectedHeaderLabel}</Text>
                                    </View>

                                    <TextInput
                                        style={[styles.input, styles.inputDetected]}
                                        value={detectedAddress.name}
                                        onChangeText={(text) => setDetectedAddress(prev => ({ ...prev, name: text }))}
                                        placeholder="Dirección y Número"
                                        placeholderTextColor={isDarkGlass ? 'rgba(255,255,255,0.35)' : undefined}
                                    />

                                    <Text style={styles.inputLabel}>Nombre para guardar (ej: Casa, Oficina)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ej: Casa, Oficina, Gimnasio"
                                        placeholderTextColor={isDarkGlass ? 'rgba(255,255,255,0.35)' : undefined}
                                        value={addressLabel}
                                        onChangeText={setAddressLabel}
                                    />

                                    {isDarkGlass ? (
                                        <TouchableOpacity
                                            style={styles.saveButtonWrap}
                                            onPress={handleSaveAddress}
                                            disabled={isSaving}
                                            activeOpacity={0.85}
                                        >
                                            <LinearGradient
                                                colors={['#007EA7', '#00A8E8']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.saveButtonGradient}
                                            >
                                                {isSaving ? (
                                                    <ActivityIndicator color="#FFF" />
                                                ) : (
                                                    <Text style={styles.saveButtonText}>Confirmar y Guardar</Text>
                                                )}
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            style={styles.saveButton}
                                            onPress={handleSaveAddress}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <ActivityIndicator color="#FFF" />
                                            ) : (
                                                <Text style={styles.saveButtonText}>Confirmar y Guardar</Text>
                                            )}
                                        </TouchableOpacity>
                                    )}

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
                                    color={isDarkGlass ? '#00A8E8' : colors.primary.main}
                                />
                            ) : (
                                <View style={styles.listContainer}>
                                    {savedAddresses?.length > 0 ? (
                                        savedAddresses.map((addr) => {
                                            const isSelected = currentAddress?.id === addr.id;
                                            const iconColor = isSelected
                                                ? (isDarkGlass ? '#00A8E8' : colors.primary.main)
                                                : (isDarkGlass ? 'rgba(255,255,255,0.45)' : colors.neutral.gray[500]);
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
                                                            <Feather
                                                                name={getIconForLabel(addr.etiqueta)}
                                                                size={18}
                                                                color={iconColor}
                                                            />
                                                        </View>
                                                        <View style={styles.itemContent}>
                                                            <Text style={[styles.itemLabel, isSelected && styles.itemLabelSelected]}>
                                                                {addr.etiqueta}
                                                            </Text>
                                                            <Text style={styles.itemAddress} numberOfLines={1}>
                                                                {addr.direccion}
                                                            </Text>
                                                        </View>
                                                        {isSelected ? (
                                                            <Ionicons
                                                                name="checkmark"
                                                                size={20}
                                                                color={isDarkGlass ? '#00A8E8' : colors.primary.main}
                                                            />
                                                        ) : null}
                                                    </TouchableOpacity>
                                                    {!isSelected ? (
                                                        <TouchableOpacity
                                                            style={styles.deleteButton}
                                                            onPress={() => handleDelete(addr.id)}
                                                            accessibilityRole="button"
                                                            accessibilityLabel={`Eliminar dirección ${addr.etiqueta}`}
                                                        >
                                                            <Ionicons
                                                                name="trash-outline"
                                                                size={18}
                                                                color={
                                                                    isDarkGlass
                                                                        ? 'rgba(255,255,255,0.35)'
                                                                        : colors.neutral.gray[400]
                                                                }
                                                            />
                                                        </TouchableOpacity>
                                                    ) : null}
                                                </View>
                                            );
                                        })
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <Ionicons
                                                name="map-outline"
                                                size={64}
                                                color={
                                                    isDarkGlass ? 'rgba(255,255,255,0.2)' : colors.neutral.gray[300]
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
        backgroundColor: 'rgba(0,0,0,0.5)',
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
        shadowColor: "#000",
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
        backgroundColor: '#FFFFFF',
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
        backgroundColor: '#FFFFFF',
    },
    saveButton: {
        backgroundColor: colors.success.main, // Using theme token
        borderRadius: borders.radius.md,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    saveButtonText: {
        color: '#FFFFFF',
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
        alignItems: 'center',
        borderRadius: borders.radius.lg,
        backgroundColor: colors.background.default,
        borderWidth: 1,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    addressItemMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
    },
    addressItemSelected: {
        backgroundColor: colors.primary[50],
        borderColor: colors.primary[100],
    },
    itemIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.neutral.gray[100],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    itemIconSelected: {
        backgroundColor: colors.primary[100],
    },
    itemContent: {
        flex: 1,
        marginRight: spacing.sm,
    },
    itemLabel: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        marginBottom: 2,
    },
    itemLabelSelected: {
        color: colors.text.primary,
    },
    itemAddress: {
        fontSize: typography.fontSize.sm,
        color: colors.text.tertiary,
    },
    deleteButton: {
        padding: 8,
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

const getDarkGlassStyles = (typography, spacing, borders) =>
    StyleSheet.create({
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'flex-end',
        },
        dismissArea: {
            flex: 1,
        },
        modalContent: {
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            maxHeight: SCREEN_HEIGHT * 0.85,
            minHeight: SCREEN_HEIGHT * 0.5,
            overflow: 'hidden',
            borderTopWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            backgroundColor: 'transparent',
            elevation: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.3,
            shadowRadius: 14,
        },
        keyboardView: {
            width: '100%',
        },
        handleIndicator: {
            width: 40,
            height: 4,
            backgroundColor: 'rgba(255,255,255,0.22)',
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
            fontSize: typography.fontSize?.['xl'] || 20,
            fontWeight: typography.fontWeight.bold,
            color: '#FFFFFF',
        },
        closeButton: {
            padding: 8,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.08)',
        },
        heroButton: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor:
                Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
            borderWidth: 1,
            borderColor: 'rgba(96,165,250,0.35)',
            borderRadius: borders.radius.lg,
            padding: spacing.md,
            marginBottom: spacing.lg,
        },
        heroIconContainer: {
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: 'rgba(0,126,167,0.22)',
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
            color: '#FFFFFF',
            marginBottom: 4,
        },
        heroSubtitle: {
            fontSize: typography.fontSize.xs,
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 18,
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
            color: '#67E8F9',
            textDecorationLine: 'underline',
        },
        manualEntryBox: {
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: borders.radius.lg,
            padding: spacing.md,
            marginBottom: spacing.lg,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
        },
        manualEntryTitle: {
            marginLeft: 8,
            color: '#FFFFFF',
        },
        suggestionsList: {
            borderRadius: borders.radius.md,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
            backgroundColor: 'rgba(0,0,0,0.2)',
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
            borderBottomColor: 'rgba(255,255,255,0.08)',
        },
        suggestionTextWrap: {
            flex: 1,
        },
        suggestionMain: {
            fontSize: typography.fontSize.sm,
            color: '#FFFFFF',
            fontWeight: typography.fontWeight.medium,
        },
        suggestionSecondary: {
            fontSize: typography.fontSize.xs,
            color: 'rgba(255,255,255,0.45)',
            marginTop: 2,
        },
        metaRow: {
            minHeight: 22,
            marginBottom: spacing.xs,
        },
        metaText: {
            fontSize: typography.fontSize.xs,
            color: 'rgba(255,255,255,0.55)',
            fontWeight: typography.fontWeight.medium,
        },
        metaHint: {
            fontSize: typography.fontSize.xs,
            color: 'rgba(255,255,255,0.4)',
        },
        metaError: {
            fontSize: typography.fontSize.xs,
            color: '#FCA5A5',
            marginBottom: spacing.sm,
        },
        saveButtonDisabled: {
            opacity: 0.55,
        },
        saveForm: {
            backgroundColor: 'rgba(16,185,129,0.08)',
            borderRadius: borders.radius.lg,
            padding: spacing.md,
            marginBottom: spacing.lg,
            borderWidth: 1,
            borderColor: 'rgba(16,185,129,0.28)',
        },
        detectedHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: spacing.md,
        },
        greenIconValues: {
            marginRight: 8,
        },
        detectedLabel: {
            fontSize: typography.fontSize.sm,
            color: '#6EE7B7',
            fontWeight: typography.fontWeight.medium,
            flex: 1,
            marginBottom: 0,
        },
        inputLabel: {
            fontSize: typography.fontSize.xs,
            color: 'rgba(255,255,255,0.55)',
            marginBottom: 6,
            fontWeight: typography.fontWeight.medium,
        },
        input: {
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
            borderRadius: borders.radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            fontSize: typography.fontSize.base,
            color: '#FFFFFF',
            marginBottom: spacing.md,
        },
        inputDetected: {
            marginBottom: 12,
            backgroundColor: 'rgba(255,255,255,0.08)',
        },
        saveButton: {},
        saveButtonWrap: {
            borderRadius: 14,
            overflow: 'hidden',
            marginBottom: spacing.sm,
        },
        saveButtonGradient: {
            paddingVertical: 14,
            alignItems: 'center',
            justifyContent: 'center',
        },
        saveButtonText: {
            color: '#FFFFFF',
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.base,
        },
        retryButton: {
            alignItems: 'center',
            paddingVertical: 4,
        },
        retryText: {
            fontSize: typography.fontSize.xs,
            color: 'rgba(255,255,255,0.45)',
            textDecorationLine: 'underline',
        },
        sectionTitle: {
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.bold,
            color: '#FFFFFF',
            marginBottom: spacing.md,
            marginTop: 4,
        },
        listContainer: {
            gap: spacing.sm,
        },
        addressItem: {
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: borders.radius.lg,
            backgroundColor:
                Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            overflow: 'hidden',
        },
        addressItemMain: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.md,
        },
        addressItemSelected: {
            backgroundColor: 'rgba(0,168,232,0.12)',
            borderColor: 'rgba(0,168,232,0.35)',
        },
        itemIcon: {
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.08)',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: spacing.md,
        },
        itemIconSelected: {
            backgroundColor: 'rgba(0,126,167,0.28)',
        },
        itemContent: {
            flex: 1,
            marginRight: spacing.sm,
        },
        itemLabel: {
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
            color: '#FFFFFF',
            marginBottom: 2,
        },
        itemLabelSelected: {
            color: '#67E8F9',
        },
        itemAddress: {
            fontSize: typography.fontSize.sm,
            color: 'rgba(255,255,255,0.45)',
        },
        deleteButton: {
            padding: 8,
            ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
        },
        emptyState: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: spacing.xl,
        },
        emptyText: {
            fontSize: typography.fontSize.sm,
            color: 'rgba(255,255,255,0.4)',
            textAlign: 'center',
        },
    });

export default AddressSelectionModal;
