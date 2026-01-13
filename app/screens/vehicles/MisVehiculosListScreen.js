import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  Platform,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ROUTES } from '../../utils/constants';
import CustomHeader from '../../components/navigation/Header/Header';
import * as vehicleService from '../../services/vehicle';
import * as userService from '../../services/user';
import VehicleHealthService from '../../services/vehicleHealthService';
import { getMediaURL, get } from '../../services/api';
import websocketService from '../../services/websocketService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../design-system/theme/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Pantalla de lista de vehículos con información de salud
 * Muestra cada vehículo en formato de lista con foto, marca, modelo, año, servicios y salud
 */
const tiposMotor = [
  { id: 1, nombre: 'Gasolina' },
  { id: 2, nombre: 'Diésel' },
];

const MisVehiculosListScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const theme = useTheme();
  
  // Extraer valores del tema de forma segura
  const colors = theme?.colors || {};
  const typography = theme?.typography || {};
  const spacing = theme?.spacing || {};
  const borders = theme?.borders || {};
  
  // Asegurar que typography tenga todas las propiedades necesarias
  const safeTypography = typography?.fontSize && typography?.fontWeight
    ? typography
    : {
      fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24 },
      fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
    };
  
  // Validar que borders esté completamente inicializado
  const safeBorders = (borders?.radius && typeof borders.radius.full !== 'undefined') 
    ? borders 
    : {
      radius: {
        none: 0, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20, '3xl': 24,
        full: 9999,
        button: { sm: 8, md: 12, lg: 16, full: 9999 },
        input: { sm: 8, md: 12, lg: 16 },
        card: { sm: 8, md: 12, lg: 16, xl: 20 },
        modal: { sm: 12, md: 16, lg: 20, xl: 24 },
        avatar: { sm: 16, md: 24, lg: 32, full: 9999 },
        badge: { sm: 4, md: 8, lg: 12, full: 9999 },
      },
      width: { none: 0, thin: 1, medium: 2, thick: 4 }
    };
  
  // Crear estilos dinámicos con los tokens del tema
  const styles = createStyles(colors, safeTypography, spacing, safeBorders);
  
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehiclesData, setVehiclesData] = useState({}); // { vehicleId: { health, serviceCount, imageUrl } }

  // Estados para edición
  const [isEdit, setIsEdit] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);

  // Estados para el modal de agregar vehículo
  const [modalVisible, setModalVisible] = useState(false);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState(null);
  const [showMarcasDropdown, setShowMarcasDropdown] = useState(false);
  const [showModelosDropdown, setShowModelosDropdown] = useState(false);
  const [showTiposMotorDropdown, setShowTiposMotorDropdown] = useState(false);
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
  const [loadingMarcas, setLoadingMarcas] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);

  // Opciones para el selector de imágenes
  const imagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.7,
  };

  useFocusEffect(
    useCallback(() => {
      loadVehicles(true); // Forzar refresh de datos de salud
      fetchMarcas();
    }, [])
  );

  useEffect(() => {
    if (marcaSeleccionada) {
      fetchModelos(marcaSeleccionada.id);
    } else {
      setModelos([]);
      // No resetear modelo si estamos editando y ya tiene valor
      if (!isEdit) {
        setFormData(prev => ({ ...prev, modelo: '' }));
      }
    }
  }, [marcaSeleccionada]);

  const route = useRoute();

  // useEffect for route params removed as edit is now handled in VehicleProfileScreen

  const findTipoMotorIdByName = (name) => {
    if (!name) return '';
    const match = tiposMotor.find(t => String(t.nombre).toLowerCase() === String(name).toLowerCase());
    return match ? String(match.id) : '';
  };

  const openEditVehicle = async (vehicle) => {
    setIsEdit(true);
    setEditingVehicleId(vehicle.id);

    const marcaObj = { id: vehicle.marca, nombre: vehicle.marca_nombre };
    setMarcaSeleccionada(marcaObj);

    // Cargar modelos de la marca
    try {
      await fetchModelos(marcaObj.id);
    } catch (e) {
      console.error("Error cargando modelos al editar", e);
    }

    setFormData({
      marca: String(marcaObj.id),
      modelo: String(vehicle.modelo || ''),
      cilindraje: vehicle.cilindraje || '',
      tipo_motor: findTipoMotorIdByName(vehicle.tipo_motor) || '',
      year: vehicle.year ? String(vehicle.year) : '',
      patente: vehicle.patente || '',
      foto: null, // La foto no se precarga en el input file, pero se mantiene si no se cambia
      kilometraje: vehicle.kilometraje ? String(vehicle.kilometraje) : ''
    });
    setErrors({});
    setModalVisible(true);
  };

  const loadVehicles = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const userVehicles = await vehicleService.getUserVehicles();
      setVehicles(userVehicles);

      // Cargar datos de salud y servicios para cada vehículo
      await loadVehiclesData(userVehicles, forceRefresh);
    } catch (error) {
      console.error('Error cargando vehículos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVehiclesData = async (vehiclesList, forceRefresh = false) => {
    const data = {};

    // Cargar historial de servicios una sola vez
    let allServices = [];
    try {
      const history = await userService.getServicesHistory();
      allServices = Array.isArray(history?.results)
        ? history.results
        : Array.isArray(history)
          ? history
          : [];
    } catch (err) {
      console.warn('Error cargando historial de servicios:', err);
    }

    for (const vehicle of vehiclesList) {
      try {
        // Cargar salud del vehículo (forzar refresh si se solicita)
        let health = null;
        try {
          health = await VehicleHealthService.getVehicleHealth(vehicle.id, forceRefresh);
        } catch (err) {
          console.warn(`Error cargando salud de vehículo ${vehicle.id}:`, err);
        }

        // Filtrar servicios del vehículo
        const vehicleServices = allServices.filter(
          (solicitud) =>
            solicitud.vehiculo_detail?.id?.toString() === vehicle.id.toString() ||
            solicitud.vehiculo?.toString() === vehicle.id.toString()
        );

        const serviceCount = vehicleServices.filter(s => s.estado === 'completado').length;

        // Cargar imagen del vehículo
        let imageUrl = null;
        if (vehicle.foto) {
          try {
            imageUrl = await getMediaURL(vehicle.foto);
          } catch (err) {
            console.warn(`Error cargando imagen de vehículo ${vehicle.id}:`, err);
          }
        }

        data[vehicle.id] = { health, serviceCount, imageUrl };
      } catch (error) {
        console.error(`Error procesando vehículo ${vehicle.id}:`, error);
      }
    }

    setVehiclesData(data);
  };

  // Listener de WebSocket para actualizaciones de salud
  useEffect(() => {
    const handleHealthUpdate = (message) => {
      if (message.type === 'salud_vehiculo_actualizada' && message.vehicle_id) {
        console.log('🔄 [MisVehiculos] Actualización de salud recibida para vehículo:', message.vehicle_id);
        
        // Invalidar cache del vehículo
        VehicleHealthService.invalidateCache(message.vehicle_id);
        
        // Recargar datos del vehículo específico
        const vehicle = vehicles.find(v => v.id.toString() === message.vehicle_id.toString());
        if (vehicle) {
          loadVehiclesData([vehicle], true).then(() => {
            console.log('✅ [MisVehiculos] Datos de salud actualizados para vehículo:', message.vehicle_id);
          });
        }
      }
    };

    // Registrar handler
    websocketService.onMessage('salud_vehiculo_actualizada', handleHealthUpdate);

    // Cleanup
    return () => {
      websocketService.offMessage('salud_vehiculo_actualizada', handleHealthUpdate);
    };
  }, [vehicles]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadVehicles();
    setRefreshing(false);
  };

  const handleVehiclePress = (vehicle) => {
    navigation.navigate(ROUTES.VEHICLE_PROFILE, {
      vehicleId: vehicle.id,
      vehicle,
    });
  };

  const handleAddVehicle = () => {
    resetForm();
    setModalVisible(true);
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
    setErrors({});
    setModelos([]);
    setShowMarcasDropdown(false);
    setShowModelosDropdown(false);
    setShowTiposMotorDropdown(false);
    setIsEdit(false);
    setEditingVehicleId(null);
  };

  const fetchMarcas = async () => {
    try {
      setLoadingMarcas(true);
      const marcasData = await vehicleService.getCarBrands();
      setMarcas(Array.isArray(marcasData) ? marcasData : marcasData?.results || []);
    } catch (error) {
      console.error('Error cargando marcas:', error);
      Alert.alert('Error', 'No se pudieron cargar las marcas. Intenta de nuevo.');
    } finally {
      setLoadingMarcas(false);
    }
  };

  const fetchModelos = async (marcaId) => {
    try {
      setLoadingModelos(true);
      const modelosData = await vehicleService.getCarModels(marcaId);
      setModelos(Array.isArray(modelosData) ? modelosData : modelosData?.results || []);
    } catch (error) {
      console.error('Error cargando modelos:', error);
      setModelos([]);
    } finally {
      setLoadingModelos(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
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
    } else if (formData.patente.length < 4 || formData.patente.length > 8) {
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

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const vehicleData = {
        marca: Number(marcaSeleccionada.id),
        modelo: typeof formData.modelo === 'object' ? Number(formData.modelo.id) : Number(formData.modelo),
        year: parseInt(formData.year, 10),
        kilometraje: parseInt(formData.kilometraje || '0', 10),
        patente: formData.patente.trim().toUpperCase(),
        cilindraje: formData.cilindraje ? formData.cilindraje.trim() : null,
        tipo_motor: tiposMotor.find(t => t.id.toString() === formData.tipo_motor)?.nombre || 'Gasolina',
      };

      // Obtener cliente ID - buscar en las diferentes estructuras posibles
      let clienteIdValue = null;
      const userData = await AsyncStorage.getItem('user');
      
      console.log('🔍 Buscando cliente_id...');
      
      if (userData) {
        const parsedUser = JSON.parse(userData);
        console.log('👤 Datos de usuario:', JSON.stringify(parsedUser, null, 2).substring(0, 500));
        
        // Buscar cliente_id en las diferentes ubicaciones posibles
        if (parsedUser.cliente_id) {
          clienteIdValue = parsedUser.cliente_id;
          console.log('✅ cliente_id encontrado en parsedUser.cliente_id:', clienteIdValue);
        } else if (parsedUser.cliente_detail?.id) {
          clienteIdValue = parsedUser.cliente_detail.id;
          console.log('✅ cliente_id encontrado en parsedUser.cliente_detail.id:', clienteIdValue);
        } else if (parsedUser.cliente?.id) {
          clienteIdValue = parsedUser.cliente.id;
          console.log('✅ cliente_id encontrado en parsedUser.cliente.id:', clienteIdValue);
        }
      }

      // Si no encontramos el cliente_id localmente, obtenerlo del backend
      if (!clienteIdValue) {
        console.log('⚠️ cliente_id no encontrado localmente, obteniendo del servidor...');
        try {
          const clienteData = await get('/usuarios/cliente-detail/');
          console.log('📥 Respuesta de cliente-detail:', JSON.stringify(clienteData, null, 2).substring(0, 500));
          
          if (clienteData?.id) {
            clienteIdValue = clienteData.id;
            console.log('✅ cliente_id obtenido del servidor:', clienteIdValue);
            // Actualizar el usuario local con el cliente_id para futuras peticiones
            if (userData) {
              const parsedUser = JSON.parse(userData);
              parsedUser.cliente_id = clienteIdValue;
              await AsyncStorage.setItem('user', JSON.stringify(parsedUser));
            }
          }
        } catch (clienteError) {
          console.error('❌ Error obteniendo cliente_id del servidor:', clienteError);
        }
      }

      // Validar que tenemos el cliente_id
      if (!clienteIdValue) {
        Alert.alert(
          'Error',
          'No se pudo identificar tu cuenta de cliente. Por favor, cierra sesión e inicia sesión nuevamente.'
        );
        setIsSubmitting(false);
        return;
      }

      vehicleData.cliente = clienteIdValue;
      console.log('📤 Datos del vehículo a enviar:', JSON.stringify(vehicleData, null, 2));

      if (formData.foto) {
        const formattedData = new FormData();
        Object.entries(vehicleData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            formattedData.append(key, value);
          }
        });
        formattedData.append('foto', {
          uri: formData.foto.uri,
          type: 'image/jpeg',
          name: `vehicle_${Date.now()}.jpg`,
        });

        if (isEdit) {
          await vehicleService.updateVehicle(editingVehicleId, formattedData);
        } else {
          await vehicleService.createVehicle(formattedData);
        }
      } else {
        if (isEdit) {
          await vehicleService.updateVehicle(editingVehicleId, vehicleData);
        } else {
          await vehicleService.createVehicle(vehicleData);
        }
      }

      setModalVisible(false);
      setIsEdit(false);
      setEditingVehicleId(null);
      Alert.alert('Éxito', isEdit ? 'Vehículo actualizado correctamente' : 'Vehículo registrado correctamente');
      await loadVehicles();
    } catch (error) {
      console.error('Error al crear vehículo:', error);

      if (error.response && error.response.data) {
        const serverErrors = {};
        Object.entries(error.response.data).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            serverErrors[key] = value.join(', ');
          } else if (typeof value === 'string') {
            serverErrors[key] = value;
          }
        });
        if (Object.keys(serverErrors).length > 0) {
          setErrors({ ...errors, ...serverErrors });
          Alert.alert('Error de validación', 'Revisa los campos marcados en rojo');
        } else {
          Alert.alert('Error', 'Ha ocurrido un error al registrar el vehículo. Inténtalo de nuevo.');
        }
      } else {
        Alert.alert('Error', 'Ha ocurrido un error al registrar el vehículo. Inténtalo de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getHealthColor = (percentage) => {
    if (!percentage) return colors.neutral?.gray?.[400] || '#9E9E9E';
    if (percentage >= 70) return colors.success?.[500] || '#10B981';
    if (percentage >= 40) return colors.warning?.[500] || '#F59E0B';
    if (percentage >= 20) return colors.error?.[500] || '#EF4444';
    return colors.error?.[600] || '#DC2626';
  };

  const renderCircularProgress = (percentage, healthColor) => {
    return (
      <View style={styles.circularProgressContainer}>
        <View style={[styles.circularProgressCircle, { borderColor: healthColor }]}>
          <Text style={[styles.circularProgressValue, { color: healthColor }]}>
            {Math.round(percentage)}%
          </Text>
          <Text style={styles.circularProgressLabel}>Salud</Text>
        </View>
      </View>
    );
  };

  const renderVehicleItem = ({ item }) => {
    const vehicleData = vehiclesData[item.id] || {};
    const healthPercentage = vehicleData.health?.salud_general_porcentaje || 0;
    const serviceCount = vehicleData.serviceCount || 0;
    const healthColor = getHealthColor(healthPercentage);
    const hasUrgentAlerts = vehicleData.health?.tiene_alertas_activas ||
      (vehicleData.health?.componentes_urgentes > 0) ||
      (vehicleData.health?.componentes_criticos > 0);
    
    const componentesCriticos = vehicleData.health?.componentes_criticos || 0;
    const componentesUrgentes = vehicleData.health?.componentes_urgentes || 0;
    const totalCriticos = componentesCriticos + componentesUrgentes;

    return (
      <TouchableOpacity
        style={styles.vehicleItem}
        activeOpacity={0.7}
        onPress={() => handleVehiclePress(item)}
      >
        {/* Imagen del vehículo */}
        <View style={styles.vehicleImageContainer}>
          {vehicleData.imageUrl ? (
            <Image
              source={{ uri: vehicleData.imageUrl }}
              style={styles.vehicleImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.vehicleImagePlaceholder}>
              <Ionicons name="car-sport" size={32} color={colors.neutral?.gray?.[400] || '#9CA3AF'} />
            </View>
          )}
        </View>

        {/* Información del vehículo */}
        <View style={styles.vehicleInfo}>
          <View style={styles.vehicleInfoLeft}>
            {/* Marca y modelo en una línea */}
            <View style={styles.vehicleTitleContainer}>
              <Text style={styles.vehicleBrand}>
                {item.marca_nombre || item.marca} {item.modelo_nombre || item.modelo}
              </Text>
            </View>

            {/* Año y km en otra línea */}
            <View style={styles.vehicleDetails}>
              <Text style={styles.vehicleYear}>{item.year}</Text>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.vehicleKm}>
                {item.kilometraje?.toLocaleString() || 0} km
              </Text>
            </View>

            {/* Cantidad de servicios en otra línea */}
            <View style={styles.serviceCountRow}>
              <Ionicons name="construct-outline" size={16} color={colors.text?.secondary || '#5D6F75'} />
              <Text style={styles.serviceCountText}>
                {serviceCount} {serviceCount === 1 ? 'servicio realizado' : 'servicios realizados'}
              </Text>
            </View>
          </View>

          {/* Rueda de salud - Parte derecha */}
          <View style={styles.healthSection}>
            {renderCircularProgress(healthPercentage, healthColor)}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Renderizar header interno con botón de agregar vehículo
  const renderInternalHeader = () => {
    return (
      <CustomHeader
        title="Mis Vehículos"
        showBack={false}
        showProfile={true}
        rightComponent={
          <TouchableOpacity
            style={styles.headerAddButton}
            onPress={handleAddVehicle}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={24} color={colors.primary?.[500] || '#003459'} />
          </TouchableOpacity>
        }
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="car-outline" size={64} color={colors.text?.secondary || '#5D6F75'} />
      <Text style={styles.emptyTitle}>No tienes vehículos registrados</Text>
      <Text style={styles.emptyText}>
        Agrega tu primer vehículo para comenzar a recibir servicios personalizados
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddVehicle}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle" size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Agregar Vehículo</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        {renderInternalHeader()}
        <SafeAreaView style={styles.safeContent} edges={['left', 'right', 'bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary?.[500] || '#003459'} />
            <Text style={styles.loadingText}>Cargando vehículos...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Calcular altura del tab bar dinámicamente (debe coincidir con AppNavigator.js)
  const safeBottomInset = Platform.OS === 'ios' ? Math.max(insets.bottom, 0) : Math.max(insets.bottom, 5);
  const tabBarHeight = Platform.OS === 'ios' ? 60 + safeBottomInset : 65 + Math.max(insets.bottom - 5, 0);

  return (
    <View style={styles.container}>
      {renderInternalHeader()}
      <SafeAreaView style={styles.safeContent} edges={['left', 'right', 'bottom']}>
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderVehicleItem}
          contentContainerStyle={[
            styles.listContent,
            vehicles.length === 0 && styles.emptyListContent,
            { paddingBottom: tabBarHeight + (spacing.md || 16) } // Solo tab bar + padding
          ]}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary?.[500] || '#003459']}
              tintColor={colors.primary?.[500] || '#003459'}
            />
          }
          showsVerticalScrollIndicator={false}
        />

        {/* Modal para agregar vehículo */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            resetForm();
            setModalVisible(false);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            enabled={Platform.OS === 'ios'}
          >
            <View style={styles.modalOverlay}>
              <TouchableOpacity
                style={styles.modalOverlayTouchable}
                activeOpacity={1}
                onPress={() => {
                  resetForm();
                  setModalVisible(false);
                }}
              />
              <View style={styles.modalContent}>
                {/* Handle visual */}
                <View style={styles.modalHandleContainer}>
                  <View style={styles.modalHandle} />
                </View>

                {/* Header del modal */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <View style={styles.modalIconContainer}>
                      <Ionicons name="car-sport" size={24} color={colors.primary?.[500] || '#003459'} />
                    </View>
                    <View style={styles.modalTitleContainer}>
                      <Text style={styles.modalTitle}>{isEdit ? 'Editar Vehículo' : 'Agregar Vehículo'}</Text>
                      <Text style={styles.modalSubtitle}>Completa los datos de tu vehículo</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => {
                      resetForm();
                      setModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={24} color={colors.text?.primary || '#00171F'} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalScrollView}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  bounces={true}
                  scrollEventThrottle={16}
                  alwaysBounceVertical={false}
                  scrollEnabled={true}
                  onScrollBeginDrag={() => {
                    // Cerrar dropdowns al hacer scroll
                    setShowMarcasDropdown(false);
                    setShowModelosDropdown(false);
                    setShowTiposMotorDropdown(false);
                  }}
                >
                  {/* Sección: Información del vehículo */}
                  <View style={styles.formSection}>
                    <View style={styles.formSectionHeader}>
                      <Ionicons name="car-outline" size={18} color={colors.primary?.[500] || '#003459'} />
                      <Text style={styles.formSectionTitle}>Información del vehículo</Text>
                    </View>

                    {/* Selector de Marca */}
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Marca *</Text>
                    <TouchableOpacity
                      style={[
                        styles.selectButton,
                        marcaSeleccionada && styles.selectButtonActive,
                        errors.marca && styles.selectButtonError
                      ]}
                      onPress={() => {
                        setShowMarcasDropdown(!showMarcasDropdown);
                        setShowModelosDropdown(false);
                        setShowTiposMotorDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.selectButtonText,
                        marcaSeleccionada ? styles.selectButtonTextActive : styles.selectButtonTextPlaceholder
                      ]}>
                        {marcaSeleccionada ? marcaSeleccionada.nombre : 'Selecciona una marca'}
                      </Text>
                      {loadingMarcas ? (
                        <ActivityIndicator size="small" color={colors.primary?.[500] || '#003459'} style={{ marginLeft: 8 }} />
                      ) : (
                        <Ionicons
                          name={showMarcasDropdown ? "chevron-up" : "chevron-down"}
                          size={20}
                          color={marcaSeleccionada ? (colors.primary?.[500] || '#003459') : (colors.text?.secondary || '#5D6F75')}
                        />
                      )}
                    </TouchableOpacity>
                    {errors.marca && <Text style={styles.errorText}>{errors.marca}</Text>}

                    {showMarcasDropdown && (
                      <View style={styles.dropdownContainer}>
                        <ScrollView nestedScrollEnabled={true} style={styles.dropdownScroll}>
                          {marcas.length > 0 ? (
                            marcas.map(marca => (
                              <TouchableOpacity
                                key={`marca-${marca.id}`}
                                style={[
                                  styles.dropdownItem,
                                  marcaSeleccionada?.id === marca.id && styles.dropdownItemActive
                                ]}
                                onPress={() => {
                                  setMarcaSeleccionada(marca);
                                  setShowMarcasDropdown(false);
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={[
                                  styles.dropdownItemText,
                                  marcaSeleccionada?.id === marca.id && styles.dropdownItemTextActive
                                ]}>
                                  {marca.nombre}
                                </Text>
                                {marcaSeleccionada?.id === marca.id && (
                                  <Ionicons name="checkmark" size={18} color={colors.primary?.[500] || '#003459'} />
                                )}
                              </TouchableOpacity>
                            ))
                          ) : (
                            <View style={styles.dropdownEmpty}>
                              <Text style={styles.dropdownEmptyText}>Cargando marcas...</Text>
                            </View>
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Selector de Modelo */}
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Modelo *</Text>
                    <TouchableOpacity
                      style={[
                        styles.selectButton,
                        formData.modelo && styles.selectButtonActive,
                        errors.modelo && styles.selectButtonError,
                        !marcaSeleccionada && styles.selectButtonDisabled
                      ]}
                      onPress={() => {
                        if (marcaSeleccionada) {
                          setShowModelosDropdown(!showModelosDropdown);
                          setShowMarcasDropdown(false);
                          setShowTiposMotorDropdown(false);
                        } else {
                          Alert.alert('Atención', 'Primero selecciona una marca');
                        }
                      }}
                      disabled={!marcaSeleccionada}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.selectButtonText,
                        formData.modelo ? styles.selectButtonTextActive : styles.selectButtonTextPlaceholder,
                        !marcaSeleccionada && styles.selectButtonTextDisabled
                      ]}>
                        {loadingModelos ? 'Cargando modelos...' :
                          formData.modelo ?
                            modelos.find(m => m.id.toString() === formData.modelo)?.nombre :
                            'Selecciona un modelo'}
                      </Text>
                      {loadingModelos ? (
                        <ActivityIndicator size="small" color={colors.primary?.[500] || '#003459'} style={{ marginLeft: 8 }} />
                      ) : (
                        <Ionicons
                          name={showModelosDropdown ? "chevron-up" : "chevron-down"}
                          size={20}
                          color={marcaSeleccionada && formData.modelo ? (colors.primary?.[500] || '#003459') : (colors.text?.secondary || '#5D6F75')}
                        />
                      )}
                    </TouchableOpacity>
                    {errors.modelo && <Text style={styles.errorText}>{errors.modelo}</Text>}

                    {showModelosDropdown && marcaSeleccionada && (
                      <View style={styles.dropdownContainer}>
                        <ScrollView nestedScrollEnabled={true} style={styles.dropdownScroll}>
                          {modelos.length > 0 ? (
                            modelos.map(modelo => (
                              <TouchableOpacity
                                key={`modelo-${modelo.id}`}
                                style={[
                                  styles.dropdownItem,
                                  formData.modelo === modelo.id.toString() && styles.dropdownItemActive
                                ]}
                                onPress={() => {
                                  handleChange('modelo', modelo.id.toString());
                                  setShowModelosDropdown(false);
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={[
                                  styles.dropdownItemText,
                                  formData.modelo === modelo.id.toString() && styles.dropdownItemTextActive
                                ]}>
                                  {modelo.nombre}
                                </Text>
                                {formData.modelo === modelo.id.toString() && (
                                  <Ionicons name="checkmark" size={18} color={colors.primary?.[500] || '#003459'} />
                                )}
                              </TouchableOpacity>
                            ))
                          ) : (
                            <View style={styles.dropdownEmpty}>
                              <Text style={styles.dropdownEmptyText}>No hay modelos disponibles</Text>
                            </View>
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Tipo de Motor */}
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Tipo de Motor *</Text>
                    <TouchableOpacity
                      style={[
                        styles.selectButton,
                        formData.tipo_motor && styles.selectButtonActive,
                        errors.tipo_motor && styles.selectButtonError
                      ]}
                      onPress={() => {
                        setShowTiposMotorDropdown(!showTiposMotorDropdown);
                        setShowMarcasDropdown(false);
                        setShowModelosDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.selectButtonText,
                        formData.tipo_motor ? styles.selectButtonTextActive : styles.selectButtonTextPlaceholder
                      ]}>
                        {formData.tipo_motor ?
                          tiposMotor.find(t => t.id.toString() === formData.tipo_motor)?.nombre :
                          'Selecciona un tipo de motor'}
                      </Text>
                      <Ionicons
                        name={showTiposMotorDropdown ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={formData.tipo_motor ? (colors.primary?.[500] || '#003459') : (colors.text?.secondary || '#5D6F75')}
                      />
                    </TouchableOpacity>
                    {errors.tipo_motor && <Text style={styles.errorText}>{errors.tipo_motor}</Text>}

                    {showTiposMotorDropdown && (
                      <View style={styles.dropdownContainer}>
                        <ScrollView nestedScrollEnabled={true} style={styles.dropdownScroll}>
                          {tiposMotor.map(tipo => (
                            <TouchableOpacity
                              key={`tipo-motor-${tipo.id}`}
                              style={[
                                styles.dropdownItem,
                                formData.tipo_motor === tipo.id.toString() && styles.dropdownItemActive
                              ]}
                              onPress={() => {
                                handleChange('tipo_motor', tipo.id.toString());
                                setShowTiposMotorDropdown(false);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.dropdownItemText,
                                formData.tipo_motor === tipo.id.toString() && styles.dropdownItemTextActive
                              ]}>
                                {tipo.nombre}
                              </Text>
                              {formData.tipo_motor === tipo.id.toString() && (
                                <Ionicons name="checkmark" size={18} color={colors.primary?.[500] || '#003459'} />
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                  </View>
                  {/* Fin Sección: Información del vehículo */}

                  {/* Sección: Identificación del vehículo */}
                  <View style={styles.formSection}>
                    <View style={styles.formSectionHeader}>
                      <Ionicons name="document-text-outline" size={18} color={colors.primary?.[500] || '#003459'} />
                      <Text style={styles.formSectionTitle}>Identificación</Text>
                    </View>

                    {/* Campos en dos columnas */}
                    <View style={styles.formRow}>
                      <View style={[styles.formField, styles.formFieldHalf]}>
                        <Text style={styles.formLabel}>Año *</Text>
                        <View style={styles.inputWithIcon}>
                          <Ionicons name="calendar-outline" size={18} color={colors.text?.secondary || '#5D6F75'} style={styles.inputIcon} />
                          <TextInput
                            style={[
                              styles.inputIconText,
                              errors.year && styles.inputError
                            ]}
                            placeholder="Ej: 2020"
                            placeholderTextColor={colors.text?.secondary || '#5D6F75'}
                            value={formData.year}
                            onChangeText={(text) => handleChange('year', text.replace(/[^0-9]/g, ''))}
                            keyboardType="numeric"
                            maxLength={4}
                          />
                        </View>
                        {errors.year && <Text style={styles.errorText}>{errors.year}</Text>}
                      </View>

                      <View style={[styles.formField, styles.formFieldHalf]}>
                        <Text style={styles.formLabel}>Cilindraje</Text>
                        <View style={styles.inputWithIcon}>
                          <Ionicons name="speedometer-outline" size={18} color={colors.text?.secondary || '#5D6F75'} style={styles.inputIcon} />
                          <TextInput
                            style={styles.inputIconText}
                            placeholder="Ej: 2.0L"
                            placeholderTextColor={colors.text?.secondary || '#5D6F75'}
                            value={formData.cilindraje}
                            onChangeText={(text) => handleChange('cilindraje', text)}
                          />
                        </View>
                      </View>
                    </View>

                    {/* Patente */}
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Patente *</Text>
                      <View style={[styles.inputWithIcon, errors.patente && styles.inputWithIconError]}>
                        <Ionicons name="card-outline" size={18} color={colors.text?.secondary || '#5D6F75'} style={styles.inputIcon} />
                        <TextInput
                          style={styles.inputIconText}
                          placeholder="Ej: ABC123"
                          placeholderTextColor={colors.text?.secondary || '#5D6F75'}
                          value={formData.patente}
                          onChangeText={(text) => handleChange('patente', text.toUpperCase())}
                          autoCapitalize="characters"
                          maxLength={8}
                        />
                      </View>
                      {errors.patente && <Text style={styles.errorText}>{errors.patente}</Text>}
                    </View>

                    {/* Kilometraje */}
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Kilometraje (km) *</Text>
                      <View style={[styles.inputWithIcon, errors.kilometraje && styles.inputWithIconError]}>
                        <Ionicons name="speedometer-outline" size={18} color={colors.text?.secondary || '#5D6F75'} style={styles.inputIcon} />
                        <TextInput
                          style={styles.inputIconText}
                          placeholder="Ej: 15000"
                          placeholderTextColor={colors.text?.secondary || '#5D6F75'}
                          value={formData.kilometraje}
                          onChangeText={(text) => handleChange('kilometraje', text.replace(/[^0-9]/g, ''))}
                          keyboardType="numeric"
                        />
                      </View>
                      {errors.kilometraje && <Text style={styles.errorText}>{errors.kilometraje}</Text>}
                    </View>
                  </View>

                  {/* Sección: Foto del vehículo */}
                  <View style={styles.formSection}>
                    <View style={styles.formSectionHeader}>
                      <Ionicons name="camera-outline" size={18} color={colors.primary?.[500] || '#003459'} />
                      <Text style={styles.formSectionTitle}>Foto del vehículo</Text>
                      <View style={styles.optionalBadge}>
                        <Text style={styles.optionalBadgeText}>Opcional</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.photoButton}
                      onPress={handleFotoSelect}
                      activeOpacity={0.8}
                    >
                      {formData.foto ? (
                        <View style={styles.photoPreviewContainer}>
                          <Image
                            source={{ uri: formData.foto.uri }}
                            style={styles.photoPreview}
                            resizeMode="cover"
                          />
                          <View style={styles.photoOverlay}>
                            <Ionicons name="camera" size={28} color="#FFFFFF" />
                            <Text style={styles.photoOverlayText}>Cambiar foto</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <View style={styles.photoIconContainer}>
                            <Ionicons name="image-outline" size={32} color={colors.primary?.[500] || '#003459'} />
                          </View>
                          <Text style={styles.photoPlaceholderText}>Toca para agregar una foto</Text>
                          <Text style={styles.photoPlaceholderSubtext}>JPG, PNG • Máx. 5MB</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                {/* Footer del modal con botones */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      resetForm();
                      setModalVisible(false);
                    }}
                    activeOpacity={0.7}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    activeOpacity={0.8}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.submitButtonText}>Guardar Vehículo</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

// Función para crear estilos dinámicos basados en el tema
const createStyles = (colors, typography, spacing, borders) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  safeContent: {
    flex: 1,
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  headerAddButton: {
    padding: spacing.xs || 4,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md || 12,
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  listContent: {
    paddingVertical: spacing.sm || 12,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.background?.paper || '#FFFFFF',
    marginHorizontal: spacing.md || 16,
    marginBottom: spacing.sm || 12,
    borderRadius: borders.radius?.card?.md || 12,
    overflow: 'hidden',
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    height: 120, // Altura fija para mantener consistencia
  },
  vehicleImageContainer: {
    width: 120,
    marginRight: 0,
    overflow: 'hidden',
    backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
    alignSelf: 'stretch',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
    minHeight: 120,
  },
  vehicleImagePlaceholder: {
    width: '100%',
    height: '100%',
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
  },
  vehicleInfo: {
    flex: 1,
    padding: spacing.md || 16,
    paddingRight: spacing.md || 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minWidth: 0, // Permite que los hijos se compriman
  },
  vehicleInfoLeft: {
    flex: 1,
    marginRight: spacing.md || 16,
    minWidth: 0, // Permite que se comprima si es necesario
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm || 10,
  },
  vehicleTitleContainer: {
    flex: 1,
  },
  vehicleBrand: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    lineHeight: typography.fontSize?.lg ? typography.fontSize.lg * 1.2 : 21.6,
    marginBottom: spacing.sm || 10,
  },
  vehicleModel: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.medium || '500',
    color: colors.text?.secondary || '#5D6F75',
    lineHeight: typography.fontSize?.base ? typography.fontSize.base * 1.3 : 18.2,
  },
  alertIndicator: {
    width: 32,
    height: 32,
    borderRadius: borders.radius?.avatar?.sm || 16,
    backgroundColor: colors.error?.[50] || '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.error?.[200] || '#FECACA',
  },
  vehicleDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm || 10,
    flexWrap: 'wrap',
  },
  serviceCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs || 6,
  },
  serviceCountText: {
    fontSize: typography.fontSize?.sm || 12,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  vehicleYear: {
    fontSize: typography.fontSize?.sm || 12,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  separator: {
    fontSize: typography.fontSize?.sm || 12,
    color: colors.text?.secondary || '#5D6F75',
    marginHorizontal: spacing.xs || 6,
  },
  vehicleKm: {
    fontSize: typography.fontSize?.sm || 12,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  vehicleStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md || 16,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs || 4,
  },
  statText: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  healthText: {
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  healthSection: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 90,
    flexShrink: 0, // No permite que se comprima
  },
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressCircle: {
    width: 60,
    height: 60,
    borderRadius: borders.radius?.avatar?.full || 30,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  circularProgressValue: {
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.bold || '700',
  },
  circularProgressLabel: {
    fontSize: typography.fontSize?.xs || 9,
    color: colors.text?.secondary || '#5D6F75',
    marginTop: spacing.xs || 1,
    fontWeight: typography.fontWeight?.medium || '500',
  },
  criticalPointsContainer: {
    marginTop: spacing.xs || 8,
    paddingVertical: spacing.xs || 6,
    paddingHorizontal: spacing.xs || 8,
    backgroundColor: colors.error?.[50] || '#FEF2F2',
    borderRadius: borders.radius?.badge?.md || 8,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.error?.[200] || '#FECACA',
    width: '100%',
    maxWidth: 120, // Limita el ancho máximo
  },
  criticalPointsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs || 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  criticalPointsText: {
    fontSize: typography.fontSize?.xs || 10,
    color: colors.error?.[600] || '#DC2626',
    fontWeight: typography.fontWeight?.semibold || '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl || 32,
  },
  emptyTitle: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginTop: spacing.md || 20,
    marginBottom: spacing.sm || 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.secondary || '#5D6F75',
    textAlign: 'center',
    marginBottom: spacing.lg || 24,
    lineHeight: typography.fontSize?.md ? typography.fontSize.md * 1.5 : 24,
    paddingHorizontal: spacing.md || 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary?.[500] || '#003459',
    paddingVertical: spacing.sm || 12,
    paddingHorizontal: spacing.lg || 24,
    borderRadius: borders.radius?.button?.md || 12,
    gap: spacing.xs || 8,
    shadowColor: colors.primary?.[500] || '#003459',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  // Estilos del modal
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalOverlayTouchable: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    pointerEvents: 'box-none',
  },
  modalContent: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '95%',
    maxHeight: '95%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
    zIndex: 1,
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  modalHandleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm || 12,
    paddingBottom: spacing.xs || 4,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral?.gray?.[300] || '#D1D5DB',
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md || 20,
    paddingTop: spacing.sm || 8,
    paddingBottom: spacing.md || 16,
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[100] || '#F3F4F6',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borders.radius?.avatar?.md || 22,
    backgroundColor: colors.primary?.[50] || '#E6F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm || 12,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
  },
  modalSubtitle: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || '#5D6F75',
    marginTop: 2,
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: borders.radius?.avatar?.sm || 19,
    backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollView: {
    flex: 1,
    minHeight: 0,
  },
  modalScrollContent: {
    padding: spacing.md || 20,
    paddingBottom: spacing.lg || 24,
    flexGrow: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md || 20,
    paddingVertical: spacing.md || 16,
    borderTopWidth: borders.width?.thin || 1,
    borderTopColor: colors.neutral?.gray?.[100] || '#F3F4F6',
    gap: spacing.sm || 12,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    backgroundColor: colors.background?.paper || '#FFFFFF',
  },
  // Estilos del formulario
  formSection: {
    marginBottom: spacing.lg || 24,
    backgroundColor: colors.background?.default || '#F8F9FA',
    borderRadius: borders.radius?.card?.lg || 16,
    padding: spacing.md || 16,
  },
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md || 16,
    gap: spacing.xs || 8,
  },
  formSectionTitle: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    flex: 1,
  },
  optionalBadge: {
    backgroundColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    paddingHorizontal: spacing.xs || 8,
    paddingVertical: 2,
    borderRadius: borders.radius?.badge?.sm || 4,
  },
  optionalBadgeText: {
    fontSize: typography.fontSize?.xs || 10,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  formField: {
    marginBottom: spacing.md || 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.sm || 12,
  },
  formFieldHalf: {
    flex: 1,
    marginBottom: spacing.md || 16,
  },
  formLabel: {
    fontSize: typography.fontSize?.sm || 13,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || '#00171F',
    marginBottom: spacing.xs || 8,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm || 12,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.input?.md || 12,
    borderWidth: borders.width?.medium || 1.5,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    minHeight: 50,
  },
  inputWithIconError: {
    borderColor: colors.error?.[500] || '#EF4444',
    backgroundColor: colors.error?.[50] || '#FEF2F2',
  },
  inputIcon: {
    marginRight: spacing.xs || 8,
  },
  inputIconText: {
    flex: 1,
    fontSize: typography.fontSize?.base || 15,
    color: colors.text?.primary || '#00171F',
    paddingVertical: spacing.sm || 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.sm || 14,
    backgroundColor: colors.background?.default || '#F8F9FA',
    borderRadius: borders.radius?.input?.md || 12,
    borderWidth: borders.width?.medium || 1.5,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    minHeight: 50,
  },
  selectButtonActive: {
    borderColor: colors.primary?.[500] || '#003459',
    backgroundColor: colors.primary?.[50] || '#E6F2F7',
  },
  selectButtonError: {
    borderColor: colors.error?.[500] || '#EF4444',
    backgroundColor: colors.error?.[50] || '#FEF2F2',
  },
  selectButtonDisabled: {
    opacity: 0.5,
    backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
  },
  selectButtonText: {
    flex: 1,
    fontSize: typography.fontSize?.base || 15,
    color: colors.text?.primary || '#00171F',
  },
  selectButtonTextActive: {
    color: colors.text?.primary || '#00171F',
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  selectButtonTextPlaceholder: {
    color: colors.text?.secondary || '#5D6F75',
  },
  selectButtonTextDisabled: {
    color: colors.text?.secondary || '#5D6F75',
  },
  input: {
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.sm || 14,
    backgroundColor: colors.background?.default || '#F8F9FA',
    borderRadius: borders.radius?.input?.md || 12,
    borderWidth: borders.width?.medium || 1.5,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    fontSize: typography.fontSize?.base || 15,
    color: colors.text?.primary || '#00171F',
    minHeight: 50,
  },
  inputError: {
    borderColor: colors.error?.[500] || '#EF4444',
    backgroundColor: colors.error?.[50] || '#FEF2F2',
  },
  errorText: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.error?.[500] || '#EF4444',
    marginTop: spacing.xs || 6,
    marginLeft: spacing.xs || 4,
    fontWeight: typography.fontWeight?.medium || '500',
  },
  dropdownContainer: {
    marginTop: spacing.xs || 8,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.card?.md || 12,
    borderWidth: borders.width?.medium || 1.5,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    maxHeight: 200,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.sm || 14,
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[100] || '#F3F4F6',
  },
  dropdownItemActive: {
    backgroundColor: colors.primary?.[50] || '#E6F2F7',
  },
  dropdownItemText: {
    flex: 1,
    fontSize: typography.fontSize?.base || 15,
    color: colors.text?.primary || '#00171F',
  },
  dropdownItemTextActive: {
    color: colors.primary?.[500] || '#003459',
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  dropdownEmpty: {
    padding: spacing.md || 20,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: typography.fontSize?.base || 14,
    color: colors.text?.secondary || '#5D6F75',
  },
  photoButton: {
    borderRadius: borders.radius?.card?.lg || 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    borderStyle: 'dashed',
    backgroundColor: colors.background?.paper || '#FFFFFF',
  },
  photoPreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoOverlayText: {
    marginTop: spacing.xs || 8,
    fontSize: typography.fontSize?.sm || 14,
    color: '#FFFFFF',
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  photoPlaceholder: {
    width: '100%',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md || 20,
  },
  photoIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary?.[50] || '#E6F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm || 12,
  },
  photoPlaceholderText: {
    fontSize: typography.fontSize?.base || 15,
    color: colors.text?.primary || '#00171F',
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  photoPlaceholderSubtext: {
    marginTop: spacing.xs || 4,
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || '#5D6F75',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md || 16,
    paddingHorizontal: spacing.md || 20,
    borderRadius: borders.radius?.button?.lg || 14,
    backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || '#00171F',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md || 16,
    paddingHorizontal: spacing.md || 20,
    borderRadius: borders.radius?.button?.lg || 14,
    backgroundColor: colors.primary?.[500] || '#003459',
    gap: spacing.xs || 8,
    shadowColor: colors.primary?.[500] || '#003459',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.bold || '700',
    color: '#FFFFFF',
  },
});

export default MisVehiculosListScreen;
