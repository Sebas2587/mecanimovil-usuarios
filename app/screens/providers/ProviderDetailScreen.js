import React, { useLayoutEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Share,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Star, ChevronRight, MessageCircle, MapPin, Award } from 'lucide-react-native';

import { useQuery } from '@tanstack/react-query';
import { ROUTES } from '../../utils/constants';
import { getUserVehicles } from '../../services/vehicle';
import { navigateCrearSolicitudConProveedorYServicio } from '../../components/home/shared/homeScheduleNavigation';
import {
  formatPrecioCatalogoServicio,
  labelTipoServicioCatalogo,
  resolveServicioId,
} from '../../components/home/shared/providerCatalogSchedule';
import { buildPublicProviderUrl, buildDeepLinkProviderUrl } from '../../config/publicListing';

import ProviderHeader from '../../components/provider/ProviderHeader';
import TrustSection from '../../components/provider/TrustSection';
import ProviderCompletedJobsSection from '../../components/provider/ProviderCompletedJobsSection';
import PortfolioCarousel from '../../components/provider/PortfolioCarousel';
import ServicePhotosCarousel from '../../components/provider/ServicePhotosCarousel';
import ProviderScheduleSection from '../../components/provider/ProviderScheduleSection';
import ReviewCard from '../../components/reviews/ReviewCard';

import {
  useProviderDetails,
  useProviderServices,
  useProviderWeeklySchedule,
  useProviderDocuments,
  useProviderReviews,
  useProviderCompletedJobs,
} from '../../hooks/useProviders';
import { getPublicProviderFromWebPath } from '../../utils/publicListingRoute';
import { filtrarServiciosCatalogoPerfilProveedor } from '../../utils/servicioVehiculoCompat';
import { labelPrecioServicioResuelto } from '../../utils/ofertaResolucionMarca';
import ServicioTarifasPorMarca from '../../components/provider/ServicioTarifasPorMarca';
import { isProviderMultimarca, mergeProviderKpiBadge } from '../../utils/providerUtils';
import { goBackFromProviderProfile } from '../../utils/navigationBack';
import { useFavorites } from '../../context/FavoritesContext';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
import { providerServiceCardStyles as svcCard } from '../../components/provider/providerServiceCardStyles';

const Card = ({ children, style }) => <View style={[styles.card, style]}>{children}</View>;

