import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFavorites } from '../../context/FavoritesContext';
import { COLORS } from '../../design-system/tokens/colors';
import { ROUTES } from '../../utils/constants';
import { formatProviderForCard } from '../../utils/providerUtils';

const GLASS_BG = Platform.select({
  ios: 'rgba(255,255,255,0.06)',
  android: 'rgba(255,255,255,0.10)',
  default: 'rgba(255,255,255,0.08)',
});
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

const FavoriteProviderCard = ({ provider, onPress }) => {
  const formatted = formatProviderForCard(provider);
  const avatarUri = formatted.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(formatted.name)}&background=random`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {Platform.OS === 'ios' && <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />}
      <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{formatted.name}</Text>
        <Text style={styles.specialty} numberOfLines={2}>{formatted.specialty}</Text>
        <View style={styles.ratingRow}>
          {formatted.rating != null ? (
            <>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingText}>{formatted.rating}</Text>
              {formatted.reviews > 0 && (
                <Text style={styles.reviewsText}>({formatted.reviews})</Text>
              )}
            </>
          ) : (
            <Text style={styles.newProviderText}>Sin calificaciones</Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
    </TouchableOpacity>
  );
};

const FavoriteProvidersScreen = () => {
  const navigation = useNavigation();
  const { favorites } = useFavorites();

  const handlePress = (item) => {
    // Navigate to Home tab first, then to provider detail
    navigation.navigate(ROUTES.PROVIDER_DETAIL, {
      providerId: item.id,
      providerType: item.type,
      provider: item,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <View style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(16,185,129,0.08)' }} />
        <View style={{ position: 'absolute', top: 320, left: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(99,102,241,0.06)' }} />
        <View style={{ position: 'absolute', bottom: -50, right: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(6,182,212,0.05)' }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color="rgba(255,255,255,0.28)" />
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
              <Ionicons name="arrow-forward" size={18} color="#F9FAFB" />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
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
    color: '#F9FAFB',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007EA7',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(110,231,183,0.25)',
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  browseButtonSecondary: {
    marginTop: 12,
    paddingVertical: 12,
  },
  browseButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#93C5FD',
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GLASS_BG,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    overflow: 'hidden',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.62)',
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
    color: '#F9FAFB',
  },
  reviewsText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginLeft: 2,
  },
  newProviderText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    fontStyle: 'italic',
  },
});

export default FavoriteProvidersScreen;
