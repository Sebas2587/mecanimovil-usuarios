import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../utils/constants';
import solicitudesService from '../../services/solicitudesService';
import { useTheme } from '../../design-system/theme/useTheme';
import SolicitudCard from '../../components/solicitudes/SolicitudCard';

/**
 * Pantalla de Historial de Solicitudes Completadas de un Vehículo
 * Muestra solo las solicitudes completadas que tuvieron ofertas pagadas
 */
const VehicleHistoryScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const vehicleId = route.params?.vehicleId;
  const initialVehicle = route.params?.vehicle || null;
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

  const [vehicle, setVehicle] = useState(initialVehicle);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSolicitudesCompletadas = useCallback(async () => {
    if (!vehicleId) {
      setSolicitudes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Cargar solicitudes con estado 'completada'
      const response = await solicitudesService.obtenerMisSolicitudes({ estado: 'completada' });
      
      // Normalizar la respuesta
      let solicitudesArray = [];
      if (Array.isArray(response)) {
        solicitudesArray = response;
      } else if (response?.results) {
        solicitudesArray = response.results;
      } else if (response?.features) {
        solicitudesArray = response.features.map(f => ({ ...f.properties, id: f.id || f.properties?.id }));
      }

      // Filtrar:
      // 1. Por vehículo
      // 2. Solo las que tienen oferta seleccionada (fueron pagadas)
      // 3. Estado completada
      const filteredSolicitudes = solicitudesArray.filter((solicitud) => {
        const vehiculoId = solicitud.vehiculo?.id || solicitud.vehiculo_detail?.id || solicitud.vehiculo;
        const tieneOfertaSeleccionada = solicitud.oferta_seleccionada || solicitud.oferta_seleccionada_detail;
        const esCompletada = solicitud.estado === 'completada';
        
        return vehiculoId?.toString() === vehicleId.toString() && 
               tieneOfertaSeleccionada && 
               esCompletada;
      });

      console.log('📋 Solicitudes completadas con ofertas pagadas:', filteredSolicitudes.length);
      setSolicitudes(filteredSolicitudes);

      // Si no tenemos info del vehículo, obtenerla de la primera solicitud
      if (!initialVehicle && filteredSolicitudes[0]) {
        const vehiculoData = filteredSolicitudes[0].vehiculo_detail || filteredSolicitudes[0].vehiculo;
        if (vehiculoData && typeof vehiculoData === 'object') {
          setVehicle(vehiculoData);
        }
      }
    } catch (err) {
      console.error('Error cargando solicitudes completadas:', err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId, initialVehicle]);

  useEffect(() => {
    fetchSolicitudesCompletadas();
  }, [fetchSolicitudesCompletadas]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSolicitudesCompletadas();
    setRefreshing(false);
  }, [fetchSolicitudesCompletadas]);

  // Navegar al detalle de la solicitud
  const handleSolicitudPress = useCallback((solicitud) => {
    navigation.navigate(ROUTES.DETALLE_SOLICITUD, {
      solicitudId: solicitud.id,
    });
  }, [navigation]);

  // Estado vacío
  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color={colors.text?.tertiary || '#9CA3AF'} />
      <Text style={styles.emptyTitle}>Sin solicitudes completadas</Text>
      <Text style={styles.emptySubtitle}>
        Cuando completes solicitudes para este vehículo, aparecerán aquí.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        activeOpacity={0.7}
        onPress={() => {
          try {
            navigation.navigate('TabNavigator', {
              screen: ROUTES.CREAR_SOLICITUD,
              params: {},
            });
          } catch (error) {
            navigation.navigate(ROUTES.CREAR_SOLICITUD);
          }
        }}
      >
        <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>Crear solicitud</Text>
      </TouchableOpacity>
    </View>
  );

  // Header con título del vehículo
  const ListHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.vehicleTitle}>
        {vehicle?.marca_nombre || vehicle?.marca || ''} {vehicle?.modelo_nombre || vehicle?.modelo || ''} • {vehicle?.patente || ''}
      </Text>
      {solicitudes.length > 0 && (
        <Text style={styles.sectionSubtitle}>
          {solicitudes.length} {solicitudes.length === 1 ? 'solicitud completada' : 'solicitudes completadas'}
        </Text>
      )}
    </View>
  );

  // Renderizar cada solicitud usando SolicitudCard
  const renderSolicitud = ({ item }) => (
    <View style={styles.cardWrapper}>
      <SolicitudCard
        solicitud={item}
        onPress={() => handleSolicitudPress(item)}
        fullWidth={true}
      />
    </View>
  );

  // Estado de carga
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header de navegación */}
        <View style={styles.navHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text?.primary || '#00171F'} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Historial</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary?.[500] || '#003459'} />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header de navegación */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text?.primary || '#00171F'} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Historial</Text>
        <View style={styles.backButton} />
      </View>

      {/* Lista de solicitudes completadas */}
      <FlatList
        data={solicitudes}
        keyExtractor={(item) => `solicitud-${item.id}`}
        renderItem={renderSolicitud}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary?.[500] || '#003459']}
            tintColor={colors.primary?.[500] || '#003459'}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

// Función para crear estilos dinámicos basados en el tema
const createStyles = (colors, typography, spacing, borders) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  
  // Header de navegación
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing?.md || 16,
    paddingVertical: spacing?.sm || 12,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing?.md || 16,
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.secondary || '#5D6F75',
  },
  
  // Lista
  listContent: {
    paddingBottom: spacing?.xl || 32,
  },
  
  // Header de lista
  listHeader: {
    paddingHorizontal: spacing?.md || 16,
    paddingTop: spacing?.md || 16,
    paddingBottom: spacing?.sm || 12,
  },
  
  // Título del vehículo
  vehicleTitle: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginBottom: spacing?.xs || 4,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize?.sm || 14,
    color: colors.text?.secondary || '#5D6F75',
  },
  
  // Card wrapper
  cardWrapper: {
    paddingHorizontal: spacing?.md || 16,
    marginBottom: spacing?.sm || 12,
  },
  
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing?.xl || 40,
    paddingVertical: spacing?.xl || 60,
  },
  emptyTitle: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    textAlign: 'center',
    marginTop: spacing?.md || 16,
    marginBottom: spacing?.sm || 8,
  },
  emptySubtitle: {
    fontSize: typography.fontSize?.md || 15,
    color: colors.text?.secondary || '#5D6F75',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing?.lg || 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary?.[500] || '#003459',
    borderRadius: borders.radius?.button?.md || 12,
    paddingHorizontal: spacing?.lg || 20,
    paddingVertical: spacing?.sm || 12,
    gap: spacing?.sm || 8,
  },
  emptyButtonText: {
    fontSize: typography.fontSize?.md || 15,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: '#FFFFFF',
  },
});

export default VehicleHistoryScreen;
