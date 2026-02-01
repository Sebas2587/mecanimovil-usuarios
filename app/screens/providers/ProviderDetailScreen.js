import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  Share,
  Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../../design-system/tokens/colors';
import { ROUTES } from '../../utils/constants';

// Modular Components
import ProviderHeader from '../../components/provider/ProviderHeader';
import TrustSection from '../../components/provider/TrustSection';
import ServicesList from '../../components/provider/ServicesList';
import ProviderCompletedJobsSection from '../../components/provider/ProviderCompletedJobsSection';
import PortfolioCarousel from '../../components/provider/PortfolioCarousel';
import StickyFooter from '../../components/provider/StickyFooter';

// Hooks & Services
import { useProviderDetails, useProviderServices, useProviderDocuments, useProviderReviews, useProviderCompletedJobs } from '../../hooks/useProviders';
import ReviewCard from '../../components/reviews/ReviewCard';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

const ProviderDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Extract params with robust fallbacks
  const { provider: initialProvider, providerId, type } = route.params || {};
  const idToLoad = providerId || initialProvider?.id;
  const providerType = type || (initialProvider?.tipo === 'taller' ? 'taller' : 'mecanico');

  // Fetch Data
  const { data: details, isLoading: loadingDetails } = useProviderDetails(idToLoad, providerType);
  const { data: services } = useProviderServices(idToLoad, providerType);
  const { data: documents } = useProviderDocuments(idToLoad, providerType);
  const { data: reviewsData } = useProviderReviews(idToLoad, providerType);
  const { data: completedJobs = [] } = useProviderCompletedJobs(idToLoad, providerType);

  // Merge data
  const provider = { ...initialProvider, ...details, servicios: services || initialProvider?.servicios || [] };

  // Handlers
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Te recomiendo a ${provider.nombre} en MecaniMóvil!`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleChat = () => {
    // Navigate to chat (placeholder)
    navigation.navigate(ROUTES.CHATS_LIST);
  };

  const handleQuote = () => {
    // Navigate to booking flow
    navigation.navigate(ROUTES.CREAR_SOLICITUD, {
      proveedorPreseleccionado: provider,
      tipoProveedorPreseleccionado: providerType,
      fromProviderDetail: true
    });
  };

  const handleSeeAllReviews = () => {
    navigation.navigate(ROUTES.PROVIDER_REVIEWS, {
      providerId: idToLoad,
      providerType: providerType
    });
  };

  const handleServiceSelect = (service) => {
    navigation.navigate('TabNavigator', {
      screen: ROUTES.CREAR_SOLICITUD,
      params: {
        proveedorPreseleccionado: provider,
        tipoProveedorPreseleccionado: providerType,
        servicioPreseleccionado: service,
        fromProviderDetail: true
      }
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProviderHeader provider={provider} onShare={handleShare} />

        {/* Bio Section */}
        <View style={styles.bioContainer}>
          <Text style={styles.bioText}>
            {provider.descripcion || `Profesional automotriz altamente capacitado con especialidad en vehículos ${providerType === 'taller' ? 'multimarca' : 'particulares'}. Comprometido con la calidad y la transparencia en cada servicio.`}
          </Text>
        </View>

        {/* Specialties (Brands) */}
        <View style={styles.tagsContainer}>
          <Text style={styles.sectionTitle}>Especialidad en Marcas</Text>
          <View style={styles.tagsRow}>
            {(provider.marcas_atendidas_nombres && provider.marcas_atendidas_nombres.length > 0
              ? provider.marcas_atendidas_nombres
              : ['Multimarca', 'Chevrolet', 'Toyota', 'Nissan'] // Fallback
            ).map((brand, i) => (
              <View key={i} style={styles.tagBadge}>
                <Text style={styles.tagText}>{brand}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Reviews Section */}
        {reviewsData && reviewsData.total_reviews > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="star" size={18} color={COLORS.warning.main} style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>Reseñas Recientes</Text>
              </View>
              <TouchableOpacity onPress={handleSeeAllReviews}>
                <Text style={styles.seeAllText}>Ver todas</Text>
              </TouchableOpacity>
            </View>

            {/* Latest Review Preview */}
            {reviewsData.reviews && reviewsData.reviews.length > 0 && (
              <TouchableOpacity
                onPress={handleSeeAllReviews}
                activeOpacity={0.9}
                style={{ paddingHorizontal: 16 }} // Add Horizontal Padding
              >
                <ReviewCard review={reviewsData.reviews[0]} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <TrustSection documents={documents || []} />

        <ServicesList services={provider.servicios} onServicePress={handleServiceSelect} />

        <ProviderCompletedJobsSection jobs={completedJobs} />

        <PortfolioCarousel portfolio={provider.portafolio || []} />

      </ScrollView>

      <StickyFooter onChatPress={handleChat} onQuotePress={handleQuote} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingBottom: 100, // Space for footer
  },
  bioContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  bioText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  tagsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.base.inkBlack,
    color: COLORS.base.inkBlack,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBadge: {
    backgroundColor: COLORS.base.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray[200],
  },
  tagText: {
    fontSize: 12,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    color: COLORS.secondary[500],
    fontWeight: '700',
    fontSize: 14,
  },
});

export default ProviderDetailScreen;
