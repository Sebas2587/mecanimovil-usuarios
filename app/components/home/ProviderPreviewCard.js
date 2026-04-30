import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';
import { getKpiTierPresentation, getProviderImageCandidatesResolved } from '../../utils/providerUtils';
import { getAxiosMediaBaseSync } from '../../services/api';

/**
 * Card compacta de proveedor (lista horizontal / grid).
 * @param {'light'|'dark'} appearance — `dark` para paneles con fondo oscuro (ej. UserPanel).
 * @param {string|null} typeLabel — "Taller" o "A domicilio" (chip sobre la foto).
 * @param {object|null} kpiBadge — payload backend (`kpi_badge_utils`); etiqueta y colores por score / code.
 * @param {string[]} [imageCandidates] — URLs absolutas en orden; si la primera falla, se prueba la siguiente.
 * @param {boolean} [omitRightMargin] — en grillas de 2 columnas, sin margen derecho extra.
 * @param {object} [provider] — objeto proveedor crudo del API; si viene, se recalculan URIs (misma lógica que ProviderDetail/Header).
 */
const ProviderPreviewCard = ({
    provider: providerRaw,
    image,
    imageCandidates,
    name,
    rating,
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
    const cardPad = spacing.cardPadding ?? spacing.sm ?? 12;
    const cardGap = spacing.cardGap ?? spacing.xs ?? 8;
    const styles = getStyles(
        colors,
        typography,
        spacing,
        borders,
        width,
        isDark,
        omitRightMargin,
        imageHeight,
        cardPad,
        cardGap
    );
    const distanceIconColor = isDark ? 'rgba(255,255,255,0.45)' : (colors.text?.tertiary || '#6B7280');
    // Tras el primer request, axios tiene baseURL; sin esto el memo no se invalida si solo cambia la resolución de /media/...
    const mediaBaseHint = getAxiosMediaBaseSync() || '';

    const uris = useMemo(() => {
        if (providerRaw) {
            const fromApi = getProviderImageCandidatesResolved(providerRaw);
            if (fromApi.length > 0) {
                return fromApi;
            }
        }
        if (Array.isArray(imageCandidates) && imageCandidates.length > 0) {
            return [...new Set(imageCandidates.filter(Boolean))];
        }
        if (image) return [image];
        return [];
    }, [providerRaw, image, imageCandidates, mediaBaseHint]);

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

    const kpiPresentation = getKpiTierPresentation(kpiBadge);
    const showTier = !!kpiPresentation;
    const verifiedColor = isDark
        ? colors.base?.freshSky || colors.secondary?.[400] || '#38BDF8'
        : colors.primary?.[500] || '#003459';

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
                        resizeMode="cover"
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

                <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={10} color="#F59E0B" />
                    <Text style={styles.ratingText}>{ratingLabel}</Text>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.nameRow}>
                    <Text style={styles.nameText} numberOfLines={1}>
                        {name}
                    </Text>
                    {verified ? (
                        <View
                            style={styles.verifiedInline}
                            accessibilityRole="text"
                            accessibilityLabel="Cuenta verificada en la plataforma"
                        >
                            <Ionicons name="shield-checkmark" size={15} color={verifiedColor} />
                        </View>
                    ) : null}
                </View>
                <Text style={styles.specialtyText} numberOfLines={2}>
                    {specialty}
                </Text>

                {showTier ? (
                    <View style={styles.tierRow}>
                        <View
                            style={[
                                styles.tierPill,
                                {
                                    backgroundColor: kpiPresentation.bg_color,
                                    borderColor: kpiPresentation.border_color,
                                },
                            ]}
                        >
                            <Ionicons
                                name="ribbon-outline"
                                size={12}
                                color={kpiPresentation.text_color}
                                style={styles.tierPillIcon}
                            />
                            <Text
                                style={[styles.tierPillText, { color: kpiPresentation.text_color }]}
                                numberOfLines={1}
                            >
                                {kpiPresentation.label}
                            </Text>
                        </View>
                    </View>
                ) : null}

                <View style={styles.footer}>
                    <View style={styles.distanceContainer}>
                        <Ionicons name="location-outline" size={12} color={distanceIconColor} />
                        <Text style={styles.distanceText} numberOfLines={1}>
                            {distanceLabel}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const getStyles = (
    colors,
    typography,
    spacing,
    borders,
    width,
    isDark,
    omitRightMargin,
    imageHeight,
    cardPad,
    cardGap
) => {
    const paper = colors.background?.paper || '#FFFFFF';
    const primaryText = colors.text?.primary || '#111827';
    const tertiary = colors.text?.tertiary || '#6B7280';
    const radiusCard = borders.radius?.card?.md ?? borders.radius?.lg ?? 12;
    const radiusPill = borders.radius?.badge?.md ?? 8;

    return StyleSheet.create({
        container: {
            width: width,
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : paper,
            borderRadius: radiusCard,
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
            paddingHorizontal: cardPad,
            paddingTop: cardPad,
            paddingBottom: Math.max(cardGap, cardPad - 2),
        },
        nameRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginBottom: spacing.xs ?? 4,
        },
        nameText: {
            flex: 1,
            minWidth: 0,
            fontSize: typography.fontSize?.sm || 14,
            fontWeight: typography.fontWeight?.semibold || '600',
            color: isDark ? '#F9FAFB' : primaryText,
        },
        verifiedInline: {
            flexShrink: 0,
            paddingLeft: 2,
        },
        specialtyText: {
            fontSize: typography.fontSize?.xs || 11,
            lineHeight: Math.round((typography.fontSize?.xs || 11) * 1.35),
            color: isDark ? 'rgba(255,255,255,0.55)' : tertiary,
            marginBottom: cardGap,
            minHeight: Math.round((typography.fontSize?.xs || 11) * 1.35) * 2,
        },
        tierRow: {
            marginBottom: cardGap,
        },
        tierPill: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            maxWidth: '100%',
            paddingHorizontal: spacing.sm ?? 10,
            paddingVertical: spacing.xs ?? 5,
            borderRadius: radiusPill,
            borderWidth: borders.width?.thin ?? 1,
        },
        tierPillIcon: {
            marginRight: 5,
        },
        tierPillText: {
            fontSize: typography.fontSize?.xs || 11,
            fontWeight: typography.fontWeight?.bold || '700',
            letterSpacing: 0.2,
            textTransform: 'none',
        },
        footer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
        },
        distanceContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            flexShrink: 1,
            maxWidth: '100%',
        },
        distanceText: {
            flexShrink: 1,
            fontSize: typography.fontSize?.xs || 11,
            color: isDark ? 'rgba(255,255,255,0.5)' : tertiary,
            marginLeft: 4,
        },
    });
};

export default ProviderPreviewCard;
