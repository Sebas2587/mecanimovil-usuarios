import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TOKENS } from '../../design-system/tokens';
import ofertasService from '../../services/ofertasService';

// Extraer tokens con valores por defecto
const colors = TOKENS?.colors || {};
const typography = TOKENS?.typography || {};
const spacing = TOKENS?.spacing || {};
const borders = TOKENS?.borders || {};

// Colores seguros
const primaryColor = colors?.primary?.['500'] || '#003459';
const primaryLight = colors?.primary?.['100'] || '#CCE5EF';
const primaryDark = colors?.primary?.['700'] || '#002035';
const secondaryColor = colors?.secondary?.['500'] || '#007EA7';
const accentColor = colors?.accent?.['500'] || '#00A8E8';
const successColor = colors?.success?.['500'] || '#10B981';
const successLight = colors?.success?.['100'] || '#D1FAE5';
const errorColor = colors?.error?.['500'] || '#EF4444';
const warningColor = colors?.warning?.['500'] || '#F59E0B';
const warningLight = colors?.warning?.['100'] || '#FEF3C7';
const infoColor = colors?.info?.['500'] || '#3B82F6';
const infoLight = colors?.info?.['100'] || '#DBEAFE';
const bgDefault = colors?.background?.default || '#F5F7F8';
const bgPaper = colors?.background?.paper || '#FFFFFF';
const textPrimary = colors?.text?.primary || '#00171F';
const textSecondary = colors?.text?.secondary || '#4B5563';
const textTertiary = colors?.text?.tertiary || '#6B7280';
const borderLight = colors?.border?.light || '#E5E7EB';
const neutralGray50 = colors?.neutral?.gray?.['50'] || '#F9FAFB';
const neutralGray100 = colors?.neutral?.gray?.['100'] || '#F3F4F6';
const neutralGray200 = colors?.neutral?.gray?.['200'] || '#E5E7EB';

// Espaciado seguro
const spacingXs = spacing?.xs || 4;
const spacingSm = spacing?.sm || 8;
const spacingMd = spacing?.md || 16;
const spacingLg = spacing?.lg || 24;
const spacingXl = spacing?.xl || 32;

// Tipografía segura
const fontSizeXs = typography?.fontSize?.xs || 10;
const fontSizeSm = typography?.fontSize?.sm || 12;
const fontSizeBase = typography?.fontSize?.base || 14;
const fontSizeMd = typography?.fontSize?.md || 16;
const fontSizeLg = typography?.fontSize?.lg || 18;
const fontSizeXl = typography?.fontSize?.xl || 20;
const fontSize2xl = typography?.fontSize?.['2xl'] || 24;
const fontWeightMedium = typography?.fontWeight?.medium || '500';
const fontWeightSemibold = typography?.fontWeight?.semibold || '600';
const fontWeightBold = typography?.fontWeight?.bold || '700';

// Bordes seguros
const radiusSm = borders?.radius?.sm || 4;
const radiusMd = borders?.radius?.md || 8;
const radiusLg = borders?.radius?.lg || 12;
const radiusXl = borders?.radius?.['3xl'] || 24;
const radiusFull = borders?.radius?.full || 9999;

/**
 * CRITERIOS DE PUNTUACIÓN PARA COMPARACIÓN DE OFERTAS
 * Sistema inteligente que evalúa múltiples factores
 */
const CRITERIOS_PUNTUACION = {
  // 1. Reseñas positivas (4-5 estrellas) - 20%
  RESENAS_POSITIVAS: {
    peso: 20,
    nombre: 'Reseñas Positivas',
    icono: 'star',
    descripcion: 'Comentarios de 4-5 estrellas'
  },
  // 2. Experiencia (cantidad de servicios) - 15%
  EXPERIENCIA: {
    peso: 15,
    nombre: 'Experiencia',
    icono: 'briefcase-outline',
    descripcion: 'Servicios realizados'
  },
  // 3. Cercanía/Distancia - 15%
  CERCANIA: {
    peso: 15,
    nombre: 'Cercanía',
    icono: 'location-outline',
    descripcion: 'Distancia al proveedor'
  },
  // 4. Disponibilidad inmediata - 12%
  DISPONIBILIDAD: {
    peso: 12,
    nombre: 'Disponibilidad',
    icono: 'calendar-outline',
    descripcion: 'Fecha disponible'
  },
  // 5. Tiempo de ejecución - 12%
  TIEMPO_EJECUCION: {
    peso: 12,
    nombre: 'Tiempo',
    icono: 'time-outline',
    descripcion: 'Tiempo estimado'
  },
  // 6. Garantía ofrecida - 10%
  GARANTIA: {
    peso: 10,
    nombre: 'Garantía',
    icono: 'shield-checkmark-outline',
    descripcion: 'Garantía del servicio'
  },
  // 7. Documentos validados - 10%
  DOCUMENTOS: {
    peso: 10,
    nombre: 'Verificación',
    icono: 'document-text-outline',
    descripcion: 'Documentos validados'
  },
  // 8. Precio competitivo - 6%
  PRECIO: {
    peso: 6,
    nombre: 'Precio',
    icono: 'cash-outline',
    descripcion: 'Precio competitivo'
  }
};

