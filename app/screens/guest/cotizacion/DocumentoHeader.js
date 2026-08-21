import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Mail, MapPin, Phone, Star } from 'lucide-react-native';
import VerifiedSeal from '../../../components/base/VerifiedSeal/VerifiedSeal';
import { BORDERS, COLORS, SPACING, TYPOGRAPHY, withOpacity } from '../../../design-system/tokens';
import {
  estadoMeta,
  formatFechaCorta,
  tallerAccentColor,
  tallerInitials,
} from './cotizacionPublicaFormat';

function DocumentoHeaderInner({
  taller,
  fotoUri,
  imgError,
  onImgError,
  numeroPublico,
  estado,
  enviadaEn,
  fechaExpiracion,
  actualizadaPorTaller = false,
  wide,
}) {
  if (!taller?.nombre && !taller?.telefono && !taller?.direccion) return null;

  const nombre = taller?.nombre || 'Taller';
  const accent = tallerAccentColor(nombre);
  const rating = Number(taller?.calificacion_promedio) || 0;
  const showPhoto = Boolean(fotoUri) && !imgError;
  const estadoUi = estadoMeta(estado);

  return (
    <View style={[styles.card, wide && styles.cardWide]}>
      <View style={[styles.top, wide && styles.topWide]}>
        <View style={styles.emisor}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatarRing, { borderColor: accent }]}>
              {showPhoto ? (
                <ExpoImage
                  source={{ uri: fotoUri }}
                  style={styles.avatar}
                  contentFit="cover"
                  onError={onImgError}
                  accessibilityLabel={nombre}
                />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: withOpacity(accent, 0.12) }]}>
                  <Text style={[styles.initials, { color: accent }]}>{tallerInitials(nombre)}</Text>
                </View>
              )}
            </View>
            {taller?.verificado ? (
              <VerifiedSeal
                size={18}
                checkSize={11}
                style={styles.verifiedBadge}
                accessibilityLabel="Taller verificado"
              />
            ) : null}
          </View>
          <View style={styles.emisorCopy}>
            <Text style={styles.eyebrow}>Cotización de</Text>
            <Text accessibilityRole="header" style={styles.h1} numberOfLines={2}>
              {nombre}
            </Text>
            {rating > 0 ? (
              <View style={styles.ratingRow}>
                <Star size={13} color={COLORS.text.primary} fill={COLORS.text.primary} />
                <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.metaCol, wide && styles.metaColWide]}>
          {numeroPublico ? (
            <View style={styles.folioBadge}>
              <Text style={styles.folioText}>#{numeroPublico}</Text>
            </View>
          ) : null}
          {estadoUi ? (
            <View style={[styles.pill, estadoUi.tone === 'ok' && styles.pillOk]}>
              <Text style={[styles.pillText, estadoUi.tone === 'ok' && styles.pillOkText]}>
                {estadoUi.label}
              </Text>
            </View>
          ) : null}
          {enviadaEn ? (
            <Text style={styles.metaLine}>Emitida: {formatFechaCorta(enviadaEn)}</Text>
          ) : null}
          {fechaExpiracion ? (
            <Text style={styles.metaLine}>Válida hasta: {formatFechaCorta(fechaExpiracion)}</Text>
          ) : null}
        </View>
      </View>

      {actualizadaPorTaller ? (
        <Text style={styles.statusHint}>
          El taller actualizó esta cotización. Revisa el desglose antes de responder.
        </Text>
      ) : null}

      <View style={styles.contactBlock}>
        {taller?.direccion ? (
          <View style={styles.contactRow}>
            <MapPin size={14} color={COLORS.icon.default} strokeWidth={2} />
            <Text style={styles.contactText}>{taller.direccion}</Text>
          </View>
        ) : null}
        {taller?.telefono ? (
          <View style={styles.contactRow}>
            <Phone size={14} color={COLORS.icon.default} strokeWidth={2} />
            <Text style={styles.contactText}>{taller.telefono}</Text>
          </View>
        ) : null}
        {taller?.email ? (
          <View style={styles.contactRow}>
            <Mail size={14} color={COLORS.icon.default} strokeWidth={2} />
            <Text style={styles.contactText}>{taller.email}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  cardWide: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  top: {
    gap: SPACING.md,
  },
  topWide: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  emisor: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    flex: 1,
    minWidth: 0,
  },
  avatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    padding: 3,
    flexShrink: 0,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: COLORS.badge.meta.background,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.xl,
    letterSpacing: -0.5,
  },
  verifiedBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.full,
  },
  emisorCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    paddingTop: 2,
  },
  eyebrow: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    color: COLORS.text.secondary,
  },
  h1: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.xl,
    lineHeight: 28,
    color: COLORS.text.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.primary,
  },
  metaCol: {
    gap: 6,
    alignItems: 'flex-start',
  },
  metaColWide: {
    alignItems: 'flex-end',
    maxWidth: 240,
  },
  folioBadge: {
    backgroundColor: COLORS.badge.meta.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.sm,
    minHeight: 32,
    justifyContent: 'center',
  },
  folioText: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.primary,
    letterSpacing: 0.4,
  },
  pill: {
    backgroundColor: COLORS.badge.meta.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: BORDERS.radius.sm,
  },
  pillOk: {
    backgroundColor: withOpacity(COLORS.brand.magenta, 0.08),
  },
  pillText: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.badge.meta.text,
  },
  pillOkText: {
    color: COLORS.brand.magenta,
  },
  metaLine: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  statusHint: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    color: COLORS.text.secondary,
    paddingTop: SPACING.xxs,
  },
  contactBlock: {
    gap: 6,
    paddingTop: SPACING.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  contactText: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    color: COLORS.text.secondary,
  },
});

export default memo(DocumentoHeaderInner);
