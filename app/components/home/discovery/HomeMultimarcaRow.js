import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Globe } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../../design-system/tokens';
import HomeProvidersCarouselSection from './HomeProvidersCarouselSection';

/**
 * Sección horizontal de proveedores multimarca.
 * Estos proveedores atienden cualquier marca de vehículo y siempre son
 * relevantes para el usuario, independientemente de la marca de su auto.
 */
const HomeMultimarcaRow = ({
  providers = [],
  loading,
  onProviderPress,
  onSeeAll,
}) => {
  if (!loading && providers.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.badgeRow}>
        <Globe size={14} color={COLORS.primary[500]} />
        <Text style={styles.badgeText}>Proveedores Multimarca</Text>
      </View>
      <HomeProvidersCarouselSection
        title="Multimarca — Atienden tu auto"
        hint="Profesionales que trabajan con cualquier marca de vehículo."
        cardFooterVariant="bookings"
        providers={providers}
        loading={loading}
        emptyRequiresAddress={false}
        hasSelectedAddress
        emptyNoResultsMessage="No hay proveedores multimarca disponibles en este momento."
        onProviderPress={onProviderPress}
        onSeeAll={onSeeAll}
        seeAllWhen={!loading && providers.length > 0}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: '600',
    color: COLORS.primary[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default React.memo(HomeMultimarcaRow);
