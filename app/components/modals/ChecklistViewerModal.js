import React, { useState, useEffect, useCallback } from 'react';
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
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS as DS_COLORS } from '../../design-system/tokens';
import checklistClienteService from '../../services/checklistService';

// Aliases de colores del design system
const C = {
  primary:       DS_COLORS?.primary?.[500]        ?? '#003459',
  accent:        DS_COLORS?.accent?.[500]          ?? '#00A8E8',
  success:       DS_COLORS?.success?.main          ?? '#00C9A7',
  successBg:     DS_COLORS?.success?.light         ?? '#E6F7F4',
  successDark:   DS_COLORS?.success?.dark          ?? '#00997A',
  warning:       DS_COLORS?.warning?.main          ?? '#FFB84D',
  error:         DS_COLORS?.error?.main            ?? '#FF6B6B',
  bgDefault:     DS_COLORS?.background?.default    ?? '#F5F7F8',
  bgPaper:       DS_COLORS?.background?.paper      ?? '#FFFFFF',
  textPrimary:   DS_COLORS?.text?.primary          ?? '#00171F',
  textSecondary: DS_COLORS?.text?.secondary        ?? '#3E4F53',
  textLight:     DS_COLORS?.text?.tertiary         ?? '#5D6F75',
  borderLight:   DS_COLORS?.border?.light          ?? '#D7DFE3',
  borderMain:    DS_COLORS?.border?.main           ?? '#C3CFD5',
};

const GLASS_BG = Platform.select({
  ios: 'rgba(255,255,255,0.06)',
  android: 'rgba(255,255,255,0.10)',
  default: 'rgba(255,255,255,0.08)',
});
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

