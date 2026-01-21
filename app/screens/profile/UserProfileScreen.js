import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, StatusBar, Dimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../utils/constants';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { getMediaURL } from '../../services/api';
import { useTheme } from '../../design-system/theme/useTheme';
import { useUserProfile } from '../../hooks/useUserProfile';
import ScrollContainer from '../../components/base/ScrollContainer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const UserProfileScreen = () => {
  const navigation = useNavigation();
  const { user, token, updateProfile, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // Extraer valores del tema de forma segura
  const colors = theme?.colors || {};
  const typography = theme?.typography || {};
  const spacing = theme?.spacing || {};
  const borders = theme?.borders || {};

  // Asegurar que typography tenga todas las propiedades necesarias
  const safeTypography = typography?.fontSize && typography?.fontWeight
    ? typography
    : {
      fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24 },
      fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
    };

  // Validar que borders esté completamente inicializado
  const safeBorders = (borders?.radius && typeof borders.radius.full !== 'undefined')
    ? borders
    : {
      radius: {
        none: 0, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20, '3xl': 24,
        full: 9999,
        button: { sm: 8, md: 12, lg: 16, full: 9999 },
        input: { sm: 8, md: 12, lg: 16 },
        card: { sm: 8, md: 12, lg: 16, xl: 20 },
        modal: { sm: 12, md: 16, lg: 20, xl: 24 },
        avatar: { sm: 16, md: 24, lg: 32, full: 9999 },
        badge: { sm: 4, md: 8, lg: 12, full: 9999 },
      },
      width: { none: 0, thin: 1, medium: 2, thick: 4 }
    };

  // Crear estilos dinámicos con los tokens del tema
  const styles = createStyles(colors, safeTypography, spacing, safeBorders);

  const { data: userProfileData, isLoading: isProfileLoading, updateProfilePicture: updateProfilePictureMutation, isUpdatingPicture } = useUserProfile(user?.id);

  // Usar datos del hook (prioridad) o del contexto como fallback
  const displayData = userProfileData || user;

  const [profileImage, setProfileImage] = useState(null);

  // Opciones para el selector de imágenes
  const imagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  };

  // Cargar URL de foto de perfil cuando cambie el usuario o los datos del perfil
  useEffect(() => {
    const loadProfileImageUrl = async () => {
      // Prioridad: foto_perfil_url (URL completa del backend) > foto_perfil (construir URL)
      const fotoPerfilUrl = displayData?.foto_perfil_url;
      const fotoPerfil = displayData?.foto_perfil;

      if (fotoPerfilUrl) {
        // El backend devuelve foto_perfil_url con la URL completa de cPanel
        setProfileImage(fotoPerfilUrl);
      } else if (fotoPerfil) {
        try {
          const fullUrl = await getMediaURL(fotoPerfil);
          setProfileImage(fullUrl);
        } catch (error) {
          console.error('Error cargando URL de foto de perfil:', error);
          setProfileImage(null);
        }
      } else {
        setProfileImage(null);
      }
    };

    loadProfileImageUrl();
  }, [displayData?.foto_perfil_url, displayData?.foto_perfil]);

  // Funciones para gestionar la foto de perfil
  const handleSelectImage = () => {
    Alert.alert(
      'Foto de Perfil',
      '¿Cómo deseas cambiar tu foto de perfil?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Galería',
          onPress: () => openImagePicker('library'),
        },
        {
          text: 'Cámara',
          onPress: () => openImagePicker('camera'),
        },
      ]
    );
  };

  const openImagePicker = async (type) => {
    try {
      let result;

      // Solicitar permisos primero
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara para esta función');
          return;
        }
        result = await ImagePicker.launchCameraAsync(imagePickerOptions);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para esta función');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(imagePickerOptions);
      }

      if (result.canceled) {
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        await uploadProfileImage(selectedImage);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen. Inténtalo de nuevo.');
    }
  };

  const uploadProfileImage = async (image) => {
    try {
      // Crear FormData para subir la imagen
      const formData = new FormData();
      formData.append('foto_perfil', {
        uri: image.uri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      });

      // Llamar al servicio para actualizar la foto de perfil usando el hook
      await updateProfilePictureMutation(formData);

      // Actualizar los datos del usuario en el contexto (opcional, el hook ya actualiza cache)
      // Pero AuthContext podría necesitar saberlo si usa su propio estado
      // Si AuthContext lee de cache o si actualizamos el usuario del contexto manualmente:
      /*
      if (user) {
         updateProfile({ ...user, foto_perfil: ... });
      }
      */

      Alert.alert('Éxito', 'Tu foto de perfil ha sido actualizada correctamente.');
    } catch (error) {
      console.error('Error al subir imagen:', error);
      Alert.alert('Error', 'No se pudo actualizar la foto de perfil. Inténtalo de nuevo.');
    }
  };

  // Lista de opciones del perfil con colores del tema
  const profileOptions = [
    {
      id: 'active-appointments',
      title: 'Mis Agendamientos',
      icon: 'calendar-outline',
      route: ROUTES.ACTIVE_APPOINTMENTS,
      bgColor: colors.success?.[50] || '#ECFDF5',
      iconColor: colors.success?.[600] || '#059669',
    },
    {
      id: 'historial-pagos',
      title: 'Historial de Pagos',
      icon: 'receipt-outline',
      route: ROUTES.HISTORIAL_PAGOS,
      bgColor: colors.primary?.[50] || '#E6F2F7',
      iconColor: colors.primary?.[600] || '#003459',
    },
    {
      id: 'pending-reviews',
      title: 'Calificaciones',
      icon: 'star-outline',
      route: 'PendingReviews',
      bgColor: colors.warning?.[50] || '#FFFBEB',
      iconColor: colors.warning?.[600] || '#D97706',
    },
    {
      id: 'support',
      title: 'Soporte',
      icon: 'help-buoy-outline',
      route: ROUTES.SUPPORT,
      bgColor: colors.info?.[50] || colors.primary?.[50] || '#E6F2F7',
      iconColor: colors.info?.[600] || colors.primary?.[600] || '#002A47',
    },
    {
      id: 'terms',
      title: 'Términos y Condiciones',
      icon: 'document-text-outline',
      route: ROUTES.TERMS,
      bgColor: colors.neutral?.gray?.[100] || '#F3F4F6',
      iconColor: colors.neutral?.gray?.[600] || '#6B7280',
    },
  ];

  const handleEditProfile = () => {
    navigation.navigate(ROUTES.EDIT_PROFILE);
  };

  // Función para manejar la navegación a las pantallas secundarias
  const navigateToScreen = (screenName) => {
    navigation.navigate(screenName);
  };

  // Función para manejar el logout
  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // En web usamos window.confirm ya que Alert.alert no soporta botones custom
      const confirm = window.confirm('¿Estás seguro de que deseas cerrar sesión?');
      if (confirm) {
        logout().catch(error => {
          console.error('Error al cerrar sesión:', error);
          alert('No se pudo cerrar sesión. Intenta de nuevo.');
        });
      }
    } else {
      // En móvil usamos el componente nativo Alert
      Alert.alert(
        'Cerrar Sesión',
        '¿Estás seguro de que deseas cerrar sesión?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Cerrar Sesión',
            style: 'destructive',
            onPress: async () => {
              try {
                await logout();
                // La navegación se maneja automáticamente en el AuthContext
              } catch (error) {
                console.error('Error al cerrar sesión:', error);
                Alert.alert('Error', 'No se pudo cerrar sesión. Intenta de nuevo.');
              }
            },
          },
        ]
      );
    }
  };

  // Mostrar nombre completo
  const displayName = displayData
    ? `${displayData.firstName || displayData.first_name || ''} ${displayData.lastName || displayData.last_name || ''}`.trim() || displayData.username || 'Usuario'
    : 'Usuario';

  const displayEmail = displayData?.email || 'correo@ejemplo.com';
  const displayPhone = displayData?.telefono;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background?.paper || '#FFFFFF'} />

      <ScrollContainer
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + spacing.xl || 32 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Tarjeta de perfil principal */}
        <View style={styles.profileCard}>
          <View style={styles.profileInfo}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handleSelectImage}
              disabled={isUpdatingPicture}
              activeOpacity={0.8}
            >
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={styles.noAvatarContainer}>
                  <Ionicons
                    name="person"
                    size={48}
                    color={colors.text?.secondary || '#5D6F75'}
                  />
                </View>
              )}
              <View style={styles.editAvatarButton}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.userDetails}>
              <Text style={styles.userName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>{displayEmail}</Text>
              {displayPhone && (
                <Text style={styles.userPhone} numberOfLines={1}>{displayPhone}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={handleEditProfile}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={16} color="#FFFFFF" />
            <Text style={styles.editProfileButtonText}>Editar Datos</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Mi Cuenta</Text>

        {/* Grid de opciones en 2 columnas */}
        <View style={styles.optionsGrid}>
          {profileOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={() => navigateToScreen(option.route)}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: option.bgColor }]}>
                <Ionicons name={option.icon} size={28} color={option.iconColor} />
              </View>
              <Text style={styles.optionTitle} numberOfLines={2}>{option.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Botón de Cerrar Sesión */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error?.[600] || '#DC2626'} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollContainer>
    </SafeAreaView>
  );
};

