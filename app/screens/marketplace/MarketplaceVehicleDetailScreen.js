import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../design-system/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as vehicleService from '../../services/vehicle';
import VehicleHealthService from '../../services/vehicleHealthService'; // Import Health Service
import { ROUTES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

// Updates for Marketplace Negotiation
import OfferCreationModal from '../../components/marketplace/OfferCreationModal';
import ChecklistViewerModal from '../../components/modals/ChecklistViewerModal'; // Import Checklist Modal
import { VehicleServiceHistoryRow } from '../../components/vehicles/VehicleHistoryCard';

const MarketplaceVehicleDetailScreen = ({ route }) => {
    const navigation = useNavigation();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    // Get basic vehicle data from params
    const { vehicle } = route?.params || {};

    const [fullVehicleData, setFullVehicleData] = useState(vehicle || {});
    const [healthData, setHealthData] = useState(null); // State for real health data
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal state for making offer
    const [offerModalVisible, setOfferModalVisible] = useState(false);

    // Checklist Modal State
    const [checklistModalVisible, setChecklistModalVisible] = useState(false);
    const [selectedChecklistId, setSelectedChecklistId] = useState(null);
    const [selectedServiceName, setSelectedServiceName] = useState('');

    const colors = theme?.colors || {};
    const typography = theme?.typography || {};
    const spacing = theme?.spacing || {};
    const borders = theme?.borders || {};

    const styles = getStyles(colors, typography, spacing, borders, insets);

    // Reload when screen gains focus - critical for real-time updates
    useFocusEffect(
        React.useCallback(() => {
            if (vehicle?.id) fetchVehicleDetails(true);
        }, [vehicle?.id])
    );

    const fetchVehicleDetails = async (isFocusRefresh = false) => {
        if (!isFocusRefresh) setLoading(true);
        try {
            // Parallel fetching for better performance
            const [detailData] = await Promise.all([
                vehicleService.getMarketplaceVehicleDetail(vehicle.id),
            ]);

            // Merge basic info with detailed info (history, etc)
            // ENRICHMENT: Fetch detailed request info for history items if they are Solicitudes
            // The history items from `getMarketplaceVehicleDetail` are simplified.
            // We need to fetch the full `Solicitud` for each to get provider details (avatar, name, type) from the offer.
            const rawHistory = detailData.history || detailData.historial || detailData.services || [];

            // Enrich history items by fetching user's completed requests
            let enrichedHistory = [];

            try {
                const SolicitudesService = (await import('../../services/solicitudesService')).default;
                const myCompletedRequests = await SolicitudesService.obtenerMisSolicitudes({ estado: 'completada' });

                console.log('📋 [Enrichment] Fetched completed requests:', myCompletedRequests.length);

                // Filter for this vehicle
                const vehicleRequests = myCompletedRequests.filter(req => {
                    const reqVehicleId = req.vehiculo_id || req.vehiculo?.id || req.vehiculo;
                    return reqVehicleId == vehicle.id;
                });

                console.log(`🚗 [Enrichment] Found ${vehicleRequests.length} requests for vehicle ${vehicle.id}`);

                if (vehicleRequests.length > 0) {
                    enrichedHistory = vehicleRequests.map(req => ({
                        ...req,
                        date: req.fecha_servicio || req.fecha_creacion,
                        service: req.nombre_servicio || req.servicio_nombre || (req.oferta_seleccionada_detail?.detalles_servicios?.[0]?.servicio_nombre) || 'Servicio',
                        provider: req.nombre_proveedor || req.oferta_seleccionada_detail?.nombre_proveedor,
                        verified: true,
                        kilometraje: req.kilometraje || req.vehiculo_info?.kilometraje,
                        id: req.id
                    }));
                } else {
                    enrichedHistory = rawHistory;
                }
            } catch (err) {
                console.warn('⚠️ [Enrichment] Failed:', err);
                enrichedHistory = rawHistory;
            }

            // Update the detailData with the new enriched history
            detailData.history = enrichedHistory;

            setFullVehicleData(prev => ({ ...prev, ...detailData }));

            console.log('🚗 [DEBUG] Vehicle Detail Data (Enriched):', JSON.stringify(detailData, null, 2));
            console.log('📜 [DEBUG] Enriched History Items (first 2):', JSON.stringify(enrichedHistory.slice(0, 2), null, 2));

            // Set real health data from public endpoint
            // The public endpoint should include health info in 'health_data' or 'health'
            const publicHealth = detailData.health_data || detailData.health || {};
            setHealthData(publicHealth);

        } catch (error) {
            console.error("Error fetching vehicle details:", error);
            // Alert.alert("Error", "No se pudo cargar el detalle completo del vehículo.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchVehicleDetails();
    }, []);

    // Handle Offer Submission
    const handleMakeOffer = (amount) => {
        // Pre-construct message for chat
        const formattedAmount = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
        const initialMessage = `Hola, he enviado una oferta de ${formattedAmount} por tu ${brand} ${model}`;

        // Navigate to Chat
        // Must ensure we have route params for chat: e.g., recipientId (seller), context (vehicleId)
        // Assuming fullVehicleData has owner/seller info. If not, we might need to mock or ensure backend sends it.
        const sellerId = fullVehicleData.user_id || fullVehicleData.seller?.id;

        if (!sellerId) {
            Alert.alert("Error", "No se pudo identificar al vendedor.");
            return;
        }

        navigation.navigate(ROUTES.CHAT_DETAIL, {
            recipientId: sellerId,
            recipientName: fullVehicleData.seller?.name || "Vendedor",
            recipientImage: fullVehicleData.seller?.photo || null,
            initialMessage: initialMessage,
            context: {
                type: 'vehicle_offer',
                vehicleId: fullVehicleData.id,
                vehicleName: `${brand} ${model}`,
                amount: amount
            }
        });
    };

    // Render Health Chart (Simple Circle)
    const renderHealthChart = (score) => {
        const radius = 30;
        const circumference = 2 * Math.PI * radius;
        const validScore = isNaN(score) ? 100 : score;
        const strokeDashoffset = circumference - (validScore / 100) * circumference;

        return (
            <View style={styles.chartContainer}>
                <Svg height="80" width="80" viewBox="0 0 80 80">
                    <Circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke={colors.neutral?.gray?.[200] || '#E5E7EB'}
                        strokeWidth="6"
                        fill="transparent"
                    />
                    <Circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke={colors.success?.main || '#10B981'}
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        rotation="-90"
                        origin="40, 40"
                    />
                </Svg>
                <View style={styles.chartTextContainer}>
                    <Text style={styles.chartScore}>{Math.round(validScore)}%</Text>
                </View>
            </View>
        );
    };

    const [healthModalVisible, setHealthModalVisible] = useState(false);

    // Derived Data
    // Use real health data if available, fallback to vehicle data, default to 100
    // Be robust with 0 checks. If healthData exists but is 0, it might be real 0? 
    // Or if undefined, fallback.
    const healthScore = (healthData && typeof healthData.salud_general_porcentaje === 'number')
        ? healthData.salud_general_porcentaje
        : (fullVehicleData.health_score || 0);

    // Robust history check - check multiple potential keys
    const history = fullVehicleData.historial || fullVehicleData.history || fullVehicleData.services || [];

    // Components/Details
    const healthDetails = healthData?.componentes || healthData?.components || fullVehicleData.health_details || [];

    const imageUrl = fullVehicleData.foto_url || fullVehicleData.image; // Fallback to list param image
    const brand = fullVehicleData.marca_nombre || fullVehicleData.brand;
    const model = fullVehicleData.modelo_nombre || fullVehicleData.model;
    const year = fullVehicleData.year;

    // Price logic - prioritize precio_venta (published/real price)
    // Check multiple potential keys from backend
    const price = fullVehicleData.precio_venta ||
        fullVehicleData.price ||
        fullVehicleData.selling_price ||
        fullVehicleData.precio_publicado ||
        fullVehicleData.precio_sugerido_final ||
        fullVehicleData.suggested_price || 0;

    const formattedPrice = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);

    // Check ownership
    const sellerId = fullVehicleData.user_id || fullVehicleData.seller?.id || fullVehicleData.cliente_id;
    const isOwner = user?.id && sellerId && (String(user.id) === String(sellerId));

    const renderHealthDetailItem = (item) => {
        // Metric Logic matching VehicleHealthScreen
        const score = item.salud_porcentaje || item.score || 0;

        let color = colors.error?.main || '#EF4444'; // default red
        if (score >= 70) color = colors.success?.main || '#10B981';
        else if (score >= 40) color = colors.warning?.main || '#F59E0B';

        const name = item.nombre || item.name || 'Componente';
        const lastServiceKm = item.km_ultimo_servicio ? `${item.km_ultimo_servicio.toLocaleString()} km` : '0 km';
        const remainingKm = item.km_estimados_restantes ? `${item.km_estimados_restantes.toLocaleString()} km restantes` : '';
        const statusText = item.nivel_alerta_display || item.nivel_alerta || (score >= 70 ? 'Óptimo' : (score >= 40 ? 'Atención' : 'Crítico'));

        return (
            <View key={item.id || Math.random()} style={styles.detailItem}>
                <View style={[styles.detailIcon, { backgroundColor: color + '20' }]}>
                    <Ionicons name={item.icono || "construct"} size={20} color={color} />
                </View>
                <View style={styles.detailContent}>
                    <Text style={styles.detailName}>{name}</Text>
                    <Text style={styles.detailStatusText}>Último: {lastServiceKm}</Text>

                    {/* Progress Bar */}
                    <View style={{ height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginTop: 6, marginBottom: 4 }}>
                        <View style={{ width: `${score}%`, height: '100%', backgroundColor: color, borderRadius: 2 }} />
                    </View>

                    <View style={styles.detailStatusRow}>
                        <Text style={[styles.statusBadge, { color: color }]}>{statusText}</Text>
                        <Text style={styles.detailRemaining}>{remainingKm}</Text>
                    </View>
                </View>
                <Text style={[styles.detailScore, { color: color }]}>{Math.round(score)}%</Text>
            </View>
        );
    };

    // Helper for viewing checklist from history row
    const handleViewChecklist = (item) => {
        // The backend expects an integer ID (Orden ID / SolicitudServicio ID), not the UUID of the public request.
        // We prioritize finding the integer ID from the offer details.
        const checklistId = item.oferta_seleccionada_detail?.solicitud_servicio_id ||
            item.solicitud_servicio_id ||
            item.orden_id ||
            item.checklist_id;

        console.log('🔍 handleViewChecklist - Item:', item.id);
        console.log('🔍 handleViewChecklist - Resolved ID:', checklistId);

        if (checklistId) {
            const serviceName = item.servicio_nombre || item.service || 'Servicio';
            setSelectedChecklistId(checklistId);
            setSelectedServiceName(serviceName);
            setChecklistModalVisible(true);
        } else {
            Alert.alert("Aviso", "No hay checklist asociado a este servicio o no se encontró el ID válido.");
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
            >
                {/* 1. Immersive Header */}
                <View style={styles.headerContainer}>
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.headerImage} contentFit="cover" />
                    ) : (
                        <View style={[styles.headerImage, { backgroundColor: '#1F2937' }]} />
                    )}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.1)', 'transparent', colors.background?.overlay || 'rgba(17, 24, 39, 0.9)']}
                        style={styles.headerGradient}
                    />

                    {/* Header Controls */}
                    <View style={styles.topBar}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                        </TouchableOpacity>

                        {healthScore > 90 && (
                            <View style={styles.certifiedBadge}>
                                <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                                <Text style={styles.certifiedText}>CERTIFICADO</Text>
                            </View>
                        )}
                    </View>

                    {/* Bottom Info */}
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>{brand} {model}</Text>
                        <Text style={styles.headerSubtitle}>{year}</Text>
                    </View>
                </View>

                {/* 2. Body Content (Negative Margin) */}
                <View style={styles.bodyContainer}>

                    {/* Health Summary Card */}
                    <View style={styles.healthCard}>
                        <View style={styles.healthRow}>
                            {renderHealthChart(healthScore)}
                            <View style={styles.healthInfo}>
                                <Text style={styles.healthTitle}>Salud Mecánica</Text>
                                <Text style={styles.healthSubtitle}>Basado en historial verificado</Text>
                                <TouchableOpacity
                                    style={styles.detailButton}
                                    onPress={() => setHealthModalVisible(true)}
                                >
                                    <Text style={styles.detailButtonText}>Ver Detalle</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Service Timeline - REDESIGNED */}
                    {/* Vehicle Specs Section */}
                    <View style={styles.sectionHeader}>
                        <Ionicons name="car-sport-outline" size={20} color={colors.text?.secondary} />
                        <Text style={styles.sectionTitle}>Detalles del Vehículo</Text>
                    </View>

                    <View style={styles.specsCard}>
                        <View style={styles.specsGrid}>
                            <View style={styles.specItem}>
                                <Text style={styles.specLabel}>Versión</Text>
                                <Text style={styles.specValue}>{fullVehicleData.version || 'N/A'}</Text>
                            </View>
                            <View style={styles.specItem}>
                                <Text style={styles.specLabel}>Cilindraje</Text>
                                <Text style={styles.specValue}>{fullVehicleData.cilindraje || 'N/A'}</Text>
                            </View>
                            <View style={styles.specItem}>
                                <Text style={styles.specLabel}>Transmisión</Text>
                                <Text style={styles.specValue}>{fullVehicleData.transmision || 'Automática'}</Text>
                            </View>
                            <View style={styles.specItem}>
                                <Text style={styles.specLabel}>Kilometraje</Text>
                                <Text style={styles.specValue}>{(fullVehicleData.kilometraje || 0).toLocaleString()} km</Text>
                            </View>
                            <View style={styles.specItem}>
                                <Text style={styles.specLabel}>Combustible</Text>
                                <Text style={styles.specValue}>{fullVehicleData.tipo_motor || 'Gasolina'}</Text>
                            </View>
                            <View style={styles.specItem}>
                                <Text style={styles.specLabel}>Puertas</Text>
                                <Text style={styles.specValue}>{fullVehicleData.puertas || 'N/A'}</Text>
                            </View>
                            <View style={styles.specItem}>
                                <Text style={styles.specLabel}>Color</Text>
                                <Text style={styles.specValue}>{fullVehicleData.color || 'N/A'}</Text>
                            </View>
                            <View style={styles.specItem}>
                                <Text style={styles.specLabel}>Rev. Técnica</Text>
                                <Text style={styles.specValue}>{fullVehicleData.mes_revision_tecnica || 'N/A'}</Text>
                            </View>
                            {/* Detailed Sensitive Info - Only for Owner */}
                            {isOwner && (
                                <>
                                    <View style={styles.specItem}>
                                        <Text style={styles.specLabel}>VIN</Text>
                                        <Text style={styles.specValue} numberOfLines={1} adjustsFontSizeToFit>{fullVehicleData.vin || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.specItem}>
                                        <Text style={styles.specLabel}>Nº Motor</Text>
                                        <Text style={styles.specValue} numberOfLines={1} adjustsFontSizeToFit>{fullVehicleData.numero_motor || 'N/A'}</Text>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>

                    <View style={styles.sectionHeader}>
                        <Feather name="clock" size={20} color={colors.text?.secondary} />
                        <Text style={styles.sectionTitle}>Historial de Servicios</Text>
                    </View>

                    <View style={styles.timelineContainer}>
                        {/* No timeline line for the new card style, or we can keep it if we want 'connected' cards. 
                            The requirement implies cards "show much more info", likely standalone. 
                            Moving to standalone list for cleaner UI with complex cards. */}

                        {history.length > 0 ? (
                            history.map((item) => (
                                <VehicleServiceHistoryRow
                                    key={item.id}
                                    item={item}
                                    onViewChecklist={handleViewChecklist}
                                />
                            ))
                        ) : (
                            <View style={styles.emptyHistory}>
                                <Text style={styles.emptyHistoryText}>No hay servicios registrados en MecaniMóvil.</Text>
                            </View>
                        )}
                    </View>

                    {/* Padding for Bottom Sticky Bar */}
                    <View style={{ height: 120 }} />
                </View>
            </ScrollView>

            {/* 3. Sticky Bottom Bar (Replaces old Contact Button) */}
            <View style={[
                styles.stickyBottomBar,
                {
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
                    backgroundColor: colors.background?.paper || '#FFF',
                    borderTopColor: colors.border?.light || '#E5E7EB'
                }
            ]}>
                <View style={styles.priceContainer}>
                    <Text style={{ color: colors.text?.secondary, fontSize: 12, fontWeight: '500' }}>Precio</Text>
                    <Text style={{ color: colors.text?.primary, fontSize: 24, fontWeight: '800' }}>{formattedPrice}</Text>
                </View>

                <TouchableOpacity
                    style={[
                        styles.makeOfferButton,
                        { backgroundColor: isOwner ? '#9CA3AF' : (colors.primary?.main || '#003459') }
                    ]}
                    onPress={() => !isOwner && setOfferModalVisible(true)}
                    activeOpacity={isOwner ? 1 : 0.8}
                    disabled={isOwner}
                >
                    <Ionicons name={isOwner ? "person" : "pricetag-outline"} size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.makeOfferText}>{isOwner ? "Tu Publicación" : "Hacer Oferta"}</Text>
                </TouchableOpacity>
            </View>

            {/* 4. Health Details Modal */}
            {healthModalVisible && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Detalle de Salud</Text>
                            <TouchableOpacity onPress={() => setHealthModalVisible(false)} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={colors.text?.primary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            {healthDetails.length > 0 ? (
                                healthDetails.map(item => renderHealthDetailItem(item))
                            ) : (
                                <View style={styles.emptyDetails}>
                                    <Text style={styles.emptyDetailsText}>No hay información detallada disponible.</Text>
                                </View>
                            )}
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            )}

            {/* 5. Offer Creation Modal */}
            <OfferCreationModal
                visible={offerModalVisible}
                onClose={() => setOfferModalVisible(false)}
                onSubmit={handleMakeOffer}
                vehiclePrice={price}
                vehicleName={`${brand} ${model}`}
            />

            {/* 6. Checklist Viewer Modal */}
            <ChecklistViewerModal
                visible={checklistModalVisible}
                onClose={() => setChecklistModalVisible(false)}
                ordenId={selectedChecklistId}
                servicioNombre={selectedServiceName}
            />
        </View>
    );
};

