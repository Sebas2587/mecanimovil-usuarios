import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDERS, ROUTES } from '../../utils/constants';
import { getMediaURL } from '../../services/api';
import RepuestosExpandible from './RepuestosExpandible';
import EstadoSolicitudBadge from '../solicitudes/EstadoSolicitudBadge';
import { useTheme } from '../../design-system/theme/useTheme';
import CountdownTimer from '../common/CountdownTimer';

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Card para mostrar una oferta de proveedor - Diseño tipo Airbnb
 */
const OfertaCard = ({
  oferta,
  destacada = false,
  esOfertaSecundaria = false,
  onChatPress,
  onVerDetallePress,
  onAceptarPress,
  onRechazarPress,
  onPagarPress,
  inicialmenteExpandida = true, // Por defecto expandida para primera oferta
  esUnicaOferta = false // Si es la única oferta, siempre expandida
}) => {
  const navigation = useNavigation();
  const [proveedorFotoUrl, setProveedorFotoUrl] = useState(null);
  const [expandida, setExpandida] = useState(inicialmenteExpandida || esUnicaOferta);
  const rotateAnim = useRef(new Animated.Value(inicialmenteExpandida || esUnicaOferta ? 1 : 0)).current;
  const theme = useTheme();

  // Extraer valores del tema de forma segura
  const colors = theme?.colors || {};
  const typography = theme?.typography || {};
  const spacing = theme?.spacing || {};
  const borders = theme?.borders || {};

  // Asegurar que typography tenga todas las propiedades necesarias
  const safeTypography = typography?.fontSize && typography?.fontWeight
    ? typography
    : {
      fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24 },
      fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
    };

  // Validar que borders esté completamente inicializado
  const safeBorders = (borders?.radius && typeof borders.radius.full !== 'undefined')
    ? borders
    : {
      radius: {
        none: 0, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20, '3xl': 24,
        full: 9999,
        button: { sm: 8, md: 12, lg: 16, full: 9999 },
        input: { sm: 8, md: 12, lg: 16 },
        card: { sm: 8, md: 12, lg: 16, xl: 20 },
        modal: { sm: 12, md: 16, lg: 20, xl: 24 },
        avatar: { sm: 16, md: 24, lg: 32, full: 9999 },
        badge: { sm: 4, md: 8, lg: 12, full: 9999 },
      },
      width: { none: 0, thin: 1, medium: 2, thick: 4 }
    };

  // Crear estilos dinámicos con los tokens del tema
  const styles = createStyles(colors, safeTypography, spacing, safeBorders);

  // Obtener foto del proveedor - El backend devuelve proveedor_foto con URL completa
  useEffect(() => {
    // Prioridad: proveedor_foto (del serializer, ya tiene URL completa) > rutas anidadas con _url > fallback con getMediaURL
    let fotoProveedor =
      oferta.proveedor_foto || // Ya viene con URL completa del serializer
      oferta.proveedor_info?.usuario?.foto_perfil_url ||
      oferta.taller_info?.usuario?.foto_perfil_url ||
      oferta.mecanico_info?.usuario?.foto_perfil_url ||
      oferta.proveedor_info?.foto_perfil_url ||
      oferta.taller_info?.foto_perfil_url ||
      oferta.mecanico_info?.foto_perfil_url ||
      null;

    if (fotoProveedor) {
      // Si ya es una URL completa (empieza con http), usarla directamente
      if (typeof fotoProveedor === 'string' && (fotoProveedor.startsWith('http://') || fotoProveedor.startsWith('https://'))) {
        setProveedorFotoUrl(fotoProveedor);
        console.log('✅ OfertaCard - Foto de proveedor cargada (URL completa):', fotoProveedor);
      } else {
        // Fallback: construir URL con getMediaURL
        const cargarFotoProveedor = async () => {
          try {
            const fullUrl = await getMediaURL(fotoProveedor);
            setProveedorFotoUrl(fullUrl);
            console.log('✅ OfertaCard - Foto de proveedor cargada (fallback):', fullUrl);
          } catch (error) {
            console.error('❌ OfertaCard - Error cargando foto de proveedor:', error);
            setProveedorFotoUrl(null);
          }
        };
        cargarFotoProveedor();
      }
    } else {
      setProveedorFotoUrl(null);
    }
  }, [oferta]);

  const handleVerPerfilProveedor = () => {
    if (oferta.tipo_proveedor) {
      const providerId = oferta.proveedor_id_detail || oferta.proveedor;
      const providerType = oferta.tipo_proveedor === 'taller' ? 'taller' : 'mecanico';

      if (providerId) {
        navigation.navigate(ROUTES.PROVIDER_DETAIL, {
          providerId: providerId,
          providerType: providerType
        });
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  const formatDuration = (duration) => {
    if (!duration) return 'No especificado';
    if (typeof duration === 'string') {
      const match = duration.match(/(\d+):(\d+):(\d+)/);
      if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        if (hours > 0) {
          return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
      }
    }
    return duration;
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={12} color={COLORS.text} />
      );
    }
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={12} color={COLORS.text} />
      );
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={12} color={COLORS.textLight} />
      );
    }
    return stars;
  };

  const tipoProveedor = oferta.tipo_proveedor === 'taller' ? 'Taller' : 'Mecánico a Domicilio';
  const rating = oferta.rating_proveedor || 0;
  const totalReviews = oferta.total_reviews || oferta.review_count || 0;

  // Obtener el nombre del servicio principal ofertado
  const obtenerNombreServicio = () => {
    // Prioridad 1: detalles_servicios_detail (estructura completa)
    if (oferta.detalles_servicios_detail && Array.isArray(oferta.detalles_servicios_detail) && oferta.detalles_servicios_detail.length > 0) {
      const primerServicio = oferta.detalles_servicios_detail[0];
      const nombre = primerServicio.servicio_nombre ||
        primerServicio.nombre ||
        primerServicio.servicio?.nombre ||
        primerServicio.servicio_info?.nombre ||
        null;
      if (nombre) {
        if (__DEV__) {
          console.log('✅ OfertaCard - Nombre servicio encontrado en detalles_servicios_detail:', nombre);
        }
        return nombre;
      }
    }
    // Prioridad 2: detalles_servicios (estructura alternativa)
    if (oferta.detalles_servicios && Array.isArray(oferta.detalles_servicios) && oferta.detalles_servicios.length > 0) {
      const primerServicio = oferta.detalles_servicios[0];
      const nombre = primerServicio.servicio_nombre ||
        primerServicio.nombre ||
        primerServicio.servicio?.nombre ||
        primerServicio.servicio_info?.nombre ||
        null;
      if (nombre) {
        if (__DEV__) {
          console.log('✅ OfertaCard - Nombre servicio encontrado en detalles_servicios:', nombre);
        }
        return nombre;
      }
    }
    // Prioridad 3: servicio_info (si existe directamente en la oferta)
    if (oferta.servicio_info?.nombre) {
      if (__DEV__) {
        console.log('✅ OfertaCard - Nombre servicio encontrado en servicio_info:', oferta.servicio_info.nombre);
      }
      return oferta.servicio_info.nombre;
    }
    // Prioridad 4: servicio_nombre directo
    if (oferta.servicio_nombre) {
      if (__DEV__) {
        console.log('✅ OfertaCard - Nombre servicio encontrado en servicio_nombre:', oferta.servicio_nombre);
      }
      return oferta.servicio_nombre;
    }

    if (__DEV__) {
      console.warn('⚠️ OfertaCard - No se encontró nombre del servicio. Estructura disponible:', {
        tiene_detalles_servicios_detail: !!oferta.detalles_servicios_detail,
        cantidad_detalles: oferta.detalles_servicios_detail?.length || 0,
        tiene_detalles_servicios: !!oferta.detalles_servicios,
        tiene_servicio_info: !!oferta.servicio_info,
        tiene_servicio_nombre: !!oferta.servicio_nombre,
      });
    }
    return null;
  };

  const nombreServicio = obtenerNombreServicio();

  // Función para toggle expandir/colapsar
  const toggleExpandir = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotateAnim, {
      toValue: expandida ? 0 : 1,
      duration: 200,
      useNativeDriver: true
    }).start();
    setExpandida(!expandida);
  };

  // Rotación del icono de chevron
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  // Obtener desglose de precios directo de la oferta (sin cálculos automáticos)
  const obtenerDesglosePrecios = () => {
    const detalles = oferta.detalles_servicios_detail || oferta.detalles_servicios || [];

    // Valores directos de la oferta (SIN IVA, tal como los envió el proveedor)
    const costoRepuestos = parseFloat(oferta.costo_repuestos || 0);
    const costoManoObra = parseFloat(oferta.costo_mano_obra || 0);
    const costoGestionCompra = parseFloat(oferta.costo_gestion_compra || 0);

    // El precio total ya viene calculado con IVA desde el proveedor
    const precioTotal = parseFloat(oferta.precio_total_ofrecido || 0);

    // Verificar si hay desglose específico enviado por el proveedor
    const tieneDesglose = costoRepuestos > 0 || costoManoObra > 0;

    // Calcular subtotal e IVA solo si hay desglose
    let subtotalSinIva = 0;
    let iva = 0;

    if (tieneDesglose) {
      // Usar valores directos del proveedor
      subtotalSinIva = costoManoObra + costoRepuestos + costoGestionCompra;
      iva = subtotalSinIva * 0.19;
    } else {
      // Si no hay desglose, calcular desde el precio total
      subtotalSinIva = precioTotal / 1.19;
      iva = precioTotal - subtotalSinIva;
    }

    return {
      // Servicios individuales de la oferta
      servicios: detalles.map(d => ({
        nombre: d.servicio_nombre || d.servicio?.nombre || d.nombre || 'Servicio',
        precio: parseFloat(d.precio_servicio || 0),
        repuestos_info: d.repuestos_info || []
      })),
      // Valores directos del proveedor (sin IVA)
      costoManoObra,
      costoRepuestos,
      costoGestionCompra,
      // Totales
      subtotalSinIva: Math.round(subtotalSinIva),
      iva: Math.round(iva),
      total: Math.round(precioTotal), // Usar el precio total original de la oferta
      tieneDesglose
    };
  };

  const desglose = obtenerDesglosePrecios();

  return (
    <View style={[
      styles.card,
      destacada && styles.cardDestacada,
      !expandida && styles.cardColapsada
    ]}>
      {/* Badge de Servicio Adicional */}
      {esOfertaSecundaria && (
        <View style={styles.servicioAdicionalBadge}>
          <Ionicons name="add-circle" size={14} color="#FFFFFF" />
          <Text style={styles.servicioAdicionalBadgeText}>SERVICIO ADICIONAL</Text>
        </View>
      )}

      {/* ==================== HEADER COLAPSABLE ==================== */}
      <TouchableOpacity
        style={styles.headerColapsable}
        onPress={toggleExpandir}
        activeOpacity={0.7}
      >
        {/* Foto pequeña del proveedor */}
        <View style={styles.headerFotoContainer}>
          {proveedorFotoUrl ? (
            <Image
              source={{ uri: proveedorFotoUrl }}
              style={styles.headerFoto}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.headerFotoPlaceholder}>
              <Ionicons
                name={oferta.tipo_proveedor === 'taller' ? 'business' : 'person'}
                size={16}
                color={COLORS.textLight}
              />
            </View>
          )}
        </View>

        {/* Info resumida */}
        <View style={styles.headerInfoResumida}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerNombreProveedor} numberOfLines={1}>
              {oferta.nombre_proveedor || 'Proveedor'}
            </Text>
            {oferta.estado && !expandida && <EstadoSolicitudBadge estado={oferta.estado} size="small" />}
          </View>
          <Text style={styles.headerServicio} numberOfLines={1}>
            {nombreServicio || tipoProveedor}
          </Text>
        </View>

        {/* Precio y chevron */}
        <View style={styles.headerPrecioContainer}>
          <Text style={styles.headerPrecio}>
            ${parseInt(oferta.precio_total_ofrecido || 0).toLocaleString()}
          </Text>
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <Ionicons name="chevron-up" size={20} color={COLORS.textLight} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* ==================== CONTENIDO EXPANDIBLE ==================== */}
      {expandida && (
        <>
          {/* Header con título del servicio y badge de estado - Para TODAS las ofertas */}
          {nombreServicio && (
            <View style={styles.ofertaHeader}>
              <Text style={styles.ofertaTitle} numberOfLines={2}>
                {nombreServicio}
              </Text>
              {oferta.estado && (() => {
                // Si tiene pago parcial pero el estado es 'pagada', mostrar 'pagada_parcialmente' en el badge
                const tienePagoParcial = oferta.estado_pago_repuestos === 'pagado' &&
                  oferta.estado_pago_servicio === 'pendiente';
                const estadoParaBadge = tienePagoParcial && oferta.estado === 'pagada'
                  ? 'pagada_parcialmente'
                  : oferta.estado;
                return <EstadoSolicitudBadge estado={estadoParaBadge} />;
              })()}
            </View>
          )}

          {/* Motivo del servicio adicional */}
          {esOfertaSecundaria && oferta.motivo_servicio_adicional && (
            <View style={styles.motivoContainer}>
              <Text style={styles.motivoLabel}>Motivo:</Text>
              <Text style={styles.motivoText}>{oferta.motivo_servicio_adicional}</Text>
            </View>
          )}

          {/* Link a oferta original si es secundaria */}
          {esOfertaSecundaria && oferta.oferta_original_info && (
            <View style={styles.ofertaOriginalLink}>
              <Ionicons name="link-outline" size={14} color={COLORS.textLight} />
              <Text style={styles.ofertaOriginalLinkText}>
                Relacionada con oferta original de ${parseInt(oferta.oferta_original_info.precio_total_ofrecido || 0).toLocaleString()}
              </Text>
            </View>
          )}

          {/* Contador regresivo para ofertas adjudicadas sin pago */}
          {((oferta.estado === 'aceptada' || oferta.estado === 'pendiente_pago') &&
            oferta.fecha_limite_pago) && (
              <View style={styles.countdownContainer}>
                <CountdownTimer
                  targetDate={oferta.fecha_limite_pago}
                  type="pago"
                  size="medium"
                />
              </View>
            )}

          {/* Header con foto a la izquierda y info a la derecha */}
          <View style={styles.proveedorHeader}>
            {/* Foto del proveedor a la izquierda */}
            <TouchableOpacity
              style={styles.proveedorFotoContainer}
              onPress={handleVerPerfilProveedor}
              activeOpacity={0.7}
            >
              {proveedorFotoUrl ? (
                <Image
                  source={{ uri: proveedorFotoUrl }}
                  style={styles.proveedorFoto}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                  onError={() => {
                    console.log('❌ Error cargando foto de proveedor:', proveedorFotoUrl);
                    setProveedorFotoUrl(null);
                  }}
                />
              ) : (
                <View style={styles.proveedorFotoPlaceholder}>
                  <Ionicons
                    name={oferta.tipo_proveedor === 'taller' ? 'business' : 'person'}
                    size={20}
                    color={COLORS.textLight}
                  />
                </View>
              )}
            </TouchableOpacity>

            {/* Información del proveedor a la derecha */}
            <View style={styles.proveedorInfoContainer}>
              {/* Fila superior: Nombre y Rating */}
              <View style={styles.proveedorTopRow}>
                <View style={styles.proveedorInfoLeft}>
                  <Text style={styles.proveedorNombre} numberOfLines={1}>
                    {oferta.nombre_proveedor || 'Proveedor'}
                  </Text>
                  <Text style={styles.proveedorTipo}>{tipoProveedor}</Text>
                </View>
                <View style={styles.ratingContainer}>
                  <View style={styles.starsContainer}>
                    {renderStars(rating)}
                  </View>
                  <Text style={styles.ratingText}>
                    {rating > 0 ? rating.toFixed(1) : '0.0'}
                  </Text>
                </View>
              </View>

              {/* Badge de tipo como enlace al perfil - Alineado a la derecha debajo del rating */}
              <View style={styles.badgeContainer}>
                <TouchableOpacity
                  onPress={handleVerPerfilProveedor}
                  activeOpacity={0.7}
                  style={styles.tipoBadgeLink}
                >
                  <Text style={styles.tipoBadgeText}>Ver perfil</Text>
                  <Ionicons name="chevron-forward" size={12} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Información de la oferta */}
          <View style={styles.ofertaInfo}>
            {/* Fecha y hora */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.textLight} />
                <Text style={styles.infoLabel}>Fecha:</Text>
              </View>
              <Text style={styles.infoText}>
                {formatDate(oferta.fecha_disponible)}
                {oferta.hora_disponible && ` a las ${formatTime(oferta.hora_disponible)}`}
              </Text>
            </View>

            {/* Tiempo estimado */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="time-outline" size={14} color={COLORS.textLight} />
                <Text style={styles.infoLabel}>Duración:</Text>
              </View>
              <Text style={styles.infoText}>
                {formatDuration(oferta.tiempo_estimado_total)}
              </Text>
            </View>

            {/* Garantía */}
            {oferta.garantia_ofrecida && (
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.textLight} />
                  <Text style={styles.infoLabel}>Garantía:</Text>
                </View>
                <Text style={styles.infoText}>{oferta.garantia_ofrecida}</Text>
              </View>
            )}

            {/* Incluye repuestos badge */}
            {oferta.incluye_repuestos && (
              <View style={styles.repuestosBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.text} />
                <Text style={styles.repuestosText}>Incluye repuestos</Text>
              </View>
            )}

            {/* ==================== DESGLOSE DETALLADO DE PRECIOS ==================== */}
            <View style={styles.desgloseDetalladoContainer}>
              <Text style={styles.desgloseTituloDetallado}>Detalle de precios</Text>

              {/* Mostrar desglose SI el proveedor lo envió */}
              {desglose.tieneDesglose ? (
                <>
                  {/* Desglose de costos enviado por el proveedor (SIN IVA - igual que app proveedores) */}
                  <View style={styles.desgloseProveedorContainer}>
                    {/* Mano de obra */}
                    {desglose.costoManoObra > 0 && (
                      <View style={styles.desgloseProveedorRow}>
                        <View style={styles.desgloseProveedorLeft}>
                          <Ionicons name="construct-outline" size={16} color={colors.primary?.[500] || COLORS.primary} />
                          <Text style={styles.desgloseProveedorLabel}>🔧 Mano de obra (sin IVA)</Text>
                        </View>
                        <Text style={styles.desgloseProveedorValue}>
                          ${Math.round(desglose.costoManoObra).toLocaleString()}
                        </Text>
                      </View>
                    )}

                    {/* Repuestos */}
                    {desglose.costoRepuestos > 0 && (
                      <View style={styles.desgloseProveedorRow}>
                        <View style={styles.desgloseProveedorLeft}>
                          <Ionicons name="cog-outline" size={16} color={COLORS.textLight} />
                          <Text style={styles.desgloseProveedorLabel}>📦 Repuestos (sin IVA)</Text>
                        </View>
                        <Text style={styles.desgloseProveedorValue}>
                          ${Math.round(desglose.costoRepuestos).toLocaleString()}
                        </Text>
                      </View>
                    )}

                    {/* Gestión de compra */}
                    {desglose.costoGestionCompra > 0 && (
                      <View style={styles.desgloseProveedorRow}>
                        <View style={styles.desgloseProveedorLeft}>
                          <Ionicons name="car-outline" size={16} color="#FF9800" />
                          <Text style={[styles.desgloseProveedorLabel, { color: '#FF9800' }]}>🚚 Gestión de compra (sin IVA)</Text>
                        </View>
                        <Text style={[styles.desgloseProveedorValue, { color: '#FF9800' }]}>
                          ${Math.round(desglose.costoGestionCompra).toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Repuestos expandibles si hay info */}
                  {desglose.servicios.length > 0 && desglose.servicios.some(s => s.repuestos_info?.length > 0) && (
                    <View style={styles.repuestosSection}>
                      {desglose.servicios.map((servicio, index) => (
                        servicio.repuestos_info && servicio.repuestos_info.length > 0 && (
                          <RepuestosExpandible
                            key={index}
                            repuestos={servicio.repuestos_info}
                            servicioNombre={servicio.nombre}
                          />
                        )
                      ))}
                    </View>
                  )}
                </>
              ) : (
                /* Si NO hay desglose, mostrar servicios individuales */
                desglose.servicios.length > 0 && (
                  <View style={styles.serviciosDesglose}>
                    {desglose.servicios.map((servicio, index) => {
                      const esServicioPrincipal = index === 0;

                      return (
                        <View key={index} style={styles.servicioDesgloseItem}>
                          <View style={[styles.servicioDesgloseHeader, esServicioPrincipal && styles.servicioDesglosePrincipal]}>
                            <View style={styles.servicioDesgloseLeft}>
                              <Ionicons
                                name="construct-outline"
                                size={16}
                                color={esServicioPrincipal ? (colors.primary?.[500] || COLORS.primary) : COLORS.textLight}
                              />
                              <Text style={[styles.servicioDesgloseNombre, esServicioPrincipal && styles.servicioDesgloseNombrePrincipal]} numberOfLines={2}>
                                {servicio.nombre}
                              </Text>
                            </View>
                            <View style={styles.servicioDesglosePrecioContainer}>
                              <Text style={[styles.servicioDesglosePrecio, esServicioPrincipal && styles.servicioDesglosePrecioPrincipal]}>
                                ${Math.round(servicio.precio).toLocaleString()}
                              </Text>
                            </View>
                          </View>

                          {/* Repuestos expandibles para este servicio */}
                          {servicio.repuestos_info && servicio.repuestos_info.length > 0 && (
                            <RepuestosExpandible
                              repuestos={servicio.repuestos_info}
                              servicioNombre={servicio.nombre}
                            />
                          )}
                        </View>
                      );
                    })}
                  </View>
                )
              )}

              {/* Línea divisoria antes del resumen */}
              <View style={styles.desgloseDividerFull} />

              {/* Resumen: Subtotal, IVA, Total - IGUAL que app de proveedores */}
              <View style={styles.resumenPreciosContainer}>
                <View style={styles.resumenPreciosRow}>
                  <Text style={styles.resumenPreciosLabel}>Subtotal (sin IVA)</Text>
                  <Text style={styles.resumenPreciosValue}>
                    ${desglose.subtotalSinIva.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.resumenPreciosRow}>
                  <Text style={styles.resumenPreciosLabel}>📋 IVA (19%)</Text>
                  <Text style={styles.resumenPreciosValue}>
                    ${desglose.iva.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.desgloseDivider} />

                <View style={styles.resumenPreciosTotalRow}>
                  <Text style={styles.resumenPreciosTotalLabel}>Total a pagar</Text>
                  <Text style={styles.resumenPreciosTotalValue}>
                    ${desglose.total.toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Nota de repuestos incluidos */}
              {oferta.incluye_repuestos && (
                <View style={styles.notaRepuestos}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success?.[500] || '#10B981'} />
                  <Text style={styles.notaRepuestosText}>Esta oferta incluye repuestos</Text>
                </View>
              )}
            </View>

            {/* Información de pago parcial (si aplica) */}
            {/* IMPORTANTE: Detectar pago parcial incluso si el estado es 'pagada' (para ofertas pagadas antes del cambio) */}
            {(() => {
              const tienePagoParcial = oferta.estado === 'pagada_parcialmente' ||
                (oferta.estado_pago_repuestos === 'pagado' && oferta.estado_pago_servicio === 'pendiente');
              return tienePagoParcial;
            })() && (
                <View style={styles.pagoParcialContainer}>
                  <View style={styles.pagoParcialHeader}>
                    <Ionicons name="information-circle" size={20} color={colors.warning?.[600] || '#F59E0B'} />
                    <Text style={styles.pagoParcialTitulo}>Pago Parcial Realizado</Text>
                  </View>

                  {/* Monto pagado */}
                  <View style={styles.pagoParcialInfo}>
                    <View style={styles.pagoParcialRow}>
                      <Text style={styles.pagoParcialLabel}>✅ Pagado:</Text>
                      <Text style={styles.pagoParcialValue}>
                        ${(() => {
                          // Calcular monto pagado: repuestos + gestión de compra (con IVA en gestión)
                          const costoRepuestos = parseFloat(oferta.costo_repuestos || 0);
                          const costoGestion = parseFloat(oferta.costo_gestion_compra || 0);
                          const gestionConIva = Math.round(costoGestion * 1.19);
                          const montoPagado = Math.round(costoRepuestos + gestionConIva);
                          return montoPagado.toLocaleString('es-CL');
                        })()}
                      </Text>
                    </View>
                    <View style={styles.pagoParcialDetalle}>
                      <Text style={styles.pagoParcialDetalleText}>
                        • Repuestos: ${Math.round(parseFloat(oferta.costo_repuestos || 0)).toLocaleString('es-CL')}
                      </Text>
                      {parseFloat(oferta.costo_gestion_compra || 0) > 0 && (
                        <Text style={styles.pagoParcialDetalleText}>
                          • Gestión de compra: ${Math.round(parseFloat(oferta.costo_gestion_compra || 0) * 1.19).toLocaleString('es-CL')}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Saldo pendiente */}
                  <View style={styles.pagoParcialInfo}>
                    <View style={styles.pagoParcialRow}>
                      <Text style={styles.pagoParcialLabelPendiente}>⏳ Saldo pendiente:</Text>
                      <Text style={styles.pagoParcialValuePendiente}>
                        ${(() => {
                          // Calcular saldo pendiente: mano de obra con IVA
                          const costoManoObra = parseFloat(oferta.costo_mano_obra || 0);
                          const saldoPendiente = Math.round(costoManoObra * 1.19);
                          return saldoPendiente.toLocaleString('es-CL');
                        })()}
                      </Text>
                    </View>
                    <Text style={styles.pagoParcialDetalleText}>
                      • Mano de obra (se pagará al finalizar el servicio)
                    </Text>
                  </View>
                </View>
              )}

            {/* Descripción */}
            {oferta.descripcion_oferta && (
              <View style={styles.descripcionContainer}>
                <Text style={styles.descripcion}>{oferta.descripcion_oferta}</Text>
              </View>
            )}
          </View>

          {/* Enlace al chat - Ocupa todo el ancho inferior */}
          {onChatPress && (
            <TouchableOpacity
              style={styles.chatLink}
              onPress={onChatPress}
              activeOpacity={0.7}
            >
              <View style={styles.chatLinkBackground} />
              <Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} style={styles.chatIcon} />
              <Text style={styles.chatLinkText}>Abrir chat</Text>
              {oferta.mensajes_no_leidos > 0 && (
                <View style={styles.mensajesBadge}>
                  <Text style={styles.mensajesBadgeText}>{oferta.mensajes_no_leidos}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Botones de acción para ofertas secundarias */}
          {esOfertaSecundaria && (onAceptarPress || onRechazarPress) && (
            <View style={styles.accionesContainer}>
              {onAceptarPress && (
                <TouchableOpacity
                  style={[styles.aceptarButton, styles.accionButton]}
                  onPress={onAceptarPress}
                  activeOpacity={0.8}
                >
                  <Text style={styles.aceptarButtonText}>Aceptar oferta</Text>
                </TouchableOpacity>
              )}
              {onRechazarPress && (
                <TouchableOpacity
                  style={[styles.rechazarButton, styles.accionButton]}
                  onPress={onRechazarPress}
                  activeOpacity={0.8}
                >
                  <Text style={styles.rechazarButtonText}>Rechazar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Botón aceptar para ofertas originales */}
          {!esOfertaSecundaria && onAceptarPress && (
            <TouchableOpacity
              style={styles.aceptarButton}
              onPress={onAceptarPress}
              activeOpacity={0.8}
            >
              <Text style={styles.aceptarButtonText}>Aceptar oferta</Text>
            </TouchableOpacity>
          )}

          {/* Botón pagar saldo pendiente para ofertas con pago parcial */}
          {/* IMPORTANTE: Detectar pago parcial incluso si el estado es 'pagada' (para ofertas pagadas antes del cambio) */}
          {!esOfertaSecundaria && onPagarPress && (() => {
            const tienePagoParcial = oferta.estado === 'pagada_parcialmente' ||
              (oferta.estado_pago_repuestos === 'pagado' && oferta.estado_pago_servicio === 'pendiente');
            return tienePagoParcial;
          })() && (
              <TouchableOpacity
                style={styles.pagarSaldoButton}
                onPress={onPagarPress}
                activeOpacity={0.8}
              >
                <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                <Text style={styles.pagarSaldoButtonText}>
                  Pagar Saldo Pendiente (${(() => {
                    const costoManoObra = parseFloat(oferta.costo_mano_obra || 0);
                    const saldoPendiente = Math.round(costoManoObra * 1.19);
                    return saldoPendiente.toLocaleString('es-CL');
                  })()})
                </Text>
              </TouchableOpacity>
            )}

          {/* Botón pagar para ofertas secundarias aceptadas o pendientes de pago
          Aparece en 'aceptada' o 'pendiente_pago' (permite reintentar el pago si es necesario)
          NO debe aparecer en estados finales (pagada, en_ejecucion, completada) */}
          {esOfertaSecundaria && onPagarPress &&
            ['aceptada', 'pendiente_pago'].includes(oferta.estado) &&
            !['pagada', 'en_ejecucion', 'completada'].includes(oferta.estado) && (
              <TouchableOpacity
                style={styles.pagarButton}
                onPress={onPagarPress}
                activeOpacity={0.8}
              >
                <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                <Text style={styles.pagarButtonText}>
                  {oferta.estado === 'pendiente_pago' ? 'Reintentar Pago' : 'Pagar Servicio Adicional'}
                </Text>
              </TouchableOpacity>
            )}
        </>
      )}
    </View>
  );
};

// Función para crear estilos dinámicos basados en el tema
const createStyles = (colors, typography, spacing, borders) => StyleSheet.create({
  card: {
    backgroundColor: colors.background?.paper || COLORS.white,
    marginHorizontal: 0, // Se maneja con paddingLeft/paddingRight del ScrollView padre
    marginVertical: spacing.sm || SPACING.sm,
    marginBottom: spacing.md || SPACING.md,
    padding: spacing.md || SPACING.md,
    borderRadius: borders.radius?.card?.md || BORDERS.radius.md,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB'
  },
  cardColapsada: {
    paddingBottom: spacing.sm || SPACING.sm
  },
  cardDestacada: {
    // Sin borde de color - Mantener solo el borde estándar de la card
    // El destacado se puede indicar con otros elementos visuales si es necesario
  },
  // ==================== ESTILOS HEADER COLAPSABLE ====================
  headerColapsable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs || SPACING.xs,
    marginBottom: spacing.sm || SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral?.gray?.[100] || '#F3F4F6',
    paddingBottom: spacing.sm || SPACING.sm
  },
  headerFotoContainer: {
    marginRight: spacing.sm || SPACING.sm
  },
  headerFoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.borderLight
  },
  headerFotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral?.gray?.[100] || COLORS.background,
    borderWidth: 1,
    borderColor: colors.neutral?.gray?.[200] || COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerInfoResumida: {
    flex: 1,
    marginRight: spacing.sm || SPACING.sm
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  headerNombreProveedor: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || COLORS.text,
    flex: 1
  },
  headerServicio: {
    fontSize: typography.fontSize?.sm || 12,
    color: colors.text?.secondary || COLORS.textLight,
    marginTop: 2
  },
  headerPrecioContainer: {
    alignItems: 'flex-end',
    gap: 2
  },
  headerPrecio: {
    fontSize: typography.fontSize?.lg || 16,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.primary?.[600] || COLORS.primary
  },
  servicioAdicionalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.sm,
    marginBottom: SPACING.sm,
    gap: 4,
    alignSelf: 'flex-start'
  },
  servicioAdicionalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  // Header para TODAS las ofertas (principales y secundarias)
  ofertaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md || SPACING.md,
    gap: spacing.sm || SPACING.sm,
  },
  ofertaTitle: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || COLORS.text,
    flex: 1,
    lineHeight: typography.fontSize?.xl ? typography.fontSize.xl * 1.3 : 26,
  },
  // Mantener compatibilidad con código existente
  ofertaSecundariaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md || SPACING.md,
    gap: spacing.sm || SPACING.sm,
  },
  ofertaSecundariaTitle: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || COLORS.text,
    flex: 1,
    lineHeight: typography.fontSize?.xl ? typography.fontSize.xl * 1.3 : 26,
  },
  motivoContainer: {
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: BORDERS.radius.sm,
    marginBottom: SPACING.sm,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.borderLight
  },
  motivoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4
  },
  motivoText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18
  },
  ofertaOriginalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.xs
  },
  ofertaOriginalLinkText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic'
  },
  countdownContainer: {
    marginBottom: spacing.md || SPACING.md,
    marginTop: spacing.xs || SPACING.xs,
  },
  proveedorHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
    alignItems: 'flex-start'
  },
  proveedorFotoContainer: {
    marginRight: 0
  },
  proveedorFoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.borderLight
  },
  proveedorFotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center'
  },
  proveedorInfoContainer: {
    flex: 1,
    paddingLeft: 0
  },
  proveedorTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4
  },
  proveedorInfoLeft: {
    flex: 1,
    marginRight: SPACING.xs,
    paddingRight: SPACING.xs
  },
  proveedorNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2
  },
  proveedorTipo: {
    fontSize: 12,
    color: COLORS.textLight
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 1
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text
  },
  badgeContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
    paddingRight: 0
  },
  tipoBadgeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4
  },
  tipoBadgeText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500'
  },
  ofertaInfo: {
    marginBottom: SPACING.md,
    marginTop: SPACING.xs
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 75,
    flexShrink: 0
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500'
  },
  infoText: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
    lineHeight: 18
  },
  repuestosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs / 2,
    paddingVertical: 2
  },
  repuestosText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500'
  },
  serviciosContainer: {
    marginTop: spacing.xs || SPACING.xs,
    paddingTop: spacing.xs || SPACING.xs,
    borderTopWidth: borders.width?.thin || 1,
    borderTopColor: colors.neutral?.gray?.[200] || COLORS.borderLight
  },
  serviciosTitle: {
    fontSize: typography.fontSize?.sm || 13,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || COLORS.text,
    marginBottom: (spacing.xs || SPACING.xs) / 2
  },
  servicioItemContainer: {
    marginBottom: SPACING.sm
  },
  // Badge destacado para servicios - Similar a repuestos badge
  servicioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs || 6,
    paddingHorizontal: spacing.sm || SPACING.sm,
    paddingVertical: spacing.xs || SPACING.xs,
    backgroundColor: colors.neutral?.gray?.[100] || COLORS.background,
    borderRadius: borders.radius?.badge?.md || BORDERS.radius.sm,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || COLORS.borderLight,
    marginBottom: (spacing.xs || SPACING.xs) / 2,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  servicioBadgePrincipal: {
    backgroundColor: colors.primary?.[50] || '#E6F2F7',
    borderColor: colors.primary?.[500] || COLORS.primary,
    borderWidth: borders.width?.medium || 1.5,
    shadowColor: colors.primary?.[500] || COLORS.primary,
    shadowOpacity: 0.1,
  },
  servicioBadgeText: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.primary || COLORS.text,
    fontWeight: typography.fontWeight?.medium || '500',
    flex: 1,
  },
  servicioBadgeTextPrincipal: {
    color: colors.primary?.[700] || COLORS.primary,
    fontWeight: typography.fontWeight?.bold || '700',
  },
  servicioPrecio: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || COLORS.textLight,
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  servicioPrecioPrincipal: {
    color: colors.primary?.[700] || COLORS.primary,
    fontWeight: typography.fontWeight?.bold || '700',
  },
  // Mantener compatibilidad
  servicioItem: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 2
  },
  repuestosFallback: {
    marginTop: SPACING.xs / 2,
    padding: SPACING.xs / 2,
    backgroundColor: '#FFF3CD',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFC107'
  },
  repuestosFallbackText: {
    fontSize: 11,
    color: '#856404',
    fontStyle: 'italic'
  },
  // ==================== ESTILOS DESGLOSE DETALLADO DE PRECIOS ====================
  desgloseDetalladoContainer: {
    marginTop: spacing.md || SPACING.md,
    paddingTop: spacing.md || SPACING.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral?.gray?.[200] || COLORS.borderLight,
    backgroundColor: colors.neutral?.gray?.[50] || '#FAFBFC',
    marginHorizontal: -(spacing.md || SPACING.md),
    paddingHorizontal: spacing.md || SPACING.md,
    paddingBottom: spacing.md || SPACING.md,
    borderBottomLeftRadius: borders.radius?.card?.md || BORDERS.radius.md,
    borderBottomRightRadius: borders.radius?.card?.md || BORDERS.radius.md
  },
  desgloseTituloDetallado: {
    fontSize: typography.fontSize?.sm || 13,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || COLORS.text,
    marginBottom: spacing.sm || SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  serviciosDesglose: {
    marginBottom: spacing.sm || SPACING.sm
  },
  // Estilos para desglose del proveedor
  desgloseProveedorContainer: {
    marginBottom: spacing.sm || SPACING.sm
  },
  desgloseProveedorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs || SPACING.xs,
    paddingHorizontal: spacing.sm || SPACING.sm,
    backgroundColor: colors.background?.paper || COLORS.white,
    borderRadius: borders.radius?.sm || BORDERS.radius.sm,
    borderWidth: 1,
    borderColor: colors.neutral?.gray?.[200] || COLORS.borderLight,
    marginBottom: spacing.xs || SPACING.xs
  },
  desgloseProveedorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  desgloseProveedorLabel: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.primary || COLORS.text,
    fontWeight: typography.fontWeight?.medium || '500'
  },
  desgloseProveedorRight: {
    alignItems: 'flex-end'
  },
  desgloseProveedorValue: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || COLORS.text
  },
  desgloseProveedorSubValue: {
    fontSize: typography.fontSize?.xs || 10,
    color: colors.text?.tertiary || COLORS.textLight,
    marginTop: 2
  },
  repuestosSection: {
    marginTop: spacing.xs || SPACING.xs
  },
  servicioDesgloseItem: {
    marginBottom: spacing.sm || SPACING.sm
  },
  servicioDesgloseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs || SPACING.xs,
    paddingHorizontal: spacing.sm || SPACING.sm,
    backgroundColor: colors.background?.paper || COLORS.white,
    borderRadius: borders.radius?.sm || BORDERS.radius.sm,
    borderWidth: 1,
    borderColor: colors.neutral?.gray?.[200] || COLORS.borderLight
  },
  servicioDesglosePrincipal: {
    borderColor: colors.primary?.[300] || COLORS.primary,
    borderWidth: 1.5,
    backgroundColor: colors.primary?.[50] || '#E6F7FF'
  },
  servicioDesgloseLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
    marginRight: spacing.sm || SPACING.sm
  },
  servicioDesgloseNombre: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.primary || COLORS.text,
    fontWeight: typography.fontWeight?.medium || '500',
    flex: 1,
    lineHeight: 18
  },
  servicioDesgloseNombrePrincipal: {
    color: colors.primary?.[700] || COLORS.primary,
    fontWeight: typography.fontWeight?.bold || '700'
  },
  servicioDesglosePrecioContainer: {
    alignItems: 'flex-end'
  },
  servicioDesglosePrecio: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || COLORS.text
  },
  servicioDesglosePrecioPrincipal: {
    color: colors.primary?.[700] || COLORS.primary
  },
  servicioDesglosePrecioSinIva: {
    fontSize: typography.fontSize?.xs || 10,
    color: colors.text?.tertiary || COLORS.textLight,
    marginTop: 2
  },
  desgloseAdicional: {
    marginTop: spacing.xs || SPACING.xs
  },
  desgloseAdicionalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  },
  desgloseAdicionalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  desgloseAdicionalLabel: {
    fontSize: typography.fontSize?.sm || 12,
    color: colors.text?.secondary || COLORS.textLight
  },
  desgloseAdicionalValue: {
    fontSize: typography.fontSize?.sm || 12,
    fontWeight: typography.fontWeight?.medium || '500',
    color: colors.text?.primary || COLORS.text
  },
  desgloseDividerFull: {
    height: 1,
    backgroundColor: colors.neutral?.gray?.[200] || COLORS.borderLight,
    marginVertical: spacing.sm || SPACING.sm
  },
  desgloseDivider: {
    height: 1,
    backgroundColor: colors.neutral?.gray?.[300] || COLORS.borderLight,
    marginVertical: spacing.xs || SPACING.xs
  },
  resumenPreciosContainer: {
    paddingTop: spacing.xs || SPACING.xs
  },
  resumenPreciosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3
  },
  resumenPreciosLabel: {
    fontSize: typography.fontSize?.sm || 12,
    color: colors.text?.secondary || COLORS.textLight
  },
  resumenPreciosValue: {
    fontSize: typography.fontSize?.sm || 12,
    color: colors.text?.primary || COLORS.text,
    fontWeight: typography.fontWeight?.medium || '500'
  },
  resumenPreciosTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs || SPACING.xs,
    backgroundColor: colors.primary?.[50] || '#E6F7FF',
    marginHorizontal: -(spacing.md || SPACING.md),
    paddingHorizontal: spacing.md || SPACING.md,
    marginTop: spacing.xs || SPACING.xs,
    borderRadius: borders.radius?.sm || BORDERS.radius.sm
  },
  resumenPreciosTotalLabel: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || COLORS.text
  },
  resumenPreciosTotalValue: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.primary?.[600] || COLORS.primary
  },
  notaRepuestos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm || SPACING.sm,
    paddingVertical: spacing.xs || SPACING.xs,
    paddingHorizontal: spacing.sm || SPACING.sm,
    backgroundColor: colors.success?.[50] || '#ECFDF5',
    borderRadius: borders.radius?.sm || BORDERS.radius.sm
  },
  notaRepuestosText: {
    fontSize: typography.fontSize?.xs || 11,
    color: colors.success?.[700] || '#047857',
    fontWeight: typography.fontWeight?.medium || '500'
  },
  descripcionContainer: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  descripcion: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18
  },
  // Desglose de costos
  desgloseContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    backgroundColor: colors.neutral?.gray?.[50] || '#F9FAFB',
    borderRadius: borders.radius?.md || BORDERS.radius.sm,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || COLORS.borderLight,
  },
  desgloseTitulo: {
    fontSize: typography.fontSize?.sm || 12,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.secondary || COLORS.textLight,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  desgloseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  desgloseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  desgloseLabel: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || COLORS.textLight,
  },
  desgloseValue: {
    fontSize: typography.fontSize?.sm || 13,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || COLORS.text,
  },
  desgloseInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  desgloseInfoText: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || COLORS.textLight,
    fontStyle: 'italic',
    flex: 1,
  },
  precioContainer: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline'
  },
  precioLabel: {
    fontSize: 13,
    color: COLORS.textLight
  },
  precio: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text
  },
  chatLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: SPACING.sm,
    borderRadius: BORDERS.radius.sm,
    overflow: 'hidden',
    position: 'relative'
  },
  chatLinkBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#61CDFF',
    opacity: 0.12
  },
  chatIcon: {
    zIndex: 1
  },
  chatLinkText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    zIndex: 1
  },
  mensajesBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6
  },
  mensajesBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700'
  },
  aceptarButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDERS.radius.md,
    alignItems: 'center',
    marginTop: SPACING.sm
  },
  aceptarButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600'
  },
  pagarButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDERS.radius.md,
    marginTop: SPACING.sm,
    gap: SPACING.xs
  },
  pagarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  accionesContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm
  },
  accionButton: {
    flex: 1,
    marginTop: 0
  },
  rechazarButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    paddingVertical: SPACING.md,
    borderRadius: BORDERS.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0
  },
  rechazarButtonText: {
    color: colors.error?.[500] || COLORS.danger,
    fontSize: typography.fontSize?.sm || 14,
    fontWeight: typography.fontWeight?.semibold || '600'
  },
  // Estilos para información de pago parcial
  pagoParcialContainer: {
    marginTop: spacing.md || SPACING.md,
    padding: spacing.md || SPACING.md,
    backgroundColor: colors.warning?.[50] || '#FFFBEB',
    borderRadius: borders.radius?.md || BORDERS.radius.md,
    borderWidth: 1,
    borderColor: colors.warning?.[200] || '#FDE68A',
    marginHorizontal: -(spacing.md || SPACING.md),
    marginBottom: spacing.sm || SPACING.sm
  },
  pagoParcialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs || SPACING.xs,
    marginBottom: spacing.sm || SPACING.sm
  },
  pagoParcialTitulo: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.warning?.[700] || '#B45309'
  },
  pagoParcialInfo: {
    marginBottom: spacing.sm || SPACING.sm,
    paddingLeft: spacing.xs || SPACING.xs
  },
  pagoParcialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs || SPACING.xs
  },
  pagoParcialLabel: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || COLORS.textLight,
    fontWeight: typography.fontWeight?.medium || '500'
  },
  pagoParcialValue: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.success?.[700] || '#047857'
  },
  pagoParcialLabelPendiente: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || COLORS.textLight,
    fontWeight: typography.fontWeight?.medium || '500'
  },
  pagoParcialValuePendiente: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.warning?.[700] || '#B45309'
  },
  pagoParcialDetalle: {
    marginTop: spacing.xs || SPACING.xs / 2,
    paddingLeft: spacing.sm || SPACING.sm
  },
  pagoParcialDetalleText: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || COLORS.textLight,
    marginBottom: 2
  },
  pagarSaldoButton: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDERS.radius.md,
    marginTop: SPACING.sm,
    gap: SPACING.xs
  },
  pagarSaldoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  }
});

export default OfertaCard;
