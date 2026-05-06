import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { confirmDestructive } from '../../utils/platformAlert';
import { COLORS, SPACING, BORDERS } from '../../design-system/tokens';

import MemberCard from '../../components/profile/MemberCard';
import ProfileMenuSection from '../../components/profile/ProfileMenuSection';
import ProfileMenuItem from '../../components/profile/ProfileMenuItem';

const UserProfileScreen = () => {
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const { height: windowHeight } = useWindowDimensions();
  const { user, logout } = useAuth();

  /** Web: área bajo CustomHeader con altura fija para que ScrollView haga scroll vertical */
  const webRootStyle =
    Platform.OS === 'web'
      ? {
          minHeight: 0,
          height: Math.max(windowHeight - headerHeight, 0),
          maxHeight: Math.max(windowHeight - headerHeight, 0),
          overflow: 'hidden',
        }
      : null;

  const handleEditProfile = () => {
    navigation.navigate(ROUTES.EDIT_PROFILE);
  };

  const handleLogout = () => {
    confirmDestructive(
      '¿Estás seguro que deseas salir?',
      async () => {
        try {
          await logout();
        } catch (error) {
          console.error('Logout error:', error);
        }
      },
      { title: 'Cerrar Sesión', confirmText: 'Cerrar Sesión' }
    );
  };

  return (
    <View style={[styles.root, webRootStyle]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={Platform.OS === 'web' ? styles.scrollWeb : undefined}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <MemberCard user={user} onEditPress={handleEditProfile} />

        <View style={styles.content}>
          <ProfileMenuSection title="GESTIÓN">
            <ProfileMenuItem
              icon="receipt-outline"
              label="Historial de Pagos"
              iconBgColor={COLORS.primary[50]}
              iconColor={COLORS.primary[600]}
              onPress={() => navigation.navigate(ROUTES.HISTORIAL_PAGOS)}
            />
            <ProfileMenuItem
              icon="star-outline"
              label="Calificaciones Pendientes"
              iconBgColor={COLORS.warning[50]}
              iconColor={COLORS.warning[600]}
              onPress={() => navigation.navigate(ROUTES.PENDING_REVIEWS)}
            />
            <ProfileMenuItem
              icon="heart-outline"
              label="Favoritos"
              iconBgColor={COLORS.error.light}
              iconColor={COLORS.error.main}
              isLast
              onPress={() => navigation.navigate(ROUTES.FAVORITE_PROVIDERS)}
            />
          </ProfileMenuSection>

          <ProfileMenuSection title="SOPORTE">
            <ProfileMenuItem
              icon="headset-outline"
              label="Ayuda y Chat"
              iconBgColor={COLORS.success.light}
              iconColor={COLORS.success[700]}
              onPress={() => navigation.navigate(ROUTES.SUPPORT)}
            />
            <ProfileMenuItem
              icon="document-text-outline"
              label="Términos Legales"
              iconBgColor={COLORS.neutral.gray[100]}
              iconColor={COLORS.text.secondary}
              isLast
              onPress={() => navigation.navigate(ROUTES.TERMS)}
            />
          </ProfileMenuSection>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.75}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error[500]} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>

          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>v2.5.0 • MecaniMóvil Inc.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  scrollWeb: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
  },
  content: {
    paddingHorizontal: SPACING.container.horizontal,
    marginTop: 8,
    paddingBottom: 40,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: BORDERS.radius.button?.md ?? BORDERS.radius.full,
    borderWidth: 1,
    borderColor: COLORS.error[500],
    marginTop: 8,
    backgroundColor: COLORS.error.light,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  versionContainer: {
    marginTop: 28,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
});

export default UserProfileScreen;
