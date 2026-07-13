import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Pressable,
  Platform,
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import Icon from '../base/Icon/Icon';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS as DS_COLORS, withOpacity } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import Avatar from '../base/Avatar/Avatar';
import checklistClienteService from '../../services/checklistService';
import { signatureStoredToImageUri } from '../../utils/signatureImageUri';
import { resolveToAbsoluteMediaUrl } from '../../utils/providerUtils';
import { formatKmDisplay } from '../../utils/vehicleMileage';

/** Atajos de color alineados al DS (evita hex sueltos en JSX) */
const C = {
  primary: DS_COLORS.primary[500],
  accent: DS_COLORS.primary[500],
  success: DS_COLORS.success[600],
  successBg: DS_COLORS.success[50],
  successDark: DS_COLORS.success[700],
  error: DS_COLORS.error[500],
  bgDefault: DS_COLORS.background.default,
  bgPaper: DS_COLORS.background.paper,
  textPrimary: DS_COLORS.text.primary,
  textSecondary: DS_COLORS.text.secondary,
  textLight: DS_COLORS.text.tertiary,
  borderLight: DS_COLORS.border.light,
};

/** Texto meta que el proveedor guarda al subir fotos (no es descripción de evidencia). */
function esTextoConteoFotosEvidencia(texto) {
  const t = String(texto || '').trim();
  // Cubre: "1 foto(s) de evidencia", "2 fotos de evidencia", "3 foto de evidencia"
  return /^\d+\s+foto(\(s\)|s)?\s+de\s+evidencia/i.test(t);
}

/** URL de foto de evidencia desde distintas formas del API (R2, cPanel, /media/ relativo). */
function resolveEvidenciaUri(foto) {
  if (foto == null) return null;
  let raw = null;
  if (typeof foto === 'string') {
    raw = foto.trim() || null;
  } else if (typeof foto === 'object') {
    const candidates = [
      foto.imagen_url,
      foto.imagen_comprimida_url,
      foto.imagen,
      foto.url,
      foto.uri,
      foto.image,
      foto.file,
      foto.foto_url,
      foto.archivo_url,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) {
        raw = c.trim();
        break;
      }
    }
  }
  if (!raw) return null;
  return resolveToAbsoluteMediaUrl(raw);
}

/**
 * Convierte respuesta_seleccion (string | array | objeto) en filas legibles para chips.
 */
function seleccionRespuestaAChips(sel) {
  if (sel == null) return [];
  if (Array.isArray(sel)) {
    return sel.map((x) => {
      if (typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean') {
        return String(x);
      }
      if (x && typeof x === 'object') {
        if (x.name != null) return String(x.name);
        if (x.label != null) return String(x.label);
        if (x.texto != null) return String(x.texto);
      }
      try {
        return JSON.stringify(x);
      } catch {
        return String(x);
      }
    });
  }
  if (typeof sel === 'string') {
    try {
      const parsed = JSON.parse(sel);
      if (Array.isArray(parsed) || (parsed && typeof parsed === 'object')) {
        return seleccionRespuestaAChips(parsed);
      }
    } catch {
      /* texto plano */
    }
    return sel.trim() ? [sel] : [];
  }
  if (typeof sel === 'object') {
    const flat = Object.values(sel).filter(
      (v) => v != null && typeof v !== 'object'
    );
    if (flat.length > 0) return flat.map(String);
    try {
      return [JSON.stringify(sel)];
    } catch {
      return [];
    }
  }
  return [String(sel)];
}

/** Tipos donde el técnico elige opciones (debe verse igual en la app del cliente). */
const TIPOS_OPCION_TECNICO = new Set([
  'SELECT',
  'FLUID_LEVEL',
  'MULTISELECT',
  'SERVICE_SELECTION',
  'VEHICLE_CONDITION',
  'ELECTRICAL_CHECK',
  'BRAKE_CHECK',
  'SUSPENSION_CHECK',
  'TIRE_CONDITION',
  'EXTERIOR_INSPECTION',
  'INTERIOR_INSPECTION',
  'ENGINE_INSPECTION',
]);

function esRespuestaKilometraje(tipoPregunta, pregunta) {
  if (tipoPregunta === 'KILOMETER_INPUT') return true;
  const p = String(pregunta || '').toLowerCase();
  return /kilometraje|od[oó]metro|\bkm\b/.test(p);
}

