import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import ProviderModal from '../modals/ProviderModal';
import { formatCurrency } from '../../utils/format';

/**
 * Componente para mostrar la lista de proveedores (talleres o mecánicos)
 */
const ProvidersList = ({
  providers = [],
  type = 'taller', // 'taller' o 'mecanico'
  title = 'Proveedores disponibles',
  onProviderSelect = null,
  showAsModal = true
}) => {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleProviderPress = (provider) => {
    setSelectedProvider(provider);

    if (showAsModal) {
      setModalVisible(true);
    } else if (onProviderSelect) {
      onProviderSelect(provider);
    }
  };

  const renderProviderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.providerItem}
      onPress={() => handleProviderPress(item)}
    >
      {item.foto ? (
        <Image
          source={{ uri: item.foto }}
          style={styles.providerImage}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.providerImage, styles.defaultImageContainer]}>
          <MaterialIcons
            name={type === 'taller' ? 'build' : 'person'}
            size={30}
            color="#4C669F"
          />
        </View>
      )}

      <View style={styles.providerInfo}>
        <Text style={styles.providerName}>{item.nombre}</Text>

        {/* Información específica según el tipo de proveedor */}
        {type === 'taller' && (item.direccion_fisica?.direccion_completa || item.direccion) && (
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={16} color="#777" />
            <Text style={styles.infoText} numberOfLines={1}>{item.direccion_fisica?.direccion_completa || item.direccion}</Text>
          </View>
        )}

        {item.telefono && (
          <View style={styles.infoRow}>
            <MaterialIcons name="phone" size={16} color="#777" />
            <Text style={styles.infoText}>{item.telefono}</Text>
          </View>
        )}

        {/* Servicio y precio si están disponibles */}
        {item.servicio_nombre && (
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceTitle}>{item.servicio_nombre}</Text>
            <Text style={styles.servicePrice}>
              {formatCurrency(item.precio_sin_repuestos)}
            </Text>
          </View>
        )}

        {/* Calificación */}
        <View style={styles.ratingContainer}>
          <FontAwesome name="star" size={14} color="#FFD700" />
          <Text style={styles.ratingText}>
            {item.calificacion_promedio ? item.calificacion_promedio.toFixed(1) : '0.0'}
          </Text>
        </View>
      </View>

      <MaterialIcons name="chevron-right" size={24} color="#aaa" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}

      {providers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name={type === 'taller' ? 'build' : 'person'}
            size={50}
            color="#ddd"
          />
          <Text style={styles.emptyText}>
            {`No se encontraron ${type === 'taller' ? 'talleres' : 'mecánicos'} disponibles`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={providers}
          renderItem={renderProviderItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Modal para mostrar detalles del proveedor seleccionado */}
      {showAsModal && (
        <ProviderModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          provider={selectedProvider}
          type={type}
          servicio={selectedProvider && {
            nombre: selectedProvider.servicio_nombre,
            id: selectedProvider.servicio_id
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  listContent: {
    paddingBottom: 20,
  },
  providerItem: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  providerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  defaultImageContainer: {
    backgroundColor: '#F2F6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 5,
    flex: 1,
  },
  serviceInfo: {
    marginTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceTitle: {
    fontSize: 14,
    color: '#3498db',
    flex: 1,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  ratingText: {
    fontSize: 14,
    color: '#777',
    marginLeft: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});

export default ProvidersList; 