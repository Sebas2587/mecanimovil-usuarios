/**
 * PendingClientSignatureCard
 *
 * Card que se muestra al cliente cuando un servicio está esperando su
 * firma para cerrarse (firma diferida del cliente — change
 * firma-cliente-diferida-checklist).
 *
 * - Recibe `ordenId` y consulta el checklist asociado.
 * - Si el checklist está en `PENDIENTE_FIRMA_CLIENTE`, muestra un CTA
 *   "Revisar y firmar" que abre `CustomerSignatureModal`.
 * - Tras firmar, llama a `onSignatureSuccess` para que la pantalla padre
 *   refresque su estado.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '../base/Icon/Icon';
import PrimaryGradientFill from '../base/PrimaryGradientFill/PrimaryGradientFill';
import {
  COLORS,
  SPACING,
  BORDERS,
  SHADOWS,
  TYPOGRAPHY,
} from '../../design-system/tokens';
import checklistService from '../../services/checklistService';
import CustomerSignatureModal from './CustomerSignatureModal';

const PendingClientSignatureCard = ({
  ordenId,
  servicioNombre,
  proveedorNombre,
  onSignatureSuccess,
  refreshKey,
}) => {
  const [loading, setLoading] = useState(false);
  const [checklist, setChecklist] = useState(null);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const cargarChecklist = useCallback(async () => {
    if (!ordenId) {
      setChecklist(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await checklistService.obtenerChecklistServicio(ordenId);
      setChecklist(data);
    } catch (e) {
      console.warn('PendingClientSignatureCard: no se pudo cargar checklist', e);
      setChecklist(null);
      setError(e?.message || null);
    } finally {
      setLoading(false);
    }
  }, [ordenId]);

  useEffect(() => {
    cargarChecklist();
  }, [cargarChecklist, refreshKey]);

  const requiereFirma =
    checklist?.requiere_firma_cliente === true ||
    checklist?.estado === 'PENDIENTE_FIRMA_CLIENTE';

  if (loading && !checklist) {
    return null; // silencioso; la card no debería robar protagonismo si todavía cargando
  }

  if (!ordenId) {
    return null;
  }

  if (!requiereFirma) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Icon
            name="create-outline"
            size={22}
            color={COLORS.warning.dark}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Tu servicio espera tu firma</Text>
          <Text style={styles.subtitle}>
            {proveedorNombre
              ? `${proveedorNombre} cerró el checklist y firmó como técnico responsable. `
              : 'El técnico cerró el checklist y firmó. '}
            Confirma con tu firma para cerrar el servicio.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.ctaWrap}
        onPress={() => setShowModal(true)}
        activeOpacity={0.85}
      >
        <PrimaryGradientFill style={styles.cta}>
          <Icon
            name="checkmark-circle"
            size={20}
            color={COLORS.text.inverse}
          />
          <Text style={styles.ctaText}>Revisar y firmar</Text>
        </PrimaryGradientFill>
      </TouchableOpacity>

      <CustomerSignatureModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        instanceId={checklist?.id}
        servicioNombre={servicioNombre}
        proveedorNombre={proveedorNombre}
        onSignatureSuccess={() => {
          setShowModal(false);
          cargarChecklist();
          onSignatureSuccess?.();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.warning,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.warning[200],
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  headerRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.warning[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  ctaWrap: {
    borderRadius: BORDERS.radius.lg,
    overflow: 'hidden',
  },
  cta: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  ctaText: {
    color: COLORS.text.inverse,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});

export default PendingClientSignatureCard;
