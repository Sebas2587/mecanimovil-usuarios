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
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    telefono: '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Profile hook for image updates
  const { updateProfilePicture: updateProfilePictureMutation, isUpdatingPicture } = useUserProfile(user?.id);

  // Initial Data Load
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setInitialLoading(true);
      const userId = user?.id;
      // Try fetch fresh data
      let profileData = null;
      try {
        profileData = await userService.getUserProfile(userId);
      } catch (err) {
        console.warn('Using context fallback for edit profile');
      }

      const dataSource = profileData || user;
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
          try {
            const fullUrl = await getMediaURL(picUrl);
            setProfileImage(fullUrl);
          } catch (e) { setProfileImage(null); }
        } else {
          setProfileImage(picUrl);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los datos.');
    } finally {
      setInitialLoading(false);
    }
  };

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
      await updateProfilePictureMutation(formData);
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

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerGradientContainer, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Profile Pic Container centered over the gradient bottom edge */}
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
      </View>

      <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
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
  headerGradientContainer: {
    height: 180,
    position: 'relative',
    zIndex: 1,
    marginBottom: 50, // Space for avatar overlap
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  profilePicWrapper: {
    position: 'absolute',
    bottom: -40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
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
    borderWidth: 4,
    borderColor: 'white',
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