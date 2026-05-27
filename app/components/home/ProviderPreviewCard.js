import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
import {
  getProviderImageCandidatesResolved,
  getPanelServicios,
  getProviderCompletedServicesCount,
  getProviderDistance,
  resolveProviderKpiBadge,
} from '../../utils/providerUtils';
import ProviderKpiTierBadge from '../provider/ProviderKpiTierBadge';
import ProviderServiceChipsRow from './ProviderServiceChipsRow';
import ProviderCardRatingBadge from './ProviderCardRatingBadge';
import { getAxiosMediaBaseSync } from '../../services/api';

/**
 * Card compacta de proveedor (lista horizontal / grid).
 * Coinbase-light: paper + hairline + ink. La prop `appearance` se mantiene por
 * compatibilidad pero ya no produce variantes oscuras (todo es claro).
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
  /* eslint-disable-next-line no-unused-vars */
  appearance = 'light',
  typeLabel = null,
  omitRightMargin = false,
  serviceOffers = null,
  /** 'offers' = chips de servicios; 'bookings' = contrataciones (Destacados / Cerca en home). */
  cardFooterVariant = 'offers',
  reviews = 0,
  bookingsCount = null,
}) => {
  const imageHeight = Math.max(96, Math.round(width * 0.54));
  const containerRadius = BORDERS.radius.card?.lg ?? BORDERS.radius.lg;
  const styles = getStyles(width, omitRightMargin, imageHeight, containerRadius);

  const mediaBaseHint = getAxiosMediaBaseSync() || '';

  const uris = useMemo(() => {
    if (providerRaw) {
      const fromApi = getProviderImageCandidatesResolved(providerRaw);
      if (fromApi.length > 0) return fromApi;
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
  const distanceFromProp =
    distance != null && distance !== '' && String(distance) !== '—' ? String(distance) : null;
  const distanceLabel = distanceFromProp ?? (providerRaw ? getProviderDistance(providerRaw) : null) ?? '—';
  const useSocialMetrics = cardFooterVariant === 'bookings';
  const reviewsCount = Number(reviews) || 0;
  const resolvedBookings =
    bookingsCount != null
      ? Math.max(0, Math.floor(Number(bookingsCount) || 0))
      : providerRaw
        ? getProviderCompletedServicesCount(providerRaw)
        : 0;

  const panelOffers =
    serviceOffers != null ? serviceOffers : providerRaw ? getPanelServicios(providerRaw) : [];
  const showOfferChips = !useSocialMetrics && panelOffers.length > 0;
  const showBookingsBadge = useSocialMetrics && resolvedBookings > 0;
  const showSpecialtyFallback = !showOfferChips && !showBookingsBadge;
  const compactMetrics = width < 180;

  const resolvedKpiBadge = kpiBadge ?? resolveProviderKpiBadge(providerRaw);
  const verifiedColor = COLORS.primary[500];

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.imageContainer}>
        {activeUri ? (
          <Image
            source={{ uri: activeUri }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            onError={onImageError}
          />
        ) : null}
        {!activeUri ? (
          <View style={styles.placeholderImage}>
            <Ionicons name="person" size={32} color={COLORS.text.tertiary} />
          </View>
        ) : null}

        {typeLabel ? (
          <View style={styles.typeChip}>
            <Text style={styles.typeChipText} numberOfLines={1}>
              {typeLabel}
            </Text>
          </View>
        ) : null}

        {/* Badge multimarca sobre la imagen */}
        {(providerRaw?._esMultimarca || providerRaw?.tipo_cobertura_marca === 'multimarca') ? (
          <View style={styles.multimarcaChip}>
            <Text style={styles.multimarcaChipText}>🌐 Multimarca</Text>
          </View>
        ) : null}

        <ProviderKpiTierBadge
          kpiBadge={resolvedKpiBadge}
          provider={providerRaw}
          trustBadgeFields
          variant="floating"
          style={styles.kpiFloating}
        />
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
        {showOfferChips ? (
          <ProviderServiceChipsRow offers={panelOffers} compact={compactMetrics} />
        ) : null}
        {showBookingsBadge ? (
          <ProviderServiceChipsRow
            variant="bookings"
            bookingsCount={resolvedBookings}
            compact={compactMetrics}
          />
        ) : null}
        {showSpecialtyFallback ? (
          <Text style={styles.specialtyText} numberOfLines={2}>
            {specialty}
          </Text>
        ) : null}

        <View style={styles.ratingDistanceRow}>
          {useSocialMetrics ? (
            <ProviderCardRatingBadge
              rating={rating}
              reviewsCount={reviewsCount}
              compact={compactMetrics}
            />
          ) : (
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={11} color={COLORS.warning.main} />
              <Text style={styles.ratingPillText}>{ratingLabel}</Text>
            </View>
          )}
          <View style={styles.distanceContainer}>
            <Ionicons name="location-outline" size={12} color={COLORS.text.tertiary} />
            <Text style={styles.distanceText} numberOfLines={1}>
              {distanceLabel}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (width, omitRightMargin, imageHeight, containerRadius) =>
  StyleSheet.create({
    container: {
      width: width,
      backgroundColor: COLORS.background.paper,
      borderRadius: containerRadius,
      marginRight: omitRightMargin ? 0 : SPACING.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: COLORS.border.light,
      ...SHADOWS.sm,
    },
    imageContainer: {
      height: imageHeight,
      width: '100%',
      backgroundColor: COLORS.neutral.gray[100],
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
      backgroundColor: 'rgba(255,255,255,0.95)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: BORDERS.radius.full,
      borderWidth: 1,
      borderColor: COLORS.border.light,
      maxWidth: '72%',
    },
    typeChipText: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontWeight: TYPOGRAPHY.fontWeight.semibold,
      color: COLORS.text.primary,
    },
    multimarcaChip: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      backgroundColor: 'rgba(0,82,255,0.90)',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: BORDERS.radius.full,
      maxWidth: '80%',
    },
    multimarcaChipText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    kpiFloating: {
      position: 'absolute',
      top: 8,
      right: 8,
      zIndex: 4,
    },
    content: {
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 12,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    nameText: {
      flex: 1,
      minWidth: 0,
      fontSize: TYPOGRAPHY.fontSize.base,
      fontWeight: TYPOGRAPHY.fontWeight.semibold,
      color: COLORS.text.primary,
    },
    verifiedInline: {
      flexShrink: 0,
      paddingLeft: 2,
    },
    specialtyText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      lineHeight: 16,
      color: COLORS.text.secondary,
      marginBottom: 6,
    },
    ratingDistanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 2,
      marginBottom: 0,
    },
    ratingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 0,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: BORDERS.radius.full,
      borderWidth: 1,
      borderColor: COLORS.border.light,
      backgroundColor: COLORS.neutral.gray[100],
    },
    ratingPillText: {
      marginLeft: 4,
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontWeight: TYPOGRAPHY.fontWeight.semibold,
      color: COLORS.text.primary,
    },
    distanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flexShrink: 1,
      flexGrow: 1,
      minWidth: 0,
    },
    distanceText: {
      flexShrink: 1,
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: COLORS.text.tertiary,
      marginLeft: 4,
      textAlign: 'right',
    },
  });

export default ProviderPreviewCard;
