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
  TextInput,
  ActivityIndicator,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, ROUTES, LAYOUT } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Componentes
import Card from '../../components/base/Card/Card';
import Button from '../../components/base/Button/Button';
import Input from '../../components/base/Input/Input';
import Header from '../../components/navigation/Header/Header';

// Servicios
// Servicios y Hooks
// import * as vehicleService from '../../services/vehicle'; // Reemplazado por hooks
// import * as userService from '../../services/user'; // Reemplazado parcialmente
import { useVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle, useCarBrands, useCarModels } from '../../hooks/useVehicles';
import { useServicesHistory } from '../../hooks/useServices';
import * as userService from '../../services/user'; // needed for getClienteDetails
import * as vehicleService from '../../services/vehicle'; // needed for getInitialChecklist (not yet in hooks, but should be?)
import ScrollContainer from '../../components/base/ScrollContainer';

const tiposMotor = [
  { id: 1, nombre: 'Gasolina' },
  { id: 2, nombre: 'Diésel' },
];

const MisVehiculosScreen = () => {
  const navigation = useNavigation();
  const { token, user } = useAuth();

  // Estados para la lista de vehículos
  // Estados para la lista de vehículos (Refactored to Hooks)
  const { data: vehiclesData, isLoading: isLoadingVehicles, refetch: refetchVehicles, isRefetching: isRefetchingVehicles } = useVehicles();
  const vehicles = vehiclesData || [];
  const loading = isLoadingVehicles && vehicles.length === 0;

  const [refreshing, setRefreshing] = useState(false); // Keep for UI refreshing state if needed, or map to isRefetching

  // Mutations
  const { mutateAsync: createVehicleAsync } = useCreateVehicle();
  const { mutateAsync: updateVehicleAsync } = useUpdateVehicle();
  const { mutateAsync: deleteVehicleAsync } = useDeleteVehicle();

  // Estado para el modal de creación
  const [modalVisible, setModalVisible] = useState(false);
  // Estados para edición y menú de opciones
  const [isEdit, setIsEdit] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [optionsVehicle, setOptionsVehicle] = useState(null);

  // Estados para el formulario
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
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState([]);

  // Estados para el checklist de inicialización
  const [checklistItems, setChecklistItems] = useState([]);
  const [selectedChecklistItems, setSelectedChecklistItems] = useState([]);
  const [fetchingChecklist, setFetchingChecklist] = useState(false);

  // Estados para el flujo de onboarding por pasos
  const [currentStep, setCurrentStep] = useState(1); // 1 = Datos básicos, 2 = Checklist
  const totalSteps = 2;

  // Opciones para el selector de imágenes
  const imagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.7,
  };

  // History Logic Refactored
  const { data: rawServicesHistory, isLoading: isLoadingHistory, refetch: refetchHistory } = useServicesHistory(user?.id);
  const loadingHistories = isLoadingHistory;
  const historyError = null; // Error handling managed by hook

  const vehicleHistories = React.useMemo(() => {
    if (!rawServicesHistory) return {};
    const raw = Array.isArray(rawServicesHistory) ? rawServicesHistory : [];
    return raw.reduce((acc, solicitud) => {
      const vId = solicitud.vehiculo_detail?.id || solicitud.vehiculo;
      if (vId) {
        if (!acc[vId]) acc[vId] = { vehiculo: solicitud.vehiculo_detail, solicitudes: [] };
        acc[vId].solicitudes.push(solicitud);
      }
      return acc;
    }, {});
  }, [rawServicesHistory]);

  const loadVehicleHistories = async () => {
    await refetchHistory();
    return vehicleHistories;
  };

  useEffect(() => {
    // fetchVehicles(); // Managed by useVehicles
    // fetchMarcas(); // Managed by useCarBrands
    fetchClienteDetails();
    // loadVehicleHistories(); // Managed by useServicesHistory
  }, []);

  const route = useRoute();

  // Auto-refresh al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      // Refrescar vehículos y su historial cada vez que la pantalla gana foco
      refetchVehicles();
      loadVehicleHistories();

      // Manejar parámetros de refresco específicos si existen
      if (route.params?.refresh) {
        navigation.setParams({ refresh: undefined });
      }
    }, [route.params?.refresh, refetchVehicles])
  );

  useEffect(() => {
    if (route.params?.action === 'edit' && route.params?.vehicleId) {
      const vehicleToEdit = vehicles.find(v => v.id === route.params.vehicleId);
      if (vehicleToEdit) {
        openEditVehicle(vehicleToEdit);
        // Limpiar params
        navigation.setParams({ action: undefined, vehicleId: undefined });
      }
    }
  }, [route.params, vehicles]);

  // Effect for fetching models removed (managed by useCarModels hook)

  // Fetch functions removed (replaced by hooks)

  const fetchClienteDetails = async () => {
    try {
      const data = await userService.getClienteDetails();
      if (data && data.id) {
        setClienteId(data.id);
      }
    } catch (error) {
      console.error('Error al obtener detalles del cliente:', error);
      Alert.alert(
        'Error',
        'No se pudo obtener tu información de cliente. Algunas funciones podrían no estar disponibles.'
      );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchVehicles(),
        refetchHistory()
      ]);
    } catch (error) {
      console.error('Error al refrescar vehículos:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddVehicle = () => {
    alert('🔴 FUNCIÓN handleAddVehicle EJECUTADA - Si ves esto, el código se está ejecutando');
    console.log('➕➕➕ ABRIENDO MODAL PARA AGREGAR VEHÍCULO ➕➕➕');
    console.log('➕ Estado ANTES de reset:', {
      currentStep,
      isEdit,
      modalVisible,
      editingVehicleId
    });

    // Resetear TODO en orden específico
    setIsEdit(false);
    setEditingVehicleId(null);
    setCurrentStep(1);
    resetForm();

    // Mostrar modal inmediatamente
    setModalVisible(true);
    console.log('➕ Modal VISIBLE = true');
    console.log('➕ Estado DESPUÉS de reset:', {
      isEdit: false,
      currentStep: 1,
      modalVisible: true
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
    setCurrentStep(1); // Resetear al paso 1
  };

  // Efecto para cargar el checklist cuando se avanza al paso 2
  useEffect(() => {
    const fetchChecklist = async () => {
      // Solo cargar si estamos en el paso 2, no es edición y tenemos un tipo de motor seleccionado
      if (currentStep !== 2 || isEdit || !formData.tipo_motor) {
        return;
      }

      console.log('🔄 Checklist: Cargando para paso 2, tipo_motor:', formData.tipo_motor);
      setFetchingChecklist(true);
      setChecklistItems([]);

      try {
        // Obtener el nombre del motor desde el ID
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
          console.warn('⚠️ Checklist: No se encontró nombre del motor');
          setChecklistItems([]);
          setFetchingChecklist(false);
          return;
        }

        console.log('📡 Checklist: Llamando API con motor:', motorName);
        const items = await vehicleService.getInitialChecklist(motorName);
        console.log('✅ Checklist: Items recibidos:', items?.length || 0);

        const itemsArray = Array.isArray(items) ? items : [];
        setChecklistItems(itemsArray);
        setSelectedChecklistItems([]);
      } catch (error) {
        console.error('❌ Error cargando checklist:', error);
        setChecklistItems([]);
      } finally {
        setFetchingChecklist(false);
      }
    };

    fetchChecklist();
  }, [currentStep, formData.tipo_motor, isEdit]);

  const toggleChecklistItem = (itemId) => {
    setSelectedChecklistItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleChange = (field, value) => {
    console.log(`📝 handleChange: ${field} =`, value, '(tipo:', typeof value, ')');
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      console.log(`📝 Nuevo formData.${field}:`, newData[field]);
      return newData;
    });

    // Limpiar el error del campo si existe
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: null
      });
    }
  };

  const handleFotoSelect = async () => {
    try {
      Alert.alert(
        'Foto del Vehículo',
        '¿Cómo deseas agregar la foto?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Galería',
            onPress: () => openImagePicker('library'),
          },
          {
            text: 'Cámara',
            onPress: () => openImagePicker('camera'),
          },
        ]
      );
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen. Inténtalo de nuevo.');
    }
  };

  const openImagePicker = async (type) => {
    try {
      let result;

      // Solicitar permisos primero
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara para esta función');
          return;
        }
        result = await ImagePicker.launchCameraAsync(imagePickerOptions);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para esta función');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(imagePickerOptions);
      }

      if (result.canceled) {
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setFormData({
          ...formData,
          foto: {
            uri: selectedImage.uri,
            type: 'image/jpeg',
            name: 'vehicle.jpg',
          }
        });
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen. Inténtalo de nuevo.');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!marcaSeleccionada) {
      newErrors.marca = 'Selecciona una marca';
    }

    if (!formData.modelo) {
      newErrors.modelo = 'Selecciona un modelo';
    }

    if (!formData.cilindraje) {
      newErrors.cilindraje = 'Ingresa el cilindraje';
    }

    if (!formData.tipo_motor) {
      newErrors.tipo_motor = 'Selecciona el tipo de motor';
    }

    if (!formData.year) {
      newErrors.year = 'Ingresa el año';
    } else {
      const year = parseInt(formData.year);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > currentYear + 1) {
        newErrors.year = `El año debe estar entre 1900 y ${currentYear + 1}`;
      }
    }

    if (!formData.patente) {
      newErrors.patente = 'Ingresa la patente';
    } else if (!validatePatente(formData.patente)) {
      newErrors.patente = 'Formato de patente inválido';
    }

    if (!formData.kilometraje) {
      newErrors.kilometraje = 'Ingresa el kilometraje';
    } else if (isNaN(formData.kilometraje) || Number(formData.kilometraje) < 0) {
      newErrors.kilometraje = 'Kilometraje inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validar solo los campos del paso 1 (datos básicos)
  const validateStep1 = () => {
    const newErrors = {};

    if (!marcaSeleccionada) {
      newErrors.marca = 'Selecciona una marca';
    }

    if (!formData.modelo) {
      newErrors.modelo = 'Selecciona un modelo';
    }

    if (!formData.cilindraje) {
      newErrors.cilindraje = 'Ingresa el cilindraje';
    }

    if (!formData.tipo_motor) {
      newErrors.tipo_motor = 'Selecciona el tipo de motor';
    }

    if (!formData.year) {
      newErrors.year = 'Ingresa el año';
    } else {
      const year = parseInt(formData.year);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > currentYear + 1) {
        newErrors.year = `El año debe estar entre 1900 y ${currentYear + 1}`;
      }
    }

    if (!formData.patente) {
      newErrors.patente = 'Ingresa la patente';
    } else if (!validatePatente(formData.patente)) {
      newErrors.patente = 'Formato de patente inválido';
    }

    if (!formData.kilometraje) {
      newErrors.kilometraje = 'Ingresa el kilometraje';
    } else if (isNaN(formData.kilometraje) || Number(formData.kilometraje) < 0) {
      newErrors.kilometraje = 'Kilometraje inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Avanzar al siguiente paso
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      } else {
        Alert.alert('Campos incompletos', 'Por favor completa todos los campos requeridos antes de continuar.');
      }
    }
  };

  // Volver al paso anterior
  const handlePreviousStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const validatePatente = (patente) => {
    // Esta validación es básica, deberías adaptarla al formato específico de tu país
    return patente.length >= 4 && patente.length <= 8;
  };

  const findTipoMotorIdByName = (name) => {
    if (!name) return '';
    const match = tiposMotor.find(t => String(t.nombre).toLowerCase() === String(name).toLowerCase());
    return match ? String(match.id) : '';
  };

  const openOptions = (vehicle) => {
    setOptionsVehicle(vehicle);
    setOptionsVisible(true);
  };

  const closeOptions = () => {
    setOptionsVisible(false);
    setOptionsVehicle(null);
  };

  const openEditVehicle = async (vehicle) => {
    closeOptions();
    setIsEdit(true);
    setEditingVehicleId(vehicle.id);
    const marcaObj = { id: vehicle.marca, nombre: vehicle.marca_nombre };
    setMarcaSeleccionada(marcaObj);
    // fetchModelos call removed (handled by hook)
    setFormData({
      marca: String(marcaObj.id),
      modelo: String(vehicle.modelo || ''),
      cilindraje: vehicle.cilindraje || '',
      tipo_motor: findTipoMotorIdByName(vehicle.tipo_motor) || '',
      year: vehicle.year ? String(vehicle.year) : '',
      patente: vehicle.patente || '',
      foto: null,
      kilometraje: vehicle.kilometraje ? String(vehicle.kilometraje) : ''
    });
    setErrors({});
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    // Validar el formulario
    if (!validateForm()) {
      return;
    }

    // Evitar doble envío
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Preparar datos base
      const vehicleData = {
        marca: Number(marcaSeleccionada.id),
        modelo: typeof formData.modelo === 'object' ? Number(formData.modelo.id) : Number(formData.modelo),
        year: parseInt(formData.year, 10),
        kilometraje: parseInt(formData.kilometraje || '0', 10),
        patente: formData.patente.trim().toUpperCase(),
        cilindraje: formData.cilindraje ? formData.cilindraje.trim() : null,
        tipo_motor: typeof formData.tipo_motor === 'object'
          ? formData.tipo_motor.nombre
          : tiposMotor.find(t => t.id.toString() === formData.tipo_motor)?.nombre || 'Gasolina',
      };

      if (!isEdit && selectedChecklistItems.length > 0) {
        vehicleData.componentes_al_dia = selectedChecklistItems;
      }

      if (clienteId) {
        vehicleData.cliente = clienteId;
      } else {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          vehicleData.cliente = parsedUser.cliente_id || parsedUser.id;
        }
      }

      let dataToSend = vehicleData;

      // Si hay foto, usar FormData
      if (formData.foto) {
        const formDataObj = new FormData();
        Object.entries(vehicleData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            if (key === 'cliente' && typeof value === 'number') {
              formDataObj.append(key, value.toString());
            } else if (key === 'componentes_al_dia' && Array.isArray(value)) {
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

      if (isEdit) {
        await updateVehicleAsync({ id: editingVehicleId, data: dataToSend });
      } else {
        await createVehicleAsync(dataToSend);
      }

      // Cerrar modal y limpiar
      setModalVisible(false);
      setIsEdit(false);
      setEditingVehicleId(null);
      Alert.alert('Éxito', 'Vehículo registrado correctamente');

      // Auto-refetch happens via query invalidation handled in hooks

    } catch (error) {
      console.error('Error al crear/actualizar vehículo:', error);

      if (error.response && error.response.data) {
        const serverErrors = {};
        Object.entries(error.response.data).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            serverErrors[key] = value.join(', ');
          } else if (typeof value === 'string') {
            serverErrors[key] = value;
          } else if (typeof value === 'object') {
            serverErrors[key] = JSON.stringify(value);
          }
        });

        if (Object.keys(serverErrors).length > 0) {
          setErrors({ ...errors, ...serverErrors });
          Alert.alert('Error de validación', 'Revisa los campos marcados en rojo');
        } else {
          Alert.alert('Error', 'Ha ocurrido un error al registrar el vehículo.');
        }
      } else {
        Alert.alert('Error', error.message || 'Ha ocurrido un error inesperado.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Agregar función para manejar la eliminación de vehículos
  const handleDeleteVehicle = (vehicle) => {
    Alert.alert(
      '⚠️ Eliminar Vehículo',
      `¿Estás seguro que deseas eliminar permanentemente el vehículo ${vehicle.marca_nombre} ${vehicle.modelo_nombre}?\n\n❗ ESTA ACCIÓN NO SE PUEDE DESHACER.\n\nSe borrará todo el historial de servicios, diagnósticos y datos asociados de este vehículo.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Sí, Eliminar Todo',
          style: 'destructive',
          onPress: async () => {
            try {
              // El hook useDeleteVehicle ya tiene setLoading internamente si se usa isPending
              await deleteVehicleAsync(vehicle.id);

              // Forzar actualización explícita de ambas listas
              await Promise.all([
                refetchVehicles(),
                // refetchHistory() // Opcional, pero bueno para limpiar historial huérfano
              ]);

              Alert.alert('Éxito', 'Vehículo y todos sus datos han sido eliminados.');
            } catch (error) {
              // Si el error es 404, significa que ya se eliminó, así que actualizamos la UI y "fingimos" éxito
              if (error?.message?.includes('404') || error?.response?.status === 404) {
                await refetchVehicles();
                Alert.alert('Aviso', 'El vehículo ya no existe.');
                return;
              }

              // MANEJO DE BLOQUEO DE SEGURIDAD (400 Bad Request)
              // Si el backend rechaza la eliminación por servicios activos
              if (error?.response?.status === 400 && error?.response?.data?.error) {
                Alert.alert('🚫 Acción Bloqueada', error.response.data.error);
                return;
              }

              console.error('Error eliminando vehículo:', error);
              Alert.alert('Error', 'No se pudo eliminar el vehículo. Inténtalo de nuevo más tarde.');
            }
          }
        }
      ]
    );
  };

  const renderDropdownItem = (item, onSelect) => (
    <TouchableOpacity
      key={`dropdown-item-${item.id}`}
      style={styles.dropdownItem}
      onPress={() => onSelect(item)}
    >
      <Text style={styles.dropdownItemText}>{item.nombre}</Text>
    </TouchableOpacity>
  );

  const formatDateShort = (dateString) => {
    if (!dateString) return 'Sin registros';
    try {
      return new Date(dateString).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatDateLong = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      return new Date(dateString).toLocaleDateString('es-CL', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatCurrency = (value) => {
    const amount = Number(value) || 0;
    return `$${amount.toLocaleString('es-CL')}`;
  };

  const getEstadoInfo = (estado) => {
    const map = {
      completado: { label: 'Completado', color: '#4CAF50', icon: 'checkmark-circle' },
      confirmado: { label: 'Confirmado', color: COLORS.primary, icon: 'checkmark-circle-outline' },
      en_proceso: { label: 'En proceso', color: '#28A745', icon: 'construct-outline' },
      pendiente: { label: 'Pendiente', color: COLORS.warning, icon: 'time-outline' },
      cancelado: { label: 'Cancelado', color: COLORS.danger, icon: 'close-circle' },
      devolucion_procesada: { label: 'Devuelto', color: '#A0522D', icon: 'refresh' },
    };
    return map[estado] || { label: estado, color: COLORS.textLight, icon: 'ellipse-outline' };
  };

  const handleVehiclePress = useCallback((vehicle) => {
    navigation.navigate(ROUTES.VEHICLE_PROFILE, {
      vehicleId: vehicle.id,
      vehicle,
    });
  }, [navigation]);

  const closeHistoryModal = useCallback(() => { }, []);

  const renderHistoryItem = () => null;

  const renderVehicleItem = ({ item }) => {
    const historyData = vehicleHistories[item.id];
    const solicitudes = historyData?.solicitudes || [];
    const completados = solicitudes.filter(s => s.estado === 'completado');
    const totalServicios = solicitudes.length;
    const totalGastado = completados.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
    const ultimoCompletado = completados
      .slice()
      .sort((a, b) => new Date(b.fecha_servicio || b.fecha_hora_solicitud) - new Date(a.fecha_servicio || a.fecha_hora_solicitud))[0];
    const ultimoServicioFecha = ultimoCompletado?.fecha_servicio || ultimoCompletado?.fecha_hora_solicitud;
    const ultimoServicioNombre = ultimoCompletado?.lineas?.[0]?.servicio_nombre || ultimoCompletado?.lineas?.[0]?.nombre;
    const isHistoryLoading = loadingHistories && !historyData;

    return (
      <Card style={styles.vehicleCard}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.vehicleCardTouchable}
          onPress={() => handleVehiclePress(item)}
        >
          <View style={styles.vehicleHeader}>
            <View style={styles.vehicleBadge}>
              <Ionicons name="car-sport-outline" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.vehicleTitleContainer}>
              <Text style={styles.vehicleTitle}>{`${item.marca_nombre} ${item.modelo_nombre}`}</Text>
              <Text style={styles.vehicleSubtitle}>{`${item.year} • ${item.patente}`}</Text>
            </View>
            <TouchableOpacity style={styles.menuButton} onPress={() => openOptions(item)}>
              <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          <View style={styles.vehicleInfoRow}>
            <View style={styles.vehicleInfoItem}>
              <Ionicons name="speedometer-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.vehicleInfoText}>{item.kilometraje ? `${item.kilometraje} km` : 'Kilometraje n/d'}</Text>
            </View>
            <View style={styles.vehicleInfoItem}>
              <Ionicons name="flash-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.vehicleInfoText}>{item.tipo_motor || 'Motor n/d'}</Text>
            </View>
            {item.cilindraje ? (
              <View style={styles.vehicleInfoItem}>
                <Ionicons name="settings-outline" size={16} color={COLORS.textLight} />
                <Text style={styles.vehicleInfoText}>{item.cilindraje}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.vehicleStatsRow}>
            <View style={styles.vehicleStatChip}>
              <Ionicons name="construct-outline" size={16} color={COLORS.primary} />
              <Text style={styles.vehicleStatValue}>{totalServicios}</Text>
              <Text style={styles.vehicleStatLabel}>Servicios totales</Text>
            </View>
            <View style={styles.vehicleStatChip}>
              <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
              <Text style={[styles.vehicleStatValue, { color: COLORS.success }]}>{completados.length}</Text>
              <Text style={styles.vehicleStatLabel}>Completados</Text>
            </View>
            <View style={styles.vehicleStatChip}>
              <Ionicons name="cash-outline" size={16} color={COLORS.secondary} />
              <Text style={[styles.vehicleStatValue, { color: COLORS.secondary }]}>{formatCurrency(totalGastado)}</Text>
              <Text style={styles.vehicleStatLabel}>Total gastado</Text>
            </View>
          </View>

          {isHistoryLoading ? (
            <View style={styles.vehicleHistoryLoading}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.vehicleHistoryLoadingText}>Consultando historial...</Text>
            </View>
          ) : ultimoCompletado ? (
            <View style={styles.vehicleLastService}>
              <View style={styles.vehicleLastServiceHeader}>
                <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
                <Text style={styles.vehicleLastServiceLabel}>Último servicio</Text>
              </View>
              <Text style={styles.vehicleLastServiceDate}>{formatDateShort(ultimoServicioFecha)}</Text>
              {ultimoServicioNombre && (
                <Text style={styles.vehicleLastServiceName}>{ultimoServicioNombre}</Text>
              )}
            </View>
          ) : (
            <View style={styles.vehicleEmptyHistory}>
              <Ionicons name="sparkles-outline" size={18} color={COLORS.primary} />
              <Text style={styles.vehicleEmptyHistoryText}>Aún no registra servicios</Text>
            </View>
          )}

          <View style={styles.vehicleFooter}>
            <View style={styles.vehicleFooterLeft}>
              <Ionicons name="reader-outline" size={16} color={COLORS.primary} />
              <Text style={styles.vehicleFooterText}>
                {totalServicios > 0 ? 'Ver historial de servicios' : 'Agenda tu primer servicio'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  const EmptyVehiclesList = () => (
    <View style={styles.guideContainer}>
      <Text style={styles.guideTitle}>¡Bienvenido a MecaniMóvil!</Text>
      <Text style={styles.guideSubtitle}>Sigue estos 3 pasos para empezar:</Text>

      <View style={styles.stepCard}>
        <View style={styles.stepIconContainer}>
          <Text style={styles.stepNumber}>1</Text>
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Registra tu Vehículo</Text>
          <Text style={styles.stepDescription}>
            Agrega la marca, modelo y detalles de tu auto para personalizar tu experiencia.
          </Text>
        </View>
      </View>

      <View style={styles.stepLine} />

      <View style={[styles.stepCard, { opacity: 0.7 }]}>
        <View style={[styles.stepIconContainer, { backgroundColor: COLORS.textLight }]}>
          <Text style={styles.stepNumber}>2</Text>
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Valida tus Datos</Text>
          <Text style={styles.stepDescription}>
            Confirmamos la información para ofrecerte repuestos y servicios compatibles.
          </Text>
        </View>
      </View>

      <View style={styles.stepLine} />

      <View style={[styles.stepCard, { opacity: 0.7 }]}>
        <View style={[styles.stepIconContainer, { backgroundColor: COLORS.textLight }]}>
          <Text style={styles.stepNumber}>3</Text>
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Accede a Servicios</Text>
          <Text style={styles.stepDescription}>
            Descubre mecánicos y talleres especializados en tu marca cerca de ti.
          </Text>
        </View>
      </View>

      <Button
        title="Comenzar Registro"
        onPress={handleAddVehicle}
        style={[styles.emptyButton, styles.primaryButton, { marginTop: 24 }]}
        textStyle={{ fontSize: 16, fontWeight: 'bold' }}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando vehículos...</Text>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          renderItem={renderVehicleItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.vehiclesList}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={EmptyVehiclesList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Botón flotante para agregar vehículo */}
      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={handleAddVehicle}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      {/* Modal historial de servicios por vehículo */}
      {/* Eliminado: se reemplaza por navegación directa a VehicleHistoryScreen */}

      {/* Modal para agregar un nuevo vehículo */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          console.log('❌ Modal onRequestClose llamado');
          setModalVisible(false);
          setCurrentStep(1);
        }}
      >
        {console.log('🔴 MODAL COMPONENTE RENDERIZANDO - visible:', modalVisible)}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            {/* BANNER DE DEBUG MUY VISIBLE */}
            <View style={{
              backgroundColor: '#FF0000',
              padding: 10,
              alignItems: 'center',
              borderBottomWidth: 3,
              borderBottomColor: '#000000'
            }}>
              <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                🔴 DEBUG ACTIVO - Paso {currentStep} - isEdit: {String(isEdit)}
              </Text>
            </View>

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {isEdit ? 'Editar Vehículo' : currentStep === 1 ? 'Datos del Vehículo' : 'Estado de Mantenimiento'}
                </Text>
                {!isEdit && (
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${(currentStep / totalSteps) * 100}%`,
                            minWidth: currentStep > 0 ? 10 : 0
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      Paso {currentStep} de {totalSteps}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  console.log('❌ Cerrando modal');
                  setModalVisible(false);
                  setCurrentStep(1);
                }}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollContainer
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {/* Paso 1: Datos Básicos del Vehículo */}
              {(() => {
                const shouldShowStep1 = currentStep === 1 && !isEdit;
                console.log('🎨 Renderizando paso 1:', { shouldShowStep1, currentStep, isEdit });
                return shouldShowStep1 ? (
                  <>
                    {/* Selector de Marca */}
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Marca:</Text>
                      <TouchableOpacity
                        style={[
                          styles.dropdownButton,
                          marcaSeleccionada && styles.dropdownButtonActive,
                          errors.marca && styles.inputError
                        ]}
                        onPress={() => setShowMarcasDropdown(!showMarcasDropdown)}
                      >
                        <Text style={[
                          styles.dropdownButtonText,
                          marcaSeleccionada && styles.dropdownButtonTextActive
                        ]}>
                          {marcaSeleccionada ? marcaSeleccionada.nombre : 'Selecciona una marca'}
                        </Text>
                        <Ionicons
                          name={showMarcasDropdown ? "chevron-up" : "chevron-down"}
                          size={18}
                          color={COLORS.textLight}
                        />
                      </TouchableOpacity>
                      {errors.marca && <Text style={styles.errorText}>{errors.marca}</Text>}

                      {showMarcasDropdown && (
                        <View style={styles.dropdownList}>
                          <ScrollView nestedScrollEnabled={true} style={styles.dropdownScroll}>
                            {marcas.map(marca => (
                              <TouchableOpacity
                                key={`marca-${marca.id}`}
                                style={styles.dropdownItem}
                                onPress={() => {
                                  setMarcaSeleccionada(marca);
                                  setShowMarcasDropdown(false);
                                }}
                              >
                                <Text style={styles.dropdownItemText}>{marca.nombre}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>

                    {/* Selector de Modelo */}
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Modelo:</Text>
                      <TouchableOpacity
                        style={[
                          styles.dropdownButton,
                          formData.modelo && styles.dropdownButtonActive,
                          errors.modelo && styles.inputError
                        ]}
                        onPress={() => {
                          if (marcaSeleccionada) {
                            setShowModelosDropdown(!showModelosDropdown);
                          } else {
                            Alert.alert('Atención', 'Primero selecciona una marca');
                          }
                        }}
                        disabled={!marcaSeleccionada}
                      >
                        <Text style={[
                          styles.dropdownButtonText,
                          formData.modelo && styles.dropdownButtonTextActive,
                          !marcaSeleccionada && styles.disabledText
                        ]}>
                          {formData.modelo ?
                            modelos.find(m => m.id.toString() === formData.modelo)?.nombre :
                            'Selecciona un modelo'
                          }
                        </Text>
                        <Ionicons
                          name={showModelosDropdown ? "chevron-up" : "chevron-down"}
                          size={18}
                          color={marcaSeleccionada ? COLORS.textLight : COLORS.primary}
                        />
                      </TouchableOpacity>
                      {errors.modelo && <Text style={styles.errorText}>{errors.modelo}</Text>}

                      {showModelosDropdown && (
                        <View style={styles.dropdownList}>
                          <ScrollView nestedScrollEnabled={true} style={styles.dropdownScroll}>
                            {modelos.map(modelo => (
                              <TouchableOpacity
                                key={`modelo-${modelo.id}`}
                                style={styles.dropdownItem}
                                onPress={() => {
                                  handleChange('modelo', modelo.id.toString());
                                  setShowModelosDropdown(false);
                                }}
                              >
                                <Text style={styles.dropdownItemText}>{modelo.nombre}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>

                    {/* Cilindraje */}
                    <Input
                      label="Cilindraje:"
                      placeholder="Ej: 2.0L, 1600cc"
                      value={formData.cilindraje}
                      onChangeText={(text) => handleChange('cilindraje', text)}
                      error={errors.cilindraje}
                    />

                    {/* Tipo de Motor */}
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Tipo de Motor:</Text>
                      <TouchableOpacity
                        style={[
                          styles.dropdownButton,
                          formData.tipo_motor && styles.dropdownButtonActive,
                          errors.tipo_motor && styles.inputError
                        ]}
                        onPress={() => setShowTiposMotorDropdown(!showTiposMotorDropdown)}
                      >
                        <Text style={[
                          styles.dropdownButtonText,
                          formData.tipo_motor && styles.dropdownButtonTextActive
                        ]}>
                          {formData.tipo_motor ?
                            tiposMotor.find(t => t.id.toString() === formData.tipo_motor)?.nombre :
                            'Selecciona un tipo de motor'
                          }
                        </Text>
                        <Ionicons
                          name={showTiposMotorDropdown ? "chevron-up" : "chevron-down"}
                          size={18}
                          color={COLORS.textLight}
                        />
                      </TouchableOpacity>
                      {errors.tipo_motor && <Text style={styles.errorText}>{errors.tipo_motor}</Text>}

                      {showTiposMotorDropdown && (
                        <View style={styles.dropdownList}>
                          <ScrollView nestedScrollEnabled={true} style={styles.dropdownScroll}>
                            {tiposMotor.map(tipo => (
                              <TouchableOpacity
                                key={`tipo-motor-${tipo.id}`}
                                style={styles.dropdownItem}
                                onPress={() => {
                                  console.log('🎯 Usuario seleccionó tipo de motor:', tipo.id, tipo.nombre);
                                  handleChange('tipo_motor', tipo.id.toString());
                                  setShowTiposMotorDropdown(false);
                                  // Forzar actualización inmediata del estado para que el useEffect se ejecute
                                  console.log('🎯 Estado después de seleccionar:', { tipo_motor: tipo.id.toString() });
                                }}
                              >
                                <Text style={styles.dropdownItemText}>{tipo.nombre}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>

                    {/* Año */}
                    <Input
                      label="Año:"
                      placeholder="Ej: 2020"
                      value={formData.year}
                      onChangeText={(text) => handleChange('year', text)}
                      keyboardType="numeric"
                      error={errors.year}
                      maxLength={4}
                    />

                    {/* Patente */}
                    <Input
                      label="Patente:"
                      placeholder="Ej: ABC123"
                      value={formData.patente}
                      onChangeText={(text) => handleChange('patente', text.toUpperCase())}
                      error={errors.patente}
                      autoCapitalize="characters"
                    />

                    {/* Foto */}
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Foto del Vehículo:</Text>
                      <TouchableOpacity
                        style={styles.photoButton}
                        onPress={handleFotoSelect}
                      >
                        {formData.foto ? (
                          <Image
                            source={{ uri: formData.foto.uri }}
                            style={styles.photoPreview}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.photoPlaceholder}>
                            <Ionicons name="camera" size={40} color={COLORS.primary} />
                            <Text style={styles.photoPlaceholderText}>Toca para agregar foto</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Kilometraje */}
                    <Input
                      label="Kilometraje (km):"
                      placeholder="Ej: 15000"
                      value={formData.kilometraje}
                      onChangeText={(text) => handleChange('kilometraje', text)}
                      keyboardType="numeric"
                      error={errors.kilometraje}
                    />

                  </>
                ) : null;
              })()}

              {/* Paso 2: Checklist de Mantenimiento (Solo creación) */}
              {(() => {
                const shouldShowStep2 = currentStep === 2 && !isEdit;
                console.log('🎨 Renderizando paso 2:', { shouldShowStep2, currentStep, isEdit });
                return shouldShowStep2 ? (
                  <View style={styles.checklistStepContainer}>
                    <View style={styles.checklistHeader}>
                      <Ionicons name="construct-outline" size={32} color={COLORS.primary} />
                      <Text style={styles.checklistStepTitle}>Estado Inicial de Mantenimiento</Text>
                      <Text style={styles.checklistStepSubtitle}>
                        Selecciona los componentes a los que les has realizado mantenimiento recientemente.
                        Los no seleccionados se marcarán como pendientes de revisión técnica.
                      </Text>
                    </View>

                    {fetchingChecklist ? (
                      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={{ marginTop: 16, color: COLORS.textLight, fontSize: 14 }}>
                          Cargando componentes...
                        </Text>
                      </View>
                    ) : checklistItems.length > 0 ? (
                      <>
                        <View style={styles.checklistInfo}>
                          <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
                          <Text style={styles.checklistInfoText}>
                            {checklistItems.length} componente{checklistItems.length !== 1 ? 's' : ''} disponible{checklistItems.length !== 1 ? 's' : ''}.
                            La selección es opcional.
                          </Text>
                        </View>
                        {checklistItems.map((item) => {
                          const isSelected = selectedChecklistItems.includes(item.id);
                          return (
                            <TouchableOpacity
                              key={`checklist-${item.id}`}
                              style={[
                                styles.checklistItem,
                                isSelected && styles.checklistItemActive
                              ]}
                              onPress={() => toggleChecklistItem(item.id)}
                              activeOpacity={0.7}
                            >
                              <View style={[
                                styles.checkbox,
                                isSelected && styles.checkboxActive
                              ]}>
                                {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                              </View>
                              <View style={styles.checklistItemContent}>
                                <Text style={styles.checklistItemText}>{item.nombre}</Text>
                                {item.descripcion && (
                                  <Text style={styles.checklistItemSubtext}>{item.descripcion}</Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </>
                    ) : (
                      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                        <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.success} />
                        <Text style={{ marginTop: 16, color: COLORS.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
                          No hay componentes configurados
                        </Text>
                        <Text style={{ marginTop: 8, color: COLORS.textLight, fontSize: 13, textAlign: 'center' }}>
                          Puedes continuar sin seleccionar componentes. El sistema inicializará el mantenimiento como pendiente.
                        </Text>
                      </View>
                    )}
                  </View>
                ) : null;
              })()}

              {/* Formulario de edición (siempre visible cuando isEdit) */}
              {isEdit && (
                <>
                  {/* Selector de Marca */}
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Marca:</Text>
                    <TouchableOpacity
                      style={[
                        styles.dropdownButton,
                        marcaSeleccionada && styles.dropdownButtonActive,
                        errors.marca && styles.inputError
                      ]}
                      onPress={() => setShowMarcasDropdown(!showMarcasDropdown)}
                    >
                      <Text style={[
                        styles.dropdownButtonText,
                        marcaSeleccionada && styles.dropdownButtonTextActive
                      ]}>
                        {marcaSeleccionada ? marcaSeleccionada.nombre : 'Selecciona una marca'}
                      </Text>
                      <Ionicons
                        name={showMarcasDropdown ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={COLORS.textLight}
                      />
                    </TouchableOpacity>
                    {errors.marca && <Text style={styles.errorText}>{errors.marca}</Text>}

                    {showMarcasDropdown && (
                      <View style={styles.dropdownList}>
                        <ScrollView nestedScrollEnabled={true} style={styles.dropdownScroll}>
                          {marcas.map(marca => (
                            <TouchableOpacity
                              key={`marca-${marca.id}`}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setMarcaSeleccionada(marca);
                                setShowMarcasDropdown(false);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>{marca.nombre}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Selector de Modelo */}
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Modelo:</Text>
                    <TouchableOpacity
                      style={[
                        styles.dropdownButton,
                        formData.modelo && styles.dropdownButtonActive,
                        errors.modelo && styles.inputError
                      ]}
                      onPress={() => {
                        if (marcaSeleccionada) {
                          setShowModelosDropdown(!showModelosDropdown);
                        } else {
                          Alert.alert('Atención', 'Primero selecciona una marca');
                        }
                      }}
                      disabled={!marcaSeleccionada}
                    >
                      <Text style={[
                        styles.dropdownButtonText,
                        formData.modelo && styles.dropdownButtonTextActive,
                        !marcaSeleccionada && styles.disabledText
                      ]}>
                        {formData.modelo ?
                          modelos.find(m => m.id.toString() === formData.modelo)?.nombre :
                          'Selecciona un modelo'
                        }
                      </Text>
                      <Ionicons
                        name={showModelosDropdown ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={marcaSeleccionada ? COLORS.textLight : COLORS.primary}
                      />
                    </TouchableOpacity>
                    {errors.modelo && <Text style={styles.errorText}>{errors.modelo}</Text>}

                    {showModelosDropdown && (
                      <View style={styles.dropdownList}>
                        <ScrollView nestedScrollEnabled={true} style={styles.dropdownScroll}>
                          {modelos.map(modelo => (
                            <TouchableOpacity
                              key={`modelo-${modelo.id}`}
                              style={styles.dropdownItem}
                              onPress={() => {
                                handleChange('modelo', modelo.id.toString());
                                setShowModelosDropdown(false);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>{modelo.nombre}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Cilindraje */}
                  <Input
                    label="Cilindraje:"
                    placeholder="Ej: 2.0L, 1600cc"
                    value={formData.cilindraje}
                    onChangeText={(text) => handleChange('cilindraje', text)}
                    error={errors.cilindraje}
                  />

                  {/* Tipo de Motor */}
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Tipo de Motor:</Text>
                    <TouchableOpacity
                      style={[
                        styles.dropdownButton,
                        formData.tipo_motor && styles.dropdownButtonActive,
                        errors.tipo_motor && styles.inputError
                      ]}
                      onPress={() => setShowTiposMotorDropdown(!showTiposMotorDropdown)}
                    >
                      <Text style={[
                        styles.dropdownButtonText,
                        formData.tipo_motor && styles.dropdownButtonTextActive
                      ]}>
                        {formData.tipo_motor ?
                          tiposMotor.find(t => t.id.toString() === formData.tipo_motor)?.nombre :
                          'Selecciona un tipo de motor'
                        }
                      </Text>
                      <Ionicons
                        name={showTiposMotorDropdown ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={COLORS.textLight}
                      />
                    </TouchableOpacity>
                    {errors.tipo_motor && <Text style={styles.errorText}>{errors.tipo_motor}</Text>}

                    {showTiposMotorDropdown && (
                      <View style={styles.dropdownList}>
                        <ScrollView nestedScrollEnabled={true} style={styles.dropdownScroll}>
                          {tiposMotor.map(tipo => (
                            <TouchableOpacity
                              key={`tipo-motor-${tipo.id}`}
                              style={styles.dropdownItem}
                              onPress={() => {
                                handleChange('tipo_motor', tipo.id.toString());
                                setShowTiposMotorDropdown(false);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>{tipo.nombre}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Año */}
                  <Input
                    label="Año:"
                    placeholder="Ej: 2020"
                    value={formData.year}
                    onChangeText={(text) => handleChange('year', text)}
                    keyboardType="numeric"
                    error={errors.year}
                    maxLength={4}
                  />

                  {/* Patente */}
                  <Input
                    label="Patente:"
                    placeholder="Ej: ABC123"
                    value={formData.patente}
                    onChangeText={(text) => handleChange('patente', text.toUpperCase())}
                    error={errors.patente}
                    autoCapitalize="characters"
                  />

                  {/* Foto */}
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Foto del Vehículo:</Text>
                    <TouchableOpacity
                      style={styles.photoButton}
                      onPress={handleFotoSelect}
                    >
                      {formData.foto ? (
                        <Image
                          source={{ uri: formData.foto.uri }}
                          style={styles.photoPreview}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <Ionicons name="camera" size={40} color={COLORS.primary} />
                          <Text style={styles.photoPlaceholderText}>Toca para agregar foto</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Kilometraje */}
                  <Input
                    label="Kilometraje (km):"
                    placeholder="Ej: 15000"
                    value={formData.kilometraje}
                    onChangeText={(text) => handleChange('kilometraje', text)}
                    keyboardType="numeric"
                    error={errors.kilometraje}
                  />
                </>
              )}

              {/* Botones según el paso */}
              {isEdit ? (
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.cancelButton, styles.cancelButtonOutline]}
                    onPress={() => setModalVisible(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <Button
                    title="Guardar Vehículo"
                    onPress={handleSubmit}
                    isLoading={isSubmitting}
                    style={[styles.submitButton, styles.submitButtonPrimary]}
                  />
                </View>
              ) : currentStep === 1 ? (
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.cancelButton, styles.cancelButtonOutline]}
                    onPress={() => {
                      setModalVisible(false);
                      setCurrentStep(1);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <Button
                    title="Siguiente"
                    onPress={handleNextStep}
                    style={[styles.submitButton, styles.submitButtonPrimary]}
                  />
                </View>
              ) : (
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.cancelButton, styles.cancelButtonOutline]}
                    onPress={handlePreviousStep}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="chevron-back" size={18} color={COLORS.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.cancelButtonText}>Atrás</Text>
                  </TouchableOpacity>
                  <Button
                    title="Guardar Vehículo"
                    onPress={handleSubmit}
                    isLoading={isSubmitting}
                    style={[styles.submitButton, styles.submitButtonPrimary]}
                  />
                </View>
              )}
            </ScrollContainer>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Popup de opciones del vehículo */}
      <Modal
        visible={optionsVisible}
        transparent
        animationType="fade"
        onRequestClose={closeOptions}
      >
        <View style={styles.optionsOverlay}>
          <View style={styles.optionsCard}>
            <TouchableOpacity style={styles.optionItem} onPress={() => openEditVehicle(optionsVehicle)}>
              <Ionicons name="create-outline" size={18} color={COLORS.text} />
              <Text style={styles.optionText}>Actualizar datos del vehículo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionItem} onPress={() => { closeOptions(); if (optionsVehicle) handleDeleteVehicle(optionsVehicle); }}>
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              <Text style={[styles.optionText, { color: COLORS.danger }]}>Eliminar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionItem, { borderBottomWidth: 0 }]} onPress={closeOptions}>
              <Ionicons name="close-circle-outline" size={18} color={COLORS.textLight} />
              <Text style={[styles.optionText, { color: COLORS.textLight }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  vehiclesList: {
    padding: 20,
    paddingBottom: 40,
  },
  vehicleCard: {
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(181,198,224,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  vehicleCardTouchable: {
    padding: 18,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  vehicleBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0,122,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vehicleTitleContainer: {
    flex: 1,
    paddingRight: 12,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c2434',
    letterSpacing: -0.3,
  },
  vehicleSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  vehicleInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    flex: 1,
  },
  vehicleInfoText: {
    marginLeft: 6,
    fontSize: 13,
    color: COLORS.textLight,
  },
  vehicleStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  vehicleStatChip: {
    flex: 1,
    backgroundColor: '#F5F8FF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginRight: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(181,198,224,0.4)',
  },
  vehicleStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 6,
  },
  vehicleStatLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  vehicleHistoryLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 16,
  },
  vehicleHistoryLoadingText: {
    marginLeft: 10,
    fontSize: 13,
    color: COLORS.textLight,
  },
  vehicleLastService: {
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  vehicleLastServiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  vehicleLastServiceLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 6,
    fontWeight: '600',
  },
  vehicleLastServiceDate: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1c2434',
    marginBottom: 4,
  },
  vehicleLastServiceName: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  vehicleEmptyHistory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  vehicleEmptyHistoryText: {
    marginLeft: 8,
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  vehicleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  vehicleFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleFooterText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  historyModalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  historyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 6 : 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  historyModalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F3F5',
  },
  historyModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  historyModalHeaderSpacer: {
    width: 36,
    height: 36,
  },
  historyVehicleSummary: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  historyVehicleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c2434',
    letterSpacing: -0.3,
  },
  historyVehicleSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  historyVehicleStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  historyVehicleStat: {
    flex: 1,
    paddingRight: 12,
  },
  historyVehicleStatLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  historyVehicleStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  historyModalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  historyErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,149,0,0.12)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.35)',
    marginBottom: 12,
  },
  historyErrorText: {
    marginLeft: 8,
    fontSize: 13,
    color: COLORS.warning,
  },
  historyLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyList: {
    paddingBottom: 24,
  },
  historyItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  historyStatusText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  historyItemDate: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  historyProvider: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  historyServicesList: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  historyServiceName: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  moreServices: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
  },
  historyTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  historyTotalLabel: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  historyTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  historyEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  historyEmptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  historyEmptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  historyEmptyButton: {
    width: 200,
  },
  // Estilos para el modal
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
    borderTopWidth: 5,
    borderTopColor: '#FF0000', // BORDE ROJO MUY VISIBLE PARA DEBUG
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  progressBarContainer: {
    marginTop: 8,
    width: '100%',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
    textAlign: 'left',
  },
  closeButton: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: '#F8F9FA',
  },
  formContainer: {
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 10,
  },
  checklistContainer: {
    marginTop: 20,
    marginBottom: 10,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  checklistStepContainer: {
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  checklistHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  checklistStepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1c2434',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  checklistStepSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  checklistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D0E7FF',
  },
  checklistInfoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  checklistTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c2434',
    marginBottom: 6,
  },
  checklistSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
    marginBottom: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
  },
  checklistItemActive: {
    backgroundColor: '#F0F7FF', // Light primary color
    borderColor: COLORS.primary,
  },
  checklistItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  checklistItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  checklistItemSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CED4DA',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dropdownButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(181,198,224,0.25)',
  },
  dropdownButtonText: {
    color: COLORS.textLight,
  },
  dropdownButtonTextActive: {
  },
  disabledText: {
    color: COLORS.textLight,
  },
  dropdownList: {
    maxHeight: 150,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    backgroundColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  dropdownScroll: {
    maxHeight: 150,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  dropdownItemText: {
    fontSize: 16,
    color: COLORS.text,
  },
  photoButton: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(235,244,245,0.15)',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  photoPlaceholderText: {
    marginTop: 8,
    color: COLORS.textLight,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  // Nuevos estilos para la Guía Paso a Paso
  guideContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  guideTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  guideSubtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 32,
    textAlign: 'center',
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  stepIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  stepNumber: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c2434',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  stepLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E9ECEF',
    marginLeft: 15, // (32/2) - (2/2) -> Centered below the icon
    marginVertical: 4,
    alignSelf: 'flex-start',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderColor: COLORS.primary,
  },
  cancelButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    marginLeft: 8,
    height: LAYOUT.buttonHeight,
    marginVertical: 0,
  },
  submitButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  providersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  providersButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginTop: 4,
  },
  floatingAddButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  // Popup de opciones
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  optionsCard: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    gap: 10,
  },
  optionText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  cancelButtonOutline: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    height: LAYOUT.buttonHeight,
    marginVertical: 0,
  },
});

export default MisVehiculosScreen; 