/**
 * Componente para comparar múltiples ofertas lado a lado
 * Con sistema de diseño MecaniMóvil y algoritmo de puntuación inteligente
 */
const ComparadorOfertas = ({ ofertas, onAceptarOferta, solicitudAdjudicada = false, solicitudId = null }) => {
  if (!ofertas || ofertas.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="compare-arrows" size={48} color={textTertiary} />
        <Text style={styles.emptyText}>No hay ofertas para comparar</Text>
      </View>
    );
  }

  // Función para parsear duración a minutos
  const parseDuracionAMinutos = (duration) => {
    if (!duration) return Infinity;
    if (typeof duration === 'string') {
      const match = duration.match(/(\d+):(\d+):(\d+)/);
      if (match) {
        return parseInt(match[1]) * 60 + parseInt(match[2]);
      }
      // Intentar parsear formato "2h 30m"
      const matchHM = duration.match(/(\d+)h\s*(\d+)?m?/);
      if (matchHM) {
        return parseInt(matchHM[1]) * 60 + (parseInt(matchHM[2]) || 0);
      }
    }
    return Infinity;
  };

  // Función para parsear garantía a días
  const parseGarantiaADias = (garantia) => {
    if (!garantia) return 0;
    const garantiaLower = garantia.toLowerCase();

    // Buscar años
    const matchAnos = garantiaLower.match(/(\d+)\s*(año|años|year|years)/);
    if (matchAnos) return parseInt(matchAnos[1]) * 365;

    // Buscar meses
    const matchMeses = garantiaLower.match(/(\d+)\s*(mes|meses|month|months)/);
    if (matchMeses) return parseInt(matchMeses[1]) * 30;

    // Buscar semanas
    const matchSemanas = garantiaLower.match(/(\d+)\s*(semana|semanas|week|weeks)/);
    if (matchSemanas) return parseInt(matchSemanas[1]) * 7;

    // Buscar días
    const matchDias = garantiaLower.match(/(\d+)\s*(día|dias|day|days)/);
    if (matchDias) return parseInt(matchDias[1]);

    return 0;
  };

  // Función para calcular días hasta disponibilidad
  const diasHastaDisponibilidad = (fechaString) => {
    if (!fechaString) return 0; // Disponible inmediatamente
    const fecha = new Date(fechaString);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fecha.setHours(0, 0, 0, 0);
    const diff = (fecha - hoy) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(diff));
  };

  /**
   * ALGORITMO DE PUNTUACIÓN INTELIGENTE
   * Evalúa cada oferta en base a múltiples criterios relevantes
   */
  const calcularPuntuacionOferta = useMemo(() => (oferta) => {
    let puntuacionTotal = 0;
    const puntuacionesPorCriterio = {};

    // 1. RESEÑAS POSITIVAS (20%) - Comentarios de 4-5 estrellas
    const resenasPositivas = parseInt(oferta.resenas_positivas || oferta.cantidad_resenas_positivas || 0);
    const totalResenas = parseInt(oferta.total_resenas || oferta.cantidad_resenas || 0);
    const rating = parseFloat(oferta.rating_proveedor || 0);

    let scoreResenas = 0;
    if (rating >= 4.5 && resenasPositivas > 10) {
      scoreResenas = 100; // Excelente
    } else if (rating >= 4.0 && resenasPositivas > 5) {
      scoreResenas = 80; // Muy bueno
    } else if (rating >= 3.5) {
      scoreResenas = 60; // Bueno
    } else if (rating >= 3.0) {
      scoreResenas = 40; // Regular
    } else {
      scoreResenas = Math.max(20, rating * 20); // Bajo
    }
    puntuacionesPorCriterio.RESENAS_POSITIVAS = scoreResenas;
    puntuacionTotal += (scoreResenas / 100) * CRITERIOS_PUNTUACION.RESENAS_POSITIVAS.peso;

    // 2. EXPERIENCIA (15%) - Cantidad de servicios realizados
    const serviciosRealizados = parseInt(oferta.servicios_realizados_proveedor || oferta.cantidad_servicios || 0);
    const maxServicios = Math.max(...ofertas.map(o => parseInt(o.servicios_realizados_proveedor || o.cantidad_servicios || 0)), 1);

    let scoreExperiencia = 0;
    if (serviciosRealizados >= 100) {
      scoreExperiencia = 100; // Muy experimentado
    } else if (serviciosRealizados >= 50) {
      scoreExperiencia = 85;
    } else if (serviciosRealizados >= 20) {
      scoreExperiencia = 70;
    } else if (serviciosRealizados >= 10) {
      scoreExperiencia = 55;
    } else if (serviciosRealizados >= 5) {
      scoreExperiencia = 40;
    } else {
      scoreExperiencia = Math.max(20, (serviciosRealizados / maxServicios) * 100);
    }
    puntuacionesPorCriterio.EXPERIENCIA = scoreExperiencia;
    puntuacionTotal += (scoreExperiencia / 100) * CRITERIOS_PUNTUACION.EXPERIENCIA.peso;

    // 3. CERCANÍA (15%) - Distancia al proveedor
    const distancia = parseFloat(oferta.distancia_km || oferta.distancia || 0);

    let scoreCercania = 0;
    if (distancia === 0 || !distancia) {
      scoreCercania = 100; // Muy cerca o no especificado
    } else if (distancia <= 3) {
      scoreCercania = 100; // Muy cerca
    } else if (distancia <= 5) {
      scoreCercania = 85;
    } else if (distancia <= 10) {
      scoreCercania = 70;
    } else if (distancia <= 15) {
      scoreCercania = 55;
    } else if (distancia <= 25) {
      scoreCercania = 40;
    } else {
      scoreCercania = Math.max(20, 100 - (distancia * 2));
    }
    puntuacionesPorCriterio.CERCANIA = scoreCercania;
    puntuacionTotal += (scoreCercania / 100) * CRITERIOS_PUNTUACION.CERCANIA.peso;

    // 4. DISPONIBILIDAD (12%) - Qué tan pronto puede atender
    const diasDisponibilidad = diasHastaDisponibilidad(oferta.fecha_disponible);

    let scoreDisponibilidad = 0;
    if (diasDisponibilidad === 0) {
      scoreDisponibilidad = 100; // Disponible hoy
    } else if (diasDisponibilidad <= 1) {
      scoreDisponibilidad = 90; // Mañana
    } else if (diasDisponibilidad <= 3) {
      scoreDisponibilidad = 75;
    } else if (diasDisponibilidad <= 7) {
      scoreDisponibilidad = 60;
    } else if (diasDisponibilidad <= 14) {
      scoreDisponibilidad = 40;
    } else {
      scoreDisponibilidad = Math.max(20, 100 - (diasDisponibilidad * 3));
    }
    puntuacionesPorCriterio.DISPONIBILIDAD = scoreDisponibilidad;
    puntuacionTotal += (scoreDisponibilidad / 100) * CRITERIOS_PUNTUACION.DISPONIBILIDAD.peso;

    // 5. TIEMPO DE EJECUCIÓN (12%) - Tiempo estimado del servicio
    const tiempoMinutos = parseDuracionAMinutos(oferta.tiempo_estimado_total);
    const tiemposValidos = ofertas.map(o => parseDuracionAMinutos(o.tiempo_estimado_total)).filter(t => t !== Infinity);
    const tiempoMin = Math.min(...tiemposValidos, 60);
    const tiempoMax = Math.max(...tiemposValidos, 240);

    let scoreTiempo = 0;
    if (tiempoMinutos === Infinity) {
      scoreTiempo = 50; // No especificado
    } else if (tiempoMinutos <= 60) {
      scoreTiempo = 100; // Rápido
    } else if (tiempoMinutos <= 120) {
      scoreTiempo = 85;
    } else if (tiempoMinutos <= 180) {
      scoreTiempo = 70;
    } else if (tiempoMinutos <= 300) {
      scoreTiempo = 55;
    } else {
      scoreTiempo = Math.max(30, 100 - ((tiempoMinutos - tiempoMin) / (tiempoMax - tiempoMin + 1)) * 70);
    }
    puntuacionesPorCriterio.TIEMPO_EJECUCION = scoreTiempo;
    puntuacionTotal += (scoreTiempo / 100) * CRITERIOS_PUNTUACION.TIEMPO_EJECUCION.peso;

    // 6. GARANTÍA (10%) - Duración de la garantía
    const garantiaDias = parseGarantiaADias(oferta.garantia_ofrecida);

    let scoreGarantia = 0;
    if (garantiaDias >= 365) {
      scoreGarantia = 100; // 1 año o más
    } else if (garantiaDias >= 180) {
      scoreGarantia = 85; // 6 meses
    } else if (garantiaDias >= 90) {
      scoreGarantia = 70; // 3 meses
    } else if (garantiaDias >= 30) {
      scoreGarantia = 55; // 1 mes
    } else if (garantiaDias >= 7) {
      scoreGarantia = 40; // 1 semana
    } else if (garantiaDias > 0) {
      scoreGarantia = 30;
    } else {
      scoreGarantia = 20; // Sin garantía
    }
    puntuacionesPorCriterio.GARANTIA = scoreGarantia;
    puntuacionTotal += (scoreGarantia / 100) * CRITERIOS_PUNTUACION.GARANTIA.peso;

    // 7. DOCUMENTOS VALIDADOS (10%) - Verificación completa
    const documentosVerificados = oferta.documentos_verificados || oferta.proveedor_verificado || false;
    const verificacionCompleta = oferta.verificacion_completa || false;

    let scoreDocumentos = 0;
    if (verificacionCompleta) {
      scoreDocumentos = 100; // Todos los documentos validados
    } else if (documentosVerificados) {
      scoreDocumentos = 75; // Parcialmente verificado
    } else {
      scoreDocumentos = 30; // Sin verificar
    }
    puntuacionesPorCriterio.DOCUMENTOS = scoreDocumentos;
    puntuacionTotal += (scoreDocumentos / 100) * CRITERIOS_PUNTUACION.DOCUMENTOS.peso;

    // 8. PRECIO COMPETITIVO (6%)
    const precio = parseFloat(oferta.precio_total_ofrecido) || 0;
    const precios = ofertas.map(o => parseFloat(o.precio_total_ofrecido) || 0).filter(p => p > 0);
    const precioMin = Math.min(...precios);
    const precioMax = Math.max(...precios);

    let scorePrecio = 0;
    if (precioMax === precioMin || precio === 0) {
      scorePrecio = 70; // Precio único o no especificado
    } else {
      scorePrecio = 100 - ((precio - precioMin) / (precioMax - precioMin)) * 80;
    }
    puntuacionesPorCriterio.PRECIO = Math.max(20, scorePrecio);
    puntuacionTotal += (puntuacionesPorCriterio.PRECIO / 100) * CRITERIOS_PUNTUACION.PRECIO.peso;

    return {
      total: puntuacionTotal,
      porCriterio: puntuacionesPorCriterio
    };
  }, [ofertas]);

  // Calcular puntuaciones y ordenar ofertas
  const ofertasConPuntuacion = useMemo(() => {
    return ofertas.map(oferta => {
      const puntuacion = calcularPuntuacionOferta(oferta);
      return {
        ...oferta,
        puntuacionTotal: puntuacion.total,
        puntuacionPorCriterio: puntuacion.porCriterio
      };
    }).sort((a, b) => b.puntuacionTotal - a.puntuacionTotal);
  }, [ofertas, calcularPuntuacionOferta]);

  const mejorOferta = ofertasConPuntuacion[0];
  const mejorOfertaId = mejorOferta?.id;

  const estadisticas = ofertasService.compararOfertas(ofertas);

  // Funciones de formateo
  const formatDuration = (duration) => {
    if (!duration) return 'Por definir';
    if (typeof duration === 'string') {
      const match = duration.match(/(\d+):(\d+):(\d+)/);
      if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes} min`;
      }
    }
    return duration;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Inmediato';
    const fecha = new Date(dateString);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fecha.setHours(0, 0, 0, 0);

    const diffDias = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));

    if (diffDias === 0) return 'Hoy';
    if (diffDias === 1) return 'Mañana';
    if (diffDias <= 7) return `En ${diffDias} días`;

    return fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  };

  const formatDistancia = (distancia) => {
    if (!distancia || distancia === 0) return 'Cercano';
    if (distancia < 1) return `${Math.round(distancia * 1000)}m`;
    return `${distancia.toFixed(1)} km`;
  };

  // Renderizar estrellas de rating
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Ionicons key={i} name="star" size={12} color="#FFD700" />);
      } else if (i === fullStars && hasHalf) {
        stars.push(<Ionicons key={i} name="star-half" size={12} color="#FFD700" />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={12} color="#FFD700" />);
      }
    }
    return stars;
  };

  // Obtener color según puntuación
  const getScoreColor = (score) => {
    if (score >= 80) return successColor;
    if (score >= 60) return infoColor;
    if (score >= 40) return warningColor;
    return errorColor;
  };

  // Renderizar indicador de puntuación
  const renderScoreIndicator = (score, label) => {
    const color = getScoreColor(score);
    return (
      <View style={styles.scoreIndicator}>
        <View style={[styles.scoreBar, { backgroundColor: neutralGray200 }]}>
          <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: color }]} />
        </View>
        <Text style={[styles.scoreText, { color }]}>{Math.round(score)}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Card Informativa - Cómo funciona */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <MaterialIcons name="lightbulb-outline" size={20} color={accentColor} />
          <Text style={styles.infoTitle}>Análisis Inteligente de Ofertas</Text>
        </View>
        <Text style={styles.infoText}>
          Evaluamos cada oferta en base a 8 criterios: reseñas positivas, experiencia, cercanía, disponibilidad, tiempo de ejecución, garantía, documentos verificados y precio.
        </Text>
      </View>

      {/* Card de Resumen de Precios */}
      <View style={styles.resumenCard}>
        <View style={styles.resumenHeader}>
          <MaterialIcons name="analytics" size={20} color={primaryColor} />
          <Text style={styles.resumenTitle}>Resumen de Precios</Text>
        </View>
        <View style={styles.resumenGrid}>
          <View style={styles.resumenItem}>
            <View style={[styles.resumenIconBox, { backgroundColor: successLight }]}>
              <Ionicons name="trending-down" size={18} color={successColor} />
            </View>
            <Text style={styles.resumenLabel}>Más Bajo</Text>
            <Text style={[styles.resumenValue, { color: successColor }]}>
              ${parseInt(estadisticas.precio.min).toLocaleString()}
            </Text>
          </View>
          <View style={styles.resumenDivider} />
          <View style={styles.resumenItem}>
            <View style={[styles.resumenIconBox, { backgroundColor: primaryLight }]}>
              <Ionicons name="remove" size={18} color={primaryColor} />
            </View>
            <Text style={styles.resumenLabel}>Promedio</Text>
            <Text style={[styles.resumenValue, { color: primaryColor }]}>
              ${parseInt(estadisticas.precio.promedio).toLocaleString()}
            </Text>
          </View>
          <View style={styles.resumenDivider} />
          <View style={styles.resumenItem}>
            <View style={[styles.resumenIconBox, { backgroundColor: warningLight }]}>
              <Ionicons name="trending-up" size={18} color={warningColor} />
            </View>
            <Text style={styles.resumenLabel}>Más Alto</Text>
            <Text style={[styles.resumenValue, { color: warningColor }]}>
              ${parseInt(estadisticas.precio.max).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Cards de Ofertas */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.ofertasScrollContent}
      >
        {ofertasConPuntuacion.map((oferta, index) => {
          const esMejor = oferta.id === mejorOfertaId;
          const esOfertaAceptada = oferta.estado === 'aceptada';
          const mostrarBotonAceptar = onAceptarOferta && !solicitudAdjudicada && !esOfertaAceptada;
          const puntuacion = oferta.puntuacionTotal;
          const puntuacionPorCriterio = oferta.puntuacionPorCriterio;

          return (
            <View
              key={oferta.id}
              style={[
                styles.ofertaCard,
                esMejor && styles.ofertaCardRecomendada
              ]}
            >
              {/* Badge Recomendada - Ahora con más espacio arriba */}
              {esMejor && (
                <View style={styles.badgeRecomendadaContainer}>
                  <View style={styles.badgeRecomendada}>
                    <Ionicons name="trophy" size={12} color="#FFF" />
                    <Text style={styles.badgeRecomendadaText}>MEJOR OPCIÓN</Text>
                  </View>
                </View>
              )}

              {/* Puntuación General */}
              <View style={[styles.puntuacionGeneral, esMejor && styles.puntuacionGeneralMejor]}>
                <Text style={styles.puntuacionLabel}>Puntuación</Text>
                <Text style={[styles.puntuacionValor, { color: getScoreColor(puntuacion) }]}>
                  {Math.round(puntuacion)}
                </Text>
                <Text style={styles.puntuacionMax}>/100</Text>
              </View>

              {/* Header del Proveedor */}
              <View style={styles.ofertaHeader}>
                <View style={styles.proveedorAvatar}>
                  {oferta.foto_proveedor ? (
                    <Image
                      source={{ uri: oferta.foto_proveedor }}
                      style={styles.avatarImage}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={24} color={textTertiary} />
                    </View>
                  )}
                  {(oferta.proveedor_verificado || oferta.documentos_verificados) && (
                    <View style={styles.verificadoBadge}>
                      <Ionicons name="checkmark" size={10} color="#FFF" />
                    </View>
                  )}
                </View>
                <View style={styles.proveedorInfo}>
                  <Text style={styles.proveedorNombre} numberOfLines={1}>
                    {oferta.nombre_proveedor || `Oferta ${index + 1}`}
                  </Text>
                  <View style={styles.ratingContainer}>
                    <View style={styles.starsRow}>
                      {renderStars(oferta.rating_proveedor || 0)}
                    </View>
                    <Text style={styles.ratingText}>
                      {(oferta.rating_proveedor || 0).toFixed(1)} ({oferta.total_resenas || oferta.cantidad_resenas || 0})
                    </Text>
                  </View>
                </View>
              </View>

              {/* Precio destacado */}
              <View style={styles.precioContainer}>
                <Text style={styles.precioLabel}>Precio Total</Text>
                <Text style={styles.precioValor}>
                  ${parseInt(oferta.precio_total_ofrecido || 0).toLocaleString()}
                </Text>
              </View>

              {/* Criterios de Puntuación */}
              <View style={styles.criteriosContainer}>
                <Text style={styles.criteriosTitle}>Análisis de Criterios</Text>

                {/* Reseñas Positivas */}
                <View style={styles.criterioRow}>
                  <View style={styles.criterioLeft}>
                    <Ionicons name="star" size={14} color={textSecondary} />
                    <Text style={styles.criterioLabel}>Reseñas 4-5★</Text>
                  </View>
                  {renderScoreIndicator(puntuacionPorCriterio.RESENAS_POSITIVAS, 'resenas')}
                </View>

                {/* Experiencia */}
                <View style={styles.criterioRow}>
                  <View style={styles.criterioLeft}>
                    <Ionicons name="briefcase-outline" size={14} color={textSecondary} />
                    <Text style={styles.criterioLabel}>Experiencia</Text>
                  </View>
                  {renderScoreIndicator(puntuacionPorCriterio.EXPERIENCIA, 'experiencia')}
                </View>

                {/* Cercanía */}
                <View style={styles.criterioRow}>
                  <View style={styles.criterioLeft}>
                    <Ionicons name="location-outline" size={14} color={textSecondary} />
                    <Text style={styles.criterioLabel}>Cercanía</Text>
                  </View>
                  {renderScoreIndicator(puntuacionPorCriterio.CERCANIA, 'cercania')}
                </View>

                {/* Disponibilidad */}
                <View style={styles.criterioRow}>
                  <View style={styles.criterioLeft}>
                    <Ionicons name="calendar-outline" size={14} color={textSecondary} />
                    <Text style={styles.criterioLabel}>Disponibilidad</Text>
                  </View>
                  {renderScoreIndicator(puntuacionPorCriterio.DISPONIBILIDAD, 'disponibilidad')}
                </View>

                {/* Tiempo */}
                <View style={styles.criterioRow}>
                  <View style={styles.criterioLeft}>
                    <Ionicons name="time-outline" size={14} color={textSecondary} />
                    <Text style={styles.criterioLabel}>Tiempo</Text>
                  </View>
                  {renderScoreIndicator(puntuacionPorCriterio.TIEMPO_EJECUCION, 'tiempo')}
                </View>

                {/* Garantía */}
                <View style={styles.criterioRow}>
                  <View style={styles.criterioLeft}>
                    <Ionicons name="shield-checkmark-outline" size={14} color={textSecondary} />
                    <Text style={styles.criterioLabel}>Garantía</Text>
                  </View>
                  {renderScoreIndicator(puntuacionPorCriterio.GARANTIA, 'garantia')}
                </View>

                {/* Documentos */}
                <View style={styles.criterioRow}>
                  <View style={styles.criterioLeft}>
                    <Ionicons name="document-text-outline" size={14} color={textSecondary} />
                    <Text style={styles.criterioLabel}>Verificación</Text>
                  </View>
                  {renderScoreIndicator(puntuacionPorCriterio.DOCUMENTOS, 'documentos')}
                </View>
              </View>

              {/* Detalles Adicionales */}
              <View style={styles.detallesAdicionales}>
                <View style={styles.detalleAdicionalItem}>
                  <Text style={styles.detalleAdicionalLabel}>Disponible:</Text>
                  <Text style={styles.detalleAdicionalValor}>{formatDate(oferta.fecha_disponible)}</Text>
                </View>
                <View style={styles.detalleAdicionalItem}>
                  <Text style={styles.detalleAdicionalLabel}>Tiempo est.:</Text>
                  <Text style={styles.detalleAdicionalValor}>{formatDuration(oferta.tiempo_estimado_total)}</Text>
                </View>
                <View style={styles.detalleAdicionalItem}>
                  <Text style={styles.detalleAdicionalLabel}>Garantía:</Text>
                  <Text style={styles.detalleAdicionalValor} numberOfLines={1}>
                    {oferta.garantia_ofrecida || 'No especificada'}
                  </Text>
                </View>
                <View style={styles.detalleAdicionalItem}>
                  <Text style={styles.detalleAdicionalLabel}>Repuestos:</Text>
                  <View style={[
                    styles.repuestosBadge,
                    oferta.incluye_repuestos ? styles.repuestosIncluidos : styles.repuestosNoIncluidos
                  ]}>
                    <Text style={[
                      styles.repuestosText,
                      oferta.incluye_repuestos ? styles.repuestosIncluidosText : styles.repuestosNoIncluidosText
                    ]}>
                      {oferta.incluye_repuestos ? '✓ Incluidos' : '✗ No incluidos'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Botón de acción */}
              <View style={styles.accionContainer}>
                {mostrarBotonAceptar ? (
                  <TouchableOpacity
                    style={[styles.aceptarButton, esMejor && styles.aceptarButtonRecomendada]}
                    onPress={() => onAceptarOferta(oferta)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                    <Text style={styles.aceptarButtonText}>
                      {esMejor ? 'Aceptar Mejor Opción' : 'Aceptar Oferta'}
                    </Text>
                  </TouchableOpacity>
                ) : esOfertaAceptada ? (
                  <View style={styles.aceptadaBadge}>
                    <Ionicons name="checkmark-done" size={18} color={successColor} />
                    <Text style={styles.aceptadaText}>Oferta Aceptada</Text>
                  </View>
                ) : (
                  <View style={styles.noDisponibleBadge}>
                    <Text style={styles.noDisponibleText}>No disponible</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Leyenda de colores */}
      <View style={styles.leyendaCard}>
        <Text style={styles.leyendaTitle}>Guía de puntuación:</Text>
        <View style={styles.leyendaRow}>
          <View style={styles.leyendaItem}>
            <View style={[styles.leyendaDot, { backgroundColor: successColor }]} />
            <Text style={styles.leyendaText}>80-100 Excelente</Text>
          </View>
          <View style={styles.leyendaItem}>
            <View style={[styles.leyendaDot, { backgroundColor: infoColor }]} />
            <Text style={styles.leyendaText}>60-79 Bueno</Text>
          </View>
          <View style={styles.leyendaItem}>
            <View style={[styles.leyendaDot, { backgroundColor: warningColor }]} />
            <Text style={styles.leyendaText}>40-59 Regular</Text>
          </View>
          <View style={styles.leyendaItem}>
            <View style={[styles.leyendaDot, { backgroundColor: errorColor }]} />
            <Text style={styles.leyendaText}>0-39 Bajo</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  emptyContainer: {
    padding: spacingXl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: spacingMd,
    fontSize: fontSizeBase,
    color: textTertiary
  },
  // Info Card
  infoCard: {
    backgroundColor: accentColor + '10',
    borderRadius: radiusLg,
    padding: spacingMd,
    marginBottom: spacingMd,
    borderWidth: 1,
    borderColor: accentColor + '30',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingSm,
    gap: spacingSm,
  },
  infoTitle: {
    fontSize: fontSizeBase,
    fontWeight: fontWeightSemibold,
    color: primaryColor,
  },
  infoText: {
    fontSize: fontSizeSm,
    color: textSecondary,
    lineHeight: 18,
  },
  // Resumen Card
  resumenCard: {
    backgroundColor: bgPaper,
    borderRadius: radiusXl,
    padding: spacingMd,
    marginBottom: spacingMd,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  resumenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingMd,
    gap: spacingSm,
  },
  resumenTitle: {
    fontSize: fontSizeMd,
    fontWeight: fontWeightBold,
    color: textPrimary,
  },
  resumenGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resumenItem: {
    flex: 1,
    alignItems: 'center',
  },
  resumenDivider: {
    width: 1,
    height: 50,
    backgroundColor: borderLight,
  },
  resumenIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacingXs,
  },
  resumenLabel: {
    fontSize: fontSizeXs,
    color: textTertiary,
    marginBottom: 2,
  },
  resumenValue: {
    fontSize: fontSizeMd,
    fontWeight: fontWeightBold,
  },
  // Ofertas Scroll
  ofertasScrollContent: {
    paddingRight: spacingMd,
    gap: spacingMd,
    paddingTop: spacingMd, // Espacio para el badge
  },
  // Oferta Card
  ofertaCard: {
    width: 300,
    backgroundColor: bgPaper,
    borderRadius: radiusXl,
    padding: spacingMd,
    paddingTop: spacingLg, // Más espacio arriba para el badge
    borderWidth: 1,
    borderColor: borderLight,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  ofertaCardRecomendada: {
    borderColor: successColor,
    borderWidth: 2,
    backgroundColor: successLight + '20',
  },
  // Badge Recomendada - ARREGLADO
  badgeRecomendadaContainer: {
    position: 'absolute',
    top: -12,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  badgeRecomendada: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: successColor,
    paddingHorizontal: spacingSm + 4,
    paddingVertical: spacingXs + 2,
    borderRadius: radiusFull,
    gap: spacingXs,
    ...Platform.select({
      ios: {
        shadowColor: successColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  badgeRecomendadaText: {
    color: '#FFF',
    fontSize: fontSizeXs,
    fontWeight: fontWeightBold,
    letterSpacing: 0.5,
  },
  // Puntuación General
  puntuacionGeneral: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    backgroundColor: neutralGray50,
    borderRadius: radiusMd,
    padding: spacingSm,
    marginBottom: spacingMd,
  },
  puntuacionGeneralMejor: {
    backgroundColor: successLight,
  },
  puntuacionLabel: {
    fontSize: fontSizeSm,
    color: textSecondary,
    marginRight: spacingSm,
  },
  puntuacionValor: {
    fontSize: fontSize2xl,
    fontWeight: fontWeightBold,
  },
  puntuacionMax: {
    fontSize: fontSizeSm,
    color: textTertiary,
    marginLeft: 2,
  },
  // Header Proveedor
  ofertaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingMd,
  },
  proveedorAvatar: {
    position: 'relative',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: neutralGray100,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: neutralGray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verificadoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: successColor,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: bgPaper,
  },
  proveedorInfo: {
    flex: 1,
    marginLeft: spacingSm + 2,
  },
  proveedorNombre: {
    fontSize: fontSizeBase,
    fontWeight: fontWeightSemibold,
    color: textPrimary,
    marginBottom: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingXs,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingText: {
    fontSize: fontSizeSm,
    color: textSecondary,
  },
  // Precio
  precioContainer: {
    backgroundColor: primaryLight,
    borderRadius: radiusMd,
    padding: spacingSm + 2,
    marginBottom: spacingMd,
    alignItems: 'center',
  },
  precioLabel: {
    fontSize: fontSizeXs,
    color: primaryDark,
    marginBottom: 2,
  },
  precioValor: {
    fontSize: fontSize2xl,
    fontWeight: fontWeightBold,
    color: primaryColor,
  },
  // Criterios
  criteriosContainer: {
    backgroundColor: neutralGray50,
    borderRadius: radiusMd,
    padding: spacingSm + 2,
    marginBottom: spacingMd,
  },
  criteriosTitle: {
    fontSize: fontSizeSm,
    fontWeight: fontWeightSemibold,
    color: textPrimary,
    marginBottom: spacingSm,
  },
  criterioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacingXs + 2,
  },
  criterioLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingXs,
    flex: 1,
  },
  criterioLabel: {
    fontSize: fontSizeXs,
    color: textSecondary,
  },
  scoreIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingXs,
    width: 90,
  },
  scoreBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreText: {
    fontSize: fontSizeXs,
    fontWeight: fontWeightSemibold,
    width: 24,
    textAlign: 'right',
  },
  // Detalles Adicionales
  detallesAdicionales: {
    marginBottom: spacingMd,
    gap: spacingXs + 2,
  },
  detalleAdicionalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detalleAdicionalLabel: {
    fontSize: fontSizeSm,
    color: textSecondary,
  },
  detalleAdicionalValor: {
    fontSize: fontSizeSm,
    fontWeight: fontWeightMedium,
    color: textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  repuestosBadge: {
    paddingHorizontal: spacingSm,
    paddingVertical: 2,
    borderRadius: radiusSm,
  },
  repuestosIncluidos: {
    backgroundColor: successLight,
  },
  repuestosNoIncluidos: {
    backgroundColor: neutralGray100,
  },
  repuestosText: {
    fontSize: fontSizeXs,
    fontWeight: fontWeightMedium,
  },
  repuestosIncluidosText: {
    color: successColor,
  },
  repuestosNoIncluidosText: {
    color: textTertiary,
  },
  // Acción
  accionContainer: {
    marginTop: 'auto',
  },
  aceptarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: primaryColor,
    paddingVertical: spacingSm + 4,
    borderRadius: radiusMd,
    gap: spacingSm,
  },
  aceptarButtonRecomendada: {
    backgroundColor: successColor,
  },
  aceptarButtonText: {
    color: '#FFF',
    fontSize: fontSizeBase,
    fontWeight: fontWeightSemibold,
  },
  aceptadaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: successLight,
    paddingVertical: spacingSm + 4,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: successColor,
    gap: spacingSm,
  },
  aceptadaText: {
    color: successColor,
    fontSize: fontSizeBase,
    fontWeight: fontWeightSemibold,
  },
  noDisponibleBadge: {
    backgroundColor: neutralGray100,
    paddingVertical: spacingSm + 4,
    borderRadius: radiusMd,
    alignItems: 'center',
  },
  noDisponibleText: {
    color: textTertiary,
    fontSize: fontSizeSm,
    fontStyle: 'italic',
  },
  // Leyenda
  leyendaCard: {
    backgroundColor: bgPaper,
    borderRadius: radiusMd,
    padding: spacingSm + 2,
    marginTop: spacingMd,
    borderWidth: 1,
    borderColor: borderLight,
  },
  leyendaTitle: {
    fontSize: fontSizeXs,
    fontWeight: fontWeightSemibold,
    color: textSecondary,
    marginBottom: spacingSm,
  },
  leyendaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacingSm,
  },
  leyendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingXs,
  },
  leyendaDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  leyendaText: {
    fontSize: fontSizeXs,
    color: textTertiary,
  },
});

export default ComparadorOfertas;
