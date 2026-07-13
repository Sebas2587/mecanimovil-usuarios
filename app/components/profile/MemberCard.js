import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { User, Check, Pencil } from 'lucide-react-native';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';

/**
 * Card de identidad en Cuenta — summary Airbnb + badge verificado brand primary.
 */
const MemberCard = ({ user, onEditPress }) => {
  const firstName = user?.firstName || user?.first_name || '';
  const lastName = user?.lastName || user?.last_name || '';
  const displayName = `${firstName} ${lastName}`.trim() || user?.username || 'Usuario';
  const email = user?.email || 'usuario@mecanimovil.com';

  const profilePic = user?.foto_perfil_url || user?.foto_perfil || user?.foto;
  const hasProfilePic = !!profilePic;

  return (
    <View style={styles.container}>
      <View style={styles.userInfoRow}>
        <View style={styles.avatarContainer}>
          {hasProfilePic ? (
            <Image source={{ uri: profilePic }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <User size={32} color={COLORS.text.tertiary} strokeWidth={1.75} />
            </View>
          )}

          <View style={styles.verifiedBadge} accessibilityLabel="Cuenta verificada">
            <Check size={12} color={COLORS.text.onPrimary} strokeWidth={3} />
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {email}
          </Text>

          <TouchableOpacity style={styles.editButton} onPress={onEditPress} activeOpacity={0.7}>
            <Pencil size={14} color={COLORS.primary[600]} strokeWidth={1.75} />
            <Text style={styles.editButtonText}>Editar Perfil</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statusFooter}>
        <Text style={styles.statusLabel}>Estado de Cuenta</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>Verificado</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    marginHorizontal: SPACING.container.horizontal,
    marginTop: SPACING.sm,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    overflow: 'hidden',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: BORDERS.radius.full,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.neutral.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary[500],
    width: 20,
    height: 20,
    borderRadius: BORDERS.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background.paper,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  email: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editButtonText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[600],
  },
  statusFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  statusLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  statusPill: {
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[100],
  },
  statusText: {
    color: COLORS.primary[700],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
});

export default MemberCard;
