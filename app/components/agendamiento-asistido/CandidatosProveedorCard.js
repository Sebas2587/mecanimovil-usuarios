import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, Wrench } from 'lucide-react-native';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS } from '../../design-system/tokens/borders';
import {
  calcularDesgloseIvaOferta,
  resolverDesgloseIvaMostrado,
} from '../../utils/ofertaPrecioDesglose';

function formatCLP(n) {
  const v = Math.round(Number(n) || 0);
  return `$${v.toLocaleString('es-CL')}`;
}

export default function CandidatosProveedorCard({
  candidato,
  selected = false,
  onPress,
  requiereRepuestos = true,
}) {
  const desglose = useMemo(() => {
    const d = candidato?.desglose || {};
    const total = requiereRepuestos
      ? candidato?.precio_con_repuestos
      : candidato?.precio_sin_repuestos;
    const calc = calcularDesgloseIvaOferta({
      costoManoObra: d.mano_obra,
      costoRepuestos: d.repuestos,
      costoGestionCompra: d.gestion,
      precioTotalOfrecido: total ?? d.precio_publicado_cliente,
    });
    return resolverDesgloseIvaMostrado(null, calc);
  }, [candidato, requiereRepuestos]);

  if (!candidato) return null;

  const nombre = candidato.proveedor?.nombre || 'Proveedor';
  const tipo = candidato.a_domicilio ? 'A domicilio' : 'Taller';

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.nombre}>{nombre}</Text>
      <View style={styles.row}>
        <Wrench size={14} color={COLORS.text?.secondary} />
        <Text style={styles.meta}>{candidato.servicio?.nombre}</Text>
      </View>
      <View style={styles.row}>
        <MapPin size={14} color={COLORS.text?.secondary} />
        <Text style={styles.meta}>{tipo}</Text>
      </View>
      <Text style={styles.precio}>{formatCLP(desglose.total)}</Text>
      <Text style={styles.iva}>
        IVA incl. {formatCLP(desglose.iva)} · MO/rep. según catálogo
      </Text>
      {candidato.explicacion ? (
        <Text style={styles.explicacion}>{candidato.explicacion}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: BORDERS.radius?.lg ?? 12,
    borderWidth: 1,
    borderColor: COLORS.border?.light || '#E5E7EB',
    backgroundColor: COLORS.background?.paper || '#FFFFFF',
    marginBottom: 10,
  },
  cardSelected: {
    borderColor: COLORS.primary?.main || COLORS.primary,
    borderWidth: 2,
  },
  nombre: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text?.primary || '#111827',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  meta: {
    fontSize: 13,
    color: COLORS.text?.secondary || '#6B7280',
    flex: 1,
  },
  precio: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text?.primary || '#111827',
  },
  iva: {
    fontSize: 12,
    color: COLORS.text?.disabled || '#9CA3AF',
    marginTop: 2,
  },
  explicacion: {
    fontSize: 12,
    color: COLORS.text?.secondary || '#6B7280',
    marginTop: 8,
  },
});
