import React, { useState, Fragment } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, RefreshControl, Modal, Platform, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as vehicleService from '../../services/vehicle';
import { ROUTES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

// Updates for Marketplace Negotiation
import OfferCreationModal from '../../components/marketplace/OfferCreationModal';
import ChecklistViewerModal from '../../components/modals/ChecklistViewerModal'; // Import Checklist Modal
import { VehicleServiceHistoryRow } from '../../components/vehicles/VehicleHistoryCard';

const GLASS_BG = Platform.select({
    ios: 'rgba(255,255,255,0.06)',
    android: 'rgba(255,255,255,0.10)',
    default: 'rgba(255,255,255,0.08)',
});
const BLUR_I = Platform.OS === 'ios' ? 40 : 0;
const SCREEN_H = Dimensions.get('window').height;
const HEALTH_MODAL_SCROLL_MAX_H = SCREEN_H * 0.68;

const MarketplaceVehicleDetailScreen = ({ route }) => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    // Get basic vehicle data from params - Support both full object and ID only
    const { vehicle, vehicleId } = route?.params || {};

    // Resolve effective ID
    const effectiveVehicleId = vehicle?.id || vehicleId;

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

    const styles = getStyles(insets);

    // Reload when screen gains focus - critical for real-time updates
    useFocusEffect(
        React.useCallback(() => {
            if (effectiveVehicleId) fetchVehicleDetails(true);
        }, [effectiveVehicleId])
    );

    const fetchVehicleDetails = async (isFocusRefresh = false) => {
        // Only show full loading spinner if we have NO data at all
        if (!fullVehicleData.id && !isFocusRefresh) setLoading(true);

        try {
            // Parallel fetching for better performance
            const [detailData] = await Promise.all([
                vehicleService.getMarketplaceVehicleDetail(effectiveVehicleId),
            ]);

            const rawHistory = detailData.history || detailData.historial || detailData.services || [];

            let enrichedHistory = [];

            try {
                const sellerId = detailData.user_id || detailData.seller?.id || detailData.cliente_id;
                const isViewerOwner = user?.id && sellerId && (String(user.id) === String(sellerId));

                if (isViewerOwner) {
                    const fullHistory = await vehicleService.getVehicleServiceHistory(effectiveVehicleId);
                    if (Array.isArray(fullHistory) && fullHistory.length > 0) {
                        enrichedHistory = fullHistory;
                    } else {
                        enrichedHistory = rawHistory;
                    }
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
    // Handle Offer Submission
    const handleMakeOffer = async (amount) => {
        try {
            // Construct payload
            const offerData = {
                vehiculo_id: fullVehicleData.id,
                monto: amount,
                mensaje: `Hola, ofrezco ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)} por tu ${brand} ${model}`
            };

            await vehicleService.createOffer(offerData);

            Alert.alert(
                "Oferta Enviada",
                "Tu oferta ha sido enviada al vendedor. Podrás ver el estado y responder en la pestaña 'Negocios' del Marketplace.",
                [{ text: "OK", onPress: () => setOfferModalVisible(false) }]
            );

        } catch (error) {
            console.error("Error creating offer:", error);
            Alert.alert("Error", "No se pudo enviar la oferta. Verifica tu conexión o intenta más tarde.");
        }
    };

    // Render Health Chart (Simple Circle)
    const renderHealthChart = (score) => {
        const radius = 30;
        const circumference = 2 * Math.PI * radius;
        const validScore = isNaN(score) ? 100 : score;
        const strokeDashoffset = circumference - (validScore / 100) * circumference;

        // Dynamic Color Logic - Consistent with other screens
        let wheelColor = '#10B981'; // Green - Excellent (80-100%)
        if (validScore < 40) wheelColor = '#EF4444'; // Red - Poor (0-39%)
        else if (validScore < 60) wheelColor = '#F97316'; // Orange - Fair (40-59%)
        else if (validScore < 80) wheelColor = '#F59E0B'; // Yellow/Amber - Good (60-79%)

        return (
            <View style={styles.chartContainer}>
                <Svg height="80" width="80" viewBox="0 0 80 80">
                    <Circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth="6"
                        fill="transparent"
                    />
                    <Circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke={wheelColor}
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
                    <Text style={[styles.chartScore, { color: wheelColor }]}>{Math.round(validScore)}%</Text>
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
        // Metric Logic matching VehicleHealthScreen - Consistent colors
        const score = item.salud_porcentaje || item.score || 0;

        let color = '#EF4444'; // Red - default poor
        if (score >= 80) color = '#10B981'; // Green - Excellent
        else if (score >= 60) color = '#F59E0B'; // Yellow - Good  
        else if (score >= 40) color = '#F97316'; // Orange - Fair

        const name = item.nombre || item.name || 'Componente';
        const lastServiceKm = item.km_ultimo_servicio ? `${item.km_ultimo_servicio.toLocaleString()} km` : '0 km';
        const remainingKm = item.km_estimados_restantes ? `${item.km_estimados_restantes.toLocaleString()} km restantes` : '';
        const statusText = item.nivel_alerta_display || item.nivel_alerta || (score >= 70 ? 'Óptimo' : (score >= 40 ? 'Atención' : 'Crítico'));

        return (
            <View style={styles.detailItem}>
                <View style={[styles.detailIcon, { backgroundColor: color + '20' }]}>
                    <Ionicons name={item.icono || "construct"} size={20} color={color} />
                </View>
                <View style={styles.detailContent}>
                    <Text style={styles.detailName}>{name}</Text>
                    <Text style={styles.detailStatusText}>Último: {lastServiceKm}</Text>

                    <View style={styles.detailProgressTrack}>
                        <View style={[styles.detailProgressFill, { width: `${Math.min(100, Math.max(0, score))}%`, backgroundColor: color }]} />
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
        const checklistId = item.id ||
            item.oferta_seleccionada_detail?.solicitud_servicio_id ||
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
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <LinearGradient colors={['#030712', '#0a0f1a', '#030712']} style={StyleSheet.absoluteFill} />
                <View style={styles.blobEmerald} />
                <View style={styles.blobIndigo} />
                <View style={styles.blobCyan} />
            </View>

            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6EE7B7" />}
            >
                {/* 1. Immersive Header */}
                <View style={styles.headerContainer}>
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.headerImage} contentFit="cover" />
                    ) : (
                        <View style={[styles.headerImage, { backgroundColor: '#1F2937' }]} />
                    )}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.1)', 'transparent', 'rgba(3, 7, 18, 0.92)']}
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
                        <Ionicons name="car-sport-outline" size={20} color="#93C5FD" />
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

                    {history.length > 0 && (
                        <>
                            <View style={styles.sectionHeader}>
                                <Feather name="clock" size={20} color="#93C5FD" />
                                <Text style={styles.sectionTitle}>Historial de Servicios</Text>
                            </View>

                            <View style={styles.timelineContainer}>
                                {history.map((item) => (
                                    <VehicleServiceHistoryRow
                                        key={item.id}
                                        item={item}
                                        onViewChecklist={handleViewChecklist}
                                        variant="dark"
                                    />
                                ))}
                            </View>
                        </>
                    )}

                    {/* Padding for Bottom Sticky Bar */}
                    <View style={{ height: 120 }} />
                </View>
            </ScrollView>

            {/* 3. Sticky Bottom Bar (Replaces old Contact Button) */}
            <View style={[styles.stickyBottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
                {Platform.OS === 'ios' && <BlurView intensity={BLUR_I} tint="dark" style={StyleSheet.absoluteFill} />}
                <View style={styles.stickyBottomInner}>
                    <View style={styles.priceContainer}>
                        <Text style={styles.stickyPriceLabel}>Precio</Text>
                        <Text style={styles.stickyPriceValue}>{formattedPrice}</Text>
                    </View>

                    {(() => {
                        const isReserved = fullVehicleData?.is_reserved || vehicle?.is_reserved;
                        const isOwnerView = isOwner;

                        let buttonText = "Hacer Oferta";
                        let disabled = false;
                        let icon = "pricetag-outline";
                        let useGradient = true;

                        if (isOwnerView) {
                            buttonText = "Tu Publicación";
                            disabled = true;
                            icon = "person";
                            useGradient = false;
                        }

                        if (isReserved) {
                            buttonText = "Reservado";
                            disabled = true;
                            icon = "lock-closed";
                            useGradient = false;

                            if (isOwnerView) {
                                buttonText = "Ofertado (Ver Negocios)";
                            }
                        }

                        const inner = (
                            <>
                                <Ionicons name={icon} size={20} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.makeOfferText}>{buttonText}</Text>
                            </>
                        );

                        if (useGradient && !disabled && !isOwnerView) {
                            return (
                                <TouchableOpacity
                                    style={styles.makeOfferButtonWrap}
                                    onPress={() => setOfferModalVisible(true)}
                                    activeOpacity={0.85}
                                >
                                    <LinearGradient
                                        colors={['#007EA7', '#00A8E8']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.makeOfferGradient}
                                    >
                                        {inner}
                                    </LinearGradient>
                                </TouchableOpacity>
                            );
                        }

                        return (
                            <TouchableOpacity
                                style={[
                                    styles.makeOfferButton,
                                    { backgroundColor: isOwnerView ? 'rgba(255,255,255,0.12)' : 'rgba(75,85,99,0.9)' }
                                ]}
                                onPress={() => {
                                    if (!disabled && !isOwnerView) setOfferModalVisible(true);
                                }}
                                activeOpacity={disabled ? 1 : 0.8}
                                disabled={disabled}
                            >
                                {inner}
                            </TouchableOpacity>
                        );
                    })()}
                </View>
            </View>

            {/* 4. Health Details Modal */}
            <Modal
                visible={healthModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setHealthModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setHealthModalVisible(false)}
                    />
                    <View style={styles.modalSheet}>
                        <View style={styles.modalSheetBase} pointerEvents="none" />
                        {Platform.OS === 'ios' && (
                            <BlurView
                                intensity={BLUR_I}
                                tint="dark"
                                style={StyleSheet.absoluteFill}
                                pointerEvents="none"
                            />
                        )}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Detalle de Salud</Text>
                            <TouchableOpacity onPress={() => setHealthModalVisible(false)} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#F9FAFB" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            style={styles.modalScroll}
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled
                            bounces
                        >
                            {healthDetails.length > 0 ? (
                                healthDetails.map((item, index) => (
                                    <Fragment key={`health-${item.id ?? item.nombre ?? index}`}>
                                        {renderHealthDetailItem(item)}
                                    </Fragment>
                                ))
                            ) : (
                                <View style={styles.emptyDetails}>
                                    <Text style={styles.emptyDetailsText}>No hay información detallada disponible.</Text>
                                </View>
                            )}
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

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

const getStyles = (insets) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#030712',
    },
    blobEmerald: {
        position: 'absolute',
        top: 80,
        left: -40,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(16,185,129,0.08)',
    },
    blobIndigo: {
        position: 'absolute',
        top: 400,
        right: -60,
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: 'rgba(99,102,241,0.07)',
    },
    blobCyan: {
        position: 'absolute',
        bottom: 200,
        left: 30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(6,182,212,0.06)',
    },
    scrollView: {
        flex: 1,
        backgroundColor: 'transparent',
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
        backgroundColor: 'transparent',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    // Health Card
    healthCard: {
        backgroundColor: GLASS_BG,
        borderRadius: 18,
        padding: 20,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
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
    },
    healthInfo: {
        flex: 1,
    },
    healthTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F9FAFB',
        marginBottom: 4,
    },
    healthSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 12,
    },
    detailButton: {
        backgroundColor: 'rgba(147,197,253,0.12)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(147,197,253,0.35)',
    },
    detailButtonText: {
        color: '#93C5FD',
        fontSize: 12,
        fontWeight: '600',
    },

    // Specs Section
    specsCard: {
        backgroundColor: GLASS_BG,
        borderRadius: 18,
        padding: 20,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
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
        color: 'rgba(255,255,255,0.45)',
        marginBottom: 4,
    },
    specValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F9FAFB',
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
        color: '#F9FAFB',
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
        paddingTop: 16,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.12)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: { backgroundColor: 'transparent' },
            default: { backgroundColor: 'rgba(3,7,18,0.96)' },
        }),
    },
    stickyBottomInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 2,
    },
    stickyPriceLabel: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 12,
        fontWeight: '500',
    },
    stickyPriceValue: {
        color: '#F9FAFB',
        fontSize: 24,
        fontWeight: '800',
    },
    priceContainer: {
        justifyContent: 'center',
        flex: 1,
        marginRight: 12,
    },
    makeOfferButtonWrap: {
        borderRadius: 14,
        overflow: 'hidden',
        maxWidth: '58%',
    },
    makeOfferGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 22,
        paddingVertical: 14,
        borderRadius: 14,
    },
    makeOfferButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        maxWidth: '58%',
    },
    makeOfferText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },

    // Modals
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '82%',
        minHeight: '42%',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: '#0a0f1a',
    },
    modalSheetBase: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10,15,26,0.94)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        zIndex: 2,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F9FAFB',
    },
    closeButton: {
        padding: 4,
    },
    modalScroll: {
        maxHeight: HEALTH_MODAL_SCROLL_MAX_H,
        zIndex: 2,
    },
    modalScrollContent: {
        padding: 20,
        paddingBottom: 28,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        padding: 14,
        backgroundColor: GLASS_BG,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    detailProgressTrack: {
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        marginTop: 8,
        marginBottom: 4,
        overflow: 'hidden',
    },
    detailProgressFill: {
        height: '100%',
        borderRadius: 3,
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
        color: '#F9FAFB',
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
        color: 'rgba(255,255,255,0.45)',
        marginBottom: 2
    },
    detailRemaining: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
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
    },
    emptyDetails: {
        padding: 20,
        alignItems: 'center',
    },
    emptyDetailsText: {
        color: 'rgba(255,255,255,0.45)',
    },
});

export default MarketplaceVehicleDetailScreen;
