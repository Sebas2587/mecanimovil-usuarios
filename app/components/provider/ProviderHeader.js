import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import {
  Share2,
  Heart,
  Star,
  Building2,
  Car,
  Globe,
} from 'lucide-react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import BackButton from '../navigation/BackButton';
import PrimaryGradientBadge from '../base/PrimaryGradientBadge/PrimaryGradientBadge';
import VerifiedSeal from '../base/VerifiedSeal/VerifiedSeal';
import {
  buildProviderAvatarUri,
  resolveProviderKpiBadge,
  isProviderMultimarca,
  isProviderOpenAccordingToWeeklyHorarios,
  weeklyHorariosHasAnyActiveSlot,
  isProviderRealtimeOnline,
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
      return { phase: 'unavailable', label: 'Sin horario' };
    }
    const open = isProviderOpenAccordingToWeeklyHorarios(weeklyHorarios, new Date(scheduleTick));
    return {
      phase: open ? 'open' : 'closed',
      label: open ? 'Abierto ahora' : 'Cerrado',
    };
  }, [useWeeklyAvailabilityBadge, weeklyHorarios, scheduleTick]);

  const isOnline = isProviderRealtimeOnline(provider);

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
              style={styles.headerIconBtn}
            />
          ) : (
            <View style={styles.iconButtonSpacer} accessibilityElementsHidden />
          )}
          <View style={styles.rightActions}>
            {onShare ? (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={onShare}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Compartir perfil"
              >
                <Share2 size={18} color={COLORS.text.primary} strokeWidth={2} />
              </TouchableOpacity>
            ) : null}
            {onToggleFavorite ? (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={onToggleFavorite}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              >
                <Heart
                  size={18}
                  color={isFavorite ? COLORS.brand.magenta : COLORS.icon.default}
                  fill={isFavorite ? COLORS.brand.magenta : 'transparent'}
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
            {isOnline ? (
              <View
                style={styles.presenceRow}
                accessibilityRole="text"
                accessibilityLabel="Conectado"
              >
                <View style={[styles.presenceDot, styles.presenceDotOnline]} />
                <Text style={[styles.presenceText, styles.presenceTextOnline]}>Conectado</Text>
              </View>
            ) : availability.phase === 'hidden' ? null : availability.phase === 'loading' ? (
              <View style={styles.presenceRow} accessibilityRole="text" accessibilityLabel="Consultando horario">
                <ActivityIndicator size="small" color={COLORS.text.tertiary} />
                <Text style={styles.presenceTextMuted}>Horario…</Text>
              </View>
            ) : (
              <View
                style={styles.presenceRow}
                accessibilityRole="text"
                accessibilityLabel={availability.label}
              >
                {availability.phase === 'open' ? (
                  <PrimaryGradientBadge style={styles.presenceDot} />
                ) : (
                  <View style={[styles.presenceDot, styles.presenceDotOffline]} />
                )}
                <Text
                  style={[
                    styles.presenceText,
                    availability.phase === 'open'
                      ? styles.presenceTextScheduleOpen
                      : styles.presenceTextOffline,
                  ]}
                >
                  {availability.label}
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
                color={COLORS.badge.especialista.icon}
                fill={COLORS.badge.especialista.icon}
                strokeWidth={2}
              />
              <Text style={[styles.pillText, styles.pillTextEspecialista]}>
                {especialistaLabel}
              </Text>
            </View>
          ) : esMultimarca ? (
            <View style={[styles.pill, styles.pillMultimarca]}>
              <Globe size={12} color={COLORS.badge.multimarca.icon} strokeWidth={2} />
              <Text style={[styles.pillText, styles.pillTextMultimarca]}>Multimarca</Text>
            </View>
          ) : null}

          {showVerifiedBadge ? (
            <View style={styles.pill}>
              <VerifiedSeal size={14} checkSize={9} accessibilityLabel="Proveedor verificado" />
              <Text style={[styles.pillText, styles.pillTextVerified]}>Verificado</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.paper,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.container.horizontal,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background.default,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.gray[100],
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null),
  },
  iconButtonSpacer: {
    width: 36,
    height: 36,
  },
  titleBlock: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background.default,
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
  presenceTextScheduleOpen: {
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
    backgroundColor: COLORS.background.secondary,
    borderRadius: BORDERS.radius.full,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  pillText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.secondary,
  },
  pillEspecialista: {
    backgroundColor: COLORS.badge.especialista.background,
    borderColor: COLORS.badge.especialista.border,
  },
  pillTextEspecialista: {
    color: COLORS.badge.especialista.text,
  },
  pillMultimarca: {
    backgroundColor: COLORS.badge.multimarca.background,
    borderColor: COLORS.badge.multimarca.border,
  },
  pillTextMultimarca: {
    color: COLORS.badge.multimarca.text,
  },
  pillTextVerified: {
    color: COLORS.badge.verified.text,
  },
});

export default ProviderHeader;
