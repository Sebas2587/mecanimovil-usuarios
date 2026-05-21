import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin, Star, Wrench } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import { AGENDAMIENTO_THEME as T } from './theme';
import {
  calcularDesgloseIvaOferta,
  resolverDesgloseIvaMostrado,
} from '../../utils/ofertaPrecioDesglose';

function formatCLP(n) {
  const v = Math.round(Number(n) || 0);
  return `$${v.toLocaleString('es-CL')}`;
}

/**
 * Card de proveedor en comparador catálogo (Coinbase-light).
 */
export default function CandidatosProveedorCard({
  candidato,
  selected = false,
  variant = 'recomendado',
}) {
  const desglose = useMemo(() => {
    const d = candidato?.desglose || {};
    const total = candidato?.incluye_repuestos_sugerido !== false
      ? candidato?.precio_con_repuestos
      : candidato?.precio_sin_repuestos;
    const calc = calcularDesgloseIvaOferta({
      costoManoObra: d.mano_obra,
      costoRepuestos: d.repuestos,
      costoGestionCompra: d.gestion,
      precioTotalOfrecido: total ?? d.precio_publicado_cliente,
    });
    return resolverDesgloseIvaMostrado(null, calc);
  }, [candidato]);

  if (!candidato) return null;

  const nombre = candidato.proveedor?.nombre || 'Proveedor';
  const tipo = candidato.a_domicilio ? 'A domicilio' : 'En taller';
  const rating = candidato.proveedor?.rating;
  const distKm = candidato.distancia_km;
  const matchPct =
    candidato.score_match != null ? Math.round(Number(candidato.score_match) * 100) : null;
  const servicioNombre = candidato.servicio?.nombre;
  const esExacta =
    variant === 'recomendado'
    || candidato.es_coincidencia_exacta
    || candidato.es_recomendado
    || candidato.nivel_coincidencia === 'exacta';

  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <View style={styles.header}>
        <Text style={styles.nombre} numberOfLines={2}>
          {nombre}
        </Text>
        {matchPct != null ? (
          <View style={[styles.matchPill, !esExacta && styles.matchPillParcial]}>
            <Text style={[styles.matchPillText, !esExacta && styles.matchPillTextParcial]}>
              {matchPct}% {esExacta ? 'match' : 'parcial'}
            </Text>
          </View>
        ) : null}
      </View>

      {servicioNombre ? (
        <View style={styles.metaRow}>
          <Wrench size={13} color={COLORS.text.tertiary} />
          <Text style={styles.meta} numberOfLines={1}>
            {servicioNombre}
          </Text>
        </View>
      ) : null}

      <View style={styles.distanciaRow}>
        <MapPin size={14} color={COLORS.primary[500]} />
        <Text style={styles.distanciaText}>
          {distKm != null && distKm < 999
            ? `${distKm} km desde tu dirección`
            : 'Distancia no disponible'}
        </Text>
      </View>

      <Text style={styles.tipoText}>{tipo}</Text>

      {rating != null && Number(rating) > 0 ? (
        <View style={styles.metaRow}>
          <Star size={13} color={COLORS.warning.main} fill={COLORS.warning.main} />
          <Text style={styles.meta}>{Number(rating).toFixed(1)}</Text>
        </View>
      ) : null}

      <Text style={styles.precio}>{formatCLP(desglose.total)}</Text>
      <Text style={styles.precioHint}>Precio estimado · IVA incluido</Text>

      {candidato.explicacion ? (
        <Text style={styles.explicacion} numberOfLines={3}>
          {candidato.explicacion}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  cardSelected: {
    borderColor: T.primary,
    borderWidth: 2,
    backgroundColor: COLORS.primary[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  nombre: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  matchPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.primary[100],
  },
  matchPillText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[700],
    fontVariant: ['tabular-nums'],
  },
  matchPillParcial: {
    backgroundColor: COLORS.neutral.gray[100],
  },
  matchPillTextParcial: {
    color: COLORS.text.secondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  meta: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  distanciaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  distanciaText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[700],
    fontVariant: ['tabular-nums'],
  },
  tipoText: {
    marginTop: 4,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
  },
  precio: {
    marginTop: 12,
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    fontVariant: ['tabular-nums'],
  },
  precioHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  explicacion: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginTop: 8,
    lineHeight: 17,
  },
});
