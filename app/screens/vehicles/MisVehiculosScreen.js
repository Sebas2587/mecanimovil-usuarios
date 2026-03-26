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
import { Car, X, Camera, Tag, Wrench, CheckCircle, Info, AlertCircle, AlertTriangle, Plus, ChevronDown, ChevronLeft, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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

const GlassCard = ({ children, style }) => (
  <View style={[styles.glassCard, style]}>
    {Platform.OS === 'ios' && (
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
    )}
    {children}
  </View>
);

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
    navigation.navigate(ROUTES.CREAR_VEHICULO, {
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

  // Get health color based on score
  const getHealthColor = (score) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    if (score >= 40) return '#F97316';
    return '#EF4444';
  };

  const renderVehicleItem = ({ item }) => {
    const estimatedValue = item.precio_sugerido_final || item.precio_mercado_promedio || 0;

    return (
      <TouchableOpacity
        style={styles.cardContainer}
        activeOpacity={0.9}
        onPress={() => handleVehiclePress(item)}
      >
        {Platform.OS === 'ios' && (
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        )}

        {/* Cover Image */}
        <View style={styles.imageContainer}>
          <Image
            source={item.foto ? { uri: item.foto } : { uri: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?q=80&w=800&auto=format&fit=crop' }}
            style={styles.vehicleImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
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
              <Tag size={14} color="#FFFFFF" />
              <Text style={styles.offersBadgeText}>{item.ofertas_activas_count} {item.ofertas_activas_count === 1 ? 'oferta' : 'ofertas'}</Text>
            </View>
          )}

          {/* Active Service Indicator */}
          {item.active_requests_count > 0 && (
            <View style={styles.serviceBadge}>
              <Wrench size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
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
            {(item.health_score !== null && item.health_score !== undefined) ? (
              <>
                <View style={styles.healthHeader}>
                  <Text style={styles.healthLabel}>Salud General</Text>
                  <Text style={[
                    styles.healthPercent,
                    { color: getHealthColor(item.health_score) }
                  ]}>{Math.round(item.health_score)}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[
                    styles.progressBarFill,
                    {
                      width: `${item.health_score}%`,
                      backgroundColor: getHealthColor(item.health_score)
                    }
                  ]} />
                </View>

                {item.health_score >= 80 ? (
                  <View style={styles.healthStatusRow}>
                    <CheckCircle size={12} color={getHealthColor(item.health_score)} />
                    <Text style={[styles.healthStatus, { color: getHealthColor(item.health_score) }]}>
                      {' '}En Buen Estado
                    </Text>
                  </View>
                ) : item.health_score >= 60 ? (
                  <View style={styles.healthStatusRow}>
                    <Info size={12} color={getHealthColor(item.health_score)} />
                    <Text style={[styles.healthStatus, { color: getHealthColor(item.health_score) }]}>
                      {' '}Buen Estado
                    </Text>
                  </View>
                ) : item.health_score >= 40 ? (
                  <View style={styles.healthStatusRow}>
                    <AlertCircle size={12} color={getHealthColor(item.health_score)} />
                    <Text style={[styles.healthStatus, { color: getHealthColor(item.health_score) }]}>
                      {' '}Mantenimiento Recomendado ({item.pending_alerts_count || 0} {(item.pending_alerts_count === 1) ? 'alerta' : 'alertas'})
                    </Text>
                  </View>
                ) : (
                  <View style={styles.healthStatusRow}>
                    <AlertTriangle size={12} color={getHealthColor(item.health_score)} />
                    <Text style={[styles.healthStatus, { color: getHealthColor(item.health_score) }]}>
                      {' '}Requiere Atención ({item.pending_alerts_count || 0} {(item.pending_alerts_count === 1) ? 'alerta' : 'alertas'})
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.healthHeader}>
                <Text style={styles.healthLabel}>Calculando Salud...</Text>
                <ActivityIndicator size="small" color="#6EE7B7" />
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
        <Car size={64} color="#6EE7B7" />
      </View>
      <Text style={styles.emptyTitle}>Comienza tu Garage</Text>
      <Text style={styles.emptyDescription}>
        Registra tu primer vehículo para acceder a servicios, valoraciones y gestión de mantenimiento.
      </Text>
      <TouchableOpacity onPress={handleAddVehicle} activeOpacity={0.8}>
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.emptyButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Plus size={18} color="#FFF" />
          <Text style={styles.emptyButtonText}>Agregar Vehículo</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      {/* Background */}
      <LinearGradient
        colors={['#030712', '#0a1628', '#030712']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Blobs */}
      <View style={styles.blobEmerald} />
      <View style={styles.blobIndigo} />
      <View style={styles.blobCyan} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Vehículos</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddVehicle}>
          <Plus size={18} color="#6EE7B7" />
          <Text style={styles.addButtonText}>Agregar auto</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6EE7B7" />
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
          tintColor="#6EE7B7"
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
            {Platform.OS === 'ios' && (
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            )}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEdit ? 'Editar Vehículo' : 'Nuevo Vehículo'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>

            <ScrollContainer>
              {currentStep === 1 && (
                <>
                  {/* Brand Selector */}
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Marca</Text>
                    <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowMarcasDropdown(!showMarcasDropdown)}>
                      <Text style={styles.dropdownButtonText}>{marcaSeleccionada?.nombre || 'Seleccionar Marca'}</Text>
                      <ChevronDown size={18} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                    {showMarcasDropdown && (
                      <View style={styles.dropdownList}>
                        {marcas.map(m => (
                          <TouchableOpacity key={m.id} style={styles.dropdownItem} onPress={() => { setMarcaSeleccionada(m); setShowMarcasDropdown(false); }}>
                            <Text style={styles.dropdownItemText}>{m.nombre}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Model Selector - Only show if brand selected */}
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Modelo</Text>
                    <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowModelosDropdown(!showModelosDropdown)}>
                      <Text style={styles.dropdownButtonText}>{formData.modelo ? modelos.find(m => m.id.toString() === formData.modelo)?.nombre : 'Seleccionar Modelo'}</Text>
                      <ChevronDown size={18} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                    {showModelosDropdown && (
                      <View style={styles.dropdownList}>
                        {modelos.map(m => (
                          <TouchableOpacity key={m.id} style={styles.dropdownItem} onPress={() => { handleChange('modelo', m.id.toString()); setShowModelosDropdown(false); }}>
                            <Text style={styles.dropdownItemText}>{m.nombre}</Text>
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
                        <Camera size={32} color="#6EE7B7" />
                        <Text style={styles.photoPlaceholderText}>Subir Foto</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {currentStep === 2 && (
                <View style={styles.checklistContainer}>
                  <Text style={styles.checklistTitle}>Checklist Inicial</Text>
                  {fetchingChecklist ? <ActivityIndicator color="#6EE7B7" /> : checklistItems.map(item => (
                    <TouchableOpacity key={item.id} style={styles.checklistItem} onPress={() => toggleChecklistItem(item.id)}>
                      <View style={[styles.checkbox, selectedChecklistItems.includes(item.id) && styles.checkboxActive]}>
                        {selectedChecklistItems.includes(item.id) && <Check size={14} color="#FFF" />}
                      </View>
                      <Text style={styles.checklistItemText}>{item.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollContainer>

            <View style={styles.modalFooter}>
              {currentStep === 1 ? (
                <TouchableOpacity onPress={handleNextStep} activeOpacity={0.8}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.submitButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.submitButtonText}>Continuar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={handlePreviousStep} style={styles.backButton} activeOpacity={0.8}>
                    <ChevronLeft size={18} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.backButtonText}>Atrás</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSubmit} activeOpacity={0.8} style={{ flex: 1 }} disabled={isSubmitting}>
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      style={[styles.submitButton, isSubmitting && { opacity: 0.6 }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.submitButtonText}>Guardar</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
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
    backgroundColor: '#030712',
  },
  blobEmerald: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(16,185,129,0.08)',
  },
  blobIndigo: {
    position: 'absolute',
    top: 300,
    left: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(99,102,241,0.06)',
  },
  blobCyan: {
    position: 'absolute',
    bottom: 100,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(6,182,212,0.05)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  addButtonText: {
    color: '#6EE7B7',
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  // Card Styles
  cardContainer: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  glassCard: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    padding: 16,
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
    height: 90,
    justifyContent: 'flex-end',
    padding: 16,
  },
  cardBrand: {
    color: 'rgba(255,255,255,0.7)',
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  serviceBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(16,185,129,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: 'rgba(16,185,129,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  offersBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  yearText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardBody: {
    padding: 20,
  },
  valueRow: {
    marginBottom: 20,
  },
  valueLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  valueAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#93C5FD',
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
    color: 'rgba(255,255,255,0.5)',
  },
  healthPercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  healthStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthStatus: {
    fontSize: 12,
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
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyButtonText: {
    fontWeight: '600',
    color: '#FFFFFF',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(15,23,42,0.95)' : '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    padding: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
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
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    marginBottom: 8,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  dropdownList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.98)',
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dropdownItemText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  photoButton: {
    height: 150,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  photoPlaceholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  checklistContainer: {
    marginTop: 20,
  },
  checklistTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#FFFFFF',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  checklistItemText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    marginRight: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  modalFooter: {
    marginTop: 20,
  },
  submitButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 14,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MisVehiculosScreen;
