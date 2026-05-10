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
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Star, ChevronRight, MessageCircle, MapPin, Award } from 'lucide-react-native';

import { ROUTES } from '../../utils/constants';
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
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';

const Card = ({ children, style }) => <View style={[styles.card, style]}>{children}</View>;

const ProviderDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { vehicles: userVehicles = [] } = useAuth();

  const params = route.params || {};
  const {
    provider: initialProvider,
    providerId,
    id: paramId,
    type,
    providerType: paramProviderType,
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

  const { data: details, isLoading: loadingDetails } = useProviderDetails(idToLoad, providerType);
  const { data: services } = useProviderServices(idToLoad, providerType);
  const { data: schedule } = useProviderWeeklySchedule(idToLoad, providerType);
  const { data: documents } = useProviderDocuments(idToLoad, providerType);
  const { data: reviewsData } = useProviderReviews(idToLoad, providerType);
  const { data: completedJobs = [] } = useProviderCompletedJobs(idToLoad, providerType);

  const provider = useMemo(() => {
    const base = {
      ...initialProvider,
      ...details,
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

  const handleBack = () => navigation.goBack();

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

        {/* Brands */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Especialidad en Marcas</Text>
          <View style={styles.tagsRow}>
            {(provider.marcas_atendidas_nombres?.length > 0
              ? provider.marcas_atendidas_nombres
              : ['Multimarca']
            ).map((brand, i) => (
              <View key={i} style={styles.tagBadge}>
                <Text style={styles.tagText}>{brand}</Text>
              </View>
            ))}
          </View>
        </View>

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
        {provider.servicios && provider.servicios.length > 0 && (
          <View style={styles.section}>
            <View style={styles.iconTitleRow}>
              <Award size={18} color={COLORS.primary[500]} />
              <Text style={styles.sectionTitle}>Servicios Profesionales</Text>
            </View>
            <Text style={styles.sectionHint}>
              Revisa si el servicio o especialidad que necesitas es compatible con la marca de tus
              vehículos registrados.
            </Text>
            <View style={styles.servicesGrid}>
              {provider.servicios.map((servicio, idx) => {
                const providerBrands =
                  provider.marcas_atendidas_nombres?.map((b) => b.toLowerCase()) || [];
                let isCompatible = false;

                if (providerBrands.includes('multimarca')) {
                  isCompatible = true;
                } else if (userVehicles.length > 0) {
                  userVehicles.forEach((uv) => {
                    const uM = (uv.marca_nombre || uv.marca || '').toLowerCase();
                    if (providerBrands.some((pb) => pb.includes(uM) || uM.includes(pb))) {
                      isCompatible = true;
                    }
                  });
                }

                return (
                  <View key={`${servicio.id || idx}`} style={styles.serviceCardShell}>
                    {Array.isArray(servicio.fotos_servicio) && servicio.fotos_servicio.length > 0 ? (
                      <ServicePhotosCarousel photos={servicio.fotos_servicio} height={120} />
                    ) : null}

                    <View style={styles.serviceCardBody}>
                      <Text style={styles.serviceName} numberOfLines={2}>
                        {servicio.nombre || servicio.servicio_nombre || 'Servicio Profesional'}
                      </Text>
                      {servicio.categoria && (
                        <Text style={styles.serviceCategory} numberOfLines={1}>
                          {servicio.categoria}
                        </Text>
                      )}

                      {isCompatible ? (
                        <View style={styles.serviceFooter}>
                          <View style={styles.compatibilityBadge}>
                            <Ionicons
                              name="checkmark-circle"
                              size={12}
                              color={COLORS.success.main}
                            />
                            <Text style={styles.compatibilityText}>Compatible</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </View>
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
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    padding: 16,
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
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  serviceCardShell: {
    width: '48%',
    marginBottom: 8,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  serviceCardBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  serviceName: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginBottom: 4,
  },
  serviceCategory: {
    color: COLORS.primary[500],
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginBottom: 12,
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    paddingTop: 10,
  },
  compatibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success.light,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.success.main,
  },
  compatibilityText: {
    color: COLORS.success.main,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
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
