import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import {
  buildWeeklyScheduleDisplayGroups,
  weeklyHorariosHasAnyActiveSlot,
} from '../../utils/providerUtils';

const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export default function ProviderScheduleSection({ horarios }) {
  const grouped = useMemo(() => buildWeeklyScheduleDisplayGroups(horarios), [horarios]);
  const hasAny = useMemo(() => weeklyHorariosHasAnyActiveSlot(horarios), [horarios]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Horarios disponibles</Text>

      <Card>
        {hasAny ? (
          <View style={styles.list}>
            {grouped.map((g) => (
              <View key={`${g.startDia}-${g.endDia}-${g.hoursLabel}`} style={styles.row}>
                <Text style={styles.day}>{g.dayLabel}</Text>
                <Text style={styles.hours}>{g.hoursLabel}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Horarios no disponibles.</Text>
        )}
      </Card>
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
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    padding: 16,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  day: {
    color: COLORS.text.primary,
    fontSize: 13,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    flex: 1,
    marginRight: 8,
  },
  hours: {
    color: COLORS.text.primary,
    fontSize: 13,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    textAlign: 'right',
  },
  emptyText: {
    color: COLORS.text.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
