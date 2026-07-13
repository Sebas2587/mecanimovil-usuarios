import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { SPACING, BORDERS, ROUTES } from '../../utils/constants';
import { COLORS as DS_COLORS, withOpacity } from '../../design-system/tokens/colors';
import { getMediaURL } from '../../services/api';
import RepuestosExpandible from './RepuestosExpandible';
import EstadoSolicitudBadge from '../solicitudes/EstadoSolicitudBadge';
import { useTheme } from '../../design-system/theme/useTheme';
import CountdownTimer from '../common/CountdownTimer';
import { calcularDesgloseIvaOferta, resolverDesgloseIvaMostrado } from '../../utils/ofertaPrecioDesglose';
import { calcularMontosPagoOferta, formatearMontoCLP } from '../../utils/calcularMontoPagoOferta';
import Icon from '../base/Icon/Icon';

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Card para mostrar una oferta de proveedor - Diseño tipo Airbnb
 */
const OfertaCard = ({
  oferta,
  solicitud = null, // Opcional: para mostrar "fecha que solicitaste" vs "fecha propuesta"
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
        <Icon key={i} name="star" size={12} color={DS_COLORS.text.primary} />
      );
    }
    if (hasHalfStar) {
      stars.push(
        <Icon key="half" name="star-half" size={12} color={DS_COLORS.text.primary} />
      );
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Icon key={`empty-${i}`} name="star-outline" size={12} color={DS_COLORS.text.secondary} />
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

    // Incluir gestión de compra: si solo faltaba en la condición, no se mostraban IVA/subtotal/total coherentes con repuestos.
    const tieneDesglose =
      costoRepuestos > 0 || costoManoObra > 0 || costoGestionCompra > 0;

    const desgloseIva = calcularDesgloseIvaOferta({
      costoManoObra: oferta.costo_mano_obra,
      costoRepuestos: oferta.costo_repuestos,
      costoGestionCompra: oferta.costo_gestion_compra,
      precioTotalOfrecido: oferta.precio_total_ofrecido,
    });
    const merged = resolverDesgloseIvaMostrado(oferta.desglose_iva, desgloseIva);
    const subtotalSinIva = merged.subSinIva;
    const iva = merged.iva;

    const servicios = detalles.map(d => ({
      nombre: d.servicio_nombre || d.servicio?.nombre || d.nombre || 'Servicio',
      precio: parseFloat(d.precio_servicio || 0),
      repuestos_info: d.repuestos_info || [],
    }));
    if (
      servicios.length === 0
      && Array.isArray(oferta.repuestos_info)
      && oferta.repuestos_info.length > 0
    ) {
      servicios.push({
        nombre: oferta.servicio_nombre || 'Servicio',
        precio: parseFloat(oferta.precio_total_ofrecido || 0),
        repuestos_info: oferta.repuestos_info,
      });
    }
    if (servicios.length === 0 && Array.isArray(oferta.servicios_ofrecidos)) {
      oferta.servicios_ofrecidos.forEach((s) => {
        if (s.repuestos_info?.length) {
          servicios.push({
            nombre: s.nombre || 'Servicio',
            precio: parseFloat(s.precio || 0),
            repuestos_info: s.repuestos_info,
          });
        }
      });
    }

    return {
      servicios,
      // Valores directos del proveedor (sin IVA)
      costoManoObra,
      costoRepuestos,
      costoGestionCompra,
      // Totales (subtotal + IVA cuadran con precio_total_ofrecido; ver ofertaPrecioDesglose)
      subtotalSinIva: merged.subSinIva,
      iva: merged.iva,
      total: merged.subSinIva + merged.iva,
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
          <Icon name="add-circle" size={14} color={DS_COLORS.text.onPrimary} />
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
              <Icon
                name={oferta.tipo_proveedor === 'taller' ? 'business' : 'person'}
                size={16}
                color={DS_COLORS.text.secondary}
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
            ${formatearMontoCLP(oferta.precio_total_ofrecido || 0)}
          </Text>
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <Icon name="chevron-up" size={20} color={DS_COLORS.text.secondary} />
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
              <Icon name="link-outline" size={14} color={DS_COLORS.text.secondary} />
              <Text style={styles.ofertaOriginalLinkText}>
                Relacionada con oferta original de ${formatearMontoCLP(oferta.oferta_original_info.precio_total_ofrecido || 0)}
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
                  <Icon
                    name={oferta.tipo_proveedor === 'taller' ? 'business' : 'person'}
                    size={20}
                    color={DS_COLORS.text.secondary}
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
                  <Icon name="chevron-forward" size={12} color={DS_COLORS.primary[500]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Información de la oferta */}
          <View style={styles.ofertaInfo}>
            {/* Fecha y hora */}
            {(() => {
              const esFechaAlternativa = oferta?.es_fecha_alternativa === true;
              const fechaSolicitada = solicitud?.fecha_preferida;
              const horaSolicitada = solicitud?.hora_preferida;
              const fechaOferta = oferta?.fecha_disponible;
              const horaOferta = oferta?.hora_disponible;
              const motivoAlt = (oferta?.motivo_fecha_alternativa || '').trim();
              const mostrarBloqueAlternativa = esFechaAlternativa ||
                (solicitud && fechaSolicitada && fechaOferta && (
                  (fechaSolicitada !== fechaOferta) ||
                  (horaSolicitada && horaOferta && horaSolicitada.substring(0, 5) !== horaOferta.substring(0, 5))
                ));

              if (mostrarBloqueAlternativa && solicitud) {
                return (
                  <View style={styles.infoRow}>
                    <View style={styles.infoLabelContainer}>
                      <Icon name="calendar-outline" size={14} color={DS_COLORS.text.secondary} />
                      <Text style={styles.infoLabel}>Fecha:</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoText}>
                        Fecha que solicitaste: {fechaSolicitada ? formatDate(fechaSolicitada) : 'No especificada'}
                        {horaSolicitada ? ` ${formatTime(horaSolicitada)}` : ''}
                      </Text>
                      <Text style={[styles.infoText, { marginTop: 4 }]}>
                        El proveedor propone: {fechaOferta ? formatDate(fechaOferta) : 'No especificada'}
                        {horaOferta ? ` ${formatTime(horaOferta)}` : ''}
                      </Text>
                      {motivoAlt ? (
                        <Text style={[styles.infoText, { marginTop: 4, fontStyle: 'italic' }]}>
                          Motivo: {motivoAlt}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              }
              return (
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelContainer}>
                    <Icon name="calendar-outline" size={14} color={DS_COLORS.text.secondary} />
                    <Text style={styles.infoLabel}>Fecha:</Text>
                  </View>
                  <Text style={styles.infoText}>
                    {oferta?.fecha_disponible ? formatDate(oferta.fecha_disponible) : 'No especificada'}
                    {oferta?.hora_disponible ? ` a las ${formatTime(oferta.hora_disponible)}` : ''}
                  </Text>
                </View>
              );
            })()}

            {/* Tiempo estimado */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Icon name="time-outline" size={14} color={DS_COLORS.text.secondary} />
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
                  <Icon name="shield-checkmark-outline" size={14} color={DS_COLORS.text.secondary} />
                  <Text style={styles.infoLabel}>Garantía:</Text>
                </View>
                <Text style={styles.infoText}>{oferta.garantia_ofrecida}</Text>
              </View>
            )}

            {/* Incluye repuestos badge */}
            {oferta.incluye_repuestos && (
              <View style={styles.repuestosBadge}>
                <Icon name="checkmark-circle" size={14} color={DS_COLORS.text.primary} />
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
                          <Icon name="construct-outline" size={16} color={colors?.primary?.[500] ?? DS_COLORS.primary[500]} />
                          <Text style={styles.desgloseProveedorLabel}>🔧 Mano de obra (sin IVA)</Text>
                        </View>
                        <Text style={styles.desgloseProveedorValue}>
                          ${formatearMontoCLP(desglose.costoManoObra)}
                        </Text>
                      </View>
                    )}

                    {/* Repuestos */}
                    {desglose.costoRepuestos > 0 && (
                      <View style={styles.desgloseProveedorRow}>
                        <View style={styles.desgloseProveedorLeft}>
                          <Icon name="cog-outline" size={16} color={DS_COLORS.text.secondary} />
                          <Text style={styles.desgloseProveedorLabel}>📦 Repuestos (sin IVA)</Text>
                        </View>
                        <Text style={styles.desgloseProveedorValue}>
                          ${formatearMontoCLP(desglose.costoRepuestos)}
                        </Text>
                      </View>
                    )}

                    {/* Gestión de compra (visible si la oferta incluye repuestos o hay monto) */}
                    {(oferta.incluye_repuestos || desglose.costoGestionCompra > 0) && (
                      <View style={styles.desgloseProveedorRow}>
                        <View style={styles.desgloseProveedorLeft}>
                          <Icon name="car-outline" size={16} color={DS_COLORS.warning.main} />
                          <Text style={[styles.desgloseProveedorLabel, { color: DS_COLORS.warning.main }]}>🚚 Gestión de compra (sin IVA)</Text>
                        </View>
                        <Text style={[styles.desgloseProveedorValue, { color: DS_COLORS.warning.main }]}>
                          ${formatearMontoCLP(desglose.costoGestionCompra)}
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
                              <Icon
                                name="construct-outline"
                                size={16}
                                color={esServicioPrincipal ? (colors?.primary?.[500] ?? DS_COLORS.primary[500]) : DS_COLORS.text.secondary}
                              />
                              <Text style={[styles.servicioDesgloseNombre, esServicioPrincipal && styles.servicioDesgloseNombrePrincipal]} numberOfLines={2}>
                                {servicio.nombre}
                              </Text>
                            </View>
                            <View style={styles.servicioDesglosePrecioContainer}>
                              <Text style={[styles.servicioDesglosePrecio, esServicioPrincipal && styles.servicioDesglosePrecioPrincipal]}>
                                ${formatearMontoCLP(servicio.precio)}
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
                    ${formatearMontoCLP(desglose.subtotalSinIva)}
                  </Text>
                </View>

                <View style={styles.resumenPreciosRow}>
                  <Text style={styles.resumenPreciosLabel}>📋 IVA (19%)</Text>
                  <Text style={styles.resumenPreciosValue}>
                    ${formatearMontoCLP(desglose.iva)}
                  </Text>
                </View>

                <View style={styles.desgloseDivider} />

                <View style={styles.resumenPreciosTotalRow}>
                  <Text style={styles.resumenPreciosTotalLabel}>Total a pagar</Text>
                  <Text style={styles.resumenPreciosTotalValue}>
                    ${formatearMontoCLP(desglose.subtotalSinIva + desglose.iva)}
                  </Text>
                </View>
              </View>

              {/* Nota de repuestos incluidos */}
              {oferta.incluye_repuestos && (
                <View style={styles.notaRepuestos}>
                  <Icon name="checkmark-circle" size={14} color={colors.success?.[500] || DS_COLORS.success.main} />
                  <Text style={styles.notaRepuestosText}>Esta oferta incluye repuestos</Text>
                </View>
              )}
            </View>

            {/* Información de pago parcial (si aplica) */}
            {/* IMPORTANTE: Detectar pago parcial incluso si el estado es 'pagada' (para ofertas pagadas antes del cambio) */}
            {(() => {
              const tienePagoParcial = oferta.estado === 'pagada_parcialmente' ||
                (oferta.estado_pago_repuestos === 'pagado' && oferta.estado_pago_servicio === 'pendiente');
              if (!tienePagoParcial) return null;

              const montosPago = calcularMontosPagoOferta(oferta);
              const costoRepuestos = parseFloat(oferta.costo_repuestos || 0);
              const costoGestion = parseFloat(oferta.costo_gestion_compra || 0);

              return (
                <View style={styles.pagoParcialContainer}>
                  <View style={styles.pagoParcialHeader}>
                    <Icon name="information-circle" size={20} color={colors.warning?.[600] || DS_COLORS.warning[600]} />
                    <Text style={styles.pagoParcialTitulo}>Pago Parcial Realizado</Text>
                  </View>

                  <View style={styles.pagoParcialInfo}>
                    <View style={styles.pagoParcialRow}>
                      <Text style={styles.pagoParcialLabel}>✅ Pagado:</Text>
                      <Text style={styles.pagoParcialValue}>
                        ${formatearMontoCLP(montosPago.repuestos)}
                      </Text>
                    </View>
                    <View style={styles.pagoParcialDetalle}>
                      <Text style={styles.pagoParcialDetalleText}>
                        • Repuestos: ${formatearMontoCLP(costoRepuestos)}
                      </Text>
                      {costoGestion > 0 && (
                        <Text style={styles.pagoParcialDetalleText}>
                          • Gestión de compra: ${formatearMontoCLP(costoGestion * 1.19)}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.pagoParcialInfo}>
                    <View style={styles.pagoParcialRow}>
                      <Text style={styles.pagoParcialLabelPendiente}>⏳ Saldo pendiente:</Text>
                      <Text style={styles.pagoParcialValuePendiente}>
                        ${formatearMontoCLP(montosPago.servicio)}
                      </Text>
                    </View>
                    <Text style={styles.pagoParcialDetalleText}>
                      • Mano de obra (se pagará al finalizar el servicio)
                    </Text>
                  </View>
                </View>
              );
            })()}

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
              <Icon name="chatbubble-outline" size={16} color={DS_COLORS.primary[500]} style={styles.chatIcon} />
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
                <Icon name="card-outline" size={18} color={DS_COLORS.text.onPrimary} />
                <Text style={styles.pagarSaldoButtonText}>
                  Pagar Saldo Pendiente (${formatearMontoCLP(calcularMontosPagoOferta(oferta).servicio)})
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
                <Icon name="card-outline" size={18} color={DS_COLORS.text.onPrimary} />
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
    backgroundColor: colors.background?.paper || DS_COLORS.base.white,
    marginHorizontal: 0, // Se maneja con paddingLeft/paddingRight del ScrollView padre
    marginVertical: spacing.sm || SPACING.sm,
    marginBottom: spacing.md || SPACING.md,
    padding: spacing.md || SPACING.md,
    borderRadius: borders.radius?.card?.md || BORDERS.radius.md,
    shadowColor: colors.base?.inkBlack || DS_COLORS.base.inkBlack,
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || DS_COLORS.neutral.gray[200]
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
    borderBottomColor: colors.neutral?.gray?.[100] || DS_COLORS.neutral.gray[100],
    paddingBottom: spacing.sm || SPACING.sm
  },
  headerFotoContainer: {
    marginRight: spacing.sm || SPACING.sm
  },
  headerFoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS_COLORS.border.light
  },
  headerFotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral?.gray?.[100] || DS_COLORS.background.default,
    borderWidth: 1,
    borderColor: colors.neutral?.gray?.[200] || DS_COLORS.border.light,
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
    color: colors.text?.primary || DS_COLORS.text.primary,
    flex: 1
  },
  headerServicio: {
    fontSize: typography.fontSize?.sm || 12,
    color: colors.text?.secondary || DS_COLORS.text.secondary,
    marginTop: 2
  },
  headerPrecioContainer: {
    alignItems: 'flex-end',
    gap: 2
  },
  headerPrecio: {
    fontSize: typography.fontSize?.lg || 16,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.primary?.[600] || DS_COLORS.primary[500]
  },
  servicioAdicionalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS_COLORS.warning.main,
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
    color: DS_COLORS.text.onPrimary,
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
    color: colors.text?.primary || DS_COLORS.text.primary,
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
    color: colors.text?.primary || DS_COLORS.text.primary,
    flex: 1,
    lineHeight: typography.fontSize?.xl ? typography.fontSize.xl * 1.3 : 26,
  },
  motivoContainer: {
    backgroundColor: DS_COLORS.background.default,
    padding: SPACING.sm,
    borderRadius: BORDERS.radius.sm,
    marginBottom: SPACING.sm,
    borderLeftWidth: 2,
    borderLeftColor: DS_COLORS.border.light
  },
  motivoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: DS_COLORS.text.secondary,
    marginBottom: 4
  },
  motivoText: {
    fontSize: 13,
    color: DS_COLORS.text.primary,
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
    color: DS_COLORS.text.secondary,
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
    backgroundColor: DS_COLORS.border.light
  },
  proveedorFotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: DS_COLORS.background.default,
    borderWidth: 1,
    borderColor: DS_COLORS.border.light,
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
    color: DS_COLORS.text.primary,
    marginBottom: 2
  },
  proveedorTipo: {
    fontSize: 12,
    color: DS_COLORS.text.secondary
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
    color: DS_COLORS.text.primary
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
    color: DS_COLORS.primary[500],
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
    color: DS_COLORS.text.secondary,
    fontWeight: '500'
  },
  infoText: {
    fontSize: 13,
    color: DS_COLORS.text.primary,
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
    color: DS_COLORS.text.primary,
    fontWeight: '500'
  },
  serviciosContainer: {
    marginTop: spacing.xs || SPACING.xs,
    paddingTop: spacing.xs || SPACING.xs,
    borderTopWidth: borders.width?.thin || 1,
    borderTopColor: colors.neutral?.gray?.[200] || DS_COLORS.border.light
  },
  serviciosTitle: {
    fontSize: typography.fontSize?.sm || 13,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || DS_COLORS.text.primary,
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
    backgroundColor: colors.neutral?.gray?.[100] || DS_COLORS.background.default,
    borderRadius: borders.radius?.badge?.md || BORDERS.radius.sm,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || DS_COLORS.border.light,
    marginBottom: (spacing.xs || SPACING.xs) / 2,
    shadowColor: colors.base?.inkBlack || DS_COLORS.base.inkBlack,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  servicioBadgePrincipal: {
    backgroundColor: colors.primary?.[50] || DS_COLORS.primary[50],
    borderColor: colors.primary?.[500] || DS_COLORS.primary[500],
    borderWidth: borders.width?.medium || 1.5,
    shadowColor: colors.primary?.[500] || DS_COLORS.primary[500],
    shadowOpacity: 0.1,
  },
  servicioBadgeText: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.primary || DS_COLORS.text.primary,
    fontWeight: typography.fontWeight?.medium || '500',
    flex: 1,
  },
  servicioBadgeTextPrincipal: {
    color: colors.primary?.[700] || DS_COLORS.primary[500],
    fontWeight: typography.fontWeight?.bold || '700',
  },
  servicioPrecio: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || DS_COLORS.text.secondary,
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  servicioPrecioPrincipal: {
    color: colors.primary?.[700] || DS_COLORS.primary[500],
    fontWeight: typography.fontWeight?.bold || '700',
  },
  // Mantener compatibilidad
  servicioItem: {
    fontSize: 12,
    color: DS_COLORS.text.secondary,
    marginBottom: 2
  },
  repuestosFallback: {
    marginTop: SPACING.xs / 2,
    padding: SPACING.xs / 2,
    backgroundColor: DS_COLORS.warning.light,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: DS_COLORS.warning[400]
  },
  repuestosFallbackText: {
    fontSize: 11,
    color: DS_COLORS.warning.dark,
    fontStyle: 'italic'
  },
  // ==================== ESTILOS DESGLOSE DETALLADO DE PRECIOS ====================
  desgloseDetalladoContainer: {
    marginTop: spacing.md || SPACING.md,
    paddingTop: spacing.md || SPACING.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral?.gray?.[200] || DS_COLORS.border.light,
    backgroundColor: colors.neutral?.gray?.[50] || DS_COLORS.neutral.gray[50],
    marginHorizontal: -(spacing.md || SPACING.md),
    paddingHorizontal: spacing.md || SPACING.md,
    paddingBottom: spacing.md || SPACING.md,
    borderBottomLeftRadius: borders.radius?.card?.md || BORDERS.radius.md,
    borderBottomRightRadius: borders.radius?.card?.md || BORDERS.radius.md
  },
  desgloseTituloDetallado: {
    fontSize: typography.fontSize?.sm || 13,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || DS_COLORS.text.primary,
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
    backgroundColor: colors.background?.paper || DS_COLORS.base.white,
    borderRadius: borders.radius?.sm || BORDERS.radius.sm,
    borderWidth: 1,
    borderColor: colors.neutral?.gray?.[200] || DS_COLORS.border.light,
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
    color: colors.text?.primary || DS_COLORS.text.primary,
    fontWeight: typography.fontWeight?.medium || '500'
  },
  desgloseProveedorRight: {
    alignItems: 'flex-end'
  },
  desgloseProveedorValue: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || DS_COLORS.text.primary
  },
  desgloseProveedorSubValue: {
    fontSize: typography.fontSize?.xs || 10,
    color: colors.text?.tertiary || DS_COLORS.text.secondary,
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
    backgroundColor: colors.background?.paper || DS_COLORS.base.white,
    borderRadius: borders.radius?.sm || BORDERS.radius.sm,
    borderWidth: 1,
    borderColor: colors.neutral?.gray?.[200] || DS_COLORS.border.light
  },
  servicioDesglosePrincipal: {
    borderColor: colors.primary?.[300] || DS_COLORS.primary[500],
    borderWidth: 1.5,
    backgroundColor: colors.primary?.[50] || DS_COLORS.primary[50]
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
    color: colors.text?.primary || DS_COLORS.text.primary,
    fontWeight: typography.fontWeight?.medium || '500',
    flex: 1,
    lineHeight: 18
  },
  servicioDesgloseNombrePrincipal: {
    color: colors.primary?.[700] || DS_COLORS.primary[500],
    fontWeight: typography.fontWeight?.bold || '700'
  },
  servicioDesglosePrecioContainer: {
    alignItems: 'flex-end'
  },
  servicioDesglosePrecio: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || DS_COLORS.text.primary
  },
  servicioDesglosePrecioPrincipal: {
    color: colors.primary?.[700] || DS_COLORS.primary[500]
  },
  servicioDesglosePrecioSinIva: {
    fontSize: typography.fontSize?.xs || 10,
    color: colors.text?.tertiary || DS_COLORS.text.secondary,
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
    color: colors.text?.secondary || DS_COLORS.text.secondary
  },
  desgloseAdicionalValue: {
    fontSize: typography.fontSize?.sm || 12,
    fontWeight: typography.fontWeight?.medium || '500',
    color: colors.text?.primary || DS_COLORS.text.primary
  },
  desgloseDividerFull: {
    height: 1,
    backgroundColor: colors.neutral?.gray?.[200] || DS_COLORS.border.light,
    marginVertical: spacing.sm || SPACING.sm
  },
  desgloseDivider: {
    height: 1,
    backgroundColor: colors.neutral?.gray?.[300] || DS_COLORS.border.light,
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
    color: colors.text?.secondary || DS_COLORS.text.secondary
  },
  resumenPreciosValue: {
    fontSize: typography.fontSize?.sm || 12,
    color: colors.text?.primary || DS_COLORS.text.primary,
    fontWeight: typography.fontWeight?.medium || '500'
  },
  resumenPreciosTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs || SPACING.xs,
    backgroundColor: colors.primary?.[50] || DS_COLORS.primary[50],
    marginHorizontal: -(spacing.md || SPACING.md),
    paddingHorizontal: spacing.md || SPACING.md,
    marginTop: spacing.xs || SPACING.xs,
    borderRadius: borders.radius?.sm || BORDERS.radius.sm
  },
  resumenPreciosTotalLabel: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || DS_COLORS.text.primary
  },
  resumenPreciosTotalValue: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.primary?.[600] || DS_COLORS.primary[500]
  },
  notaRepuestos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm || SPACING.sm,
    paddingVertical: spacing.xs || SPACING.xs,
    paddingHorizontal: spacing.sm || SPACING.sm,
    backgroundColor: colors.success?.[50] || DS_COLORS.success[50],
    borderRadius: borders.radius?.sm || BORDERS.radius.sm
  },
  notaRepuestosText: {
    fontSize: typography.fontSize?.xs || 11,
    color: colors.success?.[700] || DS_COLORS.success.dark,
    fontWeight: typography.fontWeight?.medium || '500'
  },
  descripcionContainer: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: DS_COLORS.border.light
  },
  descripcion: {
    fontSize: 13,
    color: DS_COLORS.text.primary,
    lineHeight: 18
  },
  // Desglose de costos
  desgloseContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    backgroundColor: colors.neutral?.gray?.[50] || DS_COLORS.neutral.gray[50],
    borderRadius: borders.radius?.md || BORDERS.radius.sm,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || DS_COLORS.border.light,
  },
  desgloseTitulo: {
    fontSize: typography.fontSize?.sm || 12,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.secondary || DS_COLORS.text.secondary,
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
    color: colors.text?.secondary || DS_COLORS.text.secondary,
  },
  desgloseValue: {
    fontSize: typography.fontSize?.sm || 13,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || DS_COLORS.text.primary,
  },
  desgloseInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  desgloseInfoText: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || DS_COLORS.text.secondary,
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
    color: DS_COLORS.text.secondary
  },
  precio: {
    fontSize: 20,
    fontWeight: '700',
    color: DS_COLORS.text.primary
  },
  chatLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: DS_COLORS.border.light,
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
    backgroundColor: withOpacity(DS_COLORS.primary[300], 0.12)
  },
  chatIcon: {
    zIndex: 1
  },
  chatLinkText: {
    fontSize: 14,
    color: DS_COLORS.primary[500],
    fontWeight: '600',
    zIndex: 1
  },
  mensajesBadge: {
    backgroundColor: DS_COLORS.primary[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6
  },
  mensajesBadgeText: {
    color: DS_COLORS.base.white,
    fontSize: 12,
    fontWeight: '700'
  },
  aceptarButton: {
    backgroundColor: DS_COLORS.primary[500],
    paddingVertical: SPACING.md,
    borderRadius: BORDERS.radius.md,
    alignItems: 'center',
    marginTop: SPACING.sm
  },
  aceptarButtonText: {
    color: DS_COLORS.base.white,
    fontSize: 14,
    fontWeight: '600'
  },
  pagarButton: {
    backgroundColor: DS_COLORS.warning.main,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDERS.radius.md,
    marginTop: SPACING.sm,
    gap: SPACING.xs
  },
  pagarButtonText: {
    color: DS_COLORS.text.onPrimary,
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
    borderColor: DS_COLORS.error.main,
    paddingVertical: SPACING.md,
    borderRadius: BORDERS.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0
  },
  rechazarButtonText: {
    color: colors.error?.[500] || DS_COLORS.error.main,
    fontSize: typography.fontSize?.sm || 14,
    fontWeight: typography.fontWeight?.semibold || '600'
  },
  // Estilos para información de pago parcial
  pagoParcialContainer: {
    marginTop: spacing.md || SPACING.md,
    padding: spacing.md || SPACING.md,
    backgroundColor: colors.warning?.[50] || DS_COLORS.warning[50],
    borderRadius: borders.radius?.md || BORDERS.radius.md,
    borderWidth: 1,
    borderColor: colors.warning?.[200] || DS_COLORS.warning[200],
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
    color: colors.warning?.[700] || DS_COLORS.warning.dark
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
    color: colors.text?.secondary || DS_COLORS.text.secondary,
    fontWeight: typography.fontWeight?.medium || '500'
  },
  pagoParcialValue: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.success?.[700] || DS_COLORS.success.dark
  },
  pagoParcialLabelPendiente: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || DS_COLORS.text.secondary,
    fontWeight: typography.fontWeight?.medium || '500'
  },
  pagoParcialValuePendiente: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.warning?.[700] || DS_COLORS.warning.dark
  },
  pagoParcialDetalle: {
    marginTop: spacing.xs || SPACING.xs / 2,
    paddingLeft: spacing.sm || SPACING.sm
  },
  pagoParcialDetalleText: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || DS_COLORS.text.secondary,
    marginBottom: 2
  },
  pagarSaldoButton: {
    backgroundColor: DS_COLORS.warning[600],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDERS.radius.md,
    marginTop: SPACING.sm,
    gap: SPACING.xs
  },
  pagarSaldoButtonText: {
    color: DS_COLORS.text.onPrimary,
    fontSize: 14,
    fontWeight: '600'
  }
});

export default OfertaCard;
