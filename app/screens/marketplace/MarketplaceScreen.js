import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, TextInput, StatusBar, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ROUTES } from '../../utils/constants';
import { useTheme } from '../../design-system/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as vehicleService from '../../services/vehicle';
import OfferNegotiationCard from '../../components/marketplace/OfferNegotiationCard';
import MarketplaceFilterModal from '../../components/marketplace/MarketplaceFilterModal';



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
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    // Design Tokens
    const colors = theme?.colors || {};
    const typography = theme?.typography || {};
    const spacing = theme?.spacing || {};
    const borders = theme?.borders || {};

    const styles = getStyles(colors, typography, spacing, borders);

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
                    <View style={[styles.image, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="car-outline" size={48} color="#9CA3AF" />
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
                            const score = item.health_score || 100;
                            let badgeColor = colors.success?.main || '#10B981';
                            if (score < 40) badgeColor = colors.error?.main || '#EF4444';
                            else if (score < 70) badgeColor = colors.warning?.main || '#F59E0B';

                            return (
                                <View style={styles.healthBadge}>
                                    <Ionicons name="heart" size={12} color={badgeColor} />
                                    <Text style={[styles.healthText, { color: badgeColor }]}>{score}% Salud</Text>
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
                        <Text style={[styles.subtitle, item.is_reserved && { color: '#6B7280' }]}>
                            {item.year} • {item.transmision || 'Automática'}
                        </Text>
                    </View>
                    <Text style={[styles.price, item.is_reserved && { color: '#9CA3AF', textDecorationLine: 'line-through' }]}>
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
                        <View style={[styles.sellerAvatar, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                            <Ionicons name="person" size={12} color="#9CA3AF" />
                        </View>
                    )}
                    <Text style={styles.sellerName} numberOfLines={1}>
                        {item.seller?.nombre || item.seller?.name || item.usuario?.first_name || 'Vendedor'}
                    </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                    <View style={styles.footerItem}>
                        <Ionicons name="location-outline" size={14} color={colors.text?.tertiary} />
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
            <StatusBar barStyle="dark-content" backgroundColor={colors.background?.default} />

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
                                <Ionicons name="search" size={20} color={colors.text?.disabled} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Buscar marca, modelo..."
                                    placeholderTextColor={colors.text?.disabled}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.filterButton,
                                    (Object.values(activeFilters).some(v => v !== '')) && { borderColor: colors.primary?.main, borderWidth: 2 }
                                ]}
                                onPress={() => setFilterModalVisible(true)}
                            >
                                <Ionicons
                                    name="options-outline"
                                    size={20}
                                    color={(Object.values(activeFilters).some(v => v !== '')) ? colors.primary?.main : colors.text?.secondary}
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
                        <ActivityIndicator size="large" color={colors.primary?.main} />
                    </View>
                ) : (
                    <FlatList
                        data={getFilteredListings()}
                        renderItem={renderListingItem}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="car-sport-outline" size={64} color={colors.neutral?.gray?.[300] || '#D1D5DB'} />
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
                            <Ionicons name="receipt-outline" size={64} color={colors.neutral?.gray?.[300] || '#D1D5DB'} />
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

const getStyles = (colors, typography, spacing, borders) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background?.default || '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContainer: {
        backgroundColor: colors.background?.default || '#F9FAFB',
        paddingBottom: spacing.sm || 8,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: typography.fontSize?.['3xl'] || 28,
        fontWeight: typography.fontWeight?.bold || '700',
        color: colors.text?.primary || '#111827',
        paddingHorizontal: spacing.md || 16,
        marginBottom: spacing.sm || 12,
    },
    // Tabs Styles
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#E5E7EB',
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#FFFFFF',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    activeTabText: {
        color: colors.primary?.main || '#003459',
    },
    // Segment Control Styles
    segmentContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 12,
    },
    segment: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    activeSegment: {
        backgroundColor: colors.primary?.light || '#E0F2FE',
        borderColor: colors.primary?.main || '#003459',
    },
    segmentText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    activeSegmentText: {
        color: colors.primary?.main || '#003459',
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
    // Existing Styles
    searchRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md || 16,
        marginBottom: spacing.md || 16,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: borders.radius?.lg || 12,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: colors.border?.light || '#E5E7EB',
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: typography.fontSize?.base || 14,
        color: colors.text?.primary || '#111827',
    },
    filterButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        borderWidth: 1,
        borderColor: colors.border?.light || '#E5E7EB',
    },
    filterList: {
        paddingHorizontal: spacing.md || 16,
        paddingBottom: 8,
    },
    filterPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 99,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.border?.light || '#E5E7EB',
        marginRight: 8,
    },
    filterPillActive: {
        backgroundColor: colors.primary?.main || '#003459',
        borderColor: colors.primary?.main || '#003459',
    },
    filterText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text?.secondary || '#374151',
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
    listContent: {
        padding: spacing.md || 16,
        paddingBottom: 80, // Space for FAB
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: borders.radius?.xl || 16,
        marginBottom: spacing.lg || 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.border?.light || '#F3F4F6',
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
    topBadges: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
    },
    certifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success?.main || '#10B981',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
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
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 99,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    healthText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.text?.primary || '#111827',
        marginLeft: 4,
    },
    cardBody: {
        padding: spacing.md || 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: typography.fontSize?.lg || 18,
        fontWeight: typography.fontWeight?.bold || '700',
        color: colors.text?.primary || '#111827',
    },
    subtitle: {
        fontSize: 14,
        color: colors.text?.secondary || '#6B7280',
        marginTop: 2,
    },
    price: {
        fontSize: typography.fontSize?.lg || 18,
        fontWeight: typography.fontWeight?.bold || '700',
        color: colors.info?.main || '#2563EB',
    },
    divider: {
        height: 1,
        backgroundColor: colors.border?.light || '#F3F4F6',
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
        borderTopColor: '#F3F4F6',
    },
    sellerAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
    },
    sellerName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#4B5563',
        flex: 1,
    },

    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: colors.text?.tertiary || '#9CA3AF',
        marginLeft: 4,
    },
    viewMoreText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary?.main || '#003459',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 64,
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text?.secondary || '#6B7280',
        marginTop: 16,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.text?.tertiary || '#9CA3AF',
        marginTop: 8,
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary?.main || '#003459',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
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
