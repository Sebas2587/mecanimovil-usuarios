import React, { useState, Fragment, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, RefreshControl, Modal, Platform, Dimensions, useWindowDimensions, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ShieldCheck, ShieldAlert } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as vehicleService from '../../services/vehicle';
import VehicleHealthService from '../../services/vehicleHealthService';
import { ROUTES } from '../../utils/constants';
import {
    loadRtRenewalDueISO,
    getRevisionTecnicaUiState,
    getRevisionTecnicaToneStyles,
} from '../../utils/revisionTecnica';
import { useAuth } from '../../context/AuthContext';

// Updates for Marketplace Negotiation
import OfferCreationModal from '../../components/marketplace/OfferCreationModal';
import ChecklistViewerModal from '../../components/modals/ChecklistViewerModal'; // Import Checklist Modal
import { VehicleServiceHistoryRow } from '../../components/vehicles/VehicleHistoryCard';
import HeroImageGradientScrim from '../../components/vehicles/HeroImageGradientScrim';
import MarketplaceDownloadBanner from '../../components/marketplace/MarketplaceDownloadBanner';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { getHealthColorToken, resolveVehicleHealthPct } from '../../utils/healthFormat';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { BORDERS } from '../../design-system/tokens/borders';
import { SPACING } from '../../design-system/tokens/spacing';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const HEALTH_MODAL_SCROLL_MAX_H = SCREEN_H * 0.68;
const HEADER_H = 320;

