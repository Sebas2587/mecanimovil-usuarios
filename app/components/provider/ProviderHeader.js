import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
import {
  buildProviderAvatarUri,
  resolveProviderKpiBadge,
  isProviderOpenAccordingToWeeklyHorarios,
  weeklyHorariosHasAnyActiveSlot,
} from '../../utils/providerUtils';
import ProviderKpiTierBadge from './ProviderKpiTierBadge';
import { modalidadBadges } from '../../utils/providerModalidad';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function useScheduleOpenTick(enabled) {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => setTick(Date.now()), 60000);
    return () => clearInterval(id);
  }, [enabled]);
  return tick;
}

const ProviderHeader = ({
  provider,
  providerType,
  /** Si es true, el pill de disponibilidad usa `weeklyHorarios` (hora local del dispositivo). */
  useWeeklyAvailabilityBadge = false,
  /** Lista de `{ dia_semana, activo, hora_inicio, hora_fin }` o `undefined` mientras carga el hook. */
  weeklyHorarios,
  onShare,
  onToggleFavorite,
  isFavorite = false,
  onBack,
  showBackButton = true,
}) => {
  const showVerifiedBadge = !!provider?.verificado;
  const kpiBadge = resolveProviderKpiBadge(provider);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scheduleTick = useScheduleOpenTick(useWeeklyAvailabilityBadge);

  const availability = useMemo(() => {
    if (!useWeeklyAvailabilityBadge) {
      return { phase: 'hidden' };
    }
    if (weeklyHorarios === undefined) {
      return { phase: 'loading' };
    }
    const hasAny = weeklyHorariosHasAnyActiveSlot(weeklyHorarios);
    if (!hasAny) {
      return { phase: 'unavailable', label: 'No disponible' };
    }
    const open = isProviderOpenAccordingToWeeklyHorarios(weeklyHorarios, new Date(scheduleTick));
    return {
      phase: open ? 'open' : 'closed',
      label: open ? 'Disponible' : 'No disponible',
    };
  }, [useWeeklyAvailabilityBadge, weeklyHorarios, scheduleTick]);

  const name = provider?.nombre || 'Proveedor Profesional';
  const resolvedType = providerType || (provider?.tipo === 'taller' ? 'taller' : 'mecanico');
  const type = resolvedType === 'taller' ? 'Taller' : 'Mecánico a Domicilio';
  const location = provider?.direccion_fisica?.comuna || provider?.comuna || '';
  const rawCalif = provider?.calificacion_promedio;
  const ratingNum =
    rawCalif === '' || rawCalif === null || rawCalif === undefined ? NaN : Number(rawCalif);
  const rating =
    Number.isFinite(ratingNum) && ratingNum > 0 ? ratingNum.toFixed(1) : '';
  const jobs = provider?.servicios_completados ?? provider?.trabajos_realizados ?? '';
  const experience = provider?.experiencia_anos ?? provider?.experiencia_anios ?? '';

  const coverImage =
    provider?.foto_portada ||
    'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?q=80&w=1000&auto=format&fit=crop';
  const avatarImage =
    buildProviderAvatarUri(provider) ||
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=256&auto=format&fit=crop';

  return (
    <View style={styles.container}>
      <View style={styles.coverContainer}>
        <Image source={{ uri: coverImage }} style={styles.coverImage} contentFit="cover" cachePolicy="memory-disk" />
        <View style={styles.coverOverlay} pointerEvents="none" />

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          {showBackButton ? (
            <TouchableOpacity
              style={[styles.iconButton, Platform.OS === 'web' && styles.iconButtonWeb]}
              onPress={onBack || (() => navigation.goBack())}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconButton} accessibilityElementsHidden />
          )}
          <View style={styles.rightActions}>
            {onShare ? (
              <TouchableOpacity style={styles.iconButton} onPress={onShare} activeOpacity={0.85}>
                <Ionicons name="share-outline" size={22} color={COLORS.text.primary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.iconButton} />
            )}
            {onToggleFavorite && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onToggleFavorite}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isFavorite ? COLORS.error.main : COLORS.text.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: avatarImage }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" transition={150} />
            {showVerifiedBadge ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={12} color={COLORS.text.inverse} />
              </View>
            ) : null}
          </View>

          {availability.phase === 'hidden' ? null : availability.phase === 'loading' ? (
            <View style={[styles.statusBadge, styles.statusBadgeLoading]}>
              <ActivityIndicator size="small" color={COLORS.text.tertiary} />
              <Text style={styles.statusTextMuted}>Horario…</Text>
            </View>
          ) : (
            <View
              style={[
                styles.statusBadge,
                availability.phase === 'open' ? styles.statusBadgeOpen : styles.statusBadgeClosed,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  availability.phase === 'open' ? styles.statusDotOpen : styles.statusDotClosed,
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  availability.phase === 'open' ? styles.statusTextOpen : styles.statusTextClosed,
                ]}
              >
                {availability.label}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          <ProviderKpiTierBadge
            kpiBadge={kpiBadge}
            provider={provider}
            trustBadgeFields
            variant="inline"
            style={styles.kpiBadgeRight}
          />
        </View>

        <Text style={styles.type}>{[type, location].filter(Boolean).join(' • ') || type}</Text>

        {modalidadBadges(provider).length > 0 && (
          <View style={styles.modalidadRow}>
            {modalidadBadges(provider).map((b) => (
              <View key={b.key} style={styles.modalidadBadge}>
                <MaterialIcons name={b.icon} size={13} color={COLORS.primary[500]} />
                <Text style={styles.modalidadBadgeText}>{b.label}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color={COLORS.warning.main} />
              <Text style={styles.statValue}>{rating !== '' ? rating : '—'}</Text>
            </View>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{jobs !== '' ? `${jobs}+` : '—'}</Text>
            <Text style={styles.statLabel}>Trabajos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {experience !== '' ? `${experience} años` : '—'}
            </Text>
            <Text style={styles.statLabel}>Experiencia</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  coverContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
    backgroundColor: COLORS.neutral.gray[200],
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,11,13,0.18)',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.container.horizontal,
    paddingBottom: 8,
    zIndex: 10,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  iconButtonWeb: {
    zIndex: 20,
    cursor: 'pointer',
  },
  profileCard: {
    marginTop: -40,
    marginHorizontal: SPACING.container.horizontal,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: BORDERS.radius.full,
    borderWidth: 3,
    borderColor: COLORS.background.paper,
    backgroundColor: COLORS.neutral.gray[100],
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary[500],
    width: 20,
    height: 20,
    borderRadius: BORDERS.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background.paper,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.full,
    borderWidth: 1,
    maxWidth: '52%',
  },
  statusBadgeOpen: {
    backgroundColor: COLORS.success.light,
    borderColor: COLORS.success.main,
  },
  statusBadgeClosed: {
    backgroundColor: COLORS.neutral.gray[100],
    borderColor: COLORS.neutral.gray[300],
  },
  statusBadgeLoading: {
    backgroundColor: COLORS.neutral.gray[100],
    borderColor: COLORS.neutral.gray[300],
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusDotOpen: {
    backgroundColor: COLORS.success.main,
  },
  statusDotClosed: {
    backgroundColor: COLORS.neutral.gray[500],
  },
  statusText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  statusTextOpen: {
    color: COLORS.success.main,
  },
  statusTextClosed: {
    color: COLORS.text.secondary,
  },
  statusTextMuted: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.tertiary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    fontWeight: TYPOGRAPHY.styles.h3.fontWeight,
    letterSpacing: TYPOGRAPHY.styles.h3.letterSpacing,
    color: COLORS.text.primary,
  },
  kpiBadgeRight: {
    flexShrink: 0,
    alignSelf: 'flex-start',
    maxWidth: '44%',
  },
  type: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    marginBottom: 12,
  },
  modalidadRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  modalidadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50] ?? '#EEF2FB',
    borderRadius: BORDERS.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 6,
  },
  modalidadBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary[500],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginLeft: 5,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    paddingTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginLeft: 4,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: COLORS.border.light,
    alignSelf: 'center',
  },
});

export default ProviderHeader;
