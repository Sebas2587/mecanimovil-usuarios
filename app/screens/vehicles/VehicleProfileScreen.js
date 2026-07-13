import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Trash2, Info, Car } from 'lucide-react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from '../../utils/constants';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import Button from '../../components/base/Button/Button';

// Services
import * as vehicleService from '../../services/vehicle';
import { useDeleteVehicle } from '../../hooks/useVehicles';
import { showAlert, showAlertButtons, showConfirm } from '../../utils/platformAlert';
import { appendImageToFormData } from '../../utils/imagePickerWeb';
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
import BackButton from '../../components/navigation/BackButton';

const VehicleProfileScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();

    const { vehicle: initialVehicle } = route.params || {};

    const webRootFrame =
        Platform.OS === 'web'
            ? {
                  height: windowHeight,
                  maxHeight: windowHeight,
                  minHeight: 0,
                  flex: 1,
                  overflow: 'hidden',
              }
            : null;

    const [vehicle, setVehicle] = useState(initialVehicle);
    const [healthData, setHealthData] = useState(null);
    const [servicesCount, setServicesCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [valuationModalVisible, setValuationModalVisible] = useState(false);
    const [manualValuation, setManualValuation] = useState('');
    const [revisionRenewalDueISO, setRevisionRenewalDueISO] = useState(null);
    const { mutateAsync: deleteVehicleAsync } = useDeleteVehicle();

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
                VehicleHealthService.default.getVehicleHealthWithPatches(vehicle.id, true),
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
                .getVehicleHealthWithPatches(vehicle.id, true)
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
        showAlert('Editar Vehículo', 'Funcionalidad de edición en mantenimiento.');
    };

    const handleDelete = () => {
        if (!vehicle?.id) return;

        showConfirm(
            'Eliminar Vehículo',
            '⚠️ ADVERTENCIA: Esta acción eliminará el vehículo y TODOS sus datos asociados (servicios, historial, etc). Esta acción es irreversible.',
            {
                confirmText: 'Eliminar',
                destructive: true,
                onConfirm: async () => {
                    try {
                        await deleteVehicleAsync(vehicle.id);
                        showAlertButtons('Terminado', 'Vehículo eliminado correctamente.', [
                            { text: 'OK', onPress: () => navigation.goBack() },
                        ]);
                    } catch (e) {
                        console.error('Error eliminando vehículo:', e);
                        showAlert('Error', 'No se pudo eliminar el vehículo');
                    }
                },
            }
        );
    };

    const handleChangePhoto = () => {
        if (Platform.OS === 'web') {
            openImagePicker('library');
            return;
        }
        showAlertButtons('Cambiar Foto', '¿Cómo deseas actualizar la foto?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Galería', onPress: () => openImagePicker('library') },
            { text: 'Cámara', onPress: () => openImagePicker('camera') },
        ]);
    };

    const openImagePicker = async (type) => {
        try {
            let result;
            if (type === 'camera') {
                if (Platform.OS === 'web') {
                    showAlert('No disponible en web', 'Usa la galería para elegir una imagen desde tu computador.');
                    return;
                }
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    showAlert('Permiso denegado', 'Se necesita acceso a la cámara');
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
                if (Platform.OS !== 'web' && status !== 'granted') {
                    showAlert('Permiso denegado', 'Se necesita acceso a la galería');
                    return;
                }
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: Platform.OS !== 'web',
                    aspect: [16, 9],
                    quality: 0.7,
                    base64: Platform.OS === 'web',
                });
            }

            if (!result.canceled && result.assets && result.assets.length > 0) {
                await uploadPhoto(result.assets[0]);
            }
        } catch (error) {
            console.error('Error seleccionando imagen:', error);
            showAlert('Error', 'No se pudo seleccionar la imagen');
        }
    };

    const uploadPhoto = async (asset) => {
        const uri = asset?.uri;
        if (!uri) return;

        try {
            setVehicle((prev) => ({
                ...prev,
                foto: uri,
            }));

            setLoading(true);
            const formData = new FormData();
            await appendImageToFormData(formData, 'foto', uri, asset);

            await vehicleService.updateVehicle(vehicle.id, formData);

            const freshVehicle = await vehicleService.getVehicleById(vehicle.id);
            if (freshVehicle) {
                setVehicle(freshVehicle);
            }

            showAlert('Éxito', 'Foto actualizada correctamente');
        } catch (error) {
            console.error('Error updating photo:', error);
            const freshVehicle = await vehicleService.getVehicleById(vehicle.id);
            if (freshVehicle) {
                setVehicle(freshVehicle);
            }
            showAlert('Error', 'No se pudo actualizar la foto');
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
            showAlert('Error', 'Ingresa un valor válido mayor a 0.');
            return;
        }

        try {
            await vehicleService.updateVehicle(vehicle.id, {
                precio_mercado_promedio: numericValue
            });

            // Trigger refresh to get calculated value
            onRefresh();

            setValuationModalVisible(false);
            showAlert('Éxito', 'Valor de mercado actualizado. El valor sugerido se ha recalculado.');
        } catch (error) {
            showAlert('Error', 'No se pudo actualizar el valor.');
        }
    };

    return (
        <View style={[styles.container, webRootFrame]}>
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
                            <View style={styles.placeholderIconWrap}>
                                <Car size={40} color={COLORS.primary[500]} strokeWidth={1.5} fill="none" />
                            </View>
                        </View>
                    )}

                    <HeroImageGradientScrim intensity="default" />

                    <View style={[styles.scrollableHeaderControls, { top: insets.top }]}>
                        <View style={styles.headerLeftActions}>
                            <BackButton
                              onPress={() => navigation.goBack()}
                              color={COLORS.text.inverse}
                              style={styles.iconButton}
                            />
                            <TouchableOpacity
                              style={styles.iconButton}
                              onPress={handleChangePhoto}
                              accessibilityRole="button"
                              accessibilityLabel="Cambiar foto"
                            >
                                <Camera size={20} color={COLORS.text.inverse} strokeWidth={2} fill="none" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.iconButton, Platform.OS === 'web' && styles.iconButtonWeb]}
                            onPress={handleDelete}
                            accessibilityRole="button"
                            accessibilityLabel="Eliminar vehículo"
                        >
                            <Trash2 size={20} color={COLORS.text.inverse} strokeWidth={2} fill="none" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.headerInfoBlock}>
                        <Text style={styles.headerSubtitle}>{vehicle.year} · {vehicle.patente}</Text>
                        <Text style={styles.headerTitle} numberOfLines={2}>
                            {vehicle.marca_nombre || vehicle.marca} {vehicle.modelo_nombre || vehicle.modelo}
                        </Text>
                    </View>
                </View>

                <View style={styles.contentBody}>

                    {activeRequest && (
                        <ActiveRequestCard
                            request={activeRequest}
                            onPress={() => navigation.navigate(ROUTES.DETALLE_SOLICITUD, { solicitudId: activeRequest.id })}
                        />
                    )}

                    <Text style={styles.sectionLabel}>Accesos</Text>
                    <QuickActionGrid
                        healthScore={profileHealthScorePct}
                        serviceCount={servicesCount}
                        onHealthPress={() => navigation.navigate(ROUTES.VEHICLE_HEALTH, { vehicleId: vehicle.id, vehicle })}
                        onHistoryPress={() => navigation.navigate(ROUTES.VEHICLE_HISTORY, { vehicleId: vehicle.id, vehicle })}
                        onTripPress={() =>
                            navigation.navigate(ROUTES.REGISTRAR_VIAJE, {
                                vehicleId: vehicle.id,
                                vehicle,
                            })
                        }
                    />

                    <VehicleValuationCard
                        vehicle={vehicle}
                        marketValue={vehicle.precio_mercado_promedio || 0}
                        suggestedValue={vehicle.precio_sugerido_final || 0}
                        vehicleYear={vehicle.year}
                        healthScore={profileHealthScorePct}
                        onHealthPress={() => navigation.navigate(ROUTES.VEHICLE_HEALTH, { vehicleId: vehicle.id, vehicle })}
                        onValueDetailPress={() =>
                            navigation.navigate(ROUTES.VEHICLE_VALUE, { vehicleId: vehicle.id, vehicle })
                        }
                        onTransferPress={() =>
                            navigation.navigate(ROUTES.TRANSFERENCIA_RESUMEN, {
                                vehicle,
                                vehicleId: vehicle.id,
                            })
                        }
                        onEditPress={() => {
                            setManualValuation('');
                            setValuationModalVisible(true);
                        }}
                    />

                    <RevisionTecnicaCard
                        vehicle={vehicle}
                        revisionRenewalDueISO={revisionRenewalDueISO}
                        onRevisionRenewalConfirmed={setRevisionRenewalDueISO}
                    />

                    <TechSpecsCard vehicle={vehicle} />

                    <View style={styles.infoCard}>
                        <View style={styles.infoHeader}>
                            <Info size={16} color={COLORS.primary[500]} strokeWidth={1.75} fill="none" />
                            <Text style={styles.infoTitle}>Cómo calculamos el valor</Text>
                        </View>
                        <Text style={styles.infoText}>
                            Partimos del <Text style={styles.infoEmphasis}>precio de mercado</Text> y sumamos
                            aporte por <Text style={styles.infoEmphasis}>salud certificada</Text> y kilometraje.
                        </Text>
                    </View>

                    <View style={{ height: SPACING.lg }} />
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
        </View>
    );
};

