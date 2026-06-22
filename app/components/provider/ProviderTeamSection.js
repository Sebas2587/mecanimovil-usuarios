import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import {
  buildWeeklyScheduleDisplayGroups,
  weeklyHorariosHasAnyActiveSlot,
} from '../../utils/providerUtils';
import { modalidadLabel } from '../../utils/providerModalidad';

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

  return (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        {miembro.foto_url ? (
          <Image source={{ uri: miembro.foto_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={22} color={COLORS.primary[500]} />
          </View>
        )}
        <View style={styles.memberInfo}>
          <Text style={styles.memberName} numberOfLines={1}>
            {miembro.nombre}
          </Text>
          {modalidad ? (
            <View style={styles.modalidadChip}>
              <Text style={styles.modalidadChipText}>{modalidad}</Text>
            </View>
          ) : null}
          {serviciosCount > 0 ? (
            <Text style={styles.serviciosBadge}>
              {serviciosCount} servicio{serviciosCount === 1 ? '' : 's'}
            </Text>
          ) : null}
        </View>
      </View>

      {Array.isArray(miembro.especialidades) && miembro.especialidades.length > 0 ? (
        <View style={styles.chipsRow}>
          {miembro.especialidades.map((esp) => (
            <View key={esp.id} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>
                {esp.nombre}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.horarioToggle}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
      >
        <Text style={styles.horarioToggleText}>
          {expanded ? 'Ocultar horario' : 'Ver horario semanal'}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={COLORS.primary[600]}
        />
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
      <Text style={styles.sectionTitle}>Nuestro equipo</Text>
      <Text style={styles.sectionHint}>
        Cada técnico tiene su agenda. Al agendar podrás elegir especialista y horario.
      </Text>
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
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  carousel: {
    paddingRight: SPACING.container.horizontal,
    gap: 12,
  },
  memberCard: {
    width: 280,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    padding: 14,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary[50],
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 15,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  modalidadChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.primary[50],
  },
  modalidadChipText: {
    fontSize: 11,
    color: COLORS.primary[700],
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  serviciosBadge: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.neutral?.[100] ?? '#F3F4F6',
    maxWidth: '100%',
  },
  chipText: {
    fontSize: 11,
    color: COLORS.text.secondary,
  },
  horarioToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
  },
  horarioToggleText: {
    fontSize: 13,
    color: COLORS.primary[600],
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  horarioList: {
    marginTop: 8,
    gap: 6,
  },
  horarioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  horarioDay: {
    fontSize: 12,
    color: COLORS.text.secondary,
    flex: 1,
  },
  horarioHours: {
    fontSize: 12,
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  horarioEmpty: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
});
