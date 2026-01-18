import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../utils/constants';

/**
 * Componente expandible para mostrar repuestos en una oferta
 */
const RepuestosExpandible = ({ repuestos, servicioNombre }) => {
  const [expandido, setExpandido] = useState(false);

  if (!repuestos || repuestos.length === 0) {
    return null;
  }

  const totalRepuestos = repuestos.length;
  const totalPrecio = repuestos.reduce((sum, rep) => {
    // CORRECCIÓN: Usar precio personalizado del proveedor si existe, sino usar precio_referencia del catálogo
    const precio = parseFloat(rep.precio !== undefined && rep.precio !== null ? rep.precio : (rep.precio_referencia || 0));
    const cantidad = rep.cantidad || 1;
    return sum + (precio * cantidad);
  }, 0);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.header, expandido && styles.headerExpanded]}
        onPress={() => setExpandido(!expandido)}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="construct" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>
                Repuestos incluidos
              </Text>
              <Text style={styles.headerSubtitle}>
                {totalRepuestos} {totalRepuestos === 1 ? 'repuesto' : 'repuestos'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {totalPrecio > 0 && (
              <View style={styles.precioContainer}>
                <Text style={styles.precioLabel}>Total:</Text>
                <Text style={styles.precioTotal}>
                  ${parseInt(totalPrecio).toLocaleString()}
                </Text>
              </View>
            )}
            <Ionicons 
              name={expandido ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={COLORS.primary} 
              style={styles.chevron}
            />
          </View>
        </View>
      </TouchableOpacity>

      {expandido && (
        <View style={styles.repuestosList}>
          {repuestos.map((repuesto, index) => {
            const cantidad = repuesto.cantidad || 1;
            // CORRECCIÓN: Usar precio personalizado del proveedor si existe, sino usar precio_referencia del catálogo
            const precioUnitario = parseFloat(repuesto.precio !== undefined && repuesto.precio !== null ? repuesto.precio : (repuesto.precio_referencia || 0));
            const subtotal = precioUnitario * cantidad;

            return (
              <View key={repuesto.id || index} style={styles.repuestoItem}>
                <View style={styles.repuestoContent}>
                  <View style={styles.repuestoInfo}>
                    <Text style={styles.repuestoNombre} numberOfLines={2}>
                      {repuesto.nombre}
                    </Text>
                    {repuesto.marca && (
                      <Text style={styles.repuestoMarca} numberOfLines={1}>
                        {repuesto.marca}
                      </Text>
                    )}
                  </View>
                  <View style={styles.repuestoDetalles}>
                    <View style={styles.detalleRow}>
                      <Text style={styles.detalleLabel}>Cantidad:</Text>
                      <Text style={styles.detalleValue}>{cantidad}</Text>
                    </View>
                    <View style={styles.detalleRow}>
                      <Text style={styles.detalleLabel}>Precio unitario:</Text>
                      <Text style={styles.detalleValue}>
                        ${parseInt(precioUnitario).toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.detalleRow, styles.detalleRowSubtotal]}>
                      <Text style={styles.detalleLabel}>Subtotal:</Text>
                      <Text style={styles.subtotal}>
                        ${parseInt(subtotal).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
          {totalPrecio > 0 && (
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total repuestos:</Text>
              <Text style={styles.totalValue}>
                ${parseInt(totalPrecio).toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E3F2FD',
    backgroundColor: '#FAFBFC',
  },
  header: {
    backgroundColor: '#F5F7FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E3F2FD',
  },
  headerExpanded: {
    backgroundColor: '#E8F4FD',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  precioContainer: {
    alignItems: 'flex-end',
    marginRight: SPACING.xs,
  },
  precioLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  precioTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  chevron: {
    marginLeft: SPACING.xs,
  },
  repuestosList: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  repuestoItem: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  repuestoContent: {
    width: '100%',
  },
  repuestoInfo: {
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  repuestoNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  repuestoMarca: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  repuestoDetalles: {
    gap: SPACING.xs / 2,
  },
  detalleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detalleRowSubtotal: {
    marginTop: SPACING.xs / 2,
    paddingTop: SPACING.xs / 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  detalleLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  detalleValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtotal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  totalContainer: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.xs,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

export default RepuestosExpandible;

