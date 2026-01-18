import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { getProvidersByVehiculo } from '../../services/providers';
import ProvidersList from '../../components/providers/ProvidersList';

/**
 * Pantalla para mostrar proveedores (talleres y mecánicos) asociados al modelo del vehículo
 */
const VehicleProvidersScreen = ({ route, navigation }) => {
  const { vehiculo } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState({ talleres: [], mecanicos: [] });
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('talleres'); // 'talleres' o 'mecanicos'

  useEffect(() => {
    if (!vehiculo || !vehiculo.id) {
      setError('No se especificó un vehículo válido');
      setLoading(false);
      return;
    }
    
    // Configurar título de la pantalla con marca y modelo del vehículo
    navigation.setOptions({
      title: `${vehiculo.marca_nombre || 'Vehículo'} ${vehiculo.modelo_nombre || ''}`
    });
    
    loadProviders();
  }, [vehiculo]);

  // Función para cargar los proveedores
  const loadProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getProvidersByVehiculo(vehiculo.id);
      setProviders(result);
      
      // Si no hay proveedores, mostrar un mensaje
      if (result.talleres.length === 0 && result.mecanicos.length === 0) {
        setError(`No se encontraron proveedores para ${vehiculo.marca_nombre} ${vehiculo.modelo_nombre}`);
      } else if (result.talleres.length === 0 && activeTab === 'talleres') {
        // Si no hay talleres pero hay mecánicos, cambiar a la pestaña de mecánicos
        setActiveTab('mecanicos');
      }
      
    } catch (err) {
      console.error('Error al cargar proveedores:', err);
      setError('Ocurrió un error al cargar los proveedores. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar pestañas para seleccionar entre talleres y mecánicos
  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity 
        style={[
          styles.tabButton, 
          activeTab === 'talleres' && styles.activeTabButton
        ]}
        onPress={() => setActiveTab('talleres')}
      >
        <MaterialIcons 
          name="build" 
          size={20} 
          color={activeTab === 'talleres' ? '#3498db' : '#777'} 
        />
        <Text 
          style={[
            styles.tabText, 
            activeTab === 'talleres' && styles.activeTabText
          ]}
        >
          Talleres ({providers.talleres.length})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.tabButton, 
          activeTab === 'mecanicos' && styles.activeTabButton
        ]}
        onPress={() => setActiveTab('mecanicos')}
      >
        <MaterialIcons 
          name="person" 
          size={20} 
          color={activeTab === 'mecanicos' ? '#3498db' : '#777'} 
        />
        <Text 
          style={[
            styles.tabText, 
            activeTab === 'mecanicos' && styles.activeTabText
          ]}
        >
          Mecánicos ({providers.mecanicos.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Contenido principal de la pantalla
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Cargando proveedores...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={50} color="#e74c3c" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProviders}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.contentContainer}>
        {renderTabs()}
        
        {activeTab === 'talleres' ? (
          <ProvidersList
            providers={providers.talleres}
            type="taller"
            title={`Talleres para ${vehiculo.marca_nombre} ${vehiculo.modelo_nombre}`}
          />
        ) : (
          <ProvidersList
            providers={providers.mecanicos}
            type="mecanico"
            title={`Mecánicos para ${vehiculo.marca_nombre} ${vehiculo.modelo_nombre}`}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#777',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3498db',
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
    backgroundColor: '#fff',
  },
  tabText: {
    marginLeft: 5,
    color: '#777',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3498db',
    fontWeight: 'bold',
  },
});

export default VehicleProvidersScreen; 