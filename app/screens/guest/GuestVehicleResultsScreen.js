import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Car, ChevronDown, MapPin, ChevronLeft, HeartPulse, Gauge } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import GuestGradientButton from '../../components/guest/GuestGradientButton';
import GuestAddressPicker from '../../components/guest/GuestAddressPicker';
import ProviderPreviewCard from '../../components/home/ProviderPreviewCard';
import { formatProviderForCard } from '../../utils/providerUtils';
import { getGuestProvidersByMarca } from '../../services/providers';
import { getMainCategories } from '../../services/categories';
import { savePendingGuestIntent } from '../../utils/guestIntent';
import { showAlert, showAlertButtons } from '../../utils/platformAlert';

function mapPublicDataToPrefill(data, patente) {
  if (!data) return null;
  return {
    patente: data.patente || patente,
    marca: data.marca_nombre,
    marca_nombre: data.marca_nombre,
    marca_id: data.marca_id,
    modelo: data.modelo_nombre,
    modelo_nombre: data.modelo_nombre,
    modelo_id: data.modelo_id,
    year: data.year,
    color: data.color,
    motor: data.motor,
    tipo_motor: data.tipo_motor,
    cilindraje: data.cilindraje,
    precio_mercado_promedio: data.precio_mercado_promedio,
    precio_mercado_min: data.precio_mercado_min,
    precio_mercado_max: data.precio_mercado_max,
    tasacion_fiscal: data.tasacion_fiscal,
    tiene_tasacion_mercado: data.tiene_tasacion_mercado,
  };
}

const GuestVehicleResultsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const patente = route.params?.patente || '';
  const vehicleData = route.params?.vehicleData || {};

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [providers, setProviders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const marcaId = vehicleData.marca_id;
  const marcaNombre = vehicleData.marca_nombre || 'tu marca';

  const loadProviders = useCallback(async () => {
    if (!marcaId) {
      setProviders([]);
      setLoadingProviders(false);
      return;
    }
    setLoadingProviders(true);
    try {
      const list = await getGuestProvidersByMarca({
        marcaId,
        lat: selectedAddress?.latitud,
        lng: selectedAddress?.longitud,
        dist: 30,
        limit: 20,
      });
      setProviders(list);
    } finally {
      setLoadingProviders(false);
    }
  }, [marcaId, selectedAddress?.latitud, selectedAddress?.longitud]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  useEffect(() => {
    let mounted = true;
    getMainCategories().then((cats) => {
      if (mounted) setCategories((cats || []).slice(0, 8));
    });
    return () => {
      mounted = false;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProviders();
    setRefreshing(false);
  }, [loadProviders]);

  const handleRegister = useCallback(async () => {
    const prefill = mapPublicDataToPrefill(vehicleData, patente);
    await savePendingGuestIntent({ patente, vehicleData: prefill });
    navigation.navigate(ROUTES.REGISTER);
  }, [navigation, patente, vehicleData]);

  const handleProviderPress = useCallback(
    (item) => {
      const type = item._panelKind === 'mecanico' ? 'mecanico' : 'taller';
      navigation.navigate(ROUTES.PROVIDER_DETAIL, { type, id: item.id });
    },
    [navigation],
  );

  const handleCategoryPress = useCallback(() => {
    showAlertButtons(
      'Crea tu cuenta gratis',
      'Regístrate para ver servicios de esta categoría, agendar con talleres y llevar el control de tu auto.',
      [
        { text: 'Registrarme', onPress: handleRegister },
        { text: 'Ahora no', style: 'cancel' },
      ],
    );
  }, [handleRegister]);

  const addressLabel = selectedAddress?.direccion
    ? selectedAddress.direccion
    : 'Agrega tu dirección para ver talleres cercanos';

  const providersTitle = selectedAddress
    ? `Talleres cerca de ti para ${marcaNombre}`
    : `Talleres que atienden ${marcaNombre}`;

  const valorLabel = useMemo(() => {
    if (vehicleData.precio_mercado_min && vehicleData.precio_mercado_max) {
      return `$${Number(vehicleData.precio_mercado_min).toLocaleString('es-CL')} – $${Number(vehicleData.precio_mercado_max).toLocaleString('es-CL')}`;
    }
    if (vehicleData.precio_mercado_promedio) {
      return `~$${Number(vehicleData.precio_mercado_promedio).toLocaleString('es-CL')}`;
    }
    return null;
  }, [vehicleData]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          Resultados
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.addressBtn}
          onPress={() => setAddressModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Cambiar dirección de servicio"
        >
          <MapPin size={15} color={COLORS.primary[500]} strokeWidth={2.25} />
          <Text style={styles.addressText} numberOfLines={1}>
            {addressLabel}
          </Text>
          <ChevronDown size={15} color={COLORS.text.tertiary} />
        </TouchableOpacity>

        <View style={styles.vehiclePill}>
          <View style={styles.vehicleThumbFallback}>
            <Car size={18} color={COLORS.primary[500]} />
          </View>
          <View style={styles.vehicleTextCol}>
            <Text style={styles.vehicleTitle} numberOfLines={1}>
              {vehicleData.marca_nombre || '—'} {vehicleData.modelo_nombre || ''}
            </Text>
            <Text style={styles.vehicleSub} numberOfLines={1}>
              {patente}{vehicleData.year ? ` · ${vehicleData.year}` : ''}
              {vehicleData.color ? ` · ${vehicleData.color}` : ''}
            </Text>
          </View>
        </View>

        {valorLabel ? (
          <View style={styles.valorCard}>
            <Text style={styles.valorLabel}>Valor estimado en mercado</Text>
            <Text style={styles.valorValue}>{valorLabel}</Text>
          </View>
        ) : null}

        <View style={styles.registerTeaser}>
          <View style={styles.teaserRow}>
            <HeartPulse size={18} color={COLORS.primary[500]} />
            <Text style={styles.teaserText}>
              Regístrate para ver la salud de tu auto, historial y métricas personalizadas.
            </Text>
          </View>
          <View style={styles.teaserRow}>
            <Gauge size={18} color={COLORS.primary[500]} />
            <Text style={styles.teaserText}>
              Lleva el control de mantenciones, kilometraje y valor de tu vehículo.
            </Text>
          </View>
        </View>

        {categories.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Servicios para tu auto</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.chip}
                  onPress={handleCategoryPress}
                  activeOpacity={0.85}
                >
                  <Text style={styles.chipText} numberOfLines={1}>
                    {cat.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{providersTitle}</Text>
          {!marcaId ? (
            <Text style={styles.emptyText}>
              No pudimos identificar la marca de tu vehículo. Regístrate para continuar con el registro manual.
            </Text>
          ) : loadingProviders ? (
            <ActivityIndicator color={COLORS.primary[500]} style={styles.loader} />
          ) : providers.length === 0 ? (
            <Text style={styles.emptyText}>
              {selectedAddress
                ? 'No hay talleres verificados cerca de tu ubicación para esta marca. Prueba otra dirección o regístrate para más opciones.'
                : 'Agrega tu dirección para ver opciones más precisas cerca de ti.'}
            </Text>
          ) : (
            <View style={styles.providersGrid}>
              {providers.map((item) => {
                const { id: _pid, ...card } = formatProviderForCard(item);
                return (
                  <View key={`${item._panelKind}-${item.id}`} style={styles.providerCardWrap}>
                    <ProviderPreviewCard
                      {...card}
                      provider={item}
                      userBrandName={marcaNombre}
                      cardFooterVariant="bookings"
                      omitRightMargin
                      onPress={() => handleProviderPress(item)}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.sm }]}>
        <GuestGradientButton title="Regístrate para agendar" onPress={handleRegister} />
        <TouchableOpacity onPress={handleRegister} style={styles.footerSecondary}>
          <Text style={styles.footerSecondaryText}>Registrar mi auto y llevar el control</Text>
        </TouchableOpacity>
      </View>

      <GuestAddressPicker
        visible={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSelectAddress={setSelectedAddress}
        currentAddress={selectedAddress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
  },
  addressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
    minWidth: 0,
  },
  addressText: {
    ...TYPOGRAPHY.styles.captionBold,
    flexShrink: 1,
    color: COLORS.text.primary,
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    marginBottom: SPACING.md,
  },
  vehicleThumbFallback: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleTextCol: {
    flex: 1,
    minWidth: 0,
  },
  vehicleTitle: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  vehicleSub: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  valorCard: {
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[100],
  },
  valorLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  valorValue: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.primary[700],
    marginTop: 4,
  },
  registerTeaser: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  teaserRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  teaserText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  chipsRow: {
    gap: SPACING.sm,
    paddingRight: SPACING.md,
  },
  chip: {
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    borderRadius: BORDERS.radius.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    maxWidth: 180,
  },
  chipText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  loader: {
    marginVertical: SPACING.lg,
  },
  emptyText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
  },
  providersGrid: {
    gap: SPACING.md,
  },
  providerCardWrap: {
    width: '100%',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background.default,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    ...SHADOWS.lg,
  },
  footerSecondary: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  footerSecondaryText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[600],
  },
});

export default GuestVehicleResultsScreen;
