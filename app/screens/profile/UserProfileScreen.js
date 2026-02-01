import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';
import { ROUTES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

// Modular Components
import MemberCard from '../../components/profile/MemberCard';
import ProfileMenuSection from '../../components/profile/ProfileMenuSection';
import ProfileMenuItem from '../../components/profile/ProfileMenuItem';

const UserProfileScreen = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();

  // State for switches or local UI toggles
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Handlers
  const handleEditProfile = () => {
    navigation.navigate(ROUTES.EDIT_PROFILE);
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error("Logout error:", error);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <MemberCard user={user} onEditPress={handleEditProfile} />

        <View style={styles.content}>
          {/* Gestion Section */}
          <ProfileMenuSection title="GESTIÓN">
            <ProfileMenuItem
              icon="receipt-outline"
              label="Historial de Pagos"
              iconBgColor="#E0F2FE" // Light Blue
              iconColor="#0284C7" // Blue 600
              onPress={() => navigation.navigate(ROUTES.HISTORIAL_PAGOS)}
            />
            <ProfileMenuItem
              icon="star-outline"
              label="Calificaciones Pendientes"
              iconBgColor="#FFFBEB" // Amber Light
              iconColor="#F59E0B" // Amber 500
              onPress={() => navigation.navigate(ROUTES.PENDING_REVIEWS)}
            />
            <ProfileMenuItem
              icon="heart-outline"
              label="Favoritos"
              iconBgColor="#FEE2E2" // Red Light
              iconColor="#DC2626" // Red 600
              isLast
              onPress={() => navigation.navigate(ROUTES.FAVORITE_PROVIDERS)}
            />
          </ProfileMenuSection>

          {/* Soporte Section */}
          <ProfileMenuSection title="SOPORTE">
            <ProfileMenuItem
              icon="notifications-outline"
              label="Notificaciones"
              iconBgColor="#F3E8FF" // Purple Light
              iconColor="#9333EA" // Purple 600
              isSwitch
              switchValue={notificationsEnabled}
              onSwitchChange={setNotificationsEnabled}
            />
            <ProfileMenuItem
              icon="headset-outline"
              label="Ayuda y Chat"
              iconBgColor="#ECFDF5" // Emerald Light
              iconColor="#059669" // Emerald 600
              onPress={() => navigation.navigate(ROUTES.SUPPORT)}
            />
            <ProfileMenuItem
              icon="document-text-outline"
              label="Términos Legales"
              iconBgColor="#F1F5F9" // Slate Light
              iconColor="#475569" // Slate 600
              isLast
              onPress={() => navigation.navigate(ROUTES.TERMS)}
            />
          </ProfileMenuSection>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>

          {/* Version Info */}
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>v2.5.0 • MecaniMóvil Inc.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Slate 50
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: 20,
    marginTop: 24,
    paddingBottom: 40,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.base.white,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2', // Red 200
    marginTop: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444', // Red 500
  },
  versionContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#94A3B8', // Slate 400
    fontWeight: '500',
  },
});

export default UserProfileScreen;