import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  ScrollView,
  Dimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../utils/constants';
import SolicitudCard from '../../components/solicitudes/SolicitudCard';
import { useSolicitudes } from '../../context/SolicitudesContext';
import CustomHeader from '../../components/navigation/Header/Header';
import { useTheme } from '../../design-system/theme/useTheme';

/**
 * Pantalla que muestra todas las solicitudes del usuario
 */
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MisSolicitudesScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
  
  const {
    solicitudes,
    solicitudesActivas,
    loading,
    error,
    cargarSolicitudes,
    cargarSolicitudesActivas
  } = useSolicitudes();

  const [refreshing, setRefreshing] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const scrollViewRef = useRef(null);
  const tabWidths = useRef({});

  // Estados simplificados y reorganizados para mejor UX
  // Algunos filtros agrupan múltiples estados del backend
  const estadosDisponibles = [
    { key: 'todos', label: 'Todas', icon: 'list-outline' },
    { key: 'activas', label: 'Activas', icon: 'flash-outline' },         // publicada, con_ofertas, adjudicada, pendiente_pago
    { key: 'en_proceso', label: 'En Proceso', icon: 'construct-outline' }, // pagada, en_ejecucion
    { key: 'completada', label: 'Completadas', icon: 'checkmark-done-circle-outline' }, // completada
    { key: 'historial', label: 'Historial', icon: 'time-outline' },       // expirada, cancelada
  ];

  // Mapeo de filtros a estados del backend
  const filtroAEstados = {
    todos: null, // Sin filtro, muestra todo
    activas: ['publicada', 'con_ofertas', 'adjudicada', 'pendiente_pago', 'creada', 'seleccionando_servicios'],
    en_proceso: ['pagada', 'en_ejecucion'],
    completada: ['completada'],
    historial: ['expirada', 'cancelada'],
  };

  // Desplazar ScrollView cuando cambia el filtro seleccionado
  useEffect(() => {
    const selectedIndex = estadosDisponibles.findIndex(item => item.key === filtroEstado);
    if (selectedIndex !== -1 && scrollViewRef.current) {
      setTimeout(() => {
        // Calcular la posición acumulada de los tabs anteriores
        let totalX = (spacing.md || 16) + 4; // Padding del contenedor + padding del tabContainer
        
        for (let i = 0; i < selectedIndex; i++) {
          const tabWidth = tabWidths.current[i] || 95;
          totalX += tabWidth + 4; // Ancho del tab + margin
        }
        
        // Añadir la mitad del tab seleccionado
        const selectedTabWidth = tabWidths.current[selectedIndex] || 95;
        const tabCenterX = totalX + (selectedTabWidth / 2);
        
        // Desplazar para centrar el tab en la pantalla
        const scrollX = tabCenterX - (SCREEN_WIDTH / 2);
        scrollViewRef.current?.scrollTo({
          x: Math.max(0, scrollX),
          animated: true,
        });
      }, 200);
    }
  }, [filtroEstado]);

  // Cargar solicitudes al montar y cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const cargarDatos = async () => {
    try {
      await Promise.all([
        cargarSolicitudes(),
        cargarSolicitudesActivas()
      ]);
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await cargarDatos();
    } catch (error) {
      console.error('Error refrescando:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Asegurar que solicitudes sea siempre un array
  const solicitudesArray = Array.isArray(solicitudes) ? solicitudes : [];
  
  // Filtrar según el tab seleccionado (puede ser un grupo de estados)
  const solicitudesFiltradas = filtroEstado === 'todos'
    ? solicitudesArray
    : solicitudesArray.filter(s => {
        if (!s || !s.estado) return false;
        const estadosPermitidos = filtroAEstados[filtroEstado];
        return estadosPermitidos && estadosPermitidos.includes(s.estado);
      });

  const handleSolicitudPress = (solicitud) => {
    console.log('MisSolicitudesScreen: handleSolicitudPress llamado con:', {
      tieneSolicitud: !!solicitud,
      tipo: typeof solicitud,
      keys: solicitud ? Object.keys(solicitud).slice(0, 10) : [],
      id: solicitud?.id,
      propertiesId: solicitud?.properties?.id,
      tieneProperties: !!solicitud?.properties
    });
    
    // Asegurar que tenemos un ID válido
    // El ID puede estar en solicitud.id (después de normalización) o en solicitud.properties.id (si aún no está normalizado)
    const id = solicitud?.id || solicitud?.properties?.id;
    
    if (!id) {
      console.error('MisSolicitudesScreen: No se pudo obtener el ID de la solicitud');
      console.error('MisSolicitudesScreen: Estructura completa:', JSON.stringify(solicitud, null, 2));
      Alert.alert('Error', 'No se pudo identificar la solicitud');
      return;
    }
    
    console.log('MisSolicitudesScreen: Navegando a detalle con solicitudId:', id);
    navigation.navigate(ROUTES.DETALLE_SOLICITUD, { solicitudId: id });
  };

  // Renderizar header interno SIEMPRE (será nuestro header principal)
  const renderInternalHeader = () => {
    return (
      <CustomHeader 
        title="Mis Solicitudes"
        showBack={false}
        showProfile={true}
      />
    );
  };
  
  // Header de navegación ahora es manejado por CustomHeader (externo o interno)
  const renderFilters = () => (
    <View style={styles.filtersWrapper}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabScrollContent}
        style={styles.tabScrollView}
      >
        <View style={styles.tabContainer}>
          {estadosDisponibles.map((item, index) => {
            const isSelected = filtroEstado === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.tab,
                  isSelected && styles.tabActive
                ]}
                onPress={() => setFiltroEstado(item.key)}
                onLayout={(event) => {
                  const { width } = event.nativeEvent.layout;
                  tabWidths.current[index] = width;
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    isSelected && styles.tabTextActive
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  // Mensajes personalizados para cada filtro
  const mensajesVacios = {
    todos: {
      titulo: 'No tienes solicitudes',
      subtitulo: 'Crea una nueva solicitud para recibir ofertas de proveedores'
    },
    activas: {
      titulo: 'No tienes solicitudes activas',
      subtitulo: 'Las solicitudes publicadas y con ofertas aparecerán aquí'
    },
    en_proceso: {
      titulo: 'No tienes servicios en proceso',
      subtitulo: 'Los servicios pagados y en ejecución aparecerán aquí'
    },
    completada: {
      titulo: 'No tienes servicios completados',
      subtitulo: 'Los servicios finalizados exitosamente aparecerán aquí'
    },
    historial: {
      titulo: 'No tienes historial',
      subtitulo: 'Las solicitudes expiradas o canceladas aparecerán aquí'
    }
  };

  const renderEmptyState = () => {
    const mensajeActual = mensajesVacios[filtroEstado] || mensajesVacios.todos;
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons 
          name={filtroEstado === 'completada' ? 'trophy-outline' : 'document-text-outline'} 
          size={80} 
          color={colors.text?.secondary || '#5D6F75'} 
        />
        <Text style={styles.emptyTitle}>{mensajeActual.titulo}</Text>
        <Text style={styles.emptySubtitle}>{mensajeActual.subtitulo}</Text>
      {filtroEstado === 'todos' && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => {
            // IMPORTANTE: CREAR_SOLICITUD está en el TabNavigator, necesitamos usar navegación anidada
            try {
              navigation.navigate('TabNavigator', {
                screen: ROUTES.CREAR_SOLICITUD,
                params: {},
              });
            } catch (error) {
              console.error('❌ Error navegando a CREAR_SOLICITUD:', error);
              // Fallback: intentar navegación directa
              navigation.navigate(ROUTES.CREAR_SOLICITUD);
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Crear Solicitud</Text>
        </TouchableOpacity>
      )}
    </View>
    );
  };

  const renderSolicitud = ({ item }) => (
    <View style={styles.cardWrapper}>
      <SolicitudCard
        solicitud={item}
        onPress={handleSolicitudPress}
        fullWidth={true}
      />
    </View>
  );

  const renderItemSeparator = () => (
    <View style={styles.separator} />
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background?.paper || '#FFFFFF'} />
        {renderInternalHeader()}
        <SafeAreaView style={styles.safeContent} edges={['left', 'right', 'bottom']}>
          {renderFilters()}
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary?.[500] || '#003459'} />
            <Text style={styles.loadingText}>Cargando solicitudes...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background?.paper || '#FFFFFF'} />
      {renderInternalHeader()}
      <SafeAreaView style={styles.safeContent} edges={['left', 'right', 'bottom']}>
      
        <FlatList
          data={solicitudesFiltradas}
          keyExtractor={(item) => item.id}
          renderItem={renderSolicitud}
          ItemSeparatorComponent={renderItemSeparator}
          ListHeaderComponent={renderFilters}
          ListEmptyComponent={!loading && renderEmptyState}
          contentContainerStyle={[
            styles.listContent,
            solicitudesFiltradas.length === 0 && styles.listContentEmpty
          ]}
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

          {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.error?.[500] || '#EF4444'} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
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
  filtersWrapper: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    paddingVertical: spacing.sm || 12,
    paddingBottom: spacing.md || 16,
  },
  tabScrollView: {
    flexGrow: 0,
  },
  tabScrollContent: {
    paddingHorizontal: spacing.md || 16,
    flexGrow: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
    borderRadius: borders.radius?.button?.full || 30,
    padding: spacing.xs || 4,
    alignItems: 'center',
    minWidth: '100%',
    gap: spacing.xs || 4,
  },
  tab: {
    paddingVertical: spacing.sm || 10,
    paddingHorizontal: spacing.md || 16,
    borderRadius: borders.radius?.button?.lg || 26,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
    flexShrink: 0,
  },
  tabActive: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: typography.fontSize?.sm || 13,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.secondary || '#5D6F75',
    letterSpacing: 0.2,
  },
  tabTextActive: {
    color: colors.text?.primary || '#00171F',
    fontWeight: typography.fontWeight?.bold || '700',
  },
  listContent: {
    paddingTop: spacing.md || 16,
    paddingBottom: spacing.xl || 32,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  cardWrapper: {
    width: '100%',
    paddingHorizontal: spacing.md || 16,
  },
  separator: {
    height: spacing.md || 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md || 16,
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
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
    marginTop: spacing.lg || 24,
    marginBottom: spacing.sm || 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.secondary || '#5D6F75',
    textAlign: 'center',
    marginBottom: spacing.lg || 24,
    lineHeight: typography.fontSize?.md ? typography.fontSize.md * 1.4 : 22,
    fontWeight: typography.fontWeight?.regular || '400',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary?.[500] || '#003459',
    paddingHorizontal: spacing.lg || 24,
    paddingVertical: spacing.md || 16,
    borderRadius: borders.radius?.button?.md || 12,
    gap: spacing.sm || 8,
    shadowColor: colors.primary?.[500] || '#003459',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  errorContainer: {
    position: 'absolute',
    bottom: spacing.lg || 24,
    left: spacing.md || 16,
    right: spacing.md || 16,
    backgroundColor: colors.error?.[50] || '#FEF2F2',
    padding: spacing.md || 16,
    borderRadius: borders.radius?.card?.md || 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm || 8,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.error?.[200] || '#FECACA',
  },
  errorText: {
    color: colors.error?.[600] || '#DC2626',
    fontSize: typography.fontSize?.base || 14,
    flex: 1,
    fontWeight: typography.fontWeight?.medium || '500',
  },
});

export default MisSolicitudesScreen;

