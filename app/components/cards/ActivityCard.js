import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, BORDERS, SPACING } from '../../design-system/tokens';
import Tag from '../base/Tag/Tag';

/**
 * Fila de actividad estilo Airbnb summary (solicitudes, citas, mensajes).
 */
const ActivityCard = ({
  title,
  subtitle,
  statusLabel,
  statusVariant = 'neutral',
  dateLabel,
  onPress,
}) => (
  <TouchableOpacity
    style={styles.card}
    onPress={onPress}
    activeOpacity={0.92}
    disabled={!onPress}
    accessibilityRole="button"
  >
    <View style={styles.content}>
      <View style={styles.top}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {statusLabel ? (
          <Tag label={statusLabel} variant={statusVariant} size="sm" />
        ) : null}
      </View>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
      {dateLabel ? (
        <Text style={styles.date}>{dateLabel}</Text>
      ) : null}
    </View>
    <ChevronRight size={18} color={COLORS.text.tertiary} strokeWidth={2} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.styles.bodyBold,
    flex: 1,
    color: COLORS.text.primary,
  },
  subtitle: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  date: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
});

export default React.memo(ActivityCard);
