/**
 * Header Component - MecaniMóvil
 * Componente de header global consistente con nueva paleta
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../context/AuthContext';
import { ROUTES } from '../../../utils/constants';
import { getMediaURL } from '../../../services/api';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS } from '../../../design-system/tokens';

// Safe access to TYPOGRAPHY with fallback values - MUST be before any usage
const getSafeTypography = () => {
  try {
    if (TYPOGRAPHY && TYPOGRAPHY?.fontSize && TYPOGRAPHY?.fontWeight &&
      typeof TYPOGRAPHY?.fontSize?.xl !== 'undefined' &&
      typeof TYPOGRAPHY?.fontWeight?.bold !== 'undefined') {
      return TYPOGRAPHY;
    }
  } catch (e) {
    console.warn('TYPOGRAPHY not ready:', e);
  }
  return {
    fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36 },
    fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
  };
};

const SAFE_TYPOGRAPHY = getSafeTypography();

// Safe access to BORDERS with fallback values - MUST be before StyleSheet.create()
const getSafeBorders = () => {
  try {
    if (BORDERS && BORDERS.radius && typeof BORDERS.radius.full !== 'undefined') {
      return {
        radius: BORDERS.radius,
        width: BORDERS.width || { none: 0, thin: 1, medium: 2, thick: 4 },
      };
    }
  } catch (e) {
    console.warn('BORDERS not ready:', e);
  }
  return {
    radius: {
      none: 0, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20, '3xl': 24, full: 9999,
      avatar: { sm: 16, md: 24, lg: 32, full: 9999 },
      badge: { sm: 4, md: 8, lg: 12, full: 9999 },
    },
    width: { none: 0, thin: 1, medium: 2, thick: 4 },
  };
};

const SAFE_BORDERS = getSafeBorders();
const safeRadius = SAFE_BORDERS.radius;
const safeWidth = SAFE_BORDERS.width;

/**
 * Header Component
 * 
 * @param {string} title - Título del header
 * @param {boolean} showBack - Mostrar botón de retroceso (default: true si hay navegación previa)
 * @param {function} onBackPress - Función personalizada para el botón back
 * @param {boolean} showProfile - Mostrar foto de perfil (default: false)
 * @param {number} notificationBadge - Número de notificaciones (0 = no mostrar badge)
 * @param {ReactNode} leftComponent - Componente personalizado izquierdo (reemplaza back button)
 * @param {ReactNode} rightComponent - Componente personalizado derecho (reemplaza profile)
 * @param {string} backgroundColor - Color de fondo del header (default: white)
 * @param {string} titleColor - Color del título (default: text.primary)
 * @param {object} style - Estilos adicionales
 */
const Header = ({
  title = 'MecaniMovil',
  showBack = null,
  onBackPress = null,
  showProfile = false,
  notificationBadge = 0,
  leftComponent = null,
  rightComponent = null,
  backgroundColor = COLORS.background.paper,
  titleColor = COLORS.text.primary,
  style = {}
}) => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [profileImageUrl, setProfileImageUrl] = useState(null);

  // Determinar si debe mostrar el botón back
  const canGoBack = navigation.canGoBack();
  const shouldShowBack = showBack !== null ? showBack : canGoBack;

  // Cargar URL de foto de perfil
  useEffect(() => {
    if (!showProfile || !user) {
      setProfileImageUrl(null);
      return;
    }

    // El backend ahora devuelve foto_perfil_url con la URL completa de cPanel
    if (user?.foto_perfil_url) {
      setProfileImageUrl(user.foto_perfil_url);
    } else if (user?.foto_perfil) {
      // Fallback: si no hay foto_perfil_url, construir URL con getMediaURL
      const loadProfileImage = async () => {
        try {
          const fullUrl = await getMediaURL(user.foto_perfil);
          setProfileImageUrl(fullUrl);
        } catch (error) {
          console.error('Error cargando URL de foto de perfil en header:', error);
          setProfileImageUrl(null);
        }
      };
      loadProfileImage();
    } else {
      setProfileImageUrl(null);
    }
  }, [user?.foto_perfil_url, user?.foto_perfil, showProfile]);

  // Handler para el botón back
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (canGoBack) {
      navigation.goBack();
    }
  };

  // Handler para navegar al perfil
  const handleProfilePress = () => {
    navigation.navigate(ROUTES.PROFILE);
  };

  return (
    <View style={[
      styles.container,
      {
        paddingTop: Math.max(insets.top, 10),
        backgroundColor,
        borderBottomColor: COLORS.border.light,
        ...SHADOWS.sm,
      },
      style
    ]}>
      <View style={[styles.content, { paddingHorizontal: SPACING.md }]}>
        {/* Componente izquierdo (custom o back button) */}
        <View style={styles.leftContainer}>
          {leftComponent || (
            shouldShowBack && (
              <TouchableOpacity
                onPress={handleBackPress}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color={COLORS.primary[500]} />
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Título */}
        <View style={styles.titleContainer}>
          <Text
            style={[
              styles.title,
              {
                color: titleColor,
                fontSize: SAFE_TYPOGRAPHY.fontSize.xl,
                fontWeight: SAFE_TYPOGRAPHY.fontWeight.bold,
              }
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* Componente derecho (custom o foto de perfil) */}
        <View style={styles.rightContainer}>
          {rightComponent || (
            showProfile && (
              <TouchableOpacity
                onPress={handleProfilePress}
                activeOpacity={0.7}
                style={styles.profileButton}
              >
                {profileImageUrl ? (
                  <Image
                    source={{ uri: profileImageUrl }}
                    style={styles.profileImage}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                    onError={() => {
                      console.log('❌ Error cargando foto de perfil en header:', profileImageUrl);
                      setProfileImageUrl(null);
                    }}
                  />
                ) : (
                  <View style={styles.profilePlaceholder}>
                    <Ionicons name="person" size={20} color={COLORS.text.secondary} />
                  </View>
                )}

                {/* Badge de notificaciones */}
                {notificationBadge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {notificationBadge > 99 ? '99+' : notificationBadge}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: safeWidth.thin,
    ...Platform.select({
      ios: {
        // Sombras definidas inline
      },
      android: {
        // Elevation definida inline
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
  },
  leftContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  title: {
    // Estilos definidos inline
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  profileButton: {
    width: 36,
    height: 36,
    position: 'relative',
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: safeRadius.avatar?.full ?? safeRadius.full,
    backgroundColor: COLORS.background.default,
  },
  profilePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: safeRadius.avatar?.full ?? safeRadius.full,
    backgroundColor: COLORS.background.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error[500],
    borderRadius: safeRadius.badge?.full ?? safeRadius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    borderWidth: 2,
    borderColor: COLORS.background.paper,
  },
  badgeText: {
    color: COLORS.text.inverse,
    fontSize: SAFE_TYPOGRAPHY.fontSize.xs,
    fontWeight: SAFE_TYPOGRAPHY.fontWeight.bold,
  },
});

export default Header;

