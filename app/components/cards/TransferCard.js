import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArrowRightLeft } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, BORDERS, SPACING } from '../../design-system/tokens';
import Button from '../base/Button/Button';
import PrimaryGradientBadge from '../base/PrimaryGradientBadge/PrimaryGradientBadge';

const TransferCard = ({
  vehicleName,
  items = [],
  onStartTransfer,
  onScanQR,
}) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <ArrowRightLeft size={24} color={COLORS.primary[500]} />
      <Text style={[TYPOGRAPHY.styles.h3, styles.title]}>Transferir vehículo</Text>
    </View>
    <Text style={[TYPOGRAPHY.styles.caption, styles.sub]}>
      {vehicleName ? `${vehicleName} — ` : ''}
      Se traspasará historial, salud y datos del vehículo al nuevo dueño.
    </Text>
    {items.map((item, i) => (
      <View key={i} style={styles.itemRow}>
        <PrimaryGradientBadge style={styles.bullet} />
        <Text style={[TYPOGRAPHY.styles.body, styles.itemText]}>{item}</Text>
      </View>
    ))}
    <View style={styles.actions}>
      {onStartTransfer ? (
        <Button title="Generar QR (vendedor)" onPress={onStartTransfer} fullWidth />
      ) : null}
      {onScanQR ? (
        <Button
          title="Escanear QR (comprador)"
          type="secondary"
          variant="outline"
          onPress={onScanQR}
          fullWidth
          style={styles.scanBtn}
        />
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.container.horizontal,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  title: { color: COLORS.text.primary },
  sub: { color: COLORS.text.secondary, marginTop: SPACING.sm },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginTop: SPACING.sm },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  itemText: { flex: 1, color: COLORS.text.primary },
  actions: { marginTop: SPACING.lg, gap: SPACING.sm },
  scanBtn: { marginTop: SPACING.xs },
});

export default React.memo(TransferCard);
