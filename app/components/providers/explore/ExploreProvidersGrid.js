import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../../design-system/tokens';
import ProviderPreviewCard from '../../home/ProviderPreviewCard';
import ExploreProvidersGridSkeleton from '../../utils/ExploreProvidersGridSkeleton';
import { formatProviderForCard } from '../../../utils/providerUtils';
import { CARD_GAP, GRID_CARD_W } from '../../home/shared/homeLayoutConstants';

function chunkPairs(list) {
  const pairs = [];
  for (let i = 0; i < list.length; i += 2) {
    pairs.push(list.slice(i, i + 2));
  }
  return pairs;
}

const ExploreProvidersGrid = ({
  inRadar = [],
  outOfRadar = [],
  loading,
  refreshing,
  onRefresh,
  onProviderPress,
  emptyTitle = 'No hay proveedores',
  emptyMessage = 'Prueba otra dirección o amplía tu zona de búsqueda.',
}) => {
  const renderCard = useCallback(
    (item) => {
      const { id: _pid, ...card } = formatProviderForCard(item);
      const kindLabel = item._panelKind === 'taller' ? 'Taller' : 'A domicilio';
      return (
        <View key={`${item._panelKind}-${item.id}`} style={styles.cell}>
          <ProviderPreviewCard
            {...card}
            provider={item}
            typeLabel={kindLabel}
            specialty={card.specialty || 'Servicios y diagnóstico'}
            serviceOffers={card.serviceOffers}
            cardFooterVariant="bookings"
            reviews={card.reviews}
            bookingsCount={card.bookingsCount}
            kpiBadge={item.kpi_badge || null}
            appearance="light"
            width={GRID_CARD_W}
            omitRightMargin
            onPress={() => onProviderPress(item)}
          />
        </View>
      );
    },
    [onProviderPress],
  );

  const renderSection = useCallback(
    (title, hint, icon, items) => {
      if (!items.length) return null;
      const pairs = chunkPairs(items);
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            {icon}
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>{title}</Text>
              {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
            </View>
          </View>
          {pairs.map((pair, pageIdx) => (
            <View key={`section-page-${pageIdx}`} style={styles.columnWrap}>
              {pair.map(renderCard)}
              {pair.length === 1 ? <View style={styles.cellPlaceholder} /> : null}
            </View>
          ))}
        </View>
      );
    },
    [renderCard],
  );

  const isEmpty = inRadar.length === 0 && outOfRadar.length === 0;

  const content = useMemo(() => {
    if (isEmpty) return null;
    return (
      <>
        {renderSection(
          'Cerca de ti',
          'Recomendados por distancia y desempeño en tu zona.',
          <Navigation size={16} color={COLORS.primary[500]} />,
          inRadar,
        )}
        {renderSection(
          'Fuera de tu zona',
          'Técnicos compatibles con tu vehículo, más allá del radio desde tu dirección.',
          <MapPin size={16} color={COLORS.text.tertiary} />,
          outOfRadar,
        )}
      </>
    );
  }, [inRadar, outOfRadar, isEmpty, renderSection]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.listContent, isEmpty && !loading && styles.listContentEmpty]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[500]}
          />
        ) : undefined
      }
    >
      {loading && isEmpty ? <ExploreProvidersGridSkeleton sections={1} rowsPerSection={3} /> : null}
      {content}
      {isEmpty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptyMessage}>{emptyMessage}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    letterSpacing: -0.25,
  },
  sectionHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 17,
    marginTop: 2,
  },
  columnWrap: {
    flexDirection: 'row',
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  cell: {
    width: GRID_CARD_W,
  },
  cellPlaceholder: {
    width: GRID_CARD_W,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default React.memo(ExploreProvidersGrid);
