import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import Card from '../base/Card/Card';
import Avatar from '../base/Avatar/Avatar';


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

// ... (imports remain the same)

export default VehicleHistoryCard;

/**
 * VehicleServiceHistoryRow
 * 
 * Enhanced visual representation of a service history item for the Marketplace.
 * Used in MarketplaceVehicleDetailScreen.
 * 
 * @param {Object} item - Service history item
 * @param {Function} onViewChecklist - Callback for clicking the checklist button
 */
export const VehicleServiceHistoryRow = ({ item, onViewChecklist }) => {
  // Data Mapping for Real DB Fields

  // Check if item has oferta details (common in Solicitud objects)
  // The 'item' here is likely a completed Solicitud from the history
  const oferta = item.oferta_seleccionada_detail || item.oferta_seleccionada || {};

  // 1. Provider Type & Info
  // The backend usually provides 'tipo_proveedor' in the offer or flat on the item
  const providerType = item.tipo_proveedor || item.provider_type || oferta.tipo_proveedor || (item.taller ? 'taller' : 'mecanico');

  // Name - Checking all possible locations including nested Offer
  let providerName = 'Proveedor';
  if (item.nombre_proveedor) providerName = item.nombre_proveedor;
  else if (oferta.nombre_proveedor) providerName = oferta.nombre_proveedor;
  else if (oferta.proveedor_nombre) providerName = oferta.proveedor_nombre;
  else if (item.provider_name) providerName = item.provider_name;
  else if (item.taller_nombre) providerName = item.taller_nombre;
  else if (item.mecanico_nombre) providerName = item.mecanico_nombre;
  else if (item.taller?.nombre) providerName = item.taller.nombre;
  else if (item.mecanico?.nombre) providerName = item.mecanico.nombre;
  else if (item.provider?.name) providerName = item.provider.name;

  // Avatar/Photo
  // Check flat fields -> Offer fields -> Nested Objects
  let providerAvatar = null;
  if (item.proveedor_foto) providerAvatar = item.proveedor_foto;
  else if (oferta.proveedor_foto) providerAvatar = oferta.proveedor_foto;
  else if (oferta.foto_proveedor) providerAvatar = oferta.foto_proveedor; // variation
  else if (item.provider_avatar) providerAvatar = item.provider_avatar;
  else if (item.taller_logo) providerAvatar = item.taller_logo;
  else if (item.mecanico_foto) providerAvatar = item.mecanico_foto;
  else if (providerType === 'taller') {
    providerAvatar = item.taller?.logo || item.logo || item.provider?.logo || oferta.taller?.logo;
  } else {
    providerAvatar = item.mecanico?.foto_perfil || item.foto_perfil || item.provider?.avatar || oferta.mecanico?.foto_perfil;
  }

  // 2. Service Name
  // Check flat -> Offer details -> Line Items -> Generic
  const serviceName = item.servicio_nombre ||
    item.service_name ||
    item.nombre_servicio ||
    (oferta.detalles_servicios && oferta.detalles_servicios[0]?.servicio_nombre) ||
    (oferta.detalles_servicios && oferta.detalles_servicios[0]?.nombre) ||
    (item.lineas && item.lineas[0]?.servicio_nombre) ||
    (item.lineas && item.lineas[0]?.nombre) ||
    (item.line_items && item.line_items[0]?.service_name) ||
    item.service?.nombre ||
    'Servicio General';

  const mileage = item.kilometraje ? `${item.kilometraje.toLocaleString()} km` : (item.mileage || '0 km');

  // Date Formatting
  const dateObj = item.fecha_servicio ? new Date(item.fecha_servicio) : (item.date ? new Date(item.date) : new Date());

  const dateStr = dateObj.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <View style={historyStyles.rowContainer}>
      {/* Header: Provider Avatar + Name + Date */}
      <View style={historyStyles.header}>
        <View style={historyStyles.providerInfo}>
          <Avatar
            source={providerAvatar}
            name={providerName}
            size="sm"
            variant="circular"
            style={{ marginRight: 10 }}
          />
          <View>
            <Text style={historyStyles.providerName}>{providerName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={historyStyles.dateText}>{dateStr}</Text>
              <View style={historyStyles.dotSeparator} />
              <Text style={historyStyles.providerType}>
                {providerType === 'taller' ? 'Taller' : 'Mecánico a Domicilio'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Body: Service & Mileage */}
      <View style={historyStyles.body}>
        <View style={historyStyles.infoRow}>
          <View style={historyStyles.iconBox}>
            <Ionicons name="construct" size={16} color={COLORS.primary} />
          </View>
          <View>
            <Text style={historyStyles.label}>Servicio Realizado</Text>
            <Text style={historyStyles.value}>{serviceName}</Text>
          </View>
        </View>

        <View style={[historyStyles.infoRow, { marginTop: 12 }]}>
          <View style={[historyStyles.iconBox, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="speedometer" size={16} color="#D97706" />
          </View>
          <View>
            <Text style={historyStyles.label}>Kilometraje Checklist</Text>
            <Text style={historyStyles.value}>{mileage}</Text>
          </View>
        </View>
      </View>

      {/* Footer: Checklist Button */}
      {/* Always show if we have an ID to query, typically 'id' is the orden_id */}
      <TouchableOpacity
        style={historyStyles.checklistButton}
        onPress={() => onViewChecklist && onViewChecklist(item)}
      >
        <Text style={historyStyles.checklistButtonText}>Ver Checklist del Servicio</Text>
        <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
};

const historyStyles = StyleSheet.create({
  rowContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#9CA3AF',
    marginHorizontal: 6,
    marginTop: 2,
  },
  providerType: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  body: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 52, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  label: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  checklistButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: 'rgba(0, 52, 89, 0.02)',
  },
  checklistButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 13,
    marginRight: 4,
  }
}); 