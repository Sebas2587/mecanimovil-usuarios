import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, ChevronUp } from 'lucide-react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import {
  buildWeeklyScheduleDisplayGroups,
  weeklyHorariosHasAnyActiveSlot,
} from '../../utils/providerUtils';
import { modalidadLabel } from '../../utils/providerModalidad';
import SectionHeader from '../base/SectionHeader/SectionHeader';

const MAX_VISIBLE_TAGS = 2;

function MiembroHorarioCompacto({ horarios }) {
  const grouped = useMemo(() => buildWeeklyScheduleDisplayGroups(horarios), [horarios]);
  const hasAny = useMemo(() => weeklyHorariosHasAnyActiveSlot(horarios), [horarios]);

  if (!hasAny) {
    return <Text style={styles.horarioEmpty}>Horario no configurado</Text>;
  }

  return (
    <View style={styles.horarioList}>
      {grouped.map((g) => (
        <View key={`${g.startDia}-${g.endDia}-${g.hoursLabel}`} style={styles.horarioRow}>
          <Text style={styles.horarioDay}>{g.dayLabel}</Text>
          <Text style={styles.horarioHours}>{g.hoursLabel}</Text>
        </View>
      ))}
    </View>
  );
}

function MiembroCard({ miembro }) {
  const [expanded, setExpanded] = useState(false);
  const modalidad = miembro.modalidad_display || modalidadLabel(miembro.modalidad_tecnico);
  const serviciosCount = Number(miembro.servicios_asignados) || 0;
  const serviciosLabel =
    serviciosCount > 0
      ? `${serviciosCount} servicio${serviciosCount === 1 ? '' : 's'}`
      : null;

  const inicial = (miembro.nombre || '?').trim().charAt(0).toUpperCase();
  const especialidades = Array.isArray(miembro.especialidades) ? miembro.especialidades : [];
  const visibles = especialidades.slice(0, MAX_VISIBLE_TAGS);
  const restantes = especialidades.length - visibles.length;

  return (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        {miembro.foto_url ? (
          <Image
            source={{ uri: miembro.foto_url }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{inicial}</Text>
          </View>
        )}
        <View style={styles.memberInfo}>
          <Text style={styles.hostEyebrow}>Te atiende</Text>
          <Text style={styles.memberName} numberOfLines={1}>
            {miembro.nombre}
          </Text>
          {serviciosLabel ? (
            <Text style={styles.memberSubtitle} numberOfLines={1}>
              {serviciosLabel}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.chipsRow}>
        {modalidad ? (
          <View style={styles.chipModalidad}>
            <Text style={styles.chipModalidadText} numberOfLines={1}>
              {modalidad}
            </Text>
          </View>
        ) : null}
        {visibles.map((esp) => (
          <View key={esp.id} style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>
              {esp.nombre}
            </Text>
          </View>
        ))}
        {restantes > 0 ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>+{restantes}</Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.horarioToggle}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
        accessibilityRole="button"
      >
        <Text style={styles.horarioToggleText}>
          {expanded ? 'Ocultar horario' : 'Ver horario semanal'}
        </Text>
        {expanded ? (
          <ChevronUp size={16} color={COLORS.buttonSecondary.outlineText} strokeWidth={2} />
        ) : (
          <ChevronRight size={16} color={COLORS.buttonSecondary.outlineText} strokeWidth={2} />
        )}
      </TouchableOpacity>

      {expanded ? (
        <MiembroHorarioCompacto horarios={miembro.horarios_semanales || []} />
      ) : null}
    </View>
  );
}

export default function ProviderTeamSection({ miembros = [] }) {
  if (!Array.isArray(miembros) || miembros.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Equipo"
        hint="Cada técnico tiene su agenda. Al agendar podrás elegir especialista y horario."
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
      >
        {miembros.map((m) => (
          <MiembroCard key={m.id} miembro={m} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: SPACING.container.horizontal,
  },
  carousel: {
    paddingRight: SPACING.container.horizontal,
    gap: SPACING.sm,
  },
  memberCard: {
    width: 280,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.badge.meta.background,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.badge.meta.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.badge.meta.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...TYPOGRAPHY.styles.h4,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  hostEyebrow: {
    ...TYPOGRAPHY.styles.caption,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.tertiary,
  },
  memberName: {
    ...TYPOGRAPHY.styles.bodyBold,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  memberSubtitle: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
    gap: SPACING.xxs,
  },
  chipModalidad: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: COLORS.badge.meta.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.badge.meta.border,
    maxWidth: '100%',
  },
  chipModalidadText: {
    ...TYPOGRAPHY.styles.small,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.badge.meta.text,
  },
  chip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: COLORS.badge.meta.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.badge.meta.border,
    maxWidth: '100%',
  },
  chipText: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.badge.meta.text,
  },
  horarioToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
  },
  horarioToggleText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.buttonSecondary.outlineText,
  },
  horarioList: {
    marginTop: SPACING.xs,
    gap: SPACING.xxs,
  },
  horarioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  horarioDay: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    flex: 1,
  },
  horarioHours: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  horarioEmpty: {
    marginTop: SPACING.xs,
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
});
