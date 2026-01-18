import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../design-system/theme/useTheme';
import * as userService from '../../services/user';

// Componentes
import Card from '../../components/base/Card/Card';
import Button from '../../components/base/Button/Button';
import Input from '../../components/base/Input/Input';

// Función para crear estilos dinámicos basados en el tema
const createStyles = (colors, typography, spacing, borders) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  loadingText: {
    marginTop: spacing.md || 16,
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.primary || '#00171F',
    textAlign: 'center',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingTop: spacing.md || 16,
  },
  formCard: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    margin: spacing.md || 16,
    borderRadius: borders.radius?.card?.md || 12,
    padding: spacing.lg || 20,
    shadowColor: colors.base?.inkBlack || '#00171F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#D7DFE3',
  },
  formSubtitle: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || colors.base?.inkBlack || '#00171F',
    marginBottom: spacing.lg || 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg || 24,
    gap: spacing.sm || 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const { user, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Extraer valores del tema
  const colors = theme?.colors || {};
  const typography = theme?.typography || {};
  const spacing = theme?.spacing || {};
  const borders = theme?.borders || {};
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    telefono: '',
    username: '',
  });
  
  const [formErrors, setFormErrors] = useState({});

  // Cargar datos del perfil al montar el componente
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setInitialLoading(true);
      
      console.log('📥 Cargando datos del perfil...');
      console.log('👤 Usuario del contexto:', user);
      
      // Intentar cargar desde el servicio primero (datos más actualizados del backend)
      let profileData = null;
      try {
        // Pasar el ID del usuario si está disponible para usar endpoint alternativo si es necesario
        const userId = user?.id;
        profileData = await userService.getUserProfile(userId);
        console.log('✅ Datos del perfil obtenidos del backend:', profileData);
      } catch (serviceError) {
        console.warn('⚠️ No se pudo cargar desde servicio, usando datos del contexto:', serviceError);
        // No lanzar error aquí, continuar con datos del contexto
      }
      
      // Usar datos del perfil del backend si están disponibles, sino usar datos del contexto
      const dataSource = profileData || user;
      
      if (dataSource) {
        console.log('📋 Datos fuente para el formulario:', dataSource);
        
        // Normalizar datos - el backend puede devolver en snake_case o puede venir del contexto normalizado
        // Usar los datos del perfil si están disponibles, sino usar datos del contexto
        // Asegurarse de que los valores null/undefined se traten como strings vacíos para el formulario
        const normalizedData = {
          first_name: (profileData?.first_name || profileData?.firstName || dataSource?.first_name || dataSource?.firstName || '').trim(),
          last_name: (profileData?.last_name || profileData?.lastName || dataSource?.last_name || dataSource?.lastName || '').trim(),
          email: profileData?.email || dataSource?.email || '',
          telefono: profileData?.telefono || dataSource?.telefono || '',
          username: profileData?.username || dataSource?.username || profileData?.email || dataSource?.email || '',
        };
        
        console.log('✅ Datos normalizados para el formulario:', {
          first_name: normalizedData.first_name || '(vacío)',
          last_name: normalizedData.last_name || '(vacío)',
          email: normalizedData.email || '(vacío)',
          telefono: normalizedData.telefono || '(vacío)',
        });
        
        setFormData(normalizedData);
        
        // Si los datos del perfil tienen información actualizada, actualizar también el contexto
        if (profileData && user) {
          const updatedContextUser = {
            ...user,
            firstName: profileData.first_name || profileData.firstName || user.firstName || user.first_name || '',
            lastName: profileData.last_name || profileData.lastName || user.lastName || user.last_name || '',
            first_name: profileData.first_name || profileData.firstName || user.first_name || user.firstName || '',
            last_name: profileData.last_name || profileData.lastName || user.last_name || user.lastName || '',
            email: profileData.email || user.email || '',
            telefono: profileData.telefono || user.telefono || '',
            foto_perfil: profileData.foto_perfil || user.foto_perfil || null,
          };
          
          // Actualizar el contexto sin hacer otra llamada al backend
          updateProfile({ ...updatedContextUser, _skipBackendUpdate: true }).catch(err => {
            console.warn('⚠️ No se pudo actualizar contexto automáticamente:', err);
          });
        }
      } else {
        console.warn('⚠️ No hay datos disponibles ni del perfil ni del contexto');
        Alert.alert('Advertencia', 'No se pudieron cargar los datos del perfil. Por favor, intenta recargar la pantalla.');
      }
    } catch (error) {
      console.error('❌ Error al cargar datos del perfil:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del perfil. Por favor, intenta nuevamente.');
    } finally {
      setInitialLoading(false);
    }
  };
  
  // Función para validar el formulario
  const validateForm = () => {
    const errors = {};
    
    if (!formData.first_name.trim()) {
      errors.first_name = 'El nombre es obligatorio';
    }
    
    if (!formData.last_name.trim()) {
      errors.last_name = 'El apellido es obligatorio';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'El correo electrónico es obligatorio';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = 'Correo electrónico inválido';
    }
    
    if (!formData.telefono.trim()) {
      errors.telefono = 'El teléfono es obligatorio';
    }
    
    // Dirección es opcional
    // Username ya no es necesario validar porque se usa first_name como display name
    
    return errors;
  };
  
  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
    
    if (formErrors[field]) {
      setFormErrors({
        ...formErrors,
        [field]: null,
      });
    }
  };
  
  const handleSubmit = async () => {
    // Validar formulario
    const errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      setLoading(true);
      
      // Crear un objeto con todos los datos necesarios
      // IMPORTANTE: No enviamos username porque es técnico (email) y no debe cambiarse desde aquí
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        telefono: formData.telefono || null,
      };
      
      // Llamar al servicio para actualizar el perfil
      const updatedUserData = await userService.updateUserProfile(updateData);
      
      // Actualizar el contexto de autenticación con la información actualizada
      // Normalizar los datos actualizados para consistencia
      if (updatedUserData) {
        const normalizedUpdatedUser = {
          ...user,
          id: user.id || updatedUserData.id,
          username: user.username || updatedUserData.username || user.email,
          firstName: updatedUserData.first_name || updatedUserData.firstName || user.firstName || user.first_name || formData.first_name,
          lastName: updatedUserData.last_name || updatedUserData.lastName || user.lastName || user.last_name || formData.last_name,
          first_name: updatedUserData.first_name || updatedUserData.firstName || user.first_name || user.firstName || formData.first_name,
          last_name: updatedUserData.last_name || updatedUserData.lastName || user.last_name || user.lastName || formData.last_name,
          email: updatedUserData.email || user.email || formData.email,
          telefono: updatedUserData.telefono || user.telefono || formData.telefono || '',
          foto_perfil: updatedUserData.foto_perfil || user.foto_perfil || null,
          es_mecanico: user.es_mecanico || false,
          is_client: user.is_client || false,
          _skipBackendUpdate: true, // Ya actualizamos en el backend, solo actualizar estado local
        };
        
        await updateProfile(normalizedUpdatedUser);
        
        Alert.alert(
          'Perfil Actualizado',
          'Tu información personal ha sido actualizada correctamente.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      
      const errorMessage = error.data?.detail || 
                          error.message || 
                          'No se pudo actualizar la información. Inténtalo de nuevo.';
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Crear estilos dinámicos con los tokens del tema
  const styles = createStyles(colors, typography, spacing, borders);

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background?.default || '#F8F9FA'} />
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary?.[500] || '#003459'} />
          <Text style={styles.loadingText}>Cargando datos del perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background?.default || '#F8F9FA'} />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.formCard}>
          <Text style={styles.formSubtitle}>Información Personal</Text>
          
          <Input
            label="Nombre"
            placeholder="Juan"
            value={formData.first_name}
            onChangeText={(value) => handleChange('first_name', value)}
            error={formErrors.first_name}
            autoCapitalize="words"
            leftIcon="person-outline"
          />
          
          <Input
            label="Apellidos"
            placeholder="Pérez García"
            value={formData.last_name}
            onChangeText={(value) => handleChange('last_name', value)}
            error={formErrors.last_name}
            autoCapitalize="words"
            leftIcon="person-outline"
          />
          
          <Input
            label="Correo electrónico"
            placeholder="usuario@ejemplo.com"
            value={formData.email}
            onChangeText={(value) => handleChange('email', value)}
            error={formErrors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
            editable={false}
            style={{ opacity: 0.7 }}
          />
          
          <Input
            label="Teléfono"
            placeholder="+521234567890"
            value={formData.telefono}
            onChangeText={(value) => handleChange('telefono', value)}
            error={formErrors.telefono}
            keyboardType="phone-pad"
            leftIcon="call-outline"
          />
          
          <View style={styles.buttonsContainer}>
            <Button
              title="Cancelar"
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
              type="outline"
            />
            
            <Button
              title="Guardar Cambios"
              onPress={handleSubmit}
              isLoading={loading}
              style={styles.saveButton}
            />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditProfileScreen; 