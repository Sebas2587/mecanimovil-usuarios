import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFavorites } from '../../context/FavoritesContext';
import { COLORS } from '../../design-system/tokens/colors';
import { ROUTES } from '../../utils/constants';

const formatProviderData = (provider) => {
  const specialty =
    provider?.marcas_atendidas_nombres?.length > 0
      ? provider.marcas_atendidas_nombres.join(', ')
      : provider?.especialidades_nombres?.length > 0
        ? provider.especialidades_nombres.join(', ')
        : 'Especialidad general';
  return {
    id: provider.id,
    type: provider.type,
    name: provider.nombre || 'Proveedor',
    specialty,
    rating: provider.calificacion_promedio != null
      ? parseFloat(provider.calificacion_promedio).toFixed(1)
      : null,
    reviews: provider.numero_de_calificaciones ?? 0,
    image: provider.foto_perfil || provider.usuario?.foto_perfil || provider.foto_perfil_url,
    verified: provider.verificado ?? false,
  };
};

const FavoriteProviderCard = ({ provider, onPress }) => {
  const formatted = formatProviderData(provider);
  const avatarUri = formatted.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(formatted.name)}&background=random`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{formatted.name}</Text>
        <Text style={styles.specialty} numberOfLines={2}>{formatted.specialty}</Text>
        {(formatted.rating != null || formatted.reviews > 0) && (
          <View style={styles.ratingRow}>
            {formatted.rating != null && (
              <>
                <Ionicons name="star" size={12} color={COLORS.warning[500]} />
                <Text style={styles.ratingText}>{formatted.rating}</Text>
              </>
            )}
            {formatted.reviews > 0 && (
              <Text style={styles.reviewsText}>({formatted.reviews})</Text>
            )}
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
    </TouchableOpacity>
  );
};

const FavoriteProvidersScreen = () => {
  const navigation = useNavigation();
  const { favorites } = useFavorites();

  const handlePress = (item) => {
    navigation.navigate(ROUTES.PROVIDER_DETAIL, {
      providerId: item.id,
      providerType: item.type,
      provider: item,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color={COLORS.neutral.gray[300]} />
            <Text style={styles.emptyTitle}>Aún no tienes proveedores favoritos</Text>
            <Text style={styles.emptySubtitle}>
              Guarda tus talleres o mecánicos favoritos tocando el corazón en su perfil
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate(ROUTES.TALLERES)}
              activeOpacity={0.8}
            >
              <Text style={styles.browseButtonText}>Buscar Talleres</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.base.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.browseButtonSecondary}
              onPress={() => navigation.navigate(ROUTES.MECANICOS)}
              activeOpacity={0.8}
            >
              <Text style={styles.browseButtonSecondaryText}>Buscar Mecánicos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {favorites.map((item) => (
              <FavoriteProviderCard
                key={`${item.id}-${item.type}`}
                provider={item}
                onPress={() => handlePress(item)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default || '#F9FAFB',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary[500],
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.base.white,
  },
  browseButtonSecondary: {
    marginTop: 12,
    paddingVertical: 12,
  },
  browseButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary[500],
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.base.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.neutral.gray[100],
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  specialty: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  reviewsText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginLeft: 2,
  },
});

export default FavoriteProvidersScreen;
