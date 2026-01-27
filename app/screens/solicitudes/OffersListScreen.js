import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../design-system/theme/useTheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const OFFERS = [
    {
        id: '1',
        mechanic: {
            name: 'Roberto Gómez',
            rating: 4.9,
            reviews: 124,
            image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=400&auto=format&fit=crop',
            verified: true,
        },
        availability: 'Hoy, 15:00',
        distance: '2.5 km',
        price: '45.000',
        isBestPrice: true,
    },
    {
        id: '2',
        mechanic: {
            name: 'Taller Mecánico Express',
            rating: 4.7,
            reviews: 85,
            image: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=400&auto=format&fit=crop',
            verified: true,
        },
        availability: 'Mañana, 09:00',
        distance: '4.2 km',
        price: '48.500',
        isBestPrice: false,
    },
    {
        id: '3',
        mechanic: {
            name: 'Carlos Díaz',
            rating: 4.5,
            reviews: 32,
            image: null,
            verified: false,
        },
        availability: 'Hoy, 17:30',
        distance: '1.2 km',
        price: '52.000',
        isBestPrice: false,
    },
];

const OffersListScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    // Design Tokens
    const colors = theme?.colors || {};
    const typography = theme?.typography || {};
    const spacing = theme?.spacing || {};
    const borders = theme?.borders || {};

    const styles = getStyles(colors, typography, spacing, borders);

    const renderOfferItem = ({ item }) => (
        <View style={styles.offerCard}>
            {item.isBestPrice && (
                <View style={styles.bestPriceBadge}>
                    <Text style={styles.bestPriceText}>Mejor Precio</Text>
                </View>
            )}

            <View style={styles.cardHeader}>
                <View style={styles.mechanicInfo}>
                    <Image
                        source={item.mechanic.image ? { uri: item.mechanic.image } : null}
                        style={styles.avatar}
                    />
                    {!item.mechanic.image && (
                        <View style={styles.placeholderAvatar}>
                            <Ionicons name="person" size={20} color={colors.text?.secondary} />
                        </View>
                    )}

                    <View style={styles.textInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.name}>{item.mechanic.name}</Text>
                            {item.mechanic.verified && (
                                <Ionicons name="checkmark-circle" size={16} color={colors.primary?.main || '#003459'} style={{ marginLeft: 4 }} />
                            )}
                        </View>
                        <View style={styles.ratingRow}>
                            <Ionicons name="star" size={12} color="#F59E0B" />
                            <Text style={styles.rating}>{item.mechanic.rating} ({item.mechanic.reviews})</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.price}>${item.price}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={16} color={colors.text?.tertiary} />
                    <Text style={styles.detailText}>{item.availability}</Text>
                </View>
                <View style={styles.detailItem}>
                    <Ionicons name="location-outline" size={16} color={colors.text?.tertiary} />
                    <Text style={styles.detailText}>{item.distance}</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.acceptButton} activeOpacity={0.8}>
                <Text style={styles.acceptButtonText}>Aceptar Oferta</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background?.default} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text?.primary} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Ofertas Recibidas</Text>
                    <Text style={styles.headerSubtitle}>Cambio de Aceite • 3 ofertas</Text>
                </View>
            </View>

            <FlatList
                data={OFFERS}
                renderItem={renderOfferItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const getStyles = (colors, typography, spacing, borders) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background?.default || '#F9FAFB',
    },
    header: {
        backgroundColor: colors.background?.default,
        paddingHorizontal: spacing.md || 16,
        paddingBottom: spacing.md || 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: typography.fontSize?.xl || 20,
        fontWeight: typography.fontWeight?.bold || '700',
        color: colors.text?.primary || '#111827',
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.text?.secondary || '#6B7280',
    },
    listContent: {
        padding: spacing.md || 16,
    },
    offerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: borders.radius?.xl || 16,
        padding: spacing.md || 16,
        marginBottom: spacing.md || 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.border?.light || '#F3F4F6',
        position: 'relative',
        overflow: 'hidden',
    },
    bestPriceBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: colors.success?.main || '#10B981',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderBottomLeftRadius: 12,
    },
    bestPriceText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    mechanicInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    placeholderAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
        backgroundColor: colors.neutral?.gray?.[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text?.primary || '#111827',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    rating: {
        fontSize: 12,
        color: colors.text?.tertiary || '#9CA3AF',
        marginLeft: 4,
    },
    price: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text?.primary || '#111827',
    },
    divider: {
        height: 1,
        backgroundColor: colors.border?.light || '#F9FAFB',
        marginVertical: 16,
    },
    detailsGrid: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    detailItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        fontSize: 14,
        color: colors.text?.secondary || '#374151',
        marginLeft: 8,
    },
    acceptButton: {
        backgroundColor: colors.primary?.main || '#003459',
        borderRadius: borders.radius?.md || 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    acceptButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
});

export default OffersListScreen;
