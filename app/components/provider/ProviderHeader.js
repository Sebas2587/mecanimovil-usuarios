import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import {
  Share2,
  Heart,
  Star,
  BadgeCheck,
  Building2,
  Car,
  Globe,
} from 'lucide-react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import BackButton from '../navigation/BackButton';
import {
  buildProviderAvatarUri,
  resolveProviderKpiBadge,
  isProviderMultimarca,
  isProviderOpenAccordingToWeeklyHorarios,
  weeklyHorariosHasAnyActiveSlot,
} from '../../utils/providerUtils';
import ProviderKpiTierBadge from './ProviderKpiTierBadge';
import { getProviderModalidad, modalidadLabel, modalidadBadges } from '../../utils/providerModalidad';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ModalidadIcon = ({ name, color }) => {
  const size = 13;
  if (name === 'directions-car') {
    return <Car size={size} color={color} strokeWidth={2} />;
  }
  return <Building2 size={size} color={color} strokeWidth={2} />;
};

function useScheduleOpenTick(enabled) {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => setTick(Date.now()), 60000);
    return () => clearInterval(id);
  }, [enabled]);
  return tick;
}

/**
 * Bloque de título estilo Airbnb (detalle de listing):
 * nombre grande, subtítulo con ubicación/modalidad, fila de métricas
 * "★ 4.8 · 12 reseñas · N servicios" y pills. Sin imágenes stock: si el
 * proveedor no tiene fotos reales, la pantalla abre directo con este bloque.
 */
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
  const type = resolvedType === 'taller' ? 'Taller mecánico' : 'Mecánico a domicilio';
  const location = provider?.direccion_fisica?.comuna || provider?.comuna || '';
  const modalidad = getProviderModalidad(provider);
  const modalidadText = modalidadLabel(modalidad);

  const subtitle = [location || type, modalidadText].filter(Boolean).join(' · ');

  const rawCalif = provider?.calificacion_promedio;
  const ratingNum =
    rawCalif === '' || rawCalif === null || rawCalif === undefined ? NaN : Number(rawCalif);
  const rating =
    Number.isFinite(ratingNum) && ratingNum > 0 ? ratingNum.toFixed(1) : '';
  const reviewsCount = Number(provider?.numero_de_calificaciones) || 0;
  const jobsRaw = provider?.servicios_completados ?? provider?.trabajos_realizados;
  const jobs = Number(jobsRaw) || 0;

  // Foto real del proveedor (sin fallback stock). Si no hay, no se muestra avatar.
  const avatarUri = buildProviderAvatarUri(provider);

  const esMultimarca = isProviderMultimarca(provider);
  const marcas = provider?.marcas_atendidas_nombres || [];
  const especialistaLabel =
    !esMultimarca && marcas.length > 0
      ? `Especialista ${marcas[0]}${marcas.length > 1 ? ` +${marcas.length - 1}` : ''}`
      : null;

  const showTopBar = showBackButton || !!onShare || !!onToggleFavorite;

  return (
    <View style={styles.container}>
      {showTopBar ? (
        <View style={[styles.topBar, { paddingTop: insets.top + SPACING.xs }]}>
          {showBackButton ? (
            <BackButton
              onPress={onBack || (() => navigation.goBack())}
              style={Platform.OS === 'web' ? styles.iconButtonWeb : undefined}
            />
          ) : (
            <View style={styles.iconButtonSpacer} accessibilityElementsHidden />
          )}
          <View style={styles.rightActions}>
            {onShare ? (
              <TouchableOpacity style={styles.iconButton} onPress={onShare} activeOpacity={0.85}>
                <Share2 size={18} color={COLORS.text.primary} strokeWidth={2} />
              </TouchableOpacity>
            ) : null}
            {onToggleFavorite ? (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onToggleFavorite}
                activeOpacity={0.85}
              >
                <Heart
                  size={18}
                  color={isFavorite ? COLORS.error.main : COLORS.text.primary}
                  fill={isFavorite ? COLORS.error.main : 'transparent'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.titleBlock}>
        <View style={styles.titleRow}>
          <View style={styles.titleTextCol}>
            <Text style={styles.name}>{name}</Text>
            {availability.phase === 'hidden' ? null : availability.phase === 'loading' ? (
              <View style={styles.presenceRow} accessibilityRole="text" accessibilityLabel="Consultando horario">
                <ActivityIndicator size="small" color={COLORS.text.tertiary} />
                <Text style={styles.presenceTextMuted}>Horario…</Text>
              </View>
            ) : (
              <View
                style={styles.presenceRow}
                accessibilityRole="text"
                accessibilityLabel={
                  availability.phase === 'open' ? 'Conectado, disponible' : 'Desconectado, no disponible'
                }
              >
                <View
                  style={[
                    styles.presenceDot,
                    availability.phase === 'open' ? styles.presenceDotOnline : styles.presenceDotOffline,
                  ]}
                />
                <Text
                  style={[
                    styles.presenceText,
                    availability.phase === 'open' ? styles.presenceTextOnline : styles.presenceTextOffline,
                  ]}
                >
                  {availability.phase === 'open' ? 'Conectado' : 'Desconectado'}
                </Text>
              </View>
            )}
          </View>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : null}
        </View>

        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        <View style={styles.metricsRow}>
          <Star
            size={14}
            color={COLORS.text.primary}
            fill={COLORS.text.primary}
            strokeWidth={2}
          />
          <Text style={styles.metricValue}>{rating !== '' ? rating : 'Nuevo'}</Text>
          {reviewsCount > 0 ? (
            <>
              <Text style={styles.metricDot}>·</Text>
              <Text style={styles.metricLabel}>
                {reviewsCount} {reviewsCount === 1 ? 'reseña' : 'reseñas'}
              </Text>
            </>
          ) : null}
          {jobs > 0 ? (
            <>
              <Text style={styles.metricDot}>·</Text>
              <Text style={styles.metricLabel}>
                {jobs} {jobs === 1 ? 'servicio' : 'servicios'}
              </Text>
            </>
          ) : null}
          <ProviderKpiTierBadge
            kpiBadge={kpiBadge}
            provider={provider}
            trustBadgeFields
            variant="inline"
            style={styles.kpiBadge}
          />
        </View>

        <View style={styles.pillsRow}>
          {modalidadBadges(provider).map((b) => (
            <View key={b.key} style={styles.pill}>
              <ModalidadIcon name={b.icon} color={COLORS.text.secondary} />
              <Text style={styles.pillText}>{b.label}</Text>
            </View>
          ))}

          {especialistaLabel ? (
            <View style={[styles.pill, styles.pillEspecialista]}>
              <Star
                size={12}
                color={COLORS.secondary[700]}
                fill={COLORS.secondary[700]}
                strokeWidth={2}
              />
              <Text style={[styles.pillText, styles.pillTextEspecialista]}>
                {especialistaLabel}
              </Text>
            </View>
          ) : esMultimarca ? (
            <View style={styles.pill}>
              <Globe size={12} color={COLORS.text.secondary} strokeWidth={2} />
              <Text style={styles.pillText}>Multimarca</Text>
            </View>
          ) : null}

          {showVerifiedBadge ? (
            <View style={styles.pill}>
              <BadgeCheck size={13} color={COLORS.primary[600]} strokeWidth={2} />
              <Text style={styles.pillText}>Verificado</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.default,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.container.horizontal,
    paddingBottom: SPACING.xs,
  },
  rightActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconButtonWeb: {
    zIndex: 20,
    cursor: 'pointer',
  },
  iconButtonSpacer: {
    width: 40,
    height: 40,
  },
  titleBlock: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  titleTextCol: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...TYPOGRAPHY.styles.h2,
    color: COLORS.text.primary,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.neutral.gray[100],
    flexShrink: 0,
  },
  presenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 2,
  },
  presenceDot: {
    width: 8,
    height: 8,
    borderRadius: BORDERS.radius.full,
  },
  presenceDotOnline: {
    backgroundColor: COLORS.success.main,
  },
  presenceDotOffline: {
    backgroundColor: COLORS.text.tertiary,
  },
  presenceText: {
    ...TYPOGRAPHY.styles.caption,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  presenceTextOnline: {
    color: COLORS.success.dark,
  },
  presenceTextOffline: {
    color: COLORS.text.tertiary,
  },
  presenceTextMuted: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
  },
  subtitle: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: SPACING.xxs,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xxs,
    marginTop: SPACING.xs,
  },
  metricValue: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  metricDot: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginHorizontal: 2,
  },
  metricLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  kpiBadge: {
    marginLeft: SPACING.xs,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xxs,
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: BORDERS.radius.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  pillText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.secondary,
  },
  pillEspecialista: {
    backgroundColor: COLORS.secondary[50],
  },
  pillTextEspecialista: {
    color: COLORS.secondary[700],
  },
});

export default ProviderHeader;