const getStyles = (colors, typography, spacing, borders, insets) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background?.default || '#F3F4F6',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 0,
    },
    // Header
    headerContainer: {
        height: 320,
        width: '100%',
        position: 'relative',
    },
    headerImage: {
        width: '100%',
        height: '100%',
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    topBar: {
        position: 'absolute',
        top: insets.top + 10,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)', // Blur effect simulation
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    certifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.9)', // Success green translucent
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    certifiedText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 10,
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    headerInfo: {
        position: 'absolute',
        bottom: 40, // Space for overlap
        left: 20,
        right: 20,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '800',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 16,
        marginTop: 4,
    },
    // Body
    bodyContainer: {
        marginTop: -24,
        backgroundColor: colors.background?.default || '#F3F4F6',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    // Health Card
    healthCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: 32,
    },
    healthRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    chartContainer: {
        position: 'relative',
        width: 80,
        height: 80,
        marginRight: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chartTextContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    chartScore: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text?.primary || '#111827',
    },
    healthInfo: {
        flex: 1,
    },
    healthTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text?.primary || '#111827',
        marginBottom: 4,
    },
    healthSubtitle: {
        fontSize: 13,
        color: colors.text?.secondary || '#6B7280',
        marginBottom: 12,
    },
    detailButton: {
        backgroundColor: colors.info?.light || '#EFF6FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    detailButtonText: {
        color: colors.info?.main || '#2563EB',
        fontSize: 12,
        fontWeight: '600',
    },

    // Specs Section
    specsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    specsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -8,
        marginTop: 12,
    },
    specItem: {
        width: '50%',
        paddingHorizontal: 8,
        marginBottom: 16,
    },
    specLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    specValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },

    // Timeline
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text?.primary || '#111827',
        marginLeft: 10,
    },
    timelineContainer: {
        paddingLeft: 0,
    },
    emptyHistory: {
        alignItems: 'center',
        paddingVertical: 20
    },
    emptyHistoryText: {
        color: '#9CA3AF',
        fontStyle: 'italic'
    },

    // Sticky Bottom Bar
    stickyBottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 10,
    },
    priceContainer: {
        justifyContent: 'center',
    },
    makeOfferButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    makeOfferText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },

    // Modals
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        zIndex: 100,
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        minHeight: '40%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border?.light || '#E5E7EB',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text?.primary || '#111827',
    },
    closeButton: {
        padding: 4,
    },
    modalContent: {
        padding: 20,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        padding: 12,
        backgroundColor: colors.background?.default || '#F9FAFB',
        borderRadius: 12,
    },
    detailIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    detailContent: {
        flex: 1,
    },
    detailName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text?.primary || '#111827',
    },
    detailStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    detailStatusText: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 2
    },
    detailRemaining: {
        fontSize: 11,
        color: '#9CA3AF',
        marginLeft: 8
    },
    statusBadge: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase'
    },
    detailScore: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text?.primary || '#111827',
    },
    emptyDetails: {
        padding: 20,
        alignItems: 'center',
    },
    emptyDetailsText: {
        color: colors.text?.secondary || '#6B7280',
    },
});

export default MarketplaceVehicleDetailScreen;