// Función para crear estilos dinámicos basados en el tema
const createStyles = (colors, typography, spacing, borders) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingTop: spacing.sm || 12,
  },
  profileCard: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    marginHorizontal: spacing.md || 16,
    marginTop: spacing.md || 16,
    marginBottom: spacing.lg || 24,
    borderRadius: borders.radius?.card?.md || 12,
    padding: spacing.lg || 20,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg || 20,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: borders.radius?.avatar?.full || 48,
    backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    position: 'relative',
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: borders.radius?.avatar?.full || 46,
  },
  noAvatarContainer: {
    width: 92,
    height: 92,
    borderRadius: borders.radius?.avatar?.full || 46,
    backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary?.[500] || '#003459',
    width: 32,
    height: 32,
    borderRadius: borders.radius?.avatar?.sm || 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: borders.width?.medium || 2,
    borderColor: colors.background?.paper || '#FFFFFF',
    shadowColor: colors.primary?.[500] || '#003459',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  userDetails: {
    marginLeft: spacing.md || 16,
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginBottom: spacing.xs || 4,
    lineHeight: typography.fontSize?.xl ? typography.fontSize.xl * 1.2 : 24,
  },
  userEmail: {
    fontSize: typography.fontSize?.base || 14,
    color: colors.text?.secondary || '#5D6F75',
    marginBottom: spacing.xs || 4,
    fontWeight: typography.fontWeight?.regular || '400',
    lineHeight: typography.fontSize?.base ? typography.fontSize.base * 1.4 : 19.6,
  },
  userPhone: {
    fontSize: typography.fontSize?.base || 14,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.regular || '400',
    lineHeight: typography.fontSize?.base ? typography.fontSize.base * 1.4 : 19.6,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: colors.primary?.[500] || '#003459',
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.sm || 10,
    borderRadius: borders.radius?.button?.md || 12,
    gap: spacing.xs || 6,
    shadowColor: colors.primary?.[500] || '#003459',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  editProfileButtonText: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeight?.semibold || '600',
    fontSize: typography.fontSize?.base || 14,
  },
  sectionTitle: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginHorizontal: spacing.md || 16,
    marginBottom: spacing.md || 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md || 16,
    marginBottom: spacing.lg || 24,
    gap: spacing.sm || 12,
    justifyContent: 'space-between',
  },
  optionCard: {
    width: (SCREEN_WIDTH - (spacing.md || 16) * 2 - (spacing.sm || 12)) / 2,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.card?.md || 12,
    padding: spacing.md || 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 130,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  optionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: borders.radius?.avatar?.md || 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm || 12,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  optionTitle: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || '#00171F',
    textAlign: 'center',
    lineHeight: typography.fontSize?.base ? typography.fontSize.base * 1.3 : 18.2,
  },
  logoutContainer: {
    paddingHorizontal: spacing.md || 16,
    paddingBottom: spacing.xl || 32,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.card?.md || 12,
    padding: spacing.md || 16,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.error?.[200] || '#FECACA',
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    gap: spacing.xs || 8,
  },
  logoutText: {
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.error?.[600] || '#DC2626',
  },
});

export default UserProfileScreen; 