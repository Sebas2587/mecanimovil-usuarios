import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { confirmDestructive } from '../../utils/platformAlert';

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
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient colors={['#030712', '#0a0f1a', '#030712']} style={StyleSheet.absoluteFill} />
      </View>

      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

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
              iconBgColor="rgba(56,189,248,0.15)"
              iconColor="#38BDF8"
              onPress={() => navigation.navigate(ROUTES.HISTORIAL_PAGOS)}
            />
            <ProfileMenuItem
              icon="star-outline"
              label="Calificaciones Pendientes"
              iconBgColor="rgba(245,158,11,0.18)"
              iconColor="#FBBF24"
              onPress={() => navigation.navigate(ROUTES.PENDING_REVIEWS)}
            />
            <ProfileMenuItem
              icon="heart-outline"
              label="Favoritos"
              iconBgColor="rgba(248,113,113,0.15)"
              iconColor="#F87171"
              isLast
              onPress={() => navigation.navigate(ROUTES.FAVORITE_PROVIDERS)}
            />
          </ProfileMenuSection>

          <ProfileMenuSection title="SOPORTE">
            <ProfileMenuItem
              icon="headset-outline"
              label="Ayuda y Chat"
              iconBgColor="rgba(16,185,129,0.18)"
              iconColor="#6EE7B7"
              onPress={() => navigation.navigate(ROUTES.SUPPORT)}
            />
            <ProfileMenuItem
              icon="document-text-outline"
              label="Términos Legales"
              iconBgColor="rgba(148,163,184,0.2)"
              iconColor="#CBD5E1"
              isLast
              onPress={() => navigation.navigate(ROUTES.TERMS)}
            />
          </ProfileMenuSection>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.75}>
            <Ionicons name="log-out-outline" size={20} color="#FCA5A5" />
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
    backgroundColor: '#030712',
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
    paddingHorizontal: 16,
    marginTop: 8,
    paddingBottom: 40,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    marginTop: 8,
    backgroundColor: 'rgba(248,113,113,0.08)',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FCA5A5',
  },
  versionContainer: {
    marginTop: 28,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500',
  },
});

export default UserProfileScreen;
