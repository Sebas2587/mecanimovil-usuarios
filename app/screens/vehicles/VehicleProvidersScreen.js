import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { Star, MapPin, CircleAlert } from 'lucide-react-native';
import { getProvidersByVehiculo } from '../../services/providers';
import ProvidersList from '../../components/providers/ProvidersList';
import SegmentedControl from '../../components/base/SegmentedControl/SegmentedControl';
import GuestGradientButton from '../../components/guest/GuestGradientButton';
import { COLORS } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
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
    <SegmentedControl
      segments={[
        { id: 'talleres', label: 'Talleres', count: providers.talleres.length, Icon: Star },
        { id: 'mecanicos', label: 'Mecánicos', count: providers.mecanicos.length, Icon: MapPin },
      ]}
      value={activeTab}
      onChange={setActiveTab}
      style={styles.tabContainer}
    />
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
          <CircleAlert size={50} color={COLORS.error[500]} />
          <Text style={styles.errorText}>{error}</Text>
          <GuestGradientButton
            title="Reintentar"
            onPress={loadProviders}
            size="compact"
            style={styles.retryButton}
          />
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
  },
  contentContainer: {
    flex: 1,
  },
  tabContainer: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingVertical: SPACING.sm,
  },
});

export default VehicleProvidersScreen;
