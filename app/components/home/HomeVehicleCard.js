import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';

const HomeVehicleCard = ({ vehicle, onPress }) => {
    const theme = useTheme();
    const colors = theme?.colors || {};
    const typography = theme?.typography || {};
    const spacing = theme?.spacing || {};
    const borders = theme?.borders || {};

    const styles = getStyles(colors, typography, spacing, borders);

    // Fallback if vehicle is null (skeleton could be handled outside)
    if (!vehicle) return null;

    const imageUrl = vehicle.foto || null; // Simplified logic, real app resolves URLs

    return (
        <TouchableOpacity
            style={styles.container}
            activeOpacity={0.7}
            onPress={() => onPress && onPress(vehicle)}
        >
            <View style={styles.content}>
                {/* Left: Image */}
                <View style={styles.imageContainer}>
                    {imageUrl ? (
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.image}
                            contentFit="cover"
                        />
                    ) : (
                        <View style={styles.placeholderImage}>
                            <Ionicons name="car-sport" size={24} color={colors.neutral?.gray?.[400] || '#9CA3AF'} />
                        </View>
                    )}
                </View>

                {/* Center: Info */}
                <View style={styles.infoContainer}>
                    <Text style={styles.brandText} numberOfLines={1}>
                        {vehicle.marca} {vehicle.modelo}
                    </Text>
                    <Text style={styles.detailsText} numberOfLines={1}>
                        {vehicle.year} • {vehicle.kilometraje?.toLocaleString()} km
                    </Text>

                    {/* Badges Row */}
                    <View style={styles.badgesRow}>
                        {/* Health Badge */}
                        <View style={[styles.badge, styles.badgeSuccess]}>
                            <Ionicons name="heart" size={10} color={colors.success?.badgeText || '#065F46'} />
                            <Text style={[styles.badgeText, styles.badgeTextSuccess]}>{vehicle.health >= 90 ? 'Excelente' : vehicle.health >= 70 ? 'Bueno' : 'Atención'}</Text>
                        </View>

                        {/* Value Badge (Optional) */}
                        {vehicle.estimatedPrice > 0 && (
                            <View style={[styles.badge, styles.badgeInfo, { marginLeft: 8 }]}>
                                <Text style={[styles.badgeText, styles.badgeTextInfo]}>
                                    Est. ${(vehicle.estimatedPrice / 1000000).toFixed(1)}M
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Right: Chevron */}
                <View style={styles.chevronContainer}>
                    <Ionicons name="chevron-forward" size={20} color={colors.neutral?.gray?.[400] || '#9CA3AF'} />
                </View>

            </View>
        </TouchableOpacity >
    );
};

const getStyles = (colors, typography, spacing, borders) => StyleSheet.create({
    container: {
        backgroundColor: colors.background?.paper || '#FFFFFF',
        borderRadius: borders.radius?.lg || 12,
        padding: spacing.sm || 12,
        width: 300, // Fixed width for horizontal scrolling consistency
        marginRight: spacing.md || 16,
        borderWidth: 1,
        borderColor: colors.border?.light || '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    imageContainer: {
        width: 64,
        height: 64,
        borderRadius: borders.radius?.md || 8,
        overflow: 'hidden',
        backgroundColor: colors.background?.default || '#F3F4F6',
        marginRight: spacing.md || 12,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    brandText: {
        fontSize: typography.fontSize?.base || 14,
        fontWeight: typography.fontWeight?.semibold || '600',
        color: colors.text?.primary || '#111827',
        marginBottom: 2,
    },
    detailsText: {
        fontSize: typography.fontSize?.xs || 12,
        color: colors.text?.tertiary || '#6B7280',
        marginBottom: 8,
    },
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 9999, // Full pill
    },
    badgeSuccess: {
        backgroundColor: colors.success?.badge || '#D1FAE5',
    },
    badgeInfo: {
        backgroundColor: colors.info?.badge || '#DBEAFE',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: typography.fontWeight?.medium || '500',
        marginLeft: 3,
    },
    badgeTextSuccess: {
        color: colors.success?.badgeText || '#065F46',
    },
    badgeTextInfo: {
        color: colors.info?.badgeText || '#1E40AF',
        marginLeft: 0,
    },
    chevronContainer: {
        paddingLeft: spacing.xs || 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default HomeVehicleCard;
