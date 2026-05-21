import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { GitCompare } from 'lucide-react-native';
import { ROUTES } from '../../utils/constants';
import ComparadorOfertas from '../../components/ofertas/ComparadorOfertas';
import ComparadorCatalogoIaPanel from '../../components/agendamiento-asistido/ComparadorCatalogoIaPanel';
import SolicitudFlowHeader from '../../components/solicitudes/SolicitudFlowHeader';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { useAgendamiento } from '../../context/AgendamientoContext';
import ofertasService from '../../services/ofertasService';
import {
  confirmarCandidato,
  buildConfirmarCandidatoPayload,
} from '../../services/agendamientoAsistidoService';
import { COLORS } from '../../design-system/tokens/colors';
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

  const {
    solicitudId,
    ofertas: ofertasIds,
    modoCatalogo = false,
    ofertasPreview = [],
    ofertasRecomendadas = [],
    ofertasOtros = [],
    radioKm = 80,
    formPayload = null,
    slotSeleccionado,
    pendingConfirmOferta,
  } = route.params || {};

  const { seleccionarOferta } = useSolicitudes();
  const { cargarTodosLosCarritos } = useAgendamiento();

  const [ofertas, setOfertas] = useState([]);
  const [ofertasOtrosState, setOfertasOtrosState] = useState([]);
  const [radioKmState, setRadioKmState] = useState(radioKm);
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState(null);
  const confirmandoHorarioRef = useRef(false);

  useEffect(() => {
    cargarOfertas();
  }, [ofertasIds, solicitudId, modoCatalogo, ofertasPreview]);

  const confirmarCandidatoConHorario = useCallback(async () => {
    if (!formPayload || !pendingConfirmOferta?.oferta_servicio_id || !slotSeleccionado?.fecha) {
      return;
    }
    if (confirmandoHorarioRef.current) return;
    confirmandoHorarioRef.current = true;
    setProcesando(true);
    try {
      const payload = buildConfirmarCandidatoPayload(
        {
          ...formPayload,
          fecha_preferida: slotSeleccionado.fecha,
          hora_preferida: slotSeleccionado.hora || null,
        },
        pendingConfirmOferta.oferta_servicio_id,
        { score_match: pendingConfirmOferta.score_match },
      );
      const resultado = await confirmarCandidato(payload);
      navigation.setParams({ slotSeleccionado: undefined, pendingConfirmOferta: undefined });
      Alert.alert(
        'Solicitud enviada',
        'El proveedor fue notificado con tu horario preferido.',
        [
          {
            text: 'Ver solicitud',
            onPress: () => {
              const sid = resultado?.solicitud_id || resultado?.solicitud?.id;
              if (sid) {
                navigation.navigate(ROUTES.DETALLE_SOLICITUD || 'DetalleSolicitud', { solicitudId: sid });
              } else {
                navigation.navigate(ROUTES.MIS_SOLICITUDES || 'MisSolicitudes');
              }
            },
          },
        ],
      );
    } catch (error) {
      const mensaje =
        error.response?.data?.error
        || error.message
        || 'No se pudo confirmar el proveedor';
      Alert.alert('Error', mensaje);
    } finally {
      setProcesando(false);
      confirmandoHorarioRef.current = false;
    }
  }, [formPayload, pendingConfirmOferta, slotSeleccionado, navigation]);

  useEffect(() => {
    if (modoCatalogo && slotSeleccionado?.fecha && pendingConfirmOferta?.oferta_servicio_id) {
      confirmarCandidatoConHorario();
    }
  }, [modoCatalogo, slotSeleccionado?.fecha, pendingConfirmOferta?.oferta_servicio_id, confirmarCandidatoConHorario]);

  const cargarOfertas = async () => {
    try {
      setLoading(true);
      setErrorValidacion(null);

      if (modoCatalogo) {
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
      if (!formPayload || !oferta.oferta_servicio_id) {
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
      navigation.navigate(APP_ROUTES.CALENDARIO_PROVEEDOR, {
        tipoProveedor: tipoProv,
        proveedorId,
        proveedorNombre: nombre,
        ofertaServicioId: oferta.oferta_servicio_id,
        returnRoute: ROUTES.COMPARADOR_OFERTAS,
        returnParams: {
          modoCatalogo: true,
          ofertasPreview: ofertas,
          ofertasRecomendadas: ofertas,
          ofertasOtros: ofertasOtrosState,
          radioKm: radioKmState,
          formPayload,
          pendingConfirmOferta: {
            oferta_servicio_id: oferta.oferta_servicio_id,
            score_match: oferta.score_match,
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

  const shell = (body) => (
    <View style={styles.container}>
      <SolicitudFlowHeader
        title="Comparar ofertas"
        subtitle={modoCatalogo ? 'Elige tu proveedor' : undefined}
        icon={GitCompare}
        onBack={() => navigation.goBack()}
      />
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
            <Ionicons name="alert-circle" size={48} color={COLORS.error.main} />
          </View>
          <Text style={styles.emptyTitle}>Error de Validación</Text>
          <Text style={styles.emptyText}>{errorValidacion}</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
    );
  }

  const totalCatalogo = ofertas.length + ofertasOtrosState.length;
  const minOfertas = modoCatalogo ? 1 : 2;
  if ((modoCatalogo ? totalCatalogo : ofertas.length) < minOfertas) {
    return shell(
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: COLORS.warning[50], borderColor: COLORS.warning[200] }]}>
            <MaterialIcons name="compare-arrows" size={48} color={COLORS.warning.main} />
          </View>
          <Text style={styles.emptyTitle}>
            {modoCatalogo ? 'Sin proveedores' : 'Ofertas Insuficientes'}
          </Text>
          <Text style={styles.emptyText}>
            {modoCatalogo
              ? 'No hay proveedores de catálogo disponibles para comparar.'
              : 'Necesitas al menos 2 ofertas para poder compararlas'}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>Volver a Ofertas</Text>
          </TouchableOpacity>
        </View>
    );
  }

  return shell(
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {modoCatalogo ? (
          <ComparadorCatalogoIaPanel
            ofertasRecomendadas={ofertas}
            ofertasOtros={ofertasOtrosState}
            radioKm={radioKmState}
            onAceptar={handleAceptarOferta}
            procesando={procesando}
            requiereRepuestos={requiereRepuestos}
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

      {procesando ? (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color={COLORS.primary[500]} />
            <Text style={styles.processingText}>Procesando oferta...</Text>
          </View>
        </View>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  loadingSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    color: COLORS.text.primary,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 16,
    color: COLORS.text.secondary,
  },
  emptyButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.primary[500],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[600],
  },
  emptyButtonText: {
    color: COLORS.text.onPrimary,
    fontSize: 14,
    fontWeight: '600',
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
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
});

export default ComparadorOfertasScreen;
