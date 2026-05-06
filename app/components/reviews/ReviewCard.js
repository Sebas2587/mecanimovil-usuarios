import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';

const ReviewCard = ({ review }) => {
  const {
    cliente_nombre,
    cliente_avatar,
    calificacion,
    comentario,
    created_at,
    fecha_hora_resena,
    service_context,
    photos = [],
  } = review;

  const getRelativeTime = (dateInput, fallbackDisplay) => {
    if (!dateInput) return fallbackDisplay || 'Fecha no disponible';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return fallbackDisplay || dateInput || 'Fecha no disponible';

    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Hace un momento';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours} h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `Hace ${diffInDays} días`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `Hace ${diffInMonths} meses`;
    return `Hace ${Math.floor(diffInDays / 365)} años`;
  };

  return (
    <View style={styles.cardContainer}>
      <View style={styles.headerRow}>
        <View style={styles.userInfoLeft}>
          <Image
            source={{
              uri:
                cliente_avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(cliente_nombre || 'User')}&background=random`,
            }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.nameColumn}>
            <Text style={styles.userName}>{cliente_nombre}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name="star"
                  size={10}
                  color={star <= calificacion ? COLORS.warning.main : COLORS.neutral.gray[300]}
                />
              ))}
            </View>
          </View>
        </View>
        <Text style={styles.relativeDate}>
          {getRelativeTime(created_at || fecha_hora_resena, fecha_hora_resena)}
        </Text>
      </View>

      {service_context && (
        <View style={styles.contextBadge}>
          <Ionicons
            name="construct"
            size={12}
            color={COLORS.text.secondary}
            style={styles.contextIcon}
          />
          <Text style={styles.contextText}>
            {service_context.service_name || 'Servicio'}
            {service_context.vehicle_model ? ` • ${service_context.vehicle_model}` : ''}
          </Text>
        </View>
      )}

      <Text style={styles.commentText}>{comentario}</Text>

      {photos && photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
          {photos.map((photoUrl, index) => (
            <Image
              key={index}
              source={{ uri: photoUrl }}
              style={styles.photoThumbnail}
              contentFit="cover"
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.full,
    marginRight: 12,
    backgroundColor: COLORS.neutral.gray[100],
  },
  nameColumn: {
    justifyContent: 'center',
  },
  userName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  relativeDate: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BORDERS.radius.full,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  contextIcon: {
    marginRight: 6,
  },
  contextText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
  commentText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  photosContainer: {
    marginTop: 12,
    flexDirection: 'row',
  },
  photoThumbnail: {
    width: 64,
    height: 64,
    borderRadius: BORDERS.radius.md,
    marginRight: 8,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
});

export default ReviewCard;
