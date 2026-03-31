import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, StatusBar, ActivityIndicator, RefreshControl, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ROUTES } from '../../utils/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as vehicleService from '../../services/vehicle';
import OfferNegotiationCard from '../../components/marketplace/OfferNegotiationCard';
import MarketplaceFilterModal from '../../components/marketplace/MarketplaceFilterModal';

const GLASS_BG = Platform.select({
    ios: 'rgba(255,255,255,0.06)',
    android: 'rgba(255,255,255,0.10)',
    default: 'rgba(255,255,255,0.08)',
});

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

const MarketplaceScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const styles = getStyles();

    // State
    const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'deals'

    const [activeSegment, setActiveSegment] = useState('all'); // 'all' | 'sales' | 'purchases'
    const [searchQuery, setSearchQuery] = useState('');
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [offers, setOffers] = useState([]);

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
        }
    }, [activeTab]);

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
        fetchListings();
    }, []);

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

    // --- Render Items ---

    const renderListingItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.card, item.is_reserved && { opacity: 0.8 }]}
            activeOpacity={0.9}
            onPress={() => navigation.navigate(ROUTES.MARKETPLACE_VEHICLE_DETAIL, { vehicle: item })}
        >
            {/* Image Header */}
            <View style={styles.imageContainer}>
                {item.foto_url ? (
                    <Image source={{ uri: item.foto_url }} style={[styles.image, item.is_reserved && { opacity: 0.6 }]} contentFit="cover" />
                ) : (
                    <View style={[styles.image, styles.imagePlaceholder]}>
                        <Ionicons name="car-outline" size={48} color="rgba(255,255,255,0.35)" />
                    </View>
                )}

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
                        {item.health_score > 90 && (
                            <View style={styles.certifiedBadge}>
                                <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                                <Text style={styles.certifiedText}>Certificado</Text>
                            </View>
                        )}
                    </View>
                )}

                {!item.is_reserved && (
                    <View style={styles.bottomBadges}>
                        {(() => {
                            const score = item.health_score ?? 0;
                            // Consistent color logic across all screens
                            let badgeColor = '#10B981'; // Green
                            if (score < 40) badgeColor = '#EF4444'; // Red
                            else if (score < 60) badgeColor = '#F97316'; // Orange
                            else if (score < 80) badgeColor = '#F59E0B'; // Yellow

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

    const renderOfferItem = ({ item }) => (
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
                // Navigate to Seller Transfer Screen
                navigation.navigate(ROUTES.TRANSFERENCIA_VENDEDOR, { offerId: item.id });
            }}
            onReceive={() => {
                // Navigate to Buyer Transfer Screen (Camera)
                navigation.navigate(ROUTES.TRANSFERENCIA_COMPRADOR);
            }}
        />
    );

    // --- Filter Logic ---
    const getFilteredOffers = () => {
        if (activeSegment === 'all') return offers;
        return offers.filter(offer =>
            activeSegment === 'sales' ? offer.type === 'received' : offer.type === 'sent'
        );
    };

    return (
        <View style={styles.container}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <LinearGradient colors={['#030712', '#0a0f1a', '#030712']} style={StyleSheet.absoluteFill} />
                <View style={styles.blobEmerald} />
                <View style={styles.blobIndigo} />
                <View style={styles.blobCyan} />
            </View>

            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

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
                                <Ionicons name="search" size={20} color="rgba(255,255,255,0.35)" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Buscar marca, modelo..."
                                    placeholderTextColor="rgba(255,255,255,0.35)"
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
                                    color={(Object.values(activeFilters).some(v => v !== '')) ? '#93C5FD' : 'rgba(255,255,255,0.55)'}
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
                        <ActivityIndicator size="large" color="#6EE7B7" />
                    </View>
                ) : (
                    <FlatList
                        data={getFilteredListings()}
                        renderItem={renderListingItem}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6EE7B7" />}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="car-sport-outline" size={64} color="rgba(255,255,255,0.2)" />
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
                            <Ionicons name="receipt-outline" size={64} color="rgba(255,255,255,0.2)" />
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
        backgroundColor: '#030712',
    },
    blobEmerald: {
        position: 'absolute',
        top: -40,
        left: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(16,185,129,0.10)',
    },
    blobIndigo: {
        position: 'absolute',
        top: 180,
        right: -50,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(99,102,241,0.08)',
    },
    blobCyan: {
        position: 'absolute',
        bottom: 80,
        left: 20,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(6,182,212,0.06)',
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
        fontSize: 28,
        fontWeight: '700',
        color: '#F9FAFB',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    // Tabs Styles
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.45)',
    },
    activeTabText: {
        color: '#F9FAFB',
    },
    // Segment Control Styles
    segmentContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 10,
    },
    segment: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    activeSegment: {
        backgroundColor: 'rgba(147,197,253,0.12)',
        borderColor: 'rgba(147,197,253,0.45)',
    },
    segmentText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.45)',
        fontWeight: '500',
    },
    activeSegmentText: {
        color: '#93C5FD',
        fontWeight: '600',
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
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: GLASS_BG,
        borderRadius: 14,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: '#F9FAFB',
    },
    filterButton: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: GLASS_BG,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    filterButtonActive: {
        borderColor: 'rgba(147,197,253,0.55)',
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
        backgroundColor: GLASS_BG,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
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
        padding: 16,
        paddingBottom: 80,
    },
    card: {
        backgroundColor: GLASS_BG,
        borderRadius: 18,
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
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
        backgroundColor: 'rgba(255,255,255,0.06)',
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
        backgroundColor: 'rgba(16,185,129,0.85)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
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
        backgroundColor: 'rgba(3,7,18,0.65)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
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
        fontWeight: '700',
        color: '#F9FAFB',
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
    },
    subtitleMuted: {
        color: 'rgba(255,255,255,0.35)',
    },
    price: {
        fontSize: 18,
        fontWeight: '700',
        color: '#93C5FD',
    },
    priceReserved: {
        color: 'rgba(255,255,255,0.35)',
        textDecorationLine: 'line-through',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
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
        borderTopColor: 'rgba(255,255,255,0.08)',
    },
    sellerAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
    },
    sellerAvatarPlaceholder: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sellerName: {
        fontSize: 12,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.65)',
        flex: 1,
    },

    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.45)',
        marginLeft: 4,
    },
    viewMoreText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6EE7B7',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 64,
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.65)',
        marginTop: 16,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.4)',
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
