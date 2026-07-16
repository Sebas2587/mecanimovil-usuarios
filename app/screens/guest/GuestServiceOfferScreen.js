import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Star, MapPin, Building2, ChevronLeft, Wrench, Car } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import GuestGradientButton from '../../components/guest/GuestGradientButton';
import GuestScheduleGateModal from '../../components/guest/GuestScheduleGateModal';
import GuestAirbnbServiceCard from '../../components/guest/GuestAirbnbServiceCard';
import HomeSectionHeader from '../../components/home/shared/HomeSectionHeader';
import VerifiedSeal from '../../components/base/VerifiedSeal/VerifiedSeal';
import {
  labelTipoServicioCatalogo,
  formatPrecioCatalogoServicio,
} from '../../components/home/shared/providerCatalogSchedule';
import { labelPrecioServicioResuelto } from '../../utils/ofertaResolucionMarca';
import {
  resolveToAbsoluteMediaUrl,
  buildProviderAvatarUri,
  getProviderLocationLabel,
} from '../../utils/providerUtils';
import { formatProviderStreetAddress } from '../../utils/formatProviderStreetAddress';
import { savePendingGuestScheduleIntent } from '../../utils/guestIntent';
import {
  getServicioDetallePublico,
  getServicioOfertasPublicasGroup,
  getServiciosMasSolicitados,
} from '../../services/service';
import { H_PAD } from '../../components/home/shared/homeLayoutConstants';

const formatCLP = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return null;
  return `$${Math.round(num).toLocaleString('es-CL')}`;
};

/** Etiqueta agregada de cobertura por taller (marcas únicas, no una card por marca). */
function resolveAggregatedCoberturaLabel({ marcas, hasMultimarca, especialistaMarcas }) {
  if (hasMultimarca && marcas.size === 0) return 'Todas las marcas';
  const list = Array.from(marcas.size > 0 ? marcas : especialistaMarcas);
  if (list.length === 0) {
    return hasMultimarca ? 'Todas las marcas' : null;
  }
  if (list.length === 1) return list[0];
  if (list.length <= 3) return list.join(' · ');
  return `${list.slice(0, 2).join(' · ')} +${list.length - 2}`;
}

function resolveProviderPhoto(provider) {
  if (!provider) return null;
  return (
    buildProviderAvatarUri({
      ...provider,
      foto_perfil: provider.foto_perfil,
      foto_perfil_url: provider.foto_perfil_url || provider.foto_perfil,
    })
    || resolveToAbsoluteMediaUrl(provider.foto_perfil || provider.foto_perfil_url)
  );
}

/**
 * Una card por taller/mecánico: agrupa ofertas del mismo proveedor
 * (varias marcas/modelos) en un solo listing Airbnb.
 */
