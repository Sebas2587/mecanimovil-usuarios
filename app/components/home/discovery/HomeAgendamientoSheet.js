import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../../design-system/tokens';
import { useAgendamientoAsistido } from '../../../hooks/useAgendamientoAsistido';
import { isAsistidoHabilitado } from '../../../services/agendamientoAsistidoService';
import VehicleHealthService from '../../../services/vehicleHealthService';
import { getServicesByVehiculo } from '../../../services/service';
import {
  NecesidadInputStep,
  ServiciosSugeridosList,
} from '../../agendamiento-asistido';
import {
  buildHealthServiceRecommendations,
  mapAnalisisServiciosRecomendados,
  normalizeHealthComponentsList,
  resolveHealthComponentDisplayName,
} from '../shared/homeHealthRecommendations';
import { ROUTES } from '../../../utils/constants';
import { navigateCrearSolicitudConServicios } from '../shared/homeScheduleNavigation';

/**
 * Sheet de agendamiento asistido desde el home (IA + servicios sugeridos).
 */
const HomeAgendamientoSheet = ({
  visible,
  onClose,
  vehicle,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const vehicleId = vehicle?.id;
  const iaActivo = isAsistidoHabilitado();

  const [texto, setTexto] = useState('');
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState([]);

  const {
    analisis,
    loadingAnalisis,
    error,
    analizar,
    reset,
  } = useAgendamientoAsistido();

  const { data: healthData } = useQuery({
    queryKey: ['vehicleHealth', vehicleId],
    queryFn: () => VehicleHealthService.getVehicleHealthWithPatches(vehicleId, true),
    enabled: visible && !!vehicleId,
    staleTime: 1000 * 60 * 2,
  });

  const { data: predictionsData } = useQuery({
    queryKey: ['vehicleHealthPredictions', vehicleId],
    queryFn: () => VehicleHealthService.getVehiclePredictions(vehicleId),
    enabled: visible && !!vehicleId,
    staleTime: 1000 * 60 * 15,
  });

  const healthComponents = useMemo(
    () => normalizeHealthComponentsList(healthData?.componentes ?? healthData),
    [healthData],
  );

  const { data: vehicleServices = [] } = useQuery({
    queryKey: ['vehicleServices', vehicleId],
    queryFn: () => getServicesByVehiculo(vehicleId),
    enabled: visible && !!vehicleId,
    staleTime: 1000 * 60 * 5,
  });

  const healthRecs = useMemo(
    () => buildHealthServiceRecommendations(
      healthComponents,
      vehicleServices,
      healthData?.alertas ?? [],
      predictionsData?.predicciones ?? [],
    ),
    [healthComponents, vehicleServices, healthData?.alertas, predictionsData?.predicciones],
  );

  const serviciosIa = useMemo(
    () => mapAnalisisServiciosRecomendados(analisis, vehicleServices),
    [analisis, vehicleServices],
  );

  const serviciosParaLista = useMemo(() => {
    const meta = new Map(
      (analisis?.servicios_recomendados || []).map((r) => [
        r.servicio_id ?? r.id,
        r,
      ]),
    );
    return serviciosIa.map((s) => {
      const m = meta.get(s.id);
      return {
        servicio_id: s.id,
        id: s.id,
        nombre: s.nombre,
        razon: m?.razon,
        score: m?.score,
        fuente: m?.fuente,
      };
    });
  }, [serviciosIa, analisis]);

  useEffect(() => {
    if (!visible) {
      setTexto('');
      setServiciosSeleccionados([]);
      reset();
    }
  }, [visible, reset]);

  useEffect(() => {
    if (!visible || !vehicleId || !iaActivo) return;
    if (serviciosSeleccionados.length > 0) return;
    if (healthRecs.length > 0) {
      setServiciosSeleccionados([healthRecs[0].service]);
    }
  }, [visible, vehicleId, iaActivo, healthRecs, serviciosSeleccionados.length]);

  const componentesSaludIa = useMemo(
    () =>
      (healthComponents || []).map((c) => ({
        slug: c.slug,
        nombre: resolveHealthComponentDisplayName(c),
        nivel_alerta: c.nivel_alerta || c.status,
        salud_porcentaje: c.salud_porcentaje ?? c.salud,
      })),
    [healthComponents],
  );

  const handleAnalizar = useCallback(() => {
    if (!iaActivo || !vehicleId) return;
    analizar({
      texto,
      vehiculoId: vehicleId,
      componentesSalud: componentesSaludIa,
      origen: 'texto',
    });
  }, [iaActivo, vehicleId, texto, componentesSaludIa, analizar]);

  useEffect(() => {
    if (!visible || !iaActivo || !vehicleId) return;
    const t = texto.trim();
    if (t.length < 4) return;
    const timer = setTimeout(() => {
      analizar({
        texto: t,
        vehiculoId: vehicleId,
        componentesSalud: componentesSaludIa,
        origen: 'texto',
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [texto, visible, iaActivo, vehicleId, componentesSaludIa, analizar]);

  useEffect(() => {
    if (serviciosIa.length > 0 && serviciosSeleccionados.length === 0) {
      setServiciosSeleccionados(serviciosIa.slice(0, 2));
    }
  }, [serviciosIa]);

  const toggleServicio = useCallback((item) => {
    const id = item.servicio_id ?? item.id;
    const full =
      vehicleServices.find((s) => s.id === id) ||
      serviciosIa.find((s) => s.id === id) || {
        id,
        nombre: item.nombre || 'Servicio',
      };
    setServiciosSeleccionados((prev) => {
      const exists = prev.some((s) => s.id === full.id);
      if (exists) return prev.filter((s) => s.id !== full.id);
      return [...prev, full];
    });
  }, [vehicleServices, serviciosIa]);

  const handleAgendar = useCallback(() => {
    if (!vehicle?.id) return;
    if (serviciosSeleccionados.length === 0) {
      Alert.alert('Selecciona un servicio', 'Elige al menos un servicio para agendar.');
      return;
    }
    onClose?.();
    navigateCrearSolicitudConServicios(navigation, {
      vehicle,
      servicios: serviciosSeleccionados,
      descripcion: texto.trim(),
    });
  }, [vehicle, serviciosSeleccionados, texto, navigation, onClose]);

  const handleAgendarSinIa = useCallback(() => {
    if (!vehicle?.id) return;
    onClose?.();
    navigation.navigate(ROUTES.CREAR_SOLICITUD, {
      vehicle,
      agendamientoInteligente: true,
      fromDashboard: true,
    });
  }, [vehicle, navigation, onClose]);

  const vehicleLabel = vehicle
    ? `${vehicle.marca_nombre || ''} ${vehicle.modelo_nombre || ''}`.trim()
    : '';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.root, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerTitle}>Agendar servicio</Text>
            {vehicleLabel ? (
              <Text style={styles.headerSub}>{vehicleLabel}</Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <X size={22} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!iaActivo ? (
            <View style={styles.fallbackBox}>
              <Text style={styles.fallbackText}>
                El asistente no está disponible. Puedes crear una solicitud manualmente.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleAgendarSinIa}>
                <Text style={styles.primaryBtnText}>Nueva solicitud</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <NecesidadInputStep
                value={texto}
                onChangeText={setTexto}
                onAnalizar={handleAnalizar}
                loading={loadingAnalisis}
                interpretacion={analisis?.interpretacion}
                resumenSalud={analisis?.resumen_salud}
                alertasCruce={analisis?.alertas_cruce}
                urgenciaLabel={analisis?.urgencia_label}
                errorMessage={error}
              />

              <Text style={styles.sectionLabel}>Servicios sugeridos</Text>
              <ServiciosSugeridosList
                servicios={serviciosParaLista}
                seleccionados={serviciosSeleccionados}
                onToggle={toggleServicio}
                loading={loadingAnalisis && serviciosParaLista.length === 0}
                hint="Describe tu necesidad o elige según el desgaste de tu vehículo."
              />

              {healthRecs.length > 0 && serviciosIa.length === 0 && !loadingAnalisis ? (
                <View style={styles.healthHint}>
                  <Text style={styles.healthHintTitle}>Por desgaste detectado</Text>
                  {healthRecs.slice(0, 3).map((rec) => (
                    <TouchableOpacity
                      key={`hint-${rec.service.id}`}
                      style={styles.healthChip}
                      onPress={() => setServiciosSeleccionados([rec.service])}
                    >
                      <Text style={styles.healthChipText}>{rec.service.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>

        {iaActivo ? (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (loadingAnalisis || serviciosSeleccionados.length === 0) && styles.primaryDisabled,
              ]}
              onPress={handleAgendar}
              disabled={loadingAnalisis || serviciosSeleccionados.length === 0}
            >
              {loadingAnalisis ? (
                <ActivityIndicator color={COLORS.text.inverse} size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Continuar agendamiento</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  headerSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginTop: 8,
    marginBottom: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary[500],
    paddingVertical: 14,
    borderRadius: BORDERS.radius.lg,
    alignItems: 'center',
  },
  primaryDisabled: {
    opacity: 0.55,
  },
  primaryBtnText: {
    color: COLORS.text.inverse,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  fallbackBox: {
    padding: 20,
    gap: 16,
  },
  fallbackText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  healthHint: {
    marginTop: 16,
    gap: 8,
  },
  healthHintTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
  },
  healthChip: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.warning.light,
    borderRadius: BORDERS.radius.full,
    borderWidth: 1,
    borderColor: COLORS.warning.main,
  },
  healthChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.warning.dark,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});

export default React.memo(HomeAgendamientoSheet);
