import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Star, Wrench, Check } from 'lucide-react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import {
  getProviderImageCandidatesResolved,
  getPanelServicios,
  getProviderDistance,
  resolveProviderKpiBadge,
  isProviderRealtimeOnline,
} from '../../utils/providerUtils';
import { getProviderModalidad, modalidadLabel } from '../../utils/providerModalidad';
import { getProviderBrandCoverage } from '../../utils/providerBrandCoverage';
import { getAxiosMediaBaseSync } from '../../services/api';

/**
 * Listing card estilo Airbnb Explore:
 * - Imagen dominante con radius (sin “caja” con borde/sombra alrededor del texto)
 * - Badge blanco sobre la imagen (equivalente a “Guest favorite”)
 * - Debajo: título + ★ rating en una fila; meta gris en la siguiente
 * - Sin chips de servicios ni filas de Tag densas (eso rompe el patrón Airbnb)
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
  /* eslint-disable-next-line no-unused-vars */
  typeLabel = null,
  userBrandName = null,
  omitRightMargin = false,
  serviceOffers = null,
  /* eslint-disable-next-line no-unused-vars */
  cardFooterVariant = 'offers',
  reviews = 0,
  /* eslint-disable-next-line no-unused-vars */
  bookingsCount = null,
}) => {
  // Airbnb listing ~ cuadrado / levemente vertical
  const imageHeight = Math.max(140, Math.round(width * 0.95));
  const imageRadius = BORDERS.radius.lg;
  const styles = getStyles(width, omitRightMargin, imageHeight, imageRadius);

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

  const distanceFromProp =
    distance != null && distance !== '' && String(distance) !== '—' ? String(distance) : null;
  const distanceLabel = distanceFromProp ?? (providerRaw ? getProviderDistance(providerRaw) : null);

  const modalidadTagLabel = modalidadLabel(getProviderModalidad(providerRaw));
  const { isMultimarca, brandNames } = getProviderBrandCoverage(providerRaw);
  const specialistBrand = userBrandName || brandNames[0] || null;
  const coverageBadgeLabel = isMultimarca
    ? 'Multimarca'
    : specialistBrand
      ? `Especialista ${specialistBrand}`
      : null;

  const panelOffers =
    serviceOffers != null ? serviceOffers : providerRaw ? getPanelServicios(providerRaw) : [];
  const specialtyLine =
    specialty ||
    (panelOffers.length > 0
      ? panelOffers
          .slice(0, 2)
          .map((o) => o?.nombre || o?.name || o)
          .filter(Boolean)
          .join(' · ')
      : null);

  // Meta Airbnb: una sola línea gris (distancia · modalidad · specialty corta)
  const metaDistance =
    distanceLabel ||
    (providerRaw ? 'Sin ubicación' : null);
  const metaParts = [metaDistance, modalidadTagLabel].filter(
    (p) => p && String(p).trim() && String(p) !== '—',
  );
  const metaLine = metaParts.join(' · ') || specialtyLine || null;

  const ratingNum = rating != null && rating !== '' ? Number(rating) : NaN;
  const hasRating = Number.isFinite(ratingNum) && ratingNum > 0;
  const ratingText = hasRating
    ? ratingNum.toFixed(ratingNum % 1 === 0 ? 1 : 2)
    : null;
  const reviewsCount = Number(reviews) || 0;

  const resolvedKpi = kpiBadge ?? resolveProviderKpiBadge(providerRaw);
  const showGuestBadge = !!coverageBadgeLabel || !!resolvedKpi?.label;
  const isOnline = isProviderRealtimeOnline(providerRaw);

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.92}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={isOnline ? `${name}, conectado` : name}
    >
      <View style={styles.imageWrap}>
        {activeUri ? (
          <Image
            source={{ uri: activeUri }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            onError={onImageError}
          />
        ) : (
          <View style={styles.placeholder}>
            <Wrench size={28} color={COLORS.text.tertiary} strokeWidth={1.75} />
          </View>
        )}

        {showGuestBadge ? (
          <View style={styles.badge} accessibilityRole="text">
            <Text style={styles.badgeText} numberOfLines={1}>
              {coverageBadgeLabel || resolvedKpi.label}
            </Text>
          </View>
        ) : null}

        {isOnline ? (
          <View
            style={styles.onlineBadge}
            accessibilityRole="text"
            accessibilityLabel="Conectado"
          >
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Conectado</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={1}>
              {name}
            </Text>
            {verified ? (
              <View
                style={styles.verifiedBadge}
                accessibilityRole="image"
                accessibilityLabel="Proveedor verificado"
              >
                <Check size={10} color={COLORS.text.onPrimary} strokeWidth={3} />
              </View>
            ) : null}
          </View>
          {ratingText ? (
            <View style={styles.rating}>
              <Star
                size={12}
                color={COLORS.text.primary}
                fill={COLORS.text.primary}
                strokeWidth={0}
              />
              <Text style={styles.ratingText}>
                {ratingText}
                {reviewsCount > 0 ? ` (${reviewsCount})` : ''}
              </Text>
            </View>
          ) : null}
        </View>

        {metaLine ? (
          <Text style={styles.meta} numberOfLines={1}>
            {metaLine}
          </Text>
        ) : null}

        {specialtyLine && metaLine !== specialtyLine ? (
          <Text style={styles.meta} numberOfLines={1}>
            {specialtyLine}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (width, omitRightMargin, imageHeight, imageRadius) =>
  StyleSheet.create({
    container: {
      width,
      marginRight: omitRightMargin ? 0 : SPACING.md,
    },
    imageWrap: {
      width: '100%',
      height: imageHeight,
      borderRadius: imageRadius,
      overflow: 'hidden',
      backgroundColor: COLORS.neutral.gray[100],
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    placeholder: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.neutral.gray[100],
    },
    badge: {
      position: 'absolute',
      top: 12,
      left: 12,
      maxWidth: '72%',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: BORDERS.radius.pill,
      backgroundColor: COLORS.background.paper,
    },
    badgeText: {
      ...TYPOGRAPHY.styles.captionBold,
      color: COLORS.text.primary,
    },
    onlineBadge: {
      position: 'absolute',
      bottom: 12,
      left: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      maxWidth: '80%',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: BORDERS.radius.pill,
      backgroundColor: COLORS.background.paper,
    },
    onlineDot: {
      width: 8,
      height: 8,
      borderRadius: BORDERS.radius.full,
      backgroundColor: COLORS.success.main,
    },
    onlineText: {
      ...TYPOGRAPHY.styles.captionBold,
      color: COLORS.text.primary,
    },
    body: {
      paddingTop: 10,
      paddingHorizontal: 2,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    titleBlock: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    title: {
      flexShrink: 1,
      ...TYPOGRAPHY.styles.bodyBold,
      color: COLORS.text.primary,
    },
    verifiedBadge: {
      width: 16,
      height: 16,
      borderRadius: BORDERS.radius.full,
      backgroundColor: COLORS.primary[500],
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    rating: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      flexShrink: 0,
    },
    ratingText: {
      ...TYPOGRAPHY.styles.caption,
      color: COLORS.text.primary,
      fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    meta: {
      ...TYPOGRAPHY.styles.caption,
      color: COLORS.text.secondary,
      marginTop: 2,
    },
  });

export default React.memo(ProviderPreviewCard);
