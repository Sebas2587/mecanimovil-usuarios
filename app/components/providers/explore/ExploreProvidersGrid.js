import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../../design-system/tokens';
import ProviderPreviewCard from '../../home/ProviderPreviewCard';
import ExploreProvidersGridSkeleton from '../../utils/ExploreProvidersGridSkeleton';
import { formatProviderForCard } from '../../../utils/providerUtils';

/** Ancho mínimo aproximado de card para decidir cuántas columnas caben. */
const MIN_CARD_WIDTH = 220;
const GRID_GUTTER = SPACING.md;

function chunkRows(list, size) {
  const rows = [];
  for (let i = 0; i < list.length; i += size) {
    rows.push(list.slice(i, i + size));
  }
  return rows;
}

const ExploreProvidersGrid = ({
  inRadar = [],
  outOfRadar = [],
  noLocation = [],
  loading,
  refreshing,
  onRefresh,
  onProviderPress,
  userBrandName = null,
  emptyTitle = 'No hay proveedores',
  emptyMessage = 'Prueba otra dirección o amplía tu zona de búsqueda.',
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(null);

  const onGridLayout = useCallback((e) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0) setMeasuredWidth((prev) => (prev === w ? prev : w));
  }, []);

  // 2 columnas base; en anchos grandes (web) caben más según MIN_CARD_WIDTH.
  const availableWidth = measuredWidth ?? windowWidth;
  const columns = Math.max(2, Math.floor(availableWidth / MIN_CARD_WIDTH));
  const cardWidth = Math.floor(
    (availableWidth - GRID_GUTTER * (columns - 1)) / columns,
  );

  const renderCard = useCallback(
    (item) => {
      const { id: _pid, ...card } = formatProviderForCard(item);
      return (
        <View key={`${item._panelKind}-${item.id}`} style={{ width: cardWidth }}>
          <ProviderPreviewCard
            {...card}
            provider={item}
            userBrandName={userBrandName}
            specialty={card.specialty || null}
            serviceOffers={card.serviceOffers}
            cardFooterVariant="bookings"
            reviews={card.reviews}
            bookingsCount={card.bookingsCount}
            kpiBadge={item.kpi_badge || null}
            width={cardWidth}
            omitRightMargin
            onPress={() => onProviderPress(item)}
          />
        </View>
      );
    },
    [onProviderPress, cardWidth, userBrandName],
  );

  const renderSection = useCallback(
    (title, items) => {
      if (!items.length) return null;
      const rows = chunkRows(items, columns);
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {rows.map((row, rowIdx) => (
            <View key={`section-row-${rowIdx}`} style={styles.row}>
              {row.map(renderCard)}
              {row.length < columns
                ? Array.from({ length: columns - row.length }).map((_, i) => (
                    <View key={`row-ph-${i}`} style={{ width: cardWidth }} />
                  ))
                : null}
            </View>
          ))}
        </View>
      );
    },
    [renderCard, columns, cardWidth],
  );

  const isEmpty = inRadar.length === 0 && outOfRadar.length === 0 && noLocation.length === 0;

  const content = useMemo(() => {
    if (isEmpty) return null;
    return (
      <>
        {renderSection('Cerca de ti', inRadar)}
        {renderSection('Fuera de tu zona', outOfRadar)}
        {renderSection('Sin ubicación', noLocation)}
      </>
    );
  }, [inRadar, outOfRadar, noLocation, isEmpty, renderSection]);

  return (
    <ScrollView
      style={styles.scroll}
      onLayout={onGridLayout}
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
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    letterSpacing: -0.25,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: GRID_GUTTER,
    marginBottom: GRID_GUTTER,
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
