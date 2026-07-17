import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Check, Wrench } from 'lucide-react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import { modalidadLabel } from '../../utils/providerModalidad';

/**
 * Resumen Airbnb Experiences del booking: servicio + taller + mecánico apto.
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

      {hostToShow ? (
        <View style={styles.hostCard}>
          <HostAvatar miembro={hostToShow} selected />
          <View style={styles.hostCopy}>
            <Text style={styles.hostEyebrow}>Te atiende</Text>
            <Text style={styles.hostName} numberOfLines={1}>
              {hostToShow.nombre}
            </Text>
            <Text style={styles.hostRole} numberOfLines={1}>
              {hostToShow.modalidad_display
                || modalidadLabel(hostToShow.modalidad_tecnico)
                || (esTaller ? 'Mecánico del taller' : 'Mecánico a domicilio')}
            </Text>
          </View>
        </View>
      ) : null}

      {showPicker ? (
        <View style={styles.pickerBlock}>
          <Text style={styles.pickerTitle}>Quién te atiende</Text>
          <Text style={styles.pickerHint}>
            Mecánicos del taller aptos para este servicio
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
                  style={[styles.hostRow, sel && styles.hostRowSelected]}
                  onPress={() => onSelectMiembro?.(m.id)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                  accessibilityLabel={`${m.nombre}, ${role}`}
                >
                  <HostAvatar miembro={m} selected={sel} />
                  <View style={styles.hostCopy}>
                    <Text style={[styles.hostName, sel && styles.hostNameSelected]} numberOfLines={1}>
                      {m.nombre}
                    </Text>
                    <Text style={styles.hostRole} numberOfLines={1}>
                      {role}
                    </Text>
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

function HostAvatar({ miembro, selected }) {
  if (miembro?.foto_url) {
    return (
      <Image
        source={{ uri: miembro.foto_url }}
        style={[styles.avatar, selected && styles.avatarSelected]}
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
        <Wrench size={18} color={selected ? COLORS.selection.text : COLORS.icon.default} />
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
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.25,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  serviceList: {
    marginBottom: SPACING.xs,
    gap: 2,
  },
  serviceListItem: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text.primary,
  },
  providerMeta: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text.secondary,
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
    paddingVertical: SPACING.sm,
  },
  pickerBlock: {
    marginTop: SPACING.md,
  },
  pickerTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  pickerHint: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.sm,
  },
  hostList: {
    gap: SPACING.sm,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  hostRowSelected: {
    borderColor: COLORS.base.inkBlack,
    backgroundColor: COLORS.background.paper,
  },
  hostCopy: {
    flex: 1,
    minWidth: 0,
  },
  hostEyebrow: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.text.tertiary,
    marginBottom: 2,
  },
  hostName: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.text.primary,
  },
  hostNameSelected: {
    color: COLORS.text.primary,
  },
  hostRole: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text.secondary,
    marginTop: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.badge.meta.background,
  },
  avatarSelected: {
    borderWidth: 2,
    borderColor: COLORS.base.inkBlack,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.badge.meta.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackSelected: {
    backgroundColor: COLORS.selection.background,
    borderWidth: 2,
    borderColor: COLORS.base.inkBlack,
  },
  avatarInitial: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: 20,
    color: COLORS.text.primary,
  },
  avatarInitialSelected: {
    color: COLORS.selection.text,
  },
  checkDisk: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.main,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.paper,
  },
  checkDiskSelected: {
    backgroundColor: COLORS.base.inkBlack,
    borderColor: COLORS.base.inkBlack,
  },
  emptyHint: {
    marginTop: SPACING.md,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text.tertiary,
  },
});

export default memo(AgendaBookingSummary);