const ProviderDetailScreen = () => {
  const route = useRoute();
  const { data: vehiclesQuery = [] } = useQuery({
    queryKey: ['userVehicles'],
    queryFn: getUserVehicles,
    staleTime: 1000 * 60 * 5,
  });

  const userVehicles = useMemo(() => {
    if (Array.isArray(vehiclesQuery)) return vehiclesQuery;
    return vehiclesQuery?.results || [];
  }, [vehiclesQuery]);

  const navigation = useNavigation();
  const params = route.params || {};
  const {
    provider: initialProvider,
    providerId,
    id: paramId,
    type,
    providerType: paramProviderType,
    vehicle: vehicleFromRoute,
  } = params;

  const webParsed = Platform.OS === 'web' ? getPublicProviderFromWebPath() : null;
  const idToLoad = providerId ?? paramId ?? initialProvider?.id ?? webParsed?.providerId;
  const providerType =
    type ||
    paramProviderType ||
    webParsed?.providerType ||
    (initialProvider?.tipo === 'taller' ? 'taller' : 'mecanico');

  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    const w = getPublicProviderFromWebPath();
    if (!w) return;
    const pid = params.id ?? params.providerId;
    const ptype = params.type ?? params.providerType;
    const sameId = Number(pid) === w.providerId;
    const sameType =
      String(ptype || '')
        .toLowerCase()
        .replace('proveedor', 'taller') === w.providerType;
    if (sameId && sameType) return;
    navigation.setParams({ type: w.providerType, id: w.providerId });
  }, [navigation, params.id, params.providerId, params.type, params.providerType]);

  const queryClient = useQueryClient();

  // Invalida el query de servicios (fotos) cada vez que la pantalla recibe foco.
  // Esto cubre tanto mount/unmount del stack como regreso desde otra pantalla.
  useFocusEffect(
    useCallback(() => {
      if (idToLoad && providerType) {
        queryClient.invalidateQueries({ queryKey: ['providerServices', providerType, idToLoad] });
      }
    }, [queryClient, idToLoad, providerType])
  );

  const userVehiclesActivos = useMemo(
    () => userVehicles.filter((v) => v?.id && v.is_active !== false),
    [userVehicles],
  );

  const vehicleForSchedule = useMemo(() => {
    if (vehicleFromRoute?.id) return vehicleFromRoute;
    const active = userVehiclesActivos.find((v) => v.is_active !== false);
    return active || userVehiclesActivos[0] || null;
  }, [vehicleFromRoute, userVehiclesActivos]);

  const { data: details, isLoading: loadingDetails } = useProviderDetails(idToLoad, providerType);
  const { data: services } = useProviderServices(
    idToLoad,
    providerType,
    null,
    vehicleForSchedule,
  );
  const { data: schedule } = useProviderWeeklySchedule(idToLoad, providerType);
  const { data: documents } = useProviderDocuments(idToLoad, providerType);
  const { data: reviewsData } = useProviderReviews(idToLoad, providerType);
  const { data: completedJobs = [] } = useProviderCompletedJobs(idToLoad, providerType);

  const provider = useMemo(() => {
    const kpi_badge = mergeProviderKpiBadge(
      initialProvider?.kpi_badge,
      details?.kpi_badge,
    );
    const base = {
      ...initialProvider,
      ...details,
      kpi_badge,
      servicios: services || initialProvider?.servicios || [],
    };
    const totalRev = Number(reviewsData?.total_reviews ?? 0);
    const avg = reviewsData?.rating_average;
    if (totalRev > 0 && avg != null && Number.isFinite(Number(avg))) {
      return {
        ...base,
        calificacion_promedio: Number(avg),
        numero_de_calificaciones: totalRev,
      };
    }
    return base;
  }, [initialProvider, details, services, reviewsData]);

  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(idToLoad, providerType);
  const handleToggleFavorite = () => toggleFavorite(provider, providerType);

  const esMultimarcaProveedor = useMemo(() => isProviderMultimarca(provider), [provider]);

  const serviciosVisibles = useMemo(() => {
    const todos = provider?.servicios || [];
    return filtrarServiciosCatalogoPerfilProveedor(todos, {
      provider,
      vehicle: vehicleForSchedule,
      vehicles: userVehiclesActivos,
    });
  }, [provider, provider?.servicios, vehicleForSchedule, userVehiclesActivos]);

  const handleScheduleService = useCallback(
    (servicio) => {
      if (!vehicleForSchedule?.id) {
        Alert.alert(
          'Selecciona un vehículo',
          'Elige un vehículo en el inicio de la app para agendar con este proveedor.',
        );
        return;
      }
      if (!resolveServicioId(servicio)) {
        Alert.alert('Servicio no disponible', 'No pudimos identificar este servicio. Intenta de nuevo.');
        return;
      }
      navigateCrearSolicitudConProveedorYServicio(navigation, {
        vehicle: vehicleForSchedule,
        provider,
        providerType,
        servicio,
      });
    },
    [vehicleForSchedule, provider, providerType, navigation],
  );

  const handleShare = async () => {
    if (!idToLoad) return;
    try {
      const webUrl = buildPublicProviderUrl(providerType, idToLoad);
      const deepUrl = buildDeepLinkProviderUrl(providerType, idToLoad);

      const isTaller = providerType === 'taller';
      const titleSpec = isTaller ? 'Taller especializado' : 'Mecánico a domicilio';

      const zonasComunas = provider?.zonas_servicio
        ? provider.zonas_servicio.flatMap((z) => z.comunas || [])
        : [];
      const comunasRaw =
        zonasComunas.length > 0
          ? zonasComunas
          : provider.comunas_cobertura_nombres ||
            provider.comunas_cobertura?.map((c) => c?.nombre || c) ||
            [];
      const comunasArr = Array.isArray(comunasRaw) ? comunasRaw.filter(Boolean) : [];
      let comunasText = '';
      if (comunasArr.length > 0) {
        comunasText =
          comunasArr.length > 3
            ? `Atiende en ${comunasArr.slice(0, 3).join(', ')} y más comunas.`
            : `Atiende en ${comunasArr.join(', ')}.`;
      } else {
        comunasText = isTaller
          ? provider.comuna
            ? `Atiende en ${provider.comuna}.`
            : ''
          : 'Atiende a domicilio.';
      }

      const marcasArr = provider.marcas_atendidas_nombres || ['Multimarca'];
      const marcasText =
        marcasArr.length > 6 ? `${marcasArr.slice(0, 6).join(', ')}...` : marcasArr.join(', ');

      const messageTexto = `Conoce a ${provider.nombre}, ${titleSpec}.\n${comunasText}\nEspecialista en: ${marcasText}\n\nVer en la web:\n${webUrl}\n\nAbrir en la app:\n${deepUrl}`;

      if (Platform.OS === 'web') {
        await Share.share({ message: messageTexto, title: 'MecaniMóvil', url: webUrl });
      } else {
        await Share.share({ message: messageTexto, url: webUrl });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSeeAllReviews = () => {
    navigation.navigate(ROUTES.PROVIDER_REVIEWS, { providerId: idToLoad, providerType });
  };

  const handleBack = useCallback(() => {
    goBackFromProviderProfile(navigation, { fallbackRoute: ROUTES.HOME });
  }, [navigation]);

  if (idToLoad === undefined || idToLoad === null || idToLoad === '') {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.errorText}>
          No pudimos cargar este perfil. El enlace puede estar incompleto o caducado.
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate(ROUTES.HOME)} style={styles.linkBtn}>
          <Text style={styles.linkBtnText}>Ir al inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loadingDetails && !initialProvider) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS !== 'web'}
      >
        <ProviderHeader
          provider={provider}
          providerType={providerType}
          useWeeklyAvailabilityBadge
          weeklyHorarios={schedule}
          onShare={handleShare}
          onToggleFavorite={handleToggleFavorite}
          isFavorite={favorite}
          onBack={handleBack}
        />

        {/* Cobertura / Dirección */}
        {(() => {
          const resolvedType =
            providerType || (provider?.tipo === 'taller' ? 'taller' : 'mecanico');
          const isTaller = resolvedType === 'taller';

          if (!isTaller) {
            const zonasComunas = provider?.zonas_servicio
              ? provider.zonas_servicio.flatMap((z) => z.comunas || [])
              : [];
            const comunasRaw =
              zonasComunas.length > 0
                ? zonasComunas
                : provider.comunas_cobertura_nombres ||
                  provider.comunas_cobertura?.map((c) => c?.nombre || c) ||
                  provider.comunas_nombres ||
                  provider.comunas ||
                  provider.cobertura_comunas ||
                  [];
            const comunas = Array.isArray(comunasRaw) ? comunasRaw.filter(Boolean) : [];

            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Comunas de Cobertura</Text>
                {comunas.length > 0 ? (
                  <View style={styles.tagsRow}>
                    {comunas.map((c, i) => (
                      <View key={`${c}-${i}`} style={styles.tagBadge}>
                        <MapPin size={12} color={COLORS.text.secondary} style={{ marginRight: 4 }} />
                        <Text style={styles.tagText}>{String(c)}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Card style={{ marginTop: 10 }}>
                    <Text style={styles.bodyMutedText}>Cobertura no disponible.</Text>
                  </Card>
                )}
              </View>
            );
          }

          const addr =
            provider.direccion_fisica?.direccion_completa ||
            provider.direccion_fisica?.direccion ||
            provider.direccion_fisica?.calle ||
            provider.direccion_taller ||
            provider.direccion ||
            null;
          const comuna = provider.direccion_fisica?.comuna || provider.comuna || '';
          const display = [addr, comuna].filter(Boolean).join(', ') || 'Dirección no disponible.';

          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dirección del Taller</Text>
              <Card style={{ marginTop: 10 }}>
                <View style={styles.iconRow}>
                  <MapPin size={18} color={COLORS.primary[500]} />
                  <Text style={styles.bodyText}>{display}</Text>
                </View>
              </Card>
            </View>
          );
        })()}

        {/* Cobertura de marcas */}
        {(() => {
          const tipoCobertura = provider?.tipo_cobertura_marca;
          const esMultimarca = tipoCobertura === 'multimarca'
            || (!tipoCobertura && !(provider.marcas_atendidas_nombres?.length > 0));
          const tipoProveedorLabel = providerType === 'taller' ? 'Taller Mecánico' : 'Mecánico a Domicilio';
          return (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>
                  {esMultimarca ? 'Cobertura de Marcas' : 'Especialidad en Marcas'}
                </Text>
                <View style={[styles.providerTypeBadge, { backgroundColor: COLORS.neutral?.gray?.[100] || '#f5f5f5' }]}>
                  <Text style={styles.providerTypeBadgeText}>{tipoProveedorLabel}</Text>
                </View>
              </View>
              {esMultimarca ? (
                <View style={styles.multimarcaBadge}>
                  <Text style={styles.multimarcaBadgeIcon}>🌐</Text>
                  <View>
                    <Text style={styles.multimarcaBadgeTitle}>Proveedor Multimarca</Text>
                    <Text style={styles.multimarcaBadgeSub}>Atiende vehículos de cualquier marca</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.tagsRow}>
                  {(provider.marcas_atendidas_nombres || []).map((brand, i) => (
                    <View key={i} style={[styles.tagBadge, styles.tagBadgeEspecialista]}>
                      <Text style={styles.tagText}>⭐ {brand}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })()}

        <ProviderScheduleSection horarios={schedule || []} />

        {/* Reviews */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconTitleRow}>
              <Star size={16} color={COLORS.warning.main} fill={COLORS.warning.main} />
              <Text style={styles.sectionTitle}>Opiniones</Text>
            </View>
            {reviewsData?.reviews?.length > 0 && (
              <TouchableOpacity onPress={handleSeeAllReviews} style={styles.seeAllRow}>
                <Text style={styles.seeAllText}>Ver todas</Text>
                <ChevronRight size={14} color={COLORS.primary[500]} />
              </TouchableOpacity>
            )}
          </View>

          {reviewsData?.reviews?.length > 0 ? (
            <TouchableOpacity onPress={handleSeeAllReviews} activeOpacity={0.9}>
              <ReviewCard review={reviewsData.reviews[0]} />
            </TouchableOpacity>
          ) : (
            <Card>
              <View style={styles.iconRow}>
                <MessageCircle size={18} color={COLORS.text.tertiary} />
                <Text style={styles.bodyMutedText}>
                  Este proveedor aún no ha recibido opiniones.
                </Text>
              </View>
            </Card>
          )}
        </View>

        <TrustSection documents={documents || []} />

        {/* SECCIÓN DE SERVICIOS */}
        {(provider.servicios?.length > 0 || serviciosVisibles.length > 0) && (
          <View style={styles.section}>
            <View style={styles.iconTitleRow}>
              <Award size={18} color={COLORS.primary[500]} />
              <Text style={styles.sectionTitle}>Servicios Profesionales</Text>
            </View>
            <Text style={styles.sectionHint}>
              {userVehiclesActivos.length > 0
                ? userVehiclesActivos.length > 1
                  ? 'Precios según tus vehículos registrados. Toca un servicio para agendar con el vehículo activo.'
                  : `Precio para tu ${userVehiclesActivos[0].marca_nombre || userVehiclesActivos[0].marca?.nombre || 'vehículo'}. Toca un servicio para agendar.`
                : 'Registra un vehículo para ver precios de tu marca y agendar con este proveedor.'}
            </Text>
            {userVehiclesActivos.length === 0 ? (
              <Text style={styles.noVehicleHint}>
                Agrega un vehículo en tu perfil para ver precios y agendar.
              </Text>
            ) : !vehicleForSchedule?.id ? (
              <Text style={styles.noVehicleHint}>
                Selecciona un vehículo activo en el inicio para agendar.
              </Text>
            ) : null}
            {serviciosVisibles.length === 0 ? (
              <Text style={styles.noVehicleHint}>
                {userVehiclesActivos.length > 0
                  ? 'Este proveedor no tiene precio para ninguno de tus vehículos registrados en estos servicios.'
                  : 'Registra un vehículo para ver los servicios disponibles con precios para tu marca.'}
              </Text>
            ) : null}
            <View style={svcCard.servicesGrid}>
              {serviciosVisibles.map((servicio, idx) => {
                const servicioId = resolveServicioId(servicio);
                const canSchedule = !!vehicleForSchedule?.id && !!servicioId;
                const tarifasUsuario = servicio._tarifas_usuario || [];
                const precioInfo = labelPrecioServicioResuelto(servicio, {
                  vehicle: vehicleForSchedule,
                  vehicles: userVehiclesActivos,
                });
                const precioLabel =
                  precioInfo.principal
                  ?? formatPrecioCatalogoServicio(servicio, {
                    vehicle: vehicleForSchedule,
                    vehicles: userVehiclesActivos,
                  });
                const tipoLabel = labelTipoServicioCatalogo(servicio);

                return (
                  <TouchableOpacity
                    key={`${servicio.oferta_id || servicioId || idx}-${servicio.tipo_servicio || 'o'}`}
                    style={svcCard.serviceCardShell}
                    onPress={() => handleScheduleService(servicio)}
                    activeOpacity={0.88}
                    disabled={!canSchedule}
                  >
                    {Array.isArray(servicio.fotos_servicio) && servicio.fotos_servicio.length > 0 ? (
                      <ServicePhotosCarousel photos={servicio.fotos_servicio} height={120} />
                    ) : null}

                    <View style={svcCard.serviceCardBody}>
                      <Text style={svcCard.serviceName} numberOfLines={2}>
                        {servicio.nombre || servicio.servicio_nombre || 'Servicio Profesional'}
                      </Text>
                      {servicio.categoria ? (
                        <Text style={svcCard.serviceCategory} numberOfLines={1}>
                          {servicio.categoria}
                        </Text>
                      ) : null}
                      <View style={svcCard.serviceTipoBadge}>
                        <Text style={svcCard.serviceTipoBadgeText}>{tipoLabel}</Text>
                      </View>
                      {precioLabel ? (
                        <Text style={svcCard.servicePrice}>{precioLabel}</Text>
                      ) : null}
                      {precioInfo.subtitulo ? (
                        <Text style={svcCard.servicePriceHint}>{precioInfo.subtitulo}</Text>
                      ) : null}
                      {tarifasUsuario.length > 1 ? (
                        <ServicioTarifasPorMarca
                          tarifas={tarifasUsuario}
                          soloSiVarias={false}
                        />
                      ) : null}
                      {servicio.duracion_estimada ? (
                        <Text style={svcCard.serviceMeta}>
                          ~{servicio.duracion_estimada}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <ProviderCompletedJobsSection jobs={completedJobs} />
        <PortfolioCarousel portfolio={provider.portafolio || []} />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollArea: {
    flex: 1,
    minHeight: 0,
    ...Platform.select({
      web: {
        flexBasis: 0,
        flexGrow: 1,
        flexShrink: 1,
        height: 0,
        overflow: 'auto',
      },
      default: {},
    }),
  },
  scrollContent: {
    paddingBottom: 30,
  },
  section: {
    paddingHorizontal: SPACING.container.horizontal,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: -0.25,
    color: COLORS.text.primary,
  },
  sectionHint: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 18,
    marginBottom: 12,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    color: COLORS.primary[500],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    padding: 16,
    ...SHADOWS.sm,
  },
  bodyText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    flex: 1,
    lineHeight: 22,
    marginLeft: 10,
  },
  bodyMutedText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginLeft: 10,
    lineHeight: 20,
    flex: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
  },
  providerTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  multimarcaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.lg,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.primary[100],
  },
  multimarcaBadgeIcon: {
    fontSize: 28,
  },
  multimarcaBadgeTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[600],
    marginBottom: 2,
  },
  multimarcaBadgeSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary[500],
  },
  tagBadgeEspecialista: {
    backgroundColor: COLORS.success?.light || '#EAF9EF',
    borderColor: COLORS.success?.main || '#05b169',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.full,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  tagText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  noVehicleHint: {
    color: COLORS.warning.dark,
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginBottom: 12,
    lineHeight: 18,
  },
  errorText: {
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 16,
    fontSize: TYPOGRAPHY.fontSize.base,
    lineHeight: 22,
  },
  linkBtn: {
    paddingVertical: 12,
  },
  linkBtnText: {
    color: COLORS.primary[500],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
});

export default ProviderDetailScreen;
