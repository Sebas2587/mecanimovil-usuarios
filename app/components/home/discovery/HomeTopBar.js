import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Bell, User } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS } from '../../../design-system/tokens';
import HomeServiceLocation from './HomeServiceLocation';

/**
 * Barra superior del home: saludo, ubicación, notificaciones y avatar.
 */
const HomeTopBar = ({
  firstName,
  unreadCount = 0,
  user,
  hasAddresses,
  selectedAddress,
  onPressSelectAddress,
  onPressNotifications,
  onPressProfile,
}) => (
  <View style={styles.header}>
    <View style={styles.headerMain}>
      <Text style={styles.greeting}>Hola, {firstName || 'Conductor'}</Text>
      <HomeServiceLocation
        hasAddresses={hasAddresses}
        selectedAddress={selectedAddress}
        onPressSelectAddress={onPressSelectAddress}
      />
    </View>
    <TouchableOpacity
      style={styles.headerIcon}
      onPress={onPressNotifications}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Notificaciones"
    >
      <Bell size={20} color={COLORS.text.primary} />
      {unreadCount > 0 ? (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.headerAvatar}
      onPress={onPressProfile}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Mi perfil"
    >
      {user?.foto_perfil_url || user?.foto_perfil ? (
        <Image
          source={{ uri: user.foto_perfil_url || user.foto_perfil }}
          style={styles.avatarImg}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.avatarImg, styles.avatarFallback]}>
          <User size={18} color={COLORS.primary[500]} />
        </View>
      )}
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerMain: {
    flex: 1,
  },
  greeting: {
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    fontWeight: TYPOGRAPHY.styles.h3.fontWeight,
    letterSpacing: TYPOGRAPHY.styles.h3.letterSpacing,
    color: COLORS.text.primary,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    ...SHADOWS.sm,
  },
  headerAvatar: {
    marginLeft: 8,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.neutral.gray[100],
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.error.main,
    borderRadius: BORDERS.radius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.background.paper,
  },
  bellBadgeText: {
    color: COLORS.text.inverse,
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});

export default React.memo(HomeTopBar);
