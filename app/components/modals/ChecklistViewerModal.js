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
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import checklistClienteService from '../../services/checklistService';

const COLORS = {
  primary: '#2563eb',
  success: '#16a34a',
  warning: '#f59e0b',
  error: '#dc2626',
  background: '#f8fafc',
  text: '#1e293b',
  textLight: '#64748b',
  border: '#e2e8f0'
};

const ChecklistViewerModal = ({ visible, onClose, ordenId, servicioNombre }) => {
  console.log('🔍 Modal Props:', { visible, ordenId, servicioNombre });

  // TODOS LOS HOOKS PRIMERO - ANTES DE CUALQUIER RETURN
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [mostrarFirmas, setMostrarFirmas] = useState(false);

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
      
    } catch (error) {
      console.error('❌ Error cargando checklist:', error);
      setError(String(error.message || 'No se pudo cargar el checklist del servicio'));
      
      Alert.alert(
        'Error',
        String(error.message || 'No se pudo cargar el checklist del servicio'),
        [{ text: 'OK', onPress: onClose }]
      );
    } finally {
      setLoading(false);
    }
  }, [ordenId, onClose]); // Dependencias necesarias

  // useEffect también debe ir antes de cualquier return
  useEffect(() => {
    if (visible && ordenId) {
      cargarChecklist();
    }
  }, [visible, ordenId, cargarChecklist]); // Ahora incluyo cargarChecklist en dependencias

  // AHORA SÍ, RETURN CONDICIONAL DESPUÉS DE TODOS LOS HOOKS
  if (!visible) {
    return null;
  }

  // Renderizar navegación de categorías
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
        <Text style={styles.navegacionTitle}>📋 Categorías de Inspección</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriasScroll}
          contentContainerStyle={{ paddingHorizontal: 5 }}
        >
          {categoriasArray.map((categoria) => {
            const categoriaData = categorias[categoria] || [];
            const categoriaLength = Array.isArray(categoriaData) ? categoriaData.length : 0;
            
            return (
              <TouchableOpacity
                key={String(categoria)}
                style={[
                  styles.categoriaTab,
                  categoriaSeleccionada === categoria && styles.categoriaTabActiva
                ]}
                onPress={() => setCategoriaSeleccionada(categoria)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={checklistClienteService.obtenerIconoCategoria(categoria)} 
                  size={18} 
                  color={categoriaSeleccionada === categoria ? '#fff' : COLORS.primary} 
                />
                <Text style={[
                  styles.categoriaTabTexto,
                  categoriaSeleccionada === categoria && styles.categoriaTabTextoActivo
                ]}>
                  {String(checklistClienteService.obtenerNombreCategoria(categoria))}
                </Text>
                <View style={[
                  styles.categoriaContador,
                  categoriaSeleccionada === categoria && { backgroundColor: 'rgba(255,255,255,0.2)' }
                ]}>
                  <Text style={[
                    styles.contadorTexto,
                    categoriaSeleccionada === categoria && { color: '#fff' }
                  ]}>
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

  // Renderizar contenido de categoría seleccionada
  const renderContenido = () => {
    if (!categoriaSeleccionada || !checklist?.respuestas) {
      return (
        <View style={styles.contenidoContainer}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="information-circle" size={64} color={COLORS.textLight} />
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
            <Ionicons name="folder-open" size={64} color={COLORS.textLight} />
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
            
            return (
              <View key={String(index)} style={styles.respuestaCard}>
                <View style={styles.preguntaContainer}>
                  <Text style={styles.preguntaTexto}>{pregunta}</Text>
                  {respuesta.completado && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  )}
                </View>

                {/* Respuesta de texto */}
                {respuesta.respuesta_texto && (
                  <View style={styles.respuestaItem}>
                    <Text style={styles.respuestaLabel}>💬 Respuesta</Text>
                    <Text style={styles.respuestaValor}>
                      {String(respuesta.respuesta_texto)}
                    </Text>
                  </View>
                )}

                {/* Respuesta numérica */}
                {(respuesta.respuesta_numero !== null && respuesta.respuesta_numero !== undefined) && (
                  <View style={styles.respuestaItem}>
                    <Text style={styles.respuestaLabel}>🔢 Valor</Text>
                    <Text style={styles.respuestaValor}>
                      {String(respuesta.respuesta_numero)}
                    </Text>
                  </View>
                )}

                {/* Respuesta booleana */}
                {(respuesta.respuesta_booleana !== null && respuesta.respuesta_booleana !== undefined) && (
                  <View style={styles.respuestaItem}>
                    <Text style={styles.respuestaLabel}>📊 Estado</Text>
                    <View style={styles.booleanResponse}>
                      <Ionicons 
                        name={respuesta.respuesta_booleana ? "checkmark-circle" : "close-circle"} 
                        size={18} 
                        color={respuesta.respuesta_booleana ? COLORS.success : COLORS.error} 
                      />
                      <Text style={[
                        styles.respuestaValor,
                        { 
                          color: respuesta.respuesta_booleana ? COLORS.success : COLORS.error,
                          marginLeft: 8,
                          fontWeight: '600'
                        }
                      ]}>
                        {String(respuesta.respuesta_booleana ? "✅ Correcto" : "⚠️ Necesita atención")}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Fotos */}
                {respuesta.fotos && Array.isArray(respuesta.fotos) && respuesta.fotos.length > 0 && (
                  <View style={styles.fotosContainer}>
                    <Text style={styles.respuestaLabel}>📸 Evidencia fotográfica</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {respuesta.fotos.map((foto, fotoIndex) => {
                        if (!foto || typeof foto !== 'object') return null;
                        
                        return (
                          <TouchableOpacity
                            key={String(fotoIndex)}
                            style={styles.fotoContainer}
                            onPress={() => {
                              const descripcion = String(foto.descripcion || 'Evidencia del servicio');
                              Alert.alert('📸 Foto', descripcion);
                            }}
                            activeOpacity={0.8}
                          >
                            <Image 
                              source={{ uri: foto.imagen_url || foto.imagen_comprimida_url || '' }} 
                              style={styles.fotoImagen}
                            />
                            {foto.descripcion && (
                              <Text style={styles.fotoDescripcion}>
                                {String(foto.descripcion)}
                              </Text>
                            )}
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
          } catch (error) {
            console.error('Error renderizando respuesta:', error);
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

  // Renderizar sección de firmas
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
            <Ionicons name="create" size={20} color={COLORS.primary} />
            <Text style={styles.firmasToggleText}>✍️ Ver Firmas de Conformidad</Text>
            <Ionicons 
              name={mostrarFirmas ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={COLORS.primary} 
            />
          </TouchableOpacity>
          
          {mostrarFirmas && (
            <View style={styles.firmasContent}>
              <View style={styles.sinFirmasContainer}>
                <Ionicons name="document-outline" size={48} color={COLORS.textLight} />
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
          <Ionicons name="create" size={20} color={COLORS.primary} />
          <Text style={styles.firmasToggleText}>
            ✍️ {mostrarFirmas ? 'Ocultar' : 'Ver'} Firmas de Conformidad
          </Text>
          <Ionicons 
            name={mostrarFirmas ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={COLORS.primary} 
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
                    <Ionicons name="construct" size={20} color={COLORS.primary} />
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
                    <Ionicons name="person" size={20} color={COLORS.success} />
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Inspección Realizada</Text>
            <Text style={styles.subtitle}>
              {String(servicioNombre || 'Servicio Automotriz')}
            </Text>
          </View>
        </View>
        
        {/* Contenido */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>📋 Cargando inspección...</Text>
            <Text style={{ fontSize: 14, color: COLORS.textLight, marginTop: 5 }}>
              Obteniendo detalles del servicio realizado
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={64} color={COLORS.warning} />
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
        ) : checklist ? (
          <View style={styles.content}>
            {renderNavegacion()}
            {renderContenido()}
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="document-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.noDataText}>📋 No hay datos de inspección disponibles</Text>
            <Text style={{ fontSize: 14, color: COLORS.textLight, marginTop: 10 }}>
              Este servicio no tiene una inspección registrada
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  headerContent: {
    flex: 1,
    marginLeft: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: 18,
    color: COLORS.text,
    marginTop: 15,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.error,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 25,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
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
    backgroundColor: COLORS.background,
  },
  noDataText: {
    fontSize: 18,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 15,
  },
  navegacionContainer: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  navegacionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 15,
  },
  categoriasScroll: {
    marginHorizontal: -5,
  },
  categoriaTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoriaTabActiva: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
  },
  categoriaTabTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
    marginRight: 8,
  },
  categoriaTabTextoActivo: {
    color: '#fff',
  },
  categoriaContador: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  contadorTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  contenidoContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  instruccionTexto: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 50,
    paddingHorizontal: 30,
    lineHeight: 26,
  },
  sinDatosTexto: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 30,
  },
  categoriaTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  categoriaSubtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    paddingHorizontal: 20,
    marginBottom: 20,
    fontWeight: '500',
  },
  respuestaCard: {
    backgroundColor: '#fff',
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
    borderBottomColor: COLORS.border,
  },
  preguntaTexto: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    lineHeight: 24,
  },
  respuestaItem: {
    marginBottom: 12,
  },
  respuestaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  respuestaValor: {
    fontSize: 17,
    color: COLORS.text,
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
  fotosContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  fotoContainer: {
    marginRight: 15,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fotoImagen: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: COLORS.border,
  },
  fotoDescripcion: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  fechaRespuesta: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 15,
    fontStyle: 'italic',
    textAlign: 'right',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  firmasContainer: {
    backgroundColor: '#fff',
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
    backgroundColor: COLORS.background,
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
    color: COLORS.text,
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
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 15,
  },
  firmasTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  firmasSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
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
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.text,
    marginLeft: 8,
    textAlign: 'center',
  },
  firmaImageContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  firmaImagen: {
    width: '100%',
    height: 100,
    borderRadius: 6,
    backgroundColor: COLORS.background,
  },
  firmaDescripcion: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default ChecklistViewerModal; 