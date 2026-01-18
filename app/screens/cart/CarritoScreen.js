import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAgendamiento } from '../../context/AgendamientoContext';
import { COLORS } from '../../utils/constants';
import { getMediaURL } from '../../services/api';

const CarritoScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    carrito,
    carritos,
    loading,
    removerServicio,
    cargarTodosLosCarritos,
    recargarDespuesDeCambio,
    forceUpdateCounter
  } = useAgendamiento();

  const [initialized, setInitialized] = useState(false);
  const [localUpdateCounter, setLocalUpdateCounter] = useState(0);
  const [fotosURLs, setFotosURLs] = useState({}); // Mapa de itemId -> URL completa

  // Calcular datos del carrito
  const datosCarrito = React.useMemo(() => {
    console.log('🛒 CarritoScreen: ====== RECALCULANDO DATOS DEL CARRITO ======');
    console.log('🛒 localUpdateCounter:', localUpdateCounter);
    console.log('🛒 forceUpdateCounter:', forceUpdateCounter);
    console.log('🛒 carrito:', carrito ? `ID: ${carrito.id}, items: ${carrito.items_detail?.length || carrito.items?.length || 0}` : 'null');
    console.log('🛒 carritos.length:', carritos?.length || 0);
    
    // SOLUCIÓN CRÍTICA: Si cargarTodosLosCarritos devuelve array vacío, significa que NO hay carrito activo en el backend
    // NO usar el carrito viejo del cache como fallback
    let carritoActivo = null;
    
    if (carritos && carritos.length > 0) {
      // Hay carritos activos en el backend
      carritoActivo = carritos[0];
      console.log('✅ Usando carrito de carritos[]:', carritoActivo.id);
    } else if (carritos && carritos.length === 0) {
      // Backend confirmó que NO hay carritos (array vacío)
      carritoActivo = null;
      console.log('⚠️ Backend confirmó: NO hay carritos activos');
    } else {
      // carritos aún no se ha cargado, usar carrito como fallback temporal
      carritoActivo = carrito;
      console.log('⏳ Usando carrito temporal del cache:', carrito?.id || 'null');
    }
    
    if (!carritoActivo) {
      console.log('⚠️ CarritoScreen: No hay carrito activo - MOSTRANDO CARRITO VACÍO');
      return {
        tieneServicios: false,
        totalServicios: 0,
        totalEstimado: 0,
        items: [],
        carrito: null
      };
    }
    
    const items = carritoActivo.items_detail || carritoActivo.items || [];
    const totalServicios = items.length;
    const totalConIVA = parseFloat(carritoActivo.total_estimado || carritoActivo.total || 0);
    const totalEstimado = totalConIVA / 1.19;
    
    console.log('✅ CarritoScreen: Datos calculados:');
    console.log('   - Carrito usado:', carritoActivo.id);
    console.log('   - Total servicios:', totalServicios);
    console.log('   - Items:', items.map(i => `${i.servicio_nombre} (ID: ${i.id})`).join(', ') || 'NINGUNO');
    console.log('   - Total estimado: $', Math.round(totalEstimado));
    console.log('🛒 ====== FIN RECALCULO ======');
    
    return {
      tieneServicios: totalServicios > 0,
      totalServicios,
      totalEstimado,
      items,
      carrito: carritoActivo
    };
  }, [carrito, carritos, forceUpdateCounter, localUpdateCounter]);

  // Inicialización
  useEffect(() => {
    const cargarDatos = async () => {
      if (!initialized) {
        console.log('🛒 CarritoScreen: Inicializando...');
        await cargarTodosLosCarritos(true);
        setInitialized(true);
      }
    };
    cargarDatos();
  }, [initialized, cargarTodosLosCarritos]);

  // Escuchar cambios en forceUpdateCounter para recargar automáticamente
  useEffect(() => {
    if (initialized && forceUpdateCounter > 0) {
      console.log('🔄 CarritoScreen: forceUpdateCounter cambió, recargando datos...');
      cargarTodosLosCarritos(true);
      setLocalUpdateCounter(prev => prev + 1);
    }
  }, [forceUpdateCounter, initialized, cargarTodosLosCarritos]);

  // Convertir URLs de fotos cuando cambien los items
  useEffect(() => {
    const convertirURLsFotos = async () => {
      if (!datosCarrito.items || datosCarrito.items.length === 0) {
        setFotosURLs({});
        return;
      }

      console.log('📸 ====== CONVIRTIENDO URLS DE FOTOS DE SERVICIOS ======');
      const nuevasFotosURLs = {};
      
      for (const item of datosCarrito.items) {
        let fotoServicio = null;
        
        // PRIORIDAD 1: Buscar en fotos_servicio (fotos del servicio específico)
        const ofertaDetail = item.oferta_servicio_detail;
        if (ofertaDetail && ofertaDetail.fotos_servicio && ofertaDetail.fotos_servicio.length > 0) {
          // Tomar la primera foto del servicio
          const primeraFoto = ofertaDetail.fotos_servicio[0];
          fotoServicio = primeraFoto.imagen || primeraFoto.imagen_url;
          console.log('📸 ✅ Foto del SERVICIO encontrada en fotos_servicio:', fotoServicio);
        }
        
        // PRIORIDAD 2: Si no hay foto del servicio, buscar foto del servicio_info
        if (!fotoServicio && ofertaDetail?.servicio_info?.foto) {
          fotoServicio = ofertaDetail.servicio_info.foto;
          console.log('📸 ✅ Foto del SERVICIO encontrada en servicio_info:', fotoServicio);
        }
        
        // PRIORIDAD 3: Como último recurso, usar foto de perfil del proveedor
        if (!fotoServicio) {
          console.log('⚠️ No hay foto del servicio, usando foto del proveedor como fallback');
          const tallerInfo = ofertaDetail?.taller_info;
          const mecanicoInfo = ofertaDetail?.mecanico_info;
          
          if (tallerInfo) {
            fotoServicio = tallerInfo.foto_perfil || tallerInfo.usuario?.foto_perfil || tallerInfo.foto;
            if (fotoServicio) console.log('📸 Fallback: Foto del TALLER:', fotoServicio);
          } else if (mecanicoInfo) {
            fotoServicio = mecanicoInfo.foto_perfil || mecanicoInfo.usuario?.foto_perfil || mecanicoInfo.foto;
            if (fotoServicio) console.log('📸 Fallback: Foto del MECÁNICO:', fotoServicio);
          }
        }
        
        if (fotoServicio) {
          console.log('🔄 Convirtiendo URL para item', item.id, ':', fotoServicio);
          const urlCompleta = await getMediaURL(fotoServicio);
          console.log('✅ URL completa generada:', urlCompleta);
          nuevasFotosURLs[item.id] = urlCompleta;
        } else {
          console.log('⚠️ No se encontró ninguna foto para item:', item.id, item.servicio_nombre);
        }
      }
      
      console.log('📸 Total URLs de servicios convertidas:', Object.keys(nuevasFotosURLs).length);
      setFotosURLs(nuevasFotosURLs);
    };
    
    convertirURLsFotos();
  }, [datosCarrito.items, localUpdateCounter]);

  // Eliminar servicio
  const handleEliminarServicio = useCallback(async (item) => {
    try {
      console.log('🗑️ ====== INICIANDO ELIMINACIÓN DE SERVICIO ======');
      
      // Obtener IDs del item directamente
      const carritoId = item.carrito_id || carrito?.id || (carritos && carritos.length > 0 ? carritos[0].id : null);
      const itemId = item.id;
      
      console.log('🔍 IDs para eliminar:', { carritoId, itemId });
      
      if (!carritoId || !itemId) {
        console.error('❌ CarritoScreen: IDs faltantes:', { carritoId, itemId });
        Alert.alert('Error', 'No se pudo identificar el servicio a eliminar');
        return;
      }
      
      console.log('🔄 CarritoScreen: Llamando removerServicio...');
      await removerServicio(carritoId, itemId);
      
      console.log('✅ Servicio removido del backend correctamente');
      
      // Esperar para que el backend procese
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🔄 CarritoScreen: Recargando datos inmediatamente...');
      const carritosActualizados = await cargarTodosLosCarritos(true);
      
      console.log('📊 Carritos actualizados recibidos:', carritosActualizados?.length || 0);
      
      // Esperar para que el Context actualice su estado
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Incrementar contador local para forzar re-render
      setLocalUpdateCounter(prev => {
        const nuevoValor = prev + 1;
        console.log('🔢 LocalUpdateCounter incrementado de', prev, 'a', nuevoValor);
        return nuevoValor;
      });
      
      // Segundo re-render para garantizar
      setTimeout(() => {
        setLocalUpdateCounter(prev => prev + 1);
      }, 100);
      
      console.log('✅ ====== ELIMINACIÓN COMPLETADA EXITOSAMENTE ======');
      
    } catch (error) {
      console.error('❌ Error al eliminar servicio:', error);
      Alert.alert('Error', 'No se pudo eliminar el servicio del carrito: ' + error.message);
    }
  }, [carrito, carritos, removerServicio, cargarTodosLosCarritos]);

  // Continuar a opciones de pago
  const handleContinuar = () => {
    if (!datosCarrito.tieneServicios) {
      Alert.alert('Carrito vacío', 'Agrega servicios antes de continuar');
      return;
    }
    navigation.navigate('OpcionesPago');
  };

  // Renderizar item del carrito
  const renderServiceItem = (item, index) => {
    const nombreProveedor = item.taller_nombre || item.mecanico_nombre || 'Proveedor';
    const tipoProveedor = item.taller_nombre ? 'Taller' : 'Mecánico';
    const precioSinIVA = Math.round(parseFloat(item.precio_estimado || 0) / 1.19);
    
    // Obtener URL completa de la foto desde el estado
    const fotoURL = fotosURLs[item.id];
    
    console.log('🎨 Renderizando item:', item.servicio_nombre, '- Foto URL:', fotoURL || 'Sin foto');

    return (
      <View key={`service-${item.id}-${index}`} style={styles.cartItem}>
        <View style={styles.itemImageContainer}>
          {fotoURL ? (
            <Image 
              source={{ uri: fotoURL }} 
              style={styles.itemImage}
              onError={(error) => {
                console.error('❌ Error cargando imagen para item', item.id);
                console.error('❌ URL que falló:', fotoURL);
                console.error('❌ Error:', error.nativeEvent?.error);
              }}
            />
          ) : (
            <View style={styles.itemImagePlaceholder}>
              <Ionicons 
                name={item.taller_nombre ? "business" : "person"} 
                size={24} 
                color="#007AFF" 
              />
            </View>
          )}
        </View>
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.servicio_nombre || 'Servicio'}</Text>
          <Text style={styles.itemProvider}>{tipoProveedor} • {nombreProveedor}</Text>
          <Text style={styles.itemPrice}>${precioSinIVA.toLocaleString('es-CL')}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleEliminarServicio(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#333333" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Ionicons name="cart" size={24} color="#333333" />
            <Text style={styles.headerTitle}>Mi Carrito</Text>
          </View>
          
          {datosCarrito.tieneServicios && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{datosCarrito.totalServicios}</Text>
            </View>
          )}
        </View>

        {/* Contenido */}
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.contentContainer,
            !datosCarrito.tieneServicios && styles.contentContainerEmpty
          ]}
        >
          {loading && !initialized ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Cargando carrito...</Text>
            </View>
          ) : !datosCarrito.tieneServicios ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cart-outline" size={80} color="#CCCCCC" />
              </View>
              <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
              <Text style={styles.emptySubtitle}>
                Agrega servicios para tu vehículo y agenda tu cita.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate('Home')}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Explorar servicios</Text>
              </TouchableOpacity>
            </View>
          ) : (
            datosCarrito.items?.map((item, index) => renderServiceItem(item, index))
          )}
        </ScrollView>

        {/* Footer */}
        {datosCarrito.tieneServicios && (
          <View style={styles.footer}>
            <View style={styles.totalSummary}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>
                  ${Math.round(datosCarrito.totalEstimado || 0).toLocaleString('es-CL')}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleContinuar}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 12,
  },
  headerBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 20,
  },
  contentContainerEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemImageContainer: {
    marginRight: 16,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  itemImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  itemProvider: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 6,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE7E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  totalSummary: {
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  primaryButton: {
    backgroundColor: '#333333',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default CarritoScreen;
