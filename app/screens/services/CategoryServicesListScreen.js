import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from '../../utils/constants';
import { useTheme } from '../../design-system/theme/useTheme';
import SimpleServiceCard from '../../components/cards/SimpleServiceCard';
import { getServicesByCategoryWithProviders } from '../../services/categories';
import * as vehicleService from '../../services/vehicle';

/**
 * Pantalla simple que muestra una lista de servicios de una categoría específica
 * El usuario selecciona un servicio y es dirigido al flujo de agendamiento/solicitud
 */
const CategoryServicesListScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, borders } = useTheme();

  // Parámetros de la ruta
  const { categoria, categoryId, categoryName } = route.params || {};

  // Estados
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [servicios, setServicios] = useState([]);
  const [error, setError] = useState(null);
  const [vehiculosMarcas, setVehiculosMarcas] = useState([]);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadInitialData();
  }, []);

  /**
   * Carga inicial de datos: primero marcas, luego servicios
   */
  const loadInitialData = async () => {
    try {
      // Primero cargar marcas de vehículos
      const vehiculos = await vehicleService.getUserVehicles();
      const vehiculosArray = Array.isArray(vehiculos) 
        ? vehiculos 
        : vehiculos?.results || [];

      // Extraer IDs de marcas únicos
      const marcasIds = [...new Set(vehiculosArray.map(v => v.marca))].filter(Boolean);
      setVehiculosMarcas(marcasIds);
      
      console.log('✅ Marcas de vehículos cargadas:', marcasIds);

      // Luego cargar servicios con esas marcas
      await loadServiciosConMarcas(marcasIds);
    } catch (error) {
      console.error('❌ Error en carga inicial:', error);
      setError('Error al cargar los datos. Intenta de nuevo.');
      setLoading(false);
    }
  };

  /**
   * Carga los servicios usando las marcas del estado
   */
  const loadServicios = async () => {
    await loadServiciosConMarcas(vehiculosMarcas);
  };

  /**
   * Carga los servicios de la categoría con marcas específicas
   */
  const loadServiciosConMarcas = async (marcasIds) => {
    try {
      setLoading(true);
      setError(null);

      // Validar que tengamos el ID de categoría
      const catId = categoryId || categoria?.id;
      if (!catId) {
        throw new Error('No se proporcionó ID de categoría');
      }

      console.log('🔍 Cargando servicios de categoría:', catId, 'para marcas:', marcasIds);

      // Obtener servicios agrupados por proveedor
      const result = await getServicesByCategoryWithProviders(catId, marcasIds);

      // Combinar servicios de talleres y mecánicos en una sola lista
      const serviciosTalleres = result.talleres || [];
      const serviciosMecanicos = result.mecanicos || [];
      const todosLosServicios = [...serviciosTalleres, ...serviciosMecanicos];

      // Eliminar duplicados basándose en el ID del servicio base
      const serviciosUnicos = todosLosServicios.reduce((acc, servicio) => {
        const servicioId = servicio.servicio || servicio.id;
        
        // Si ya existe un servicio con este ID, mantener el que tenga más información
        const existente = acc.find(s => (s.servicio || s.id) === servicioId);
        if (!existente) {
          acc.push(servicio);
        } else {
          // Si el nuevo tiene más información (ej: más proveedores), reemplazarlo
          const indexExistente = acc.indexOf(existente);
          acc[indexExistente] = servicio;
        }
        
        return acc;
      }, []);

      console.log('✅ Servicios únicos cargados:', serviciosUnicos.length);
      setServicios(serviciosUnicos);

      // Si no hay servicios, mostrar mensaje informativo
      if (serviciosUnicos.length === 0) {
        console.log('⚠️ No se encontraron servicios para esta categoría');
        setError('No hay servicios disponibles en esta categoría para tus vehículos');
      }

    } catch (error) {
      console.error('❌ Error cargando servicios:', error);
      setError(error.message || 'Error al cargar los servicios');
      
      // Mostrar alerta solo si es un error crítico
      if (error.message && !error.message.includes('No se proporcionó')) {
        Alert.alert(
          'Error',
          'No se pudieron cargar los servicios. Por favor, intenta nuevamente.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el pull-to-refresh
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadServicios();
    setRefreshing(false);
  }, [vehiculosMarcas]);

  /**
   * Maneja la selección de un servicio
   * Navega al flujo de creación de solicitud con el servicio preseleccionado
   */
  const handleServicePress = (servicio) => {
    try {
      if (!servicio) {
        console.warn('⚠️ Servicio no válido seleccionado');
        return;
      }

      console.log('📋 Servicio seleccionado para solicitud:', servicio.nombre);

      // Preparar datos del servicio para la solicitud
      const servicioParaSolicitud = {
        id: servicio.servicio || servicio.id,
        nombre: servicio.nombre || servicio.servicio_info?.nombre,
        descripcion: servicio.descripcion || servicio.servicio_info?.descripcion,
        categoria_id: categoryId || categoria?.id,
        categoria_nombre: categoryName || categoria?.nombre,
        tipo_servicio: servicio.tipo_servicio,
        precio_referencia: servicio.precio_con_repuestos || servicio.precio_sin_repuestos
      };

      // Navegar a la pantalla de crear solicitud con el servicio preseleccionado
      try {
        navigation.navigate('TabNavigator', {
          screen: ROUTES.CREAR_SOLICITUD,
          params: {
            servicioPreseleccionado: servicioParaSolicitud,
            categoriaId: categoryId || categoria?.id,
            categoriaNombre: categoryName || categoria?.nombre,
            fromCategory: true,
          },
        });
        console.log('✅ Navegación exitosa a CREAR_SOLICITUD con servicio preseleccionado desde categoría');
      } catch (error) {
        console.error('❌ Error navegando a CREAR_SOLICITUD:', error);
        // Fallback: intentar navegación directa
        navigation.navigate(ROUTES.CREAR_SOLICITUD, {
          servicioPreseleccionado: servicioParaSolicitud,
          categoriaId: categoryId || categoria?.id,
          categoriaNombre: categoryName || categoria?.nombre,
          fromCategory: true,
        });
      }

    } catch (error) {
      console.error('❌ Error al seleccionar servicio:', error);
      Alert.alert(
        'Error',
        'No se pudo procesar el servicio seleccionado. Intenta nuevamente.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Renderiza un item de servicio en la lista
   */
  const renderServiceItem = ({ item }) => (
    <SimpleServiceCard
      service={item}
      onPress={handleServicePress}
    />
  );

  // Estilos dinámicos con tema
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background?.default || '#F8F9FA',
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing?.lg || 20,
    },
    listContent: {
      padding: spacing?.md || 16,
      paddingBottom: spacing?.xl || 32,
    },
    loadingText: {
      marginTop: spacing?.md || 16,
      fontSize: typography.fontSize?.md || 16,
      color: colors.text?.secondary || '#5D6F75',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing?.lg || 20,
    },
    errorIconContainer: {
      width: 80,
      height: 80,
      borderRadius: borders.radius?.full || 40,
      backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing?.md || 16,
    },
    errorTitle: {
      fontSize: typography.fontSize?.lg || 18,
      fontWeight: typography.fontWeight?.semibold || '600',
      color: colors.text?.primary || '#00171F',
      marginBottom: spacing?.sm || 8,
      textAlign: 'center',
    },
    errorText: {
      fontSize: typography.fontSize?.sm || 14,
      color: colors.text?.secondary || '#5D6F75',
      textAlign: 'center',
      marginBottom: spacing?.lg || 24,
      paddingHorizontal: spacing?.lg || 20,
      lineHeight: 22,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary?.[500] || '#003459',
      paddingHorizontal: spacing?.lg || 24,
      paddingVertical: spacing?.md || 12,
      borderRadius: borders.radius?.full || 24,
      gap: spacing?.sm || 8,
      shadowColor: colors.primary?.[500] || '#003459',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    retryButtonText: {
      color: colors.base?.pureWhite || '#FFFFFF',
      fontSize: typography.fontSize?.md || 16,
      fontWeight: typography.fontWeight?.semibold || '600',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing?.xxl || 60,
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: borders.radius?.full || 40,
      backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing?.md || 16,
    },
    emptyText: {
      fontSize: typography.fontSize?.md || 16,
      color: colors.text?.secondary || '#5D6F75',
      textAlign: 'center',
      paddingHorizontal: spacing?.xl || 40,
      lineHeight: 24,
    },
  });

  /**
   * Renderiza el estado de carga
   */
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary?.[500] || '#003459'} />
        <Text style={styles.loadingText}>Cargando servicios...</Text>
      </View>
    );
  }

  /**
   * Renderiza el estado de error
   */
  if (error && servicios.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background?.default || '#FFFFFF'} />
        
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons 
              name="alert-circle-outline" 
              size={40} 
              color={colors.text?.secondary || '#5D6F75'} 
            />
          </View>
          <Text style={styles.errorTitle}>Sin servicios disponibles</Text>
          <Text style={styles.errorText}>{error}</Text>
          
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadServicios}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color={colors.base?.pureWhite || '#FFFFFF'} />
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background?.default || '#FFFFFF'} />

      <FlatList
        data={servicios}
        renderItem={renderServiceItem}
        keyExtractor={(item, index) => `${item.id || item.servicio}-${index}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary?.[500] || '#003459'}
            colors={[colors.primary?.[500] || '#003459']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons 
                name="folder-open-outline" 
                size={40} 
                color={colors.text?.secondary || '#5D6F75'} 
              />
            </View>
            <Text style={styles.emptyText}>
              No hay servicios disponibles en esta categoría
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default CategoryServicesListScreen;
