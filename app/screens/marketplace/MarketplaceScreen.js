import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, TextInput, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ROUTES } from '../../utils/constants';
import { useTheme } from '../../design-system/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as vehicleService from '../../services/vehicle';
import OfferNegotiationCard from '../../components/marketplace/OfferNegotiationCard';

const CATEGORY_FILTERS = [
    { id: 'all', label: 'Todos' },
    { id: 'suv', label: 'SUV' },
    { id: 'sedan', label: 'Sedán' },
    { id: 'hatch', label: 'Hatchback' },
    { id: 'truck', label: 'Camioneta' },
];

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
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [activeSegment, setActiveSegment] = useState('all'); // 'all' | 'sales' | 'purchases'
    const [searchQuery, setSearchQuery] = useState('');
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [offers, setOffers] = useState(MOCK_OFFERS);

    const fetchListings = async () => {
        try {
            const data = await vehicleService.getMarketplaceListings();
            setListings(data);
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
        // Here you would also refresh offers
    }, []);

    const formatPrice = (price) => {
        if (!price) return '$0';
        return '$' + price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    // --- Render Items ---

    const renderListingItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => navigation.navigate(ROUTES.MARKETPLACE_VEHICLE_DETAIL, { vehicle: item })}
        >
            {/* Image Header */}
            <View style={styles.imageContainer}>
                {item.foto_url ? (
                    <Image source={{ uri: item.foto_url }} style={styles.image} contentFit="cover" />
                ) : (
                    <View style={[styles.image, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="car-outline" size={48} color="#9CA3AF" />
                    </View>
                )}

                {/* Overlay Badges */}
                <View style={styles.topBadges}>
                    {item.health_score > 90 && (
                        <View style={styles.certifiedBadge}>
                            <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                            <Text style={styles.certifiedText}>Certificado</Text>
                        </View>
                    )}
                </View>

                <View style={styles.bottomBadges}>
                    <View style={styles.healthBadge}>
                        <Ionicons name="heart" size={12} color={colors.success?.main || '#10B981'} />
                        <Text style={styles.healthText}>{item.health_score || 100}% Salud</Text>
                    </View>
                </View>
            </View>

            {/* Content Body */}
            <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.title}>{item.marca_nombre} {item.modelo_nombre}</Text>
                        <Text style={styles.subtitle}>{item.year} • {item.transmision || 'Automática'}</Text>
                    </View>
                    <Text style={styles.price}>{formatPrice(item.precio_venta || item.settings?.precio_venta || item.marketplace_data?.precio_venta || item.price || item.selling_price || item.precio_publicado || item.precio_sugerido_final || item.suggested_price)}</Text>
                </View>

                {/* Seller Info */}
                <View style={styles.sellerContainer}>
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
            onAccept={() => console.log('Accept Offer', item.id)}
            onReject={() => console.log('Reject Offer', item.id)}
            onChat={() => navigation.navigate(ROUTES.CHAT_DETAIL, {
                recipientId: 'mock_seller_id', // In real app, get from item.counterpart.id
                recipientName: item.counterpart.name,
                initialMessage: "Hola, hablemos sobre la oferta."
            })}
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
                            <TouchableOpacity style={styles.filterButton}>
                                <Ionicons name="options-outline" size={20} color={colors.primary?.main} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
                            {CATEGORY_FILTERS.map(f => (
                                <TouchableOpacity
                                    key={f.id}
                                    style={[styles.filterPill, selectedFilter === f.id && styles.filterPillActive]}
                                    onPress={() => setSelectedFilter(f.id)}
                                >
                                    <Text style={[styles.filterText, selectedFilter === f.id && styles.filterTextActive]}>{f.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
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
                                {/* Badge for Sales */}
                                <View style={styles.segmentBadge}>
                                    <Text style={styles.segmentBadgeText}>2</Text>
                                </View>
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
                        data={listings}
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
                // Deals Tab Content
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

            {/* Floating Action Button (FAB) - Only in Explore Tab */}
            {activeTab === 'explore' && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate(ROUTES.SELL_VEHICLE_FLOW)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={24} color="#FFFFFF" />
                    <Text style={styles.fabText}>Vender</Text>
                </TouchableOpacity>
            )}
        </View>
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
