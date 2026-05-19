import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Wrench } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY } from '../../../design-system/tokens';
import ProviderPreviewCard from '../../home/ProviderPreviewCard';
import { formatProviderForCard } from '../../../utils/providerUtils';
import { CARD_GAP, GRID_CARD_W } from '../../home/shared/homeLayoutConstants';

const ExploreProvidersGrid = ({
  providers = [],
  loading,
  refreshing,
  onRefresh,
  onProviderPress,
  emptyTitle = 'No hay proveedores',
  emptyMessage = 'Prueba otra dirección o amplía tu zona de búsqueda.',
}) => {
  const renderItem = useCallback(
    ({ item }) => {
      const { id: _pid, ...card } = formatProviderForCard(item);
      const kindLabel = item._panelKind === 'taller' ? 'Taller' : 'A domicilio';
      return (
        <View style={styles.cell}>
          <ProviderPreviewCard
            {...card}
            provider={item}
            typeLabel={kindLabel}
            specialty={card.specialty || 'Servicios y diagnóstico'}
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

  if (loading && providers.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
        <Text style={styles.loadingText}>Buscando proveedores cercanos...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={providers}
      keyExtractor={(item) => `${item._panelKind}-${item.id}`}
      renderItem={renderItem}
      numColumns={2}
      columnWrapperStyle={providers.length > 0 ? styles.columnWrap : undefined}
      contentContainerStyle={[
        styles.listContent,
        providers.length === 0 && styles.listContentEmpty,
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[500]}
          />
        ) : undefined
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Wrench size={40} color={COLORS.text.tertiary} />
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptyMessage}>{emptyMessage}</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  columnWrap: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  cell: {
    width: GRID_CARD_W,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
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