function parseKmValor(texto, numero) {
  if (numero != null && numero !== '') {
    const n = Number(numero);
    if (Number.isFinite(n)) return n;
  }
  if (texto != null && String(texto).trim() !== '') {
    const cleaned = String(texto).replace(/[^\d.,-]/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function formatearNumeroChecklist(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return String(valor ?? '—');
  if (Number.isInteger(n)) return n.toLocaleString('es-CL');
  return n.toLocaleString('es-CL', { maximumFractionDigits: 2 });
}

/** Texto del badge de estado en el header; null = no mostrar badge. */
function labelEstadoInforme(estado) {
  if (estado == null || estado === '') return null;
  const u = String(estado).trim().toUpperCase();
  if (u === 'OTROS') return null;
  if (u === 'FINALIZADO' || u === 'COMPLETADO') return 'Completado';
  if (u === 'EN_PROGRESO') return 'En progreso';
  if (u === 'PENDIENTE') return 'Pendiente';
  if (u === 'PAUSADO') return 'Pausado';
  if (u === 'CANCELADO') return 'Cancelado';
  return null;
}

const ChecklistViewerModal = ({
  visible,
  onClose,
  ordenId,
  servicioNombre,
  proveedorPreview = null,
}) => {
  // TODOS LOS HOOKS PRIMERO - ANTES DE CUALQUIER RETURN
  const insets = useSafeAreaInsets();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mostrarFirmas, setMostrarFirmas] = useState(false);
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [loadingRec, setLoadingRec] = useState(false);
  /** { uri, caption?, openId } | null — openId único por apertura (iOS: remount limpio de Image). */
  const [photoLightbox, setPhotoLightbox] = useState(null);
  const lightboxOpenSeqRef = useRef(0);
  const { width: winW, height: winH } = useWindowDimensions();

  const closePhotoLightbox = useCallback(() => {
    setPhotoLightbox(null);
  }, []);

  const openPhotoLightbox = useCallback((uri, caption) => {
    lightboxOpenSeqRef.current += 1;
    setPhotoLightbox({
      uri,
      caption,
      openId: lightboxOpenSeqRef.current,
    });
  }, []);

  // Función para cargar checklist - MEMOIZADA CON useCallback
  const cargarChecklist = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const checklistData = await checklistClienteService.obtenerChecklistServicio(ordenId);

      if (!checklistData) {
        throw new Error('No se recibieron datos del checklist');
      }

      const checklistFormateado = checklistClienteService.formatearChecklistParaCliente(checklistData);
      setChecklist(checklistFormateado);

      // Cargar recomendaciones ML si el checklist está completado
      const instanceId = checklistData?.id;
      const estado = checklistData?.estado;
      if (instanceId && (estado === 'COMPLETADO' || estado === 'completado')) {
        cargarRecomendaciones(instanceId);
      }
    } catch (err) {
      console.error('❌ Error cargando checklist:', err);
      setError(String(err.message || 'No se pudo cargar el checklist del servicio'));

      Alert.alert(
        'Error',
        String(err.message || 'No se pudo cargar el checklist del servicio'),
        [{ text: 'OK', onPress: () => onCloseRef.current?.() }]
      );
    } finally {
      setLoading(false);
    }
  }, [ordenId]);

  const cargarRecomendaciones = useCallback(async (instanceId) => {
    setLoadingRec(true);
    try {
      const data = await checklistClienteService.obtenerRecomendacionesChecklist(instanceId);
      if (data?.recomendaciones) {
        setRecomendaciones(data.recomendaciones);
      }
    } catch (err) {
      // Recomendaciones son opcionales: fallo silencioso
      console.warn('ChecklistViewerModal: no se pudieron cargar recomendaciones ML:', err);
    } finally {
      setLoadingRec(false);
    }
  }, []);

  // useEffect también debe ir antes de cualquier return
  useEffect(() => {
    if (visible && ordenId) {
      cargarChecklist();
    }
  }, [visible, ordenId, cargarChecklist]);

  useEffect(() => {
    if (!visible) setPhotoLightbox(null);
  }, [visible]);

  useEffect(() => {
    if (!visible || !photoLightbox) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closePhotoLightbox();
      return true;
    });
    return () => sub.remove();
  }, [visible, photoLightbox, closePhotoLightbox]);

  // ─── Proveedor (API + vista previa desde historial / marketplace) ─────────
  const renderProveedorBar = () => {
    const api = checklist?.proveedorInfo || checklist?.ordenInfo?.proveedor_info;
    const nombre = api?.nombre || proveedorPreview?.nombre;
    const rawFoto = api?.foto_perfil_url || proveedorPreview?.fotoUrl;
    const fotoUri = rawFoto || null;
    const tipo = api?.tipo || proveedorPreview?.tipo || 'taller';
    const marcasVisibles = (api?.marcas_atendidas || []).slice(0, 4);

    if (!nombre && !fotoUri) return null;

    return (
      <View style={styles.proveedorCard}>
        <Avatar
          source={fotoUri}
          name={nombre || 'Proveedor'}
          size="md"
          variant="circular"
        />
        <View style={styles.proveedorInfoContainer}>
          <View style={styles.proveedorRow}>
            <Text style={styles.proveedorNombre} numberOfLines={1}>
              {nombre || 'Proveedor'}
            </Text>
            <View style={styles.proveedorTipoBadge}>
              <Text style={styles.proveedorTipoBadgeTexto}>
                {tipo === 'taller' ? 'Taller' : 'A domicilio'}
              </Text>
            </View>
          </View>
          {marcasVisibles.length > 0 ? (
            <View style={styles.marcasRow}>
              {marcasVisibles.map((marca, idx) => (
                <View key={String(idx)} style={styles.marcaChip}>
                  <Text style={styles.marcaChipTexto}>{marca}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const renderTarjetaRespuesta = (respuesta, indexKey) => {
    try {
      if (!respuesta || typeof respuesta !== 'object') {
        return null;
      }

      const pregunta = String(
        respuesta.item_template_info?.pregunta_texto ||
        respuesta.item_info?.pregunta_texto ||
        'Pregunta sin título'
      );
      const tipoPregunta = respuesta.item_info?.tipo_pregunta || respuesta.item_template_info?.tipo_pregunta;
      const isPhotoItem = tipoPregunta === 'PHOTO';
      /** SIGNATURE guarda base64 en JSON; no mostrar eso como “chips” (parece código). */
      const isSignatureItem = tipoPregunta === 'SIGNATURE';

      const hasSeleccion =
        !isSignatureItem &&
        respuesta.respuesta_seleccion != null &&
        tipoPregunta !== 'BOOLEAN';
      const hasTexto = Boolean(respuesta.respuesta_texto);
      const hasNumero =
        respuesta.respuesta_numero !== null && respuesta.respuesta_numero !== undefined;
      const hasBoolean =
        respuesta.respuesta_booleana !== null && respuesta.respuesta_booleana !== undefined;
      const hasFecha =
        respuesta.respuesta_fecha != null && respuesta.respuesta_fecha !== '';
      let hasTextoMostrar = hasTexto;
      if (isSignatureItem && hasTexto) {
        const t = String(respuesta.respuesta_texto || '').trim();
        const parecePayloadFirma =
          /^data:image\//i.test(t) ||
          (/^[A-Za-z0-9+/=\s]+$/.test(t) && t.length > 200);
        if (parecePayloadFirma) {
          hasTextoMostrar = false;
        }
      }
      if (hasTexto && esTextoConteoFotosEvidencia(respuesta.respuesta_texto)) {
        hasTextoMostrar = false;
      }

      const firmaSoloMarcada =
        isSignatureItem &&
        respuesta.completado &&
        !hasSeleccion &&
        !hasTextoMostrar &&
        !hasNumero &&
        !hasBoolean &&
        !hasFecha;

      const fotos = respuesta.fotos && Array.isArray(respuesta.fotos) ? respuesta.fotos : [];
      const fotosConUri = fotos
        .map((foto) => {
          const uri = resolveEvidenciaUri(foto);
          if (!uri) return null;
          const descripcionRaw =
            foto && typeof foto === 'object' && foto.descripcion
              ? String(foto.descripcion).trim()
              : '';
          const caption = descripcionRaw || 'Evidencia';
          return { uri, caption, foto };
        })
        .filter(Boolean);
      const hasFotos = fotos.length > 0;
      const hasFotosVisibles = fotosConUri.length > 0;

      const esTipoOpcionesTecnico =
        Boolean(tipoPregunta) && TIPOS_OPCION_TECNICO.has(tipoPregunta);

      /** Paso marcado listo pero sin valor guardado (p. ej. checklist antiguo antes del fix del taller). */
      const detalleOpcionFaltante =
        esTipoOpcionesTecnico &&
        !isSignatureItem &&
        respuesta.completado &&
        !hasSeleccion &&
        !hasTextoMostrar &&
        !hasNumero &&
        !hasBoolean &&
        !hasFecha &&
        !hasFotos;

      const hasVerificacion =
        hasSeleccion ||
        hasTextoMostrar ||
        hasNumero ||
        hasBoolean ||
        hasFecha ||
        firmaSoloMarcada ||
        detalleOpcionFaltante;

      let opcionesSel = [];
      if (hasSeleccion) {
        opcionesSel = seleccionRespuestaAChips(respuesta.respuesta_seleccion);
      }

      const esKm = esRespuestaKilometraje(tipoPregunta, pregunta);
      const kmValor = esKm
        ? parseKmValor(respuesta.respuesta_texto, respuesta.respuesta_numero)
        : null;

      let iconoTexto = null;
      let unidad = '';
      if (hasTextoMostrar && !esKm) {
        if (tipoPregunta === 'FLUID_LEVEL') {
          iconoTexto = (
            <Icon name="water-outline" size={16} color={C.accent} style={styles.inlineIcon} />
          );
        } else if (tipoPregunta === 'NUMBER') {
          iconoTexto = (
            <Icon name="calculator-outline" size={16} color={C.accent} style={styles.inlineIcon} />
          );
        }
      }

      return (
        <View key={indexKey} style={styles.respuestaCard}>
          <View style={styles.preguntaContainer}>
            <Text style={styles.preguntaTexto}>{pregunta}</Text>
            {respuesta.completado ? (
              <Icon name="checkmark-circle" size={22} color={C.success} />
            ) : null}
          </View>

          {hasVerificacion ? (
            <View style={styles.valorContenido}>
              {hasSeleccion ? (
                opcionesSel.length === 1 ? (
                  <View style={styles.valorRowSimple}>
                    <Icon name="checkmark-circle" size={18} color={C.success} />
                    <Text style={styles.valorDestacado}>{String(opcionesSel[0])}</Text>
                  </View>
                ) : (
                  <View style={styles.chipsWrap}>
                    {opcionesSel.map((op, oi) => (
                      <View key={String(oi)} style={styles.seleccionChip}>
                        <Icon name="checkmark-circle" size={14} color={C.success} />
                        <Text style={styles.seleccionChipTexto}>{String(op)}</Text>
                      </View>
                    ))}
                  </View>
                )
              ) : null}

              {detalleOpcionFaltante ? (
                <View style={styles.valorRowSimple}>
                  <Icon name="information-circle-outline" size={18} color={C.textSecondary} />
                  <Text style={styles.avisoDetalleFaltante}>
                    El técnico completó este paso, pero la opción elegida no quedó guardada en el informe.
                  </Text>
                </View>
              ) : null}

              {hasTextoMostrar && !esKm ? (
                <View style={styles.valorRowSimple}>
                  {iconoTexto}
                  <Text style={styles.respuestaValor}>
                    {String(respuesta.respuesta_texto)}
                    {unidad}
                  </Text>
                </View>
              ) : null}

              {esKm && kmValor != null ? (
                <View style={styles.valorRowSimple}>
                  <Icon name="speedometer-outline" size={20} color={DS_COLORS.primary[600]} />
                  <Text style={styles.kmValorPlano}>{formatKmDisplay(kmValor)} km</Text>
                </View>
              ) : null}

              {firmaSoloMarcada ? (
                <View style={styles.valorRowSimple}>
                  <Icon name="checkmark-circle" size={18} color={C.success} />
                  <Text style={styles.respuestaValor}>Firma registrada</Text>
                </View>
              ) : null}

              {hasNumero && !esKm ? (
                <Text style={styles.valorDestacado}>
                  {formatearNumeroChecklist(respuesta.respuesta_numero)}
                </Text>
              ) : null}

              {hasBoolean ? (
                <View style={styles.valorRowSimple}>
                  <Icon
                    name={respuesta.respuesta_booleana ? 'checkmark-circle' : 'close-circle'}
                    size={18}
                    color={respuesta.respuesta_booleana ? C.success : C.error}
                  />
                  <Text
                    style={[
                      styles.respuestaValor,
                      respuesta.respuesta_booleana ? styles.booleanOk : styles.booleanWarn,
                    ]}
                  >
                    {respuesta.respuesta_booleana ? 'Correcto' : 'Requiere atención'}
                  </Text>
                </View>
              ) : null}

              {hasFecha ? (
                <View style={styles.valorRowSimple}>
                  <Icon name="calendar-outline" size={18} color={C.accent} />
                  <Text style={styles.respuestaValor}>
                    {(() => {
                      try {
                        const d = new Date(respuesta.respuesta_fecha);
                        if (Number.isNaN(d.getTime())) return 'No disponible';
                        return d.toLocaleString('es-CL', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                      } catch {
                        return String(respuesta.respuesta_fecha);
                      }
                    })()}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {hasFotos ? (
            <View style={styles.fotosContainer}>
              <Text style={styles.fotosSectionLabel}>
                Evidencias ({fotosConUri.length || fotos.length})
              </Text>
              {hasFotosVisibles ? (
                <View style={styles.fotosRow}>
                  {fotosConUri.map((item, fotoIndex) => (
                    <TouchableOpacity
                      key={`${item.uri}-${fotoIndex}`}
                      style={styles.fotoContainer}
                      activeOpacity={0.88}
                      delayPressIn={0}
                      onPress={() => openPhotoLightbox(item.uri, item.caption)}
                      accessibilityRole="imagebutton"
                      accessibilityLabel="Ampliar foto de evidencia"
                    >
                      <Image
                        pointerEvents="none"
                        source={{ uri: item.uri }}
                        style={styles.fotoImagen}
                        resizeMode="cover"
                        {...(Platform.OS === 'android' ? { resizeMethod: 'resize' } : {})}
                      />
                      <Text style={styles.fotoDescripcion} numberOfLines={2}>
                        {item.caption}
                      </Text>
                      <Text style={styles.fotoTapHint}>Toca para ampliar</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.fotosErrorWrap}>
                  <Icon name="image-outline" size={18} color={C.textSecondary} />
                  <Text style={styles.fotosErrorText}>
                    Hay {fotos.length} foto(s) registradas, pero no se pudieron cargar. Intenta
                    abrir el informe de nuevo en unos momentos.
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {respuesta.fecha_respuesta ? (
            <Text style={styles.fechaRespuesta}>
              Verificado: {String(checklistClienteService.formatearFecha(respuesta.fecha_respuesta))}
            </Text>
          ) : null}
        </View>
      );
    } catch (err) {
      console.error('Error renderizando respuesta:', err);
      return (
        <View key={indexKey} style={styles.respuestaCard}>
          <Text style={styles.respuestaValor}>No se pudo mostrar este ítem</Text>
        </View>
      );
    }
  };

  // ─── Contenido: todas las categorías en un scroll (sin filtro por pestañas) ─
  const renderContenido = () => {
    if (!checklist?.respuestas || !Array.isArray(checklist.respuestas)) {
      return (
        <View style={styles.contenidoContainer}>
          <View style={styles.contenidoEmpty}>
            <Icon name="document-text-outline" size={40} color={C.textLight} />
            <Text style={styles.instruccionTexto}>No hay respuestas en este informe.</Text>
          </View>
        </View>
      );
    }

    const categorias = checklistClienteService.organizarRespuestasPorCategoria(checklist.respuestas);
    const keysOrden = Object.keys(categorias || {}).filter((k) => k !== 'OTROS');
    const otrosItems = Array.isArray(categorias.OTROS) ? categorias.OTROS : [];

    const tieneAlgunaSeccion =
      keysOrden.some((k) => (categorias[k] || []).length > 0) || otrosItems.length > 0;

    if (!tieneAlgunaSeccion) {
      return (
        <View style={styles.contenidoContainer}>
          <View style={styles.contenidoEmpty}>
            <Icon name="folder-open-outline" size={40} color={C.textLight} />
            <Text style={styles.sinDatosTexto}>No hay elementos verificados en este informe.</Text>
          </View>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.contenidoContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contenidoScrollPad}
        nestedScrollEnabled
        keyboardShouldPersistTaps="always"
        removeClippedSubviews={false}
      >
        {keysOrden.map((catKey) => {
          const respuestasCategoria = categorias[catKey] || [];
          if (!respuestasCategoria.length) return null;
          const n = respuestasCategoria.length;
          return (
            <View key={catKey}>
              <View style={styles.categoriaHeaderBlock}>
                <Text style={styles.categoriaTitle}>
                  {String(checklistClienteService.obtenerNombreCategoria(catKey))}
                </Text>
                <Text style={styles.categoriaSubtitle}>
                  {n} ítem{n !== 1 ? 's' : ''} verificado{n !== 1 ? 's' : ''}
                </Text>
              </View>
              {respuestasCategoria.map((respuesta, index) =>
                renderTarjetaRespuesta(respuesta, `${catKey}-${index}`)
              )}
            </View>
          );
        })}

        {otrosItems.length > 0 ? (
          <View key="__sin_titulo_otros__">
            {keysOrden.some((k) => (categorias[k] || []).length > 0) ? (
              <View style={styles.seccionOtrosSpacer} />
            ) : null}
            {otrosItems.map((respuesta, index) =>
              renderTarjetaRespuesta(respuesta, `otros-${index}`)
            )}
          </View>
        ) : null}

        {renderFirmas()}
        {renderRecomendaciones()}
      </ScrollView>
    );
  };

  // ─── RECOMENDACIONES ML ──────────────────────────────────────────────────
  const REC_COLORS = { URGENTE: DS_COLORS.error.main, ATENCION: DS_COLORS.warning.main, PROACTIVA: DS_COLORS.primary[500] };
  const REC_BG = { URGENTE: DS_COLORS.error[50], ATENCION: DS_COLORS.warning[50], PROACTIVA: DS_COLORS.primary[50] };

  const renderRecomendaciones = () => {
    if (loadingRec) {
      return (
        <View style={styles.recContainer}>
          <ActivityIndicator size="small" color={DS_COLORS.primary[500]} />
          <Text style={styles.recLoadingText}>Analizando con IA...</Text>
        </View>
      );
    }

    if (!recomendaciones || recomendaciones.length === 0) return null;

    return (
      <View style={styles.recSection}>
        <View style={styles.recSectionHeader}>
          <Icon name="bulb-outline" size={18} color={DS_COLORS.primary[500]} />
          <Text style={styles.recSectionTitle}>
            Recomendaciones del Taller ({recomendaciones.length})
          </Text>
        </View>
        <Text style={styles.recSectionSub}>
          Análisis automático basado en el estado de tu vehículo.
        </Text>
        {recomendaciones.map((rec, idx) => (
          <View
            key={idx}
            style={[
              styles.recCard,
              {
                borderLeftColor: REC_COLORS[rec.prioridad] ?? DS_COLORS.neutral.gray[500],
                backgroundColor: REC_BG[rec.prioridad] ?? DS_COLORS.background.paper,
              },
            ]}
          >
            <View style={styles.recCardHeader}>
              <View style={[styles.recBadge, { backgroundColor: REC_COLORS[rec.prioridad] ?? DS_COLORS.neutral.gray[500] }]}>
                <Text style={styles.recBadgeText}>{rec.prioridad}</Text>
              </View>
              <Text style={styles.recComponenteNombre} numberOfLines={1}>
                {rec.componente_nombre}
              </Text>
            </View>
            <Text style={styles.recRazon}>{rec.razon}</Text>
            {rec.servicios_sugeridos && rec.servicios_sugeridos.length > 0 && (
              <TouchableOpacity
                style={styles.recCTA}
                onPress={() => {
                  const servicio = rec.servicios_sugeridos[0];
                  onCloseRef.current?.();
                  // Navegar a crear solicitud con el servicio sugerido
                  setTimeout(() => {
                    try {
                      const { navigateCrearSolicitudConServicio } = require('../../components/home/shared/homeScheduleNavigation');
                      navigateCrearSolicitudConServicio(null, servicio.id);
                    } catch (e) {
                      console.warn('No se pudo navegar a agendar servicio:', e);
                    }
                  }, 300);
                }}
                activeOpacity={0.8}
              >
                <Icon name="calendar-outline" size={14} color={DS_COLORS.primary[500]} />
                <Text style={styles.recCTAText}>
                  Agendar: {rec.servicios_sugeridos[0].nombre}
                  {rec.servicios_sugeridos[0].precio_referencia
                    ? ` — $${Number(rec.servicios_sugeridos[0].precio_referencia).toLocaleString('es-CL')}`
                    : ''}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    );
  };

  // ─── FIRMAS ──────────────────────────────────────────────────────────────
  const renderFirmas = () => {
    if (!checklist) return null;

    const uriTecnico = signatureStoredToImageUri(checklist.firmaTecnico);
    const uriCliente = signatureStoredToImageUri(checklist.firmaCliente);
    const firmas = [
      uriTecnico ? { uri: uriTecnico, label: 'Técnico' } : null,
      uriCliente ? { uri: uriCliente, label: 'Tu firma' } : null,
    ].filter(Boolean);

    return (
      <View style={styles.firmasSection}>
        <TouchableOpacity
          style={styles.firmasToggleRow}
          onPress={() => setMostrarFirmas(!mostrarFirmas)}
          activeOpacity={0.7}
        >
          <Icon name="create-outline" size={18} color={C.primary} />
          <Text style={styles.firmasToggleText}>Firmas de conformidad</Text>
          <Icon
            name={mostrarFirmas ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={C.textSecondary}
          />
        </TouchableOpacity>

        {mostrarFirmas ? (
          firmas.length === 0 ? (
            <Text style={styles.sinFirmasText}>No hay firmas registradas en este servicio.</Text>
          ) : (
            <View style={styles.firmasList}>
              {firmas.map(({ uri, label }) => (
                <View key={label} style={styles.firmaItem}>
                  <Text style={styles.firmaEtiqueta}>{label}</Text>
                  <Image
                    source={{ uri }}
                    style={styles.firmaImagen}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </View>
          )
        ) : null}
      </View>
    );
  };

  // ─── RENDER PRINCIPAL ────────────────────────────────────────────────────
  const estadoBadgeLabel = checklist ? labelEstadoInforme(checklist.estado) : null;
  const lw = Math.min(winW - SPACING.lg * 2, 720);
  const lh = Math.min(winH * 0.72, lw * 1.05);

  /**
   * Lightbox: `Image` nativa. En iOS NO usar ScrollView+maximumZoomScale: tras cerrar/reabrir deja la imagen en blanco
   * (UIScrollView zoom + UIImageView en RN). Pinch-zoom se puede recuperar luego con gesture-handler si hace falta.
   */
  const renderPhotoLightboxOverlay = () => {
    if (!photoLightbox) return null;
    const lbUri = photoLightbox.uri;
    const openId = photoLightbox.openId ?? 0;

    return (
      <View
        style={[styles.photoLightboxStack, { paddingTop: insets.top + SPACING.sm }]}
        pointerEvents="box-none"
      >
        <Pressable
          style={[StyleSheet.absoluteFillObject, styles.photoLightboxBackdropFill]}
          onPress={closePhotoLightbox}
          accessibilityLabel="Cerrar vista ampliada"
        />
        <View
          style={[styles.photoLightboxInner, { paddingBottom: insets.bottom + SPACING.md }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.photoLightboxClose}
            onPress={closePhotoLightbox}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          >
            <X size={22} color={DS_COLORS.base.white} />
          </TouchableOpacity>
          {lbUri ? (
            <View
              style={[styles.photoLightboxImageWrap, { maxHeight: winH * 0.72 }]}
              accessibilityRole="image"
            >
              <Image
                key={`ev-lb-${openId}`}
                source={{ uri: lbUri }}
                style={{ width: lw, height: lh }}
                resizeMode="contain"
                {...(Platform.OS === 'android' ? { resizeMethod: 'resize' } : {})}
              />
            </View>
          ) : null}
          {photoLightbox.caption ? (
            <Text style={styles.photoLightboxCaption} numberOfLines={4}>
              {photoLightbox.caption}
            </Text>
          ) : null}
          <Text style={styles.photoLightboxHint}>Toca fuera o el botón cerrar</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (photoLightbox) closePhotoLightbox();
        else onClose();
      }}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom }]} collapsable={false}>
        <View style={[styles.header, { paddingTop: insets.top + SPACING.xs }]}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button">
              <Icon name="arrow-back" size={22} color={DS_COLORS.text.primary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.title}>Informe de servicio</Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                {String(servicioNombre || 'Servicio')}
              </Text>
            </View>
            {estadoBadgeLabel ? (
              <View style={styles.estadoBadge}>
                <Text style={styles.estadoBadgeTexto}>{estadoBadgeLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {loading ? (
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyScrollContent}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={false}
          >
            {renderProveedorBar()}
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="large" color={DS_COLORS.primary[500]} />
              <Text style={styles.loadingText}>Cargando inspección…</Text>
              <Text style={styles.loadingSub}>Obteniendo detalles del servicio</Text>
            </View>
          </ScrollView>
        ) : error ? (
          <View style={styles.errorContainer}>
            <View style={styles.panelCard}>
              <Icon name="warning-outline" size={48} color={DS_COLORS.warning.main} />
              <Text style={styles.errorText}>No se pudo cargar el informe</Text>
              <Text style={styles.errorSubtext}>{String(error)}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={cargarChecklist} activeOpacity={0.85}>
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : checklist ? (
          <View style={styles.content}>
            {renderProveedorBar()}
            {renderContenido()}
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <View style={styles.panelCard}>
              <Icon name="document-text-outline" size={48} color={DS_COLORS.text.tertiary} />
              <Text style={styles.noDataText}>Sin datos de inspección</Text>
              <Text style={styles.loadingSub}>Este servicio no tiene un informe registrado.</Text>
            </View>
          </View>
        )}
        {renderPhotoLightboxOverlay()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS_COLORS.background.default,
  },
  header: {
    backgroundColor: DS_COLORS.background.paper,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: DS_COLORS.border.light,
    ...SHADOWS.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS_COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: DS_COLORS.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: DS_COLORS.text.primary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: DS_COLORS.text.secondary,
  },
  estadoBadge: {
    backgroundColor: DS_COLORS.success[50],
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    borderWidth: BORDERS.width.thin,
    borderColor: DS_COLORS.success[200],
    maxWidth: 100,
  },
  estadoBadgeTexto: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: DS_COLORS.success[700],
  },

  proveedorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: DS_COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: DS_COLORS.border.light,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  proveedorInfoContainer: {
    flex: 1,
    minWidth: 0,
  },
  proveedorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  proveedorNombre: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: DS_COLORS.text.primary,
    flexShrink: 1,
  },
  proveedorTipoBadge: {
    backgroundColor: DS_COLORS.primary[50],
    borderRadius: BORDERS.radius.sm,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderWidth: BORDERS.width.thin,
    borderColor: DS_COLORS.primary[100],
  },
  proveedorTipoBadgeTexto: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: DS_COLORS.primary[700],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  marcasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xxs,
    marginTop: SPACING.xxs,
  },
  marcaChip: {
    backgroundColor: DS_COLORS.neutral.gray[100],
    borderRadius: BORDERS.radius.sm,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
  },
  marcaChipTexto: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: DS_COLORS.text.secondary,
  },

  bodyScroll: {
    flex: 1,
    backgroundColor: DS_COLORS.background.default,
  },
  bodyScrollContent: {
    paddingBottom: SPACING.xl,
    flexGrow: 1,
  },
  content: {
    flex: 1,
    backgroundColor: DS_COLORS.background.default,
  },
  loadingBlock: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: DS_COLORS.text.primary,
    marginTop: SPACING.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  loadingSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: DS_COLORS.text.tertiary,
    marginTop: SPACING.xs,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: DS_COLORS.background.default,
  },
  panelCard: {
    backgroundColor: DS_COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
    borderWidth: BORDERS.width.thin,
    borderColor: DS_COLORS.border.light,
    ...SHADOWS.sm,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: DS_COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: DS_COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  retryButton: {
    backgroundColor: DS_COLORS.primary[500],
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDERS.radius.md,
  },
  retryButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: DS_COLORS.base.white,
  },
  noDataText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: DS_COLORS.text.primary,
    textAlign: 'center',
    marginTop: SPACING.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },

  seccionOtrosSpacer: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    marginHorizontal: SPACING.md,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: DS_COLORS.border.light,
  },

  contenidoContainer: {
    flex: 1,
    backgroundColor: DS_COLORS.background.default,
  },
  contenidoScrollPad: {
    paddingBottom: SPACING.xl,
  },
  contenidoEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING['2xl'],
    paddingHorizontal: SPACING.lg,
  },
  instruccionTexto: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: DS_COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 20,
  },
  sinDatosTexto: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: DS_COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  categoriaHeaderBlock: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  categoriaTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: DS_COLORS.text.primary,
    marginBottom: SPACING.xxs,
  },
  categoriaSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: DS_COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },

  respuestaCard: {
    backgroundColor: DS_COLORS.background.paper,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    borderWidth: BORDERS.width.thin,
    borderColor: DS_COLORS.border.light,
    ...SHADOWS.sm,
  },
  preguntaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: DS_COLORS.border.light,
  },
  preguntaTexto: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: DS_COLORS.text.primary,
    flex: 1,
    lineHeight: 22,
  },
  valorContenido: {
    gap: SPACING.sm,
    marginTop: SPACING.xxs,
  },
  valorRowSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  valorDestacado: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: DS_COLORS.text.primary,
    lineHeight: 24,
  },
  kmValorPlano: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    color: DS_COLORS.text.primary,
    letterSpacing: -0.5,
  },
  fotosSectionLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: DS_COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  inlineIcon: {
    marginRight: 0,
  },
  respuestaValor: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: DS_COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    lineHeight: 22,
    flex: 1,
  },
  booleanOk: {
    color: DS_COLORS.success[700],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginLeft: 0,
  },
  booleanWarn: {
    color: DS_COLORS.error[600],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginLeft: 0,
  },

  seleccionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS_COLORS.success[50],
    borderWidth: BORDERS.width.thin,
    borderColor: DS_COLORS.success[200],
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs + 2,
    gap: 4,
  },
  seleccionChipTexto: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: DS_COLORS.success[800],
  },

  avisoDetalleFaltante: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: DS_COLORS.text.secondary,
    lineHeight: 20,
  },

  fotosContainer: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: DS_COLORS.border.light,
    gap: SPACING.xs,
  },
  fotosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  fotoContainer: {
    width: 132,
    alignItems: 'center',
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
    backgroundColor: DS_COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: DS_COLORS.border.light,
  },
  fotoImagen: {
    width: 132,
    height: 132,
    backgroundColor: DS_COLORS.neutral.gray[200],
  },
  fotoDescripcion: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: DS_COLORS.text.secondary,
    marginTop: SPACING.xxs,
    textAlign: 'center',
    paddingHorizontal: SPACING.xxs,
  },
  fotoTapHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: DS_COLORS.primary[600],
    marginTop: 2,
    marginBottom: SPACING.xxs,
    textAlign: 'center',
  },
  fotosErrorWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    backgroundColor: DS_COLORS.neutral.gray[50],
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: DS_COLORS.border.light,
  },
  fotosErrorText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: DS_COLORS.text.secondary,
    lineHeight: 20,
  },

  photoLightboxStack: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    elevation: 50,
    backgroundColor: withOpacity(DS_COLORS.base.inkBlack, 0.88),
    justifyContent: 'center',
  },
  photoLightboxBackdropFill: {
    backgroundColor: 'transparent',
  },
  photoLightboxInner: {
    flex: 1,
    width: '100%',
    position: 'relative',
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  photoLightboxImageWrap: {
    alignSelf: 'center',
    maxWidth: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoLightboxClose: {
    position: 'absolute',
    top: 0,
    right: SPACING.md,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: withOpacity(DS_COLORS.base.white, 0.12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoLightboxCaption: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: withOpacity(DS_COLORS.base.white, 0.92),
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 360,
    paddingHorizontal: SPACING.sm,
  },
  photoLightboxHint: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: withOpacity(DS_COLORS.base.white, 0.5),
    textAlign: 'center',
  },

  fechaRespuesta: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: DS_COLORS.text.tertiary,
    marginTop: SPACING.sm,
    textAlign: 'right',
    paddingTop: SPACING.xs,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: DS_COLORS.border.light,
  },

  firmasSection: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: DS_COLORS.border.light,
  },
  firmasToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  firmasToggleText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: DS_COLORS.text.primary,
    flex: 1,
  },
  firmasList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.lg,
    marginTop: SPACING.md,
  },
  firmaItem: {
    flex: 1,
    minWidth: 140,
    gap: SPACING.xs,
  },
  firmaEtiqueta: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: DS_COLORS.text.secondary,
  },
  sinFirmasText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: DS_COLORS.text.secondary,
    marginTop: SPACING.md,
    lineHeight: 20,
  },
  firmaImagen: {
    width: '100%',
    height: 112,
    borderRadius: BORDERS.radius.md,
    backgroundColor: DS_COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: DS_COLORS.border.light,
  },
  // ── Recomendaciones ML ─────────────────────────────────────────────────
  recContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  recLoadingText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: DS_COLORS.text.secondary,
  },
  recSection: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  recSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  recSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: DS_COLORS.text.primary,
  },
  recSectionSub: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: DS_COLORS.text.secondary,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  recCard: {
    borderLeftWidth: 4,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: DS_COLORS.border.light,
  },
  recCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  recBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDERS.radius.pill,
  },
  recBadgeText: {
    color: DS_COLORS.text.inverse,
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  recComponenteNombre: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: DS_COLORS.text.primary,
  },
  recRazon: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: DS_COLORS.text.secondary,
    lineHeight: 18,
    marginBottom: SPACING.xs,
  },
  recCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: DS_COLORS.primary[50],
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: DS_COLORS.primary[200],
    marginTop: 4,
  },
  recCTAText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: DS_COLORS.primary[500],
    lineHeight: 18,
  },
});

export default ChecklistViewerModal;
