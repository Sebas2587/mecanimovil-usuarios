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
    TextInput,
    Platform
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Camera, Trash2, Info, ArrowLeft } from 'lucide-react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from '../../utils/constants';

// Services
import * as vehicleService from '../../services/vehicle';
import * as VehicleHealthService from '../../services/vehicleHealthService';
import solicitudesService from '../../services/solicitudesService';
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

    const { vehicle: initialVehicle } = route.params || {};

    const [vehicle, setVehicle] = useState(initialVehicle);
    const [healthData, setHealthData] = useState(null);
    const [servicesCount, setServicesCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const styles = getStyles(insets);

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

            // Recuento real: solicitudes completadas de este vehículo (con oferta pagada)
            try {
                const response = await solicitudesService.obtenerMisSolicitudes({ estado: 'completada' });
                let list = [];
                if (Array.isArray(response)) list = response;
                else if (response?.results) list = response.results;
                else if (response?.features) list = response.features.map(f => ({ ...f.properties, id: f.id || f.properties?.id }));
                const vehicleId = freshVehicle?.id ?? vehicle?.id;
                const count = list.filter((s) => {
                    const sid = s.vehiculo?.id ?? s.vehiculo_detail?.id ?? s.vehiculo;
                    return sid != null && String(sid) === String(vehicleId);
                }).length;
                setServicesCount(count);
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

    if (!vehicle) return <ActivityIndicator style={{ flex: 1, backgroundColor: '#030712' }} color="#6EE7B7" />;

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

            {/* Dark gradient background */}
            <LinearGradient
                colors={['#030712', '#0a1628', '#030712']}
                style={StyleSheet.absoluteFill}
            />

            {/* Decorative blurred blobs */}
            <View style={styles.blobEmerald} />
            <View style={styles.blobIndigo} />
            <View style={styles.blobCyan} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6EE7B7" />}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.headerImageContainer}>

                    <View style={[styles.scrollableHeaderControls, { top: insets.top }]}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
                                <ArrowLeft size={22} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconButton} onPress={handleChangePhoto}>
                                <Camera size={22} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.rightButtons}>
                            <TouchableOpacity style={styles.iconButton} onPress={handleDelete}>
                                <Trash2 size={22} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Image without overlay button */}
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.headerImage} contentFit="cover" />
                    ) : (
                        <View style={styles.placeholderHeader}>
                            <Ionicons name="car-sport" size={80} color="rgba(255,255,255,0.15)" />
                        </View>
                    )}

                    {/* Gradient Overlay */}
                    <LinearGradient
                        colors={['transparent', 'rgba(3,7,18,0.9)']}
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
                        healthScore={vehicle?.health_score ?? (healthData?.salud_general_porcentaje ? Math.round(healthData.salud_general_porcentaje) : 0)}
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

                    {/* 5. Valuation Explanation */}
                    <View style={styles.infoCard}>
                        {Platform.OS === 'ios' && (
                            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                        )}
                        <View style={styles.infoHeader}>
                            <Info size={20} color="#93C5FD" />
                            <Text style={styles.infoTitle}>¿Cómo calculamos tu valor?</Text>
                        </View>
                        <Text style={styles.infoText}>
                            Usamos el <Text style={{ fontWeight: '700', color: '#FFF' }}>Precio de Mercado</Text> real como base y sumamos valor adicional por tu <Text style={{ fontWeight: '700', color: '#FFF' }}>Salud Certificada</Text> y <Text style={{ fontWeight: '700', color: '#FFF' }}>Kilometraje</Text>. ¡Sin castigos injustos!
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
                                {Platform.OS === 'ios' && (
                                    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                                )}
                                <Text style={styles.modalTitle}>Establecer Valor</Text>
                                <Text style={styles.modalSubtitle}>
                                    No pudimos obtener la tasación automática. Ingresa tu estimación.
                                </Text>

                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: 8000000"
                                    placeholderTextColor="rgba(255,255,255,0.35)"
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
                                        <LinearGradient
                                            colors={['#10B981', '#059669']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={StyleSheet.absoluteFill}
                                        />
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

const getStyles = (insets) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#030712',
    },
    blobEmerald: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(16,185,129,0.08)',
        top: -80,
        right: -100,
    },
    blobIndigo: {
        position: 'absolute',
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: 'rgba(99,102,241,0.06)',
        top: 300,
        left: -80,
    },
    blobCyan: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(6,182,212,0.05)',
        bottom: 100,
        right: -60,
    },
    scrollContent: {
        paddingBottom: insets.bottom,
    },
    headerImageContainer: {
        height: 340,
        width: '100%',
        position: 'relative',
        backgroundColor: '#0a1628',
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
        backgroundColor: '#0a1628',
    },
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 160,
        justifyContent: 'flex-end',
        padding: 16,
        paddingBottom: 48,
    },
    headerInfo: {
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 4,
        fontWeight: '500',
    },
    contentBody: {
        marginTop: -32,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: '#030712',
        paddingTop: 24,
    },
    scrollableHeaderControls: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
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
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        padding: 24,
        width: '100%',
        alignItems: 'center',
        overflow: 'hidden',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        color: '#FFFFFF',
    },
    modalSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        marginBottom: 20,
    },
    input: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        padding: 16,
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
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
        overflow: 'hidden',
    },
    cancelButton: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    saveButton: {
        // LinearGradient fills via absoluteFill
    },
    cancelButtonText: {
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
    },
    saveButtonText: {
        fontWeight: '600',
        color: '#FFFFFF',
    },
    infoCard: {
        backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    infoText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 20,
    }
});

export default VehicleProfileScreen;
