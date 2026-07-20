import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { User, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../context/AuthContext';
import * as userService from '../../services/user';
import { COLORS, BORDERS, SPACING, SHADOWS, TYPOGRAPHY } from '../../design-system/tokens';
import { getMediaURL } from '../../services/api';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useQueryClient } from '@tanstack/react-query';

import Input from '../../components/base/Input/Input';
import Button from '../../components/base/Button/Button';
import GuestGradientButton from '../../components/guest/GuestGradientButton';
import PrimaryGradientBadge from '../../components/base/PrimaryGradientBadge/PrimaryGradientBadge';
import PhoneInput, { validatePhoneNumber, parsePhoneValue } from '../../components/base/PhoneInput/PhoneInput';

/**
 * Editar perfil — arquitectura Airbnb:
 * card de identidad centrada + secciones con título sentence-case + campos planos + CTA inferior.
 */
const EditProfileScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  /** Evita que un refetch de perfil pise lo que el usuario ya editó (muy visible en web). */
  const formDirtyRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    telefono: '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const {
    data: userProfile,
    isLoading: isProfileLoading,
    updateProfilePicture: updateProfilePictureMutation,
  } = useUserProfile(user?.id);

  useEffect(() => {
    const dataSource = userProfile || user;

    if (dataSource) {
      if (formDirtyRef.current) {
        const picUrl = dataSource.foto_perfil_url || dataSource.foto_perfil;
        if (picUrl && !picUrl.startsWith('http')) {
          getMediaURL(picUrl).then(setProfileImage).catch(() => {});
        } else if (picUrl) {
          setProfileImage(picUrl);
        }
        return;
      }

      setFormData({
        first_name: (dataSource.first_name || dataSource.firstName || '').trim(),
        last_name: (dataSource.last_name || dataSource.lastName || '').trim(),
        email: dataSource.email || '',
        telefono: dataSource.telefono || '',
      });

      const picUrl = dataSource.foto_perfil_url || dataSource.foto_perfil;
      if (picUrl && !picUrl.startsWith('http')) {
        getMediaURL(picUrl)
          .then((fullUrl) => {
            setProfileImage(fullUrl);
          })
          .catch(() => setProfileImage(null));
      } else {
        setProfileImage(picUrl);
      }
    }
  }, [userProfile, user]);

  const displayName = useMemo(() => {
    const name = `${formData.first_name || ''} ${formData.last_name || ''}`.trim();
    return name || user?.username || 'Tu perfil';
  }, [formData.first_name, formData.last_name, user?.username]);

  const handleChange = (field, value) => {
    formDirtyRef.current = true;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0]);
    }
  };

  const uploadImage = async (asset) => {
    try {
      setProfileImage(asset.uri);

      const fd = new FormData();
      fd.append('foto_perfil', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: 'profile_edit.jpg',
      });

      const result = await updateProfilePictureMutation(fd);

      if (result && result.foto_perfil_url) {
        await updateProfile({
          ...user,
          foto_perfil: result.foto_perfil_url,
          foto_perfil_url: result.foto_perfil_url,
          _skipBackendUpdate: true,
        });
      } else {
        const freshProfile = await userService.getUserProfile(user?.id);
        if (freshProfile) {
          await updateProfile({
            ...user,
            foto_perfil: freshProfile.foto_perfil_url || freshProfile.foto_perfil,
            foto_perfil_url: freshProfile.foto_perfil_url || freshProfile.foto_perfil,
            _skipBackendUpdate: true,
          });
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Falló la subida de imagen');
    }
  };

  const handleSubmit = async () => {
    const fn = (formData.first_name || '').trim();
    const ln = (formData.last_name || '').trim();
    if (!fn || !ln || !formData.email) {
      Alert.alert('Faltan datos', 'Por favor completa los campos obligatorios.');
      return;
    }

    const tel = (formData.telefono || '').trim();
    if (tel) {
      const { country, number } = parsePhoneValue(tel);
      const phoneError = validatePhoneNumber(country, number);
      if (phoneError) {
        setFormErrors((prev) => ({ ...prev, telefono: phoneError }));
        Alert.alert('Teléfono', phoneError);
        return;
      }
    }

    try {
      setLoading(true);
      // email es read-only en backend; no enviarlo evita edge cases. Solo campos permitidos en PATCH.
      const updateData = {
        first_name: fn,
        last_name: ln,
      };
      if (tel) updateData.telefono = tel;

      const updatedUser = await userService.updateUserProfile(updateData);

      const merged = updatedUser && typeof updatedUser === 'object' ? updatedUser : {};
      await updateProfile({
        ...user,
        ...merged,
        first_name: merged.first_name ?? fn,
        last_name: merged.last_name ?? ln,
        firstName: merged.first_name ?? fn,
        lastName: merged.last_name ?? ln,
        telefono: merged.telefono ?? tel,
        email: user?.email || formData.email,
        _skipBackendUpdate: true,
      });
      formDirtyRef.current = false;
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['userProfile', user.id] });
      }
      navigation.goBack();
    } catch (error) {
      const msg = error?.message || error?.response?.data?.detail || 'No se pudo actualizar el perfil';
      Alert.alert('Error', typeof msg === 'string' ? msg : 'No se pudo actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  if (isProfileLoading && !user) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />
        <ActivityIndicator color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <ScrollView
        contentContainerStyle={[
          styles.formContainer,
          { paddingBottom: Math.max(insets.bottom, 16) + SPACING.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'on-drag'}
      >
        {/* Card de identidad — patrón Airbnb summary */}
        <View style={styles.identityCard}>
          <TouchableOpacity
            onPress={handleImagePick}
            activeOpacity={0.85}
            style={styles.avatarOuter}
            accessibilityRole="button"
            accessibilityLabel="Cambiar foto de perfil"
          >
            <View style={styles.avatarClip}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <User size={44} color={COLORS.text.tertiary} strokeWidth={1.75} />
                </View>
              )}
            </View>
            <PrimaryGradientBadge style={styles.cameraBadge}>
              <Camera size={14} color={COLORS.text.onPrimary} strokeWidth={2} />
            </PrimaryGradientBadge>
          </TouchableOpacity>

          <Text style={styles.identityName} numberOfLines={1}>
            {displayName}
          </Text>
          <TouchableOpacity onPress={handleImagePick} activeOpacity={0.7} hitSlop={8}>
            <Text style={styles.changePhotoLink}>Cambiar foto</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Información básica</Text>
        <View style={styles.fieldsBlock}>
          <Input
            label="Nombre"
            value={formData.first_name}
            onChangeText={(v) => handleChange('first_name', v)}
            placeholder="Tu nombre"
            autoCapitalize="words"
            appearance="light"
            variant="default"
            style={styles.input}
          />
          <Input
            label="Apellidos"
            value={formData.last_name}
            onChangeText={(v) => handleChange('last_name', v)}
            placeholder="Tus apellidos"
            autoCapitalize="words"
            appearance="light"
            variant="default"
            style={styles.input}
          />
        </View>

        <View style={styles.sectionDivider} />

        <Text style={styles.sectionTitle}>Contacto</Text>
        <View style={styles.fieldsBlock}>
          <Input
            label="Email"
            value={formData.email}
            onChangeText={(v) => handleChange('email', v)}
            placeholder="usuario@email.com"
            editable={false}
            appearance="light"
            variant="default"
            helperText="El email no se puede cambiar aquí"
            style={[styles.input, styles.inputReadonly]}
          />
          <PhoneInput
            label="Teléfono"
            value={formData.telefono}
            onChangeText={(v) => {
              handleChange('telefono', v);
              if (formErrors.telefono) setFormErrors((prev) => ({ ...prev, telefono: null }));
            }}
            error={formErrors.telefono}
          />
        </View>

        <View style={styles.actions}>
          <GuestGradientButton
            title="Guardar"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.saveButton}
          />
          <Button
            title="Cancelar"
            type="secondary"
            variant="outline"
            fullWidth
            size="md"
            onPress={() => navigation.goBack()}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.default,
  },
  formContainer: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
  },
  identityCard: {
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
  },
  avatarOuter: {
    position: 'relative',
    width: 120,
    height: 120,
    marginBottom: SPACING.md,
  },
  avatarClip: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.background.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.neutral.gray[100],
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.background.paper,
    zIndex: 2,
    elevation: 4,
  },
  identityName: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  changePhotoLink: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.buttonSecondary.outlineText,
  },
  sectionTitle: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  fieldsBlock: {
    marginBottom: SPACING.sm,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border.light,
    marginVertical: SPACING.lg,
  },
  input: {
    marginBottom: SPACING.md,
  },
  inputReadonly: {
    opacity: 0.72,
  },
  actions: {
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  saveButton: {
    width: '100%',
  },
});

export default EditProfileScreen;
