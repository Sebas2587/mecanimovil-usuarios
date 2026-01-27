import React, { useState, useEffect } from 'react';
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
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../design-system/theme/useTheme';
import { useUserAddresses, useSaveAddress, useDeleteAddress } from '../../hooks/useAddress';
import * as locationService from '../../services/location';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const AddressSelectionModal = ({ visible, onClose, onSelectAddress, currentAddress }) => {
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
        }
    }, [visible]);

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
                // Format: "Street Number, District" like in AddAddressScreen
                let formattedAddress = '';
                if (addressInfo.street) {
                    formattedAddress = `${addressInfo.street} ${addressInfo.streetNumber || ''}, ${addressInfo.district || ''}`;
                } else {
                    formattedAddress = `${addressInfo.latitude}, ${addressInfo.longitude}`;
                }

                // Cleanup commas if empty parts
                formattedAddress = formattedAddress.replace(' ,', ',');

                setDetectedAddress({
                    ...addressInfo,
                    name: formattedAddress, // Use this for the input value
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });
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

        // Validate duplicates
        const addressToSave = detectedAddress.name || `${detectedAddress.street} ${detectedAddress.streetNumber}`;
        const normalizedNewAddress = addressToSave.trim().toLowerCase();

        const isDuplicate = savedAddresses?.some(addr =>
            addr.direccion.trim().toLowerCase() === normalizedNewAddress
        );

        if (isDuplicate) {
            Alert.alert("Dirección Duplicada", "Ya tienes guardada esta dirección.");
            return;
        }

        setIsSaving(true);
        try {
            const newAddress = {
                direccion: addressToSave,
                etiqueta: addressLabel,
                detalles: detectedAddress.city || '',
                latitude: detectedAddress.latitude,
                longitude: detectedAddress.longitude,
                es_principal: false // User can select it processing onSelectAddress
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

    const handleDelete = (id) => {
        Alert.alert(
            "Eliminar Dirección",
            "¿Estás seguro?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteAddressMutation(id);
                        } catch (e) {
                            // Silent fail or toast
                        }
                    }
                }
            ]
        );
    }

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
                                <Ionicons name="close" size={24} color={colors.text.secondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

                            {/* 1. Hero Action: Geolocate */}
                            {!detectedAddress && (
                                <TouchableOpacity
                                    style={styles.heroButton}
                                    onPress={handleUseCurrentLocation}
                                    disabled={isLocating}
                                >
                                    <View style={styles.heroIconContainer}>
                                        {isLocating ? (
                                            <ActivityIndicator color={colors.primary.main} />
                                        ) : (
                                            <Feather name="navigation" size={24} color={colors.primary.main} />
                                        )}
                                    </View>
                                    <View style={styles.heroTextContainer}>
                                        <Text style={styles.heroTitle}>
                                            {isLocating ? "Buscando satélites..." : "Usar mi ubicación actual"}
                                        </Text>
                                        <Text style={styles.heroSubtitle}>
                                            Activa el GPS para encontrar talleres cercanos
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.primary.light} />
                                </TouchableOpacity>
                            )}

                            {/* 2. Save Form (Visible after detection) */}
                            {detectedAddress && (
                                <View style={styles.saveForm}>
                                    <View style={styles.detectedHeader}>
                                        <View style={styles.greenIconValues}>
                                            <Ionicons name="checkmark-circle" size={20} color={colors.success.main} />
                                        </View>
                                        <Text style={[styles.inputLabel, { marginBottom: 0, flex: 1, color: colors.success.dark || '#166534' }]}>
                                            Ubicación detectada (Edita si faltan datos)
                                        </Text>
                                    </View>

                                    <TextInput
                                        style={[styles.input, { marginBottom: 12, backgroundColor: '#FFFFFF' }]}
                                        value={detectedAddress.name}
                                        onChangeText={(text) => setDetectedAddress(prev => ({ ...prev, name: text }))}
                                        placeholder="Dirección y Número"
                                    />

                                    <Text style={styles.inputLabel}>Nombre para guardar (ej: Casa, Oficina)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ej: Casa, Oficina, Gimnasio"
                                        value={addressLabel}
                                        onChangeText={setAddressLabel}
                                    />

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

                                    <TouchableOpacity
                                        style={styles.retryButton}
                                        onPress={() => setDetectedAddress(null)}
                                    >
                                        <Text style={styles.retryText}>No es correcto, intentar de nuevo</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* 3. Saved Addresses List */}
                            <Text style={styles.sectionTitle}>Mis Direcciones Guardadas</Text>

                            {isLoadingAddresses ? (
                                <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary.main} />
                            ) : (
                                <View style={styles.listContainer}>
                                    {savedAddresses?.length > 0 ? (
                                        savedAddresses.map((addr) => {
                                            const isSelected = currentAddress?.id === addr.id;
                                            return (
                                                <TouchableOpacity
                                                    key={addr.id}
                                                    style={[styles.addressItem, isSelected && styles.addressItemSelected]}
                                                    onPress={() => {
                                                        onSelectAddress(addr);
                                                        onClose();
                                                    }}
                                                >
                                                    <View style={[styles.itemIcon, isSelected && styles.itemIconSelected]}>
                                                        <Feather
                                                            name={getIconForLabel(addr.etiqueta)}
                                                            size={18}
                                                            color={isSelected ? colors.primary.main : colors.neutral.gray[500]}
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
                                                    {isSelected && (
                                                        <Ionicons name="checkmark" size={20} color={colors.primary.main} />
                                                    )}
                                                    {!isSelected && (
                                                        <TouchableOpacity
                                                            style={styles.deleteButton}
                                                            onPress={() => handleDelete(addr.id)}
                                                        >
                                                            <Ionicons name="trash-outline" size={18} color={colors.neutral.gray[400]} />
                                                        </TouchableOpacity>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <Ionicons
                                                name="map-outline"
                                                size={64}
                                                color={colors.neutral.gray[300]}
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
        backgroundColor: '#EFF6FF', // blue-50 hardcoded match
        borderWidth: 1,
        borderColor: '#DBEAFE', // blue-100
        borderRadius: borders.radius.lg,
        padding: spacing.md,
        marginBottom: spacing.lg,
    },
    heroIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#DBEAFE',
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
        color: '#1E40AF', // blue-800
        marginBottom: 2,
    },
    heroSubtitle: {
        fontSize: typography.fontSize.xs,
        color: '#60A5FA', // blue-400
    },

    // Save Form
    saveForm: {
        backgroundColor: '#F0FDF4', // green-50
        borderRadius: borders.radius.lg,
        padding: spacing.md,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: '#DCFCE7',
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
        color: '#166534', // green-800
        fontWeight: typography.fontWeight.medium,
        flex: 1,
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
        padding: spacing.md,
        borderRadius: borders.radius.lg,
        backgroundColor: colors.background.default,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    addressItemSelected: {
        backgroundColor: '#EFF6FF',
        borderColor: '#DBEAFE',
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
        backgroundColor: '#DBEAFE',
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
        color: '#1E40AF',
    },
    itemAddress: {
        fontSize: typography.fontSize.sm,
        color: colors.text.tertiary,
    },
    deleteButton: {
        padding: 8,
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
