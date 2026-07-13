/**
 * Header Component - MecaniMóvil
 * Alineado al patrón AppHeader con tokens y Lucide
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Bell } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../context/AuthContext';
import { ROUTES } from '../../../utils/constants';
import { getMediaURL } from '../../../services/api';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS, withOpacity } from '../../../design-system/tokens';
import BackButton from '../BackButton';

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
 * @param {string} backgroundColor - Color de fondo del header (default: paper)
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
  style = {},
}) => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [profileImageUrl, setProfileImageUrl] = useState(null);

  const canGoBack = navigation.canGoBack();
  const shouldShowBack = showBack !== null ? showBack : canGoBack;
  const isDarkGlass = backgroundColor === COLORS.base.inkBlack;
  const iconColor = isDarkGlass ? COLORS.text.inverse : COLORS.text.primary;
  const rightIconColor = isDarkGlass ? COLORS.text.inverse : COLORS.text.primary;

  useEffect(() => {
    if (!showProfile || !user) {
      setProfileImageUrl(null);
      return;
    }

    if (user?.foto_perfil_url) {
      setProfileImageUrl(user.foto_perfil_url);
    } else if (user?.foto_perfil) {
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

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (canGoBack) {
      navigation.goBack();
    }
  };

  const handleProfilePress = () => {
    navigation.navigate(ROUTES.PROFILE);
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, SPACING.sm),
          backgroundColor,
          borderBottomColor: isDarkGlass ? withOpacity(COLORS.base.white, 0.08) : COLORS.border.light,
          ...(isDarkGlass ? {} : SHADOWS.sm),
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.side}>
          {leftComponent
            || (showProfile ? (
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
                    onError={() => setProfileImageUrl(null)}
                  />
                ) : (
                  <View style={styles.profilePlaceholder}>
                    <User size={20} color={COLORS.text.secondary} strokeWidth={2} />
                  </View>
                )}
              </TouchableOpacity>
            ) : shouldShowBack ? (
              <BackButton onPress={handleBackPress} color={iconColor} />
            ) : null)}
        </View>

        <Text
          style={[TYPOGRAPHY.styles.h5, styles.title, { color: titleColor }]}
          numberOfLines={1}
        >
          {title}
        </Text>

        <View style={styles.side}>
          {rightComponent
            || ((showProfile || notificationBadge > 0) && (
              <TouchableOpacity
                onPress={() => navigation.navigate(ROUTES.NOTIFICATION_CENTER)}
                style={[styles.notificationButton, isDarkGlass && styles.notificationButtonDark]}
                hitSlop={8}
              >
                <Bell size={22} color={rightIconColor} strokeWidth={2} />
                {notificationBadge > 0 ? (
                  <View style={styles.badge}>
                    <Text style={[TYPOGRAPHY.styles.small, styles.badgeText]}>
                      {notificationBadge > 99 ? '99+' : notificationBadge}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  side: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null),
  },
  backButtonDark: {
    backgroundColor: 'transparent',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.text.primary,
  },
  profileButton: {
    width: 36,
    height: 36,
    position: 'relative',
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: BORDERS.radius.avatar?.full ?? BORDERS.radius.full,
    backgroundColor: COLORS.background.default,
  },
  profilePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: BORDERS.radius.avatar?.full ?? BORDERS.radius.full,
    backgroundColor: COLORS.background.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error[500],
    borderRadius: BORDERS.radius.badge?.full ?? BORDERS.radius.full,
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
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  notificationButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationButtonDark: {
    borderRadius: BORDERS.radius.full,
    backgroundColor: Platform.OS === 'ios' ? withOpacity(COLORS.base.white, 0.06) : withOpacity(COLORS.base.white, 0.10),
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(COLORS.base.white, 0.12),
  },
});

export default Header;
