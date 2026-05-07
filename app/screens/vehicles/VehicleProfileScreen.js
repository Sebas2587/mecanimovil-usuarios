import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Platform
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Camera, Trash2, Info, ArrowLeft } from 'lucide-react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from '../../utils/constants';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import Button from '../../components/base/Button/Button';

// Services
import * as vehicleService from '../../services/vehicle';
import { loadRtRenewalDueISO } from '../../utils/revisionTecnica';
import * as VehicleHealthService from '../../services/vehicleHealthService';
import { resolveVehicleHealthPct } from '../../utils/healthFormat';
import { useSolicitudes } from '../../context/SolicitudesContext'; // To get active requests

// Components
import ActiveRequestCard from '../../components/vehicle/ActiveRequestCard';
import VehicleValuationCard from '../../components/vehicle/VehicleValuationCard';
import QuickActionGrid from '../../components/vehicle/QuickActionGrid';
import TechSpecsCard, { RevisionTecnicaCard } from '../../components/vehicle/TechSpecsCard';
import HeroImageGradientScrim from '../../components/vehicles/HeroImageGradientScrim';

const VehicleProfileScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();

    const { vehicle: initialVehicle } = route.params || {};

    const [vehicle, setVehicle] = useState(initialVehicle);
    const [healthData, setHealthData] = useState(null);
    const [servicesCount, setServicesCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [valuationModalVisible, setValuationModalVisible] = useState(false);
    const [manualValuation, setManualValuation] = useState('');
    const [revisionRenewalDueISO, setRevisionRenewalDueISO] = useState(null);

    const styles = getStyles(insets);
    const skipHealthFocusFetchRef = useRef(true);

    // Active Requests Context
    const { solicitudesActivas, cargarSolicitudesActivas } = useSolicitudes();

    // Derived State
    const activeRequest = solicitudesActivas?.find(s =>
        s.vehiculo === vehicle?.id || s.vehiculo_detail?.id === vehicle?.id
    );

    /** Misma fuente que VehicleHealthScreen (helper compartido). */
    const profileHealthScorePct = resolveVehicleHealthPct(vehicle, healthData);

    // Load Data
    const loadData = useCallback(async () => {
        if (!vehicle?.id) return;

        try {
            // Parallel Fetch
            const [health, freshVehicle] = await Promise.all([
                VehicleHealthService.default.getVehicleHealth(vehicle.id),
                vehicleService.getVehicleById(vehicle.id)
            ]);

            if (freshVehicle) {
                setVehicle(freshVehicle);
                const rid = freshVehicle.id;
                if (rid) {
                    const iso = await loadRtRenewalDueISO(rid);
                    setRevisionRenewalDueISO(iso);
                }
            }

            setHealthData(health);

            try {
                const vehicleId = freshVehicle?.id ?? vehicle?.id;
                const history = await vehicleService.getVehicleServiceHistory(vehicleId);
                setServicesCount(Array.isArray(history) ? history.length : 0);
            } catch (e) {
                console.warn('Error obteniendo conteo de servicios:', e);
                setServicesCount(0);
            }

            await cargarSolicitudesActivas();

        } catch (error) {
            console.error('Error loading vehicle data:', error);
        }
    }, [vehicle?.id, cargarSolicitudesActivas]);

    // Initial Load
    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        skipHealthFocusFetchRef.current = true;
    }, [vehicle?.id]);

    /** Al volver a la pantalla, misma fuente fresca que VehicleHealthScreen (evita caché 5 min desfasada). */
    useFocusEffect(
        useCallback(() => {
            if (!vehicle?.id) return undefined;
            if (skipHealthFocusFetchRef.current) {
                skipHealthFocusFetchRef.current = false;
                return undefined;
            }
            let alive = true;
            VehicleHealthService.default
                .getVehicleHealth(vehicle.id, true)
                .then((h) => {
                    if (alive) setHealthData(h);
                })
                .catch(() => {});
            return () => {
                alive = false;
            };
        }, [vehicle?.id])
    );

    useEffect(() => {
        let alive = true;
        if (!vehicle?.id) {
            setRevisionRenewalDueISO(null);
            return undefined;
        }
        loadRtRenewalDueISO(vehicle.id).then((iso) => {
            if (alive) setRevisionRenewalDueISO(iso);
        });
        return () => {
            alive = false;
        };
    }, [vehicle?.id]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // Handlers
    const handleEdit = () => {
        Alert.alert("Editar Vehículo", "Funcionalidad de edición en mantenimiento.");
    };

    const handleDelete = () => {
        Alert.alert(
            "Eliminar Vehículo",
            "⚠️ ADVERTENCIA: Esta acción eliminará el vehículo y TODOS sus datos asociados (servicios, historial, etc). Esta acción es irreversible.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await vehicleService.deleteVehicle(vehicle.id);
                            Alert.alert("Terminado", "Vehículo eliminado correctamente.", [
                                { text: "OK", onPress: () => navigation.goBack() }
                            ]);
                        } catch (e) {
                            Alert.alert("Error", "No se pudo eliminar el vehículo");
                        }
                    }
                }
            ]
        );
    };

    const handleChangePhoto = () => {
        Alert.alert(
            'Cambiar Foto',
            '¿Cómo deseas actualizar la foto?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Galería', onPress: () => openImagePicker('library') },
                { text: 'Cámara', onPress: () => openImagePicker('camera') },
            ]
        );
    };

    const openImagePicker = async (type) => {
        try {
            let result;
            if (type === 'camera') {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara');
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [16, 9],
                    quality: 0.7,
                });
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permiso denegado', 'Se necesita acceso a la galería');
                    return;
                }
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [16, 9],
                    quality: 0.7,
                });
            }

            if (!result.canceled && result.assets && result.assets.length > 0) {
                await uploadPhoto(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error seleccionando imagen:', error);
            Alert.alert('Error', 'No se pudo seleccionar la imagen');
        }
    };

    const uploadPhoto = async (uri) => {
        try {
            // Optimistic update - show local image immediately
            setVehicle(prev => ({
                ...prev,
                foto: uri
            }));

            setLoading(true);
            const formData = new FormData();
            formData.append('foto', {
                uri: uri,
                type: 'image/jpeg',
                name: `vehicle_${Date.now()}.jpg`,
            });

            await vehicleService.updateVehicle(vehicle.id, formData);

            // Refresh vehicle data to get new photo URL from server
            const freshVehicle = await vehicleService.getVehicleById(vehicle.id);
            if (freshVehicle) {
                setVehicle(freshVehicle);
            }

            Alert.alert('Éxito', 'Foto actualizada correctamente');
        } catch (error) {
            console.error('Error updating photo:', error);
            // Revert optimistic update on error
            const freshVehicle = await vehicleService.getVehicleById(vehicle.id);
            if (freshVehicle) {
                setVehicle(freshVehicle);
            }
            Alert.alert('Error', 'No se pudo actualizar la foto');
        } finally {
            setLoading(false);
        }
    };

    if (!vehicle) {
        return (
            <ActivityIndicator
                style={{ flex: 1, backgroundColor: COLORS.background.default }}
                color={COLORS.primary[500]}
            />
        );
    }

    const imageUrl = vehicle.foto || null;

    const handleSaveValuation = async () => {
        if (!manualValuation) return;

        const numericValue = parseInt(manualValuation.replace(/[^0-9]/g, ''));
        if (isNaN(numericValue) || numericValue <= 0) {
            Alert.alert("Error", "Ingresa un valor válido mayor a 0.");
            return;
        }

        try {
            await vehicleService.updateVehicle(vehicle.id, {
                precio_mercado_promedio: numericValue
            });

            // Trigger refresh to get calculated value
            onRefresh();

            setValuationModalVisible(false);
            Alert.alert("Éxito", "Valor de mercado actualizado. El valor sugerido se ha recalculado.");
        } catch (error) {
            Alert.alert("Error", "No se pudo actualizar el valor.");
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

            <ScrollView
                style={Platform.OS === 'web' ? styles.scrollWeb : undefined}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={COLORS.primary[500]}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.headerImageContainer}>
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.headerImage} contentFit="cover" />
                    ) : (
                        <View style={styles.placeholderHeader}>
                            <Ionicons name="car-sport" size={80} color={COLORS.neutral.gray[300]} />
                        </View>
                    )}

                    <HeroImageGradientScrim intensity="default" />

                    <View style={[styles.scrollableHeaderControls, { top: insets.top }]}>
                        <View style={{ flexDirection: 'row', gap: SPACING.xs }}>
                            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
                                <ArrowLeft size={22} color={COLORS.text.inverse} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconButton} onPress={handleChangePhoto}>
                                <Camera size={22} color={COLORS.text.inverse} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.rightButtons}>
                            <TouchableOpacity style={styles.iconButton} onPress={handleDelete}>
                                <Trash2 size={22} color={COLORS.text.inverse} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.headerInfoBlock}>
                        <View style={styles.headerInfo}>
                            <Text style={styles.headerSubtitle}>{vehicle.year} • {vehicle.patente}</Text>
                            <Text style={styles.headerTitle}>
                                {vehicle.marca_nombre || vehicle.marca} {vehicle.modelo_nombre || vehicle.modelo}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Scrollable Content overlapping Header */}
                <View style={styles.contentBody}>

                    {/* 1. Active Request (Priority) */}
                    {activeRequest && (
                        <ActiveRequestCard
                            request={activeRequest}
                            onPress={() => navigation.navigate(ROUTES.DETALLE_SOLICITUD, { solicitudId: activeRequest.id })}
                        />
                    )}

                    {/* 2. Quick Actions */}
                    <QuickActionGrid
                        healthScore={profileHealthScorePct}
                        serviceCount={servicesCount}
                        onHealthPress={() => navigation.navigate(ROUTES.VEHICLE_HEALTH, { vehicleId: vehicle.id, vehicle })}
                        onHistoryPress={() => navigation.navigate(ROUTES.VEHICLE_HISTORY, { vehicleId: vehicle.id, vehicle })}
                    />

                    {/* 3. Valuation Card */}
                    <VehicleValuationCard
                        marketValue={vehicle.precio_mercado_promedio || 0}
                        suggestedValue={vehicle.precio_sugerido_final || 0}
                        onSellPress={() => navigation.navigate(ROUTES.SELL_VEHICLE, { vehicle })}
                        onEditPress={() => {
                            setManualValuation('');
                            setValuationModalVisible(true);
                        }}
                    />

                    {/* 4. Revisión técnica (sección aparte) */}
                    <RevisionTecnicaCard
                        vehicle={vehicle}
                        revisionRenewalDueISO={revisionRenewalDueISO}
                        onRevisionRenewalConfirmed={setRevisionRenewalDueISO}
                    />

                    {/* 5. Ficha técnica — grid 2 columnas */}
                    <TechSpecsCard vehicle={vehicle} />

                    {/* 6. Valuation Explanation */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoHeader}>
                            <Info size={20} color={COLORS.primary[500]} />
                            <Text style={styles.infoTitle}>¿Cómo calculamos tu valor?</Text>
                        </View>
                        <Text style={styles.infoText}>
                            Usamos el <Text style={styles.infoEmphasis}>Precio de Mercado</Text> real como base y sumamos valor adicional por tu <Text style={styles.infoEmphasis}>Salud Certificada</Text> y <Text style={styles.infoEmphasis}>Kilometraje</Text>. ¡Sin castigos injustos!
                        </Text>
                    </View>

                    <View style={{ height: 40 }} />
                </View>
            </ScrollView>



            {/* Manual Valuation Modal */}
            {
                valuationModalVisible && (
                    <View style={StyleSheet.absoluteFillObject}>
                        <TouchableOpacity
                            style={styles.modalOverlay}
                            activeOpacity={1}
                            onPress={() => setValuationModalVisible(false)}
                        >
                            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                                <Text style={styles.modalTitle}>Establecer Valor</Text>
                                <Text style={styles.modalSubtitle}>
                                    No pudimos obtener la tasación automática. Ingresa tu estimación.
                                </Text>

                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: 8000000"
                                    placeholderTextColor={COLORS.text.tertiary}
                                    keyboardType="numeric"
                                    value={manualValuation}
                                    onChangeText={setManualValuation}
                                    autoFocus
                                />

                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.cancelButton]}
                                        onPress={() => setValuationModalVisible(false)}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                                    </TouchableOpacity>
                                    <View style={[styles.modalButton, styles.saveButtonWrap]}>
                                        <Button title="Guardar" onPress={handleSaveValuation} />
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                )
            }
        </View >
    );
};

