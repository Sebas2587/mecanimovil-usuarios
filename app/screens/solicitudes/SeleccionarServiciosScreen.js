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
import ServiceCard from '../../components/cards/ServiceCard';
import Button from '../../components/base/Button/Button';
import solicitudesService from '../../services/solicitudesService';

/**
 * Pantalla para seleccionar servicios sugeridos para una solicitud
 */
const SeleccionarServiciosScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { solicitudId } = route.params || {};

  const [serviciosSugeridos, setServiciosSugeridos] = useState([]);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarServiciosSugeridos();
  }, [solicitudId]);

  const cargarServiciosSugeridos = async () => {
    if (!solicitudId) {
      Alert.alert('Error', 'No se encontró la solicitud');
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);
      const respuesta = await solicitudesService.obtenerServiciosSugeridos(solicitudId);
      const servicios = respuesta.servicios_sugeridos || respuesta || [];
      setServiciosSugeridos(servicios);
    } catch (error) {
      console.error('Error cargando servicios sugeridos:', error);
      Alert.alert('Error', 'No se pudieron cargar los servicios sugeridos');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const toggleServicio = (servicio) => {
    const servicioId = servicio.id;
    if (serviciosSeleccionados.includes(servicioId)) {
      setServiciosSeleccionados(serviciosSeleccionados.filter(id => id !== servicioId));
    } else {
      setServiciosSeleccionados([...serviciosSeleccionados, servicioId]);
    }
  };

  const handleConfirmar = async () => {
    if (serviciosSeleccionados.length === 0) {
      Alert.alert('Atención', 'Debes seleccionar al menos un servicio');
      return;
    }

    setProcesando(true);
    try {
      // Agregar servicios a la solicitud
      await solicitudesService.agregarServiciosASolicitud(solicitudId, serviciosSeleccionados);
      
      // Publicar la solicitud
      await solicitudesService.publicarSolicitud(solicitudId);
      
      Alert.alert(
        'Éxito',
        'Solicitud publicada correctamente. Los proveedores podrán ver tu solicitud y hacer ofertas.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate(ROUTES.MIS_SOLICITUDES);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error confirmando servicios:', error);
      const mensaje = error.response?.data?.detail || error.message || 'No se pudo publicar la solicitud';
      Alert.alert('Error', mensaje);
    } finally {
      setProcesando(false);
    }
  };

  const renderServicio = (servicio) => {
    const isSelected = serviciosSeleccionados.includes(servicio.id);
    
    return (
      <TouchableOpacity
        key={servicio.id}
        style={[
          styles.servicioContainer,
          isSelected && styles.servicioSeleccionado
        ]}
        onPress={() => toggleServicio(servicio)}
        activeOpacity={0.7}
      >
        <View style={styles.servicioContent}>
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
          
          <View style={styles.servicioInfo}>
            <Text style={styles.servicioNombre}>{servicio.nombre}</Text>
            {servicio.descripcion && (
              <Text style={styles.servicioDescripcion} numberOfLines={2}>
                {servicio.descripcion}
              </Text>
            )}
            {servicio.precio_base && (
              <Text style={styles.servicioPrecio}>
                Desde ${parseInt(servicio.precio_base).toLocaleString()}
              </Text>
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
          <Text style={styles.loadingText}>Cargando servicios sugeridos...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Seleccionar Servicios</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Contador */}
      <View style={styles.contadorContainer}>
        <Text style={styles.contadorText}>
          {serviciosSeleccionados.length} de {serviciosSugeridos.length} servicios seleccionados
        </Text>
      </View>

      {/* Lista de servicios */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {serviciosSugeridos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="construct-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No hay servicios sugeridos</Text>
            <Text style={styles.emptyText}>
              No se encontraron servicios compatibles con tu vehículo y descripción
            </Text>
          </View>
        ) : (
          <View style={styles.serviciosList}>
            {serviciosSugeridos.map(servicio => renderServicio(servicio))}
          </View>
        )}
      </ScrollView>

      {/* Botón confirmar */}
      <View style={styles.actionsContainer}>
        <Button
          title={`Confirmar (${serviciosSeleccionados.length})`}
          onPress={handleConfirmar}
          disabled={serviciosSeleccionados.length === 0 || procesando}
          style={styles.confirmButton}
          icon="checkmark-circle-outline"
        />
      </View>

      {procesando && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.processingText}>Publicando solicitud...</Text>
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
  serviciosList: {
    gap: SPACING.sm
  },
  servicioContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.borderLight
  },
  servicioSeleccionado: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F7FF'
  },
  servicioContent: {
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
  servicioInfo: {
    flex: 1
  },
  servicioNombre: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs
  },
  servicioDescripcion: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SPACING.xs
  },
  servicioPrecio: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary
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

export default SeleccionarServiciosScreen;

