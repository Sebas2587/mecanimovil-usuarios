import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';

const ProviderPreviewCard = ({
    image,
    name,
    rating,
    reviews,
    specialty,
    distance,
    verified = false,
    width = 160,
    onPress
}) => {
    const theme = useTheme();
    const colors = theme?.colors || {};
    const typography = theme?.typography || {};
    const spacing = theme?.spacing || {};
    const borders = theme?.borders || {};

    const styles = getStyles(colors, typography, spacing, borders, width);

    return (
        <TouchableOpacity
            style={styles.container}
            activeOpacity={0.8}
            onPress={onPress}
        >
            {/* Image Section */}
            <View style={styles.imageContainer}>
                <Image
                    source={image ? { uri: image } : null}
                    style={styles.image}
                    contentFit="cover"
                />
                {!image && (
                    <View style={styles.placeholderImage}>
                        <Ionicons name="person" size={32} color={colors.neutral?.gray?.[400] || '#9CA3AF'} />
                    </View>
                )}

                {/* Verified Badge Overlay */}
                {verified && (
                    <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.primary?.[500] || '#003459'} />
                    </View>
                )}

                {/* Rating Badge Overlay */}
                <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={10} color="#F59E0B" />
                    <Text style={styles.ratingText}>{rating}</Text>
                </View>
            </View>

            {/* Content Section */}
            <View style={styles.content}>
                <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
                <Text style={styles.specialtyText} numberOfLines={1}>{specialty}</Text>

                <View style={styles.footer}>
                    <View style={styles.distanceContainer}>
                        <Ionicons name="location-outline" size={12} color={colors.text?.tertiary || '#6B7280'} />
                        <Text style={styles.distanceText}>{distance}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const getStyles = (colors, typography, spacing, borders, width) => StyleSheet.create({
    container: {
        width: width,
        backgroundColor: colors.background?.paper || '#FFFFFF',
        borderRadius: borders.radius?.lg || 12,
        marginRight: spacing.md || 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border?.light || '#E5E7EB',
    },
    imageContainer: {
        height: 100,
        width: '100%',
        backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
        position: 'relative',
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
    verifiedBadge: {
        position: 'absolute',
        bottom: -8,
        right: 8,
        backgroundColor: colors.background?.paper || '#FFFFFF',
        borderRadius: 999,
        padding: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        zIndex: 10,
    },
    ratingBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    ratingText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.text?.primary || '#111827',
        marginLeft: 2,
    },
    content: {
        padding: spacing.sm || 12,
    },
    nameText: {
        fontSize: typography.fontSize?.sm || 14,
        fontWeight: typography.fontWeight?.semibold || '600',
        color: colors.text?.primary || '#111827',
        marginBottom: 2,
    },
    specialtyText: {
        fontSize: 11,
        color: colors.text?.tertiary || '#6B7280',
        marginBottom: 8,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    distanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    distanceText: {
        fontSize: 11,
        color: colors.text?.tertiary || '#6B7280',
        marginLeft: 2,
    }
});

export default ProviderPreviewCard;