const ChecklistViewerModal = ({ visible, onClose, ordenId, servicioNombre }) => {
  console.log('🔍 Modal Props:', { visible, ordenId, servicioNombre });

  // TODOS LOS HOOKS PRIMERO - ANTES DE CUALQUIER RETURN
  const insets = useSafeAreaInsets();
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [mostrarFirmas, setMostrarFirmas] = useState(false);
  const [fotoProveedorError, setFotoProveedorError] = useState(false);

  // Función para cargar checklist - MEMOIZADA CON useCallback
  const cargarChecklist = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Cargando checklist para orden:', ordenId);

      const checklistData = await checklistClienteService.obtenerChecklistServicio(ordenId);

      if (!checklistData) {
        throw new Error('No se recibieron datos del checklist');
      }

      const checklistFormateado = checklistClienteService.formatearChecklistParaCliente(checklistData);

      console.log('✅ Checklist cargado:', checklistFormateado);
      setChecklist(checklistFormateado);

      // Establecer primera categoría como seleccionada por defecto
      if (checklistFormateado?.respuestas && Array.isArray(checklistFormateado.respuestas)) {
        const categorias = checklistClienteService.organizarRespuestasPorCategoria(checklistFormateado.respuestas);
        const primeraCategoria = Object.keys(categorias)[0];
        if (primeraCategoria) {
          setCategoriaSeleccionada(primeraCategoria);
        }
      }
    } catch (err) {
      console.error('❌ Error cargando checklist:', err);
      setError(String(err.message || 'No se pudo cargar el checklist del servicio'));

      Alert.alert(
        'Error',
        String(err.message || 'No se pudo cargar el checklist del servicio'),
        [{ text: 'OK', onPress: onClose }]
      );
    } finally {
      setLoading(false);
    }
  }, [ordenId, onClose]);

  // useEffect también debe ir antes de cualquier return
  useEffect(() => {
    if (visible && ordenId) {
      cargarChecklist();
    }
  }, [visible, ordenId, cargarChecklist]);

  // AHORA SÍ, RETURN CONDICIONAL DESPUÉS DE TODOS LOS HOOKS
  if (!visible) {
    return null;
  }

  // ─── TARJETA DEL PROVEEDOR ───────────────────────────────────────────────
  const renderProveedorCard = () => {
    const pi = checklist?.ordenInfo?.proveedor_info;
    if (!pi) return null;

    const marcasVisibles = (pi.marcas_atendidas || []).slice(0, 3);
    const mostrarFoto = pi.foto_perfil_url && !fotoProveedorError;

    return (
      <View style={styles.proveedorCard}>
        {/* Avatar compacto */}
        {mostrarFoto ? (
          <Image
            source={{ uri: pi.foto_perfil_url }}
            style={styles.proveedorAvatar}
            resizeMode="cover"
            onError={() => setFotoProveedorError(true)}
          />
        ) : (
          <View style={[styles.proveedorAvatar, styles.proveedorAvatarPlaceholder]}>
            <Text style={styles.proveedorAvatarInicial}>
              {(pi.nombre || 'P')[0].toUpperCase()}
            </Text>
          </View>
        )}

        {/* Info compacta */}
        <View style={styles.proveedorInfoContainer}>
          <View style={styles.proveedorRow}>
            <Text style={styles.proveedorNombre} numberOfLines={1}>
              {pi.nombre || 'Proveedor'}
            </Text>
            <View style={styles.proveedorTipoBadge}>
              <Text style={styles.proveedorTipoBadgeTexto}>
                {pi.tipo === 'taller' ? 'Taller' : 'Mecánico'}
              </Text>
            </View>
          </View>

          {marcasVisibles.length > 0 && (
            <View style={styles.marcasRow}>
              {marcasVisibles.map((marca, idx) => (
                <View key={String(idx)} style={styles.marcaChip}>
                  <Text style={styles.marcaChipTexto}>{marca}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  // ─── NAVEGACIÓN DE CATEGORÍAS ────────────────────────────────────────────
  const renderNavegacion = () => {
    if (!checklist?.respuestas || !Array.isArray(checklist.respuestas)) {
      return null;
    }

    const categorias = checklistClienteService.organizarRespuestasPorCategoria(checklist.respuestas);
    const categoriasArray = Object.keys(categorias || {});

    if (categoriasArray.length === 0) {
      return null;
    }

    return (
      <View style={styles.navegacionContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriasScroll}
          contentContainerStyle={{ paddingHorizontal: 8 }}
        >
          {categoriasArray.map((categoria) => {
            const categoriaData = categorias[categoria] || [];
            const categoriaLength = Array.isArray(categoriaData) ? categoriaData.length : 0;

            return (
              <TouchableOpacity
                key={String(categoria)}
                style={[
                  styles.categoriaTab,
                  categoriaSeleccionada === categoria && styles.categoriaTabActiva,
                ]}
                onPress={() => setCategoriaSeleccionada(categoria)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={checklistClienteService.obtenerIconoCategoria(categoria)}
                  size={18}
                  color={categoriaSeleccionada === categoria ? '#F9FAFB' : 'rgba(255,255,255,0.55)'}
                />
                <Text
                  style={[
                    styles.categoriaTabTexto,
                    categoriaSeleccionada === categoria && styles.categoriaTabTextoActivo,
                  ]}
                >
                  {String(checklistClienteService.obtenerNombreCategoria(categoria))}
                </Text>
                <View
                  style={[
                    styles.categoriaContador,
                    categoriaSeleccionada === categoria && { backgroundColor: 'rgba(255,255,255,0.2)' },
                  ]}
                >
                  <Text
                    style={[
                      styles.contadorTexto,
                      categoriaSeleccionada === categoria && { color: '#fff' },
                    ]}
                  >
                    {String(categoriaLength)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // ─── CONTENIDO DE CATEGORÍA ──────────────────────────────────────────────
  const renderContenido = () => {
    if (!categoriaSeleccionada || !checklist?.respuestas) {
      return (
        <View style={styles.contenidoContainer}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="information-circle" size={64} color={C.textLight} />
            <Text style={styles.instruccionTexto}>
              👆 Selecciona una categoría arriba para ver los detalles de la inspección realizada
            </Text>
          </View>
        </View>
      );
    }

    const categorias = checklistClienteService.organizarRespuestasPorCategoria(checklist.respuestas);
    const respuestasCategoria = categorias[categoriaSeleccionada] || [];

    if (!Array.isArray(respuestasCategoria) || respuestasCategoria.length === 0) {
      return (
        <View style={styles.contenidoContainer}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="folder-open" size={64} color={C.textLight} />
            <Text style={styles.sinDatosTexto}>
              No hay elementos verificados en esta categoría
            </Text>
          </View>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.contenidoContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        <Text style={styles.categoriaTitle}>
          {String(checklistClienteService.obtenerNombreCategoria(categoriaSeleccionada))}
        </Text>
        <Text style={styles.categoriaSubtitle}>
          ✅ {String(respuestasCategoria.length)} elemento{respuestasCategoria.length !== 1 ? 's' : ''} verificado{respuestasCategoria.length !== 1 ? 's' : ''}
        </Text>

        {respuestasCategoria.map((respuesta, index) => {
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

            return (
              <View key={String(index)} style={styles.respuestaCard}>
                <View style={styles.preguntaContainer}>
                  <Text style={styles.preguntaTexto}>{pregunta}</Text>
                  {respuesta.completado && (
                    <Ionicons name="checkmark-circle" size={24} color={C.success} />
                  )}
                </View>

                {/* SELECT / MULTISELECT */}
                {respuesta.respuesta_seleccion != null &&
                  tipoPregunta !== 'BOOLEAN' && (
                    <View style={styles.respuestaItem}>
                      <Text style={styles.respuestaLabel}>Resultado seleccionado</Text>
                      {(() => {
                        const sel = respuesta.respuesta_seleccion;
                        let opciones = [];
                        if (Array.isArray(sel)) {
                          opciones = sel;
                        } else if (typeof sel === 'string') {
                          try {
                            const parsed = JSON.parse(sel);
                            opciones = Array.isArray(parsed) ? parsed : [sel];
                          } catch {
                            opciones = [sel];
                          }
                        }
                        return (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {opciones.map((op, oi) => (
                              <View key={String(oi)} style={styles.seleccionChip}>
                                <Ionicons
                                  name="checkmark-circle"
                                  size={16}
                                  color={C.success}
                                  style={{ marginRight: 4 }}
                                />
                                <Text style={styles.seleccionChipTexto}>{String(op)}</Text>
                              </View>
                            ))}
                          </View>
                        );
                      })()}
                    </View>
                  )}

                {/* Respuesta de texto mejorada */}
                {respuesta.respuesta_texto && (() => {
                  let icono = null;
                  let unidad = '';
                  let valorStyle = {};

                  if (tipoPregunta === 'KILOMETER_INPUT') {
                    icono = (
                      <Ionicons
                        name="speedometer-outline"
                        size={16}
                        color={C.accent}
                        style={{ marginRight: 6 }}
                      />
                    );
                    unidad = ' km';
                    valorStyle = { fontSize: 17, fontWeight: '700', color: C.primary };
                  } else if (tipoPregunta === 'FLUID_LEVEL') {
                    icono = (
                      <Ionicons
                        name="water-outline"
                        size={16}
                        color={C.accent}
                        style={{ marginRight: 6 }}
                      />
                    );
                  } else if (tipoPregunta === 'NUMBER') {
                    icono = (
                      <Ionicons
                        name="calculator-outline"
                        size={16}
                        color={C.accent}
                        style={{ marginRight: 6 }}
                      />
                    );
                  }

                  return (
                    <View style={styles.respuestaItem}>
                      <Text style={styles.respuestaLabel}>💬 Respuesta</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {icono}
                        <Text style={[styles.respuestaValor, valorStyle]}>
                          {String(respuesta.respuesta_texto)}{unidad}
                        </Text>
                      </View>
                    </View>
                  );
                })()}

                {/* Respuesta numérica */}
                {respuesta.respuesta_numero !== null &&
                  respuesta.respuesta_numero !== undefined && (
                    <View style={styles.respuestaItem}>
                      <Text style={styles.respuestaLabel}>🔢 Valor</Text>
                      <Text style={styles.respuestaValor}>
                        {String(respuesta.respuesta_numero)}
                      </Text>
                    </View>
                  )}

                {/* Respuesta booleana */}
                {respuesta.respuesta_booleana !== null &&
                  respuesta.respuesta_booleana !== undefined && (
                    <View style={styles.respuestaItem}>
                      <Text style={styles.respuestaLabel}>📊 Estado</Text>
                      <View style={styles.booleanResponse}>
                        <Ionicons
                          name={respuesta.respuesta_booleana ? 'checkmark-circle' : 'close-circle'}
                          size={18}
                          color={respuesta.respuesta_booleana ? C.success : C.error}
                        />
                        <Text
                          style={[
                            styles.respuestaValor,
                            {
                              color: respuesta.respuesta_booleana ? C.success : C.error,
                              marginLeft: 8,
                              fontWeight: '600',
                            },
                          ]}
                        >
                          {String(respuesta.respuesta_booleana ? '✅ Correcto' : '⚠️ Necesita atención')}
                        </Text>
                      </View>
                    </View>
                  )}

                {/* Fotos mejoradas */}
                {respuesta.fotos && Array.isArray(respuesta.fotos) && respuesta.fotos.length > 0 && (
                  <View style={styles.fotosContainer}>
                    <Text style={styles.respuestaLabel}>
                      {respuesta.fotos.length} foto{respuesta.fotos.length !== 1 ? 's' : ''} de evidencia
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {respuesta.fotos.map((foto, fotoIndex) => {
                        if (!foto || typeof foto !== 'object') return null;

                        return (
                          <TouchableOpacity
                            key={String(fotoIndex)}
                            style={styles.fotoContainer}
                            activeOpacity={0.8}
                          >
                            <Image
                              source={{ uri: foto.imagen_url || foto.imagen_comprimida_url || '' }}
                              style={styles.fotoImagen}
                            />
                            <Text style={styles.fotoDescripcion} numberOfLines={2}>
                              {String(foto.descripcion || 'Evidencia del servicio')}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Fecha de respuesta */}
                {respuesta.fecha_respuesta && (
                  <Text style={styles.fechaRespuesta}>
                    🕐 Verificado: {String(checklistClienteService.formatearFecha(respuesta.fecha_respuesta))}
                  </Text>
                )}
              </View>
            );
          } catch (err) {
            console.error('Error renderizando respuesta:', err);
            return (
              <View key={String(index)} style={styles.respuestaCard}>
                <Text style={styles.respuestaLabel}>❌ Error cargando item</Text>
              </View>
            );
          }
        })}

        {/* Firmas al final de todo el contenido */}
        {renderFirmas()}
      </ScrollView>
    );
  };

  // ─── FIRMAS ──────────────────────────────────────────────────────────────
  const renderFirmas = () => {
    if (!checklist) return null;

    const tieneFirmaTecnico = checklist.firmaTecnico && typeof checklist.firmaTecnico === 'string';
    const tieneFirmaCliente = checklist.firmaCliente && typeof checklist.firmaCliente === 'string';

    if (!tieneFirmaTecnico && !tieneFirmaCliente) {
      return (
        <View style={styles.firmasContainer}>
          <TouchableOpacity
            style={styles.firmasToggleButton}
            onPress={() => setMostrarFirmas(!mostrarFirmas)}
            activeOpacity={0.7}
          >
            <Ionicons name="create" size={20} color={C.primary} />
            <Text style={styles.firmasToggleText}>✍️ Ver Firmas de Conformidad</Text>
            <Ionicons
              name={mostrarFirmas ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={C.primary}
            />
          </TouchableOpacity>

          {mostrarFirmas && (
            <View style={styles.firmasContent}>
              <View style={styles.sinFirmasContainer}>
                <Ionicons name="document-outline" size={48} color={C.textLight} />
                <Text style={styles.sinFirmasText}>No hay firmas disponibles para este servicio</Text>
              </View>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.firmasContainer}>
        <TouchableOpacity
          style={styles.firmasToggleButton}
          onPress={() => setMostrarFirmas(!mostrarFirmas)}
          activeOpacity={0.7}
        >
          <Ionicons name="create" size={20} color={C.primary} />
          <Text style={styles.firmasToggleText}>
            ✍️ {mostrarFirmas ? 'Ocultar' : 'Ver'} Firmas de Conformidad
          </Text>
          <Ionicons
            name={mostrarFirmas ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={C.primary}
          />
        </TouchableOpacity>

        {mostrarFirmas && (
          <View style={styles.firmasContent}>
            <Text style={styles.firmasTitle}>📝 Firmas de Conformidad</Text>
            <Text style={styles.firmasSubtitle}>
              Estas firmas confirman que el servicio fue completado satisfactoriamente
            </Text>

            <View style={styles.firmasGrid}>
              {tieneFirmaTecnico && (
                <View style={styles.firmaCard}>
                  <View style={styles.firmaHeader}>
                    <Ionicons name="construct" size={20} color={C.primary} />
                    <Text style={styles.firmaLabel}>Firma del Técnico</Text>
                  </View>
                  <View style={styles.firmaImageContainer}>
                    <Image
                      source={{ uri: `data:image/png;base64,${checklist.firmaTecnico}` }}
                      style={styles.firmaImagen}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.firmaDescripcion}>
                    El técnico certifica que el trabajo fue realizado según los estándares
                  </Text>
                </View>
              )}

              {tieneFirmaCliente && (
                <View style={styles.firmaCard}>
                  <View style={styles.firmaHeader}>
                    <Ionicons name="person" size={20} color={C.success} />
                    <Text style={styles.firmaLabel}>Tu Firma</Text>
                  </View>
                  <View style={styles.firmaImageContainer}>
                    <Image
                      source={{ uri: `data:image/png;base64,${checklist.firmaCliente}` }}
                      style={styles.firmaImagen}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.firmaDescripcion}>
                    Confirmas que el servicio fue completado a tu satisfacción
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  // ─── RENDER PRINCIPAL ────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <View style={styles.bg}>
          <View style={styles.blobGreen} />
          <View style={styles.blobIndigo} />
          <View style={styles.blobCyan} />
        </View>

        {/* Header mejorado */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerGlassBase} pointerEvents="none" />
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="arrow-back" size={22} color="#F9FAFB" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.title}>Informe de Servicio</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {String(servicioNombre || 'Servicio Automotriz')}
              </Text>
            </View>

            <View style={styles.estadoBadge}>
              <Text style={styles.estadoBadgeTexto}>
                {checklist?.estado === 'FINALIZADO' ? 'Completado' : (checklist?.estado || 'Completado')}
              </Text>
            </View>
          </View>
        </View>

        {/* Contenido */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.centerCard}>
              <View style={styles.centerCardBase} pointerEvents="none" />
              <ActivityIndicator size="large" color="#6EE7B7" />
            <Text style={styles.loadingText}>📋 Cargando inspección...</Text>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 5 }}>
                Obteniendo detalles del servicio realizado
              </Text>
            </View>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <View style={styles.centerCard}>
              <View style={styles.centerCardBase} pointerEvents="none" />
              <Ionicons name="warning-outline" size={64} color="#FBBF24" />
              <Text style={styles.errorText}>⚠️ Error al cargar inspección</Text>
              <Text style={styles.errorSubtext}>{String(error)}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={cargarChecklist}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>🔄 Reintentar</Text>
            </TouchableOpacity>
            </View>
          </View>
        ) : checklist ? (
          <View style={styles.content}>
            {renderProveedorCard()}
            {renderNavegacion()}
            {renderContenido()}
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <View style={styles.centerCard}>
              <View style={styles.centerCardBase} pointerEvents="none" />
              <Ionicons name="document-outline" size={64} color="rgba(255,255,255,0.35)" />
            <Text style={styles.noDataText}>📋 No hay datos de inspección disponibles</Text>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 10 }}>
                Este servicio no tiene una inspección registrada
              </Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#030712',
  },
  blobGreen: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(16,185,129,0.08)',
  },
  blobIndigo: {
    position: 'absolute',
    top: 360,
    left: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(99,102,241,0.06)',
  },
  blobCyan: {
    position: 'absolute',
    bottom: -50,
    right: -40,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(6,182,212,0.05)',
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerGlassBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: GLASS_BG,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
  },
  estadoBadge: {
    backgroundColor: 'rgba(16,185,129,0.16)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(110,231,183,0.25)',
  },
  estadoBadgeTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6EE7B7',
  },

  // ── Tarjeta del proveedor ────────────────────────────────────────────────
  proveedorCard: {
    backgroundColor: GLASS_BG,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  proveedorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.accent,
  },
  proveedorAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  proveedorAvatarInicial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  proveedorInfoContainer: {
    flex: 1,
    marginLeft: 10,
  },
  proveedorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proveedorNombre: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    flexShrink: 1,
  },
  proveedorTipoBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  proveedorTipoBadgeTexto: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  marcasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  marcaChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  marcaChipTexto: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
  },

  // ── Estado / loading ────────────────────────────────────────────────────
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    fontSize: 18,
    color: '#F9FAFB',
    marginTop: 15,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FCA5A5',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginBottom: 25,
  },
  retryButton: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(110,231,183,0.25)',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'transparent',
  },
  noDataText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginTop: 15,
  },

  // ── Navegación de categorías ─────────────────────────────────────────────
  navegacionContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  categoriasScroll: {
    flexGrow: 0,
  },
  categoriaTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GLASS_BG,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },

  centerCard: {
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    overflow: 'hidden',
    maxWidth: 340,
  },
  centerCardBase: {
    ...StyleSheet.absoluteFillObject,
  },
  categoriaTabActiva: {
    backgroundColor: 'rgba(13,148,136,0.35)',
    borderColor: 'rgba(110,231,183,0.25)',
  },
  categoriaTabTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 5,
    marginRight: 5,
  },
  categoriaTabTextoActivo: {
    color: '#fff',
  },
  categoriaContador: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
  },
  contadorTexto: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },

  // ── Contenido ────────────────────────────────────────────────────────────
  contenidoContainer: {
    flex: 1,
    backgroundColor: C.bgDefault,
  },
  instruccionTexto: {
    fontSize: 18,
    fontWeight: '500',
    color: C.textLight,
    textAlign: 'center',
    marginTop: 50,
    paddingHorizontal: 30,
    lineHeight: 26,
  },
  sinDatosTexto: {
    fontSize: 16,
    color: C.textLight,
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 30,
  },
  categoriaTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 8,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  categoriaSubtitle: {
    fontSize: 16,
    color: C.textLight,
    paddingHorizontal: 20,
    marginBottom: 20,
    fontWeight: '500',
  },

  // ── Cards de respuesta ───────────────────────────────────────────────────
  respuestaCard: {
    backgroundColor: C.bgPaper,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  preguntaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  preguntaTexto: {
    fontSize: 18,
    fontWeight: '600',
    color: C.textPrimary,
    flex: 1,
    lineHeight: 24,
  },
  respuestaItem: {
    marginBottom: 12,
  },
  respuestaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textLight,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  respuestaValor: {
    fontSize: 17,
    color: C.textPrimary,
    fontWeight: '500',
    lineHeight: 22,
  },
  booleanResponse: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },

  // ── Selección chips ──────────────────────────────────────────────────────
  seleccionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.successBg,
    borderWidth: 1,
    borderColor: C.success,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  seleccionChipTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: C.successDark,
  },

  // ── Fotos ────────────────────────────────────────────────────────────────
  fotosContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  fotoContainer: {
    width: 160,
    alignItems: 'center',
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fotoImagen: {
    width: 160,
    height: 160,
    borderRadius: 12,
    backgroundColor: C.borderLight,
  },
  fotoDescripcion: {
    fontSize: 12,
    color: C.textLight,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  fechaRespuesta: {
    fontSize: 13,
    color: C.textLight,
    marginTop: 15,
    fontStyle: 'italic',
    textAlign: 'right',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },

  // ── Firmas ───────────────────────────────────────────────────────────────
  firmasContainer: {
    backgroundColor: C.bgPaper,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  firmasToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgDefault,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  firmasToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  firmasContent: {
    marginTop: 10,
  },
  sinFirmasContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  sinFirmasText: {
    fontSize: 16,
    color: C.textLight,
    textAlign: 'center',
    marginTop: 15,
  },
  firmasTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  firmasSubtitle: {
    fontSize: 14,
    color: C.textLight,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  firmasGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  firmaCard: {
    flex: 1,
    backgroundColor: C.bgDefault,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  firmaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'center',
  },
  firmaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
    marginLeft: 8,
    textAlign: 'center',
  },
  firmaImageContainer: {
    backgroundColor: C.bgPaper,
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  firmaImagen: {
    width: '100%',
    height: 100,
    borderRadius: 6,
    backgroundColor: C.bgDefault,
  },
  firmaDescripcion: {
    fontSize: 12,
    color: C.textLight,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default ChecklistViewerModal;
