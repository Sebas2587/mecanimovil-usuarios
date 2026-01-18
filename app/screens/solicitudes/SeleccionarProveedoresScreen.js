import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDERS, ROUTES } from '../../utils/constants';
import ProviderCard from '../../components/cards/ProviderCard';
import Button from '../../components/base/Button/Button';
import { getProvidersByVehiculo } from '../../services/providers';
import solicitudesService from '../../services/solicitudesService';

/**
 * Pantalla para seleccionar proveedores específicos para una solicitud dirigida
 */
const SeleccionarProveedoresScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { solicitudId, vehiculo } = route.params || {};

  const [proveedores, setProveedores] = useState({ talleres: [], mecanicos: [] });
  const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('talleres');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (vehiculo && vehiculo.id) {
      cargarProveedores();
    } else {
      Alert.alert('Error', 'No se encontró el vehículo');
      navigation.goBack();
    }
  }, [vehiculo]);

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const resultado = await getProvidersByVehiculo(vehiculo.id);
      setProveedores(resultado);
      
      if (resultado.talleres.length === 0 && resultado.mecanicos.length === 0) {
        Alert.alert(
          'Sin proveedores',
          'No se encontraron proveedores que atiendan esta marca de vehículo. Puedes crear una solicitud global en su lugar.',
          [
            {
              text: 'Crear Global',
              onPress: () => {
                // Cambiar solicitud a global
                navigation.navigate(ROUTES.SELECCIONAR_SERVICIOS, { solicitudId });
              }
            },
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error cargando proveedores:', error);
      Alert.alert('Error', 'No se pudieron cargar los proveedores');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const toggleProveedor = (proveedor, tipo) => {
    const proveedorCompleto = {
      ...proveedor,
      tipo_proveedor: tipo,
      id: proveedor.usuario?.id || proveedor.id
    };

    const existe = proveedoresSeleccionados.find(p => p.id === proveedorCompleto.id);
    
    if (existe) {
      setProveedoresSeleccionados(proveedoresSeleccionados.filter(p => p.id !== proveedorCompleto.id));
    } else {
      if (proveedoresSeleccionados.length >= 3) {
        Alert.alert('Límite alcanzado', 'Solo puedes seleccionar hasta 3 proveedores');
        return;
      }
      setProveedoresSeleccionados([...proveedoresSeleccionados, proveedorCompleto]);
    }
  };

  const handleConfirmar = async () => {
    if (proveedoresSeleccionados.length === 0) {
      Alert.alert('Atención', 'Debes seleccionar al menos un proveedor');
      return;
    }

    setProcesando(true);
    try {
      // Extraer los IDs de usuario de los proveedores (el backend espera IDs de Usuario)
      const proveedoresIds = proveedoresSeleccionados.map(p => {
        // Prioridad: usuario_id > usuario.id > usuario > id
        return p.usuario_id || p.usuario?.id || (typeof p.usuario === 'number' ? p.usuario : null) || p.id;
      }).filter(id => id != null && typeof id === 'number'); // Solo IDs numéricos válidos
      
      console.log('SeleccionarProveedoresScreen: IDs de usuarios de proveedores:', proveedoresIds);
      
      // Actualizar solicitud con proveedores seleccionados (usando PATCH para actualización parcial)
      await solicitudesService.actualizarSolicitud(solicitudId, {
        proveedores_dirigidos: proveedoresIds
      });

      // Navegar a seleccionar servicios
      navigation.navigate(ROUTES.SELECCIONAR_SERVICIOS, { solicitudId });
    } catch (error) {
      console.error('Error confirmando proveedores:', error);
      const mensaje = error.response?.data?.detail || error.message || 'No se pudieron guardar los proveedores';
      Alert.alert('Error', mensaje);
    } finally {
      setProcesando(false);
    }
  };

  const renderProveedor = (proveedor, tipo) => {
    const proveedorCompleto = {
      ...proveedor,
      tipo_proveedor: tipo,
      id: proveedor.usuario?.id || proveedor.id
    };
    const isSelected = proveedoresSeleccionados.some(p => p.id === proveedorCompleto.id);

    return (
      <TouchableOpacity
        key={proveedorCompleto.id}
        style={[
          styles.proveedorContainer,
          isSelected && styles.proveedorSeleccionado
        ]}
        onPress={() => toggleProveedor(proveedor, tipo)}
        activeOpacity={0.7}
      >
        <View style={styles.proveedorContent}>
          <View style={styles.checkboxContainer}>
            <View style={[
              styles.checkbox,
              isSelected && styles.checkboxSelected
            ]}>
              {isSelected && (
                <Ionicons name="checkmark" size={20} color={COLORS.white} />
              )}
            </View>
          </View>
          
          <View style={styles.proveedorInfo}>
            <Text style={styles.proveedorNombre}>
              {String(proveedor.nombre || proveedor.usuario?.nombre || proveedor.usuario?.username || 'Sin nombre')}
            </Text>
            {(proveedor.direccion || proveedor.direccion_fisica?.direccion_completa) && (
              <Text style={styles.proveedorDireccion} numberOfLines={1}>
                {String(proveedor.direccion_fisica?.direccion_completa || proveedor.direccion || '')}
              </Text>
            )}
            {proveedor.calificacion_promedio != null && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color={COLORS.warning} />
                <Text style={styles.ratingText}>
                  {Number(proveedor.calificacion_promedio).toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando proveedores...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const proveedoresActuales = activeTab === 'talleres' ? proveedores.talleres : proveedores.mecanicos;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seleccionar Proveedores</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Contador */}
      <View style={styles.contadorContainer}>
        <Text style={styles.contadorText}>
          {proveedoresSeleccionados.length} de 3 proveedores seleccionados
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'talleres' && styles.tabActive]}
          onPress={() => setActiveTab('talleres')}
        >
          <Ionicons 
            name="business-outline" 
            size={20} 
            color={activeTab === 'talleres' ? COLORS.primary : COLORS.textLight} 
          />
          <Text style={[styles.tabText, activeTab === 'talleres' && styles.tabTextActive]}>
            Talleres ({proveedores.talleres.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mecanicos' && styles.tabActive]}
          onPress={() => setActiveTab('mecanicos')}
        >
          <Ionicons 
            name="person-outline" 
            size={20} 
            color={activeTab === 'mecanicos' ? COLORS.primary : COLORS.textLight} 
          />
          <Text style={[styles.tabText, activeTab === 'mecanicos' && styles.tabTextActive]}>
            Mecánicos ({proveedores.mecanicos.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de proveedores */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {proveedoresActuales.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={activeTab === 'talleres' ? 'business-outline' : 'person-outline'} 
              size={64} 
              color={COLORS.textLight} 
            />
            <Text style={styles.emptyTitle}>
              No hay {activeTab === 'talleres' ? 'talleres' : 'mecánicos'} disponibles
            </Text>
            <Text style={styles.emptyText}>
              No se encontraron {activeTab === 'talleres' ? 'talleres' : 'mecánicos'} que atiendan esta marca de vehículo
            </Text>
          </View>
        ) : (
          <View style={styles.proveedoresList}>
            {proveedoresActuales.map(proveedor => renderProveedor(proveedor, activeTab === 'talleres' ? 'taller' : 'mecanico'))}
          </View>
        )}
      </ScrollView>

      {/* Botón confirmar */}
      <View style={styles.actionsContainer}>
        <Button
          title={`Continuar (${proveedoresSeleccionados.length})`}
          onPress={handleConfirmar}
          disabled={proveedoresSeleccionados.length === 0 || procesando}
          style={styles.confirmButton}
          icon="checkmark-circle-outline"
        />
      </View>

      {procesando && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.processingText}>Guardando proveedores...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  backButton: {
    padding: SPACING.xs
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center'
  },
  placeholder: {
    width: 40
  },
  contadorContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  contadorText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center'
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabActive: {
    borderBottomColor: COLORS.primary
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight
  },
  tabTextActive: {
    color: COLORS.primary
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: SPACING.md
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.textLight
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center'
  },
  proveedoresList: {
    gap: SPACING.sm
  },
  proveedorContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.borderLight
  },
  proveedorSeleccionado: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F7FF'
  },
  proveedorContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkboxContainer: {
    marginRight: SPACING.md
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: BORDERS.radius.sm,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  proveedorInfo: {
    flex: 1
  },
  proveedorNombre: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs
  },
  proveedorDireccion: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SPACING.xs
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text
  },
  actionsContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  confirmButton: {
    width: '100%'
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  processingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600'
  }
});

export default SeleccionarProveedoresScreen;

