import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';

/**
 * Card compacta de proveedor (lista horizontal / grid).
 * @param {'light'|'dark'} appearance — `dark` para paneles con fondo oscuro (ej. UserPanel).
 * @param {object|null} kpiBadge — payload del backend (solo si suscripción activa); ver ProviderHeader.
 */
const ProviderPreviewCard = ({
    image,
    name,
    rating,
    reviews,
    specialty,
    distance,
    verified = false,
    width = 160,
    onPress,
    kpiBadge = null,
    appearance = 'light',
}) => {
    const theme = useTheme();
    const colors = theme?.colors || {};
    const typography = theme?.typography || {};
    const spacing = theme?.spacing || {};
    const borders = theme?.borders || {};

    const isDark = appearance === 'dark';
    const styles = getStyles(colors, typography, spacing, borders, width, isDark);
    const distanceIconColor = isDark ? 'rgba(255,255,255,0.45)' : (colors.text?.tertiary || '#6B7280');

    const ratingLabel = rating != null && rating !== '' ? String(rating) : '—';
    const distanceLabel = distance != null && distance !== '' ? String(distance) : '—';

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
                        <Ionicons name="person" size={32} color={isDark ? 'rgba(255,255,255,0.35)' : (colors.neutral?.gray?.[400] || '#9CA3AF')} />
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
                    <Text style={styles.ratingText}>{ratingLabel}</Text>
                </View>
            </View>

            {/* Content Section */}
            <View style={styles.content}>
                <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
                <Text style={styles.specialtyText} numberOfLines={2}>{specialty}</Text>

                {kpiBadge?.label ? (
                    <View style={styles.kpiRow}>
                        <View
                            style={[
                                styles.kpiPill,
                                {
                                    backgroundColor: kpiBadge.bg_color || 'rgba(0,0,0,0.25)',
                                    borderColor: kpiBadge.border_color || 'rgba(255,255,255,0.18)',
                                },
                            ]}
                        >
                            <Ionicons
                                name="speedometer-outline"
                                size={11}
                                color={kpiBadge.text_color || '#FFFFFF'}
                                style={{ marginRight: 4 }}
                            />
                            <Text
                                style={[styles.kpiPillText, { color: kpiBadge.text_color || '#FFFFFF' }]}
                                numberOfLines={1}
                            >
                                {kpiBadge.short_label || kpiBadge.label}
                                {typeof kpiBadge.score === 'number' ? ` · ${kpiBadge.score}%` : ''}
                            </Text>
                        </View>
                    </View>
                ) : null}

                <View style={styles.footer}>
                    <View style={styles.distanceContainer}>
                        <Ionicons name="location-outline" size={12} color={distanceIconColor} />
                        <Text style={styles.distanceText}>{distanceLabel}</Text>
                    </View>
                    {typeof reviews === 'number' && reviews > 0 ? (
                        <Text style={styles.reviewsHint}>{reviews} reseñas</Text>
                    ) : null}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const getStyles = (colors, typography, spacing, borders, width, isDark) => {
    const paper = colors.background?.paper || '#FFFFFF';
    const primaryText = colors.text?.primary || '#111827';
    const tertiary = colors.text?.tertiary || '#6B7280';

    return StyleSheet.create({
        container: {
            width: width,
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : paper,
            borderRadius: borders.radius?.lg || 12,
            marginRight: spacing.md || 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : (colors.border?.light || '#E5E7EB'),
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDark ? 0.35 : 0.08,
                    shadowRadius: 6,
                },
                android: { elevation: isDark ? 3 : 2 },
                default: {},
            }),
        },
        imageContainer: {
            height: 100,
            width: '100%',
            backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : (colors.neutral?.gray?.[100] || '#F3F4F6'),
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
            backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : paper,
            borderRadius: 999,
            padding: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
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
            backgroundColor: isDark ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.9)',
            borderRadius: 8,
            paddingHorizontal: 6,
            paddingVertical: 2,
        },
        ratingText: {
            fontSize: 10,
            fontWeight: '700',
            color: isDark ? '#F9FAFB' : primaryText,
            marginLeft: 2,
        },
        content: {
            padding: spacing.sm || 12,
        },
        nameText: {
            fontSize: typography.fontSize?.sm || 14,
            fontWeight: typography.fontWeight?.semibold || '600',
            color: isDark ? '#F9FAFB' : primaryText,
            marginBottom: 2,
        },
        specialtyText: {
            fontSize: 11,
            color: isDark ? 'rgba(255,255,255,0.55)' : tertiary,
            marginBottom: 6,
            minHeight: 28,
        },
        kpiRow: {
            marginBottom: 8,
        },
        kpiPill: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
            borderWidth: 1,
            maxWidth: '100%',
        },
        kpiPillText: {
            fontSize: 10,
            fontWeight: '700',
            flexShrink: 1,
        },
        footer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 4,
        },
        distanceContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        distanceText: {
            fontSize: 11,
            color: isDark ? 'rgba(255,255,255,0.5)' : tertiary,
            marginLeft: 2,
        },
        reviewsHint: {
            fontSize: 10,
            color: isDark ? 'rgba(255,255,255,0.38)' : tertiary,
        },
    });
};

export default ProviderPreviewCard;
