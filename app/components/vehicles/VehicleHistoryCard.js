import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import Card from '../base/Card/Card';

const VehicleHistoryCard = ({ vehiculo, solicitudes, onPress }) => {
  const completados = solicitudes.filter(s => s.estado === 'completado').length;
  const cancelados = solicitudes.filter(s => ['cancelado', 'devolucion_procesada'].includes(s.estado)).length;
  const totalGastado = solicitudes
    .filter(s => s.estado === 'completado')
    .reduce((sum, s) => sum + parseFloat(s.total || 0), 0);

  const ultimoServicio = solicitudes
    .filter(s => s.estado === 'completado')
    .sort((a, b) => new Date(b.fecha_servicio) - new Date(a.fecha_servicio))[0];

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Card style={styles.container}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {/* Header del vehículo */}
        <View style={styles.vehicleHeader}>
          <View style={styles.vehicleInfo}>
            <Ionicons name="car" size={24} color={COLORS.primary} />
            <View style={styles.vehicleDetails}>
              <Text style={styles.vehicleName}>
                {vehiculo.marca_nombre} {vehiculo.modelo_nombre}
              </Text>
              <Text style={styles.vehicleSubtitle}>
                {vehiculo.year} • {vehiculo.patente}
              </Text>
            </View>
          </View>
          <View style={styles.totalServicesContainer}>
            <Text style={styles.totalServicesNumber}>{solicitudes.length}</Text>
            <Text style={styles.totalServicesLabel}>servicios</Text>
          </View>
        </View>

        {/* Estadísticas */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#28A745' }]}>{completados}</Text>
            <Text style={styles.statLabel}>Completados</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#DC3545' }]}>{cancelados}</Text>
            <Text style={styles.statLabel}>Cancelados</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: COLORS.primary }]}>
              ${totalGastado.toLocaleString('es-CL')}
            </Text>
            <Text style={styles.statLabel}>Total Gastado</Text>
          </View>
        </View>

        {/* Último servicio */}
        {ultimoServicio && (
          <View style={styles.lastServiceContainer}>
            <View style={styles.lastServiceHeader}>
              <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.lastServiceTitle}>Último servicio:</Text>
            </View>
            <Text style={styles.lastServiceDate}>
              {formatearFecha(ultimoServicio.fecha_servicio)}
            </Text>
            {ultimoServicio.lineas && ultimoServicio.lineas.length > 0 && (
              <Text style={styles.lastServiceName}>
                {ultimoServicio.lineas[0].servicio_nombre || ultimoServicio.lineas[0].nombre}
              </Text>
            )}
          </View>
        )}

        {/* Indicador de ver más */}
        <View style={styles.viewMoreContainer}>
          <Text style={styles.viewMoreText}>Ver historial completo</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </View>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    padding: 16,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vehicleDetails: {
    marginLeft: 12,
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  vehicleSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  totalServicesContainer: {
    alignItems: 'center',
  },
  totalServicesNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  totalServicesLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.lightGray,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  lastServiceContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  lastServiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  lastServiceTitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  lastServiceDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  lastServiceName: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  viewMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  viewMoreText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: 4,
  },
});

export default VehicleHistoryCard; 