import React, { useState, useEffect, useCallback } from 'react';
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
    Modal,
    TextInput
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../design-system/theme/useTheme';
import { ROUTES } from '../../utils/constants';

// Services
import * as vehicleService from '../../services/vehicle';
import * as VehicleHealthService from '../../services/vehicleHealthService';
import { useServicesHistory } from '../../hooks/useServices'; // Keeping hooks pattern if available, or direct service
import { useSolicitudes } from '../../context/SolicitudesContext'; // To get active requests

// Components
import ActiveRequestCard from '../../components/vehicle/ActiveRequestCard';
import VehicleValuationCard from '../../components/vehicle/VehicleValuationCard';
import QuickActionGrid from '../../components/vehicle/QuickActionGrid';
import TechSpecsCard from '../../components/vehicle/TechSpecsCard';

// Temporary Mock for Valuation (Business Logic should eventually provide this)
const MOCK_VALUATION = {
    marketValue: 12500000,
    suggestedValue: 13125000
};

const VehicleProfileScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const theme = useTheme();

    // Initial Params
    const { vehicle: initialVehicle } = route.params || {};

    // State
    const [vehicle, setVehicle] = useState(initialVehicle);
    const [healthData, setHealthData] = useState(null);
    const [servicesCount, setServicesCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Design System
    const colors = theme?.colors || {};
    const typography = theme?.typography || {};
    const spacing = theme?.spacing || {};
    const borders = theme?.borders || {};
    const styles = getStyles(colors, typography, spacing, borders, insets);

    // Active Requests Context
    const { solicitudesActivas, cargarSolicitudesActivas } = useSolicitudes();

    // Derived State
    const activeRequest = solicitudesActivas?.find(s =>
        s.vehiculo === vehicle?.id || s.vehiculo_detail?.id === vehicle?.id
    );

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
            }

            setHealthData(health);

            // Calculate service count (Mock for now as service is missing)
            setServicesCount(0);

            await cargarSolicitudesActivas();

        } catch (error) {
            console.error('Error loading vehicle data:', error);
        }
    }, [vehicle?.id, cargarSolicitudesActivas]);

    // Initial Load
    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // Handlers
    const handleEdit = () => {
        // Reuse existing edit logic (Modal) - simplified for this implementation, 
        // ideally navigate to separate EditScreen to keep this clean.
        // For now, prompt user or navigate to legacy screen if kept.
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

    if (!vehicle) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary?.[500]} />;

    const imageUrl = vehicle.foto || null;

    const [valuationModalVisible, setValuationModalVisible] = useState(false);
    const [manualValuation, setManualValuation] = useState('');

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
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.headerImageContainer}>

                    {/* Header Controls (Inside Scroll) */}
                    <View style={[styles.scrollableHeaderControls, { top: insets.top }]}>
                        <View style={styles.rightButtons}>
                            <TouchableOpacity style={styles.iconButton} onPress={handleEdit}>
                                <Ionicons name="create-outline" size={24} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconButton} onPress={handleDelete}>
                                <Ionicons name="trash-outline" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.headerImage} contentFit="cover" />
                    ) : (
                        <View style={styles.placeholderHeader}>
                            <Ionicons name="car-sport" size={80} color={colors.neutral?.gray?.[600]} />
                        </View>
                    )}

                    {/* Gradient Overlay */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                        style={styles.gradientOverlay}
                    >
                        <View style={styles.headerInfo}>
                            <Text style={styles.headerSubtitle}>{vehicle.year} • {vehicle.patente}</Text>
                            <Text style={styles.headerTitle}>
                                {vehicle.marca_nombre || vehicle.marca} {vehicle.modelo_nombre || vehicle.modelo}
                            </Text>
                        </View>
                    </LinearGradient>
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
                        healthScore={healthData?.salud_general_porcentaje ? Math.round(healthData.salud_general_porcentaje) : 0}
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

                    {/* 4. Technical Specs */}
                    <TechSpecsCard vehicle={vehicle} />

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
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.saveButton]}
                                        onPress={handleSaveValuation}
                                    >
                                        <Text style={styles.saveButtonText}>Guardar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                )
            }
        </View >
    );
};

const getStyles = (colors, typography, spacing, borders, insets) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background?.default || '#F8F9FA',
    },
    scrollContent: {
        paddingBottom: insets.bottom,
    },
    headerImageContainer: {
        height: 340,
        width: '100%',
        position: 'relative',
        backgroundColor: '#1E1E1E',
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
        backgroundColor: colors.neutral?.gray?.[800] || '#262626',
    },
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 160,
        justifyContent: 'flex-end',
        padding: spacing.md || 16,
        paddingBottom: 48, // Give space for the overlap
    },
    headerInfo: {
        marginBottom: spacing.xs || 8,
    },
    headerTitle: {
        fontSize: typography.fontSize?.['3xl'] || 28,
        fontWeight: typography.fontWeight?.bold || '700',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    headerSubtitle: {
        fontSize: typography.fontSize?.md || 16,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 4,
        fontWeight: typography.fontWeight?.medium || '500',
    },
    contentBody: {
        marginTop: -32, // Negative margin for overlap effect
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: colors.background?.default || '#F8F9FA',
        paddingTop: spacing.lg || 24,
    },
    scrollableHeaderControls: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'flex-end', // Align to right
        paddingHorizontal: 16,
        paddingTop: 16, // Add some padding from the very top edge of the container
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        backdropFilter: 'blur(10px)', // Only works on some versions/platforms, fallback is safe
    },
    rightButtons: {
        flexDirection: 'row',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        color: '#1F2937',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 20,
    },
    input: {
        width: '100%',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 24,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
    },
    saveButton: {
        backgroundColor: '#0F172A',
    },
    cancelButtonText: {
        fontWeight: '600',
        color: '#4B5563',
    },
    saveButtonText: {
        fontWeight: '600',
        color: 'white',
    }
});

export default VehicleProfileScreen;
