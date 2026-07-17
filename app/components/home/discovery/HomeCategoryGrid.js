import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Image as RNImage,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Skeleton from '../../feedback/Skeleton/Skeleton';
import { HomeCategoryGridSkeleton } from '../../utils/HomePanelSkeletons';
import { useQuery } from '@tanstack/react-query';
import {
  getMainCategories,
  getMainCategoriesForUserVehicles,
} from '../../../services/categories';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../../design-system/tokens';
import { resolveCategoryVisual } from '../shared/homeCategoryIcons';
import { H_PAD } from '../shared/homeLayoutConstants';
import { resolveToAbsoluteMediaUrl } from '../../../utils/providerUtils';

const VISIBLE_CATEGORIES = 6;
/** Airbnb Explore: celda con espacio para nombres largos en 2–3 líneas. */
const CELL_WIDTH = 104;
/** Slot Explore: imagen recortada por API llena el área; Lucide va en círculo tonal. */
const ICON_SIZE = 56;
/** Bump: v4 = list sin cache server + URL con hash de archivo. */
const CATEGORIES_QUERY_VERSION = 'v4-imagen-prod';

/** En web RN Image es más fiable con PNG cross-origin; nativo usa expo-image. */
const CategoryRemoteImage = Platform.OS === 'web' ? RNImage : ExpoImage;

function vehiclesQueryKey(vehicles) {
  return (Array.isArray(vehicles) ? vehicles : [])
    .map((v) => v?.id)
    .filter(Boolean)
    .sort((a, b) => a - b)
    .join(',');
}

function CategoryIcon({ cat }) {
  const visual = resolveCategoryVisual(cat);
  const { Icon } = visual;
  const imageUri = resolveToAbsoluteMediaUrl(cat.imagen_url || cat.imagen || null);
  const [failed, setFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    setFailed(false);
    setRetryToken(0);
  }, [imageUri]);

  const handleError = useCallback(() => {
    if (retryToken < 1) {
      // Un reintento: cold start de Render / race de deploy.
      setRetryToken((n) => n + 1);
      return;
    }
    setFailed(true);
  }, [retryToken]);

  const showImage = Boolean(imageUri) && !failed;
  const uriWithRetry =
    showImage && retryToken > 0
      ? `${imageUri}${imageUri.includes('?') ? '&' : '?'}r=${retryToken}`
      : imageUri;

  // Explore: glifo PNG transparente a tamaño de slot.
  // Fallback: círculo tonal + Lucide outline.
  if (showImage) {
    const imageProps =
      Platform.OS === 'web'
        ? {
            source: { uri: uriWithRetry },
            style: styles.iconImage,
            resizeMode: 'contain',
            onError: handleError,
          }
        : {
            source: { uri: uriWithRetry },
            style: styles.iconImage,
            contentFit: 'contain',
            transition: 180,
            cachePolicy: 'memory-disk',
            recyclingKey: uriWithRetry,
            accessibilityIgnoresInvertColors: true,
            onError: handleError,
          };

    return (
      <View style={styles.iconSlot}>
        <CategoryRemoteImage key={uriWithRetry} {...imageProps} />
      </View>
    );
  }

  return (
    <View style={[styles.iconCircle, { backgroundColor: visual.bg }]}>
      <Icon size={22} color={visual.color} strokeWidth={1.75} fill="none" />
    </View>
  );
}

/**
 * Categorías del home — patrón Airbnb Explore (imagen o Lucide + caption).
 */
const HomeCategoryGrid = ({ disabled, onSelectCategory, vehicles = [] }) => {
  const vehicleIdsKey = useMemo(() => vehiclesQueryKey(vehicles), [vehicles]);
  const hasVehicles = vehicleIdsKey.length > 0;

  const {
    data: categoriesRaw,
    isPending,
    isFetching,
  } = useQuery({
    queryKey: hasVehicles
      ? ['mainCategoriesForVehicles', CATEGORIES_QUERY_VERSION, vehicleIdsKey]
      : ['mainCategories', CATEGORIES_QUERY_VERSION],
    queryFn: () =>
      hasVehicles
        ? getMainCategoriesForUserVehicles(vehicles, { forceRefresh: true })
        : getMainCategories({ forceRefresh: true }),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: 'always',
  });

  const categories = useMemo(() => {
    const list = Array.isArray(categoriesRaw) ? categoriesRaw : [];
    return list.slice(0, VISIBLE_CATEGORIES);
  }, [categoriesRaw]);

  const showInitialLoader = isPending;
  const showInlineRefetch = !isPending && isFetching && categories.length > 0;

  if (showInitialLoader) {
    return <HomeCategoryGridSkeleton />;
  }

  if (categories.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.emptyHint}>
          {hasVehicles
            ? 'No hay categorías disponibles en este momento.'
            : 'Registra un vehículo para ver categorías de servicios.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {showInlineRefetch ? (
        <View style={styles.refetchIndicator}>
          <Skeleton width={20} height={20} borderRadius={10} />
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.carouselBleed}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={String(cat.id)}
            style={styles.cell}
            onPress={() => onSelectCategory?.(cat)}
            activeOpacity={0.85}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={cat.nombre || 'Categoría'}
          >
            <CategoryIcon cat={cat} />
            <Text style={styles.label} numberOfLines={2}>
              {cat.nombre || 'Categoría'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: SPACING.lg,
  },
  refetchIndicator: {
    position: 'absolute',
    right: 4,
    top: 4,
    zIndex: 1,
  },
  emptyHint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  carouselBleed: {
    marginHorizontal: -H_PAD,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingHorizontal: H_PAD,
    paddingRight: H_PAD + SPACING.sm,
  },
  cell: {
    width: CELL_WIDTH,
    alignItems: 'center',
    paddingVertical: SPACING.xxs,
  },
  iconSlot: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    backgroundColor: 'transparent',
  },
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: BORDERS.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.neutral.gray[100],
    overflow: 'hidden',
  },
  iconImage: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? { display: 'block' } : null),
  },
  /**
   * Airbnb Homes category strip: caption_12_16 + medium (Cereal ≈ Poppins).
   */
  label: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
    textAlign: 'center',
    width: '100%',
  },
});

export default React.memo(HomeCategoryGrid);
