import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { User } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { getMediaURL } from '../../services/api';
import { COLORS } from '../../design-system/tokens';

const SIZE = 28;

/**
 * Icono de la pestaña Perfil: foto del usuario (misma lógica que el header anterior).
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
  const iconColor = focused ? COLORS.primary[500] : COLORS.text.tertiary;

  return (
    <View
      style={[
        styles.ring,
        {
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderColor: focused ? COLORS.primary[500] : COLORS.border.light,
          borderWidth: focused ? 2 : 1,
        },
      ]}
    >
      {showImage ? (
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
            },
          ]}
        >
          <User size={16} color={iconColor} strokeWidth={focused ? 2.25 : 2} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary[50],
  },
});

export default React.memo(ProfileTabIcon);
