import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, ROUTES } from '../../utils/constants';
import VehicleHealthService from '../../services/vehicleHealthService';
import { getMediaURL } from '../../services/api';
import * as userService from '../../services/user';
import websocketService from '../../services/websocketService';

const VehicleHealthCard = ({ vehicle, navigation }) => {
  const [healthData, setHealthData] = useState(null);
  const [serviceCount, setServiceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [vehicleImageUrl, setVehicleImageUrl] = useState(null);

  useEffect(() => {
    loadVehicleData();
  }, [vehicle?.id]);

  // Listener de WebSocket para actualizaciones de salud
  useEffect(() => {
    if (!vehicle?.id) return;

    const handleHealthUpdate = (message) => {
      if (message.type === 'salud_vehiculo_actualizada' && 
          message.vehicle_id && 
          message.vehicle_id.toString() === vehicle.id.toString()) {
        console.log('🔄 [VehicleHealthCard] Actualización de salud recibida, recargando datos...');
        
        // Invalidar cache y recargar
        VehicleHealthService.invalidateCache(vehicle.id);
        loadVehicleData();
      }
    };

    // Registrar handler
    websocketService.onMessage('salud_vehiculo_actualizada', handleHealthUpdate);

    // Cleanup
    return () => {
      websocketService.offMessage('salud_vehiculo_actualizada', handleHealthUpdate);
    };
  }, [vehicle?.id]);

  const loadVehicleData = async () => {
    if (!vehicle?.id) return;

    try {
      setLoading(true);

      // Cargar salud del vehículo
      try {
        const health = await VehicleHealthService.getVehicleHealth(vehicle.id);
        setHealthData(health);
      } catch (error) {
        console.warn('Error cargando salud del vehículo:', error);
      }

      // Cargar cantidad de servicios realizados
      try {
        const history = await userService.getServicesHistory();
        const rawSolicitudes = Array.isArray(history?.results)
          ? history.results
          : Array.isArray(history)
          ? history
          : [];
        
        // Filtrar servicios completados del vehículo
        const vehicleServices = rawSolicitudes.filter(
          (solicitud) =>
            solicitud.vehiculo_detail?.id?.toString() === vehicle.id.toString() ||
            solicitud.vehiculo?.toString() === vehicle.id.toString()
        );
        
        // Contar solo servicios completados
        const completedServices = vehicleServices.filter(
          s => s.estado === 'completado'
        );
        
        setServiceCount(completedServices.length);
        console.log(`📊 Vehículo ${vehicle.id}: ${completedServices.length} servicios completados de ${vehicleServices.length} total`);
      } catch (error) {
        console.warn('Error cargando historial de servicios:', error);
        setServiceCount(0);
      }

      // Cargar imagen del vehículo
      if (vehicle.foto) {
        try {
          // Si la foto ya viene como URL completa del servidor, usarla directamente
          if (vehicle.foto.startsWith('http://') || vehicle.foto.startsWith('https://')) {
            setVehicleImageUrl(vehicle.foto);
            console.log(`📸 [VehicleHealthCard] Vehículo ${vehicle.id} - URI de imagen desde servidor: ${vehicle.foto}`);
          } else {
            // Si viene como ruta relativa, construir URL completa
            const imageUrl = await getMediaURL(vehicle.foto);
            setVehicleImageUrl(imageUrl);
            console.log(`📸 [VehicleHealthCard] Vehículo ${vehicle.id} - URI de imagen construida: ${imageUrl}`);
          }
        } catch (error) {
          console.warn(`Error cargando imagen del vehículo ${vehicle.id}:`, error);
        }
      } else {
        console.log(`⚠️ [VehicleHealthCard] Vehículo ${vehicle.id} - No tiene foto`);
      }
    } catch (error) {
      console.error('Error cargando datos del vehículo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardPress = () => {
    if (vehicle?.id) {
      navigation.navigate(ROUTES.VEHICLE_HEALTH, {
        vehicleId: vehicle.id,
        vehicle,
      });
    }
  };

  const getHealthColor = (percentage) => {
    if (!percentage) return '#9E9E9E';
    if (percentage >= 70) return '#4CAF50';
    if (percentage >= 40) return '#FF9800';
    if (percentage >= 20) return '#F44336';
    return '#D32F2F';
  };

  const hasUrgentAlerts = healthData?.tiene_alertas_activas || 
    (healthData?.componentes_urgentes > 0) || 
    (healthData?.componentes_criticos > 0);

  const healthPercentage = healthData?.salud_general_porcentaje || 0;
  const healthColor = getHealthColor(healthPercentage);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handleCardPress}
      activeOpacity={0.9}
    >
      {/* Sección de imagen (65% de la altura) */}
      <View style={styles.imageSection}>
        {/* Imagen del vehículo o placeholder */}
        {vehicleImageUrl ? (
          <Image
            source={{ uri: vehicleImageUrl }}
            style={styles.vehicleImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.vehicleImagePlaceholder}>
            <Ionicons name="car-sport" size={56} color="#9E9E9E" />
          </View>
        )}

        {/* Gradiente oscuro en la parte inferior de la imagen para mejorar legibilidad del texto */}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.6)']}
          style={styles.imageGradient}
        />

        {/* Texto sobre la imagen - Superior izquierda */}
        <View style={styles.imageOverlayText}>
          <Text style={styles.vehicleNameOnImage}>
            {vehicle?.marca_nombre || vehicle?.marca} {vehicle?.modelo_nombre || vehicle?.modelo}
          </Text>
          <Text style={styles.vehicleYearOnImage}>{vehicle?.year || 'N/A'}</Text>
        </View>

        {/* Gradiente oscuro en la parte superior para mejorar legibilidad del texto */}
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.2)', 'transparent']}
          style={styles.topGradient}
        />

        {/* Icono de alerta flotante - Superior derecha */}
        {hasUrgentAlerts && (
          <View style={styles.alertBadge}>
            <Ionicons name="warning" size={20} color="#F44336" />
            {(healthData?.componentes_urgentes > 0 || healthData?.componentes_criticos > 0) && (
              <View style={styles.alertDot} />
            )}
          </View>
        )}
      </View>

      {/* Sección de información (35% de la altura) - Fondo blanco */}
      <View style={styles.infoSection}>
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="speedometer-outline" size={16} color="#9E9E9E" />
            <Text style={styles.detailText}>
              {vehicle?.kilometraje?.toLocaleString() || 0} km
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="construct-outline" size={16} color="#9E9E9E" />
            <Text style={styles.detailText}>
              {serviceCount} {serviceCount === 1 ? 'servicio' : 'servicios'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="heart" size={16} color={healthColor} />
            <Text style={[styles.detailText, { color: healthColor, fontWeight: '600' }]}>
              {Math.round(healthPercentage)}%
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 0,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  imageSection: {
    width: '100%',
    height: 200, // Reducido de 260px - aproximadamente 65% de 310px
    backgroundColor: '#E5E5E5',
    position: 'relative',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
  },
  vehicleImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E5E5',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  imageOverlayText: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 5,
  },
  vehicleNameOnImage: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c2434',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 3,
  },
  vehicleYearOnImage: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    zIndex: 1,
  },
  alertBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  alertDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F44336',
  },
  infoSection: {
    width: '100%',
    minHeight: 110, // Reducido de 140px - aproximadamente 35% de 310px
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: '#9E9E9E',
    marginLeft: 5,
    fontWeight: '500',
  },
});

export default VehicleHealthCard;
