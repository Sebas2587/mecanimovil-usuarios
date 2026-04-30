import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';
import { getProviderTierLabel } from '../../utils/providerUtils';

/**
 * Card compacta de proveedor (lista horizontal / grid).
 * @param {'light'|'dark'} appearance — `dark` para paneles con fondo oscuro (ej. UserPanel).
 * @param {string|null} typeLabel — "Taller" o "A domicilio" (chip sobre la foto).
 * @param {object|null} kpiBadge — payload backend; solo se muestra etiqueta de nivel (Elite, Pro…), sin %.
 * @param {string[]} [imageCandidates] — URLs absolutas en orden; si la primera falla, se prueba la siguiente.
 * @param {boolean} [omitRightMargin] — en grillas de 2 columnas, sin margen derecho extra.
 */
const ProviderPreviewCard = ({
    image,
    imageCandidates,
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
    typeLabel = null,
    omitRightMargin = false,
}) => {
    const theme = useTheme();
    const colors = theme?.colors || {};
    const typography = theme?.typography || {};
    const spacing = theme?.spacing || {};
    const borders = theme?.borders || {};

    const isDark = appearance === 'dark';
    const imageHeight = Math.max(96, Math.round(width * 0.54));
    const styles = getStyles(colors, typography, spacing, borders, width, isDark, omitRightMargin, imageHeight);
    const distanceIconColor = isDark ? 'rgba(255,255,255,0.45)' : (colors.text?.tertiary || '#6B7280');

    const uris = useMemo(() => {
        if (Array.isArray(imageCandidates) && imageCandidates.length > 0) {
            return [...new Set(imageCandidates.filter(Boolean))];
        }
        if (image) return [image];
        return [];
    }, [image, imageCandidates]);

    const [uriIndex, setUriIndex] = useState(0);
    const [loadDead, setLoadDead] = useState(false);
    useEffect(() => {
        setUriIndex(0);
        setLoadDead(false);
    }, [uris.join('|')]);

    const activeUri = !loadDead && uris.length ? uris[Math.min(uriIndex, uris.length - 1)] : null;

    const onImageError = useCallback(() => {
        setUriIndex((i) => {
            if (i + 1 < uris.length) return i + 1;
            setLoadDead(true);
            return i;
        });
    }, [uris.length]);

    const ratingLabel = rating != null && rating !== '' ? String(rating) : '—';
    const distanceLabel = distance != null && distance !== '' ? String(distance) : '—';

    const tierLabel = getProviderTierLabel(kpiBadge);
    const showTier = !!tierLabel;

    return (
        <TouchableOpacity
            style={styles.container}
            activeOpacity={0.8}
            onPress={onPress}
        >
            <View style={styles.imageContainer}>
                {activeUri ? (
                    <Image
                        source={{ uri: activeUri }}
                        style={styles.image}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                        onError={onImageError}
                    />
                ) : null}
                {!activeUri ? (
                    <View style={styles.placeholderImage}>
                        <Ionicons name="person" size={32} color={isDark ? 'rgba(255,255,255,0.35)' : (colors.neutral?.gray?.[400] || '#9CA3AF')} />
                    </View>
                ) : null}

                {typeLabel ? (
                    <View style={[styles.typeChip, isDark && styles.typeChipDark]}>
                        <Text style={[styles.typeChipText, isDark && styles.typeChipTextDark]} numberOfLines={1}>
                            {typeLabel}
                        </Text>
                    </View>
                ) : null}

                {verified && (
                    <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.primary?.[500] || '#003459'} />
                    </View>
                )}

                <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={10} color="#F59E0B" />
                    <Text style={styles.ratingText}>{ratingLabel}</Text>
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
                <Text style={styles.specialtyText} numberOfLines={2}>{specialty}</Text>

                {showTier ? (
                    <View style={styles.tierRow}>
                        <View
                            style={[
                                styles.tierPill,
                                {
                                    backgroundColor: kpiBadge.bg_color || 'rgba(0,0,0,0.25)',
                                    borderColor: kpiBadge.border_color || 'rgba(255,255,255,0.18)',
                                },
                            ]}
                        >
                            <Ionicons
                                name="ribbon-outline"
                                size={12}
                                color={kpiBadge.text_color || '#FFFFFF'}
                                style={{ marginRight: 5 }}
                            />
                            <Text
                                style={[styles.tierPillText, { color: kpiBadge.text_color || '#FFFFFF' }]}
                                numberOfLines={1}
                            >
                                {tierLabel}
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

const getStyles = (colors, typography, spacing, borders, width, isDark, omitRightMargin, imageHeight) => {
    const paper = colors.background?.paper || '#FFFFFF';
    const primaryText = colors.text?.primary || '#111827';
    const tertiary = colors.text?.tertiary || '#6B7280';

    return StyleSheet.create({
        container: {
            width: width,
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : paper,
            borderRadius: borders.radius?.lg || 12,
            marginRight: omitRightMargin ? 0 : (spacing.md || 16),
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
            height: imageHeight,
            width: '100%',
            backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : (colors.neutral?.gray?.[100] || '#F3F4F6'),
            position: 'relative',
        },
        image: {
            width: '100%',
            height: '100%',
        },
        placeholderImage: {
            ...StyleSheet.absoluteFillObject,
            justifyContent: 'center',
            alignItems: 'center',
        },
        typeChip: {
            position: 'absolute',
            top: 8,
            left: 8,
            backgroundColor: 'rgba(255,255,255,0.92)',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
            maxWidth: '72%',
        },
        typeChipDark: {
            backgroundColor: 'rgba(15,23,42,0.88)',
        },
        typeChipText: {
            fontSize: 10,
            fontWeight: '800',
            color: primaryText,
        },
        typeChipTextDark: {
            color: '#F9FAFB',
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
        tierRow: {
            marginBottom: 8,
        },
        tierPill: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            maxWidth: '100%',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            borderWidth: 1,
        },
        tierPillText: {
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 0.3,
            textTransform: 'none',
        },
        footer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
        },
        distanceContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            flexShrink: 1,
        },
        distanceText: {
            fontSize: 11,
            color: isDark ? 'rgba(255,255,255,0.5)' : tertiary,
            marginLeft: 2,
        },
        reviewsHint: {
            fontSize: 10,
            color: isDark ? 'rgba(255,255,255,0.38)' : tertiary,
            marginLeft: 8,
        },
    });
};

export default ProviderPreviewCard;