const getStyles = (insets) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.default,
        ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
    },
    /** Web: sin altura acotada el ScrollView crece con el contenido y no hay scroll (stack/tabs). */
    scrollWeb: {
        flex: 1,
        minHeight: 0,
    },
    scrollContent: {
        paddingBottom: insets.bottom,
    },
    headerImageContainer: {
        height: 340,
        width: '100%',
        position: 'relative',
        backgroundColor: COLORS.neutral.gray[100],
    },
    headerImage: {
        width: '100%',
        height: '100%',
    },
    placeholderHeader: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.neutral.gray[100],
    },
    headerInfoBlock: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 2,
        padding: SPACING.md,
        paddingBottom: SPACING['2xl'],
        justifyContent: 'flex-end',
    },
    headerInfo: {
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.fontSize['3xl'],
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.inverse,
    },
    headerSubtitle: {
        fontSize: TYPOGRAPHY.fontSize.md,
        color: withOpacity(COLORS.text.inverse, 0.85),
        marginBottom: SPACING.xxs,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    contentBody: {
        marginTop: -SPACING.xl,
        borderTopLeftRadius: BORDERS.radius.modal.lg,
        borderTopRightRadius: BORDERS.radius.modal.lg,
        backgroundColor: COLORS.background.default,
        paddingTop: SPACING.lg,
    },
    scrollableHeaderControls: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.container.horizontal,
        paddingTop: SPACING.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: withOpacity(COLORS.base.inkBlack, 0.45),
        borderWidth: BORDERS.width.thin,
        borderColor: withOpacity(COLORS.base.white, 0.2),
        justifyContent: 'center',
        alignItems: 'center',
    },
    rightButtons: {
        flexDirection: 'row',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: withOpacity(COLORS.base.inkBlack, 0.45),
        borderWidth: BORDERS.width.thin,
        borderColor: withOpacity(COLORS.base.white, 0.2),
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: SPACING.xs,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: COLORS.background.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    modalContent: {
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.modal.lg,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        padding: SPACING.lg,
        width: '100%',
        alignItems: 'center',
        overflow: 'hidden',
        ...SHADOWS.lg,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        marginBottom: SPACING.xs,
        color: COLORS.text.primary,
    },
    modalSubtitle: {
        fontSize: TYPOGRAPHY.fontSize.base,
        color: COLORS.text.secondary,
        textAlign: 'center',
        marginBottom: SPACING.lg,
    },
    input: {
        width: '100%',
        backgroundColor: COLORS.neutral.gray[100],
        borderRadius: BORDERS.radius.input.md,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        padding: SPACING.md,
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
        marginBottom: SPACING.lg,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        width: '100%',
        gap: SPACING.sm,
    },
    modalButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    cancelButton: {
        backgroundColor: COLORS.neutral.gray[100],
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        borderRadius: BORDERS.radius.button.md,
        paddingVertical: SPACING.md,
    },
    saveButtonWrap: {
        minHeight: 48,
    },
    cancelButtonText: {
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.secondary,
    },
    infoCard: {
        backgroundColor: COLORS.background.paper,
        marginHorizontal: SPACING.container.horizontal,
        marginTop: SPACING.md,
        padding: SPACING.md,
        borderRadius: BORDERS.radius.card.lg,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
        gap: SPACING.xs,
    },
    infoTitle: {
        fontSize: TYPOGRAPHY.fontSize.base,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.text.primary,
    },
    infoText: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.secondary,
        lineHeight: 20,
    },
    infoEmphasis: {
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.text.primary,
    },
});

export default VehicleProfileScreen;
