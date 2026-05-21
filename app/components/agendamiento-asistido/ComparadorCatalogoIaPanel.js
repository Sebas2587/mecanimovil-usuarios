import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import { AGENDAMIENTO_THEME as T } from './theme';
import CandidatosProveedorCard from './CandidatosProveedorCard';

function toCandidato(oferta) {
  return {
    ...oferta,
    proveedor: oferta.proveedor || {
      nombre: oferta.nombre_proveedor || oferta.proveedor_nombre || 'Proveedor',
      tipo: oferta.tipo_proveedor,
      rating: oferta.rating_proveedor,
    },
    servicio: oferta.servicio || (oferta.servicios?.[0]
      ? { nombre: oferta.servicios[0].nombre }
      : null),
    desglose: oferta.desglose || {
      mano_obra: oferta.costo_mano_obra,
      repuestos: oferta.costo_repuestos,
      gestion: oferta.costo_gestion_compra,
      precio_publicado_cliente: oferta.precio_total_ofrecido,
    },
    precio_con_repuestos: oferta.precio_total_ofrecido,
    precio_sin_repuestos: oferta.precio_total_ofrecido,
    incluye_repuestos_sugerido: oferta.incluye_repuestos,
    score_match: oferta.score_match,
    explicacion: oferta.explicacion,
    distancia_km: oferta.distancia_km,
    es_recomendado: oferta.es_recomendado,
  };
}

function ProveedorOfertaBlock({
  oferta,
  variant,
  procesando,
  onAceptar,
}) {
  const candidato = toCandidato(oferta);
  const key = oferta.id || oferta.oferta_servicio_id;

  return (
    <View key={key} style={styles.cardWrap}>
      <CandidatosProveedorCard candidato={candidato} variant={variant} />
      <TouchableOpacity
        style={styles.confirmLink}
        onPress={() => onAceptar?.(oferta)}
        disabled={procesando}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Confirmar con este proveedor"
      >
        <Text style={[styles.confirmLinkText, procesando && styles.confirmLinkDisabled]}>
          {procesando ? 'Enviando…' : 'Confirmar con este proveedor'}
        </Text>
        {!procesando ? <ChevronRight size={18} color={COLORS.primary[500]} /> : null}
      </TouchableOpacity>
    </View>
  );
}

/**
 * Comparación de candidatos de catálogo: recomendados + otros en zona.
 */
export default function ComparadorCatalogoIaPanel({
  ofertas = [],
  ofertasRecomendadas,
  ofertasOtros = [],
  radioKm = 80,
  onAceptar,
  procesando = false,
  requiereRepuestos = true,
}) {
  const recomendadas = Array.isArray(ofertasRecomendadas) && ofertasRecomendadas.length > 0
    ? ofertasRecomendadas
    : ofertas;
  const otros = Array.isArray(ofertasOtros) ? ofertasOtros : [];
  const radioLabel = radioKm != null ? Math.round(Number(radioKm)) : 80;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Comparar ofertas</Text>
      <Text style={styles.subtitle}>
        Precios según tu elección de repuestos (
        {requiereRepuestos ? 'con repuestos' : 'solo mano de obra'}
        ). El proveedor confirma antes de pagar.
      </Text>

      {recomendadas.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coincidencia exacta</Text>
          <Text style={styles.sectionSub}>
            Los proveedores más recomendados para tu servicio y ubicación.
          </Text>
          {recomendadas.map((oferta) => (
            <ProveedorOfertaBlock
              key={oferta.id || oferta.oferta_servicio_id}
              oferta={oferta}
              variant="recomendado"
              procesando={procesando}
              onAceptar={onAceptar}
            />
          ))}
        </View>
      ) : null}

      {otros.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Otros proveedores</Text>
          <Text style={styles.sectionSub}>
            Mismo servicio dentro de {radioLabel} km desde tu dirección.
          </Text>
          {otros.map((oferta) => (
            <ProveedorOfertaBlock
              key={oferta.id || oferta.oferta_servicio_id}
              oferta={oferta}
              variant="otro"
              procesando={procesando}
              onAceptar={onAceptar}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: 12,
    lineHeight: 19,
  },
  cardWrap: {
    marginBottom: 14,
    gap: 8,
  },
  confirmLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    gap: 2,
  },
  confirmLinkText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: T.primary,
  },
  confirmLinkDisabled: {
    color: COLORS.text.disabled,
  },
});