const getStyles = (insets) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.default,
        ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
    },
    /** Web: viewport acotado + flexBasis 0 para que el scroll sea interno al ScrollView. */
    scrollWeb: {
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 0,
        minHeight: 0,
        overflow: 'scroll',
        WebkitOverflowScrolling: 'touch',
    },
    scrollContent: {
        paddingBottom: insets.bottom,
    },
    headerImageContainer: {
        height: 260,
        width: '100%',
        position: 'relative',
        backgroundColor: COLORS.base.soft,
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
        backgroundColor: COLORS.base.soft,
    },
    placeholderIconWrap: {
        width: 72,
        height: 72,
        borderRadius: BORDERS.radius.full,
        backgroundColor: COLORS.background.paper,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerInfoBlock: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 2,
        paddingHorizontal: SPACING.container.horizontal,
        paddingBottom: SPACING.xl,
    },
    headerTitle: {
        ...TYPOGRAPHY.styles.h3,
        color: COLORS.text.inverse,
    },
    headerSubtitle: {
        ...TYPOGRAPHY.styles.caption,
        color: withOpacity(COLORS.text.inverse, 0.88),
        marginBottom: 2,
    },
    contentBody: {
        marginTop: -SPACING.md,
        borderTopLeftRadius: BORDERS.radius.modal.lg,
        borderTopRightRadius: BORDERS.radius.modal.lg,
        backgroundColor: COLORS.background.default,
        paddingTop: SPACING.md,
    },
    sectionLabel: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.text.secondary,
        paddingHorizontal: SPACING.container.horizontal,
        marginBottom: SPACING.xs,
    },
    scrollableHeaderControls: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.container.horizontal,
        paddingTop: SPACING.sm,
    },
    headerLeftActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: withOpacity(COLORS.base.inkBlack, 0.4),
        borderWidth: BORDERS.width.thin,
        borderColor: withOpacity(COLORS.base.white, 0.18),
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconButtonWeb: {
        cursor: 'pointer',
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
    },
    modalTitle: {
        ...TYPOGRAPHY.styles.h4,
        marginBottom: SPACING.xs,
        color: COLORS.text.primary,
    },
    modalSubtitle: {
        ...TYPOGRAPHY.styles.caption,
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
        marginTop: SPACING.xs,
        marginBottom: SPACING.sm,
        padding: SPACING.md,
        borderRadius: BORDERS.radius.lg,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xxs,
        gap: SPACING.xs,
    },
    infoTitle: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.text.primary,
    },
    infoText: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
    },
    infoEmphasis: {
        color: COLORS.text.primary,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
    },
});

export default VehicleProfileScreen;
