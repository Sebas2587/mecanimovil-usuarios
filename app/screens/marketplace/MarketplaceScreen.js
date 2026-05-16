import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, StatusBar, ActivityIndicator, RefreshControl, Alert, Platform, ScrollView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const CARD_IMG_H = 180;
const SCREEN_W = Dimensions.get('window').width;
const CARD_IMG_W = SCREEN_W - 32; // listContent padding * 2
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQueries } from '@tanstack/react-query';
import { ROUTES } from '../../utils/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as vehicleService from '../../services/vehicle';
import OfferNegotiationCard from '../../components/marketplace/OfferNegotiationCard';
import MarketplaceFilterModal from '../../components/marketplace/MarketplaceFilterModal';
import { useRequests } from '../../hooks/useRequests';
import { tieneInspeccionPrecompraActivaParaVehiculo } from '../../utils/precompraInspection';
import { showMarketplaceAlert } from '../../utils/marketplaceAlerts';
import { resolveVehicleHealthPct, getHealthColorToken } from '../../utils/healthFormat';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import { useAuth } from '../../context/AuthContext';
import VehicleHealthService from '../../services/vehicleHealthService';

const SURFACE_SOFT = COLORS.neutral.gray[100];
const SURFACE_STRONG = COLORS.neutral.gray[200];

// Mock Data for Offers
const MOCK_OFFERS = [
    {
        id: '1',
        type: 'received', // Venta (Yo vendo)
        status: 'pending',
        amount: 8500000,
        vehicle: {
            brand: 'Toyota',
            model: 'RAV4',
            year: 2019,
            image: 'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
        },
        counterpart: {
            name: 'Carlos Ruiz',
            avatar: null,
        }
    },
    {
        id: '2',
        type: 'sent', // Compra (Yo compro)
        status: 'accepted',
        amount: 12000000,
        vehicle: {
            brand: 'Jeep',
            model: 'Wrangler',
            year: 2020,
            image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
        },
        counterpart: {
            name: 'Ana P.',
            avatar: null,
        }
    },
    {
        id: '3',
        type: 'received',
        status: 'rejected',
        amount: 4500000,
        vehicle: {
            brand: 'Suzuki',
            model: 'Swift',
            year: 2018,
            image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
        },
        counterpart: {
            name: 'Pedro M.',
            avatar: null,
        }
    }
];

/**
 * Carrusel de fotos liviano para las cards del marketplace.
 * Usa ScrollView con paginación para rendimiento dentro de FlatList.
 */
