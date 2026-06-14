import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
import { registerPlatformAlertHost } from '../../utils/platformAlert';

/**
 * Diálogos in-app en web (Alert.alert / window.confirm no son fiables en RN Web).
 */
const PlatformAlertHost = () => {
  const [confirmState, setConfirmState] = useState(null);
  const [actionState, setActionState] = useState(null);
  const [simpleState, setSimpleState] = useState(null);
  const confirmResolverRef = useRef(null);
  const actionResolverRef = useRef(null);
  const simpleResolverRef = useRef(null);

  const resolveConfirm = useCallback((value) => {
    confirmResolverRef.current?.(value);
    confirmResolverRef.current = null;
    setConfirmState(null);
  }, []);

  const resolveAction = useCallback((button) => {
    actionResolverRef.current?.(button);
    actionResolverRef.current = null;
    setActionState(null);
  }, []);

  const resolveSimple = useCallback(() => {
    simpleResolverRef.current?.();
    simpleResolverRef.current = null;
    setSimpleState(null);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;

    registerPlatformAlertHost({
      alert: ({ title, message, buttonText = 'Entendido' }) =>
        new Promise((resolve) => {
          simpleResolverRef.current = resolve;
          setSimpleState({ title, message, buttonText });
        }),
      confirm: ({ title, message, confirmText = 'Aceptar', cancelText = 'Cancelar', destructive = false }) =>
        new Promise((resolve) => {
          confirmResolverRef.current = resolve;
          setConfirmState({ title, message, confirmText, cancelText, destructive });
        }),
      choose: ({ title, message, buttons = [] }) =>
        new Promise((resolve) => {
          actionResolverRef.current = resolve;
          setActionState({ title, message, buttons });
        }),
    });

    return () => registerPlatformAlertHost(null);
  }, []);

  if (Platform.OS !== 'web') return null;

  return (
    <>
      <Modal
        visible={!!simpleState}
        transparent
        animationType="fade"
        onRequestClose={resolveSimple}
      >
        <Pressable style={styles.overlay} onPress={resolveSimple}>
          <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation?.()}>
            {simpleState?.title ? (
              <Text style={styles.title}>{simpleState.title}</Text>
            ) : null}
            {simpleState?.message ? (
              <Text style={styles.message}>{simpleState.message}</Text>
            ) : null}
            <View style={[styles.actionsRow, styles.actionsRowSingle]}>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary, styles.buttonFull]}
                onPress={resolveSimple}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonPrimaryText}>
                  {simpleState?.buttonText || 'Entendido'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!confirmState}
        transparent
        animationType="fade"
        onRequestClose={() => resolveConfirm(false)}
      >
        <Pressable style={styles.overlay} onPress={() => resolveConfirm(false)}>
          <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation?.()}>
            {confirmState?.title ? (
              <Text style={styles.title}>{confirmState.title}</Text>
            ) : null}
            {confirmState?.message ? (
              <Text style={styles.message}>{confirmState.message}</Text>
            ) : null}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => resolveConfirm(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonSecondaryText}>{confirmState?.cancelText || 'Cancelar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  confirmState?.destructive ? styles.buttonDestructive : styles.buttonPrimary,
                ]}
                onPress={() => resolveConfirm(true)}
                activeOpacity={0.85}
              >
                <Text
                  style={
                    confirmState?.destructive
                      ? styles.buttonDestructiveText
                      : styles.buttonPrimaryText
                  }
                >
                  {confirmState?.confirmText || 'Aceptar'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!actionState}
        transparent
        animationType="fade"
        onRequestClose={() => resolveAction(null)}
      >
        <Pressable style={styles.overlay} onPress={() => resolveAction(null)}>
          <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation?.()}>
            {actionState?.title ? (
              <Text style={styles.title}>{actionState.title}</Text>
            ) : null}
            {actionState?.message ? (
              <Text style={styles.message}>{actionState.message}</Text>
            ) : null}
            <View style={styles.actionList}>
              {(actionState?.buttons || []).map((btn) => (
                <TouchableOpacity
                  key={btn.text}
                  style={[
                    styles.actionItem,
                    btn.style === 'cancel' && styles.actionItemCancel,
                    btn.style === 'destructive' && styles.actionItemDestructive,
                  ]}
                  onPress={() => resolveAction(btn)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.actionItemText,
                      btn.style === 'cancel' && styles.actionItemTextCancel,
                      btn.style === 'destructive' && styles.actionItemTextDestructive,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.background.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  message: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  actionsRowSingle: {
    justifyContent: 'stretch',
  },
  button: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius.md,
    minWidth: 96,
    alignItems: 'center',
  },
  buttonFull: {
    flex: 1,
    minWidth: 0,
  },
  buttonSecondary: {
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  buttonSecondaryText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary[500],
  },
  buttonPrimaryText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.onPrimary,
  },
  buttonDestructive: {
    backgroundColor: COLORS.error[500],
  },
  buttonDestructiveText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
  actionList: {
    gap: SPACING.xs,
  },
  actionItem: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[50],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    alignItems: 'center',
  },
  actionItemCancel: {
    backgroundColor: COLORS.background.paper,
  },
  actionItemDestructive: {
    backgroundColor: COLORS.error[50],
    borderColor: COLORS.error[200],
  },
  actionItemText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  actionItemTextCancel: {
    color: COLORS.text.secondary,
  },
  actionItemTextDestructive: {
    color: COLORS.error[700],
  },
});

export default PlatformAlertHost;
