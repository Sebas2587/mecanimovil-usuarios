import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Platform, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { MapPin, Award } from 'lucide-react-native';
import { ROUTES } from '../../utils/constants';

import ProviderHeader from '../../components/provider/ProviderHeader';
import TrustSection from '../../components/provider/TrustSection';
import ProviderCompletedJobsSection from '../../components/provider/ProviderCompletedJobsSection';
import PortfolioCarousel from '../../components/provider/PortfolioCarousel';
import MarketplaceDownloadBanner from '../../components/marketplace/MarketplaceDownloadBanner';

import { useProviderDetails, useProviderServices, useProviderDocuments, useProviderCompletedJobs } from '../../hooks/useProviders';

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
  const { height: windowHeight } = useWindowDimensions();

  const { providerId, providerType } = route.params || {};

  const { data: details, isLoading } = useProviderDetails(providerId, providerType);
  const { data: services } = useProviderServices(providerId, providerType);
  const { data: documents } = useProviderDocuments(providerId, providerType);
  const { data: completedJobs = [] } = useProviderCompletedJobs(providerId, providerType);

  const provider = { ...details, servicios: services || [] };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(ROUTES.LOGIN);
    }
  };

  const showBackButton = Platform.OS !== 'web'; // Si estamos en la web como ficha pública, ocultar atrás

  const webRootStyle = Platform.OS === 'web'
    ? { height: windowHeight, maxHeight: windowHeight, overflow: 'hidden' }
    : null;
  const webScrollStyle = Platform.OS === 'web' ? { flex: 1, minHeight: 0 } : null;

  if (isLoading || !details) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: 'white' }}>Cargando información del especialista...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, webRootStyle]}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} style={webScrollStyle}>
        
        {/* Usamos el ProviderHeader simplificado, desactivando compartir y favoritos */}
        <ProviderHeader 
            provider={provider} 
            providerType={providerType} 
            onBack={showBackButton ? handleBack : undefined} 
        />

        <View style={{ paddingHorizontal: 16, marginTop: -40 }}>
           <MarketplaceDownloadBanner style={{ marginTop: 4, marginHorizontal: 0, marginBottom: 20 }} />
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

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  scrollContent: {
    paddingBottom: 30,
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
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceCategory: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 0,
  },
});

export default PublicProviderDetailScreen;
