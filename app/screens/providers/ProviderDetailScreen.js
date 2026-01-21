import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  Alert,
  Animated,
  Platform,
  Linking,
  Share
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../design-system/theme/useTheme';
import VehicleSelectionModal from '../../components/modals/VehicleSelectionModal';
import { get } from '../../services/api';
import * as userService from '../../services/user';
import { ROUTES } from '../../utils/constants';
import logger from '../../utils/logger';
import ScrollContainer from '../../components/base/ScrollContainer';
import {
  useProviderDetails,
  useProviderServices,
  useProviderDocuments,
  useProviderCompletedJobs
} from '../../hooks/useProviders';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const HEADER_HEIGHT = 60;
const CATEGORIES_HEIGHT = 70;

const ProviderDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // Extraer valores del tema de forma segura
  const colors = theme?.colors || {};
  // Asegurar que typography tenga todas las propiedades necesarias
  const typography = theme?.typography && theme?.typography?.fontSize && theme?.typography?.fontWeight
    ? theme.typography
    : {
      fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36 },
      fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
      fontFamily: { regular: 'System', medium: 'System', bold: 'System' },
    };
  const spacing = theme?.spacing || {};
  // Validar que borders esté completamente inicializado
  const borders = (theme?.borders?.radius && typeof theme.borders.radius.full !== 'undefined')
    ? theme.borders
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
  const styles = createStyles(colors, typography, spacing, borders);

  // Soporte para ambos formatos: provider completo o providerId/providerType
  // También soporta deep links con id, type y name (nombre del proveedor) directamente
  const {
    provider: originalProvider,
    providerId,
    providerType,
    type: typeParam,
    id: idFromDeepLink, // Parámetro del deep link
    name: nameFromDeepLink, // Nombre del proveedor desde el deep link (opcional)
    selectedVehicleData
  } = route.params || {};

  // Determinar tipo y provider inicial
  // El deep link envía 'type', la navegación normal puede enviar 'providerType'
  const type = typeParam || providerType || route.params?.type;
  const initialProvider = originalProvider || null;
  // El deep link envía 'id', la navegación normal puede enviar 'providerId'
  const providerIdToLoad = providerId || idFromDeepLink || originalProvider?.id;

  // Log en desarrollo para verificar parámetros del deep link
  if (__DEV__ && (idFromDeepLink || nameFromDeepLink)) {
    logger.debug('🔗 Deep link detectado en ProviderDetailScreen:', {
      id: idFromDeepLink,
      type: typeParam,
      name: nameFromDeepLink,
      providerId: providerIdToLoad
    });
  }

  console.log('🚀 PROVIDER DETAIL SCREEN INICIADO:');
  console.log('  - Provider recibido:', originalProvider?.nombre);
  console.log('  - ProviderId recibido:', providerId);
  console.log('  - ID del provider:', providerIdToLoad);
  console.log('  - Tipo:', type);
  console.log('  - Servicios iniciales:', originalProvider?.servicios?.length || 0);
  console.log('  - Provider completo:', originalProvider);
  console.log('  - Calificación promedio:', originalProvider?.calificacion_promedio);
  console.log('  - Total reseñas:', originalProvider?.total_resenas);
  console.log('  - Número de calificaciones:', originalProvider?.numero_de_calificaciones);

  // Estados para el modal de selección de vehículo
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState(null);

  // Animación de scroll
  const scrollY = useRef(new Animated.Value(0)).current;


  // --- REACT QUERY HOOKS ---
  const { data: detailsData, isLoading: loadingDetails } = useProviderDetails(providerIdToLoad, type);

  // Pasamos el nombre para que el hook lo inyecte en los servicios procesados
  // Usamos detailsData directamente para evitar circular dependency con el memo de provider
  const providerNameForHook = detailsData?.nombre || initialProvider?.nombre;
  const { data: servicesData, isLoading: loadingServices } = useProviderServices(providerIdToLoad, type, providerNameForHook);

  // MERGED PROVIDER UNIFICADO: data fresca + services
  // Se usa useMemo para que al cambiar servicesData se actualice el objeto provider
  const provider = React.useMemo(() => {
    const base = detailsData || initialProvider || {};
    const services = (servicesData && servicesData.length > 0) ? servicesData : (base.servicios || []);

    const merged = {
      ...base,
      servicios: services
    };

    if (__DEV__) {
      console.log('[ProviderDetailScreen] Merged provider:', {
        id: merged.id,
        nombre: merged.nombre,
        totalServicios: merged.servicios?.length || 0,
        hasDetailsData: !!detailsData,
        hasServicesData: !!servicesData
      });
    }

    return merged;
  }, [detailsData, initialProvider, servicesData]);

  const { data: documentsData } = useProviderDocuments(providerIdToLoad, type);
  const documentosProvider = documentsData || [];

  const { data: jobsData, isLoading: loadingJobsHook } = useProviderCompletedJobs(providerIdToLoad, type);
  const completedJobs = jobsData || [];
  const loadingJobs = loadingJobsHook;

  // Estados visuales (UI)
  // const [provider, setProvider] = useState(initialProvider); // REPLACED BY HOOK
  // const [loading, setLoading] = useState(!initialProvider); // REPLACED BY HOOK
  const loading = loadingDetails && !initialProvider; // Solo mostrar loading si no hay datos ni iniciales

  const [categoriesHeight, setCategoriesHeight] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [filteredServices, setFilteredServices] = useState([]);
  const [direccionActualizada, setDireccionActualizada] = useState(false);

  // Computed values replacing state
  const serviciosCompletados = provider?.servicios_completados || 0;

  // Calcular comunasProvider (Derived State)
  const comunasProvider = React.useMemo(() => {
    if (!provider) return [];
    if (type === 'mecanico') {
      const zonas = provider.zonas_servicio || [];
      const todasComunas = [];
      zonas.forEach(zona => {
        if (zona.activa !== false) {
          const comunas = zona.comunas || zona.commune_names || [];
          if (Array.isArray(comunas) && comunas.length > 0) {
            todasComunas.push(...comunas);
          }
        }
      });
      return [...new Set(todasComunas)].sort();
    } else {
      if (provider.comunas_atendidas && Array.isArray(provider.comunas_atendidas)) {
        return provider.comunas_atendidas;
      } else if (provider.direccion_fisica?.comuna) {
        return [provider.direccion_fisica.comuna];
      }
      return [];
    }
  }, [provider, type]);

  // Colores unificados para ambos tipos (taller y mecánico)
  const themeColors = {
    primary: colors.primary?.[500] || '#003459',
    secondary: colors.primary?.[600] || '#002A47',
    light: colors.primary?.[50] || '#E6F2F7',
    gradient: [colors.primary?.[500] || '#003459', colors.primary?.[600] || '#002A47']
  };

  // Función unificada para aplicar filtros (categoría + marca) - MOVED UP BEFORE useEffect
  const applyFilters = useCallback((categoria, marca) => {
    let filtered = provider?.servicios || [];

    // Filtrar por categoría
    if (categoria) {
      filtered = filtered.filter(servicio => servicio.categoria === categoria);
    }

    // Filtrar por marca
    if (marca) {
      filtered = filtered.filter(servicio => {
        let marcaDelServicio = 'General';

        if (servicio.modelos_compatibles && servicio.modelos_compatibles.length > 0) {
          const primerModelo = servicio.modelos_compatibles[0];
          const partes = primerModelo.split(' ');
          marcaDelServicio = partes[0];
        } else if (provider?.marcas_atendidas_nombres && provider.marcas_atendidas_nombres.length > 0) {
          marcaDelServicio = provider.marcas_atendidas_nombres[0];
        }

        return marcaDelServicio === marca;
      });
    }

    setFilteredServices(filtered);
  }, [provider?.servicios, provider?.marcas_atendidas_nombres]);

  // Actualizar filtros cuando cambian los servicios o los filtros seleccionados
  useEffect(() => {
    applyFilters(selectedCategory, selectedBrand);
  }, [provider?.servicios, selectedCategory, selectedBrand, applyFilters]);

  const handleCategoriesLayout = (event) => {
    const { y } = event.nativeEvent.layout;
    setCategoriesSectionTop(y);
  };

  const getCategoryIcon = (categoria) => {
    switch (categoria?.toLowerCase()) {
      case 'cambio de aceite':
      case 'mantenimiento':
        return 'water-outline';
      case 'frenos':
        return 'disc-outline';
      case 'motor':
        return 'cog-outline';
      case 'transmisión':
        return 'settings-outline';
      case 'suspensión':
        return 'car-outline';
      case 'eléctrico':
      case 'sistema eléctrico':
        return 'flash-outline';
      case 'aire acondicionado':
        return 'snow-outline';
      case 'neumáticos':
        return 'ellipse-outline';
      case 'diagnóstico':
        return 'analytics-outline';
      case 'carrocería':
        return 'hammer-outline';
      default:
        return 'construct-outline';
    }
  };

  const getUniqueCategories = () => {
    if (!provider?.servicios || provider.servicios.length === 0) {
      return [];
    }

    const categoriasSet = new Set();
    provider.servicios.forEach(servicio => {
      if (servicio.categoria && servicio.categoria !== 'General') {
        categoriasSet.add(servicio.categoria);
      }
    });

    const categorias = Array.from(categoriasSet).sort();
    console.log('🏷️ Categorías únicas encontradas:', categorias);
    return categorias;
  };

  const formatHorario = () => {
    if (type === 'mecanico') {
      return provider.disponible ? 'Disponible 24/7' : 'No disponible';
    }

    const hoy = new Date().getDay();
    const horarios = provider.horarios || {
      lunes_viernes: '09:00 - 18:00',
      sabado: '09:00 - 14:00',
      domingo: 'Cerrado'
    };

    if (hoy === 0) return `Hoy: ${horarios.domingo}`;
    if (hoy === 6) return `Hoy: ${horarios.sabado}`;
    return `Hoy: ${horarios.lunes_viernes}`;
  };

  const handleCategoryPress = (categoria) => {
    console.log('🏷️ Filtro seleccionado:', categoria);
    console.log('🏷️ Categoría anterior:', selectedCategory);
    console.log('🏷️ Total servicios disponibles:', provider.servicios?.length || 0);

    if (categoria === null) {
      // Siempre mostrar todos los servicios cuando se hace clic en "Todos"
      setSelectedCategory(null);
      applyFilters(null, selectedBrand);
      console.log('🏷️ Mostrando TODOS los servicios:', provider.servicios?.length || 0);
    } else if (selectedCategory === categoria) {
      // Si se hace clic en la misma categoría, volver a mostrar todos
      setSelectedCategory(null);
      applyFilters(null, selectedBrand);
      console.log('🏷️ Deseleccionando categoría, mostrando TODOS:', provider.servicios?.length || 0);
    } else {
      // Filtrar por la nueva categoría seleccionada
      setSelectedCategory(categoria);
      applyFilters(categoria, selectedBrand);
      console.log(`🏷️ Filtrando por "${categoria}":`);
    }
  };

  // Función para obtener marcas únicas de los servicios (antes de filtrar por marca)
  const getAvailableBrands = () => {
    if (!provider?.servicios || provider.servicios.length === 0) {
      return [];
    }

    // Primero aplicar filtro de categoría si existe
    let serviciosParaMarcas = provider.servicios;
    if (selectedCategory) {
      serviciosParaMarcas = serviciosParaMarcas.filter(servicio => servicio.categoria === selectedCategory);
    }

    const marcasSet = new Set();
    serviciosParaMarcas.forEach(servicio => {
      let marcaDelServicio = 'General';

      if (servicio.modelos_compatibles && servicio.modelos_compatibles.length > 0) {
        const primerModelo = servicio.modelos_compatibles[0];
        const partes = primerModelo.split(' ');
        marcaDelServicio = partes[0];
      } else if (provider?.marcas_atendidas_nombres && provider.marcas_atendidas_nombres.length > 0) {
        marcaDelServicio = provider.marcas_atendidas_nombres[0];
      }

      if (marcaDelServicio && marcaDelServicio !== 'General') {
        marcasSet.add(marcaDelServicio);
      }
    });

    const marcas = Array.from(marcasSet).sort();
    // Solo mostrar selector de marcas si hay más de una marca
    return marcas.length > 1 ? marcas : [];
  };

  // Función para manejar el filtro por marca
  const handleBrandPress = (marca) => {
    if (marca === null) {
      setSelectedBrand(null);
      applyFilters(selectedCategory, null);
    } else if (selectedBrand === marca) {
      setSelectedBrand(null);
      applyFilters(selectedCategory, null);
    } else {
      setSelectedBrand(marca);
      applyFilters(selectedCategory, marca);
    }
  };

  const handleServicePress = (servicio) => {
    console.log('🔧 Servicio seleccionado:', servicio.nombre);
    console.log('📋 Navegando a creación rápida de solicitud desde ProviderDetailScreen');

    // Preparar proveedor con información completa (incluyendo usuario.id)
    const proveedorCompleto = {
      ...provider,
      // Asegurar que tengamos el usuario.id necesario para el backend
      usuario_id: provider.usuario?.id || provider.usuario || provider.id,
    };

    // CRÍTICO: CREAR_SOLICITUD está en el TabNavigator, necesitamos usar navegación anidada
    // Navegar al TabNavigator y luego a CREAR_SOLICITUD con los parámetros
    try {
      navigation.navigate('TabNavigator', {
        screen: ROUTES.CREAR_SOLICITUD,
        params: {
          servicioPreseleccionado: servicio,
          proveedorPreseleccionado: proveedorCompleto,
          tipoProveedorPreseleccionado: type, // 'taller' o 'mecanico'
          fromProviderDetail: true, // Flag para identificar el origen
        },
      });
      console.log('✅ Navegación exitosa a CREAR_SOLICITUD con datos preseleccionados');
    } catch (error) {
      console.error('❌ Error navegando a CREAR_SOLICITUD:', error);
      // Fallback: intentar navegación directa (puede funcionar si estamos en el contexto correcto)
      navigation.navigate(ROUTES.CREAR_SOLICITUD, {
        servicioPreseleccionado: servicio,
        proveedorPreseleccionado: proveedorCompleto,
        tipoProveedorPreseleccionado: type,
        fromProviderDetail: true,
      });
    }
  };

  const handleVehicleSelected = async (vehiculo) => {
    try {
      console.log('🚗 Vehículo seleccionado para agendamiento:', {
        vehiculo: `${vehiculo.marca_nombre} ${vehiculo.modelo_nombre}`,
        servicio: selectedServiceForBooking?.nombre
      });

      // Cerrar modal de vehículos
      setShowVehicleModal(false);

      // CAMBIO: Navegar al carrito en lugar del flujo antiguo de agendamiento
      console.log('📍 Navegando al carrito con servicio preseleccionado');

      // CORREGIDO: Preparar el servicio con ofertas preseleccionadas del proveedor actual
      const servicioParaNavegacion = {
        ...selectedServiceForBooking,
        // CRÍTICO: Crear ofertas_disponibles basadas en los datos del servicio actual
        ofertas_disponibles: [{
          id: selectedServiceForBooking.oferta_id,
          oferta_id: selectedServiceForBooking.oferta_id,
          servicio: selectedServiceForBooking.id,
          servicio_info: {
            id: selectedServiceForBooking.id,
            nombre: selectedServiceForBooking.nombre,
            descripcion: selectedServiceForBooking.descripcion
          },
          precio_con_repuestos: selectedServiceForBooking.precio_con_repuestos,
          precio_sin_repuestos: selectedServiceForBooking.precio_sin_repuestos,
          duracion_estimada: selectedServiceForBooking.duracion_estimada_oferta || selectedServiceForBooking.duracion_estimada,
          incluye_garantia: selectedServiceForBooking.incluye_garantia,
          duracion_garantia: selectedServiceForBooking.duracion_garantia,
          tipo_proveedor: selectedServiceForBooking.tipo_proveedor,
          // Información del proveedor según el tipo
          [type === 'taller' ? 'taller_info' : 'mecanico_info']: {
            id: provider.id,
            nombre: provider.nombre,
            direccion: provider.direccion_fisica?.direccion_completa || provider.direccion || provider.ubicacion,
            telefono: provider.telefono,
            calificacion_promedio: provider.calificacion_promedio,
            datos_completos: provider // Datos completos para navegación de regreso
          },
          [type === 'taller' ? 'taller' : 'mecanico']: provider.id,
          proveedor_preseleccionado: true // CRÍTICO: Marcar como preseleccionado
        }]
      };

      console.log('🔧 Servicio preparado para navegación:', {
        nombre: servicioParaNavegacion.nombre,
        ofertas_disponibles: servicioParaNavegacion.ofertas_disponibles.length,
        proveedor_preseleccionado: servicioParaNavegacion.ofertas_disponibles[0].proveedor_preseleccionado
      });

      // Navegar al carrito en lugar del flujo antiguo de agendamiento
      navigation.navigate('Carrito', {
        servicio: servicioParaNavegacion,
        vehiculo: vehiculo,
        fromProviderDetail: true,
        // ✅ LIMPIAR OBJETO PROVIDER: Eliminar datos de ubicación para evitar conflictos
        provider: {
          id: provider.id,
          nombre: provider.nombre,
          telefono: provider.telefono,
          calificacion_promedio: provider.calificacion_promedio,
          total_resenas: provider.total_resenas,
          numero_de_calificaciones: provider.numero_de_calificaciones,
          descripcion: provider.descripcion,
          // Incluir solo la dirección como string, NO objetos de ubicación
          direccion: provider.direccion_fisica?.direccion_completa || provider.direccion || 'Sin dirección',
          // Evitar pasar ubicacion, coordenadas, o cualquier objeto con {type, coordinates}
          foto_perfil: provider.usuario?.foto_perfil || provider.foto_perfil || provider.foto
        },
        providerType: type
      });

    } catch (error) {
      console.error('❌ Error al procesar selección de vehículo:', error);
      Alert.alert('Error', 'No se pudo procesar la selección. Intenta nuevamente.');
    }
  };

  const handleCloseVehicleModal = () => {
    setShowVehicleModal(false);
    setSelectedServiceForBooking(null);
  };

  // Función auxiliar para crear un slug del nombre (URL-friendly)
  const createSlugFromName = (name) => {
    if (!name) return '';

    return name
      .toLowerCase()
      .trim()
      // Reemplazar caracteres especiales y acentos
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]+/g, '-') // Reemplazar espacios y caracteres especiales con guiones
      .replace(/^-+|-+$/g, '') // Eliminar guiones al inicio y final
      .substring(0, 50); // Limitar a 50 caracteres para URLs más cortas
  };

  // Función para compartir el perfil del proveedor
  const handleShareProvider = async () => {
    try {
      if (!provider || !provider.id || !type) {
        Alert.alert('Error', 'No hay información del proveedor para compartir');
        return;
      }

      // Obtener información del proveedor para el mensaje
      const providerName = provider.nombre || 'Proveedor de servicios';
      const providerType = type === 'taller' ? 'Taller Automotriz' : 'Mecánico a Domicilio';
      const averageRating = provider.calificacion_promedio || 0;
      const reviewCount = provider.total_resenas || provider.numero_de_calificaciones || 0;
      const servicesCount = provider.servicios?.length || filteredServices.length || 0;

      // Obtener descripción (limitada a 100 caracteres)
      const description = provider.descripcion
        ? (provider.descripcion.length > 100
          ? provider.descripcion.substring(0, 100) + '...'
          : provider.descripcion)
        : '';

      // Obtener zona de servicio
      const serviceZone = comunasProvider.length > 0
        ? (comunasProvider.length <= 3
          ? comunasProvider.join(', ')
          : `${comunasProvider.slice(0, 2).join(', ')} y ${comunasProvider.length - 2} más`)
        : (type === 'taller'
          ? (provider.direccion_fisica?.comuna || 'Disponible')
          : 'Disponible');

      // Crear slug del nombre del proveedor para el link
      const providerSlug = createSlugFromName(providerName);

      // Crear deep link para el perfil del proveedor con nombre incluido
      // Formato: mecanimovil://provider/{type}/{id}/{nombre-slug}
      // Ejemplo: mecanimovil://provider/taller/123/taller-automotriz-san-pablo
      // El nombre siempre se incluye para hacer el link más descriptivo y compartible
      const deepLink = `mecanimovil://provider/${type}/${provider.id}/${providerSlug || 'proveedor'}`;

      // Log solo en desarrollo para verificar el link generado
      if (__DEV__) {
        logger.debug('🔗 Deep link generado para compartir:', {
          nombreOriginal: providerName,
          nombreSlug: providerSlug || 'proveedor',
          tipo: type,
          id: provider.id,
          linkCompleto: deepLink
        });
      }

      // URL web alternativa (si tienes una web app)
      // Puedes usar tu dominio de producción cuando esté disponible
      // const webLink = `https://mecanimovil.app/proveedor/${type}/${provider.id}/${providerSlug}`;

      // Construir mensaje de compartir atractivo y completo
      let shareMessage = `🔧 ${providerName}\n`;
      shareMessage += `📍 ${providerType}\n\n`;

      // Agregar calificación si existe
      if (averageRating > 0 && reviewCount > 0) {
        shareMessage += `⭐ ${averageRating.toFixed(1)}/5.0 (${reviewCount} ${reviewCount === 1 ? 'reseña' : 'reseñas'})\n`;
      } else if (reviewCount > 0) {
        shareMessage += `⭐ ${reviewCount} ${reviewCount === 1 ? 'reseña' : 'reseñas'}\n`;
      }

      // Agregar servicios disponibles
      if (servicesCount > 0) {
        shareMessage += `🛠️ ${servicesCount} ${servicesCount === 1 ? 'servicio disponible' : 'servicios disponibles'}\n`;
      }

      // Agregar zona de servicio
      if (serviceZone && serviceZone !== 'Disponible' && serviceZone !== 'Sin zona especificada') {
        shareMessage += `📍 Atiende en: ${serviceZone}\n`;
      }

      // Agregar descripción si existe
      if (description) {
        shareMessage += `\n${description}\n`;
      }

      // Agregar trabajos realizados si hay información
      if (serviciosCompletados > 0) {
        shareMessage += `\n✅ ${serviciosCompletados} ${serviciosCompletados === 1 ? 'trabajo realizado' : 'trabajos realizados'}\n`;
      }

      // Obtener URL de la foto del proveedor para compartir
      let providerPhotoUrl = null;
      if (provider?.usuario?.foto_perfil &&
        (typeof provider.usuario.foto_perfil === 'string') &&
        (provider.usuario.foto_perfil.startsWith('http://') || provider.usuario.foto_perfil.startsWith('https://'))) {
        providerPhotoUrl = provider.usuario.foto_perfil;
      } else if (provider?.foto_perfil &&
        (typeof provider.foto_perfil === 'string') &&
        (provider.foto_perfil.startsWith('http://') || provider.foto_perfil.startsWith('https://'))) {
        providerPhotoUrl = provider.foto_perfil;
      } else if (provider?.foto &&
        (typeof provider.foto === 'string') &&
        (provider.foto.startsWith('http://') || provider.foto.startsWith('https://'))) {
        providerPhotoUrl = provider.foto;
      }

      // Agregar link compartible y mensaje final
      // Formato del link con espacios para mejor detección en iOS/Android
      shareMessage += `\n📱 Ver perfil completo en MecaniMóvil:\n${deepLink}\n`;
      shareMessage += `\nDescarga MecaniMóvil para servicios automotrices profesionales 🚗`;

      // Preparar opciones de compartir según la plataforma
      const shareOptions = {
        message: shareMessage,
        title: `Compartir perfil de ${providerName}`,
      };

      // Manejar la foto del proveedor según la plataforma
      if (providerPhotoUrl) {
        // En Android, podemos usar la propiedad 'url' para compartir la imagen directamente
        // Esto permite que las apps muestren la imagen como vista previa
        if (Platform.OS === 'android') {
          shareOptions.url = providerPhotoUrl;
        }
        // En iOS, no usamos 'url' separada para evitar problemas de codificación plist
        // La mayoría de apps de mensajería detectarán automáticamente la URL en el mensaje
        // y la mostrarán como vista previa si está incluida como texto plano
        // Nota: Para mejor soporte en iOS, sería necesario descargar la imagen primero
        // usando expo-file-system, pero eso requiere dependencias adicionales
      }

      // Intentar compartir usando React Native Share API
      const result = await Share.share(shareOptions, {
        // Opciones adicionales
        dialogTitle: `Compartir ${providerName}`,
        subject: `Perfil de ${providerName} - MecaniMóvil`, // Para email
      });

      // Log solo en desarrollo
      if (__DEV__) {
        if (result.action === Share.sharedAction) {
          console.log('✅ Perfil compartido exitosamente');
        } else if (result.action === Share.dismissedAction) {
          console.log('ℹ️ Compartir cancelado por el usuario');
        }
      }
    } catch (error) {
      // Solo loguear en desarrollo (__DEV__), nunca en producción (APK)
      logger.error('Error compartiendo perfil del proveedor (solo visible en desarrollo):', error);

      // Mostrar mensaje amigable al usuario
      Alert.alert(
        'Error al compartir',
        'No se pudo compartir el perfil. Por favor, intenta nuevamente.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </View>
    );
  }

  const categories = getUniqueCategories();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={themeColors.primary} />

        <ScrollContainer
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {/* Header con imagen */}
          <View style={styles.headerContainer}>
            <View style={styles.headerImageContainer}>
              <Image
                source={{
                  uri:
                    (typeof provider?.usuario?.foto_perfil === 'string' && (provider.usuario.foto_perfil.startsWith('http://') || provider.usuario.foto_perfil.startsWith('https://')))
                      ? provider.usuario.foto_perfil
                      : (typeof provider?.foto_perfil === 'string' && (provider.foto_perfil.startsWith('http://') || provider.foto_perfil.startsWith('https://')))
                        ? provider.foto_perfil
                        : (typeof provider?.foto === 'string' && (provider.foto.startsWith('http://') || provider.foto.startsWith('https://')))
                          ? provider.foto
                          : 'https://via.placeholder.com/400x250/007AFF/FFFFFF?text=Proveedor'
                }}
                style={styles.headerImage}
              />

              <View style={styles.headerOverlay}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.headerActions}>
                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={handleShareProvider}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="share-outline" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Badge de tipo flotante con glass effect - izquierda inferior */}
              <BlurView intensity={20} style={styles.providerTypeBadge}>
                <Text style={styles.providerTypeText}>
                  {type === 'taller' ? 'Taller Automotriz' : 'Mecánico a Domicilio'}
                </Text>
              </BlurView>
            </View>

            {/* SECCIÓN 1: Información Principal Profesional */}
            <View style={styles.mainInfoProfessionalContainer}>
              {/* Fila 1: Nombre y Zona de servicio */}
              <View style={styles.mainInfoRow1}>
                <View style={styles.providerNameAndLocationContainer}>
                  <Text style={styles.providerNameLarge} numberOfLines={2}>
                    {provider.nombre}
                  </Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={14} color={colors.text?.secondary || '#666666'} />
                    <Text style={styles.serviceZoneText} numberOfLines={1}>
                      {comunasProvider.length > 0
                        ? (comunasProvider.length <= 3
                          ? comunasProvider.join(', ')
                          : `${comunasProvider.slice(0, 2).join(', ')} y ${comunasProvider.length - 2} más`)
                        : (type === 'taller'
                          ? (provider.direccion_fisica?.comuna || 'Sin zona especificada')
                          : 'Sin zona especificada')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Fila 2: Trabajos realizados y Enlace de Reseñas */}
              <View style={styles.mainInfoRow2}>
                {/* Badge de trabajos realizados */}
                <View style={styles.completedJobsBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success?.[500] || '#00C9A7'} />
                  <Text style={styles.completedJobsText} numberOfLines={1} ellipsizeMode="tail">
                    {serviciosCompletados} {serviciosCompletados === 1 ? 'trabajo realizado' : 'trabajos realizados'}
                  </Text>
                </View>

                {/* Enlace de reseñas (estilo link, no botón) */}
                <TouchableOpacity
                  style={styles.reviewsLink}
                  onPress={() => {
                    const reviewCount = provider.total_resenas !== undefined && provider.total_resenas !== null
                      ? provider.total_resenas
                      : (provider.numero_de_calificaciones !== undefined && provider.numero_de_calificaciones !== null
                        ? provider.numero_de_calificaciones
                        : 0);
                    const avgRating = provider.calificacion_promedio || 0;

                    navigation.navigate(ROUTES.PROVIDER_REVIEWS, {
                      providerId: provider.id,
                      providerName: provider.nombre,
                      averageRating: avgRating,
                      reviewCount: reviewCount
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.reviewsLinkContent}>
                    {(() => {
                      const reviewCount = provider.total_resenas !== undefined && provider.total_resenas !== null
                        ? provider.total_resenas
                        : (provider.numero_de_calificaciones !== undefined && provider.numero_de_calificaciones !== null
                          ? provider.numero_de_calificaciones
                          : 0);

                      return (
                        <>
                          <Ionicons name="star-outline" size={18} color={colors.warning?.[400] || '#FFD89B'} />
                          <Text style={styles.reviewsLinkText} numberOfLines={1} ellipsizeMode="tail">
                            {reviewCount} {reviewCount === 1 ? 'reseña' : 'reseñas'}
                          </Text>
                          <Ionicons name="chevron-forward" size={16} color={colors.warning?.[600] || '#D97706'} />
                        </>
                      );
                    })()}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* SECCIÓN 2: Especialidades en Marcas - Compacta */}
          {provider?.marcas_atendidas_nombres && provider.marcas_atendidas_nombres.length > 0 && (
            <View style={styles.sectionContainerCompact}>
              <Text style={styles.sectionTitleCompact}>Especialidades</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.brandsScrollContainer}
              >
                {provider.marcas_atendidas_nombres.map((marca, index) => (
                  <View key={index} style={styles.brandPillCompact}>
                    <Ionicons name="car-sport" size={16} color={colors.secondary?.[700] || '#004C65'} />
                    <Text style={styles.brandPillTextCompact}>{marca}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* SECCIÓN 3: Acerca de Mí */}
          {provider?.descripcion && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Acerca de Mí</Text>
              <Text style={styles.aboutText}>{provider.descripcion}</Text>
            </View>
          )}

          {/* SECCIÓN 4: Documentos Legales - Compacta */}
          <View style={styles.sectionContainerCompact}>
            <View style={styles.documentsHeaderRow}>
              <Text style={styles.sectionTitleCompact}>Documentos Legales</Text>
              {documentosProvider.length > 0 && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success?.[500] || '#00C9A7'} />
                  <Text style={styles.verifiedBadgeText}>Verificado</Text>
                </View>
              )}
            </View>
            {documentosProvider.length > 0 ? (
              <View style={styles.documentsListCompact}>
                {documentosProvider.map((doc) => {
                  const getDocumentName = (tipo) => {
                    switch (tipo) {
                      case 'curriculum':
                        return 'Curriculum Vitae';
                      case 'certificado_antecedentes':
                        return 'Certificado de Antecedentes';
                      case 'rut_fiscal':
                        return 'RUT/CUIT Fiscal';
                      case 'licencia_conducir':
                        return 'Licencia de Conducir';
                      default:
                        return doc.tipo_documento_display || tipo;
                    }
                  };

                  return (
                    <View
                      key={doc.id}
                      style={styles.documentCardCompact}
                    >
                      <View style={styles.documentInfoCompact}>
                        <Text style={styles.documentNameCompact}>{getDocumentName(doc.tipo_documento)}</Text>
                      </View>
                      <View style={styles.documentApprovedIcon}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={colors.success?.[500] || '#00C9A7'}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noDocumentsContainer}>
                <Ionicons name="document-outline" size={32} color={colors.text?.secondary || '#666666'} />
                <Text style={styles.noDocumentsText}>
                  El proveedor no ha compartido documentos legales
                </Text>
              </View>
            )}
          </View>

          {/* SECCIÓN: Servicios Disponibles - Grid Mejorado */}
          <View style={styles.servicesSection}>
            {/* Header de Servicios Disponibles */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Servicios Disponibles
              </Text>
              {filteredServices.length > 0 && (
                <Text style={styles.servicesCount}>
                  {filteredServices.length} {filteredServices.length === 1 ? 'servicio' : 'servicios'}
                </Text>
              )}
            </View>

            {/* Filtros de Categoría - Dentro de la sección de servicios */}
            {categories.length > 0 && (
              <View style={styles.filtersContainerInline}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filtersRow}
                >
                  <TouchableOpacity
                    style={[styles.filterChip, !selectedCategory && styles.filterChipSelected]}
                    onPress={() => handleCategoryPress(null)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterChipText, !selectedCategory && styles.filterChipTextSelected]}>
                      Todos
                    </Text>
                  </TouchableOpacity>
                  {categories.map((categoria, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.filterChip, selectedCategory === categoria && styles.filterChipSelected]}
                      onPress={() => handleCategoryPress(categoria)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.filterChipText, selectedCategory === categoria && styles.filterChipTextSelected]}>
                        {categoria}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {selectedCategory && (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCategory(null);
                      setSelectedBrand(null);
                      applyFilters(null, null);
                    }}
                    style={styles.clearFiltersButtonInline}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={16} color={colors.text?.secondary || '#5D6F75'} />
                    <Text style={styles.clearFiltersText}>Limpiar</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Loading indicator for services */}
            {loadingServices && filteredServices.length === 0 && (
              <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="small" color={themeColors.primary} />
                <Text style={{ marginTop: 8, color: colors.text?.secondary, fontSize: 13 }}>Cargando servicios...</Text>
              </View>
            )}

            {/* Grid mejorado de servicios */}
            {filteredServices.length > 0 ? (
              <View style={styles.serviceGrid}>
                {filteredServices.map((servicio) => {
                  // Calcular precio con IVA (19%) - mostrar precio final al cliente
                  const precioSinIva = servicio.precio_real_sin_iva || servicio.precio_publicado_cliente || 0;
                  const price = precioSinIva > 0 ? Math.round(precioSinIva * 1.19) : 0;
                  const oldPriceSinIva = parseFloat(servicio.precio_referencia || 0) || 0;
                  const oldPrice = oldPriceSinIva > 0 ? Math.round(oldPriceSinIva * 1.19) : 0;
                  const hasDiscount = oldPrice > 0 && price > 0 && oldPrice > price;
                  const discountPct = hasDiscount ? Math.round((1 - price / oldPrice) * 100) : 0;

                  // Obtener imagen
                  let imageUrl = null;
                  if (servicio.fotos_servicio && servicio.fotos_servicio.length > 0) {
                    const primeraFoto = servicio.fotos_servicio[0];
                    imageUrl = primeraFoto.imagen_url || primeraFoto.imagen;
                  } else if (servicio.foto) {
                    imageUrl = servicio.foto;
                  }

                  // Duración estimada
                  const duracion = servicio.duracion_estimada || servicio.duracion_estimada_base;
                  const duracionText = duracion ? `${duracion} min` : null;

                  return (
                    <TouchableOpacity
                      key={servicio.id}
                      style={styles.serviceCard}
                      onPress={() => handleServicePress(servicio)}
                      activeOpacity={0.85}
                    >
                      {/* Información del servicio */}
                      <View style={styles.serviceCardInfo}>
                        {/* Nombre del servicio - Prominente */}
                        <Text style={styles.serviceCardTitle} numberOfLines={2}>
                          {servicio.nombre}
                        </Text>

                        {/* Badge de categoría - Pequeño, discreto */}
                        {servicio.categoria && (
                          <View style={styles.serviceCardCategoryBadge}>
                            <Text style={styles.serviceCardCategoryText}>
                              {servicio.categoria.charAt(0).toUpperCase() + servicio.categoria.slice(1).toLowerCase()}
                            </Text>
                          </View>
                        )}

                        {/* Precio - Oculto por requerimiento */}
                        {/* {price > 0 && (
                          <View style={styles.serviceCardPriceSection}>
                            <View style={styles.serviceCardPriceContainer}>
                              {hasDiscount && (
                                <Text style={styles.serviceCardOldPrice}>
                                  ${oldPrice.toLocaleString('es-CL')}
                                </Text>
                              )}
                              <Text style={styles.serviceCardPrice}>
                                ${price.toLocaleString('es-CL')}
                              </Text>
                            </View>
                          </View>
                        )} */}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : !loadingServices && (
              <View style={styles.noServicesContainer}>
                <Ionicons name="construct-outline" size={48} color={colors.text?.secondary || '#5D6F75'} />
                <Text style={styles.noServicesText}>No hay servicios disponibles</Text>
                <Text style={styles.noServicesSubtext}>
                  Este proveedor no tiene servicios registrados para tu selección
                </Text>
              </View>
            )}
          </View>


          {/* SECCIÓN: Mis Trabajos - Trabajos realizados por el proveedor */}
          <View style={styles.servicesSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Mis Trabajos</Text>
              {completedJobs.length > 0 && (
                <Text style={styles.servicesCount}>
                  {completedJobs.length} {completedJobs.length === 1 ? 'trabajo' : 'trabajos'}
                </Text>
              )}
            </View>

            {loadingJobs ? (
              <View style={styles.loadingJobsContainer}>
                <ActivityIndicator size="small" color={colors.primary?.[500] || '#003459'} />
                <Text style={styles.loadingJobsText}>Cargando trabajos...</Text>
              </View>
            ) : completedJobs.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.completedJobsHorizontal}
                bounces={false}
                decelerationRate="fast"
              >
                {completedJobs.map((trabajo) => {
                  const vehicleInfo = trabajo.vehiculo_detail || trabajo.vehiculo || {};
                  const vehicleName = vehicleInfo.marca_nombre && vehicleInfo.modelo_nombre
                    ? `${vehicleInfo.marca_nombre} ${vehicleInfo.modelo_nombre}`
                    : vehicleInfo.marca && vehicleInfo.modelo
                      ? `${vehicleInfo.marca} ${vehicleInfo.modelo}`
                      : 'Vehículo';
                  const vehicleYear = vehicleInfo.year || '';

                  // Obtener servicios realizados
                  const servicios = trabajo.lineas || [];
                  const servicioNames = servicios
                    .map(linea => linea.servicio?.nombre || linea.oferta_servicio?.servicio?.nombre || 'Servicio')
                    .filter(Boolean);

                  // Fecha del servicio
                  const fechaServicio = trabajo.fecha_servicio || trabajo.fecha_hora_solicitud;
                  const fechaFormateada = fechaServicio
                    ? new Date(fechaServicio).toLocaleDateString('es-CL', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })
                    : '';

                  // Precio total
                  const precioTotal = trabajo.precio_total_ofrecido ||
                    trabajo.total_pagado ||
                    trabajo.monto_total ||
                    trabajo.oferta_aceptada?.precio_total_ofrecido ||
                    0;

                  return (
                    <View key={trabajo.id} style={styles.completedJobCard}>
                      <View style={styles.completedJobHeader}>
                        <View style={styles.completedJobIconContainer}>
                          <Ionicons name="checkmark-circle" size={24} color={colors.success?.[500] || '#10B981'} />
                        </View>
                        <View style={styles.completedJobHeaderContent}>
                          <Text style={styles.completedJobVehicle} numberOfLines={1}>
                            {vehicleName} {vehicleYear ? `(${vehicleYear})` : ''}
                          </Text>
                          <Text style={styles.completedJobDate}>{fechaFormateada}</Text>
                        </View>
                      </View>

                      <View style={styles.completedJobServices}>
                        {servicioNames.length > 0 ? (
                          servicioNames.slice(0, 2).map((servicioName, idx) => (
                            <View key={idx} style={styles.completedJobServiceTag}>
                              <Ionicons name="construct-outline" size={14} color={colors.primary?.[500] || '#003459'} />
                              <Text style={styles.completedJobServiceText} numberOfLines={1}>
                                {servicioName}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.completedJobServiceText}>Servicio realizado</Text>
                        )}
                        {servicioNames.length > 2 && (
                          <Text style={styles.completedJobMoreServices}>
                            +{servicioNames.length - 2} más
                          </Text>
                        )}
                      </View>

                      {precioTotal > 0 && (
                        <View style={styles.completedJobPrice}>
                          <Text style={styles.completedJobPriceLabel}>Total:</Text>
                          <Text style={styles.completedJobPriceValue}>
                            ${Math.round(precioTotal).toLocaleString('es-CL')}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.noJobsContainer}>
                <Ionicons
                  name="briefcase-outline"
                  size={48}
                  color={colors.text?.secondary || '#5D6F75'}
                />
                <Text style={styles.noJobsText}>
                  No hay trabajos realizados registrados
                </Text>
                <Text style={styles.noJobsSubtext}>
                  Los trabajos completados aparecerán aquí
                </Text>
              </View>
            )}
          </View>


        </ScrollContainer>

        {/* Modal de selección de vehículo */}
        <VehicleSelectionModal
          visible={showVehicleModal}
          onClose={handleCloseVehicleModal}
          onVehicleSelected={handleVehicleSelected}
          servicio={selectedServiceForBooking}
          proveedor={provider}
          type={type}
          title="Selecciona tu vehículo"
          subtitle="Para continuar con el agendamiento"
        />

      </SafeAreaView>
    </View>
  );
};

// Función para crear estilos dinámicos basados en el tema
const createStyles = (colors, typography, spacing, borders) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.default || '#F8F9FA',
    // Específico para web: permitir scroll vertical
    ...(Platform.OS === 'web' && {
      height: '100vh',
      overflow: 'hidden',
    }),
  },
  safeArea: {
    flex: 1,
    // Específico para web: asegurar altura completa
    ...(Platform.OS === 'web' && {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }),
  },
  scrollView: {
    flex: 1,
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
    color: colors.text?.secondary || '#666666',
  },
  headerContainer: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
  },
  headerImageContainer: {
    position: 'relative',
    height: 250,
  },
  headerImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral?.gray?.[200] || '#E5E5E5',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 50,
    paddingHorizontal: spacing.md || 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borders.radius?.avatar?.md || 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm || 12,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: borders.radius?.avatar?.md || 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: borders.radius?.avatar?.md || 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainInfoContainer: {
    padding: spacing.md || 20,
    backgroundColor: colors.background?.paper || '#FFFFFF',
  },
  // NUEVA SECCIÓN 1: Información Principal Profesional
  mainInfoProfessionalContainer: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    marginHorizontal: spacing.md || 16,
    marginTop: spacing.lg || 20,
    marginBottom: spacing.md || 12,
    borderRadius: borders.radius?.card?.lg || 16,
    padding: spacing.lg || 20,
    shadowColor: colors.base?.inkBlack || '#00171F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  mainInfoRow1: {
    marginBottom: spacing.md || 16,
  },
  providerNameAndLocationContainer: {
    flex: 1,
  },
  providerNameLarge: {
    fontSize: typography.fontSize?.['3xl'] || 28,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || colors.base?.inkBlack || '#00171F',
    marginBottom: spacing.sm || 8,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs || 4,
  },
  serviceZoneText: {
    fontSize: typography.fontSize?.base || 14,
    color: colors.text?.secondary || colors.neutral?.gray?.[700] || '#374151',
    marginLeft: spacing.xs || 6,
    flex: 1,
    fontWeight: typography.fontWeight?.medium || '500',
  },
  mainInfoRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md || 16,
    borderTopWidth: borders.width?.thin || 1,
    borderTopColor: colors.neutral?.gray?.[200] || '#E5E5E5',
    gap: spacing.sm || 10,
  },
  completedJobsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success?.[50] || '#ECFDF5',
    paddingHorizontal: spacing.sm || 10,
    paddingVertical: spacing.sm || 10,
    borderRadius: borders.radius?.badge?.full || 9999,
    flex: 1,
    minWidth: 0,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.success?.[200] || '#A7F3D0',
    gap: spacing.xs || 6,
  },
  completedJobsText: {
    fontSize: typography.fontSize?.sm || 14,
    color: colors.success?.[700] || '#047857',
    fontWeight: typography.fontWeight?.bold || '700',
    flexShrink: 1,
    numberOfLines: 1,
  },
  reviewsLink: {
    flexShrink: 1,
    minWidth: 0,
    flex: 1,
  },
  reviewsLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm || 10,
    paddingHorizontal: spacing.sm || 10,
    backgroundColor: colors.warning?.[50] || '#FFFBEB',
    borderRadius: borders.radius?.badge?.full || 9999,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.warning?.[200] || '#FDE68A',
    gap: spacing.xs || 6,
    minWidth: 0,
  },
  reviewsLinkText: {
    fontSize: typography.fontSize?.sm || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.warning?.[700] || '#B45309',
    flexShrink: 1,
    numberOfLines: 1,
  },
  nameAndRatingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  providerNameContainer: {
    flex: 0.8,
    marginRight: 10,
  },
  providerName: {
    fontSize: typography.fontSize?.['2xl'] || 24,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#333333',
    lineHeight: 28,
  },
  providerRatingContainer: {
    flex: 0.2,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  providerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background?.default || '#F8F9FA',
    borderRadius: borders.radius?.badge?.md || 12,
    paddingHorizontal: spacing.xs || 8,
    paddingVertical: spacing.xs || 4,
  },
  providerRatingText: {
    fontSize: typography.fontSize?.sm || 14,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || '#000000',
    marginLeft: spacing.xs || 4,
  },
  reviewsBadge: {
    marginTop: spacing.xs || 4,
    alignSelf: 'flex-end',
  },
  reviewsBadgeText: {
    fontSize: typography.fontSize?.xs || 10,
    fontWeight: typography.fontWeight?.medium || '500',
    color: colors.text?.secondary || '#666666',
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.xs || 6,
    paddingVertical: 2,
  },
  providerTypeBadge: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    borderRadius: borders.radius?.badge?.full || 9999,
    overflow: 'hidden',
    backgroundColor: colors.primary?.[500] || '#003459',
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.primary?.[400] || '#3397C1',
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.sm || 10,
    maxWidth: 200,
    shadowColor: colors.base?.inkBlack || '#00171F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  providerTypeText: {
    fontSize: typography.fontSize?.sm || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.base?.white || '#FFFFFF',
    letterSpacing: 0.3,
  },
  providerInfoSection: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    paddingVertical: spacing.md || 16,
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E5E5',
  },
  infoRowsContainer: {
    paddingHorizontal: spacing.md || 20,
  },
  infoRowWithIcon: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm || 12,
  },
  infoIconSimple: {
    marginRight: spacing.xs || 8,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || '#666666',
    fontWeight: typography.fontWeight?.medium || '500',
    marginBottom: spacing.xs || 4,
  },
  infoValue: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.primary || '#333333',
    fontWeight: typography.fontWeight?.regular || '400',
    lineHeight: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingValue: {
    fontSize: typography.fontSize?.sm || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#333333',
  },
  ratingCount: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || '#666666',
    marginLeft: spacing.xs || 4,
  },
  categoriesContainer: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    paddingVertical: spacing.md || 15,
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E5E5',
  },
  categoriesScrollContainer: {
    paddingHorizontal: spacing.md || 20,
  },
  brandsContainer: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    paddingVertical: spacing.md || 15,
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E5E5',
  },
  brandsScrollContainer: {
    paddingRight: spacing.sm || 12,
    paddingHorizontal: spacing.md || 20,
  },
  categoryPill: {
    paddingHorizontal: spacing.sm || 14,
    paddingVertical: spacing.xs || 8,
    borderRadius: borders.radius?.badge?.full || 18,
    backgroundColor: 'transparent',
    marginRight: spacing.sm || 10,
    borderWidth: 0,
  },
  categoryPillSelected: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  categoryPillText: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.primary || '#000000',
    fontWeight: typography.fontWeight?.bold || '700',
  },
  categoryPillTextSelected: {
    color: colors.text?.secondary || '#666666',
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  brandPill: {
    paddingHorizontal: spacing.sm || 14,
    paddingVertical: spacing.xs || 8,
    borderRadius: borders.radius?.badge?.full || 18,
    backgroundColor: 'transparent',
    marginRight: spacing.sm || 10,
    borderWidth: 0,
  },
  brandPillSelected: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  brandPillText: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.primary || '#000000',
    fontWeight: typography.fontWeight?.bold || '700',
  },
  brandPillTextSelected: {
    color: colors.text?.secondary || '#666666',
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  // NUEVO: Estilos unificados para filtros
  filtersUnifiedContainer: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    marginHorizontal: spacing.md || 16,
    marginTop: spacing.md || 16,
    marginBottom: spacing.sm || 8,
    borderRadius: borders.radius?.card?.md || 12,
    padding: spacing.md || 16,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md || 16,
  },
  filtersTitle: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs || 4,
    paddingHorizontal: spacing.sm || 8,
    paddingVertical: spacing.xs || 4,
  },
  clearFiltersText: {
    fontSize: typography.fontSize?.sm || 14,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.md || 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.sm || 10,
    borderRadius: borders.radius?.badge?.full || 9999,
    backgroundColor: colors.neutral?.gray?.[50] || '#F9FAFB',
    marginRight: spacing.sm || 10,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[300] || '#D1D5DB',
  },
  filterChipSelected: {
    backgroundColor: colors.primary?.[500] || '#003459',
    borderColor: colors.primary?.[500] || '#003459',
    shadowColor: colors.primary?.[500] || '#003459',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterChipText: {
    fontSize: typography.fontSize?.sm || 14,
    color: colors.text?.primary || colors.neutral?.gray?.[700] || '#374151',
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  filterChipTextSelected: {
    color: colors.base?.white || '#FFFFFF',
    fontWeight: typography.fontWeight?.bold || '700',
  },
  // ELIMINADO: Estilos antiguos de servicios (serviceCard antiguo, serviceHeader, serviceIcon, etc.)
  // Reemplazados por los nuevos estilos serviceCard, serviceCardImageContainer, etc.
  noServicesContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noServicesText: {
    marginTop: spacing.md || 16,
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.secondary || '#666666',
    textAlign: 'center',
  },
  // NUEVO: Estilos mejorados para cards de servicios
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.sm || 10,
  },
  serviceCard: {
    // Cálculo mejorado: Ancho total menos márgenes laterales de servicesSection (16*2) 
    // Dividido entre 2 cards, menos un pequeño gap implícito de space-between
    width: (screenWidth - (spacing.md || 16) * 2 - (spacing.sm || 10)) / 2,
    marginBottom: spacing.md || 16,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.card?.md || 12,
    overflow: 'hidden',
    shadowColor: colors.base?.inkBlack || '#00171F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#D7DFE3',
  },
  serviceCardInfo: {
    padding: spacing.md || 14,
    flex: 1,
    justifyContent: 'space-between',
  },
  serviceCardTitle: {
    fontSize: typography.fontSize?.base || 15,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || colors.base?.inkBlack || '#00171F',
    marginBottom: spacing.sm || 8,
    lineHeight: typography.fontSize?.base ? typography.fontSize.base * 1.35 : 20.25,
    minHeight: 40, // Para 2 líneas
  },
  serviceCardCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.neutral?.gray?.[100] || '#EBEFF1',
    paddingHorizontal: spacing.xs || 6,
    paddingVertical: 2,
    borderRadius: borders.radius?.badge?.sm || 6,
    marginBottom: spacing.sm || 10,
  },
  serviceCardCategoryText: {
    fontSize: typography.fontSize?.xs || 10,
    fontWeight: typography.fontWeight?.medium || '500',
    color: colors.text?.secondary || colors.neutral?.gray?.[600] || '#7C8F97',
    letterSpacing: 0.1,
  },
  serviceCardPriceSection: {
    marginTop: 'auto',
    paddingTop: spacing.xs || 6,
  },
  serviceCardPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs || 6,
  },
  serviceCardPrice: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.primary?.[500] || '#003459',
    letterSpacing: -0.3,
  },
  serviceCardOldPrice: {
    fontSize: typography.fontSize?.xs || 11,
    color: colors.text?.secondary || '#5D6F75',
    textDecorationLine: 'line-through',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  serviceCardPricePlaceholder: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || '#5D6F75',
    fontStyle: 'italic',
  },
  serviceCardDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  serviceCardDurationText: {
    fontSize: typography.fontSize?.xs || 10,
    color: colors.text?.secondary || colors.neutral?.gray?.[600] || '#7C8F97',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  // Sección de servicios sin contenedor (para mejor uso del espacio)
  servicesSection: {
    marginHorizontal: spacing.md || 16,
    marginTop: spacing.md || 16,
    marginBottom: spacing.xs || 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm || 10,
    paddingHorizontal: 0,
  },
  servicesCount: {
    fontSize: typography.fontSize?.base || 15,
    color: colors.text?.secondary || colors.neutral?.gray?.[600] || '#7C8F97',
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  // Filtros inline dentro de la sección de servicios
  filtersContainerInline: {
    marginBottom: spacing.md || 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearFiltersButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm || 8,
    paddingVertical: spacing.xs || 4,
    marginLeft: spacing.sm || 10,
    gap: spacing.xs || 4,
  },
  discountBadge: {
    position: 'absolute',
    left: spacing.sm || 10,
    bottom: spacing.sm || 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9E7C7',
    borderRadius: borders.radius?.badge?.md || 16,
    paddingHorizontal: spacing.xs || 8,
    paddingVertical: spacing.xs || 4,
  },
  discountText: {
    marginLeft: spacing.xs || 4,
    color: '#6B4F00',
    fontSize: typography.fontSize?.xs || 12,
    fontWeight: typography.fontWeight?.bold || '700',
  },
  cardTitle: {
    fontSize: typography.fontSize?.sm || 13,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#000000',
    marginBottom: spacing.xs || 4,
    lineHeight: 16,
    maxHeight: 32,
  },
  cardPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs || 4,
  },
  cardPrice: {
    fontSize: typography.fontSize?.sm || 13,
    fontWeight: typography.fontWeight?.regular || '400',
    color: colors.text?.primary || '#333333',
    flex: 1,
  },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs || 6,
  },
  cardRatingText: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || '#666666',
    fontWeight: typography.fontWeight?.regular || '400',
    marginLeft: 3,
  },
  cardCategory: {
    fontSize: typography.fontSize?.xs || 11,
    color: colors.text?.secondary || '#777777',
    lineHeight: 13,
    fontStyle: 'italic',
    marginTop: 2,
  },
  cardOldPrice: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || '#8E8E93',
    textDecorationLine: 'line-through',
  },
  updatedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs || 4,
    paddingHorizontal: spacing.xs || 6,
    paddingVertical: 2,
    backgroundColor: '#F0F8F0',
    borderRadius: borders.radius?.button?.sm || 8,
    alignSelf: 'flex-start',
  },
  updatedText: {
    fontSize: typography.fontSize?.xs || 10,
    color: colors.success?.[500] || '#28a745',
    fontWeight: typography.fontWeight?.semibold || '600',
    marginLeft: spacing.xs || 4,
  },
  sectionContainer: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    marginHorizontal: spacing.md || 16,
    marginTop: spacing.lg || 20,
    marginBottom: spacing.md || 12,
    borderRadius: borders.radius?.card?.lg || 16,
    padding: spacing.lg || 20,
    shadowColor: colors.base?.inkBlack || '#00171F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  sectionContainerCompact: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    marginHorizontal: spacing.md || 16,
    marginTop: spacing.md || 12,
    marginBottom: spacing.sm || 8,
    borderRadius: borders.radius?.card?.md || 12,
    padding: spacing.md || 16,
    shadowColor: colors.base?.inkBlack || '#00171F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  sectionTitle: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || colors.base?.inkBlack || '#00171F',
    marginBottom: spacing.md || 16,
  },
  sectionTitleCompact: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || colors.base?.inkBlack || '#00171F',
    marginBottom: spacing.sm || 12,
  },
  brandPillCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary?.[50] || '#E6F5F9',
    paddingHorizontal: spacing.md || 14,
    paddingVertical: spacing.sm || 8,
    borderRadius: borders.radius?.badge?.full || 9999,
    marginRight: spacing.sm || 10,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.secondary?.[300] || '#66C3DB',
    shadowColor: colors.secondary?.[500] || '#007EA7',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  brandPillTextCompact: {
    fontSize: typography.fontSize?.sm || 13,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.secondary?.[700] || '#004C65',
    marginLeft: spacing.xs || 6,
    letterSpacing: 0.2,
  },
  aboutText: {
    fontSize: typography.fontSize?.base || 15,
    color: colors.text?.primary || colors.neutral?.gray?.[700] || '#5D6F75',
    lineHeight: 24,
    fontWeight: typography.fontWeight?.regular || '400',
  },
  documentsList: {
    gap: spacing.sm || 12,
  },
  documentsListCompact: {
    gap: spacing.xs || 8,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background?.default || '#F8F9FA',
    padding: spacing.md || 16,
    borderRadius: borders.radius?.button?.sm || 8,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E5E5',
  },
  documentsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm || 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success?.[50] || '#E6F7F4',
    paddingHorizontal: spacing.sm || 10,
    paddingVertical: spacing.xs || 6,
    borderRadius: borders.radius?.badge?.full || 9999,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.success?.[200] || '#99DFD3',
    gap: spacing.xs || 4,
  },
  verifiedBadgeText: {
    fontSize: typography.fontSize?.xs || 12,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.success?.[700] || '#007965',
  },
  documentCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background?.default || colors.neutral?.gray?.[50] || '#F5F7F8',
    padding: spacing.md || 14,
    borderRadius: borders.radius?.card?.md || 12,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#D7DFE3',
    marginBottom: spacing.xs || 6,
  },
  documentApprovedIcon: {
    marginLeft: spacing.sm || 8,
  },
  documentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borders.radius?.avatar?.md || 24,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md || 16,
  },
  documentInfo: {
    flex: 1,
    marginRight: spacing.sm || 12,
  },
  documentInfoCompact: {
    flex: 1,
  },
  documentName: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || '#333333',
    marginBottom: spacing.xs || 4,
  },
  documentNameCompact: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || colors.base?.inkBlack || '#00171F',
  },
  documentFileName: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || '#666666',
  },
  noDocumentsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl || 32,
  },
  noDocumentsText: {
    fontSize: typography.fontSize?.base || 14,
    color: colors.text?.secondary || '#666666',
    marginTop: spacing.sm || 12,
    textAlign: 'center',
  },
  servicesByBrandSection: {
    marginBottom: spacing.xl || 32,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md || 16,
    paddingBottom: spacing.sm || 12,
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E5E5',
  },
  brandHeaderText: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#333333',
    marginLeft: spacing.xs || 6,
    flex: 1,
  },
  servicesCount: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || '#666666',
    marginLeft: spacing.xs || 6,
  },
  // Estilos para sección "Mis Trabajos"
  completedJobsHorizontal: {
    paddingVertical: spacing?.sm || 8,
    paddingLeft: spacing?.md || 16,
    paddingRight: spacing?.md || 16,
    alignItems: 'flex-start',
  },
  completedJobCard: {
    width: 280,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.card?.md || 12,
    padding: spacing.md || 16,
    marginRight: spacing.md || 16,
    shadowColor: colors.base?.inkBlack || '#00171F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  completedJobHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm || 12,
  },
  completedJobIconContainer: {
    marginRight: spacing.sm || 10,
    marginTop: spacing.xs || 2,
  },
  completedJobHeaderContent: {
    flex: 1,
  },
  completedJobVehicle: {
    fontSize: typography.fontSize?.base || 16,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginBottom: spacing.xs || 4,
  },
  completedJobDate: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  completedJobServices: {
    marginBottom: spacing.sm || 10,
    gap: spacing.xs || 6,
  },
  completedJobServiceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary?.[50] || '#E6F2F7',
    paddingHorizontal: spacing.sm || 10,
    paddingVertical: spacing.xs || 6,
    borderRadius: borders.radius?.badge?.sm || 8,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs || 4,
    gap: spacing.xs || 6,
  },
  completedJobServiceText: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.primary?.[700] || '#002A47',
    fontWeight: typography.fontWeight?.semibold || '600',
    flex: 1,
  },
  completedJobMoreServices: {
    fontSize: typography.fontSize?.xs || 11,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
    fontStyle: 'italic',
  },
  completedJobPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm || 10,
    borderTopWidth: borders.width?.thin || 1,
    borderTopColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  completedJobPriceLabel: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  completedJobPriceValue: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.primary?.[500] || '#003459',
  },
  loadingJobsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg || 32,
    gap: spacing.sm || 10,
  },
  loadingJobsText: {
    fontSize: typography.fontSize?.sm || 14,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  noJobsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl || 48,
    paddingHorizontal: spacing.md || 16,
  },
  noJobsText: {
    fontSize: typography.fontSize?.base || 16,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || '#00171F',
    marginTop: spacing.md || 16,
    textAlign: 'center',
  },
  noJobsSubtext: {
    fontSize: typography.fontSize?.sm || 14,
    color: colors.text?.secondary || '#5D6F75',
    marginTop: spacing.xs || 6,
    textAlign: 'center',
  },
});

export default ProviderDetailScreen;
