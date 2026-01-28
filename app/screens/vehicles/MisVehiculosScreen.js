import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  StatusBar
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, ROUTES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Componentes
import Button from '../../components/base/Button/Button';
import Input from '../../components/base/Input/Input';
import ScrollContainer from '../../components/base/ScrollContainer';

// Servicios y Hooks
import { useVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle, useCarBrands, useCarModels } from '../../hooks/useVehicles';
import { useServicesHistory } from '../../hooks/useServices';
import * as userService from '../../services/user';
import * as vehicleService from '../../services/vehicle';
import * as VehicleHealthService from '../../services/vehicleHealthService';

const tiposMotor = [
  { id: 1, nombre: 'Gasolina' },
  { id: 2, nombre: 'Diésel' },
];

const MisVehiculosScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  // Estados para la lista de vehículos (Refactored to Hooks)
  const { data: vehiclesData, isLoading: isLoadingVehicles, refetch: refetchVehicles } = useVehicles();
  const vehicles = vehiclesData || [];
  const loading = isLoadingVehicles && vehicles.length === 0;

  const [refreshing, setRefreshing] = useState(false);

  // Mutations
  const { mutateAsync: createVehicleAsync } = useCreateVehicle();
  const { mutateAsync: updateVehicleAsync } = useUpdateVehicle();
  const { mutateAsync: deleteVehicleAsync } = useDeleteVehicle();

  // Estado para el modal de creación
  const [modalVisible, setModalVisible] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);

  // Estados para el formulario
  const { data: carBrands } = useCarBrands();
  const marcas = carBrands || [];

  const [marcaSeleccionada, setMarcaSeleccionada] = useState(null);
  const { data: modelosData } = useCarModels(marcaSeleccionada?.id);
  const modelos = modelosData || [];

  const [formData, setFormData] = useState({
    marca: '',
    modelo: '',
    cilindraje: '',
    tipo_motor: '',
    year: '',
    patente: '',
    foto: null,
    kilometraje: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showMarcasDropdown, setShowMarcasDropdown] = useState(false);
  const [showModelosDropdown, setShowModelosDropdown] = useState(false);
  const [showTiposMotorDropdown, setShowTiposMotorDropdown] = useState(false);
  const [clienteId, setClienteId] = useState(null);

  // Checklist State
  const [checklistItems, setChecklistItems] = useState([]);
  const [selectedChecklistItems, setSelectedChecklistItems] = useState([]);
  const [fetchingChecklist, setFetchingChecklist] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  // Image Picker Options
  const imagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.7,
  };

  useFocusEffect(
    useCallback(() => {
      refetchVehicles();
      if (route.params?.refresh) {
        navigation.setParams({ refresh: undefined });
      }
    }, [route.params?.refresh, refetchVehicles])
  );

  useEffect(() => {
    fetchClienteDetails();
  }, []);

  const fetchClienteDetails = async () => {
    try {
      const data = await userService.getClienteDetails();
      if (data && data.id) {
        setClienteId(data.id);
      }
    } catch (error) {
      console.error('Error al obtener detalles del cliente:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchVehicles();
    } catch (error) {
      console.error('Error refrescando vehículos:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Listen for manual fallback from Registration Screen
  useEffect(() => {
    if (route.params?.promptManual) {
      // Clear params to avoid loop
      navigation.setParams({ promptManual: undefined });
      // Open modal
      setIsEdit(false);
      setEditingVehicleId(null);
      setCurrentStep(1);
      const prefill = route.params?.prefillPatente || '';
      setFormData(prev => ({ ...prev, patente: prefill }));
      setModalVisible(true);
    }
  }, [route.params?.promptManual]);

  const handleAddVehicle = () => {
    // Navigate to new Smart Registration Screen
    navigation.navigate('VehicleRegistration', {
      onGoBack: () => navigation.goBack()
    });
  };

  const resetForm = () => {
    setFormData({
      marca: '',
      modelo: '',
      cilindraje: '',
      tipo_motor: '',
      year: '',
      patente: '',
      foto: null,
      kilometraje: ''
    });
    setMarcaSeleccionada(null);
    setChecklistItems([]);
    setSelectedChecklistItems([]);
    setFetchingChecklist(false);
    setErrors({});
    setCurrentStep(1);
  };

  // Checklist Logic
  useEffect(() => {
    const fetchChecklist = async () => {
      if (currentStep !== 2 || isEdit || !formData.tipo_motor) return;

      setFetchingChecklist(true);
      setChecklistItems([]);

      try {
        let motorName = null;
        if (typeof formData.tipo_motor === 'object' && formData.tipo_motor.nombre) {
          motorName = formData.tipo_motor.nombre;
        } else if (typeof formData.tipo_motor === 'string' || typeof formData.tipo_motor === 'number') {
          const tipoEncontrado = tiposMotor.find(t =>
            t.id.toString() === formData.tipo_motor.toString() ||
            t.nombre.toLowerCase() === formData.tipo_motor.toString().toLowerCase()
          );
          motorName = tipoEncontrado?.nombre;
        }

        if (!motorName) {
          setFetchingChecklist(false);
          return;
        }

        const items = await vehicleService.getInitialChecklist(motorName);
        setChecklistItems(Array.isArray(items) ? items : []);
        setSelectedChecklistItems([]);
      } catch (error) {
        console.error('Error cargando checklist:', error);
      } finally {
        setFetchingChecklist(false);
      }
    };

    fetchChecklist();
  }, [currentStep, formData.tipo_motor, isEdit]);

  const toggleChecklistItem = (itemId) => {
    setSelectedChecklistItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  const handleFotoSelect = async () => {
    Alert.alert(
      'Foto del Vehículo',
      '¿Cómo deseas agregar la foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Galería', onPress: () => openImagePicker('library') },
        { text: 'Cámara', onPress: () => openImagePicker('camera') },
      ]
    );
  };

  const openImagePicker = async (type) => {
    try {
      let result;
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara');
        result = await ImagePicker.launchCameraAsync(imagePickerOptions);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Permiso denegado', 'Se necesita acceso a la galería');
        result = await ImagePicker.launchImageLibraryAsync(imagePickerOptions);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFormData({
          ...formData,
          foto: {
            uri: result.assets[0].uri,
            type: 'image/jpeg',
            name: 'vehicle.jpg',
          }
        });
      }
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!marcaSeleccionada) newErrors.marca = 'Selecciona una marca';
    if (!formData.modelo) newErrors.modelo = 'Selecciona un modelo';
    if (!formData.year) newErrors.year = 'Ingresa el año';
    if (!formData.patente) newErrors.patente = 'Ingresa la patente';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep1 = () => {
    // Simplified validation for step 1
    return validateForm();
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
      else Alert.alert('Campos incompletos', 'Completa los campos requeridos.');
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 2) setCurrentStep(1);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const vehicleData = {
        marca: Number(marcaSeleccionada.id),
        modelo: typeof formData.modelo === 'object' ? Number(formData.modelo.id) : Number(formData.modelo),
        year: parseInt(formData.year, 10),
        kilometraje: parseInt(formData.kilometraje || '0', 10),
        patente: formData.patente.trim().toUpperCase(),
        cilindraje: formData.cilindraje || null,
        tipo_motor: tiposMotor.find(t => t.id.toString() === formData.tipo_motor)?.nombre || 'Gasolina',
      };

      if (!isEdit && selectedChecklistItems.length > 0) {
        vehicleData.componentes_al_dia = selectedChecklistItems;
      }

      // Obtener cliente ID - buscar en las diferentes estructuras posibles
      let clienteIdValue = clienteId;

      if (!clienteIdValue) {
        const userData = await AsyncStorage.getItem('user');

        if (userData) {
          const parsedUser = JSON.parse(userData);
          // Buscar cliente_id en las diferentes ubicaciones posibles
          if (parsedUser.cliente_id) clienteIdValue = parsedUser.cliente_id;
          else if (parsedUser.cliente_detail?.id) clienteIdValue = parsedUser.cliente_detail.id;
          else if (parsedUser.cliente?.id) clienteIdValue = parsedUser.cliente.id;
        }

        // Si no encontramos el cliente_id localmente, obtenerlo del backend
        if (!clienteIdValue) {
          try {
            // Usamos una llamada directa via userService para mejor manejo de errores
            const clienteData = await userService.getClienteDetails();
            if (clienteData?.id) {
              clienteIdValue = clienteData.id;
              // Actualizar el usuario local con el cliente_id para futuras peticiones
              if (userData) {
                const parsedUser = JSON.parse(userData);
                parsedUser.cliente_id = clienteIdValue;
                await AsyncStorage.setItem('user', JSON.stringify(parsedUser));
              }
            }
          } catch (error) {
            console.error('Error obteniendo cliente_id del servidor:', error);
          }
        }
      }

      if (!clienteIdValue) {
        Alert.alert('Error', 'No se pudo identificar tu cuenta de cliente. Por favor inicia sesión nuevamente.');
        setIsSubmitting(false);
        return;
      }

      vehicleData.cliente = clienteIdValue;

      let dataToSend = vehicleData;
      if (formData.foto) {
        const formDataObj = new FormData();
        Object.entries(vehicleData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            if (key === 'componentes_al_dia' && Array.isArray(value)) {
              value.forEach(id => formDataObj.append('componentes_al_dia', id));
            } else {
              formDataObj.append(key, value);
            }
          }
        });
        formDataObj.append('foto', {
          uri: formData.foto.uri,
          type: 'image/jpeg',
          name: `vehicle_${Date.now()}.jpg`,
        });
        dataToSend = formDataObj;
      }

      if (isEdit) await updateVehicleAsync({ id: editingVehicleId, data: dataToSend });
      else await createVehicleAsync(dataToSend);

      setModalVisible(false);
      Alert.alert('Éxito', isEdit ? 'Vehículo actualizado correctamente' : 'Vehículo registrado correctamente');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar el vehículo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVehiclePress = (vehicle) => {
    navigation.navigate(ROUTES.VEHICLE_PROFILE, { vehicleId: vehicle.id, vehicle });
  };

  // --- RENDER HELPERS ---
  const formatCurrency = (value) => `$${(Number(value) || 0).toLocaleString('es-CL')}`;

  const renderVehicleItem = ({ item }) => {
    // Mock Data for Visuals (replace with real data if available)
    const estimatedValue = item.precio_sugerido_final || item.precio_mercado_promedio || 0;

    return (
      <TouchableOpacity
        style={styles.cardContainer}
        activeOpacity={0.9}
        onPress={() => handleVehiclePress(item)}
      >
        {/* Cover Image */}
        <View style={styles.imageContainer}>
          <Image
            source={item.foto ? { uri: item.foto } : { uri: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?q=80&w=800&auto=format&fit=crop' }}
            style={styles.vehicleImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.imageOverlay}
          >
            <View>
              <Text style={styles.cardBrand}>{item.marca_nombre}</Text>
              <Text style={styles.cardModel}>{item.modelo_nombre}</Text>
            </View>
          </LinearGradient>

          <View style={styles.yearBadge}>
            <Text style={styles.yearText}>{item.year}</Text>
          </View>

          {/* Active Offers Indicator - Right Side */}
          {item.ofertas_activas_count > 0 && (
            <View style={styles.offersBadge}>
              <Ionicons name="pricetag" size={14} color="#FFFFFF" />
              <Text style={styles.offersBadgeText}>{item.ofertas_activas_count} {item.ofertas_activas_count === 1 ? 'oferta' : 'ofertas'}</Text>
            </View>
          )}

          {/* Active Service Indicator */}
          {item.active_requests_count > 0 && (
            <View style={styles.serviceBadge}>
              <Ionicons name="construct" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.serviceBadgeText}>En Servicio</Text>
            </View>
          )}
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Valor Estimado</Text>
            <Text style={styles.valueAmount}>{formatCurrency(estimatedValue)}</Text>
          </View>

          {/* Health Bar */}
          <View style={styles.healthContainer}>
            {item.health_score > 0 ? (
              <>
                <View style={styles.healthHeader}>
                  <Text style={styles.healthLabel}>Salud General</Text>
                  <Text style={[
                    styles.healthPercent,
                    { color: item.health_score >= 80 ? COLORS.success : '#EF4444' }
                  ]}>{item.health_score}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[
                    styles.progressBarFill,
                    {
                      width: `${item.health_score}%`,
                      backgroundColor: item.health_score >= 80 ? COLORS.success : '#EF4444'
                    }
                  ]} />
                </View>

                {item.health_score >= 80 ? (
                  <Text style={[styles.healthStatus, { color: COLORS.success }]}>
                    <Ionicons name="checkmark-circle" size={12} /> En Buen Estado
                  </Text>
                ) : (
                  <Text style={[styles.healthStatus, { color: '#EF4444' }]}>
                    <Ionicons name="warning" size={12} /> Requiere Atención ({item.pending_alerts_count || 0} {(item.pending_alerts_count === 1) ? 'alerta' : 'alertas'})
                  </Text>
                )}
              </>
            ) : (
              <View style={styles.healthHeader}>
                <Text style={styles.healthLabel}>Calculando Salud...</Text>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyVehiclesList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="car-sport-outline" size={64} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>Comienza tu Garage</Text>
      <Text style={styles.emptyDescription}>
        Registra tu primer vehículo para acceder a servicios, valoraciones y gestión de mantenimiento.
      </Text>
      <Button
        title="Agregar Vehículo"
        onPress={handleAddVehicle}
        style={styles.emptyButton}
        textStyle={styles.emptyButtonText}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Vehículos</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddVehicle}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={vehicles}
          renderItem={renderVehicleItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={EmptyVehiclesList}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}

      {/* Modal - Creation/Editing Form */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEdit ? 'Editar Vehículo' : 'Nuevo Vehículo'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollContainer>
              {currentStep === 1 && (
                <>
                  {/* Simplified Form Render for Brevity - Keeping logic intact */}
                  {/* Brand Selector */}
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Marca</Text>
                    <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowMarcasDropdown(!showMarcasDropdown)}>
                      <Text>{marcaSeleccionada?.nombre || 'Seleccionar Marca'}</Text>
                    </TouchableOpacity>
                    {showMarcasDropdown && (
                      <View style={styles.dropdownList}>
                        {marcas.map(m => (
                          <TouchableOpacity key={m.id} style={styles.dropdownItem} onPress={() => { setMarcaSeleccionada(m); setShowMarcasDropdown(false); }}>
                            <Text>{m.nombre}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Model Selector - Only show if brand selected */}
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Modelo</Text>
                    <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowModelosDropdown(!showModelosDropdown)}>
                      <Text>{formData.modelo ? modelos.find(m => m.id.toString() === formData.modelo)?.nombre : 'Seleccionar Modelo'}</Text>
                    </TouchableOpacity>
                    {showModelosDropdown && (
                      <View style={styles.dropdownList}>
                        {modelos.map(m => (
                          <TouchableOpacity key={m.id} style={styles.dropdownItem} onPress={() => { handleChange('modelo', m.id.toString()); setShowModelosDropdown(false); }}>
                            <Text>{m.nombre}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  <Input label="Año" value={formData.year} onChangeText={(t) => handleChange('year', t)} keyboardType="numeric" />
                  <Input label="Patente" value={formData.patente} onChangeText={(t) => handleChange('patente', t.toUpperCase())} />
                  <Input label="Kilometraje" value={formData.kilometraje} onChangeText={(t) => handleChange('kilometraje', t)} keyboardType="numeric" />

                  <TouchableOpacity style={styles.photoButton} onPress={handleFotoSelect}>
                    {formData.foto ? (
                      <Image source={{ uri: formData.foto.uri }} style={styles.photoPreview} />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Ionicons name="camera" size={32} color={COLORS.primary} />
                        <Text>Subir Foto</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {currentStep === 2 && (
                <View style={styles.checklistContainer}>
                  <Text style={styles.checklistTitle}>Checklist Inicial</Text>
                  {fetchingChecklist ? <ActivityIndicator /> : checklistItems.map(item => (
                    <TouchableOpacity key={item.id} style={styles.checklistItem} onPress={() => toggleChecklistItem(item.id)}>
                      <View style={[styles.checkbox, selectedChecklistItems.includes(item.id) && styles.checkboxActive]} />
                      <Text>{item.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollContainer>

            <View style={styles.modalFooter}>
              {currentStep === 1 ? (
                <Button title="Continuar" onPress={handleNextStep} style={styles.submitButton} />
              ) : (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button title="Atrás" onPress={handlePreviousStep} style={{ flex: 1, backgroundColor: '#999' }} />
                  <Button title="Guardar" onPress={handleSubmit} isLoading={isSubmitting} style={{ flex: 1 }} />
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60, // Safe area
    paddingBottom: 20,
    backgroundColor: '#F9FAFB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  // Card Styles
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  imageContainer: {
    height: 160,
    width: '100%',
    position: 'relative',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'flex-end',
    padding: 16,
  },
  cardBrand: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardModel: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  yearBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  serviceBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: COLORS.primary, // Using primary color (Blue/Orange depending on theme)
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  offersBadge: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: '#10B981', // Green for offers
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  offersBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  yearText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  cardBody: {
    padding: 20,
  },
  valueRow: {
    marginBottom: 20,
  },
  valueLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  valueAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB', // Blue
  },
  healthContainer: {
    marginTop: 0,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  healthLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  healthPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  healthStatus: {
    fontSize: 12,
    color: '#6B7280',
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#EFF6FF',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Form/Modal Styles (Simplified)
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    marginBottom: 8,
    fontWeight: '500',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
  },
  dropdownList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
    borderRadius: 8,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  photoButton: {
    height: 150,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  checklistContainer: {
    marginTop: 20,
  },
  checklistTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: 12,
    borderRadius: 4,
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
  },
  modalFooter: {
    marginTop: 20,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
});

export default MisVehiculosScreen;