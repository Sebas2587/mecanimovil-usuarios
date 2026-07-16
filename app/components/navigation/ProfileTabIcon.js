import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { User } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { getMediaURL } from '../../services/api';
import { COLORS, BORDERS } from '../../design-system/tokens';
import PrimaryGradientFill from '../base/PrimaryGradientFill/PrimaryGradientFill';

const SIZE = 28;

/**
 * Icono de la pestaña Perfil — selected = gradiente Tinder (indicador activo).
 */
const ProfileTabIcon = ({ focused }) => {
  const { user } = useAuth();
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    if (!user) {
      setProfileImageUrl(null);
      return undefined;
    }
    if (user.foto_perfil_url) {
      setProfileImageUrl(user.foto_perfil_url);
      return undefined;
    }
    if (user.foto_perfil) {
      let cancelled = false;
      getMediaURL(user.foto_perfil)
        .then((url) => {
          if (!cancelled) setProfileImageUrl(url);
        })
        .catch(() => {
          if (!cancelled) setProfileImageUrl(null);
        });
      return () => {
        cancelled = true;
      };
    }
    setProfileImageUrl(null);
    return undefined;
  }, [user?.foto_perfil_url, user?.foto_perfil]);

  const innerSize = SIZE - (focused ? 4 : 2);
  const showImage = !!profileImageUrl && !imageFailed;
  const iconColor = focused ? COLORS.text.onPrimary : COLORS.icon.default;

  const avatarInner = showImage ? (
    <Image
      source={{ uri: profileImageUrl }}
      style={{
        width: innerSize,
        height: innerSize,
        borderRadius: innerSize / 2,
      }}
      contentFit="cover"
      cachePolicy="memory-disk"
      onError={() => setImageFailed(true)}
    />
  ) : (
    <View
      style={[
        styles.fallback,
        {
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: focused ? COLORS.base.white : COLORS.background.secondary,
        },
      ]}
    >
      <User size={16} color={iconColor} strokeWidth={focused ? 2.25 : 2} />
    </View>
  );

  if (focused) {
    return (
      <PrimaryGradientFill
        style={[styles.ring, { width: SIZE, height: SIZE, borderRadius: SIZE / 2 }]}
      >
        {avatarInner}
      </PrimaryGradientFill>
    );
  }

  return (
    <View
      style={[
        styles.ring,
        {
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderColor: COLORS.border.light,
          borderWidth: BORDERS.width.thin,
        },
      ]}
    >
      {avatarInner}
    </View>
  );
};

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 2,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(ProfileTabIcon);
