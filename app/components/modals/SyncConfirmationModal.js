import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { RefreshCw, ClipboardList, Gauge, Calendar, X, Check } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING, withOpacity } from '../../design-system/tokens';
import Button from '../base/Button/Button';

/**
 * Modal de confirmación previo a sincronizar un informe de taller.
 * Detalla las métricas de salud que se actualizarán, el cambio de kilometraje
 * y el cálculo de degradación según la fecha del servicio.
 */
const SyncConfirmationModal = ({
  visible,
  onClose,
  onConfirm,
  syncing = false,
  informes = [],
  vehiculoActualKm = 0,
}) => {
  if (!visible || !informes.length) return null;

  const primerInforme = informes[0] || {};
  const tallerNombre = primerInforme.taller_nombre || 'Taller de la red';
  const kmReportado = Number(primerInforme.kilometraje_servicio || 0);
  const kmActual = Number(vehiculoActualKm || 0);

  // Unificar componentes de todos los informes a sincronizar
  const componentesUnicos = [];
  const compSet = new Set();
  informes.forEach((inf) => {
    const list = Array.isArray(inf.componentes_afectados) ? inf.componentes_afectados : [];
    list.forEach((c) => {
      const name = typeof c === 'string' ? c : c?.nombre;
      if (name && !compSet.has(name)) {
        compSet.add(name);
        componentesUnicos.push(name);
      }
    });
  });

  const countMetricas = componentesUnicos.length;

  // Fecha format
  const rawFecha = primerInforme.fecha_servicio;
  let fechaLabel = 'Reciente';
  if (rawFecha) {
    try {
      const d = new Date(rawFecha);
      fechaLabel = d.toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      fechaLabel = String(rawFecha).slice(0, 10);
    }
  }

  // Calc km diff
  const tieneCambioKm = kmReportado > kmActual;
  const diffKm = tieneCambioKm ? kmReportado - kmActual : 0;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={styles.iconWrap}>
                  <RefreshCw size={20} color={COLORS.brand.orange} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.headerTitle}>Sincronizar Informe de Servicio</Text>
                  <Text style={styles.headerSubtitle}>{tallerNombre}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                disabled={syncing}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Scrollable body */}
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.introText}>
                Al sincronizar este informe, los datos registrados por el taller actualizarán automáticamente el historial y la puntuación de salud de tu vehículo.
              </Text>

              {/* 1. Métricas de Salud */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <ClipboardList size={18} color={COLORS.brand.magenta} strokeWidth={2} />
                  <Text style={styles.sectionTitle}>
                    {countMetricas > 0
                      ? `${countMetricas} métricas de salud serán actualizadas`
                      : 'Métricas de salud compatibles'}
                  </Text>
                </View>
                {countMetricas > 0 ? (
                  <View style={styles.chipsWrap}>
                    {componentesUnicos.map((compName, idx) => (
                      <View key={`comp-${idx}`} style={styles.chip}>
                        <Check size={12} color={COLORS.brand.magenta} strokeWidth={2.5} />
                        <Text style={styles.chipText}>{compName}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.sectionBody}>
                    El informe actualizará el historial del vehículo y verificará componentes asociados en el garaje.
                  </Text>
                )}
              </View>

              {/* 2. Kilometraje */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Gauge size={18} color={COLORS.primary[600]} strokeWidth={2} />
                  <Text style={styles.sectionTitle}>Kilometraje registrado</Text>
                </View>
                {tieneCambioKm ? (
                  <Text style={styles.sectionBody}>
                    El odómetro de tu vehículo se actualizará de{' '}
                    <Text style={styles.bold}>{kmActual.toLocaleString('es-CL')} km</Text> a{' '}
                    <Text style={styles.bold}>{kmReportado.toLocaleString('es-CL')} km</Text>{' '}
                    (<Text style={styles.highlightText}>+{diffKm.toLocaleString('es-CL')} km</Text>).
                  </Text>
                ) : kmReportado > 0 ? (
                  <Text style={styles.sectionBody}>
                    Kilometraje reportado en el taller: <Text style={styles.bold}>{kmReportado.toLocaleString('es-CL')} km</Text>.
                  </Text>
                ) : (
                  <Text style={styles.sectionBody}>
                    Se mantendrá el kilometraje actual registrado en tu garaje.
                  </Text>
                )}
              </View>

              {/* 3. Fecha y Degradación Temporal */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Calendar size={18} color={COLORS.brand.orange} strokeWidth={2} />
                  <Text style={styles.sectionTitle}>Fecha del servicio y degradación</Text>
                </View>
                <Text style={styles.sectionBody}>
                  Fecha del informe: <Text style={styles.bold}>{fechaLabel}</Text>.
                </Text>
                <Text style={styles.sectionHint}>
                  El sistema calculará automáticamente la degradación de los componentes inspeccionados según el tiempo transcurrido entre la fecha del servicio y hoy.
                </Text>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.footerActions}>
              <Button
                title={syncing ? 'Sincronizando…' : 'Confirmar y Sincronizar'}
                onPress={onConfirm}
                disabled={syncing}
                loading={syncing}
                type="primary"
                variant="solid"
                style={{ flex: 1 }}
              />
              <TouchableOpacity
                onPress={onClose}
                disabled={syncing}
                style={styles.cancelBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalSafeArea: {
    width: '100%',
    maxWidth: 480,
  },
  modalContent: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card.lg || 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    maxHeight: '90%',
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    paddingRight: SPACING.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: withOpacity(COLORS.brand.orange, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingVertical: SPACING.md,
  },
  introText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  sectionCard: {
    backgroundColor: COLORS.background.default,
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  sectionBody: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  sectionHint: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    lineHeight: 16,
    marginTop: 4,
  },
  bold: {
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  highlightText: {
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.brand.magenta,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: SPACING.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: withOpacity(COLORS.brand.magenta, 0.08),
    borderColor: withOpacity(COLORS.brand.magenta, 0.2),
    borderWidth: 1,
    borderRadius: BORDERS.radius.full || 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.brand.magenta,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
  },
  cancelBtnText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
});

export default React.memo(SyncConfirmationModal);