const PhotoCarousel = React.memo(({ fotos, fallbackUri, isReserved }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef(null);

    const allImages = useMemo(() => {
        if (fotos && fotos.length > 0) return fotos.map(f => f.foto_url).filter(Boolean);
        if (fallbackUri) return [fallbackUri];
        return [];
    }, [fotos, fallbackUri]);

    const handleScroll = useCallback((e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_IMG_W);
        setActiveIndex(idx);
    }, []);

    if (allImages.length === 0) {
        return (
            <View style={[carouselStyles.image, carouselStyles.placeholder]}>
                <Ionicons name="car-outline" size={48} color="rgba(255,255,255,0.35)" />
            </View>
        );
    }

    return (
        <View style={{ width: '100%', height: CARD_IMG_H }}>
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={handleScroll}
                style={{ opacity: isReserved ? 0.6 : 1 }}
            >
                {allImages.map((uri, i) => (
                    <Image
                        key={`${uri}-${i}`}
                        source={{ uri }}
                        style={carouselStyles.image}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                ))}
            </ScrollView>
            {allImages.length > 1 && (
                <View style={carouselStyles.dotsRow}>
                    {allImages.map((_, i) => (
                        <View
                            key={i}
                            style={[carouselStyles.dot, i === activeIndex && carouselStyles.dotActive]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
});

const carouselStyles = StyleSheet.create({
    image: {
        width: CARD_IMG_W,
        height: CARD_IMG_H,
    },
    placeholder: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dotsRow: {
        position: 'absolute',
        bottom: 8,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.45)',
    },
    dotActive: {
        width: 8,
        backgroundColor: '#FFFFFF',
    },
});

const MarketplaceScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    const styles = getStyles();

    // State
    const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'deals'

    const [activeSegment, setActiveSegment] = useState('all'); // 'all' | 'sales' | 'purchases'
    const [searchQuery, setSearchQuery] = useState('');
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [offers, setOffers] = useState([]);

    const { data: todasSolicitudes = [], refetch: refetchSolicitudes } = useRequests();

    // Filter State
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [activeFilters, setActiveFilters] = useState({});

    const fetchOffers = async () => {
        try {
            const [sent, received] = await Promise.all([
                vehicleService.getSentOffers().catch(() => []),
                vehicleService.getReceivedOffers().catch(() => [])
            ]);

            const mapStatus = (estado) => {
                switch (estado) {
                    case 'pendiente': return 'pending';
                    case 'aceptada': return 'accepted';
                    case 'rechazada': return 'rejected';
                    case 'contraoferta': return 'active'; // Or pending
                    case 'completada': return 'completed';
                    case 'vendida': return 'completed';
                    default: return estado;
                }
            };

            const mapOffer = (o, type) => ({
                id: o.id.toString(),
                type: type, // 'sent' or 'received'
                status: mapStatus(o.estado),
                amount: o.monto,
                vehiculoId: o.vehiculo_id || o.vehiculo,
                vehicle: {
                    name: `${o.vehiculo_marca} ${o.vehiculo_modelo}`,
                    brand: o.vehiculo_marca,
                    model: o.vehiculo_modelo,
                    year: o.vehiculo_year,
                    image: o.vehiculo_imagen,
                    price: o.vehiculo_precio
                },
                counterpart: {
                    id: type === 'sent' ? o.vendedor_id : o.comprador,
                    name: type === 'sent'
                        ? `${o.vendedor_nombre || ''} ${o.vendedor_apellido || ''}`.trim() || 'Vendedor'
                        : `${o.comprador_nombre || ''} ${o.comprador_apellido || ''}`.trim() || 'Comprador',
                    avatar: type === 'sent' ? o.vendedor_foto : o.comprador_foto
                },
                conversationId: o.conversacion_id
            });

            const mappedSent = (sent || []).map(o => mapOffer(o, 'sent'));
            const mappedReceived = (received || []).map(o => mapOffer(o, 'received'));

            // Merge and deduplicate by ID
            // If an offer is in both lists (e.g. I bought it, so I was buyer and now I am owner),
            // prefer the one that makes sense for the context. 
            // - If status is 'completed' and I am buyer => It's a purchase history.
            // - If status is 'completed' and I was seller => It's a sales history.
            // distinctive logic: 
            // mappedSent -> type='sent' (Buying)
            // mappedReceived -> type='received' (Selling)
            // We prioritize 'sent' because if I am the buyer AND the new owner, 
            // the historical context of "I bought this" is more important than "I own this" for this specific card.

            const allOffers = [...mappedReceived, ...mappedSent];
            const uniqueOffers = Array.from(new Map(allOffers.map(item => [item.id, item])).values());

            // Sort by ID desc (or date if available)
            uniqueOffers.sort((a, b) => Number(b.id) - Number(a.id));

            setOffers(uniqueOffers);
        } catch (error) {
            console.error("Error fetching offers:", error);
        }
    };

    // Refresh offers when tab changes to 'deals' (Negocios)
    useEffect(() => {
        if (activeTab === 'deals') {
            fetchOffers();
            refetchSolicitudes();
        }
    }, [activeTab, refetchSolicitudes]);

    const fetchListings = async () => {
        try {
            const data = await vehicleService.getMarketplaceListings();
            setListings(data);
            await fetchOffers();
        } catch (error) {
            console.error("Error fetching marketplace listings:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchListings();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        refetchSolicitudes();
        fetchListings();
    }, [refetchSolicitudes]);

    const handleRespondOffer = async (offerId, status) => {
        try {
            await vehicleService.respondToOffer(offerId, status);
            Alert.alert(
                status === 'aceptada' ? "Oferta Aceptada" : "Oferta Rechazada",
                status === 'aceptada' ? "Ahora puedes chatear con la contraparte." : ""
            );
            fetchOffers(); // Refresh to get conversation ID
        } catch (error) {
            Alert.alert("Error", "No se pudo actualizar la oferta.");
            console.error(error);
        }
    };

    const formatPrice = (price) => {
        if (!price) return '$0';
        return '$' + price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    // --- Search & Filter Logic ---
    const getFilteredListings = () => {
        let result = listings;

        // 1. Search Query (Brand, Model, Year)
        if (searchQuery && searchQuery.trim().length > 0) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(item => {
                const brand = (item.marca_nombre || '').toLowerCase();
                const model = (item.modelo_nombre || '').toLowerCase();
                const year = (item.year || '').toString();

                return brand.includes(query) || model.includes(query) || year.includes(query);
            });
        }

        // 2. Advanced Filters (Modal)
        if (activeFilters) {
            const { priceMin, priceMax, yearMin, yearMax, kmMin, kmMax } = activeFilters;

            if (priceMin) result = result.filter(item => {
                const rawPrice = item.precio_venta || item.settings?.precio_venta || item.marketplace_data?.precio_venta || item.price || item.selling_price || item.precio_publicado || item.precio_sugerido_final || item.suggested_price || 0;
                // Ensure we handle formatted strings like '4.000.000'
                const priceValue = typeof rawPrice === 'string'
                    ? Number(rawPrice.replace(/\D/g, ''))
                    : Number(rawPrice);
                return priceValue >= Number(priceMin);
            });
            if (priceMax) result = result.filter(item => {
                const rawPrice = item.precio_venta || item.settings?.precio_venta || item.marketplace_data?.precio_venta || item.price || item.selling_price || item.precio_publicado || item.precio_sugerido_final || item.suggested_price || 0;
                const priceValue = typeof rawPrice === 'string'
                    ? Number(rawPrice.replace(/\D/g, ''))
                    : Number(rawPrice);
                return priceValue <= Number(priceMax);
            });

            if (yearMin) result = result.filter(item => (item.year || 0) >= Number(yearMin));
            if (yearMax) result = result.filter(item => (item.year || 0) <= Number(yearMax));

            if (kmMin) result = result.filter(item => (item.kilometraje || 0) >= Number(kmMin));
            if (kmMax) result = result.filter(item => (item.kilometraje || 0) <= Number(kmMax));
        }

        // 3. Category Filter (Optional/Future)
        // Currently ignored as backend data doesn't support 'segment' or 'body_type' reliably yet.

        return result;
    };

    /** Publicaciones del usuario logueado: GET /health/ alineado con VehicleHealthScreen. */
    const myListingVehicleIds = useMemo(() => {
        if (!user?.id || !Array.isArray(listings) || listings.length === 0) return [];
        return listings
            .filter((item) => item?.seller?.id != null && String(item.seller.id) === String(user.id))
            .map((item) => item.id)
            .filter(Boolean);
    }, [listings, user?.id]);

    const myListingHealthQueries = useQueries({
        queries: myListingVehicleIds.map((vid) => ({
            queryKey: ['vehicleHealth', vid],
            queryFn: () => VehicleHealthService.getVehicleHealth(vid),
            enabled: !!user?.id && !!vid,
            staleTime: 60 * 1000,
        })),
    });

    const marketplaceOwnerHealthById = useMemo(() => {
        const m = {};
        myListingVehicleIds.forEach((vid, idx) => {
            const r = myListingHealthQueries[idx];
            if (r?.data && typeof r.data === 'object' && !r.data.error) {
                m[vid] = r.data;
            }
        });
        return m;
    }, [myListingVehicleIds, myListingHealthQueries]);

    // --- Render Items ---

    const renderListingItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.card, item.is_reserved && { opacity: 0.8 }]}
            activeOpacity={0.9}
            onPress={() => navigation.navigate(ROUTES.MARKETPLACE_VEHICLE_DETAIL, { vehicle: item })}
        >
            {/* Image Header — Carousel */}
            <View style={styles.imageContainer}>
                <PhotoCarousel
                    fotos={item.fotos}
                    fallbackUri={item.foto_url}
                    isReserved={item.is_reserved}
                />

                {/* Reserved Badge Overlay */}
                {item.is_reserved && (
                    <View style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10
                    }}>
                        <View style={{
                            backgroundColor: '#374151',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#FFFFFF'
                        }}>
                            <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>RESERVADO</Text>
                        </View>
                    </View>
                )}

                {/* Overlay Badges */}
                {!item.is_reserved && (
                    <View style={styles.topBadges}>
                        {item.is_certified_mecanimovil && (
                            <View style={styles.certifiedBadge}>
                                <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                                <Text style={styles.certifiedText}>Verificado MecaniMóvil</Text>
                            </View>
                        )}
                    </View>
                )}

                {!item.is_reserved && (
                    <View style={styles.bottomBadges}>
                        {(() => {
                            const isMyListing =
                                !!user?.id &&
                                item?.seller?.id != null &&
                                String(item.seller.id) === String(user.id);
                            const ownerHealth = isMyListing ? marketplaceOwnerHealthById[item.id] : null;
                            const score = resolveVehicleHealthPct(item, ownerHealth);
                            const badgeColor = getHealthColorToken(COLORS, score);

                            return (
                                <View style={styles.healthBadge}>
                                    <Ionicons name="heart" size={12} color={badgeColor} />
                                    <Text style={[styles.healthText, { color: badgeColor }]}>{Math.round(score)}% Salud</Text>
                                </View>
                            );
                        })()}
                    </View>
                )}
            </View>

            {/* Content Body */}
            <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={styles.title}>{item.marca_nombre} {item.modelo_nombre}</Text>
                        <Text style={[styles.subtitle, item.is_reserved && styles.subtitleMuted]}>
                            {item.year} • {item.transmision || 'Automática'}
                        </Text>
                    </View>
                    <Text style={[styles.price, item.is_reserved && styles.priceReserved]}>
                        {formatPrice(item.precio_venta || item.settings?.precio_venta || item.marketplace_data?.precio_venta || item.price || item.selling_price || item.precio_publicado || item.precio_sugerido_final || item.suggested_price)}
                    </Text>
                </View>

                {/* Seller Info */}
                <View style={[styles.sellerContainer, item.is_reserved && { opacity: 0.5 }]}>
                    {item.seller?.foto_url || item.usuario?.foto_perfil || item.seller?.photo ? (
                        <Image
                            source={{ uri: item.seller?.foto_url || item.usuario?.foto_perfil || item.seller?.photo }}
                            style={styles.sellerAvatar}
                            contentFit="cover"
                        />
                    ) : (
                        <View style={[styles.sellerAvatar, styles.sellerAvatarPlaceholder]}>
                            <Ionicons name="person" size={12} color="rgba(255,255,255,0.35)" />
                        </View>
                    )}
                    <Text style={styles.sellerName} numberOfLines={1}>
                        {item.seller?.nombre || item.seller?.name || item.usuario?.first_name || 'Vendedor'}
                    </Text>
                </View>

                {item.descripcion_venta ? (
                    <Text style={styles.descripcionVenta} numberOfLines={2}>
                        {item.descripcion_venta}
                    </Text>
                ) : null}

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                    <View style={styles.footerItem}>
                        <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.45)" />
                        <Text style={styles.footerText}>Santiago</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate(ROUTES.MARKETPLACE_VEHICLE_DETAIL, { vehicle: item })}>
                        <Text style={styles.viewMoreText}>Ver Detalles</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderOfferItem = ({ item }) => {
        const inspectionBlocked =
            item.type === 'sent' &&
            item.status === 'accepted' &&
            item.vehiculoId &&
            tieneInspeccionPrecompraActivaParaVehiculo(todasSolicitudes, item.vehiculoId);

        return (
            <OfferNegotiationCard
                offer={item}
                onAccept={() => handleRespondOffer(item.id, 'aceptada')}
                onReject={() => handleRespondOffer(item.id, 'rechazada')}
                onChat={() => {
                    if (!item.conversationId) {
                        Alert.alert("Error", "La conversación aún no está lista. Intenta recargar.");
                        return;
                    }
                    navigation.navigate(ROUTES.CHAT_DETAIL, {
                        conversationId: item.conversationId,
                        recipientId: item.counterpart.id,
                        recipientName: item.counterpart.name,
                        recipientImage: item.counterpart.avatar,
                        context: {
                            type: 'vehicle_offer',
                            vehicleName: item.vehicle.name,
                            price: item.amount
                        }
                    });
                }}
                onTransfer={() => {
                    navigation.navigate(ROUTES.TRANSFERENCIA_VENDEDOR, { offerId: item.id });
                }}
                onReceive={() => {
                    navigation.navigate(ROUTES.TRANSFERENCIA_COMPRADOR);
                }}
                inspectionDisabled={!!inspectionBlocked}
                inspectionDisabledReason="Ya tienes una inspección pre-compra activa para este vehículo. Revisa Mis solicitudes o espera a que finalice o expire."
                onRequestInspection={
                    item.type === 'sent' && item.status === 'accepted'
                        ? () => {
                            if (!item.vehiculoId) {
                                showMarketplaceAlert(
                                    'Error',
                                    'No se pudo identificar el vehículo de la publicación. Intenta recargar Negocios.'
                                );
                                return;
                            }
                            navigation.navigate(ROUTES.CREAR_SOLICITUD, {
                                isPreCompra: true,
                                targetVehicleId: item.vehiculoId,
                                ofertaId: item.id,
                            });
                        }
                        : undefined
                }
            />
        );
    };

    // --- Filter Logic ---
    const getFilteredOffers = () => {
        if (activeSegment === 'all') return offers;
        return offers.filter(offer =>
            activeSegment === 'sales' ? offer.type === 'received' : offer.type === 'sent'
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
                <Text style={styles.headerTitle}>Marketplace</Text>

                {/* Main Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'explore' && styles.activeTab]}
                        onPress={() => setActiveTab('explore')}
                    >
                        <Text style={[styles.tabText, activeTab === 'explore' && styles.activeTabText]}>Explorar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'deals' && styles.activeTab]}
                        onPress={() => setActiveTab('deals')}
                    >
                        <Text style={[styles.tabText, activeTab === 'deals' && styles.activeTabText]}>Negocios</Text>
                    </TouchableOpacity>
                </View>

                {/* Sub-header Content based on Tab */}
                {activeTab === 'explore' ? (
                    <View>
                        <View style={styles.searchRow}>
                            <View style={styles.searchBar}>
                                <Ionicons name="search" size={20} color={COLORS.text.tertiary} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Buscar marca, modelo..."
                                    placeholderTextColor={COLORS.text.tertiary}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.filterButton,
                                    (Object.values(activeFilters).some(v => v !== '')) && styles.filterButtonActive
                                ]}
                                onPress={() => setFilterModalVisible(true)}
                            >
                                <Ionicons
                                    name="options-outline"
                                    size={20}
                                    color={(Object.values(activeFilters).some(v => v !== '')) ? COLORS.primary[500] : COLORS.text.secondary}
                                />
                            </TouchableOpacity>
                        </View>

                    </View>
                ) : (
                    // Deals Segment Control
                    <View style={styles.segmentContainer}>
                        <TouchableOpacity
                            style={[styles.segment, activeSegment === 'all' && styles.activeSegment]}
                            onPress={() => setActiveSegment('all')}
                        >
                            <Text style={[styles.segmentText, activeSegment === 'all' && styles.activeSegmentText]}>Todo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.segment, activeSegment === 'sales' && styles.activeSegment]}
                            onPress={() => setActiveSegment('sales')}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[styles.segmentText, activeSegment === 'sales' && styles.activeSegmentText]}>Ventas</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.segment, activeSegment === 'purchases' && styles.activeSegment]}
                            onPress={() => setActiveSegment('purchases')}
                        >
                            <Text style={[styles.segmentText, activeSegment === 'purchases' && styles.activeSegmentText]}>Compras</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Main Content Area */}
            {activeTab === 'explore' ? (
                loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary[500]} />
                    </View>
                ) : (
                    <FlatList
                        data={getFilteredListings()}
                        renderItem={renderListingItem}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary[500]} />}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="car-sport-outline" size={64} color={COLORS.text.tertiary} />
                                <Text style={styles.emptyText}>No hay vehículos publicados aún.</Text>
                                <Text style={styles.emptySubtext}>Sé el primero en vender tu auto.</Text>
                            </View>
                        }
                    />
                )
            ) : (

                <FlatList
                    data={getFilteredOffers()}
                    renderItem={renderOfferItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="receipt-outline" size={64} color={COLORS.text.tertiary} />
                            <Text style={styles.emptyText}>No tienes negocios activos.</Text>
                        </View>
                    }
                />
            )}




            <MarketplaceFilterModal
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                onApply={setActiveFilters}
                currentFilters={activeFilters}
            />
        </View >
    );
};

