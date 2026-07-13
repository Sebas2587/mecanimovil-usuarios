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
import { HomePanelCard } from '../shared/HomePanelCard';
import HomeSectionHeader from '../shared/HomeSectionHeader';
import ProviderPreviewCard from '../ProviderPreviewCard';
import { formatProviderForCard } from '../../../utils/providerUtils';
import { CARD_GAP, H_PAD } from '../shared/homeLayoutConstants';

/**
 * Carrusel horizontal 2×N de proveedores con encabezado y estados vacío/carga.
 */
const HomeProvidersCarouselSection = ({
  icon,
  title,
  hint,
  providers = [],
  loading,
  emptyRequiresAddress = false,
  hasSelectedAddress = true,
  emptyNoAddressMessage,
  emptyNoResultsMessage,
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

  const showSeeAll =
    !!onSeeAll &&
    !loading &&
    (seeAllWhen != null ? seeAllWhen : providers.length > 0 || hasSelectedAddress);

  const showContent = !emptyRequiresAddress || hasSelectedAddress;

  const showHeader = !!(icon || title || hint || showSeeAll);

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
          icon={icon}
          title={title}
          hint={hint}
          onSeeAll={showSeeAll ? onSeeAll : undefined}
          seeAllDisabled={!showSeeAll}
        />
      ) : null}

      {!showContent ? (
        <HomePanelCard innerStyle={styles.emptyCard}>
          <Text style={styles.emptyText}>{emptyNoAddressMessage}</Text>
        </HomePanelCard>
      ) : loading ? (
        <HomeProvidersCarouselSkeleton />
      ) : providers.length === 0 ? (
        <HomePanelCard innerStyle={styles.emptyCard}>
          <Text style={styles.emptyText}>{emptyNoResultsMessage}</Text>
        </HomePanelCard>
      ) : (
        <ScrollView
          horizontal
          pagingEnabled={Platform.OS !== 'web'}
          decelerationRate={Platform.OS === 'web' ? undefined : 'fast'}
          snapToInterval={Platform.OS === 'web' ? undefined : nearbyPageWidth}
          snapToAlignment={Platform.OS === 'web' ? undefined : 'start'}
          showsHorizontalScrollIndicator={Platform.OS !== 'web'}
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
                return (
                  <ProviderPreviewCard
                    key={`${p._panelKind}-${p.id}`}
                    {...card}
                    provider={p}
                    specialty={card.specialty || null}
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
  emptyCard: {
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
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
