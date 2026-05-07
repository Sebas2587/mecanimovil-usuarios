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
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Car, X, Camera, Tag, Wrench, CheckCircle, Info, AlertCircle, AlertTriangle, Plus, ChevronDown, ChevronLeft, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { ROUTES } from '../../utils/constants';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Componentes
import Button from '../../components/base/Button/Button';
import Input from '../../components/base/Input/Input';
import ScrollContainer from '../../components/base/ScrollContainer';

// Servicios y Hooks
import {
  useVehicles,
  useVehiclesHealth,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
  useCarBrands,
  useCarModels,
} from '../../hooks/useVehicles';
import { useServicesHistory } from '../../hooks/useServices';
import * as userService from '../../services/user';
import * as vehicleService from '../../services/vehicle';
import { getHealthColorToken, resolveVehicleHealthPct } from '../../utils/healthFormat';
import HeroImageGradientScrim from '../../components/vehicles/HeroImageGradientScrim';

const tiposMotor = [
  { id: 1, nombre: 'Gasolina' },
  { id: 2, nombre: 'Diésel' },
];

const MisVehiculosScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const stackHeaderHeight = useHeaderHeight();
  const { user } = useAuth();

  /** Tab sin header de stack: respeta notch. Con stack (p. ej. Mis Vehículos desde menú): solo separación bajo CustomHeader. */
  const headerPaddingTop =
    stackHeaderHeight > 0 ? SPACING.md : insets.top + SPACING.sm;

  // Estados para la lista de vehículos (Refactored to Hooks)
  const { data: vehiclesData, isLoading: isLoadingVehicles, refetch: refetchVehicles } = useVehicles();
  const vehicles = vehiclesData || [];
  const vehiclesHealth = useVehiclesHealth(vehicles);
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

  const getHealthColor = (score) => getHealthColorToken(COLORS, score);

  const renderVehicleItem = ({ item }) => {
    const estimatedValue = item.precio_sugerido_final || item.precio_mercado_promedio || 0;
    const healthRow = vehiclesHealth.data?.find((h) => h.vehicleId === item.id);
    const healthSummary = healthRow?.health;
    const healthPct = resolveVehicleHealthPct(item, healthSummary);
    const stillLoadingHealth = healthRow?.isLoading === true;
    const hasHealthField =
      item.health_score != null ||
      item.salud_general_porcentaje != null ||
      healthSummary?.salud_general_porcentaje != null;
    const showCalculating =
      stillLoadingHealth &&
      item.health_score == null &&
      item.salud_general_porcentaje == null;

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
          <HeroImageGradientScrim intensity="card" />
          <View style={styles.imageOverlay}>
            <View>
              <Text style={styles.cardBrand}>{item.marca_nombre}</Text>
              <Text style={styles.cardModel}>{item.modelo_nombre}</Text>
            </View>
          </View>

          <View style={styles.yearBadge}>
            <Text style={styles.yearText}>{item.year}</Text>
          </View>

          {/* Active Offers Indicator - Right Side */}
          {item.ofertas_activas_count > 0 && (
            <View style={styles.offersBadge}>
              <Tag size={14} color={COLORS.text.inverse} />
              <Text style={styles.offersBadgeText}>{item.ofertas_activas_count} {item.ofertas_activas_count === 1 ? 'oferta' : 'ofertas'}</Text>
            </View>
          )}

          {/* Active Service Indicator */}
          {item.active_requests_count > 0 && (
            <View style={styles.serviceBadge}>
              <Wrench size={14} color={COLORS.text.inverse} style={{ marginRight: 4 }} />
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
            {!showCalculating && hasHealthField ? (
              <>
                <View style={styles.healthHeader}>
                  <Text style={styles.healthLabel}>Salud General</Text>
                  <Text style={[
                    styles.healthPercent,
                    { color: getHealthColor(healthPct) }
                  ]}>{Math.round(healthPct)}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, healthPct))}%`,
                      backgroundColor: getHealthColor(healthPct)
                    }
                  ]} />
                </View>

                {healthPct >= 70 ? (
                  <View style={styles.healthStatusRow}>
                    <CheckCircle size={12} color={getHealthColor(healthPct)} />
                    <Text style={[styles.healthStatus, { color: getHealthColor(healthPct) }]}>
                      {' '}En Buen Estado
                    </Text>
                  </View>
                ) : healthPct >= 60 ? (
                  <View style={styles.healthStatusRow}>
                    <Info size={12} color={getHealthColor(healthPct)} />
                    <Text style={[styles.healthStatus, { color: getHealthColor(healthPct) }]}>
                      {' '}Buen Estado
                    </Text>
                  </View>
                ) : healthPct >= 40 ? (
                  <View style={styles.healthStatusRow}>
                    <AlertCircle size={12} color={getHealthColor(healthPct)} />
                    <Text style={[styles.healthStatus, { color: getHealthColor(healthPct) }]}>
                      {' '}Mantenimiento Recomendado ({item.pending_alerts_count || 0} {(item.pending_alerts_count === 1) ? 'alerta' : 'alertas'})
                    </Text>
                  </View>
                ) : (
                  <View style={styles.healthStatusRow}>
                    <AlertTriangle size={12} color={getHealthColor(healthPct)} />
                    <Text style={[styles.healthStatus, { color: getHealthColor(healthPct) }]}>
                      {' '}Requiere Atención ({item.pending_alerts_count || 0} {(item.pending_alerts_count === 1) ? 'alerta' : 'alertas'})
                    </Text>
                  </View>
                )}
              </>
            ) : showCalculating ? (
              <View style={styles.healthHeader}>
                <Text style={styles.healthLabel}>Calculando salud…</Text>
                <ActivityIndicator size="small" color={COLORS.primary[500]} />
              </View>
            ) : (
              <View style={styles.healthHeader}>
                <Text style={styles.healthLabel}>Sin datos de salud</Text>
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
        <Car size={64} color={COLORS.primary[500]} />
      </View>
      <Text style={styles.emptyTitle}>Comienza tu Garage</Text>
      <Text style={styles.emptyDescription}>
        Registra tu primer vehículo para acceder a servicios, valoraciones y gestión de mantenimiento.
      </Text>
      <Button title="Agregar Vehículo" onPress={handleAddVehicle} icon="add" />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />


      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <Text style={styles.headerTitle}>Mis Vehículos</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddVehicle}>
          <Plus size={18} color={COLORS.primary[500]} />
          <Text style={styles.addButtonText}>Agregar auto</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
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
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={22} color={COLORS.text.secondary} />
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
                      <ChevronDown size={18} color={COLORS.text.tertiary} />
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
                      <ChevronDown size={18} color={COLORS.text.tertiary} />
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
                        <Camera size={32} color={COLORS.primary[500]} />
                        <Text style={styles.photoPlaceholderText}>Subir Foto</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {currentStep === 2 && (
                <View style={styles.checklistContainer}>
                  <Text style={styles.checklistTitle}>Checklist Inicial</Text>
                  {fetchingChecklist ? <ActivityIndicator color={COLORS.primary[500]} /> : checklistItems.map(item => (
                    <TouchableOpacity key={item.id} style={styles.checklistItem} onPress={() => toggleChecklistItem(item.id)}>
                      <View style={[styles.checkbox, selectedChecklistItems.includes(item.id) && styles.checkboxActive]}>
                        {selectedChecklistItems.includes(item.id) && <Check size={14} color={COLORS.text.inverse} />}
                      </View>
                      <Text style={styles.checklistItemText}>{item.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollContainer>

            <View style={styles.modalFooter}>
              {currentStep === 1 ? (
                <Button title="Continuar" onPress={handleNextStep} />
              ) : (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={handlePreviousStep} style={styles.backButton} activeOpacity={0.8}>
                    <ChevronLeft size={18} color={COLORS.text.secondary} />
                    <Text style={styles.backButtonText}>Atrás</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Button title="Guardar" onPress={handleSubmit} isLoading={isSubmitting} />
                  </View>
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
    backgroundColor: COLORS.background.default,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.container.horizontal,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDERS.radius.badge.md,
    backgroundColor: COLORS.primary[50],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[100],
  },
  addButtonText: {
    color: COLORS.primary[600],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  listContent: {
    padding: SPACING.container.horizontal,
    paddingTop: 0,
  },
  // Card Styles
  cardContainer: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card.lg,
    marginBottom: 24,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    ...SHADOWS.sm,
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
    zIndex: 1,
    minHeight: 72,
    justifyContent: 'flex-end',
    padding: SPACING.md,
    paddingTop: SPACING.lg,
  },
  cardBrand: {
    color: withOpacity(COLORS.text.inverse, 0.82),
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    marginBottom: 2,
  },
  cardModel: {
    color: COLORS.text.inverse,
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  yearBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: withOpacity(COLORS.base.inkBlack, 0.45),
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    borderRadius: BORDERS.radius.badge.md,
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(COLORS.base.inkBlack, 0.15),
  },
  serviceBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: COLORS.success[600],
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    borderRadius: BORDERS.radius.badge.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.inverse,
  },
  offersBadge: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    borderRadius: BORDERS.radius.badge.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  offersBadgeText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.inverse,
  },
  yearText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.inverse,
  },
  cardBody: {
    padding: SPACING.lg,
  },
  valueRow: {
    marginBottom: 20,
  },
  valueLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    marginBottom: 4,
  },
  valueAmount: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
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
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
  },
  healthPercent: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.neutral.gray[200],
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
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: SPACING.container.horizontal,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    backgroundColor: COLORS.primary[50],
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[100],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
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
    backgroundColor: COLORS.background.overlay,
  },
  modalContent: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: BORDERS.radius.modal.lg,
    borderTopRightRadius: BORDERS.radius.modal.lg,
    height: '90%',
    padding: SPACING.lg,
    borderWidth: BORDERS.width.thin,
    borderBottomWidth: 0,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    ...SHADOWS.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.neutral.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    marginBottom: 8,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  dropdownButton: {
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    borderRadius: BORDERS.radius.input.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background.paper,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  dropdownList: {
    maxHeight: 200,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    marginTop: 4,
    borderRadius: BORDERS.radius.input.md,
    backgroundColor: COLORS.background.paper,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  dropdownItem: {
    padding: SPACING.md,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.neutral.gray[200],
  },
  dropdownItemText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  photoButton: {
    height: 150,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    borderStyle: 'dashed',
    borderRadius: BORDERS.radius.input.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.gray[100],
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
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  checklistContainer: {
    marginTop: 20,
  },
  checklistTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: 16,
    color: COLORS.text.primary,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.neutral.gray[200],
  },
  checklistItemText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: BORDERS.width.medium,
    borderColor: COLORS.border.light,
    marginRight: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },
  modalFooter: {
    marginTop: 20,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: BORDERS.radius.button.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  backButtonText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});

export default MisVehiculosScreen;
