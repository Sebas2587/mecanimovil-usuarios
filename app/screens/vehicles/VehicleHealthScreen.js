import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  Platform,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { showAlert } from '../../utils/platformAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Gauge,
  HelpCircle,
  RefreshCw,
  CheckCircle,
  X,
  Heart,
  ChevronRight,
  Hourglass,
  ShieldCheck,
  ShieldAlert,
  ClipboardEdit,
} from 'lucide-react-native';
import { TextInput, KeyboardAvoidingView } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { ROUTES } from '../../utils/constants';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VehicleHealthService from '../../services/vehicleHealthService';
import { getVehicleById } from '../../services/vehicle';
import ComponentHealthDetailSheet, {
  buildMetricServiceNavPayload,
} from '../../components/vehicles/ComponentHealthDetailSheet';
import Skeleton from '../../components/feedback/Skeleton/Skeleton';
import WebSocketService from '../../services/websocketService';
import NotificationService from '../../services/notificationService';
import {
  getHealthColorToken,
  getHealthLabel,
  getHealthStatus,
  normalizePct,
  resolveVehicleHealthPct,
} from '../../utils/healthFormat';
import { COLORS } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import Button from '../../components/base/Button/Button';
import HealthCard from '../../components/cards/HealthCard';
import BackButton from '../../components/navigation/BackButton';

const componentPct = (c) =>
  normalizePct(c.salud_porcentaje ?? c.salud ?? c.percentage ?? c.salud_actual);

/**
 * Fila Airbnb: nombre + estado caption + % + chevron. Sin botones ni cards anidadas.
 * `sectionRole` agrupa visualmente filas dentro de su bloque (Para atender / En buen estado).
 */
