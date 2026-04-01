import React, { useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Share,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../utils/constants';
import { buildPublicProviderUrl, buildDeepLinkProviderUrl } from '../../config/publicListing';

import ProviderHeader from '../../components/provider/ProviderHeader';
import TrustSection from '../../components/provider/TrustSection';
import ProviderCompletedJobsSection from '../../components/provider/ProviderCompletedJobsSection';
import PortfolioCarousel from '../../components/provider/PortfolioCarousel';

import { useProviderDetails, useProviderServices, useProviderDocuments, useProviderReviews, useProviderCompletedJobs } from '../../hooks/useProviders';
import { getPublicProviderFromWebPath } from '../../utils/publicListingRoute';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import ReviewCard from '../../components/reviews/ReviewCard';
import { TouchableOpacity } from 'react-native';
import { Star, ChevronRight, MessageCircle, MapPin, Award } from 'lucide-react-native';

const GlassCard = ({ children, style }) => (
  <View style={[glassBase, style]}>
    {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}
    {children}
  </View>
);

const glassBase = {
  backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.12)',
  overflow: 'hidden',
  padding: 16,
};

const ProviderDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { vehicles: userVehicles = [] } = useAuth();

  const params = route.params || {};
  const { provider: initialProvider, providerId, id: paramId, type, providerType: paramProviderType } = params;

  /**
   * Web + usuario con sesión: el stack es AppNavigator → ProviderDetailScreen.
   * React Navigation a menudo NO inyecta params desde la URL, y sin id las queries quedan disabled
   * (isLoading false) → se pinta el layout vacío. Misma fuente que la ficha pública: pathname.
   */
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

  const { data: details, isLoading: loadingDetails } = useProviderDetails(idToLoad, providerType);
  const { data: services } = useProviderServices(idToLoad, providerType);
  const { data: documents } = useProviderDocuments(idToLoad, providerType);
  const { data: reviewsData } = useProviderReviews(idToLoad, providerType);
  const { data: completedJobs = [] } = useProviderCompletedJobs(idToLoad, providerType);

  const provider = { ...initialProvider, ...details, servicios: services || initialProvider?.servicios || [] };

  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(idToLoad, providerType);
  const handleToggleFavorite = () => toggleFavorite(provider, providerType);

  const handleShare = async () => {
    if (!idToLoad) return;
    try {
      const webUrl = buildPublicProviderUrl(providerType, idToLoad);
      const deepUrl = buildDeepLinkProviderUrl(providerType, idToLoad);

      const isTaller = providerType === 'taller';
      let titleSpec = isTaller ? 'Taller especializado' : 'Mecánico a domicilio';
      
      const zonasComunas = provider?.zonas_servicio ? provider.zonas_servicio.flatMap(z => z.comunas || []) : [];
      const comunasRaw = zonasComunas.length > 0 ? zonasComunas : (
        provider.comunas_cobertura_nombres || provider.comunas_cobertura?.map(c => c?.nombre || c) || []
      );
      const comunasArr = Array.isArray(comunasRaw) ? comunasRaw.filter(Boolean) : [];
      let comunasText = '';
      if (comunasArr.length > 0) {
        if (comunasArr.length > 3) {
           comunasText = `Atiende en ${comunasArr.slice(0,3).join(', ')} y más comunas.`;
        } else {
           comunasText = `Atiende en ${comunasArr.join(', ')}.`;
        }
      } else {
        comunasText = isTaller ? (provider.comuna ? `Atiende en ${provider.comuna}.` : '') : 'Atiende a domicilio.';
      }

      const marcasArr = provider.marcas_atendidas_nombres || ['Multimarca'];
      const marcasText = marcasArr.length > 6 ? `${marcasArr.slice(0,6).join(', ')}...` : marcasArr.join(', ');

      const messageTexto = `Conoce a ${provider.nombre}, ${titleSpec}.\n${comunasText}\nEspecialista en: ${marcasText}\n\nVer en la web:\n${webUrl}\n\nAbrir en la app:\n${deepUrl}`;

      if (Platform.OS === 'web') {
          await Share.share({ message: messageTexto, title: 'MecaniMóvil', url: webUrl });
      } else {
          await Share.share({ message: messageTexto, url: webUrl }); // iOS/Android share natively passes url and message
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
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
        <Text style={{ color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: 16 }}>
          No pudimos cargar este perfil. El enlace puede estar incompleto o caducado.
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate(ROUTES.HOME)} style={{ padding: 12 }}>
          <Text style={{ color: '#93C5FD', fontWeight: '600' }}>Ir al inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loadingDetails && !initialProvider) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#6EE7B7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <View style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(16,185,129,0.08)' }} />
        <View style={{ position: 'absolute', top: 400, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(99,102,241,0.06)' }} />
        <View style={{ position: 'absolute', bottom: -40, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(6,182,212,0.05)' }} />
      </View>

      <ScrollView
        style={Platform.OS === 'web' ? styles.scrollWeb : undefined}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS !== 'web'}
      >
        <ProviderHeader provider={provider} providerType={providerType} onShare={handleShare} onToggleFavorite={handleToggleFavorite} isFavorite={favorite} onBack={handleBack} />

        {/* Quick Stats was removed to eliminate redundancy with ProviderHeader */}

        {/* Cobertura / Dirección */}
        {(() => {
          const resolvedType = providerType || (provider?.tipo === 'taller' ? 'taller' : 'mecanico');
          const isTaller = resolvedType === 'taller';

          if (!isTaller) {
            const zonasComunas = provider?.zonas_servicio ? provider.zonas_servicio.flatMap(z => z.comunas || []) : [];
            const comunasRaw = zonasComunas.length > 0 ? zonasComunas : (
              provider.comunas_cobertura_nombres
              || provider.comunas_cobertura?.map(c => c?.nombre || c)
              || provider.comunas_nombres
              || provider.comunas
              || provider.cobertura_comunas
              || []
            );

            const comunas = Array.isArray(comunasRaw) ? comunasRaw.filter(Boolean) : [];

            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Comunas de Cobertura</Text>
                {comunas.length > 0 ? (
                  <View style={styles.tagsRow}>
                    {comunas.map((c, i) => (
                      <View key={`${c}-${i}`} style={styles.tagBadge}>
                        {Platform.OS === 'ios' && <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
                        <MapPin size={12} color="rgba(255,255,255,0.5)" style={{ marginRight: 4 }} />
                        <Text style={styles.tagText}>{String(c)}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <GlassCard style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 18 }}>
                      Cobertura no disponible.
                    </Text>
                  </GlassCard>
                )}
              </View>
            );
          }

          const addr =
            provider.direccion_fisica?.direccion_completa
            || provider.direccion_fisica?.direccion
            || provider.direccion_fisica?.calle
            || provider.direccion_taller
            || provider.direccion
            || null;
          const comuna = provider.direccion_fisica?.comuna || provider.comuna || '';
          const display = [addr, comuna].filter(Boolean).join(', ') || 'Dirección no disponible.';

          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dirección del Taller</Text>
              <GlassCard style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <MapPin size={18} color="#93C5FD" />
                  <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', flex: 1, lineHeight: 20 }}>
                    {display}
                  </Text>
                </View>
              </GlassCard>
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
                {Platform.OS === 'ios' && <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
                <Text style={styles.tagText}>{brand}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Star size={16} color="#FBBF24" fill="#FBBF24" />
              <Text style={styles.sectionTitle}>Opiniones</Text>
            </View>
            {reviewsData?.reviews?.length > 0 && (
              <TouchableOpacity onPress={handleSeeAllReviews} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.seeAllText}>Ver todas</Text>
                <ChevronRight size={14} color="#93C5FD" />
              </TouchableOpacity>
            )}
          </View>

          {reviewsData?.reviews?.length > 0 ? (
            <TouchableOpacity onPress={handleSeeAllReviews} activeOpacity={0.9}>
              <ReviewCard review={reviewsData.reviews[0]} />
            </TouchableOpacity>
          ) : (
            <GlassCard>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <MessageCircle size={18} color="rgba(255,255,255,0.3)" />
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                  Este proveedor aún no ha recibido opiniones.
                </Text>
              </View>
            </GlassCard>
          )}
        </View>

        <TrustSection documents={documents || []} />

        {/* --- SECCIÓN DE SERVICIOS --- */}
        {provider.servicios && provider.servicios.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Award size={18} color="#A78BFA" />
              <Text style={styles.sectionTitle}>Servicios Profesionales</Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 12, marginTop: -10 }}>
              Revisa si el servicio o especialidad que necesitas es compatible con la marca de tus vehículos registrados.
            </Text>
            <View style={styles.servicesGrid}>
              {provider.servicios.map((servicio, idx) => {
                // Verificar compatibilidad simple con las marcas del garaje del usuario
                // Asumimos que si el proveedor atiende múltiples marcas o la marca del usuario, hay compatibilidad general.
                const providerBrands = provider.marcas_atendidas_nombres?.map(b => b.toLowerCase()) || [];
                let isCompatible = false;

                if (providerBrands.includes('multimarca')) {
                  isCompatible = true;
                } else if (userVehicles.length > 0) {
                  userVehicles.forEach(uv => {
                    const uM = (uv.marca_nombre || uv.marca || '').toLowerCase();
                    if (providerBrands.some(pb => pb.includes(uM) || uM.includes(pb))) {
                      isCompatible = true;
                    }
                  });
                }
                
                return (
                  <GlassCard key={`${servicio.id || idx}`} style={styles.serviceCardOuter}>
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
                          <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                          <Text style={styles.compatibilityText}>Compatible</Text>
                        </View>
                      </View>
                    ) : null}
                  </GlassCard>
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
    backgroundColor: '#030712',
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  /** Web: sin altura máxima el ScrollView crece con el contenido y no hay scroll (sesión con tabs/stack). */
  scrollWeb: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    padding: 14,
  },
  statValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 0,
  },
  seeAllText: {
    color: '#93C5FD',
    fontWeight: '600',
    fontSize: 13,
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
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  tagText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  serviceCardOuter: {
    width: '48%',
    padding: 12,
    marginBottom: 8,
  },
  serviceName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceCategory: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 10,
  },
  compatibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  compatibilityText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '500',
  },
  noVehiclesHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontStyle: 'italic',
  }
});

export default ProviderDetailScreen;
