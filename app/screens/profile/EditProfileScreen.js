import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, StatusBar, TouchableOpacity, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';

import { useAuth } from '../../context/AuthContext';
import * as userService from '../../services/user';
import { COLORS } from '../../design-system/tokens/colors';
import { getMediaURL } from '../../services/api';
import { useUserProfile } from '../../hooks/useUserProfile';

// Components
import Input from '../../components/base/Input/Input';
import Button from '../../components/base/Button/Button';

const GLASS_BG = Platform.select({
  ios: 'rgba(255,255,255,0.06)',
  android: 'rgba(255,255,255,0.10)',
  default: 'rgba(255,255,255,0.08)',
});
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const { user, updateProfile } = useAuth();

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
        <StatusBar barStyle="light-content" backgroundColor="#030712" />
        <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator color="#6EE7B7" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <View style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(16,185,129,0.08)' }} />
        <View style={{ position: 'absolute', top: 360, left: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(99,102,241,0.06)' }} />
        <View style={{ position: 'absolute', bottom: -50, right: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(6,182,212,0.05)' }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.profilePicWrapper}>
          <TouchableOpacity onPress={handleImagePick} activeOpacity={0.8} style={styles.avatarContainer}>
            {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />}
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={40} color="rgba(255,255,255,0.45)" />
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
            appearance="darkGlass"
            variant="filled"
            style={styles.inputContainer}
          />
          <Input
            label="Apellidos"
            value={formData.last_name}
            onChangeText={v => handleChange('last_name', v)}
            placeholder="Tus apellidos"
            leftIcon="person-outline"
            appearance="darkGlass"
            variant="filled"
            style={styles.inputContainer}
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
            appearance="darkGlass"
            variant="filled"
            style={[styles.inputContainer, { opacity: 0.6 }]}
          />
          <Input
            label="Teléfono"
            value={formData.telefono}
            onChangeText={v => handleChange('telefono', v)}
            placeholder="+56 9 1234 5678"
            leftIcon="call-outline"
            keyboardType="phone-pad"
            appearance="darkGlass"
            variant="filled"
            style={styles.inputContainer}
          />
        </View>

        <View style={styles.actionButtons}>
          <Button
            title="Guardar Cambios"
            onPress={handleSubmit}
            isLoading={loading}
            style={styles.saveButton}
            useGradient
            gradientColors={['#007EA7', '#00A8E8']}
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
    backgroundColor: '#030712',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030712',
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
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(147,197,253,0.95)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(3,7,18,0.9)',
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  spacer: {
    height: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 12,
    marginTop: 8,
    letterSpacing: 1,
  },
  inputGroup: {
    backgroundColor: GLASS_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    overflow: 'hidden',
    gap: 16,
  },
  inputContainer: {
    marginBottom: 0, // Reset default Input margin since we use gap
  },
  actionButtons: {
    gap: 16,
    marginTop: 8,
    marginBottom: 6,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelLink: {
    alignItems: 'center',
    padding: 12,
  },
  cancelText: {
    color: '#93C5FD',
    fontWeight: '700',
  },
});

export default EditProfileScreen;