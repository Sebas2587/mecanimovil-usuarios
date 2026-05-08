import React, { useState, useEffect, useRef } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../context/AuthContext';
import * as userService from '../../services/user';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS, SPACING, SHADOWS } from '../../design-system/tokens';
import { getMediaURL } from '../../services/api';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useQueryClient } from '@tanstack/react-query';

import Input from '../../components/base/Input/Input';
import Button from '../../components/base/Button/Button';
import PhoneInput, { validatePhoneNumber, parsePhoneValue } from '../../components/base/PhoneInput/PhoneInput';

const EditProfileScreen = () => {
  const navigation = useNavigation();
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

      <ScrollView
        contentContainerStyle={styles.formContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'on-drag'}
      >
        <View style={styles.profilePicWrapper}>
          <TouchableOpacity onPress={handleImagePick} activeOpacity={0.8} style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={40} color={COLORS.text.tertiary} />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color={COLORS.text.onPrimary} />
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.spacer} />

        <Text style={styles.sectionLabel}>INFORMACIÓN BÁSICA</Text>

        <View style={styles.inputGroup}>
          <Input
            label="Nombre"
            value={formData.first_name}
            onChangeText={(v) => handleChange('first_name', v)}
            placeholder="Tu nombre"
            leftIcon="person-outline"
            appearance="light"
            variant="filled"
            style={styles.inputContainer}
          />
          <Input
            label="Apellidos"
            value={formData.last_name}
            onChangeText={(v) => handleChange('last_name', v)}
            placeholder="Tus apellidos"
            leftIcon="person-outline"
            appearance="light"
            variant="filled"
            style={styles.inputContainer}
          />
        </View>

        <Text style={styles.sectionLabel}>CONTACTO</Text>

        <View style={styles.inputGroup}>
          <Input
            label="Email"
            value={formData.email}
            onChangeText={(v) => handleChange('email', v)}
            placeholder="usuario@email.com"
            leftIcon="mail-outline"
            editable={false}
            appearance="light"
            variant="filled"
            style={[styles.inputContainer, { opacity: 0.6 }]}
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

        <View style={styles.actionButtons}>
          <Button
            title="Guardar Cambios"
            onPress={handleSubmit}
            isLoading={loading}
            style={styles.saveButton}
            useGradient={false}
            type="primary"
          />
          <TouchableOpacity style={styles.cancelLink} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  profilePicWrapper: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  avatarContainer: {
    position: 'relative',
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: COLORS.neutral.gray[100],
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: COLORS.primary[500],
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.base.white,
  },
  formContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 40,
  },
  spacer: {
    height: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text.secondary,
    marginBottom: 12,
    marginTop: 8,
    letterSpacing: 1,
  },
  inputGroup: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    marginBottom: 18,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    gap: 16,
    ...SHADOWS.sm,
  },
  inputContainer: {
    marginBottom: 0,
  },
  actionButtons: {
    gap: 16,
    marginTop: 8,
    marginBottom: 6,
  },
  saveButton: {
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
  },
  cancelLink: {
    alignItems: 'center',
    padding: 12,
  },
  cancelText: {
    color: COLORS.primary[700],
    fontWeight: '700',
  },
});

export default EditProfileScreen;
