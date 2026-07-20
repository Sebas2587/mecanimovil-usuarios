import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Check, Wrench } from 'lucide-react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import { modalidadLabel } from '../../utils/providerModalidad';

/**
 * Resumen Airbnb Experiences del booking: servicio + taller + mecánico apto.
 * Cards de host alineadas a listing Airbnb + tokens Tinder (meta / selection).
 */
function AgendaBookingSummary({
  servicioNombre,
  serviciosNombres = [],
  proveedorNombre,
  tipoProveedor,
  mecanicos = [],
  miembroSeleccionadoId = null,
  onSelectMiembro,
  loadingMecanicos = false,
  requierePicker = false,
}) {
  const esTaller = tipoProveedor === 'taller';
  const tipoLabel = esTaller ? 'Taller' : 'A domicilio';
  const selected = mecanicos.find((m) => m.id === miembroSeleccionadoId) || null;
  const showPicker = requierePicker && mecanicos.length > 1;
  const showSingleHost = Boolean(selected) && (!requierePicker || mecanicos.length === 1);
  // Domicilio / sin equipo: el proveedor es quien atiende.
  const domicilioHost =
    !esTaller && proveedorNombre
      ? { id: 'proveedor', nombre: proveedorNombre, modalidad_display: 'Mecánico a domicilio' }
      : null;
  const hostToShow = showSingleHost ? selected : domicilioHost;
  const names =
    Array.isArray(serviciosNombres) && serviciosNombres.length > 0
      ? serviciosNombres
      : servicioNombre
        ? [servicioNombre]
        : [];
  const title =
    names.length === 1
      ? names[0]
      : names.length > 1
        ? `${names.length} servicios`
        : 'Servicio seleccionado';

  return (
    <View style={styles.wrap}>
      <Text style={styles.serviceTitle} numberOfLines={2}>
        {title}
      </Text>
      {names.length > 1 ? (
        <View style={styles.serviceList}>
          {names.map((n) => (
            <Text key={n} style={styles.serviceListItem} numberOfLines={2}>
              · {n}
            </Text>
          ))}
        </View>
      ) : null}
      <Text style={styles.providerMeta} numberOfLines={2}>
        {[proveedorNombre, tipoLabel].filter(Boolean).join(' · ')}
      </Text>

      {loadingMecanicos ? (
        <ActivityIndicator color={COLORS.icon.active} style={styles.loader} />
      ) : null}

      {hostToShow && !showPicker ? (
        <HostCard
          miembro={hostToShow}
          eyebrow="Te atiende"
          roleFallback={esTaller ? 'Mecánico del taller' : 'Mecánico a domicilio'}
        />
      ) : null}

      {showPicker ? (
        <View style={styles.pickerBlock}>
          <Text style={styles.pickerTitle}>Quién te atiende</Text>
          <Text style={styles.pickerHint}>
            Elige un mecánico del taller apto para este servicio
          </Text>
          <View style={styles.hostList}>
            {mecanicos.map((m) => {
              const sel = miembroSeleccionadoId === m.id;
              const role =
                m.modalidad_display
                || modalidadLabel(m.modalidad_tecnico)
                || 'Mecánico';
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.hostCard, sel && styles.hostCardSelected]}
                  onPress={() => onSelectMiembro?.(m.id)}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                  accessibilityLabel={`${m.nombre}, ${role}`}
                >
                  <HostAvatar miembro={m} selected={sel} />
                  <View style={styles.hostCopy}>
                    <Text
                      style={[styles.hostName, sel && styles.hostNameSelected]}
                      numberOfLines={1}
                    >
                      {m.nombre}
                    </Text>
                    <ModalidadChip label={role} selected={sel} />
                  </View>
                  <View style={[styles.checkDisk, sel && styles.checkDiskSelected]}>
                    {sel ? (
                      <Check size={14} color={COLORS.selection.onFill} strokeWidth={2.5} />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      {!loadingMecanicos && requierePicker && mecanicos.length === 0 ? (
        <Text style={styles.emptyHint}>
          No hay mecánicos disponibles para este servicio en el taller.
        </Text>
      ) : null}
    </View>
  );
}

function HostCard({ miembro, eyebrow, roleFallback }) {
  const role =
    miembro?.modalidad_display
    || modalidadLabel(miembro?.modalidad_tecnico)
    || roleFallback
    || null;

  return (
    <View style={styles.hostCard} accessibilityRole="text">
      <HostAvatar miembro={miembro} selected />
      <View style={styles.hostCopy}>
        {eyebrow ? <Text style={styles.hostEyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.hostName} numberOfLines={1}>
          {miembro?.nombre}
        </Text>
        {role ? <ModalidadChip label={role} /> : null}
      </View>
    </View>
  );
}

function ModalidadChip({ label, selected = false }) {
  if (!label) return null;
  return (
    <View style={[styles.modalidadChip, selected && styles.modalidadChipSelected]}>
      <Text
        style={[styles.modalidadChipText, selected && styles.modalidadChipTextSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function HostAvatar({ miembro, selected }) {
  if (miembro?.foto_url) {
    return (
      <Image
        source={{ uri: miembro.foto_url }}
        style={[styles.avatar, selected && styles.avatarSelected]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
      />
    );
  }
  const initial = String(miembro?.nombre || '').trim().charAt(0).toUpperCase();
  return (
    <View style={[styles.avatarFallback, selected && styles.avatarFallbackSelected]}>
      {initial ? (
        <Text style={[styles.avatarInitial, selected && styles.avatarInitialSelected]}>
          {initial}
        </Text>
      ) : (
        <Wrench
          size={18}
          color={selected ? COLORS.selection.icon : COLORS.icon.default}
          strokeWidth={1.75}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  serviceTitle: {
    ...TYPOGRAPHY.styles.h3,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  serviceList: {
    marginBottom: SPACING.xs,
    gap: 2,
  },
  serviceListItem: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  providerMeta: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  loader: {
    marginTop: SPACING.md,
    alignSelf: 'flex-start',
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  hostCardSelected: {
    borderColor: COLORS.buttonSecondary.outline,
    backgroundColor: COLORS.selection.background,
  },
  pickerBlock: {
    marginTop: SPACING.md,
  },
  pickerTitle: {
    ...TYPOGRAPHY.styles.h4,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  pickerHint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  hostList: {
    gap: SPACING.sm,
  },
  hostCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  hostEyebrow: {
    ...TYPOGRAPHY.styles.caption,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.tertiary,
  },
  hostName: {
    ...TYPOGRAPHY.styles.bodyBold,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  hostNameSelected: {
    color: COLORS.text.primary,
  },
  modalidadChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: COLORS.badge.meta.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.badge.meta.border,
    maxWidth: '100%',
  },
  modalidadChipSelected: {
    backgroundColor: COLORS.background.paper,
    borderColor: COLORS.selection.border,
  },
  modalidadChipText: {
    ...TYPOGRAPHY.styles.small,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.badge.meta.text,
  },
  modalidadChipTextSelected: {
    color: COLORS.selection.text,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.badge.meta.background,
  },
  avatarSelected: {
    borderWidth: 2,
    borderColor: COLORS.buttonSecondary.outline,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.badge.meta.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.badge.meta.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackSelected: {
    backgroundColor: COLORS.selection.background,
    borderWidth: 2,
    borderColor: COLORS.buttonSecondary.outline,
  },
  avatarInitial: {
    ...TYPOGRAPHY.styles.h4,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  avatarInitialSelected: {
    color: COLORS.selection.text,
  },
  checkDisk: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.main,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.paper,
    flexShrink: 0,
  },
  checkDiskSelected: {
    backgroundColor: COLORS.brand.magenta,
    borderColor: COLORS.brand.magenta,
  },
  emptyHint: {
    marginTop: SPACING.md,
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    lineHeight: 18,
  },
});

export default memo(AgendaBookingSummary);
