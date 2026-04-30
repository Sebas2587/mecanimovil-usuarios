import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';
import { withOpacity } from '../../design-system/tokens/colors';
import { getKpiTierPresentation, getProviderImageCandidatesResolved } from '../../utils/providerUtils';
import { getAxiosMediaBaseSync } from '../../services/api';

/**
 * Card compacta de proveedor (lista horizontal / grid).
 * @param {'light'|'dark'} appearance — `dark` para paneles con fondo oscuro (ej. UserPanel).
 * @param {string|null} typeLabel — "Taller" o "A domicilio" (chip sobre la foto).
 * @param {object|null} kpiBadge — pill flotante arriba-derecha en la foto (semi-transparente).
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
    const containerRadius = isDark ? 20 : borders.radius?.card?.md ?? borders.radius?.lg ?? 12;
    const contentPadH = isDark ? 10 : Math.min(cardPad, 14);
    const contentPadV = isDark ? 8 : Math.min(cardPad, 14);
    const stackGap = isDark ? 4 : 6;
    const styles = getStyles(
        colors,
        typography,
        spacing,
        borders,
        width,
        isDark,
        omitRightMargin,
        imageHeight,
        contentPadH,
        contentPadV,
        stackGap,
        containerRadius
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
    const kpiFloatBg = kpiPresentation
        ? withOpacity(kpiPresentation.bg_color, isDark ? 0.88 : 0.9)
        : undefined;
    const kpiFloatBorder = kpiPresentation
        ? withOpacity(kpiPresentation.border_color, isDark ? 0.92 : 0.95)
        : undefined;
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

                {showTier ? (
                    <View
                        style={[styles.kpiFloating, isDark && styles.kpiFloatingDark]}
                        pointerEvents="none"
                        accessibilityLabel={`Nivel ${kpiPresentation.label}`}
                    >
                        <View
                            style={[
                                styles.kpiFloatingInner,
                                {
                                    backgroundColor: kpiFloatBg,
                                    borderColor: kpiFloatBorder,
                                },
                            ]}
                        >
                            <Ionicons
                                name="ribbon-outline"
                                size={11}
                                color={kpiPresentation.text_color}
                                style={styles.kpiFloatingIcon}
                            />
                            <Text
                                style={[styles.kpiFloatingText, { color: kpiPresentation.text_color }]}
                                numberOfLines={1}
                            >
                                {kpiPresentation.label}
                            </Text>
                        </View>
                    </View>
                ) : null}
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

                <View style={styles.ratingRow}>
                    <View style={[styles.ratingPill, isDark && styles.ratingPillDark]}>
                        <Ionicons name="star" size={11} color="#F59E0B" />
                        <Text style={[styles.ratingPillText, isDark && styles.ratingPillTextDark]}>{ratingLabel}</Text>
                    </View>
                </View>

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
    contentPadH,
    contentPadV,
    stackGap,
    containerRadius
) => {
    const paper = colors.background?.paper || '#FFFFFF';
    const primaryText = colors.text?.primary || '#111827';
    const tertiary = colors.text?.tertiary || '#6B7280';
    const radiusPill = borders.radius?.badge?.md ?? 8;

    return StyleSheet.create({
        container: {
            width: width,
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : paper,
            borderRadius: containerRadius,
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
        kpiFloating: {
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 4,
            maxWidth: '56%',
            alignItems: 'flex-end',
        },
        kpiFloatingDark: {
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.35,
                    shadowRadius: 6,
                },
                android: { elevation: 4 },
                default: {},
            }),
        },
        kpiFloatingInner: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 10,
            borderWidth: 1,
        },
        kpiFloatingIcon: {
            marginRight: 4,
        },
        kpiFloatingText: {
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.2,
            flexShrink: 1,
        },
        content: {
            paddingHorizontal: contentPadH,
            paddingTop: contentPadV,
            paddingBottom: contentPadV,
        },
        nameRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginBottom: stackGap,
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
            lineHeight: Math.round((typography.fontSize?.xs || 11) * 1.32),
            color: isDark ? 'rgba(255,255,255,0.55)' : tertiary,
            marginBottom: stackGap,
        },
        ratingRow: {
            marginBottom: stackGap,
        },
        ratingPill: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: radiusPill,
            borderWidth: borders.width?.thin ?? 1,
            borderColor: colors.border?.light || '#E5E7EB',
            backgroundColor: 'rgba(255,255,255,0.92)',
        },
        ratingPillDark: {
            backgroundColor: 'rgba(15,23,42,0.88)',
            borderColor: 'rgba(255,255,255,0.14)',
        },
        ratingPillText: {
            marginLeft: 4,
            fontSize: typography.fontSize?.xs || 11,
            fontWeight: typography.fontWeight?.bold || '700',
            color: primaryText,
        },
        ratingPillTextDark: {
            color: '#F9FAFB',
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
