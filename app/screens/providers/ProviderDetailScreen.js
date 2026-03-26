import React from 'react';
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
import { ROUTES } from '../../utils/constants';

import ProviderHeader from '../../components/provider/ProviderHeader';
import TrustSection from '../../components/provider/TrustSection';
import ProviderCompletedJobsSection from '../../components/provider/ProviderCompletedJobsSection';
import PortfolioCarousel from '../../components/provider/PortfolioCarousel';

import { useProviderDetails, useProviderServices, useProviderDocuments, useProviderReviews, useProviderCompletedJobs } from '../../hooks/useProviders';
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

  const params = route.params || {};
  const { provider: initialProvider, providerId, type, providerType: paramProviderType } = params;
  const idToLoad = providerId || initialProvider?.id;
  const providerType = type || paramProviderType || (initialProvider?.tipo === 'taller' ? 'taller' : 'mecanico');

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
    try {
      await Share.share({ message: `Te recomiendo a ${provider.nombre} en MecaniMóvil!` });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSeeAllReviews = () => {
    navigation.navigate(ROUTES.PROVIDER_REVIEWS, { providerId: idToLoad, providerType });
  };

  const handleBack = () => navigation.goBack();

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ProviderHeader provider={provider} providerType={providerType} onShare={handleShare} onToggleFavorite={handleToggleFavorite} isFavorite={favorite} onBack={handleBack} />

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Award size={18} color="#6EE7B7" />
            <Text style={styles.statValue}>{provider.experiencia_anios ?? '—'}</Text>
            <Text style={styles.statLabel}>Años exp.</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Star size={18} color="#FBBF24" />
            <Text style={styles.statValue}>{provider.calificacion_promedio ?? '—'}</Text>
            <Text style={styles.statLabel}>Calificación</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <MapPin size={18} color="#93C5FD" />
            <Text style={styles.statValue} numberOfLines={1}>{provider.direccion_fisica?.comuna || provider.comuna || '—'}</Text>
            <Text style={styles.statLabel}>Ubicación</Text>
          </GlassCard>
        </View>

        {/* Cobertura / Dirección */}
        {(() => {
          const resolvedType = providerType || (provider?.tipo === 'taller' ? 'taller' : 'mecanico');
          const isTaller = resolvedType === 'taller';

          if (!isTaller) {
            const comunasRaw =
              provider.comunas_cobertura_nombres
              || provider.comunas_cobertura?.map(c => c?.nombre || c)
              || provider.comunas_nombres
              || provider.comunas
              || provider.cobertura_comunas
              || [];

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
});

export default ProviderDetailScreen;
