import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { HomeProvidersCarouselSkeleton } from '../../utils/HomePanelSkeletons';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../design-system/tokens';
import HomeSectionHeader from '../shared/HomeSectionHeader';
import HomeSectionSeeAll from '../shared/HomeSectionSeeAll';
import ProviderPreviewCard from '../ProviderPreviewCard';
import { formatProviderForCard } from '../../../utils/providerUtils';
import { getSpecialtyForBrandContext } from '../../../utils/providerBrandCoverage';
import { CARD_GAP, H_PAD } from '../shared/homeLayoutConstants';

/**
 * Empty Airbnb Explore: sin card/borde — título corto + cuerpo + enlace textual opcional.
 */
function AirbnbSectionEmpty({ title, message, actionLabel, onAction }) {
  if (!message && !title) return null;
  return (
    <View style={styles.emptyState} accessibilityRole="text">
      {title ? (
        <Text style={styles.emptyTitle} numberOfLines={2}>
          {title}
        </Text>
      ) : null}
      {message ? <Text style={styles.emptyBody}>{message}</Text> : null}
      {onAction && actionLabel ? (
        <View style={styles.emptyAction}>
          <HomeSectionSeeAll onPress={onAction} label={actionLabel} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Carrusel horizontal 2×N de proveedores con encabezado y estados vacío/carga.
 */
const HomeProvidersCarouselSection = ({
  title,
  providers = [],
  loading,
  emptyRequiresAddress = false,
  hasSelectedAddress = true,
  emptyTitle = null,
  emptyNoAddressTitle = null,
  emptyNoAddressMessage,
  emptyNoResultsMessage,
  /** CTA bajo el empty (texto + chevron Airbnb). Si no hay, se omite. */
  emptyActionLabel = null,
  onProviderPress,
  onSeeAll,
  seeAllWhen,
  /** Espacio extra arriba cuando la sección sigue a otro carrusel del feed */
  spacingTop = false,
  /** 'offers' | 'bookings' — footer de ProviderPreviewCard */
  cardFooterVariant = 'offers',
  /** Marca del vehículo del usuario, para el tag «Especialista {Marca}». */
  userBrandName = null,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  /** En web el panel usa LAYOUT_WIDTH (máx. 480); SCREEN_WIDTH del navegador generaba overflow horizontal. */
  const nearbyPageWidth =
    Platform.OS === 'web' ? Math.min(windowWidth, 480) : windowWidth;
  /** Mitad del ancho de página menos gutters (responsive; GRID_CARD_W fijo rompía en web). */
  const nearbyCardW = (nearbyPageWidth - H_PAD * 2 - CARD_GAP) / 2;

  const nearbyPages = useMemo(() => {
    const list = providers;
    const pages = [];
    for (let i = 0; i < list.length; i += 2) {
      pages.push(list.slice(i, i + 2));
    }
    return pages;
  }, [providers]);

  const showContent = !emptyRequiresAddress || hasSelectedAddress;
  const isEmpty = showContent && !loading && providers.length === 0;

  /** Airbnb: «Ver todos» solo cuando hay listings; el empty usa su propio enlace. */
  const showSeeAll =
    !!onSeeAll &&
    !loading &&
    !isEmpty &&
    (seeAllWhen != null ? seeAllWhen : providers.length > 0);

  const showHeader = !!(title || showSeeAll);

  return (
    <View
      style={[
        styles.section,
        spacingTop && styles.sectionTop,
        !showHeader && styles.sectionFlush,
      ]}
    >
      {showHeader ? (
        <HomeSectionHeader
          title={title}
          onSeeAll={showSeeAll ? onSeeAll : undefined}
          seeAllDisabled={!showSeeAll}
        />
      ) : null}

      {!showContent ? (
        <AirbnbSectionEmpty
          title={emptyNoAddressTitle || emptyTitle}
          message={emptyNoAddressMessage}
          actionLabel={emptyActionLabel}
          onAction={onSeeAll}
        />
      ) : loading ? (
        <HomeProvidersCarouselSkeleton />
      ) : providers.length === 0 ? (
        <AirbnbSectionEmpty
          title={emptyTitle}
          message={emptyNoResultsMessage}
          actionLabel={emptyActionLabel}
          onAction={onSeeAll}
        />
      ) : (
        <ScrollView
          horizontal
          pagingEnabled={Platform.OS !== 'web'}
          decelerationRate={Platform.OS === 'web' ? undefined : 'fast'}
          snapToInterval={Platform.OS === 'web' ? undefined : nearbyPageWidth}
          snapToAlignment={Platform.OS === 'web' ? undefined : 'start'}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={Platform.OS === 'web' ? styles.carouselWeb : styles.carouselBleed}
        >
          {nearbyPages.map((pair, pageIdx) => (
            <View
              key={`carousel-page-${pageIdx}`}
              style={[styles.page, { width: nearbyPageWidth }]}
            >
              {pair.map((p) => {
                const { id: _pid, ...card } = formatProviderForCard(p);
                const specialty = userBrandName
                  ? getSpecialtyForBrandContext(p, card.serviceOffers)
                  : card.specialty || null;
                return (
                  <ProviderPreviewCard
                    key={`${p._panelKind}-${p.id}`}
                    {...card}
                    provider={p}
                    specialty={specialty}
                    serviceOffers={card.serviceOffers}
                    cardFooterVariant={cardFooterVariant}
                    reviews={card.reviews}
                    bookingsCount={card.bookingsCount}
                    kpiBadge={p.kpi_badge || null}
                    userBrandName={userBrandName}
                    width={nearbyCardW}
                    omitRightMargin
                    onPress={() => onProviderPress(p)}
                  />
                );
              })}
              {pair.length === 1 ? <View style={{ width: nearbyCardW }} /> : null}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTop: {
    marginTop: SPACING.lg,
  },
  sectionFlush: {
    marginBottom: 0,
  },
  /** Vacío Airbnb: flush bajo el header, sin caja ni sombra. */
  emptyState: {
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
    gap: 6,
    maxWidth: 360,
  },
  emptyTitle: {
    ...TYPOGRAPHY.styles.bodyBold,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    letterSpacing: -0.2,
  },
  emptyBody: {
    ...TYPOGRAPHY.styles.body,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  emptyAction: {
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
    marginLeft: -8,
  },
  carouselBleed: {
    marginHorizontal: -H_PAD,
  },
  carouselWeb: {
    marginHorizontal: -H_PAD,
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  page: {
    paddingHorizontal: H_PAD,
    flexDirection: 'row',
    gap: CARD_GAP,
  },
});

export default React.memo(HomeProvidersCarouselSection);
