import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MapPin, Wrench, Building2 } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';

/**
 * Dropdown de sugerencias estilo Airbnb bajo el search pill.
 */
const GuestSearchSuggestions = ({
  visible,
  loading,
  query,
  serviceOffers = [],
  providers = [],
  onSelectService,
  onSelectProvider,
  onSeeAllResults,
}) => {
  if (!visible) return null;

  const hasServices = serviceOffers.length > 0;
  const hasProviders = providers.length > 0;
  const empty = !loading && !hasServices && !hasProviders;

  return (
    <View style={styles.panel}>
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={COLORS.primary[500]} />
          <Text style={styles.loadingText}>Buscando…</Text>
        </View>
      ) : empty ? (
        <View style={styles.emptyRow}>
          <Text style={styles.emptyText}>
            Sin resultados para “{query}”. Prueba otro taller o servicio.
          </Text>
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {hasServices ? (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Servicios</Text>
              {serviceOffers.slice(0, 5).map((offer) => {
                const name =
                  offer.servicio?.nombre || offer.servicio?.servicio_nombre || 'Servicio';
                const provider = offer.provider?.nombre;
                return (
                  <TouchableOpacity
                    key={`sug-svc-${offer.servicio_id}-${offer.oferta_id}`}
                    style={styles.row}
                    onPress={() => onSelectService?.(offer)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.iconWrap, styles.iconService]}>
                      <Wrench size={18} color={COLORS.icon.active} strokeWidth={2} />
                    </View>
                    <View style={styles.textCol}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {name}
                      </Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {provider ? `Con ${provider}` : 'Servicio automotriz'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {hasProviders ? (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Talleres</Text>
              {providers.slice(0, 5).map((p) => (
                <TouchableOpacity
                  key={`sug-prov-${p._panelKind}-${p.id}`}
                  style={styles.row}
                  onPress={() => onSelectProvider?.(p)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.iconWrap, styles.iconProvider]}>
                    <Building2 size={18} color={COLORS.text.secondary} strokeWidth={2} />
                  </View>
                  <View style={styles.textCol}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {p.nombre || 'Taller'}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {p._panelKind === 'mecanico' ? 'A domicilio' : 'Taller'}
                      {p.distance != null || p.distancia_km != null
                        ? ` · cerca de ti`
                        : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {onSeeAllResults && (hasServices || hasProviders) ? (
            <TouchableOpacity style={styles.seeAll} onPress={onSeeAllResults} activeOpacity={0.85}>
              <MapPin size={16} color={COLORS.icon.active} />
              <Text style={styles.seeAllText}>Ver todos los resultados</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '100%',
    marginTop: SPACING.sm,
    zIndex: 40,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.xl,
    maxHeight: 320,
    overflow: 'hidden',
  },
  scroll: {
    maxHeight: 320,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.lg,
  },
  loadingText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  emptyRow: {
    padding: SPACING.lg,
  },
  emptyText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  group: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  groupTitle: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.tertiary,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconService: {
    backgroundColor: COLORS.primary[50],
  },
  iconProvider: {
    backgroundColor: COLORS.badge.meta.background,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
    fontSize: 15,
  },
  rowSub: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
  },
  seeAllText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.buttonSecondary.outlineText,
  },
});

export default GuestSearchSuggestions;
