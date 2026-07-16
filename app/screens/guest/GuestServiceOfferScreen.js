import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Star, MapPin, Building2, ChevronLeft, ChevronRight, Wrench } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import GuestGradientButton from '../../components/guest/GuestGradientButton';
import GuestScheduleGateModal from '../../components/guest/GuestScheduleGateModal';
import VerifiedSeal from '../../components/base/VerifiedSeal/VerifiedSeal';
import {
  labelTipoServicioCatalogo,
  formatPrecioCatalogoServicio,
} from '../../components/home/shared/providerCatalogSchedule';
import { labelPrecioServicioResuelto } from '../../utils/ofertaResolucionMarca';
import { resolveToAbsoluteMediaUrl, buildProviderAvatarUri } from '../../utils/providerUtils';
import { savePendingGuestScheduleIntent } from '../../utils/guestIntent';

const formatCLP = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return null;
  return `$${Math.round(num).toLocaleString('es-CL')}`;
};

/** Normaliza una oferta de grupo (mas_solicitados) o legacy (single offer) a una fila uniforme. */
function buildProviderRows(group, legacyOffer) {
  if (group) {
    return (group.ofertas || [])
      .filter((oferta) => oferta?.provider?.id)
      .map((oferta) => ({
        key: `oferta-${oferta.oferta_id}`,
        providerId: oferta.provider.id,
        providerType: oferta.provider_type === 'mecanico' ? 'mecanico' : 'taller',
        nombre: oferta.provider.nombre || 'Taller',
        avatarUri: resolveToAbsoluteMediaUrl(oferta.provider.foto_perfil),
        rating: Number(oferta.provider.calificacion_promedio) || 0,
        verificado: Boolean(oferta.provider.verificado),
        direccion: oferta.provider.direccion,
        precioLabel: formatCLP(oferta.precio),
        tipoServicioLabel:
          oferta.tipo_servicio === 'sin_repuestos' ? 'Sin repuestos' : 'Con repuestos',
        servicioNombre: oferta.nombre || group.nombre,
        ofertaServicioId: oferta.oferta_id,
        raw: oferta,
      }));
  }

  if (legacyOffer?.provider) {
    const precioInfo = labelPrecioServicioResuelto(legacyOffer.servicio, { vehicle: null });
    return [
      {
        key: 'legacy-offer',
        providerId: legacyOffer.provider.id,
        providerType: legacyOffer.providerType === 'mecanico' ? 'mecanico' : 'taller',
        nombre: legacyOffer.provider.nombre || 'Taller',
        avatarUri: buildProviderAvatarUri(legacyOffer.provider),
        rating: Number(legacyOffer.provider.calificacion_promedio) || 0,
        verificado: legacyOffer.provider.verificado !== false,
        direccion: legacyOffer.provider.direccion || legacyOffer.provider.comuna,
        precioLabel:
          precioInfo.principal ?? formatPrecioCatalogoServicio(legacyOffer.servicio),
        tipoServicioLabel: labelTipoServicioCatalogo(legacyOffer.servicio),
        servicioNombre:
          legacyOffer.servicio?.nombre || legacyOffer.servicio?.servicio_nombre || 'Servicio',
        ofertaServicioId: legacyOffer.oferta_id,
        raw: legacyOffer,
      },
    ];
  }

  return [];
}

/**
 * Pantalla invitado: servicio + lista de talleres que lo ofrecen (cada uno con su propio
 * precio) + gate de registro para agendar. Arquitectura Airbnb (rail editorial + lista de
 * proveedores tipo "listing") con paleta Tinder.
 */
const GuestServiceOfferScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const group = route.params?.group || null;
  const legacyOffer = route.params?.offer || null;
  const patente = route.params?.patente || null;
  const vehicleData = route.params?.vehicleData || null;

  const [gateVisible, setGateVisible] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState(null);

  const providerRows = useMemo(() => buildProviderRows(group, legacyOffer), [group, legacyOffer]);
  const selectedRow = useMemo(
    () => providerRows.find((r) => r.key === selectedRowKey) || providerRows[0] || null,
    [providerRows, selectedRowKey],
  );

  const serviceName = group?.nombre
    || legacyOffer?.servicio?.nombre
    || legacyOffer?.servicio?.servicio_nombre
    || 'Servicio';

  const coverUri = useMemo(() => {
    const fotos = Array.isArray(group?.fotos_servicio)
      ? group.fotos_servicio
      : Array.isArray(legacyOffer?.servicio?.fotos_servicio)
        ? legacyOffer.servicio.fotos_servicio
        : [];
    const first = fotos[0];
    if (!first) return null;
    return resolveToAbsoluteMediaUrl(
      first.imagen_url || first.image || first.url || first.imagen || null,
    );
  }, [group, legacyOffer]);

  const priceSummary = useMemo(() => {
    if (group) {
      const desde = Number(group.precio_desde) || 0;
      const hasta = Number(group.precio_hasta) || 0;
      if (desde <= 0) return null;
      const tieneVarios = hasta > 0 && hasta !== desde;
      return {
        label: tieneVarios ? `Desde ${formatCLP(desde)}` : formatCLP(desde),
        hint: tieneVarios
          ? 'El precio varía según el taller o mecánico que elijas.'
          : null,
      };
    }
    if (providerRows.length > 0) {
      return { label: providerRows[0].precioLabel, hint: null };
    }
    return null;
  }, [group, providerRows]);

  const isMultiProvider = providerRows.length > 1;

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate(ROUTES.GUEST_LANDING);
  }, [navigation]);

  const persistAndGo = useCallback(
    async (targetRoute) => {
      if (!selectedRow) return;
      await savePendingGuestScheduleIntent({
        patente: patente || undefined,
        vehicleData: vehicleData || undefined,
        provider: { id: selectedRow.providerId, nombre: selectedRow.nombre, _panelKind: selectedRow.providerType },
        providerType: selectedRow.providerType,
        servicio: {
          id: group?.servicio_id ?? legacyOffer?.servicio_id,
          nombre: selectedRow.servicioNombre,
          oferta_id: selectedRow.ofertaServicioId,
        },
        ofertaServicioId: selectedRow.ofertaServicioId,
      });
      setGateVisible(false);
      navigation.navigate(targetRoute);
    },
    [navigation, selectedRow, patente, vehicleData, group, legacyOffer],
  );

  const openProviderProfile = useCallback(
    (row) => {
      if (!row?.providerId) return;
      navigation.navigate(ROUTES.PROVIDER_DETAIL, {
        type: row.providerType === 'mecanico' ? 'mecanico' : 'taller',
        id: row.providerId,
      });
    },
    [navigation],
  );

  const handleSelectProvider = useCallback((row) => {
    setSelectedRowKey(row.key);
    setGateVisible(true);
  }, []);

  if (providerRows.length === 0) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>No encontramos este servicio.</Text>
        <GuestGradientButton title="Volver" onPress={handleBack} style={styles.errorBtn} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ChevronLeft size={22} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          Servicio
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + (isMultiProvider ? SPACING.xl : 120) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroMedia}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Wrench size={40} color={COLORS.neutral.gray[400]} />
            </View>
          )}
          {isMultiProvider ? (
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {providerRows.length} talleres disponibles
              </Text>
            </View>
          ) : providerRows[0]?.tipoServicioLabel ? (
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{providerRows[0].tipoServicioLabel}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.serviceTitle}>{serviceName}</Text>
        {priceSummary?.label ? <Text style={styles.price}>{priceSummary.label}</Text> : null}
        {priceSummary?.hint ? <Text style={styles.priceHint}>{priceSummary.hint}</Text> : null}

        <Text style={styles.sectionLabel}>
          {isMultiProvider ? 'Elige con quién agendar' : 'Taller'}
        </Text>

        <View style={styles.providerList}>
          {providerRows.map((row) => (
            <TouchableOpacity
              key={row.key}
              style={styles.providerCard}
              onPress={() => handleSelectProvider(row)}
              activeOpacity={0.88}
            >
              <View style={styles.providerIcon}>
                {row.avatarUri ? (
                  <Image
                    source={{ uri: row.avatarUri }}
                    style={styles.providerAvatar}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Building2 size={22} color={COLORS.icon.active} />
                )}
              </View>
              <View style={styles.providerText}>
                <View style={styles.providerNameRow}>
                  <Text style={styles.providerName} numberOfLines={1}>
                    {row.nombre}
                  </Text>
                  {row.verificado ? <VerifiedSeal size={14} /> : null}
                </View>
                <View style={styles.providerMeta}>
                  {row.rating > 0 ? (
                    <View style={styles.ratingRow}>
                      <Star size={12} color={COLORS.text.primary} fill={COLORS.text.primary} />
                      <Text style={styles.metaText}>{row.rating.toFixed(1)}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.metaText}>
                    {row.providerType === 'mecanico' ? 'A domicilio' : 'Taller verificado'}
                  </Text>
                </View>
                {row.direccion && (
                  <View style={styles.addressRow}>
                    <MapPin size={12} color={COLORS.text.tertiary} />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {row.direccion}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.();
                    openProviderProfile(row);
                  }}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Text style={styles.verPerfil}>Ver perfil</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.providerPriceWrap}>
                {row.precioLabel ? (
                  <Text style={styles.providerPrice}>{row.precioLabel}</Text>
                ) : null}
                <ChevronRight size={16} color={COLORS.text.tertiary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>¿Qué incluye agendar?</Text>
          <Text style={styles.infoBody}>
            Al crear tu cuenta puedes solicitar este servicio con el taller que elijas, registrar
            tu auto y llevar el control de su salud y mantenciones.
          </Text>
        </View>
      </ScrollView>

      {!isMultiProvider ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.sm }]}>
          <GuestGradientButton
            title="Agendar este servicio"
            onPress={() => handleSelectProvider(providerRows[0])}
          />
          <TouchableOpacity onPress={() => openProviderProfile(providerRows[0])} style={styles.footerLink}>
            <Text style={styles.footerLinkText}>Ver perfil completo del taller</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <GuestScheduleGateModal
        visible={gateVisible}
        servicioNombre={serviceName}
        providerNombre={selectedRow?.nombre}
        onClose={() => setGateVisible(false)}
        onRegister={() => persistAndGo(ROUTES.REGISTER)}
        onLogin={() => persistAndGo(ROUTES.LOGIN)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  errorText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  errorBtn: {
    minWidth: 160,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    minHeight: 48,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
    fontSize: 15,
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  heroMedia: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: BORDERS.radius.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.gray[100],
    marginBottom: SPACING.lg,
    position: 'relative',
    ...(Platform.OS === 'web' ? {} : SHADOWS.sm),
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    backgroundColor: COLORS.base.white,
    borderRadius: BORDERS.radius.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  heroBadgeText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  serviceTitle: {
    ...TYPOGRAPHY.styles.h2,
    color: COLORS.text.primary,
    letterSpacing: -0.4,
    marginBottom: SPACING.xs,
  },
  price: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  priceHint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  providerList: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: BORDERS.radius.full,
  },
  providerText: {
    flex: 1,
    minWidth: 0,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerName: {
    ...TYPOGRAPHY.styles.captionBold,
    fontSize: 16,
    color: COLORS.text.primary,
    flexShrink: 1,
  },
  providerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  addressText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    flex: 1,
  },
  verPerfil: {
    ...TYPOGRAPHY.styles.caption,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.buttonSecondary.outlineText,
    marginTop: 4,
  },
  providerPriceWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  providerPrice: {
    ...TYPOGRAPHY.styles.captionBold,
    fontSize: 15,
    color: COLORS.text.primary,
  },
  infoBlock: {
    paddingTop: SPACING.md,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
  },
  infoTitle: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  infoBody: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background.default,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    ...SHADOWS.lg,
  },
  footerLink: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  footerLinkText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[600],
  },
});

export default GuestServiceOfferScreen;
