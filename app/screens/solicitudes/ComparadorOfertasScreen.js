import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CircleAlert, ArrowLeftRight } from 'lucide-react-native';
import ComparadorCatalogoCompareFooter from '../../components/agendamiento-asistido/ComparadorCatalogoCompareFooter';
import GuestGradientButton from '../../components/guest/GuestGradientButton';
import { ROUTES } from '../../utils/constants';
import ComparadorOfertas from '../../components/ofertas/ComparadorOfertas';
import ComparadorCatalogoIaPanel from '../../components/agendamiento-asistido/ComparadorCatalogoIaPanel';
import SolicitudFlowHeader from '../../components/solicitudes/SolicitudFlowHeader';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { useAgendamiento } from '../../context/AgendamientoContext';
import ofertasService from '../../services/ofertasService';
import { mapCandidatoToOfertaComparador } from '../../services/agendamientoAsistidoService';
import { useAgendamientoAsistido } from '../../hooks/useAgendamientoAsistido';
import { resolveCoordenadasServicio } from '../../utils/coordenadasServicio';
import { PROVIDER_RECOMMENDATION_MAX_KM } from '../../utils/exploreProviderUtils';
import { resolveMarcaVehiculoNombre } from '../../utils/catalogoComparadorCobertura';
import { extraerComunasDesdeDireccion } from '../../utils/extraerComunasDesdeDireccion';
import { resolveUbicacionConfirmacionFromOferta } from '../../utils/solicitudModalidadServicio';
import { COLORS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';
import { ROUTES as APP_ROUTES } from '../../utils/constants';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';

/**
 * Pantalla para comparar múltiples ofertas lado a lado
 */
const ComparadorOfertasScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const webScreenFrame =
    Platform.OS === 'web'
      ? {
          height: windowHeight,
          maxHeight: windowHeight,
          minHeight: 0,
          flex: 1,
          overflow: 'hidden',
        }
      : null;

  const {
    solicitudId,
    ofertas: ofertasIds,
    modoCatalogo = false,
    ofertasPreview = [],
    ofertasRecomendadas = [],
    ofertasOtros = [],
    radioKm = PROVIDER_RECOMMENDATION_MAX_KM,
    formPayload = null,
    mensajeRepuestos: mensajeRepuestosParam = null,
  } = route.params || {};

  const { seleccionarOferta } = useSolicitudes();
  const { cargarTodosLosCarritos } = useAgendamiento();
  const { cargarCandidatos } = useAgendamientoAsistido();

  const [ofertas, setOfertas] = useState([]);
  const [ofertasOtrosState, setOfertasOtrosState] = useState([]);
  const [radioKmState, setRadioKmState] = useState(radioKm);
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState(null);
  const [compareFooter, setCompareFooter] = useState(null);
  const [mensajeRepuestos, setMensajeRepuestos] = useState(mensajeRepuestosParam);

  useEffect(() => {
    cargarOfertas();
  }, [ofertasIds, solicitudId, modoCatalogo, ofertasPreview, formPayload?.vehiculo?.id]);

  const cargarOfertas = async () => {
    try {
      setLoading(true);
      setErrorValidacion(null);

      if (modoCatalogo) {
        if (formPayload?.vehiculo?.id) {
          const servicioIds = (formPayload.servicios_seleccionados || [])
            .map((s) => s.id)
            .filter(Boolean);
          const coords = resolveCoordenadasServicio(formPayload);
          if (coords && servicioIds.length > 0) {
            try {
              const comunasExtraidas = extraerComunasDesdeDireccion(formPayload.direccion_usuario);
              const direccionTexto =
                formPayload.direccion_servicio_texto?.trim()
                || formPayload.direccion_usuario?.direccion?.trim()
                || '';
              const {
                recomendados,
                otros,
                radioKm: radioApi,
                mensajeRepuestos: mensajeRepApi,
              } = await cargarCandidatos({
                vehiculoId: formPayload.vehiculo.id,
                servicioIds,
                lat: coords.lat,
                lng: coords.lng,
                comunasExtraidas,
                direccionTexto,
                requiereRepuestos: formPayload.requiere_repuestos !== false,
              });
              const recApi = recomendados.map(mapCandidatoToOfertaComparador).filter(Boolean);
              const otrosApi = otros.map(mapCandidatoToOfertaComparador).filter(Boolean);
              if (recApi.length > 0 || otrosApi.length > 0) {
                setOfertas(recApi);
                setOfertasOtrosState(otrosApi);
                setRadioKmState(radioApi ?? radioKm);
                setMensajeRepuestos(mensajeRepApi ?? null);
                setLoading(false);
                return;
              }
            } catch (err) {
              console.warn('Comparador catálogo: refetch candidatos', err?.message || err);
            }
          }
        }

        const rec = Array.isArray(ofertasRecomendadas) && ofertasRecomendadas.length > 0
          ? ofertasRecomendadas
          : (Array.isArray(ofertasPreview) ? ofertasPreview : []);
        const otros = Array.isArray(ofertasOtros) ? ofertasOtros : [];
        if (rec.length > 0 || otros.length > 0) {
          setOfertas(rec);
          setOfertasOtrosState(otros);
          setRadioKmState(radioKm);
          setLoading(false);
          return;
        }
      }

      if (solicitudId) {
        try {
          const solicitudesService = (await import('../../services/solicitudesService')).default;
          const solicitudData = await solicitudesService.obtenerDetalleSolicitud(solicitudId);
          const solicitudNormalizada = solicitudData && solicitudData.type === 'Feature' && solicitudData.properties
            ? { ...solicitudData.properties, id: solicitudData.id || solicitudData.properties.id, geometry: solicitudData.geometry }
            : solicitudData;
          setSolicitud(solicitudNormalizada);
        } catch (error) {
          console.error('Error cargando solicitud:', error);
        }
      }

      let ofertasData = [];
      if (ofertasIds && ofertasIds.length > 0) {
        const promesas = ofertasIds.map(id =>
          ofertasService.obtenerDetalleOferta(id)
        );
        ofertasData = await Promise.all(promesas);

        if (solicitudId) {
          const ofertasInvalidas = ofertasData.filter(o => {
            const ofertaSolicitudId = o.solicitud || (typeof o.solicitud === 'object' ? o.solicitud.id : null);
            return ofertaSolicitudId !== solicitudId && String(ofertaSolicitudId) !== String(solicitudId);
          });

          if (ofertasInvalidas.length > 0) {
            setErrorValidacion('Las ofertas deben pertenecer a la misma solicitud.');
            setOfertas([]);
            setLoading(false);
            return;
          }
        } else {
          const solicitudesIds = ofertasData.map(o => {
            const sid = o.solicitud || (typeof o.solicitud === 'object' ? o.solicitud.id : null);
            return String(sid);
          }).filter(id => id && id !== 'null' && id !== 'undefined');

          const solicitudesUnicas = [...new Set(solicitudesIds)];
          if (solicitudesUnicas.length > 1) {
            setErrorValidacion('Las ofertas deben pertenecer a la misma solicitud.');
            setOfertas([]);
            setLoading(false);
            return;
          }
        }
      } else if (solicitudId) {
        ofertasData = await ofertasService.obtenerOfertasDeSolicitud(solicitudId);
      }

      setOfertas(ofertasData);
    } catch (error) {
      console.error('Error cargando ofertas:', error);
      Alert.alert('Error', 'No se pudieron cargar las ofertas');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAceptarOferta = async (oferta) => {
    if (modoCatalogo) {
      const ofertaIds = Array.isArray(oferta.oferta_servicio_ids) && oferta.oferta_servicio_ids.length
        ? oferta.oferta_servicio_ids
        : oferta.oferta_servicio_id
          ? [oferta.oferta_servicio_id]
          : [];
      if (!formPayload || !ofertaIds.length) {
        Alert.alert('Error', 'Faltan datos para confirmar el proveedor');
        return;
      }
      const tipoProv = oferta.tipo_proveedor === 'mecanico' ? 'mecanico' : 'taller';
      const proveedorId = oferta.proveedor_id;
      if (!proveedorId) {
        Alert.alert('Error', 'No se pudo identificar el proveedor para la agenda.');
        return;
      }
      const nombre = oferta.nombre_proveedor || oferta.proveedor_nombre || 'el proveedor';
      const agendaContext = {
        tipoProveedor: tipoProv,
        proveedorId,
        proveedorEntityId: proveedorId,
        ofertaServicioId: ofertaIds[0],
      };
      navigation.navigate(APP_ROUTES.CALENDARIO_PROVEEDOR, {
        ...agendaContext,
        tipoProveedor: tipoProv,
        proveedorId,
        proveedorEntityId: proveedorId,
        proveedorNombre: nombre,
        ofertaServicioId: ofertaIds[0],
        agendaContext: {
          ...agendaContext,
          ofertaServicioId: ofertaIds[0],
        },
        returnRoute: ROUTES.COMPARADOR_OFERTAS,
        returnParams: {
          modoCatalogo: true,
          ofertasPreview: ofertas,
          ofertasRecomendadas: ofertas,
          ofertasOtros: ofertasOtrosState,
          radioKm: radioKmState,
          formPayload,
          pendingConfirmOferta: {
            oferta_servicio_id: ofertaIds[0],
            oferta_servicio_ids: ofertaIds,
            score_match: oferta.score_match,
            tipo_proveedor: tipoProv,
            ...resolveUbicacionConfirmacionFromOferta(oferta),
          },
        },
      });
      return;
    }

    if (!solicitudId) {
      Alert.alert('Error', 'No se encontró la solicitud');
      return;
    }

    if (
      solicitud &&
      (solicitud.estado === 'adjudicada' || solicitud.estado === 'esperando_creditos_proveedor')
    ) {
      Alert.alert(
        solicitud.estado === 'esperando_creditos_proveedor'
          ? 'Elección en curso'
          : 'Solicitud ya adjudicada',
        solicitud.estado === 'esperando_creditos_proveedor'
          ? 'Ya elegiste un proveedor; está pendiente que confirme con créditos antes de pagar.'
          : 'Esta solicitud ya tiene una oferta aceptada.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    Alert.alert(
      'Confirmar Selección',
      `¿Deseas aceptar la oferta de ${oferta.nombre_proveedor} por $${parseInt(oferta.precio_total_ofrecido).toLocaleString()}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          style: 'default',
          onPress: async () => {
            setProcesando(true);
            try {
              const resultado = await seleccionarOferta(solicitudId, oferta.id);

              if (resultado?.estado_resultado === 'esperando_creditos_proveedor') {
                Alert.alert(
                  'Proveedor elegido',
                  'El proveedor debe confirmar con créditos antes de que puedas pagar. Actualizamos tu solicitud en la lista.',
                  [{ text: 'Entendido', onPress: () => navigation.goBack() }]
                );
                return;
              }

              if (resultado && (resultado.carrito || resultado.sin_carrito)) {
                try {
                  await cargarTodosLosCarritos();
                } catch (error) {
                  console.error('Error recargando carritos:', error);
                }

                const tieneDesgloseRepuestos = oferta.incluye_repuestos &&
                  parseFloat(oferta.costo_repuestos || 0) > 0 &&
                  parseFloat(oferta.costo_mano_obra || 0) > 0;

                Alert.alert(
                  '¡Oferta Aceptada!',
                  tieneDesgloseRepuestos
                    ? 'La oferta incluye repuestos. ¿Cómo deseas realizar el pago?'
                    : '¿Deseas proceder con el pago ahora?',
                  [
                    { text: 'Ver Detalles', style: 'cancel', onPress: () => navigation.goBack() },
                    {
                      text: 'Pagar Ahora',
                      onPress: async () => {
                        navigation.navigate('OpcionesPago', {
                          solicitudId: solicitudId,
                          origen: 'solicitud_publica',
                          ofertaId: oferta.id
                        });
                      }
                    }
                  ]
                );
              } else if (resultado && resultado.solicitud_tradicional_id) {
                navigation.navigate(ROUTES.OPCIONES_PAGO || 'OpcionesPago', {
                  solicitudId: resultado.solicitud_tradicional_id
                });
              } else {
                Alert.alert('Éxito', 'Oferta aceptada correctamente');
                navigation.goBack();
              }
            } catch (error) {
              console.error('Error aceptando oferta:', error);
              const mensaje = error.response?.data?.detail || error.response?.data?.error || error.message || 'No se pudo aceptar la oferta';
              Alert.alert('Error', mensaje);
            } finally {
              setProcesando(false);
            }
          }
        }
      ]
    );
  };

  const requiereRepuestos = formPayload?.requiere_repuestos !== false;
  const userCoords = useMemo(
    () => (formPayload ? resolveCoordenadasServicio(formPayload) : null),
    [formPayload],
  );

  const marcaVehiculoNombre = useMemo(
    () => resolveMarcaVehiculoNombre(formPayload?.vehiculo),
    [formPayload?.vehiculo],
  );

  const tipoMotorVehiculo = useMemo(
    () => formPayload?.vehiculo?.tipo_motor ?? null,
    [formPayload?.vehiculo],
  );

  const tipoProveedorPreferido = useMemo(() => {
    const t =
      formPayload?.tipoProveedor
      ?? formPayload?.tipo_proveedor_preseleccionado
      ?? formPayload?.tipoProveedorPreseleccionado;
    return t === 'mecanico' || t === 'taller' ? t : null;
  }, [formPayload]);

  const shell = (body) => (
    <View style={[styles.container, webScreenFrame]}>
      <View style={styles.headerHost}>
        <SolicitudFlowHeader
          title="Comparar ofertas"
          onBack={() => navigation.goBack()}
        />
      </View>
      {body}
    </View>
  );

  if (loading) {
    return shell(
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.primary[500]} />
            <Text style={styles.loadingTitle}>Cargando ofertas</Text>
            <Text style={styles.loadingSubtitle}>Preparando la comparación...</Text>
          </View>
        </View>
    );
  }

  if (errorValidacion) {
    return shell(
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: COLORS.error[50], borderColor: COLORS.error[200] }]}>
            <CircleAlert size={48} color={COLORS.error.main} strokeWidth={1.75} />
          </View>
          <Text style={styles.emptyTitle}>Error de Validación</Text>
          <Text style={styles.emptyText}>{errorValidacion}</Text>
          <GuestGradientButton
            title="Volver"
            onPress={() => navigation.goBack()}
            size="compact"
          />
        </View>
    );
  }

  const totalCatalogo = ofertas.length + ofertasOtrosState.length;
  const minOfertas = modoCatalogo ? 1 : 2;
  if ((modoCatalogo ? totalCatalogo : ofertas.length) < minOfertas) {
    return shell(
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: COLORS.warning[50], borderColor: COLORS.warning[200] }]}>
            <ArrowLeftRight size={48} color={COLORS.warning.main} strokeWidth={1.75} />
          </View>
          <Text style={styles.emptyTitle}>
            {modoCatalogo ? 'Sin proveedores' : 'Ofertas Insuficientes'}
          </Text>
          <Text style={styles.emptyText}>
            {modoCatalogo
              ? 'No hay proveedores de catálogo disponibles para comparar.'
              : 'Necesitas al menos 2 ofertas para poder compararlas'}
          </Text>
          <GuestGradientButton
            title="Volver a Ofertas"
            onPress={() => navigation.goBack()}
            size="compact"
          />
        </View>
    );
  }

  const catalogScrollPad = modoCatalogo && compareFooter?.visible
    ? insets.bottom + 88
    : insets.bottom + 24;

  return shell(
    <View style={styles.scrollHost}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: catalogScrollPad },
        ]}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
        keyboardShouldPersistTaps="handled"
        {...(Platform.OS === 'web' ? { nestedScrollEnabled: true } : {})}
      >
        {modoCatalogo ? (
          <ComparadorCatalogoIaPanel
            ofertasRecomendadas={ofertas}
            ofertasOtros={ofertasOtrosState}
            radioKm={radioKmState}
            onAceptar={handleAceptarOferta}
            procesando={procesando}
            requiereRepuestos={requiereRepuestos}
            userCoords={userCoords}
            marcaVehiculoNombre={marcaVehiculoNombre}
            tipoMotorVehiculo={tipoMotorVehiculo}
            tipoProveedorPreferido={tipoProveedorPreferido}
            mensajeRepuestos={mensajeRepuestos}
            onCompareFooterChange={setCompareFooter}
          />
        ) : (
          <ComparadorOfertas
            ofertas={ofertas}
            solicitud={solicitud}
            onAceptarOferta={solicitud && solicitud.estado === 'adjudicada' ? undefined : handleAceptarOferta}
            solicitudAdjudicada={solicitud && solicitud.estado === 'adjudicada'}
            solicitudId={solicitudId}
          />
        )}
      </ScrollView>

      {modoCatalogo && compareFooter?.visible ? (
        <ComparadorCatalogoCompareFooter
          countSel={compareFooter.countSel}
          compareEnabled={compareFooter.compareEnabled}
          onPress={compareFooter.onPress}
          bottomInset={insets.bottom}
        />
      ) : null}

      {procesando ? (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color={COLORS.primary[500]} />
            <Text style={styles.processingText}>Procesando oferta...</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
    ...(Platform.OS === 'web' ? { height: '100vh' } : null),
  },
  headerHost: {
    flexShrink: 0,
  },
  scrollHost: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === 'web' ? { overflow: 'hidden' } : null),
  },
  scrollView: {
    flex: 1,
    ...(Platform.OS === 'web'
      ? {
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 0,
          minHeight: 0,
          overflow: 'scroll',
          WebkitOverflowScrolling: 'touch',
        }
      : null),
  },
  scrollContent: {
    padding: SPACING.md,
    flexGrow: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  loadingCard: {
    borderRadius: BORDERS.radius.xl,
    padding: 32,
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  loadingTitle: {
    marginTop: SPACING.md,
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
  },
  loadingSubtitle: {
    marginTop: SPACING.xxs,
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: BORDERS.width.thin,
  },
  emptyTitle: {
    ...TYPOGRAPHY.styles.h3,
    marginBottom: SPACING.xs,
    textAlign: 'center',
    color: COLORS.text.primary,
  },
  emptyText: {
    ...TYPOGRAPHY.styles.body,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
    color: COLORS.text.secondary,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingCard: {
    borderRadius: BORDERS.radius.lg,
    padding: 24,
    alignItems: 'center',
    minWidth: 180,
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.md,
  },
  processingText: {
    marginTop: SPACING.md,
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
  },
});

export default ComparadorOfertasScreen;
