import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFavorites } from '../../context/FavoritesContext';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS, SPACING, SHADOWS } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import { formatProviderForCard } from '../../utils/providerUtils';

const FavoriteProviderCard = ({ provider, onPress }) => {
  const formatted = formatProviderForCard(provider);
  const avatarUri =
    formatted.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(formatted.name)}&background=random`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {formatted.name}
        </Text>
        <Text style={styles.specialty} numberOfLines={2}>
          {formatted.specialty}
        </Text>
        <View style={styles.ratingRow}>
          {formatted.rating != null ? (
            <>
              <Ionicons name="star" size={12} color={COLORS.warning[500]} />
              <Text style={styles.ratingText}>{formatted.rating}</Text>
              {formatted.reviews > 0 && <Text style={styles.reviewsText}>({formatted.reviews})</Text>}
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
    navigation.navigate(ROUTES.PROVIDER_DETAIL, {
      providerId: item.id,
      providerType: item.type,
      provider: item,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={48} color={COLORS.neutral.gray[300]} />
            <Text style={styles.emptyMessage}>No hay proveedores favoritos</Text>
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
    backgroundColor: COLORS.background.default,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyMessage: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginTop: 16,
    textAlign: 'center',
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
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
  newProviderText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
});

export default FavoriteProvidersScreen;
