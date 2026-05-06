import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getProvidersByVehiculo } from '../../services/providers';
import ProvidersList from '../../components/providers/ProvidersList';
import { COLORS } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';

/**
 * Pantalla para mostrar proveedores (talleres y mecánicos) asociados al modelo del vehículo
 */
const VehicleProvidersScreen = ({ route, navigation }) => {
  const { vehiculo } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState({ talleres: [], mecanicos: [] });
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('talleres');

  useEffect(() => {
    if (!vehiculo || !vehiculo.id) {
      setError('No se especificó un vehículo válido');
      setLoading(false);
      return;
    }

    navigation.setOptions({
      title: `${vehiculo.marca_nombre || 'Vehículo'} ${vehiculo.modelo_nombre || ''}`
    });

    loadProviders();
  }, [vehiculo]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getProvidersByVehiculo(vehiculo.id);
      setProviders(result);

      if (result.talleres.length === 0 && result.mecanicos.length === 0) {
        setError(`No se encontraron proveedores para ${vehiculo.marca_nombre} ${vehiculo.modelo_nombre}`);
      } else if (result.talleres.length === 0 && activeTab === 'talleres') {
        setActiveTab('mecanicos');
      }

    } catch (err) {
      console.error('Error al cargar proveedores:', err);
      setError('Ocurrió un error al cargar los proveedores. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'talleres' && styles.activeTabButton]}
        onPress={() => setActiveTab('talleres')}
      >
        <MaterialIcons
          name="build"
          size={20}
          color={activeTab === 'talleres' ? COLORS.primary[500] : COLORS.text.tertiary}
        />
        <Text style={[styles.tabText, activeTab === 'talleres' && styles.activeTabText]}>
          Talleres ({providers.talleres.length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'mecanicos' && styles.activeTabButton]}
        onPress={() => setActiveTab('mecanicos')}
      >
        <MaterialIcons
          name="person"
          size={20}
          color={activeTab === 'mecanicos' ? COLORS.primary[500] : COLORS.text.tertiary}
        />
        <Text style={[styles.tabText, activeTab === 'mecanicos' && styles.activeTabText]}>
          Mecánicos ({providers.mecanicos.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text style={styles.loadingText}>Cargando proveedores...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={50} color={COLORS.error[500]} />
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
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
  },
  errorText: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.error[600],
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary[500],
    borderRadius: BORDERS.radius.button.md,
  },
  retryButtonText: {
    color: COLORS.text.inverse,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  contentContainer: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
    backgroundColor: COLORS.background.default,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.neutral.gray[100],
    gap: SPACING.xxs,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary[500],
    backgroundColor: COLORS.background.paper,
  },
  tabText: {
    marginLeft: SPACING.xxs,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  activeTabText: {
    color: COLORS.primary[600],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});

export default VehicleProvidersScreen;
