import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS, SHADOWS } from '../../design-system/tokens';

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
              <Ionicons name="person" size={32} color={COLORS.text.tertiary} />
            </View>
          )}

          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark" size={12} color={COLORS.text.onPrimary} />
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
            <Ionicons name="pencil" size={12} color={COLORS.primary[500]} />
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
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.border.light,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.neutral.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border.light,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.success[500],
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background.paper,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    color: COLORS.primary[600],
    fontWeight: '500',
  },
  statusFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  statusPill: {
    backgroundColor: COLORS.success.light,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.success[200],
  },
  statusText: {
    color: COLORS.success[700],
    fontWeight: '600',
    fontSize: 12,
  },
});

export default MemberCard;
