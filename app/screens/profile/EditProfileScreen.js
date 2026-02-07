import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, StatusBar, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../context/AuthContext';
import * as userService from '../../services/user';
import { COLORS } from '../../design-system/tokens/colors';
import { getMediaURL } from '../../services/api';
import { useUserProfile } from '../../hooks/useUserProfile';

// Components
import Input from '../../components/base/Input/Input';
import Button from '../../components/base/Button/Button';

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const { user, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();

  // State
  const [loading, setLoading] = useState(false);
  // initialLoading removed, replaced by isProfileLoading from hook
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    telefono: '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Profile hook for image updates and data fetching
  const {
    data: userProfile,
    isLoading: isProfileLoading,
    updateProfile: updateProfileMutation,
    updateProfilePicture: updateProfilePictureMutation,
    isUpdatingPicture
  } = useUserProfile(user?.id);

  // Sync Form Data when profile loads
  useEffect(() => {
    // Si tenemos datos del perfil (ya sea de caché o recién cargados), actualizar el formulario
    // Prioridad: datos del hook > usuario del contexto
    const dataSource = userProfile || user;

    if (dataSource) {
      setFormData({
        first_name: (dataSource.first_name || dataSource.firstName || '').trim(),
        last_name: (dataSource.last_name || dataSource.lastName || '').trim(),
        email: dataSource.email || '',
        telefono: dataSource.telefono || '',
      });

      // Load Image
      const picUrl = dataSource.foto_perfil_url || dataSource.foto_perfil;
      if (picUrl && !picUrl.startsWith('http')) {
        // If it's a relative path, resolve it (simplified logic)
        getMediaURL(picUrl).then(fullUrl => {
          setProfileImage(fullUrl);
        }).catch(() => setProfileImage(null));
      } else {
        setProfileImage(picUrl);
      }
    }
  }, [userProfile, user]); // Re-run when profile data changes

  // Handlers
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleImagePick = async () => {
    // reuse existing logic simplified
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      // Upload immediately
      uploadImage(result.assets[0]);
    }
  };

  const uploadImage = async (asset) => {
    try {
      // Optimistic UI update
      setProfileImage(asset.uri);

      const formData = new FormData();
      formData.append('foto_perfil', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: 'profile_edit.jpg',
      });

      const result = await updateProfilePictureMutation(formData);

      // Update AuthContext to propagate changes to all components
      if (result && result.foto_perfil_url) {
        await updateProfile({
          ...user,
          foto_perfil: result.foto_perfil_url,
          foto_perfil_url: result.foto_perfil_url,
          _skipBackendUpdate: true
        });
      } else {
        // If result doesn't include URL, fetch fresh profile data
        const freshProfile = await userService.getUserProfile(user?.id);
        if (freshProfile) {
          await updateProfile({
            ...user,
            foto_perfil: freshProfile.foto_perfil_url || freshProfile.foto_perfil,
            foto_perfil_url: freshProfile.foto_perfil_url || freshProfile.foto_perfil,
            _skipBackendUpdate: true
          });
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Falló la subida de imagen');
    }
  };

  const handleSubmit = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      Alert.alert('Faltan datos', 'Por favor completa los campos obligatorios.');
      return;
    }

    try {
      setLoading(true);
      const updateData = { ...formData };
      if (!updateData.telefono) delete updateData.telefono; // Send null or exclude if empty? logic says send null or keep empty string

      const updatedUser = await userService.updateUserProfile(updateData);

      // Sync Context
      if (updatedUser) {
        await updateProfile({
          ...user,
          ...updatedUser,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          _skipBackendUpdate: true
        });
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  if (isProfileLoading && !user) {
    // Solo mostrar loading si no tenemos datos de usuario previos (contexto)
    // para evitar flickering si ya tenemos datos básicos
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.profilePicWrapper}>
          <TouchableOpacity onPress={handleImagePick} activeOpacity={0.8} style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={40} color={COLORS.neutral.gray[400]} />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color="white" />
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.spacer} />

        <Text style={styles.sectionLabel}>INFORMACIÓN BÁSICA</Text>

        <View style={styles.inputGroup}>
          <Input
            label="Nombre"
            value={formData.first_name}
            onChangeText={v => handleChange('first_name', v)}
            placeholder="Tu nombre"
            leftIcon="person-outline"
            containerStyle={styles.inputContainer}
          />
          <Input
            label="Apellidos"
            value={formData.last_name}
            onChangeText={v => handleChange('last_name', v)}
            placeholder="Tus apellidos"
            leftIcon="person-outline"
            containerStyle={styles.inputContainer}
          />
        </View>

        <Text style={styles.sectionLabel}>CONTACTO</Text>

        <View style={styles.inputGroup}>
          <Input
            label="Email"
            value={formData.email}
            onChangeText={v => handleChange('email', v)}
            placeholder="usuario@email.com"
            leftIcon="mail-outline"
            editable={false} // Often email is immutable or requires specific flow
            containerStyle={[styles.inputContainer, { opacity: 0.6 }]}
          />
          <Input
            label="Teléfono"
            value={formData.telefono}
            onChangeText={v => handleChange('telefono', v)}
            placeholder="+56 9 1234 5678"
            leftIcon="call-outline"
            keyboardType="phone-pad"
            containerStyle={styles.inputContainer}
          />
        </View>

        <View style={styles.actionButtons}>
          <Button
            title="Guardar Cambios"
            onPress={handleSubmit}
            isLoading={loading}
            style={styles.saveButton}
          />
          <TouchableOpacity style={styles.cancelLink} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicWrapper: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.neutral.gray[100],
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 4,
    backgroundColor: COLORS.primary[500],
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  spacer: {
    height: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.neutral.gray[400],
    marginBottom: 12,
    marginTop: 8,
    letterSpacing: 1,
  },
  inputGroup: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray[100],
    gap: 16,
  },
  inputContainer: {
    marginBottom: 0, // Reset default Input margin since we use gap
  },
  actionButtons: {
    gap: 16,
    marginTop: 8,
  },
  saveButton: {
    borderRadius: 12,
  },
  cancelLink: {
    alignItems: 'center',
    padding: 12,
  },
  cancelText: {
    color: COLORS.neutral.gray[500],
    fontWeight: '600',
  },
});

export default EditProfileScreen;