function buildProviderRows(group, legacyOffer) {
  if (group) {
    const byProvider = new Map();

    for (const oferta of group.ofertas || []) {
      const provider = oferta?.provider;
      if (!provider?.id) continue;

      const providerType = oferta.provider_type === 'mecanico' ? 'mecanico' : 'taller';
      const key = `${providerType}-${provider.id}`;
      let bucket = byProvider.get(key);
      if (!bucket) {
        bucket = {
          key,
          providerId: provider.id,
          providerType,
          nombre: provider.nombre || 'Taller',
          avatarUri: resolveProviderPhoto(provider),
          rating: Number(provider.calificacion_promedio) || 0,
          verificado: Boolean(provider.verificado),
          locationLabel:
            formatProviderStreetAddress(provider)
            || getProviderLocationLabel(provider)
            || null,
          servicioNombre: oferta.nombre || group.nombre,
          precios: [],
          tipos: new Set(),
          marcas: new Set(),
          especialistaMarcas: new Set(),
          hasMultimarca: false,
          bestOferta: null,
          bestPrecio: Infinity,
        };
        byProvider.set(key, bucket);
      }

      const precio = Number(oferta.precio) || 0;
      if (precio > 0) {
        bucket.precios.push(precio);
        if (precio < bucket.bestPrecio) {
          bucket.bestPrecio = precio;
          bucket.bestOferta = oferta;
        }
      } else if (!bucket.bestOferta) {
        bucket.bestOferta = oferta;
      }

      bucket.tipos.add(oferta.tipo_servicio || 'sin_repuestos');

      const cob = oferta.cobertura_vehiculo;
      if (cob?.alcance === 'marca' && cob.marca_nombre) {
        bucket.marcas.add(cob.marca_nombre);
      } else if (cob?.alcance === 'multimarca') {
        bucket.hasMultimarca = true;
      } else if (cob?.alcance === 'especialista') {
        for (const m of cob.marcas_nombres || []) {
          if (m) bucket.especialistaMarcas.add(m);
        }
      }
    }

    return Array.from(byProvider.values())
      .map((bucket) => {
        const min = bucket.precios.length ? Math.min(...bucket.precios) : 0;
        const max = bucket.precios.length ? Math.max(...bucket.precios) : 0;
        const precioLabel =
          min > 0
            ? (max > min ? `Desde ${formatCLP(min)}` : formatCLP(min))
            : null;

        let tipoServicioLabel = 'Con repuestos';
        if (bucket.tipos.has('sin_repuestos') && bucket.tipos.has('con_repuestos')) {
          tipoServicioLabel = 'Con o sin repuestos';
        } else if (bucket.tipos.has('sin_repuestos')) {
          tipoServicioLabel = 'Sin repuestos';
        }

        return {
          key: bucket.key,
          providerId: bucket.providerId,
          providerType: bucket.providerType,
          nombre: bucket.nombre,
          avatarUri: bucket.avatarUri,
          rating: bucket.rating,
          verificado: bucket.verificado,
          locationLabel: bucket.locationLabel,
          precioLabel,
          minPrecio: min > 0 ? min : Infinity,
          tipoServicioLabel,
          coberturaLabel: resolveAggregatedCoberturaLabel(bucket),
          servicioNombre: bucket.servicioNombre,
          ofertaServicioId: bucket.bestOferta?.oferta_id ?? null,
          raw: bucket.bestOferta,
        };
      })
      .sort((a, b) => a.minPrecio - b.minPrecio);
  }

  if (legacyOffer?.provider) {
    const provider = legacyOffer.provider;
    const precioInfo = labelPrecioServicioResuelto(legacyOffer.servicio, { vehicle: null });
    return [
      {
        key: 'legacy-offer',
        providerId: provider.id,
        providerType: legacyOffer.providerType === 'mecanico' ? 'mecanico' : 'taller',
        nombre: provider.nombre || 'Taller',
        avatarUri: resolveProviderPhoto(provider),
        rating: Number(provider.calificacion_promedio) || 0,
        verificado: provider.verificado !== false,
        locationLabel:
          getProviderLocationLabel(provider)
          || provider.direccion
          || provider.comuna
          || null,
        precioLabel:
          precioInfo.principal ?? formatPrecioCatalogoServicio(legacyOffer.servicio),
        tipoServicioLabel: labelTipoServicioCatalogo(legacyOffer.servicio),
        coberturaLabel: null,
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
 * Pantalla invitado — detalle de servicio estilo Airbnb Experience:
 * hero + precio, listings de talleres (foto real → perfil), rail de relacionados, CTA agendar.
 */
const GuestServiceOfferScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const group = route.params?.group || null;
  const legacyOffer = route.params?.offer || null;
  const patente = route.params?.patente || null;
  const vehicleData = route.params?.vehicleData || null;

  const [gateVisible, setGateVisible] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState(null);
  const [relatedServices, setRelatedServices] = useState([]);

  const providerRows = useMemo(() => buildProviderRows(group, legacyOffer), [group, legacyOffer]);
  const selectedRow = useMemo(
    () => providerRows.find((r) => r.key === selectedRowKey) || providerRows[0] || null,
    [providerRows, selectedRowKey],
  );

  const servicioId = group?.servicio_id ?? legacyOffer?.servicio_id ?? legacyOffer?.servicio?.id;
  const serviceName = group?.nombre
    || legacyOffer?.servicio?.nombre
    || legacyOffer?.servicio?.servicio_nombre
    || 'Servicio';

  const layoutW = Platform.OS === 'web' ? Math.min(windowWidth, 640) : windowWidth;
  const relatedCardW = Math.max(148, Math.min(196, Math.floor((layoutW - H_PAD * 2) * 0.42)));

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
          ? 'El precio varía según el taller que elijas.'
          : null,
      };
    }
    if (providerRows.length > 0) {
      return { label: providerRows[0].precioLabel, hint: null };
    }
    return null;
  }, [group, providerRows]);

  const tipoBadge = useMemo(() => {
    if (providerRows.length > 1) {
      return `${providerRows.length} talleres`;
    }
    return providerRows[0]?.tipoServicioLabel || null;
  }, [providerRows]);

  const isMultiProvider = providerRows.length > 1;

  useEffect(() => {
    let mounted = true;
    if (servicioId == null) {
      setRelatedServices([]);
      return undefined;
    }
    (async () => {
      const detalle = await getServicioDetallePublico(servicioId);
      if (!mounted) return;
      const related = Array.isArray(detalle?.servicios_relacionados_info)
        ? detalle.servicios_relacionados_info
        : Array.isArray(detalle?.servicios_relacionados)
          ? detalle.servicios_relacionados
          : [];
      setRelatedServices(
        related
          .filter((s) => s?.id != null && Number(s.id) !== Number(servicioId))
          .slice(0, 8),
      );
    })();
    return () => {
      mounted = false;
    };
  }, [servicioId]);

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
        provider: {
          id: selectedRow.providerId,
          nombre: selectedRow.nombre,
          _panelKind: selectedRow.providerType,
        },
        providerType: selectedRow.providerType,
        servicio: {
          id: servicioId,
          nombre: selectedRow.servicioNombre,
          oferta_id: selectedRow.ofertaServicioId,
        },
        ofertaServicioId: selectedRow.ofertaServicioId,
      });
      setGateVisible(false);
      navigation.navigate(targetRoute);
    },
    [navigation, selectedRow, patente, vehicleData, servicioId],
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

  const openScheduleGate = useCallback((row) => {
    setSelectedRowKey(row.key);
    setGateVisible(true);
  }, []);

  const handleRelatedPress = useCallback(
    async (related) => {
      const id = related?.id;
      if (id == null) return;

      const popular = await getServiciosMasSolicitados(24);
      const match = (popular || []).find((item) => Number(item.servicio_id) === Number(id));
      let nextGroup = null;
      if (match) {
        nextGroup = {
          servicio_id: match.servicio_id,
          nombre: match.nombre,
          fotos_servicio: match.foto ? [{ imagen_url: match.foto }] : [],
          precio_desde: match.precio_desde,
          precio_hasta: match.precio_hasta,
          total_proveedores: match.total_proveedores,
          ofertas: match.ofertas || [],
        };
      } else {
        nextGroup = await getServicioOfertasPublicasGroup(id);
      }

      if (!nextGroup?.ofertas?.length) return;

      navigation.push(ROUTES.GUEST_SERVICE_OFFER, {
        group: nextGroup,
        offer: null,
        patente,
        vehicleData,
      });
    },
    [navigation, patente, vehicleData],
  );

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
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Airbnb: media dominante */}
        <View style={styles.heroMedia}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Wrench size={40} color={COLORS.neutral.gray[400]} />
            </View>
          )}
          {tipoBadge ? (
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{tipoBadge}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.serviceTitle}>{serviceName}</Text>
        {priceSummary?.label ? <Text style={styles.price}>{priceSummary.label}</Text> : null}
        {priceSummary?.hint ? (
          <Text style={styles.priceHint}>{priceSummary.hint}</Text>
        ) : (
          <View style={styles.priceHintSpacer} />
        )}

        {/* Listings de talleres — tap → perfil */}
        <Text style={styles.sectionLabel}>
          {isMultiProvider ? 'Talleres disponibles' : 'Taller'}
        </Text>
        <Text style={styles.sectionHint}>
          {isMultiProvider
            ? 'Compara precios y revisa el perfil de cada taller.'
            : 'Toca la card para ver el perfil del taller.'}
        </Text>

        <View style={styles.providerList}>
          {providerRows.map((row) => (
            <TouchableOpacity
              key={row.key}
              style={styles.providerCard}
              onPress={() => openProviderProfile(row)}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={`${row.nombre}, ver perfil`}
            >
              <View style={styles.providerPhoto}>
                {row.avatarUri ? (
                  <Image
                    source={{ uri: row.avatarUri }}
                    style={styles.providerPhotoImg}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={styles.providerPhotoFallback}>
                    <Building2 size={28} color={COLORS.neutral.gray[400]} strokeWidth={1.75} />
                  </View>
                )}
              </View>

              <View style={styles.providerBody}>
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
                    {row.providerType === 'mecanico' ? 'A domicilio' : 'En taller'}
                  </Text>
                  <Text style={styles.metaText}>{row.tipoServicioLabel}</Text>
                </View>

                {row.coberturaLabel ? (
                  <View style={styles.coberturaRow}>
                    <Car size={12} color={COLORS.text.tertiary} />
                    <Text style={styles.coberturaText} numberOfLines={2}>
                      {row.coberturaLabel}
                    </Text>
                  </View>
                ) : null}

                {row.locationLabel ? (
                  <View style={styles.addressRow}>
                    <MapPin size={12} color={COLORS.text.tertiary} />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {row.locationLabel}
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.verPerfil}>Ver perfil</Text>
              </View>

              <View style={styles.providerAside}>
                {row.precioLabel ? (
                  <Text style={styles.providerPrice}>{row.precioLabel}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Relacionados — rail Airbnb */}
        {relatedServices.length > 0 ? (
          <View style={styles.relatedSection}>
            <HomeSectionHeader title="Servicios relacionados" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={Platform.OS !== 'web'}
              contentContainerStyle={styles.relatedRow}
              style={Platform.OS === 'web' ? styles.relatedWeb : undefined}
            >
              {relatedServices.map((svc) => {
                const precioInfo = labelPrecioServicioResuelto(svc, { vehicle: null });
                const precioLabel = precioInfo.principal ?? formatPrecioCatalogoServicio(svc);
                return (
                  <GuestAirbnbServiceCard
                    key={`related-${svc.id}`}
                    width={relatedCardW}
                    servicio={svc}
                    precioLabel={precioLabel}
                    tipoLabel={labelTipoServicioCatalogo(svc)}
                    onPress={() => handleRelatedPress(svc)}
                  />
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>¿Qué incluye agendar?</Text>
          <Text style={styles.infoBody}>
            Al crear tu cuenta puedes solicitar este servicio con el taller que elijas, registrar
            tu auto y llevar el control de su salud y mantenciones.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.sm }]}>
        <GuestGradientButton
          title={isMultiProvider ? 'Agendar con un taller' : 'Agendar este servicio'}
          onPress={() => openScheduleGate(selectedRow || providerRows[0])}
        />
      </View>

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
  priceHintSpacer: {
    height: SPACING.md,
  },
  sectionLabel: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  sectionHint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.md,
  },
  providerList: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  /** Listing horizontal Airbnb: foto cuadrada grande + detalle + precio */
  providerCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  providerPhoto: {
    width: 96,
    height: 96,
    borderRadius: BORDERS.radius.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.gray[100],
    flexShrink: 0,
  },
  providerPhotoImg: {
    width: '100%',
    height: '100%',
  },
  providerPhotoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingVertical: 2,
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
  coberturaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  coberturaText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    flex: 1,
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
    ...TYPOGRAPHY.styles.captionBold,
    fontSize: 13,
    color: COLORS.primary[600],
    marginTop: 6,
  },
  providerAside: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 72,
    paddingRight: 4,
  },
  providerPrice: {
    ...TYPOGRAPHY.styles.captionBold,
    fontSize: 15,
    color: COLORS.text.primary,
    textAlign: 'right',
  },
  relatedSection: {
    marginBottom: SPACING.xl,
  },
  relatedRow: {
    gap: SPACING.md,
    paddingRight: SPACING.md,
  },
  relatedWeb: {
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
  },
  infoBlock: {
    paddingTop: SPACING.md,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
    marginBottom: SPACING.lg,
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
});

export default GuestServiceOfferScreen;