const getStyles = () => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.default,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContainer: {
        paddingBottom: 8,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.styles.h2.fontSize,
        fontWeight: TYPOGRAPHY.styles.h2.fontWeight,
        letterSpacing: TYPOGRAPHY.styles.h2.letterSpacing,
        color: COLORS.text.primary,
        paddingHorizontal: SPACING.container.horizontal,
        marginBottom: 12,
    },
    // Tabs Styles
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: SURFACE_SOFT,
        borderRadius: BORDERS.radius.md,
        marginHorizontal: SPACING.container.horizontal,
        marginBottom: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: COLORS.border.light,
        overflow: 'hidden',
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: COLORS.background.paper,
        borderWidth: 1,
        borderColor: COLORS.border.light,
    },
    tabText: {
        fontSize: 14,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        color: COLORS.text.tertiary,
    },
    activeTabText: {
        color: COLORS.text.primary,
    },
    // Segment Control Styles
    segmentContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.container.horizontal,
        paddingBottom: 8,
        gap: 10,
    },
    segment: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: SURFACE_SOFT,
        borderWidth: 1,
        borderColor: COLORS.border.light,
    },
    activeSegment: {
        backgroundColor: COLORS.primary[50],
        borderColor: COLORS.primary[100],
    },
    segmentText: {
        fontSize: 13,
        color: COLORS.text.tertiary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    activeSegmentText: {
        color: COLORS.primary[500],
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
    },
    segmentBadge: {
        backgroundColor: '#EF4444',
        borderRadius: 10,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 6,
    },
    segmentBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    searchRow: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.container.horizontal,
        marginBottom: 16,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SURFACE_SOFT,
        borderRadius: BORDERS.radius.md,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: COLORS.border.light,
        overflow: 'hidden',
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: COLORS.text.primary,
    },
    filterButton: {
        width: 48,
        height: 48,
        borderRadius: BORDERS.radius.md,
        backgroundColor: SURFACE_SOFT,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        borderWidth: 1,
        borderColor: COLORS.border.light,
    },
    filterButtonActive: {
        borderColor: COLORS.primary[500],
        borderWidth: 2,
    },
    filterList: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    filterPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 99,
        backgroundColor: SURFACE_SOFT,
        borderWidth: 1,
        borderColor: COLORS.border.light,
        marginRight: 8,
    },
    filterPillActive: {
        backgroundColor: 'rgba(147,197,253,0.2)',
        borderColor: 'rgba(147,197,253,0.45)',
    },
    filterText: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.55)',
    },
    filterTextActive: {
        color: '#F9FAFB',
    },
    listContent: {
        padding: SPACING.container.horizontal,
        paddingBottom: 80,
    },
    card: {
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border.light,
    },
    imageContainer: {
        height: 180,
        width: '100%',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        backgroundColor: SURFACE_SOFT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topBadges: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
    },
    certifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.success.main,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    certifiedText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    bottomBadges: {
        position: 'absolute',
        bottom: 12,
        left: 12,
    },
    healthBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.92)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: COLORS.border.light,
    },
    healthText: {
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 4,
    },
    cardBody: {
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 18,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
    subtitleMuted: {
        color: COLORS.text.tertiary,
    },
    price: {
        fontSize: 18,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
    },
    priceReserved: {
        color: 'rgba(255,255,255,0.35)',
        textDecorationLine: 'line-through',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border.light,
        marginVertical: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    // New styles for seller info
    sellerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border.light,
    },
    sellerAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
    },
    sellerAvatarPlaceholder: {
        backgroundColor: SURFACE_SOFT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sellerName: {
        fontSize: 12,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        color: COLORS.text.secondary,
        flex: 1,
    },

    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: COLORS.text.secondary,
        marginLeft: 4,
    },
    viewMoreText: {
        fontSize: 14,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.primary[500],
    },
    descripcionVenta: {
        fontSize: 13,
        color: COLORS.text.secondary,
        lineHeight: 18,
        marginTop: 10,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 64,
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
        marginTop: 16,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.text.secondary,
        marginTop: 8,
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(147,197,253,0.25)',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    fabText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 16,
    }
});

export default MarketplaceScreen;