const MarketplaceVehicleDetailScreen = ({ route }) => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { height: windowHeight } = useWindowDimensions();

    // Get basic vehicle data from params - Support both full object and ID only
    const { vehicle, vehicleId } = route?.params || {};

    // Resolver ID numérico (linking web puede mandar string)
    const rawVehicleId = vehicle?.id ?? vehicleId ?? route?.params?.vehicleId;
    const effectiveVehicleId = (() => {
        if (rawVehicleId === undefined || rawVehicleId === null || rawVehicleId === '') return undefined;
        const n = typeof rawVehicleId === 'number' ? rawVehicleId : parseInt(String(rawVehicleId), 10);
        return Number.isNaN(n) || n <= 0 ? undefined : n;
    })();

    const [fullVehicleData, setFullVehicleData] = useState(vehicle || {});
    const [healthData, setHealthData] = useState(null); // State for real health data
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState(null);

    // Modal state for making offer
    const [offerModalVisible, setOfferModalVisible] = useState(false);

    // Checklist Modal State
    const [checklistModalVisible, setChecklistModalVisible] = useState(false);
    const [selectedChecklistId, setSelectedChecklistId] = useState(null);
    const [selectedServiceName, setSelectedServiceName] = useState('');
    const [checklistProveedorPreview, setChecklistProveedorPreview] = useState(null);
    const [rtRenewalDueISO, setRtRenewalDueISO] = useState(null);

    // ── Carousel state ───────────────────────────────────────────────
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [lightboxVisible, setLightboxVisible] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const carouselRef = useRef(null);
    const lightboxRef = useRef(null);

    const styles = getStyles(insets);
    const skipNextFocusFetchRef = React.useRef(false);

    const fetchVehicleDetails = React.useCallback(async (isFocusRefresh = false) => {
        if (!effectiveVehicleId) return;

        if (!isFocusRefresh) setLoading(true);

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
            setLoadError(null);

            // Salud pública en detalle (embed); si hay sesión y el vehículo es del cliente,
            // usamos getVehicleHealthWithPatches para que el % coincida exactamente con
            // VehicleHealthScreen y UserPanelScreen (misma lógica de parches optimistas).
            let mergedHealth = detailData.health_data || detailData.health || {};
            if (user?.id) {
                try {
                    const h = await VehicleHealthService.getVehicleHealthWithPatches(effectiveVehicleId, true);
                    if (h && typeof h === 'object' && !h.error) {
                        mergedHealth = { ...mergedHealth, ...h };
                    }
                } catch {
                    // Visitante, no propietario o endpoint no disponible: solo datos públicos.
                }
            }
            setHealthData(mergedHealth);

        } catch (error) {
            console.error("Error fetching vehicle details:", error);
            setLoadError('No se pudo cargar esta publicación. Revisa tu conexión o el enlace.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [effectiveVehicleId, user?.id]);

    // Carga inicial + cuando cambia el id (web / deep link)
    React.useEffect(() => {
        if (!effectiveVehicleId) {
            setLoading(false);
            setLoadError('Enlace inválido o sin vehículo.');
            return;
        }
        skipNextFocusFetchRef.current = true;
        fetchVehicleDetails(false);
    }, [effectiveVehicleId, fetchVehicleDetails]);

    // Refresco al volver a la pantalla (evita doble fetch en el primer focus)
    useFocusEffect(
        React.useCallback(() => {
            if (!effectiveVehicleId) return;
            if (skipNextFocusFetchRef.current) {
                skipNextFocusFetchRef.current = false;
                return;
            }
            fetchVehicleDetails(true);
        }, [effectiveVehicleId, fetchVehicleDetails])
    );

    useFocusEffect(
        React.useCallback(() => {
            const sid =
                fullVehicleData.user_id || fullVehicleData.seller?.id || fullVehicleData.cliente_id;
            const owner = user?.id && sid && String(user.id) === String(sid);
            if (!owner || !effectiveVehicleId) {
                setRtRenewalDueISO(null);
                return;
            }
            loadRtRenewalDueISO(effectiveVehicleId).then(setRtRenewalDueISO);
        }, [
            effectiveVehicleId,
            user?.id,
            fullVehicleData.user_id,
            fullVehicleData.seller?.id,
            fullVehicleData.cliente_id,
        ])
    );

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchVehicleDetails(false);
    }, [fetchVehicleDetails]);

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

    // Render Health Chart (Simple Circle) — mismo criterio de color que MarketplaceScreen / healthFormat
    const renderHealthChart = (score) => {
        const radius = 30;
        const circumference = 2 * Math.PI * radius;
        const validScore = Math.min(100, Math.max(0, Number(score)));
        const pct = Number.isFinite(validScore) ? validScore : 0;
        const strokeDashoffset = circumference - (pct / 100) * circumference;
        const wheelColor = getHealthColorToken(COLORS, pct);

        return (
            <View style={styles.chartContainer}>
                <Svg height="80" width="80" viewBox="0 0 80 80">
                    <Circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke={COLORS.border.light}
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
                    <Text style={[styles.chartScore, { color: wheelColor }]}>{Math.round(pct)}%</Text>
                </View>
            </View>
        );
    };

    const [healthModalVisible, setHealthModalVisible] = useState(false);

    // Derived Data
    // Use real health data if available, fallback to vehicle data, default to 100
    // Be robust with 0 checks. If healthData exists but is 0, it might be real 0? 
    // Or if undefined, fallback.
    const healthScore = resolveVehicleHealthPct(fullVehicleData, healthData);

    // Robust history check - check multiple potential keys
    const history = fullVehicleData.historial || fullVehicleData.history || fullVehicleData.services || [];

    // Components/Details
    const healthDetails = healthData?.componentes || healthData?.components || fullVehicleData.health_details || [];
    const integridadDatos = healthData?.integridad_datos ?? null;
    const pctVerificado = integridadDatos?.porcentaje_verificado ?? null;
    const integridadSubtitle = pctVerificado == null
        ? 'Basado en historial del vehículo'
        : pctVerificado >= 70
            ? `${Math.round(pctVerificado)}% verificado por taller`
            : pctVerificado >= 40
                ? `${Math.round(pctVerificado)}% verificado · parte estimado`
                : 'Historial principalmente estimado o declarado';

    const imageUrl = fullVehicleData.foto_url || fullVehicleData.image; // Fallback to list param image

    // Build carousel images: prefer fotos_marketplace, fall back to single foto_url
    const carouselImages = useMemo(() => {
        const fotos = Array.isArray(fullVehicleData.fotos) ? fullVehicleData.fotos : [];
        if (fotos.length > 0) return fotos.map(f => f.foto_url).filter(Boolean);
        if (imageUrl) return [imageUrl];
        return [];
    }, [fullVehicleData.fotos, imageUrl]);
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
    const isAnonymousViewer = !user;
    /** Solo visitantes sin cuenta: banner App Store / Google Play (no a usuarios logueados en web ni en app). */
    const showPublicInstallCtas = isAnonymousViewer;
    /** Con sesión: flecha atrás en web y en nativo. Visitante anónimo: sin atrás (ficha pública). */
    const showBackButton = !isAnonymousViewer;

    const openLightbox = useCallback((index) => {
        setLightboxIndex(index);
        setLightboxVisible(true);
    }, []);

    const handleCarouselScroll = useCallback((e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
        setCarouselIndex(idx);
    }, []);

    const handleHeaderBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else if (isAnonymousViewer) {
            navigation.navigate(ROUTES.LOGIN);
        } else {
            navigation.navigate('TabNavigator', { screen: ROUTES.MARKETPLACE });
        }
    };

    const renderHealthDetailItem = (item) => {
        const score = item.salud_porcentaje || item.score || 0;
        const color = getHealthColorToken(COLORS, score);
        const name = item.nombre || item.name || 'Componente';
        const lastServiceKm = item.km_ultimo_servicio ? `${item.km_ultimo_servicio.toLocaleString()} km` : '0 km';
        const remainingKm = item.km_estimados_restantes ? `${item.km_estimados_restantes.toLocaleString()} km restantes` : '';
        const statusText = item.nivel_alerta_display || item.nivel_alerta || (score >= 70 ? 'Óptimo' : (score >= 40 ? 'Atención' : 'Crítico'));

        // Confianza del historial de este componente
        const confianza = item.confianza_historial
            || (item.historial_fuente === 'CHECKLIST' || item.historial_fuente === 'REGISTRO_INICIAL' ? 'alta'
                : item.historial_fuente === 'USUARIO_DECLARADO' ? 'media'
                : item.historial_conocido === false ? 'baja'
                : 'alta');

        const trustColor = confianza === 'alta' ? COLORS.success[600]
            : confianza === 'media' ? COLORS.warning[600]
            : COLORS.neutral.gray[400];
        const trustBg = confianza === 'alta' ? COLORS.success[50]
            : confianza === 'media' ? COLORS.warning[50]
            : COLORS.neutral.gray[100];
        const trustLabel = confianza === 'alta'
            ? (item.historial_fuente_display || 'Verificado taller')
            : confianza === 'media'
            ? (item.historial_fuente_display || 'Declarado por vendedor')
            : 'Estimado (sin historial)';

        return (
            <View style={styles.detailItem}>
                <View style={[styles.detailIcon, { backgroundColor: color + '20' }]}>
                    <Ionicons name={item.icono || "construct"} size={20} color={color} />
                </View>
                <View style={styles.detailContent}>
                    <View style={styles.detailNameRow}>
                        <Text style={styles.detailName}>{name}</Text>
                        <View style={[styles.trustBadge, { backgroundColor: trustBg, borderColor: trustColor + '40' }]}>
                            {confianza === 'alta'
                                ? <ShieldCheck size={10} color={trustColor} />
                                : <ShieldAlert size={10} color={trustColor} />
                            }
                            <Text style={[styles.trustBadgeText, { color: trustColor }]}>{trustLabel}</Text>
                        </View>
                    </View>
                    <Text style={styles.detailStatusText}>Último: {lastServiceKm}</Text>

                    <View style={styles.detailProgressTrack}>
                        <View style={[
                            styles.detailProgressFill,
                            {
                                width: `${Math.min(100, Math.max(0, score))}%`,
                                backgroundColor: color,
                                opacity: confianza === 'baja' ? 0.55 : 1,
                            }
                        ]} />
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
    const renderRevisionTecnicaSpec = () => {
        const mes = fullVehicleData.mes_revision_tecnica;
        if (!mes) {
            return (
                <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Rev. Técnica</Text>
                    <Text style={styles.specValue}>N/A</Text>
                </View>
            );
        }
        const ui = getRevisionTecnicaUiState(mes, isOwner ? rtRenewalDueISO : null, {
            publicViewer: !isOwner,
        });
        if (!ui) {
            return (
                <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Rev. Técnica</Text>
                    <Text style={styles.specValue}>{mes}</Text>
                </View>
            );
        }
        const t = getRevisionTecnicaToneStyles(ui.tone);
        return (
            <View
                style={[
                    styles.specItem,
                    styles.specRtRow,
                    { borderLeftColor: t.accent, backgroundColor: t.bg },
                ]}
            >
                <Text style={styles.specLabel}>Rev. Técnica</Text>
                <Text style={[styles.specValue, { color: t.accent }]}>{mes}</Text>
                <Text style={[styles.specRtHint, { color: t.subtext }]} numberOfLines={4}>
                    {ui.hint}
                </Text>
            </View>
        );
    };

    const handleViewChecklist = useCallback((item, proveedorPreview) => {
        const checklistId = item.id ||
            item.oferta_seleccionada_detail?.solicitud_servicio_id ||
            item.solicitud_servicio_id ||
            item.orden_id ||
            item.checklist_id;

        if (checklistId) {
            const serviceName = item.servicio_nombre || item.service || 'Servicio';
            setSelectedChecklistId(checklistId);
            setSelectedServiceName(serviceName);
            setChecklistProveedorPreview(proveedorPreview || null);
            setChecklistModalVisible(true);
        } else {
            Alert.alert('Aviso', 'No hay checklist asociado a este servicio o no se encontró el ID válido.');
        }
    }, []);

    const closeChecklistModal = useCallback(() => {
        setChecklistModalVisible(false);
        setChecklistProveedorPreview(null);
    }, []);

    const webRootStyle = Platform.OS === 'web'
        ? { height: windowHeight, maxHeight: windowHeight, overflow: 'hidden' }
        : null;
    const webScrollStyle = Platform.OS === 'web' ? { flex: 1, minHeight: 0 } : null;

    return (
        <View style={[styles.container, webRootStyle]}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <ScrollView
                style={[styles.scrollView, webScrollStyle]}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary[500]} />
                }
            >
                {!loading && loadError ? (
                    <View style={styles.loadErrorBox}>
                        <Ionicons name="cloud-offline-outline" size={40} color={COLORS.text.tertiary} />
                        <Text style={styles.loadErrorText}>{loadError}</Text>
                    </View>
                ) : null}
                {/* 1. Immersive Header — Carousel */}
                <View style={styles.headerContainer}>
                    {/* Carousel strip */}
                    {carouselImages.length > 0 ? (
                        <FlatList
                            ref={carouselRef}
                            data={carouselImages}
                            keyExtractor={(uri, i) => `${uri}-${i}`}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            scrollEventThrottle={16}
                            onScroll={handleCarouselScroll}
                            initialScrollIndex={0}
                            getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
                            renderItem={({ item: uri, index }) => (
                                <TouchableOpacity
                                    activeOpacity={0.92}
                                    onPress={() => openLightbox(index)}
                                    style={{ width: SCREEN_W, height: HEADER_H }}
                                >
                                    <Image
                                        source={{ uri }}
                                        style={{ width: SCREEN_W, height: HEADER_H }}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                    />
                                </TouchableOpacity>
                            )}
                        />
                    ) : (
                        <View style={[styles.headerImage, { backgroundColor: COLORS.neutral.gray[200] }]} />
                    )}

                    {/* Dot indicators */}
                    {carouselImages.length > 1 && (
                        <View style={styles.carouselDots}>
                            {carouselImages.map((_, i) => (
                                <View
                                    key={i}
                                    style={[styles.carouselDot, i === carouselIndex && styles.carouselDotActive]}
                                />
                            ))}
                        </View>
                    )}

                    {/* Photo counter pill */}
                    {carouselImages.length > 1 && (
                        <View style={styles.photoPill}>
                            <Ionicons name="camera-outline" size={12} color={COLORS.base.white} />
                            <Text style={styles.photoPillText}>{carouselIndex + 1}/{carouselImages.length}</Text>
                        </View>
                    )}

                    <HeroImageGradientScrim intensity="strong" />

                    {/* Header: atrás con sesión (web y app); badge a la derecha; visitante sin atrás */}
                    <View style={styles.topBar}>
                        {showBackButton ? (
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleHeaderBack}
                                accessibilityRole="button"
                                accessibilityLabel="Volver"
                            >
                                <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
                            </TouchableOpacity>
                        ) : null}
                        <View style={styles.topBarSpacer} />
                        {fullVehicleData.is_certified_mecanimovil ? (
                            <View style={styles.certifiedBadge}>
                                <Ionicons name="shield-checkmark" size={14} color={COLORS.success[700]} />
                                <Text style={styles.certifiedText}>VERIFICADO MECANIMÓVIL</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Bottom Info */}
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>{brand} {model}</Text>
                        <Text style={styles.headerSubtitle}>{year}</Text>
                    </View>
                </View>

                {/* 2. Body Content (Negative Margin) */}
                <View style={styles.bodyContainer}>

                    {showPublicInstallCtas && (
                        <MarketplaceDownloadBanner style={{ marginTop: 4, marginHorizontal: 0 }} />
                    )}

                    {!loading && fullVehicleData.seller?.nombre ? (
                        <View style={styles.sellerCard}>
                            <View style={styles.sellerAvatarWrap}>
                                {fullVehicleData.seller.foto_url ? (
                                    <Image
                                        source={{ uri: fullVehicleData.seller.foto_url }}
                                        style={styles.sellerAvatar}
                                        contentFit="cover"
                                    />
                                ) : (
                                    <View style={[styles.sellerAvatar, styles.sellerAvatarPlaceholder]}>
                                        <Ionicons name="person" size={22} color={COLORS.primary[400]} />
                                    </View>
                                )}
                            </View>
                            <View style={styles.sellerTextCol}>
                                <Text style={styles.sellerLabel}>Publicado por</Text>
                                <Text style={styles.sellerName} numberOfLines={1}>
                                    {fullVehicleData.seller.nombre}
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    {/* Health Summary Card */}
                    <View style={styles.healthCard}>
                        <View style={styles.healthRow}>
                            {renderHealthChart(healthScore)}
                            <View style={styles.healthInfo}>
                                <Text style={styles.healthTitle}>Salud Mecánica</Text>
                                <View style={styles.healthSubtitleRow}>
                                    {pctVerificado != null && (
                                        pctVerificado >= 70
                                            ? <ShieldCheck size={13} color={COLORS.success[600]} />
                                            : <ShieldAlert size={13} color={pctVerificado >= 40 ? COLORS.warning[600] : COLORS.error[500]} />
                                    )}
                                    <Text style={[
                                        styles.healthSubtitle,
                                        pctVerificado != null && pctVerificado < 40 && { color: COLORS.error[500] },
                                        pctVerificado != null && pctVerificado >= 40 && pctVerificado < 70 && { color: COLORS.warning[700] },
                                        pctVerificado != null && pctVerificado >= 70 && { color: COLORS.success[700] },
                                    ]}>
                                        {integridadSubtitle}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.detailButton}
                                    onPress={() => setHealthModalVisible(true)}
                                >
                                    <Text style={styles.detailButtonText}>Ver Detalle</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Barra de composición de datos */}
                        {integridadDatos && integridadDatos.total > 0 && (
                            <View style={styles.integridadContainer}>
                                <View style={styles.integridadBarTrack}>
                                    <View style={[styles.integridadSegment, {
                                        flex: integridadDatos.verificados_taller,
                                        backgroundColor: COLORS.success[500],
                                    }]} />
                                    <View style={[styles.integridadSegment, {
                                        flex: integridadDatos.declarados_usuario,
                                        backgroundColor: COLORS.warning[400],
                                    }]} />
                                    <View style={[styles.integridadSegment, {
                                        flex: integridadDatos.estimados_engine,
                                        backgroundColor: COLORS.neutral.gray[300],
                                    }]} />
                                </View>
                                <View style={styles.integridadLegend}>
                                    {integridadDatos.verificados_taller > 0 && (
                                        <View style={styles.integridadLegendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: COLORS.success[500] }]} />
                                            <Text style={styles.integridadLegendText}>
                                                {integridadDatos.verificados_taller} verificado{integridadDatos.verificados_taller !== 1 ? 's' : ''}
                                            </Text>
                                        </View>
                                    )}
                                    {integridadDatos.declarados_usuario > 0 && (
                                        <View style={styles.integridadLegendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: COLORS.warning[400] }]} />
                                            <Text style={styles.integridadLegendText}>
                                                {integridadDatos.declarados_usuario} declarado{integridadDatos.declarados_usuario !== 1 ? 's' : ''} por vendedor
                                            </Text>
                                        </View>
                                    )}
                                    {integridadDatos.estimados_engine > 0 && (
                                        <View style={styles.integridadLegendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: COLORS.neutral.gray[400] }]} />
                                            <Text style={styles.integridadLegendText}>
                                                {integridadDatos.estimados_engine} estimado{integridadDatos.estimados_engine !== 1 ? 's' : ''}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                {!!integridadDatos.advertencia && (
                                    <Text style={styles.integridadAdvertencia}>{integridadDatos.advertencia}</Text>
                                )}
                            </View>
                        )}
                    </View>
                    {/* Descripción del vendedor */}
                    {!loading && fullVehicleData.descripcion_venta ? (
                        <View style={styles.descripcionCard}>
                            <Text style={styles.descripcionCardTitle}>Descripción del vendedor</Text>
                            <Text style={styles.descripcionCardText}>{fullVehicleData.descripcion_venta}</Text>
                        </View>
                    ) : null}

                    {/* Service Timeline - REDESIGNED */}
                    {/* Vehicle Specs Section */}
                    <View style={styles.sectionHeader}>
                        <Ionicons name="car-sport-outline" size={20} color={COLORS.primary[500]} />
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
                            {renderRevisionTecnicaSpec()}
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
                                <Feather name="clock" size={20} color={COLORS.primary[500]} />
                                <Text style={styles.sectionTitle}>Historial de Servicios</Text>
                            </View>

                            <View style={styles.timelineContainer}>
                                {history.map((item) => (
                                    <VehicleServiceHistoryRow
                                        key={item.id}
                                        item={item}
                                        onViewChecklist={user ? handleViewChecklist : undefined}
                                    />
                                ))}
                            </View>
                        </>
                    )}

                    {/* Padding for Bottom Sticky Bar */}
                    <View style={{ height: 120 }} />
                </View>
            </ScrollView>

            {/* 3. Sticky Bottom Bar */}
            <View style={[styles.stickyBottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
                <View style={styles.stickyBottomInner}>
                    <View style={styles.priceContainer}>
                        <Text style={styles.stickyPriceLabel}>Precio</Text>
                        <Text style={styles.stickyPriceValue}>{formattedPrice}</Text>
                    </View>

                    {(() => {
                        const isReserved = fullVehicleData?.is_reserved || vehicle?.is_reserved;
                        const isOwnerView = isOwner;

                        if (isAnonymousViewer && !isOwnerView) {
                            if (isReserved) {
                            return (
                                <TouchableOpacity
                                    style={[styles.makeOfferButton, styles.makeOfferButtonMuted]}
                                    disabled
                                >
                                    <Ionicons name="lock-closed" size={20} color={COLORS.text.inverse} style={{ marginRight: 8 }} />
                                    <Text style={[styles.makeOfferText, styles.makeOfferLabelOnMuted]}>Reservado</Text>
                                </TouchableOpacity>
                            );
                            }
                            return (
                                <TouchableOpacity
                                    style={styles.makeOfferButtonWrap}
                                    onPress={() => navigation.navigate(ROUTES.LOGIN)}
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.makeOfferGradient, styles.makeOfferPrimaryFill]}>
                                        <Ionicons name="log-in-outline" size={20} color={COLORS.text.onPrimary} style={{ marginRight: 8 }} />
                                        <Text style={[styles.makeOfferText, styles.makeOfferLabelOnPrimary]}>
                                            Iniciar sesión para ofertar
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        }

                        let buttonText = "Hacer Oferta";
                        let disabled = false;
                        let icon = "pricetag-outline";
                        let usePrimary = true;

                        if (isOwnerView) {
                            buttonText = "Tu Publicación";
                            disabled = true;
                            icon = "person";
                            usePrimary = false;
                        }

                        if (isReserved) {
                            buttonText = "Reservado";
                            disabled = true;
                            icon = "lock-closed";
                            usePrimary = false;

                            if (isOwnerView) {
                                buttonText = "Ofertado (Ver Negocios)";
                            }
                        }

                        const offerLabelStyle =
                            usePrimary && !disabled
                                ? styles.makeOfferLabelOnPrimary
                                : isOwnerView
                                    ? styles.makeOfferLabelOwner
                                    : styles.makeOfferLabelOnMuted;
                        const offerIconColor =
                            usePrimary && !disabled
                                ? COLORS.text.onPrimary
                                : isOwnerView
                                    ? COLORS.text.secondary
                                    : COLORS.text.inverse;

                        const inner = (
                            <>
                                <Ionicons name={icon} size={20} color={offerIconColor} style={{ marginRight: 8 }} />
                                <Text style={[styles.makeOfferText, offerLabelStyle]}>{buttonText}</Text>
                            </>
                        );

                        if (usePrimary && !disabled && !isOwnerView) {
                            return (
                                <TouchableOpacity
                                    style={styles.makeOfferButtonWrap}
                                    onPress={() => setOfferModalVisible(true)}
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.makeOfferGradient, styles.makeOfferPrimaryFill]}>
                                        {inner}
                                    </View>
                                </TouchableOpacity>
                            );
                        }

                        return (
                            <TouchableOpacity
                                style={[
                                    styles.makeOfferButton,
                                    isOwnerView ? styles.makeOfferButtonOwner : styles.makeOfferButtonMuted,
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
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Detalle de Salud</Text>
                            <TouchableOpacity onPress={() => setHealthModalVisible(false)} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={COLORS.text.primary} />
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
                            {/* Banner de transparencia de datos para el comprador */}
                            <View style={styles.trustLegendBanner}>
                                <View style={styles.trustLegendRow}>
                                    <ShieldCheck size={12} color={COLORS.success[600]} />
                                    <Text style={styles.trustLegendText}>
                                        <Text style={{ fontWeight: '700', color: COLORS.success[700] }}>Verificado</Text>
                                        {' '}— registrado por un taller en MecaniMóvil.
                                    </Text>
                                </View>
                                <View style={styles.trustLegendRow}>
                                    <ShieldAlert size={12} color={COLORS.warning[600]} />
                                    <Text style={styles.trustLegendText}>
                                        <Text style={{ fontWeight: '700', color: COLORS.warning[700] }}>Declarado</Text>
                                        {' '}— informado por el vendedor, sin respaldo de taller.
                                    </Text>
                                </View>
                                <View style={styles.trustLegendRow}>
                                    <ShieldAlert size={12} color={COLORS.neutral.gray[400]} />
                                    <Text style={styles.trustLegendText}>
                                        <Text style={{ fontWeight: '700', color: COLORS.neutral.gray[500] }}>Estimado</Text>
                                        {' '}— calculado por el sistema sin datos reales.
                                    </Text>
                                </View>
                            </View>

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

            {/* Checklist: solo usuarios con sesión (no en ficha pública anónima) */}
            {user ? (
                <ChecklistViewerModal
                    visible={checklistModalVisible}
                    onClose={closeChecklistModal}
                    ordenId={selectedChecklistId}
                    servicioNombre={selectedServiceName}
                    proveedorPreview={checklistProveedorPreview}
                />
            ) : null}

            {/* Lightbox — full screen expandable photo viewer */}
            <Modal
                visible={lightboxVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setLightboxVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    {/* Close button */}
                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            top: (insets.top || 0) + 12,
                            right: 16,
                            zIndex: 20,
                            backgroundColor: 'rgba(0,0,0,0.55)',
                            borderRadius: 20,
                            padding: 8,
                        }}
                        onPress={() => setLightboxVisible(false)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Ionicons name="close" size={24} color="#FFFFFF" />
                    </TouchableOpacity>

                    <FlatList
                        ref={lightboxRef}
                        data={carouselImages}
                        keyExtractor={(uri, i) => `lb-${uri}-${i}`}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        initialScrollIndex={lightboxIndex}
                        getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
                        onScrollToIndexFailed={() => {}}
                        renderItem={({ item: uri }) => (
                            <View style={{ width: SCREEN_W, height: SCREEN_H, justifyContent: 'center', alignItems: 'center' }}>
                                <Image
                                    source={{ uri }}
                                    style={{ width: SCREEN_W, height: SCREEN_H * 0.75 }}
                                    contentFit="contain"
                                    cachePolicy="memory-disk"
                                />
                            </View>
                        )}
                        onScroll={(e) => {
                            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                            setLightboxIndex(idx);
                        }}
                        scrollEventThrottle={16}
                    />

                    {/* Dot indicators */}
                    {carouselImages.length > 1 && (
                        <View style={{
                            position: 'absolute',
                            bottom: (insets.bottom || 0) + 24,
                            left: 0,
                            right: 0,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            gap: 6,
                        }}>
                            {carouselImages.map((_, i) => (
                                <View
                                    key={i}
                                    style={{
                                        width: i === lightboxIndex ? 10 : 6,
                                        height: 6,
                                        borderRadius: 3,
                                        backgroundColor: i === lightboxIndex ? '#FFFFFF' : 'rgba(255,255,255,0.38)',
                                    }}
                                />
                            ))}
                        </View>
                    )}

                    {/* Counter */}
                    <View style={{
                        position: 'absolute',
                        bottom: (insets.bottom || 0) + 24,
                        right: 16,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                    }}>
                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>
                            {lightboxIndex + 1} / {carouselImages.length}
                        </Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const getStyles = (insets) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.default,
    },
    scrollView: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        paddingBottom: 0,
        flexGrow: 1,
    },
    loadErrorBox: {
        paddingHorizontal: 24,
        paddingVertical: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadErrorText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    headerContainer: {
        height: HEADER_H,
        width: '100%',
        position: 'relative',
        backgroundColor: COLORS.neutral.gray[200],
        overflow: 'hidden',
    },
    headerImage: {
        width: '100%',
        height: '100%',
    },
    carouselDots: {
        position: 'absolute',
        bottom: 52,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
        zIndex: 3,
        pointerEvents: 'none',
    },
    carouselDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.45)',
    },
    carouselDotActive: {
        width: 10,
        backgroundColor: '#FFFFFF',
    },
    photoPill: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 3,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.45)',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    photoPillText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    topBar: {
        position: 'absolute',
        top: insets.top + 10,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        zIndex: 2,
    },
    topBarSpacer: {
        flex: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: withOpacity(COLORS.base.white, 0.94),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        ...SHADOWS.sm,
    },
    certifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.success.light,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.success[200],
    },
    certifiedText: {
        color: COLORS.success[700],
        fontWeight: '700',
        fontSize: 10,
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    headerInfo: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        zIndex: 2,
    },
    headerTitle: {
        color: COLORS.text.inverse,
        fontSize: 32,
        fontWeight: '800',
        textShadowColor: withOpacity(COLORS.base.inkBlack, 0.35),
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    headerSubtitle: {
        color: withOpacity(COLORS.base.white, 0.88),
        fontSize: 16,
        marginTop: 4,
    },
    bodyContainer: {
        marginTop: -20,
        backgroundColor: COLORS.background.default,
        borderTopLeftRadius: BORDERS.radius.xl,
        borderTopRightRadius: BORDERS.radius.xl,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    descripcionCard: {
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.lg,
        padding: 16,
        marginBottom: 16,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        ...SHADOWS.sm,
    },
    descripcionCardTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 8,
    },
    descripcionCardText: {
        fontSize: 14,
        color: COLORS.text.primary,
        lineHeight: 21,
    },
    sellerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.lg,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        ...SHADOWS.sm,
    },
    sellerAvatarWrap: {
        marginRight: 14,
    },
    sellerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
    },
    sellerAvatarPlaceholder: {
        backgroundColor: COLORS.neutral.gray[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    sellerTextCol: {
        flex: 1,
        minWidth: 0,
    },
    sellerLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 2,
    },
    sellerName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text.primary,
    },
    healthCard: {
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.lg,
        padding: 20,
        marginBottom: 20,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        ...SHADOWS.sm,
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
        color: COLORS.text.primary,
        marginBottom: 4,
    },
    healthSubtitle: {
        fontSize: 13,
        color: COLORS.text.secondary,
        flex: 1,
    },
    detailButton: {
        backgroundColor: COLORS.primary[50],
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: BORDERS.radius.md,
        alignSelf: 'flex-start',
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.primary[200],
    },
    detailButtonText: {
        color: COLORS.primary[700],
        fontSize: 12,
        fontWeight: '600',
    },
    specsCard: {
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.lg,
        padding: 20,
        marginBottom: 24,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        ...SHADOWS.sm,
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
        color: COLORS.text.tertiary,
        marginBottom: 4,
    },
    specValue: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text.primary,
    },
    specRtRow: {
        width: '100%',
        flexBasis: '100%',
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginBottom: 16,
        borderLeftWidth: 3,
        borderRadius: BORDERS.radius.md,
    },
    specRtHint: {
        fontSize: 11,
        lineHeight: 15,
        marginTop: 6,
        width: '100%',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        marginTop: SPACING.xs,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.text.primary,
        marginLeft: SPACING.sm,
        letterSpacing: TYPOGRAPHY.letterSpacing.tight,
    },
    timelineContainer: {
        paddingLeft: 0,
    },
    emptyHistory: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    emptyHistoryText: {
        color: COLORS.text.tertiary,
        fontStyle: 'italic',
    },
    stickyBottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 14,
        paddingHorizontal: 20,
        borderTopWidth: BORDERS.width.thin,
        borderTopColor: COLORS.border.light,
        backgroundColor: COLORS.background.paper,
        ...Platform.select({
            ios: {
                shadowColor: '#0A0B0D',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
            },
            android: { elevation: 8 },
            default: {},
        }),
    },
    stickyBottomInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 2,
    },
    stickyPriceLabel: {
        color: COLORS.text.tertiary,
        fontSize: 12,
        fontWeight: '500',
    },
    stickyPriceValue: {
        color: COLORS.text.primary,
        fontSize: 24,
        fontWeight: '800',
    },
    priceContainer: {
        justifyContent: 'center',
        flex: 1,
        marginRight: 12,
    },
    makeOfferButtonWrap: {
        borderRadius: BORDERS.radius.md,
        overflow: 'hidden',
        maxWidth: '58%',
    },
    makeOfferGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 22,
        paddingVertical: 14,
        borderRadius: BORDERS.radius.md,
    },
    makeOfferPrimaryFill: {
        backgroundColor: COLORS.primary[500],
    },
    makeOfferButtonMuted: {
        backgroundColor: COLORS.neutral.gray[600],
        borderColor: COLORS.neutral.gray[600],
    },
    makeOfferButtonOwner: {
        backgroundColor: COLORS.neutral.gray[100],
        borderColor: COLORS.border.light,
    },
    makeOfferButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 22,
        paddingVertical: 14,
        borderRadius: BORDERS.radius.md,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        maxWidth: '58%',
    },
    makeOfferText: {
        fontSize: 15,
        fontWeight: '700',
    },
    makeOfferLabelOnPrimary: {
        color: COLORS.text.onPrimary,
    },
    makeOfferLabelOnMuted: {
        color: COLORS.text.inverse,
    },
    makeOfferLabelOwner: {
        color: COLORS.text.secondary,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: COLORS.background.overlay,
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalSheet: {
        borderTopLeftRadius: BORDERS.radius.xl,
        borderTopRightRadius: BORDERS.radius.xl,
        maxHeight: '82%',
        minHeight: '42%',
        overflow: 'hidden',
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        backgroundColor: COLORS.background.paper,
        ...SHADOWS.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: BORDERS.width.thin,
        borderBottomColor: COLORS.border.light,
        zIndex: 2,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text.primary,
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
        backgroundColor: COLORS.neutral.gray[100],
        borderRadius: BORDERS.radius.md,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
    },
    detailProgressTrack: {
        height: 5,
        backgroundColor: COLORS.neutral.gray[200],
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
        color: COLORS.text.primary,
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
        color: COLORS.text.tertiary,
        marginBottom: 2,
    },
    detailRemaining: {
        fontSize: 11,
        color: COLORS.text.disabled,
        marginLeft: 8,
    },
    statusBadge: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
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
        color: COLORS.text.secondary,
    },
    // Integridad de datos en health card
    integridadContainer: {
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: BORDERS.width.thin,
        borderTopColor: COLORS.border.light,
    },
    integridadBarTrack: {
        flexDirection: 'row',
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: COLORS.neutral.gray[200],
        marginBottom: 8,
    },
    integridadSegment: {
        height: '100%',
    },
    integridadLegend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    integridadLegendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    legendDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    integridadLegendText: {
        fontSize: 11,
        color: COLORS.text.secondary,
    },
    integridadAdvertencia: {
        fontSize: 11,
        color: COLORS.warning[700],
        marginTop: 8,
        lineHeight: 16,
        fontStyle: 'italic',
    },
    // Health subtitle con ícono
    healthSubtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 12,
    },
    // Badge de confianza por componente en modal detalle
    detailNameRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 2,
        flexWrap: 'wrap',
    },
    trustBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 1,
        flexShrink: 0,
    },
    trustBadgeText: {
        fontSize: 9,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    // Banner de leyenda en modal
    trustLegendBanner: {
        backgroundColor: COLORS.neutral.gray[100],
        borderRadius: BORDERS.radius.md,
        padding: 12,
        marginBottom: 16,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        gap: 6,
    },
    trustLegendRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
    },
    trustLegendText: {
        fontSize: 12,
        color: COLORS.text.secondary,
        flex: 1,
        lineHeight: 17,
    },
});

export default MarketplaceVehicleDetailScreen;
