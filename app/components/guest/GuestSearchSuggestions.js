import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { MapPin, Wrench, Building2 } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
import {
  resolveToAbsoluteMediaUrl,
  buildProviderAvatarUri,
} from '../../utils/providerUtils';

function resolveServiceCoverUri(offer) {
  if (!offer) return null;
  const fotos = Array.isArray(offer.fotos_servicio) ? offer.fotos_servicio : [];
  const first = fotos[0];
  if (first) {
    return resolveToAbsoluteMediaUrl(
      first.imagen_url || first.image || first.url || first.imagen || null,
    );
  }
  return resolveToAbsoluteMediaUrl(offer.foto || null);
}

function SuggestionThumb({ uri, kind = 'service' }) {
  const Icon = kind === 'provider' ? Building2 : Wrench;
  const fallbackBg = kind === 'provider' ? COLORS.badge.meta.background : COLORS.primary[50];
  const iconColor = kind === 'provider' ? COLORS.text.secondary : COLORS.icon.active;

  return (
    <View style={[styles.thumb, { backgroundColor: fallbackBg }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.thumbImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={120}
        />
      ) : (
        <Icon size={18} color={iconColor} strokeWidth={2} />
      )}
    </View>
  );
}

/**
 * Dropdown de sugerencias estilo Airbnb bajo el search pill.
 * Muestra foto real del servicio / taller cuando existe.
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
              {serviceOffers.slice(0, 5).map((offer) => (
                <ServiceSuggestionRow
                  key={`sug-svc-${offer.servicio_id}`}
                  offer={offer}
                  onPress={() => onSelectService?.(offer)}
                />
              ))}
            </View>
          ) : null}

          {hasProviders ? (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Talleres</Text>
              {providers.slice(0, 5).map((p) => (
                <ProviderSuggestionRow
                  key={`sug-prov-${p._panelKind}-${p.id}`}
                  provider={p}
                  onPress={() => onSelectProvider?.(p)}
                />
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

function ServiceSuggestionRow({ offer, onPress }) {
  const coverUri = useMemo(() => resolveServiceCoverUri(offer), [offer]);
  const total = offer.total_proveedores || offer.ofertas?.length || 0;
  const desde = Number(offer.precio_desde) || 0;
  const subtitleParts = [];
  if (total > 0) subtitleParts.push(`${total} taller${total === 1 ? '' : 'es'}`);
  if (desde > 0) subtitleParts.push(`Desde $${Math.round(desde).toLocaleString('es-CL')}`);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <SuggestionThumb uri={coverUri} kind="service" />
      <View style={styles.textCol}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {offer.nombre}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {subtitleParts.length ? subtitleParts.join(' · ') : 'Servicio automotriz'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ProviderSuggestionRow({ provider, onPress }) {
  const avatarUri = useMemo(() => buildProviderAvatarUri(provider), [provider]);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <SuggestionThumb uri={avatarUri} kind="provider" />
      <View style={styles.textCol}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {provider.nombre || 'Taller'}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {provider._panelKind === 'mecanico' ? 'A domicilio' : 'Taller'}
          {provider.distance != null || provider.distancia_km != null ? ' · cerca de ti' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

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
  thumb: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
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
