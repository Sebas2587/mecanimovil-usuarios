import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { COLORS, TYPOGRAPHY } from '../../../design-system/tokens';
import { HomePanelCard } from '../shared/HomePanelCard';
import HomeSectionHeader from '../shared/HomeSectionHeader';
import ProviderPreviewCard from '../ProviderPreviewCard';
import { formatProviderForCard } from '../../../utils/providerUtils';
import { CARD_GAP, GRID_CARD_W, H_PAD, SCREEN_WIDTH } from '../shared/homeLayoutConstants';

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
}) => {
  const nearbyPageWidth = SCREEN_WIDTH;
  const nearbyCardW = GRID_CARD_W;

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

  return (
    <View style={styles.section}>
      <HomeSectionHeader
        icon={icon}
        title={title}
        hint={hint}
        onSeeAll={showSeeAll ? onSeeAll : undefined}
        seeAllDisabled={!showSeeAll}
      />

      {!showContent ? (
        <HomePanelCard innerStyle={styles.emptyCard}>
          <Text style={styles.emptyText}>{emptyNoAddressMessage}</Text>
        </HomePanelCard>
      ) : loading ? (
        <HomePanelCard innerStyle={styles.loadingCard}>
          <ActivityIndicator color={COLORS.primary[500]} />
        </HomePanelCard>
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
          showsHorizontalScrollIndicator
          keyboardShouldPersistTaps="handled"
          style={Platform.OS === 'web' ? styles.carouselWeb : undefined}
        >
          {nearbyPages.map((pair, pageIdx) => (
            <View
              key={`carousel-page-${pageIdx}`}
              style={[styles.page, { width: nearbyPageWidth }]}
            >
              {pair.map((p) => {
                const { id: _pid, ...card } = formatProviderForCard(p);
                const kindLabel = p._panelKind === 'taller' ? 'Taller' : 'A domicilio';
                return (
                  <ProviderPreviewCard
                    key={`${p._panelKind}-${p.id}`}
                    {...card}
                    provider={p}
                    typeLabel={kindLabel}
                    specialty={card.specialty || 'Servicios y diagnóstico'}
                    serviceOffers={card.serviceOffers}
                    kpiBadge={p.kpi_badge || null}
                    appearance="light"
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
    marginBottom: 18,
  },
  emptyCard: {
    paddingVertical: 16,
  },
  loadingCard: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  carouselWeb: {
    overflow: 'scroll',
  },
  page: {
    paddingHorizontal: H_PAD,
    flexDirection: 'row',
    gap: CARD_GAP,
  },
});

export default React.memo(HomeProvidersCarouselSection);
