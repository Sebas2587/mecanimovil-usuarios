import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, TextInput, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ROUTES } from '../../utils/constants';
import { useTheme } from '../../design-system/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as vehicleService from '../../services/vehicle';

const CATEGORY_FILTERS = [
    { id: 'all', label: 'Todos' },
    { id: 'suv', label: 'SUV' },
    { id: 'sedan', label: 'Sedán' },
    { id: 'hatch', label: 'Hatchback' },
    { id: 'truck', label: 'Camioneta' },
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

    const [selectedFilter, setSelectedFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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
    }, []);

    const formatPrice = (price) => {
        if (!price) return '$0';
        return '$' + price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

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
                    {/* Mock Certified Logic based on high health score for now */}
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
                    <Text style={styles.price}>{formatPrice(item.precio_venta)}</Text>
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

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background?.default} />

            <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
                <Text style={styles.headerTitle}>Marketplace</Text>
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

                {/* Filters */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterList}
                >
                    {CATEGORY_FILTERS.map(f => (
                        <TouchableOpacity
                            key={f.id}
                            style={[
                                styles.filterPill,
                                selectedFilter === f.id && styles.filterPillActive
                            ]}
                            onPress={() => setSelectedFilter(f.id)}
                        >
                            <Text style={[
                                styles.filterText,
                                selectedFilter === f.id && styles.filterTextActive
                            ]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
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
        backgroundColor: '#FFFFFF', // Or primary generic
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
});

export default MarketplaceScreen;
