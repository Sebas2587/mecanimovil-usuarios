import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS } from '../../design-system/tokens/borders';
import { AGENDAMIENTO_THEME as T } from './theme';
import CandidatosProveedorCard from './CandidatosProveedorCard';

/**
 * Comparación simplificada de candidatos de catálogo (1–3 proveedores).
 */
export default function ComparadorCatalogoIaPanel({
  ofertas = [],
  onAceptar,
  procesando = false,
  requiereRepuestos = true,
}) {
  const toCandidato = (oferta) => ({
    ...oferta,
    proveedor: oferta.proveedor || {
      nombre: oferta.nombre_proveedor || oferta.proveedor_nombre || 'Proveedor',
      tipo: oferta.tipo_proveedor,
      rating: oferta.rating_proveedor,
    },
    servicio: oferta.servicio || (oferta.servicios?.[0] ? {
      nombre: oferta.servicios[0].nombre,
    } : null),
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
  });

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Elige tu proveedor</Text>
      <Text style={styles.subtitle}>
        Precios según tu elección de repuestos ({requiereRepuestos ? 'con repuestos' : 'solo mano de obra'}).
        El proveedor debe confirmar antes de pagar.
      </Text>

      {ofertas.map((oferta) => {
        const candidato = toCandidato(oferta);
        return (
          <View key={oferta.id || oferta.oferta_servicio_id} style={styles.cardWrap}>
            <CandidatosProveedorCard
              candidato={candidato}
              requiereRepuestos={requiereRepuestos}
            />
            <TouchableOpacity
              style={[styles.btn, procesando && styles.btnDisabled]}
              onPress={() => onAceptar?.(oferta)}
              disabled={procesando}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>
                {procesando ? 'Enviando…' : 'Confirmar con este proveedor'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text?.primary || '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text?.secondary || '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  cardWrap: {
    marginBottom: 16,
  },
  btn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: BORDERS.radius?.md ?? 8,
    backgroundColor: T.primary,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
