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
  const subtitle = [
    modalidad,
    serviciosCount > 0 ? `${serviciosCount} servicio${serviciosCount === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

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
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{inicial}</Text>
          </View>
        )}
        <View style={styles.memberInfo}>
          <Text style={styles.memberName} numberOfLines={1}>
            {miembro.nombre}
          </Text>
          {subtitle ? (
            <Text style={styles.memberSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {visibles.length > 0 ? (
        <View style={styles.chipsRow}>
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
      ) : null}

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
          <ChevronUp size={16} color={COLORS.primary[600]} strokeWidth={2} />
        ) : (
          <ChevronRight size={16} color={COLORS.primary[600]} strokeWidth={2} />
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
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.neutral.gray[100],
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
  },
  memberInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  memberName: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
  },
  memberSubtitle: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
    gap: SPACING.xxs,
  },
  chip: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.neutral.gray[100],
    maxWidth: '100%',
  },
  chipText: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.secondary,
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
    color: COLORS.primary[600],
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