const ComponentRow = React.memo(({ item, onPress, isLast, sectionRole = 'middle', sectionTone = 'attention' }) => {
  const name =
    item.nombre || (typeof item.componente === 'string' ? item.componente : item.name) || 'Componente';
  const pct = componentPct(item);
  const color = getHealthColorToken(COLORS, pct);
  const handlePress = useCallback(() => onPress?.(item), [onPress, item]);
  const isOk = sectionTone === 'ok';

  return (
    <TouchableOpacity
      style={[
        rowStyles.row,
        isOk ? rowStyles.rowInOk : rowStyles.rowInAttention,
        sectionRole === 'first' || sectionRole === 'only' ? rowStyles.rowFirst : null,
        sectionRole === 'last' || sectionRole === 'only' ? rowStyles.rowLast : null,
        !(sectionRole === 'last' || sectionRole === 'only') && rowStyles.rowBorder,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${getHealthLabel(pct)}, ${Math.round(pct)} por ciento`}
    >
      <View style={[rowStyles.dot, { backgroundColor: color }]} />
      <View style={rowStyles.body}>
        <Text style={[TYPOGRAPHY.styles.bodyBold, rowStyles.name]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[TYPOGRAPHY.styles.caption, rowStyles.statusText]} numberOfLines={1}>
          {getHealthLabel(pct)} · {Math.round(pct)}%
        </Text>
      </View>
      <Text style={[TYPOGRAPHY.styles.captionBold, { color }]}>{Math.round(pct)}%</Text>
      <ChevronRight size={18} color={COLORS.text.tertiary} strokeWidth={2} fill="none" />
    </TouchableOpacity>
  );
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  rowInAttention: {
    backgroundColor: COLORS.background.paper,
    borderLeftWidth: BORDERS.width.thin,
    borderRightWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  rowInOk: {
    backgroundColor: COLORS.neutral.gray[50],
    borderLeftWidth: BORDERS.width.thin,
    borderRightWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  rowFirst: {
    borderTopWidth: BORDERS.width.thin,
    borderTopLeftRadius: BORDERS.radius.lg,
    borderTopRightRadius: BORDERS.radius.lg,
  },
  rowLast: {
    borderBottomWidth: BORDERS.width.thin,
    borderBottomLeftRadius: BORDERS.radius.lg,
    borderBottomRightRadius: BORDERS.radius.lg,
    marginBottom: SPACING.lg,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  body: { flex: 1, minWidth: 0 },
  name: { color: COLORS.text.primary },
  statusText: { color: COLORS.text.secondary, flexShrink: 1, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
});

const VehicleHealthScreen = ({ route }) => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { vehicleId, vehicle } = route.params;

  /** Misma clave que `useVehiclesHealth` en UserPanelScreen — mantiene el % global al día al declarar km. */
  const syncVehicleHealthQueryCache = useCallback(
    (data) => {
      if (data == null || vehicleId == null || vehicleId === '') return;
      queryClient.setQueryData(['vehicleHealth', vehicleId], data);
      const n = Number(vehicleId);
      if (Number.isFinite(n) && n !== vehicleId) {
        queryClient.setQueryData(['vehicleHealth', n], data);
      }
    },
    [vehicleId, queryClient],
  );

  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const styles = createStyles(insets);

  /** Web: sin header del stack; altura explícita al viewport para que FlatList tenga scroll (como MarketplaceVehicleDetail). */
  const webRootStyle =
    Platform.OS === 'web'
      ? {
          minHeight: 0,
          height: windowHeight,
          maxHeight: windowHeight,
          overflow: 'hidden',
        }
      : null;

  // Data State
  // Prefer fresh data from fetch, fallback to route params if available
  const [healthData, setHealthData] = useState(null);
  const healthDataRef = useRef(null);
  useEffect(() => {
    healthDataRef.current = healthData;
  }, [healthData]);

  // Al salir de la pantalla, volcar el último resumen a TanStack Query (panel "Valor estimado").
  useEffect(() => {
    const unsub = navigation.addListener('blur', () => {
      const h = healthDataRef.current;
      if (h) syncVehicleHealthQueryCache(h);
    });
    return unsub;
  }, [navigation, syncVehicleHealthQueryCache]);

  const [vehicleData, setVehicleData] = useState(vehicle);

  /** Odómetro desde API sin esperar hidratación de parches ni `loadData` (evita flash de km viejo de `route.params`). */
  const refreshVehicleOdometer = useCallback(() => {
    if (!vehicleId) return;
    getVehicleById(vehicleId)
      .then((v) => {
        if (v) setVehicleData(v);
      })
      .catch(() => {});
  }, [vehicleId]);

  // Si el panel ya cargó la lista de vehículos, usar ese km de inmediato (más actual que params de navegación).
  useEffect(() => {
    const entries = queryClient.getQueriesData({ queryKey: ['userVehicles'] });
    for (const [, data] of entries) {
      const list = Array.isArray(data) ? data : data?.results || [];
      const v = list.find((x) => String(x.id) === String(vehicleId));
      if (v && v.kilometraje != null) {
        setVehicleData((prev) => {
          const base = prev ?? vehicle ?? {};
          if (Number(v.kilometraje) === Number(base.kilometraje) && prev != null) return prev;
          return { ...base, ...v };
        });
        break;
      }
    }
  }, [vehicleId, queryClient, vehicle]);

  useEffect(() => {
    refreshVehicleOdometer();
  }, [refreshVehicleOdometer]);

  const [loading, setLoading] = useState(!vehicle?.health_report);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null); // For Modal
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  // Predicciones inteligentes (scikit-learn + bootstrap + similares)
  const [predictionsData, setPredictionsData] = useState(null);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  // Modal de declaración retroactiva de mantenimiento
  const [declarationTarget, setDeclarationTarget] = useState(null); // componente seleccionado
  const [declKm, setDeclKm] = useState('');
  const [declNota, setDeclNota] = useState('');
  const [declarando, setDeclarando] = useState(false);
  /** Aviso in-app (web no ejecuta `Alert.alert` de RN). */
  const [healthBanner, setHealthBanner] = useState(null);

  const pollingIntervalRef = useRef(null);
  const wsHandlerRef = useRef(null);
  const healthPollTimersRef = useRef([]);
  const loadDataRef = useRef(() => {});
  /**
   * Mapa slug → { km, pct, oldPct, fuente, fechaIso, expiry } de declaraciones recientes.
   * Se persiste en AsyncStorage por vehículo: sobrevive recargas/navegación y mantiene
   * la UI consistente hasta que el backend confirme que Celery procesó el cambio.
   */
  const optimisticDeclRef = useRef(new Map());
  const [optimisticHydrated, setOptimisticHydrated] = useState(false);
  /** Incrementa con cada actualización de datos para forzar re-render en web. */
  const [listRenderVersion, setListRenderVersion] = useState(0);

  const optimisticStorageKey = `health_optimistic_decl_v1_${vehicleId}`;

  const persistOptimistic = useCallback(async () => {
    try {
      const obj = Object.fromEntries(optimisticDeclRef.current.entries());
      await AsyncStorage.setItem(optimisticStorageKey, JSON.stringify(obj));
    } catch (e) {
      console.warn('No se pudo persistir parche optimista:', e?.message);
    }
  }, [optimisticStorageKey]);

  // Hidratar parches optimistas desde AsyncStorage al montar (sobreviven F5 en web).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(optimisticStorageKey);
        if (!cancelled && raw) {
          const obj = JSON.parse(raw) || {};
          const now = Date.now();
          const map = new Map();
          for (const [slug, opt] of Object.entries(obj)) {
            if (opt?.expiry && opt.expiry > now) map.set(slug, opt);
          }
          optimisticDeclRef.current = map;
        }
      } catch (e) {
        console.warn('No se pudo hidratar parche optimista:', e?.message);
      } finally {
        if (!cancelled) {
          // Sincronizar mapa hidratado con el servicio para que UserPanelScreen
          // y MarketplaceVehicleDetailScreen usen el mismo pipeline.
          VehicleHealthService.setPatchMap(vehicleId, optimisticDeclRef.current);
          setOptimisticHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [optimisticStorageKey, vehicleId]);

  const clearHealthPollTimers = useCallback(() => {
    healthPollTimersRef.current.forEach(clearTimeout);
    healthPollTimersRef.current = [];
  }, []);

  // Initial Load — esperar a que terminen de hidratarse los parches para no perderlos
  useEffect(() => {
    if (!optimisticHydrated) return;
    loadData(true);
    return () => {
      clearInterval(pollingIntervalRef.current);
      clearHealthPollTimers();
    };
  }, [vehicleId, clearHealthPollTimers, optimisticHydrated]);

  const loadPredictions = useCallback(async (force = false) => {
    if (!vehicleId) return;
    setPredictionsLoading(true);
    try {
      const data = await VehicleHealthService.getVehiclePredictions(vehicleId, force);
      setPredictionsData(data);
    } catch (e) {
      // No bloquear la pantalla por error de predicciones (feature opcional).
      console.warn('No se pudieron cargar predicciones:', e?.message);
    } finally {
      setPredictionsLoading(false);
    }
  }, [vehicleId]);

  /**
   * Calcula el % de salud estimado para el componente dado el km declarado.
   * Usa la fórmula Weibull (beta=2) del backend con eta aproximado desde
   * los datos del componente disponibles en el cliente.
   * Siempre se aplica el tope máx 65 % para declaraciones de usuario
   * (regla del HealthEngine: USUARIO_DECLARADO nunca puede mostrar ÓPTIMO).
   */
  const computeOptimisticPct = useCallback((comp, kmVehiculo, kmDeclarado) => {
    const kmRecNuevo = Math.max(0, (kmVehiculo || 0) - (kmDeclarado || 0));
    if (kmRecNuevo <= 0) return 65; // recién cambiado → al tope permitido

    // Eta: vida útil esperada del componente (km).
    // Prioridad: vida_util_total (health_report) → derivado de km_estimados_restantes → fallback razonable.
    const kmRecAnterior = Math.max(0, (kmVehiculo || 0) - (comp.km_ultimo_servicio || 0));
    const etaDesdeEstimados = kmRecAnterior + Math.max(0, comp.km_estimados_restantes || 0);
    const etaCandidato = Math.max(
      comp.vida_util_total || comp.vida_util_proyectada || 0,
      etaDesdeEstimados,
    );
    // Si no tenemos eta válido (componente sin datos previos), el cálculo no es confiable
    // → usar tope 65 % en vez de calcular un mínimo arbitrario.
    if (!etaCandidato || etaCandidato < 1000) return 65;

    // Weibull beta=2 (valor genérico del backend para la mayoría de componentes)
    const salud = Math.exp(-Math.pow(kmRecNuevo / etaCandidato, 2)) * 100;
    // Tope superior: 65 (regla USUARIO_DECLARADO). Tope inferior: 10 para evitar 0% visual.
    return Math.min(65, Math.max(10, Math.round(salud)));
  }, []);

  /**
   * Aplica los parches optimistas vigentes sobre los datos frescos del servidor.
   *
   * Lógica de cuándo confiar en el servidor (señal robusta de que Celery procesó la declaración):
   *   1. Servidor devuelve serverPct > 0 (NUNCA confiamos en 0% → es cache stale o error).
   *   2. Servidor reporta historial_fuente === 'USUARIO_DECLARADO' → procesó nuestra declaración.
   *   3. O bien: serverPct > 0 y serverPct ≤ 65 (cap aplicado) y km_ultimo_servicio coincide.
   *
   * Si no se cumple, mantenemos el parche optimista. Expira a las 24 h (safety net).
   * Persistimos el Map a AsyncStorage para sobrevivir refrescos de página.
   */
  const applyOptimisticPatch = useCallback((data) => {
    const patches = optimisticDeclRef.current;
    const now = Date.now();
    let mapChanged = false;
    for (const [slug, opt] of patches.entries()) {
      if (now > opt.expiry) {
        patches.delete(slug);
        mapChanged = true;
      }
    }
    if (patches.size === 0) {
      if (mapChanged) persistOptimistic();
      return data;
    }
    if (!data?.componentes?.length) return data;

    let listChanged = false;
    const patched = data.componentes.map((c) => {
      const s = String(c.slug || c.componente_detail?.slug || c.icon_slug || '');
      const opt = patches.get(s);
      if (!opt) return c;

      const serverPct = normalizePct(c.salud_porcentaje ?? c.salud);
      const serverFuente = c.historial_fuente;
      const serverKm = c.km_ultimo_servicio;

      // Confiar en servidor SOLO si:
      //   - serverPct > 0 (descartar cache stale / 0 corrupto)
      //   - el backend ya marcó USUARIO_DECLARADO Y el km coincide con el declarado
      const backendProceso =
        serverPct > 0 &&
        serverFuente === 'USUARIO_DECLARADO' &&
        opt.km != null &&
        Math.abs(Number(serverKm || 0) - opt.km) < 100;

      // El servidor ya tiene un dato REAL más fresco que nuestra declaración:
      // fuente autoritativa (no estimada por el motor) con ancla de km igual o
      // posterior a la declarada. Cubre el caso de un servicio confirmado por
      // checklist del proveedor (fuente=CHECKLIST), que antes quedaba oculto 24 h.
      const servidorTieneDatoFresco =
        serverPct > 0 &&
        !!serverFuente &&
        serverFuente !== 'ENGINE' &&
        Number(serverKm || 0) >= Number(opt.km || 0) - 100;

      if (backendProceso || servidorTieneDatoFresco) {
        patches.delete(s);
        mapChanged = true;
        return c; // servidor manda: dato real y fresco
      }

      // Mantener parche optimista
      listChanged = true;
      return {
        ...c,
        historial_conocido: true,
        historial_fuente: opt.fuente,
        salud_porcentaje: opt.pct,
        ...(opt.km ? { km_ultimo_servicio: opt.km } : {}),
        ...(opt.fechaIso ? { fecha_ultimo_servicio: opt.fechaIso } : {}),
      };
    });

    if (mapChanged) persistOptimistic();
    if (!listChanged) return data;

    // Recalcular % global como promedio de todos los componentes parcheados
    const total = patched.length;
    const suma = patched.reduce(
      (acc, c) => acc + normalizePct(c.salud_porcentaje ?? c.salud ?? 0), 0,
    );
    const saludGeneral = total > 0 ? Math.round(suma / total) : data.salud_general_porcentaje;
    return { ...data, componentes: patched, salud_general_porcentaje: saludGeneral };
  }, [persistOptimistic]);

  const loadData = async (force = false) => {
    if (!vehicleId) return;
    try {
      if (!vehicleData || force) {
        const v = await getVehicleById(vehicleId);
        setVehicleData(v);
      }
      const rawHealth = await VehicleHealthService.getVehicleHealth(vehicleId, force);
      const hData = applyOptimisticPatch(rawHealth);
      setHealthData(hData);
      syncVehicleHealthQueryCache(hData);
      setListRenderVersion((n) => n + 1);
      loadPredictions(force);
    } catch (e) {
      console.error('Error loading health:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  loadDataRef.current = loadData;

  /** Aviso de actualización: banner in-app en web; push local en nativo. */
  const notifyHealthUpdated = useCallback((vehiculoInfo, componentesActualizados = 0) => {
    const countPart =
      componentesActualizados > 0
        ? ` · ${componentesActualizados} componente${componentesActualizados > 1 ? 's' : ''} actualizado${componentesActualizados > 1 ? 's' : ''}`
        : '';
    if (Platform.OS === 'web') {
      setHealthBanner({
        message: `Métricas de ${vehiculoInfo || 'tu vehículo'} actualizadas${countPart}.`,
      });
      return;
    }
    NotificationService.notificarSaludVehiculoActualizada(vehiculoInfo, componentesActualizados);
  }, []);

  /**
   * Programa refetches progresivos después de declarar mantenimiento.
   * NO incluye delay 0 porque en ese instante Celery no ha recalculado
   * y la respuesta sobreescribiría el parche optimista con datos viejos.
   */
  const scheduleHealthRefetchBurst = useCallback(() => {
    clearHealthPollTimers();
    const delays = [2000, 5000, 10000, 20000];
    delays.forEach((ms) => {
      const id = setTimeout(() => {
        loadDataRef.current?.(true);
      }, ms);
      healthPollTimersRef.current.push(id);
    });
  }, [clearHealthPollTimers]);

  // WebSocket & Polling Logic (Kep existing logic)
  useEffect(() => {
    if (!WebSocketService.getConnectionStatus()) WebSocketService.connect();

    const handleUpdate = (data) => {
      if (data.vehicle_id && String(data.vehicle_id) === String(vehicleId)) {
        if (__DEV__) console.log('🔔 Health Update Received');
        notifyHealthUpdated(data.vehiculo_info || 'Vehículo', data.componentes_actualizados || 0);
        loadData(true);
      }
    };

    WebSocketService.onMessage('salud_vehiculo_actualizada', handleUpdate);
    wsHandlerRef.current = handleUpdate;

    pollingIntervalRef.current = setInterval(() => loadData(true), 30000);

    return () => {
      if (wsHandlerRef.current) WebSocketService.offMessage('salud_vehiculo_actualizada', wsHandlerRef.current);
    };
  }, [vehicleId, notifyHealthUpdated]);

  useFocusEffect(
    useCallback(() => {
      refreshVehicleOdometer();
      if (!optimisticHydrated) return;
      loadData(true);
    }, [vehicleId, optimisticHydrated, refreshVehicleOdometer])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  /**
   * Sincronizar con backend (recálculo asíncrono vía Celery).
   * Tras el POST, re-fetch progresivo (WS opcional + polling a 2/5/10/20 s).
   */
  const handleSync = async () => {
    if (!vehicleId || syncing) return;
    setSyncing(true);
    try {
      await VehicleHealthService.syncVehicleHealth(vehicleId);
      scheduleHealthRefetchBurst();
    } catch (e) {
      console.error('Sync salud error:', e);
      showAlert(
        'No se pudo sincronizar',
        e?.response?.data?.error || e?.message || 'Intenta de nuevo en unos segundos.'
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleMetricPress = (item) => {
    // Show modal with details
    // Ensure we send semantic fields
    const name = item.nombre || (typeof item.componente === 'string' ? item.componente : item.name) || 'Componente';
    const remaining = item.km_estimados_restantes ?? item.vida_util_restante_km ?? item.remaining_km;
    const vidaUtil = remaining !== undefined ? `${remaining.toLocaleString()} km` : 'N/A';

    setSelectedMetric({
      ...item,
      // Map legacy/new fields
      name: name,
      vida_util: vidaUtil,
      mensaje: item.mensaje_alerta || 'Sin observaciones.',
    });
  };

  const handleNavToService = (extraParams = {}) => {
    navigation.navigate(ROUTES.CREAR_SOLICITUD, {
      vehicle: vehicleData,
      alertas: healthData?.alertas,
      ...extraParams,
    });
  };

  /**
   * Servicios para el modal: primero los asociados al componente maestro (Admin),
   * luego los de alertas del mismo componente. Así Bujías puede mostrar "Cambio de bujías"
   * sin depender de alertas manuales.
   */
  const serviciosDelComponente = useMemo(() => {
    if (!selectedMetric) return [];
    const byId = new Map();
    const add = (s) => {
      if (s?.id != null && !byId.has(s.id)) byId.set(s.id, s);
    };
    // 1) Backend: ComponenteSalud.servicios_asociados → cada ítem de lista trae servicios_asociados
    const desdeComponente = selectedMetric.servicios_asociados;
    if (Array.isArray(desdeComponente)) desdeComponente.forEach(add);
    // 2) Fallback: alertas con servicios_recomendados para este ComponenteSaludVehiculo
    const compSaludVehiculoId = selectedMetric.id;
    if (compSaludVehiculoId && healthData?.alertas?.length) {
      for (const alerta of healthData.alertas) {
        const match =
          alerta.componente_salud === compSaludVehiculoId ||
          alerta.componente_salud_detail?.id === compSaludVehiculoId;
        if (!match || !alerta.servicios_recomendados_detail?.length) continue;
        alerta.servicios_recomendados_detail.forEach(add);
      }
    }
    return Array.from(byId.values());
  }, [selectedMetric, healthData?.alertas]);

  const openDeclaration = (componente) => {
    setDeclKm('');
    setDeclNota('');
    setDeclarationTarget(componente);
    setSelectedMetric(null);
  };

  const handleDeclararMantenimiento = async () => {
    const km = parseInt(declKm, 10);
    if (!km || km <= 0) {
      showAlert('Kilometraje inválido', 'Ingresa los km en los que realizaste el servicio.');
      return;
    }
    const slug = declarationTarget?.slug || declarationTarget?.componente_detail?.slug;
    if (!slug) {
      showAlert('Error', 'No se pudo identificar el componente.');
      return;
    }
    setDeclarando(true);
    try {
      const result = await VehicleHealthService.registrarMantenimiento(vehicleId, {
        componente_slug: slug,
        km_en_el_que_se_hizo: km,
        nota: declNota.trim() || undefined,
      });
      setDeclarationTarget(null);

      const declaredSlug = result?.slug != null ? String(result.slug) : String(slug);
      const kmReg = Number(result?.km_servicio_registrado ?? km);
      const kmOk = Number.isFinite(kmReg) && kmReg > 0;
      const fuente = result?.historial_fuente || 'USUARIO_DECLARADO';
      const fechaIso = result?.fecha_servicio ?? null;
      const kmVehiculo = vehicleData?.kilometraje || 0;

      // Parche inmediato en UI — calcula el % real con Weibull aproximado en lugar de fijar 65.
      const patchRow = (c) => {
        const s = String(c.slug || c.componente_detail?.slug || c.icon_slug || '');
        if (s !== declaredSlug) return c;
        const pct = computeOptimisticPct(c, kmVehiculo, kmOk ? kmReg : km);
        return {
          ...c,
          historial_conocido: true,
          historial_fuente: fuente,
          salud_porcentaje: pct,
          ...(kmOk ? { km_ultimo_servicio: Math.round(kmReg) } : {}),
          ...(fechaIso ? { fecha_ultimo_servicio: fechaIso } : {}),
        };
      };

      // Buscar la fila del componente para el cálculo y para capturar el % previo.
      const compRow = healthData?.componentes?.find?.(
        (c) => String(c.slug || c.componente_detail?.slug || '') === declaredSlug,
      ) ?? declarationTarget;
      const pctOptimista = computeOptimisticPct(compRow || {}, kmVehiculo, kmOk ? kmReg : km);
      // oldPct: valor previo a la declaración — referencia diagnóstica.
      const oldPct = normalizePct(
        compRow?.salud_porcentaje ?? compRow?.salud ?? compRow?.salud_actual ?? 0,
      );
      // Guardar en el Map de parches.
      // TTL largo (24 h) porque Celery puede tardar en propagar y el usuario puede recargar
      // la página; el parche se invalida automáticamente cuando el backend reporta
      // historial_fuente=USUARIO_DECLARADO + km coincidente.
      optimisticDeclRef.current.set(declaredSlug, {
        km: kmOk ? Math.round(kmReg) : null,
        pct: pctOptimista,
        oldPct,
        fuente,
        fechaIso,
        expiry: Date.now() + 24 * 60 * 60 * 1000,
      });
      // Notificar al servicio para que UserPanelScreen y Marketplace usen el parche actualizado.
      VehicleHealthService.setPatchMap(vehicleId, optimisticDeclRef.current);
      persistOptimistic();

      setHealthData((prev) => {
        if (!prev) return prev;
        const list = Array.isArray(prev.componentes) ? prev.componentes : [];
        const nuevosList = list.map(patchRow);
        // Recalcular % global
        const total = nuevosList.length;
        const suma = nuevosList.reduce(
          (acc, c) => acc + normalizePct(c.salud_porcentaje ?? c.salud ?? 0), 0,
        );
        const saludGeneral = total > 0 ? Math.round(suma / total) : prev.salud_general_porcentaje;
        const next = { ...prev, componentes: nuevosList, salud_general_porcentaje: saludGeneral };
        syncVehicleHealthQueryCache(next);
        return next;
      });
      setVehicleData((v) => {
        if (!v) return v;
        const list = Array.isArray(v.health_report) ? v.health_report : [];
        return { ...v, health_report: list.map(patchRow) };
      });
      // Forzar re-render de FlatList en web
      setListRenderVersion((n) => n + 1);

      const msg =
        result?.mensaje ||
        'Mantenimiento registrado. El historial se actualizó; la salud puede tardar unos segundos en reflejarse.';
      setHealthBanner({ type: 'success', message: msg });
      scheduleHealthRefetchBurst();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'No se pudo registrar.';
      showAlert('No se pudo registrar', msg);
    } finally {
      setDeclarando(false);
    }
  };

  // --- RENDERERS ---

  const renderHeader = () => {
    const score = resolveVehicleHealthPct(vehicleData, healthData);
    const componentsCount = healthData?.componentes?.length ?? vehicleData?.health_report?.length ?? 0;

    return (
      <View style={styles.headerSection}>
        <View style={styles.vehicleMetaRow}>
          <View style={styles.vehicleInfo}>
            <Text style={styles.brand}>
              {vehicleData?.marca_nombre || 'Marca'} {vehicleData?.modelo_nombre}
            </Text>
            <Text style={styles.plate}>
              {vehicleData?.patente} • {vehicleData?.year}
            </Text>
            <View style={styles.kmBadge}>
              <Gauge size={14} color={COLORS.primary[500]} strokeWidth={2} fill="none" />
              <Text style={styles.kmText}>
                {vehicleData?.kilometraje?.toLocaleString()} km
              </Text>
            </View>
          </View>
        </View>
        <HealthCard
          score={score}
          componentsCount={componentsCount || null}
          label={getHealthLabel(score)}
          needingCount={priorityCount}
          onAgendar={() => handleNavToService()}
        />
      </View>
    );
  };

  const renderSummary = () => {
    if (!healthData) return null;
    const {
      componentes_optimos = 0,
      componentes_atencion = 0,
      componentes_urgentes = 0,
      componentes_criticos = 0,
      integridad_datos,
    } = healthData;

    const pctVerif = integridad_datos?.porcentaje_verificado ?? null;
    const integridadColor =
      pctVerif == null ? COLORS.neutral.gray[400]
      : pctVerif >= 70  ? COLORS.success[600]
      : pctVerif >= 40  ? COLORS.warning[600]
      : COLORS.error[500];

    return (
      <View>
        <View style={styles.summaryContainer}>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: COLORS.success[600] }]} />
              <Text style={styles.legendText}>{componentes_optimos} Óptimos</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: COLORS.warning[600] }]} />
              <Text style={styles.legendText}>{componentes_atencion} Atención</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: COLORS.error[500] }]} />
              <Text style={styles.legendText}>{componentes_urgentes} Urgentes</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: COLORS.error[800] }]} />
              <Text style={styles.legendText}>{componentes_criticos} Críticos</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.helpLink} onPress={() => setShowHelpModal(true)}>
            <HelpCircle size={18} color={COLORS.primary[500]} />
            <Text style={styles.helpLinkText}>Ayuda</Text>
          </TouchableOpacity>
        </View>

        {/* Bloque de integridad de datos */}
        {integridad_datos && (
          <View style={styles.integridadCard}>
            <View style={styles.integridadHeader}>
              {pctVerif >= 70
                ? <ShieldCheck size={16} color={integridadColor} />
                : <ShieldAlert size={16} color={integridadColor} />
              }
              <Text style={[styles.integridadTitle, { color: integridadColor }]}>
                Confiabilidad de datos: {Math.round(pctVerif ?? 0)}% verificado
              </Text>
            </View>

            {/* Barra de composición */}
            <View style={styles.integridadBarTrack}>
              {integridad_datos.total > 0 && (
                <>
                  <View style={[
                    styles.integridadBarSegment,
                    { flex: integridad_datos.verificados_taller, backgroundColor: COLORS.success[500] },
                  ]} />
                  <View style={[
                    styles.integridadBarSegment,
                    { flex: integridad_datos.declarados_usuario, backgroundColor: COLORS.warning[400] },
                  ]} />
                  <View style={[
                    styles.integridadBarSegment,
                    { flex: integridad_datos.estimados_engine, backgroundColor: COLORS.neutral.gray[300] },
                  ]} />
                </>
              )}
            </View>

            <View style={styles.integridadLegend}>
              <View style={styles.integridadLegendItem}>
                <View style={[styles.dot, { backgroundColor: COLORS.success[500] }]} />
                <Text style={styles.integridadLegendText}>{integridad_datos.verificados_taller} Verificados</Text>
              </View>
              <View style={styles.integridadLegendItem}>
                <View style={[styles.dot, { backgroundColor: COLORS.warning[400] }]} />
                <Text style={styles.integridadLegendText}>{integridad_datos.declarados_usuario} Declarados</Text>
              </View>
              <View style={styles.integridadLegendItem}>
                <View style={[styles.dot, { backgroundColor: COLORS.neutral.gray[400] }]} />
                <Text style={styles.integridadLegendText}>{integridad_datos.estimados_engine} Estimados</Text>
              </View>
            </View>

            {!!integridad_datos.advertencia && (
              <Text style={styles.integridadAdvertencia}>{integridad_datos.advertencia}</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  /**
   * Fusión health + predicciones. Cada componente lleva `_prediction`.
   */
  const mergedComponents = useMemo(() => {
    const summaryList =
      healthData && Array.isArray(healthData.componentes) ? healthData.componentes : null;
    const rawComponents =
      summaryList && summaryList.length > 0 ? summaryList : vehicleData?.health_report || [];

    const predMap = new Map();
    if (predictionsData?.predicciones) {
      for (const p of predictionsData.predicciones) {
        const key = p.slug || p.componente_slug || p.componente_id;
        if (key) predMap.set(String(key), p);
      }
    }

    return rawComponents.map((c) => {
      const slug = c.slug || c.componente_detail?.slug || c.icon_slug || '';
      const pred = predMap.get(slug) || null;
      return { ...c, _prediction: pred };
    });
  }, [healthData, vehicleData, predictionsData]);

  /**
   * Componentes a solucionar (< 70 %), ordenados de peor a mejor salud.
   * Incluye críticos, urgentes y atención — no solo cercanos a 0 %.
   */
  const priorityComponents = useMemo(
    () =>
      mergedComponents
        .filter((c) => {
          const st = getHealthStatus(componentPct(c));
          return st === 'CRITICO' || st === 'URGENTE' || st === 'ATENCION';
        })
        .sort((a, b) => componentPct(a) - componentPct(b)),
    [mergedComponents],
  );

  const priorityCount = priorityComponents.length;

  const flatListData = useMemo(() => {
    const optimos = mergedComponents
      .filter((c) => componentPct(c) >= 70)
      .sort((a, b) => componentPct(a) - componentPct(b));

    const pushSection = (result, { title, subtitle, tone, key, items }) => {
      if (!items.length) return;
      result.push({
        type: 'section',
        title,
        subtitle,
        count: items.length,
        tone,
        key,
      });
      items.forEach((c, i) => {
        const isFirst = i === 0;
        const isLast = i === items.length - 1;
        result.push({
          ...c,
          type: 'component',
          _sectionTone: tone,
          _sectionRole: isFirst && isLast ? 'only' : isFirst ? 'first' : isLast ? 'last' : 'middle',
          _isLastInSection: isLast,
        });
      });
    };

    const result = [];
    pushSection(result, {
      title: 'Para atender',
      subtitle: 'Críticos, urgentes y con atención — de peor a mejor salud',
      tone: 'attention',
      key: 'sec_priority',
      items: priorityComponents,
    });
    pushSection(result, {
      title: 'En buen estado',
      subtitle: 'Óptimos · no requieren acción ahora',
      tone: 'ok',
      key: 'sec_ok',
      items: optimos,
    });
    return result;
  }, [mergedComponents, priorityComponents]);

  return (
    <View style={[styles.screen, webRootStyle]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

      <View style={[styles.screenHeader, { paddingTop: insets.top + 8 }]}>
        <BackButton onPress={() => navigation.goBack()} color={COLORS.text.primary} />
        <Text style={styles.screenTitle}>Salud del Vehículo</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        style={styles.mainList}
        removeClippedSubviews={Platform.OS !== 'web'}
        data={flatListData}
        extraData={
          Platform.OS === 'web'
            ? `v${listRenderVersion}-${healthData?.fecha_calculo ?? ''}-${healthData?.ultima_actualizacion ?? ''}-${vehicleData?.kilometraje ?? ''}-${flatListData.length}`
            : [healthData, listRenderVersion]
        }
        keyExtractor={(item, index) => {
          if (item.type === 'section') return `${item.key}-${index}`;
          const stableId = item.id ?? item.componente_salud_id;
          const slug = item.slug || item.componente_detail?.slug || item.icon_slug || 'c';
          return stableId != null ? `comp-${stableId}-i${index}` : `comp-${slug}-i${index}`;
        }}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary[500]}
            colors={[COLORS.primary[500]]}
          />
        }
        ListHeaderComponent={
          <>
            {healthBanner?.message ? (
              <View style={styles.healthBanner} accessibilityRole="alert">
                <CheckCircle size={20} color={COLORS.success[600]} style={{ flexShrink: 0 }} />
                <Text style={styles.healthBannerText}>{healthBanner.message}</Text>
                <TouchableOpacity
                  onPress={() => setHealthBanner(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Cerrar aviso"
                >
                  <X size={18} color={COLORS.text.tertiary} />
                </TouchableOpacity>
              </View>
            ) : null}
            {renderHeader()}
            {renderSummary()}
            {/* Barra de acciones: título + botón sincronizar */}
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Componentes</Text>
              <TouchableOpacity
                style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
                onPress={handleSync}
                disabled={syncing}
                accessibilityLabel="Sincronizar métricas de salud"
              >
                {syncing ? (
                  <Hourglass size={18} color={COLORS.text.tertiary} strokeWidth={2} fill="none" />
                ) : (
                  <RefreshCw size={18} color={COLORS.primary[500]} strokeWidth={2} fill="none" />
                )}
                <Text style={[styles.syncButtonText, syncing && styles.syncButtonTextDisabled]}>
                  {syncing ? 'Actualizando…' : 'Sincronizar'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item }) => {
          if (item.type === 'section') {
            const isOk = item.tone === 'ok';
            return (
              <View
                style={[
                  styles.listSectionHeader,
                  isOk ? styles.listSectionHeaderOk : styles.listSectionHeaderAttention,
                ]}
              >
                <View style={styles.listSectionTextCol}>
                  <View style={styles.listSectionTitleRow}>
                    <Text
                      style={[
                        styles.listSectionTitle,
                        isOk && styles.listSectionTitleOk,
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.listSectionCount}>{item.count}</Text>
                  </View>
                  {!!item.subtitle && (
                    <Text style={styles.listSectionSubtitle}>{item.subtitle}</Text>
                  )}
                </View>
              </View>
            );
          }
          return (
            <ComponentRow
              item={item}
              onPress={handleMetricPress}
              isLast={!!item._isLastInSection}
              sectionRole={item._sectionRole}
              sectionTone={item._sectionTone}
            />
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={90} width={'100%'} borderRadius={12} />
              <Skeleton height={90} width={'100%'} borderRadius={12} />
              <Skeleton height={90} width={'100%'} borderRadius={12} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <CheckCircle size={64} color={COLORS.neutral.gray[300]} />
              <Text style={styles.emptyText}>Sin datos de componentes.</Text>
              <Text style={styles.emptySubText}>Tu vehículo parece estar nuevo en el sistema o no tiene reglas asignadas.</Text>
            </View>
          )
        }
      />

      {/* Modal de declaración retroactiva de mantenimiento */}
      <Modal
        visible={!!declarationTarget}
        transparent
        animationType="slide"
        onRequestClose={() => !declarando && setDeclarationTarget(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => !declarando && setDeclarationTarget(null)}
          />
          <Animatable.View animation="slideInUp" duration={280} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <ClipboardEdit size={20} color={COLORS.primary[500]} />
              <Text style={[styles.modalTitle, { flex: 1, marginLeft: 8 }]}>
                Declarar mantenimiento
              </Text>
              <TouchableOpacity onPress={() => !declarando && setDeclarationTarget(null)}>
                <X size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.declModalComponent}>
              Componente: <Text style={{ fontWeight: '700' }}>
                {declarationTarget?.nombre || declarationTarget?.name || 'Componente'}
              </Text>
            </Text>
            <Text style={styles.declModalHint}>
              Indica los kilómetros del vehículo cuando realizaste este servicio. Quedará marcado
              como "Declarado por ti" y el sistema recalculará la salud con un tope máximo de 65%.
              Un taller puede verificarlo y subirlo a 100%.
            </Text>

            <Text style={styles.declLabel}>Kilómetros en los que se realizó *</Text>
            <TextInput
              style={styles.declInput}
              placeholder="Ej: 120000"
              placeholderTextColor={COLORS.text.tertiary}
              keyboardType="numeric"
              value={declKm}
              onChangeText={setDeclKm}
              editable={!declarando}
            />

            <Text style={styles.declLabel}>Nota (opcional)</Text>
            <TextInput
              style={[styles.declInput, styles.declInputMulti]}
              placeholder="Ej: Cambio de correa en taller Novauto"
              placeholderTextColor={COLORS.text.tertiary}
              multiline
              numberOfLines={3}
              value={declNota}
              onChangeText={setDeclNota}
              editable={!declarando}
            />

            <Button
              title={declarando ? 'Registrando…' : 'Registrar mantenimiento'}
              onPress={handleDeclararMantenimiento}
              disabled={declarando || !declKm}
            />
          </Animatable.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Help Modal */}
      <Modal
        visible={showHelpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowHelpModal(false)}
          />
          <Animatable.View animation="zoomIn" duration={300} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>¿Cómo calculamos la salud de tu vehículo?</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <X size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.helpScrollView}
              contentContainerStyle={styles.helpScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.helpSectionText}>
                Evaluamos cada componente (aceite, filtros, frenos, etc.) según los kilómetros desde su último cambio o servicio.
              </Text>
              <Text style={styles.helpSectionText}>
                Usamos un modelo de confiabilidad que relaciona el kilometraje con la vida útil recomendada de cada pieza.
              </Text>
              <Text style={styles.helpSectionText}>
                La salud es un porcentaje: a más km desde el último mantenimiento, menor porcentaje.
              </Text>

              <Text style={styles.helpSubtitle}>Niveles de estado</Text>
              <View style={styles.helpLevelRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.success[600] }]} />
                <Text style={styles.helpLevelText}>Óptimo (≥70%): en buen estado.</Text>
              </View>
              <View style={styles.helpLevelRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.warning[600] }]} />
                <Text style={styles.helpLevelText}>Atención (40–70%): planificar revisión pronto.</Text>
              </View>
              <View style={styles.helpLevelRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.error[500] }]} />
                <Text style={styles.helpLevelText}>Urgente (10–40%): revisar a la brevedad.</Text>
              </View>
              <View style={styles.helpLevelRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.error[700] }]} />
                <Text style={styles.helpLevelText}>Crítico ({'<'}10%): atención inmediata.</Text>
              </View>

              <Text style={styles.helpSubtitle}>Ejemplo</Text>
              <Text style={styles.helpSectionText}>
                Si un componente tiene vida útil de 50.000 km y han pasado 25.000 km desde el último cambio, la salud se calcula en aproximadamente 78% (Óptimo). Si han pasado 45.000 km, sería ~45% (Atención). Si supera los 50.000 km, baja más y puede pasar a Urgente o Crítico.
              </Text>

              <Text style={styles.helpSubtitle}>Confiabilidad de los datos</Text>
              <View style={styles.helpLevelRow}>
                <ShieldCheck size={14} color={COLORS.success[600]} />
                <Text style={styles.helpLevelText}>
                  <Text style={{ fontWeight: '700' }}>Verificado</Text>: el taller registró el servicio o fue incluido al registrar el vehículo. Máxima precisión.
                </Text>
              </View>
              <View style={styles.helpLevelRow}>
                <ShieldAlert size={14} color={COLORS.warning[600]} />
                <Text style={styles.helpLevelText}>
                  <Text style={{ fontWeight: '700' }}>Declarado</Text>: tú indicaste cuándo se realizó el servicio. El sistema acepta el dato pero limita la salud a 65% hasta que un taller lo confirme.
                </Text>
              </View>
              <View style={styles.helpLevelRow}>
                <ShieldAlert size={14} color={COLORS.neutral.gray[400]} />
                <Text style={styles.helpLevelText}>
                  <Text style={{ fontWeight: '700' }}>Estimado</Text>: no hay registro del último servicio; el algoritmo estima la salud según edad y km del vehículo. Puedes declarar el km de servicio para mejorar la precisión.
                </Text>
              </View>
            </ScrollView>

            <Button title="Entendido" onPress={() => setShowHelpModal(false)} />
          </Animatable.View>
        </View>
      </Modal>

      <ComponentHealthDetailSheet
        visible={!!selectedMetric}
        metric={selectedMetric}
        servicios={serviciosDelComponente}
        onClose={() => setSelectedMetric(null)}
        onDeclare={openDeclaration}
        onSelectService={(srv, metric) => {
          setSelectedMetric(null);
          handleNavToService(buildMetricServiceNavPayload(metric, srv));
        }}
        onAgendarGeneric={(metric) => {
          setSelectedMetric(null);
          handleNavToService(buildMetricServiceNavPayload(metric, null));
        }}
      />
    </View>
  );
};

const createStyles = (_insets) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background.default,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  mainList: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.container.horizontal,
    paddingBottom: SPACING.sm,
    zIndex: 10,
    backgroundColor: COLORS.background.default,
  },
  screenTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.container.horizontal,
    paddingBottom: 40,
  },
  healthBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.success[50],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.success[200],
    borderRadius: BORDERS.radius.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  healthBannerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  headerSection: {
    marginBottom: SPACING.sm,
  },
  vehicleMetaRow: {
    marginBottom: SPACING.sm,
  },
  listSectionHeader: {
    paddingBottom: SPACING.sm,
  },
  listSectionHeaderAttention: {
    marginTop: SPACING.xs,
  },
  listSectionHeaderOk: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
  },
  listSectionTextCol: {
    flex: 1,
    minWidth: 0,
  },
  listSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  listSectionTitle: {
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.text.primary,
  },
  listSectionTitleOk: {
    color: COLORS.text.secondary,
  },
  listSectionCount: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.secondary,
  },
  listSectionSubtitle: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    padding: SPACING.lg,
    borderRadius: BORDERS.radius.card.lg,
    marginBottom: SPACING.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  vehicleInfo: {
    flex: 1,
  },
  brand: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    textTransform: 'uppercase',
  },
  plate: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    marginTop: SPACING.xxs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  kmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xxs,
    borderRadius: BORDERS.radius.sm,
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
    gap: 6,
  },
  kmText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary[600],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
  },
  scoreText: {
    fontSize: 22,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  scoreLabel: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.xxs,
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: COLORS.primary[50],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[100],
    flexShrink: 0,
  },
  syncButtonDisabled: {
    opacity: 0.5,
    backgroundColor: COLORS.neutral.gray[100],
    borderColor: COLORS.border.light,
  },
  syncButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.primary[600],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  syncButtonTextDisabled: {
    color: COLORS.text.tertiary,
  },
  legendRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xxs,
  },
  helpLinkText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.primary[600],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  helpScrollView: {
    maxHeight: 320,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  helpScrollContent: {
    paddingBottom: SPACING.xs,
  },
  helpSectionText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  helpSubtitle: {
    fontSize: 15,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  helpLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 6,
  },
  helpLevelText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    flex: 1,
  },
  // Bloque de integridad de datos
  integridadCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  integridadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  integridadTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  integridadBarTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.gray[200],
    marginBottom: SPACING.xs,
  },
  integridadBarSegment: {
    height: '100%',
  },
  integridadLegend: {
    flexDirection: 'row',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  integridadLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  integridadLegendText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
  },
  integridadAdvertencia: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.warning[700],
    marginTop: SPACING.xs,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  // Confianza historial en modal detalle
  confianzaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BORDERS.radius.card.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    flexWrap: 'wrap',
  },
  confianzaText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    flex: 1,
  },
  inspeccionBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BORDERS.radius.card.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.success[50],
    borderWidth: 1,
    borderColor: COLORS.success[100] || COLORS.success[200],
  },
  inspeccionText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.success[700] || COLORS.success[600],
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    flex: 1,
  },
  declararBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[100],
  },
  declararBtnText: {
    fontSize: 11,
    color: COLORS.primary[600],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  // Modal de declaración retroactiva
  declModalComponent: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  declModalHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    lineHeight: 18,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.warning[50],
    borderRadius: BORDERS.radius.input.sm,
    padding: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning[400],
  },
  declLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    marginBottom: 4,
    marginTop: SPACING.xs,
  },
  declInput: {
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.default,
    borderRadius: BORDERS.radius.input.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.default,
    marginBottom: SPACING.xs,
  },
  declInputMulti: {
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
  },
  emptySubText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    maxWidth: '70%',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.background.overlay,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  modalCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.modal.lg,
    padding: SPACING.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    ...SHADOWS.lg,
    ...(Platform.OS === 'web' ? { maxHeight: '90vh', minHeight: 0 } : {}),
  },
  modalCardLarge: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.modal.lg,
    padding: SPACING.lg,
    maxHeight: '85%',
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    ...SHADOWS.lg,
    ...(Platform.OS === 'web' ? { maxHeight: '85vh', minHeight: 0 } : {}),
  },
  modalScroll: {
    maxHeight: 340,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  modalScrollContent: {
    paddingBottom: SPACING.xs,
  },
  modalSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xxs,
  },
  modalSectionHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  infoBoxLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: BORDERS.radius.card.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  serviceCardIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  serviceCardBody: {
    flex: 1,
    minWidth: 0,
  },
  serviceCardTitle: {
    fontSize: 15,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  serviceCardDesc: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: SPACING.xxs,
    lineHeight: 18,
  },
  serviceCardMeta: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[600],
    marginTop: 6,
  },
  modalButtonSecondary: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDERS.radius.button.md,
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  modalButtonSecondaryText: {
    color: COLORS.text.primary,
    fontSize: 15,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  modalBody: {
    marginBottom: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  infoText: {
    fontSize: 15,
    color: COLORS.text.secondary,
  },
  bold: {
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  infoBox: {
    backgroundColor: COLORS.neutral.gray[100],
    padding: SPACING.md,
    borderRadius: BORDERS.radius.input.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    marginBottom: SPACING.sm,
  },
  infoBoxText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  infoTextMuted: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.tertiary,
  },
  estimadoInline: {
    fontSize: 10,
    color: COLORS.neutral.gray[400],
    fontStyle: 'italic',
  },
  // Modal: bloque de salud visual
  healthBlock: {
    backgroundColor: COLORS.neutral.gray[100],
    borderRadius: BORDERS.radius.card.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  healthBlockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  healthBlockLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  healthBlockPct: {
    fontSize: 22,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  healthBlockNivel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginTop: 4,
  },
  modalBarTrack: {
    height: 6,
    backgroundColor: COLORS.neutral.gray[300],
    borderRadius: 3,
    overflow: 'hidden',
  },
  modalBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Modal: bloque "Cuándo actuar"
  actionBlock: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  actionBlockLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  actionBlockValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  actionBlockClima: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.warning[700],
    marginTop: 6,
    lineHeight: 18,
  },
  // Modal: bloque de riesgo
  riskBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    borderRadius: BORDERS.radius.card.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  riskBlockText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    flex: 1,
    lineHeight: 20,
  },
});

export default VehicleHealthScreen;
