import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Platform, TouchableOpacity, Linking } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MapPin, Award } from 'lucide-react-native';
import { ROUTES } from '../../utils/constants';

import ProviderHeader from '../../components/provider/ProviderHeader';
import TrustSection from '../../components/provider/TrustSection';
import ProviderCompletedJobsSection from '../../components/provider/ProviderCompletedJobsSection';
import PortfolioCarousel from '../../components/provider/PortfolioCarousel';
import MarketplaceDownloadBanner from '../../components/marketplace/MarketplaceDownloadBanner';

import { fetchPublicProviderFicha } from '../../services/providers';
import {
  getPublicProviderFromWebPath,
  normalizeProviderRouteParams,
  parsePublicProviderFromUrl,
} from '../../utils/publicListingRoute';

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

const PublicProviderDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const params = route.params || {};
  const normalizedFromRoute = useMemo(
    () => normalizeProviderRouteParams(params),
    [params.id, params.providerId, params.type, params.providerType]
  );

  const [fromLink, setFromLink] = useState(null);

  /** Web (Vercel / WhatsApp → navegador): la URL es la fuente de verdad; linking a veces deja params vacíos. */
  const webFromLocation = Platform.OS === 'web' ? getPublicProviderFromWebPath() : null;

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

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (normalizedFromRoute.providerId != null) {
      setFromLink(null);
      return undefined;
    }
    let alive = true;
    const apply = (url) => {
      const parsed = url ? parsePublicProviderFromUrl(url) : null;
      if (parsed && alive) {
        setFromLink({ providerType: parsed.type, providerId: parsed.id });
      }
    };
    Linking.getInitialURL().then(apply);
    const sub = Linking.addEventListener('url', (e) => apply(e?.url));
    return () => {
      alive = false;
      sub.remove();
    };
  }, [normalizedFromRoute.providerId]);

  const providerId =
    webFromLocation?.providerId ??
    normalizedFromRoute.providerId ??
    fromLink?.providerId ??
    null;
  const providerType =
    webFromLocation?.providerType ??
    (normalizedFromRoute.providerId != null ? normalizedFromRoute.providerType : null) ??
    fromLink?.providerType ??
    'taller';

  const [details, setDetails] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const reload = useCallback(async () => {
    if (providerId == null || providerId === '' || !providerType) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { detail, servicios: svc, documents: docs } = await fetchPublicProviderFicha(
        providerId,
        providerType
      );
      setDetails(detail);
      setServicios(Array.isArray(svc) ? svc : []);
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (e) {
      setLoadError('No se pudo cargar esta ficha. Revisa tu conexión o el enlace.');
      setDetails(null);
      setServicios([]);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [providerId, providerType]);

  useEffect(() => {
    reload();
  }, [reload]);

  const completedJobs = [];
  const provider = { ...details, servicios };

  if (providerId == null || providerId === '' || !providerType) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text style={{ color: 'white', textAlign: 'center' }}>
          Enlace de perfil no válido o incompleto.
        </Text>
        <TouchableOpacity
          style={styles.fallbackPrimaryButton}
          onPress={() => navigation.navigate(ROUTES.LOGIN)}
        >
          <Text style={styles.ctaButtonText}>Ir a iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: 'white' }}>Cargando información del especialista...</Text>
      </View>
    );
  }

  if (loadError || !details) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text style={{ color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 16 }}>
          {loadError ||
            'No se pudo cargar la ficha del especialista. Comprueba tu conexión e inténtalo de nuevo.'}
        </Text>
        <TouchableOpacity style={styles.fallbackPrimaryButton} onPress={() => reload()}>
          <Text style={styles.ctaButtonText}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 16 }} onPress={() => navigation.navigate(ROUTES.LOGIN)}>
          <Text style={{ color: '#93C5FD' }}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, Platform.OS === 'web' && styles.containerWeb]}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <ScrollView
        showsVerticalScrollIndicator={Platform.OS !== 'web'}
        contentContainerStyle={styles.scrollContent}
        style={Platform.OS === 'web' ? styles.scrollWeb : undefined}
        keyboardShouldPersistTaps="handled"
      >
        <ProviderHeader
          provider={provider}
          providerType={providerType}
          showBackButton={false}
        />

        <View style={styles.bannerWrap}>
          <MarketplaceDownloadBanner forPublicProfile />
        </View>

        {/* Cobertura / Dirección */}
        {(() => {
          const isTaller = providerType === 'taller';

          if (!isTaller) {
            const zonasComunas = provider?.zonas_servicio ? provider.zonas_servicio.flatMap(z => z.comunas || []) : [];
            const comunasRaw = zonasComunas.length > 0 ? zonasComunas : (
              provider.comunas_cobertura_nombres || provider.comunas_cobertura?.map(c => c?.nombre || c) || []
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

          const addr = provider.direccion_fisica?.direccion_completa || provider.direccion_taller || null;
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

        <TrustSection documents={documents || []} />

        {/* --- SECCIÓN DE SERVICIOS PÚBLICA --- */}
        {provider.servicios && provider.servicios.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Award size={18} color="#A78BFA" />
              <Text style={styles.sectionTitle}>Servicios Profesionales</Text>
            </View>
            <View style={styles.servicesGrid}>
              {provider.servicios.map((servicio, idx) => {
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
                  </GlassCard>
                );
              })}
            </View>
          </View>
        )}

        <ProviderCompletedJobsSection jobs={completedJobs} />
        <PortfolioCarousel portfolio={provider.portafolio || []} />

        {/* --- Call to Action para Login (solo si el app se usa sin sesión) --- */}
        <View style={[styles.section, { marginTop: 20, marginBottom: 40 }]}>
            <GlassCard style={styles.ctaCard}>
                <LinearGradient
                    colors={['rgba(59, 130, 246, 0.1)', 'rgba(147, 197, 253, 0.05)']}
                    style={StyleSheet.absoluteFill}
                />
                <Text style={styles.ctaTitle}>¿Necesitas un servicio?</Text>
                <Text style={styles.ctaText}>
                    Inicia sesión para solicitar presupuestos, chatear con este especialista y agendar tu atención.
                </Text>
                <TouchableOpacity 
                    style={styles.ctaButton}
                    onPress={() => navigation.navigate(ROUTES.LOGIN)}
                >
                    <LinearGradient
                        colors={['#007EA7', '#00A8E8']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.ctaGradient}
                    >
                        <Text style={styles.ctaButtonText}>Iniciar Sesión</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </GlassCard>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  /** Web: sin altura fija ni overflow:hidden (rompe el scroll en Chrome con caché / extensión). */
  containerWeb: {
    flexGrow: 1,
    minHeight: '100%',
  },
  scrollWeb: {
    flexGrow: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bannerWrap: {
    paddingHorizontal: 16,
    marginTop: -36,
    marginBottom: 8,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 0,
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
    color: '#F9FAFB',
    fontSize: 13,
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
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceCategory: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 0,
  },
  // CTA Styles
  ctaCard: {
    padding: 24,
    alignItems: 'center',
    textAlign: 'center',
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  ctaText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  fallbackPrimaryButton: {
    marginTop: 20,
    width: '85%',
    maxWidth: 320,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#007EA7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  ctaGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PublicProviderDetailScreen;
