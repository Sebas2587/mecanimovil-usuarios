import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Platform, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut } from 'lucide-react-native';
import { TAB_BAR_BASE_HEIGHT } from '../../components/home/shared/homeLayoutConstants';
import { ROUTES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { confirmDestructive } from '../../utils/platformAlert';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '../../design-system/tokens';
import Button from '../../components/base/Button/Button';

import MemberCard from '../../components/profile/MemberCard';
import ProfileMenuSection from '../../components/profile/ProfileMenuSection';
import ProfileMenuItem from '../../components/profile/ProfileMenuItem';

const ICON_STROKE = 1.75;

const UserProfileScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { height: windowHeight } = useWindowDimensions();
  const { user, logout } = useAuth();
  const scrollBottomPad = TAB_BAR_BASE_HEIGHT + insets.bottom + 16;

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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <MemberCard user={user} onEditPress={handleEditProfile} />

        <View style={styles.content}>
          <ProfileMenuSection title="GESTIÓN">
            <ProfileMenuItem
              icon="car-sport-outline"
              label="Mis vehículos"
              onPress={() => navigation.navigate(ROUTES.VEHICLES_LIST)}
            />
            <ProfileMenuItem
              icon="receipt-outline"
              label="Historial de Pagos"
              onPress={() => navigation.navigate(ROUTES.HISTORIAL_PAGOS)}
            />
            <ProfileMenuItem
              icon="star-outline"
              label="Calificaciones Pendientes"
              onPress={() => navigation.navigate(ROUTES.PENDING_REVIEWS)}
            />
            <ProfileMenuItem
              icon="heart-outline"
              label="Favoritos"
              isLast
              onPress={() => navigation.navigate(ROUTES.FAVORITE_PROVIDERS)}
            />
          </ProfileMenuSection>

          <ProfileMenuSection title="SOPORTE">
            <ProfileMenuItem
              icon="headset-outline"
              label="Ayuda y Chat"
              onPress={() => navigation.navigate(ROUTES.SUPPORT)}
            />
            <ProfileMenuItem
              icon="document-text-outline"
              label="Términos y Condiciones"
              onPress={() => navigation.navigate(ROUTES.TERMS)}
            />
            <ProfileMenuItem
              icon="shield-checkmark-outline"
              label="Política de Privacidad"
              isLast
              onPress={() => navigation.navigate(ROUTES.PRIVACY_POLICY)}
            />
          </ProfileMenuSection>

          <Button
            title="Cerrar Sesión"
            onPress={handleLogout}
            type="danger"
            variant="outline"
            size="lg"
            fullWidth
            style={styles.logoutButton}
            iconNode={<LogOut size={20} color={COLORS.error[700]} strokeWidth={ICON_STROKE} />}
          />

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
    marginTop: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    borderColor: COLORS.error[200],
    backgroundColor: COLORS.error[50],
  },
  versionContainer: {
    marginTop: 28,
    alignItems: 'center',
  },
  versionText: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.tertiary,
  },
});

export default UserProfileScreen;
