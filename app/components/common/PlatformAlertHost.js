import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
import { lucideSafeProps } from '../../design-system/icons/lucideDefaults';
import { registerPlatformAlertHost } from '../../utils/platformAlert';
import Button from '../base/Button/Button';

/**
 * Diálogos in-app en web (Alert.alert / window.confirm no son fiables en RN Web).
 * Superficies Airbnb + CTAs Tinder (tokens); tipografía Poppins.
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

  const renderDialogChrome = ({ title, message, destructive, children }) => (
    <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation?.()}>
      {destructive ? (
        <View style={styles.iconWrap}>
          <AlertTriangle size={24} color={COLORS.error[600]} {...lucideSafeProps()} />
        </View>
      ) : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {children}
    </Pressable>
  );

  return (
    <>
      <Modal
        visible={!!simpleState}
        transparent
        animationType="fade"
        onRequestClose={resolveSimple}
      >
        <Pressable style={styles.overlay} onPress={resolveSimple}>
          {renderDialogChrome({
            title: simpleState?.title,
            message: simpleState?.message,
            children: (
              <View style={styles.actionsCol}>
                <Button
                  title={simpleState?.buttonText || 'Entendido'}
                  type="primary"
                  size="md"
                  fullWidth
                  onPress={resolveSimple}
                />
              </View>
            ),
          })}
        </Pressable>
      </Modal>

      <Modal
        visible={!!confirmState}
        transparent
        animationType="fade"
        onRequestClose={() => resolveConfirm(false)}
      >
        <Pressable style={styles.overlay} onPress={() => resolveConfirm(false)}>
          {renderDialogChrome({
            title: confirmState?.title,
            message: confirmState?.message,
            destructive: !!confirmState?.destructive,
            children: (
              <View style={styles.actionsRow}>
                <Button
                  title={confirmState?.cancelText || 'Cancelar'}
                  type="secondary"
                  variant="outline"
                  size="md"
                  style={styles.actionFlex}
                  onPress={() => resolveConfirm(false)}
                />
                <Button
                  title={confirmState?.confirmText || 'Aceptar'}
                  type={confirmState?.destructive ? 'danger' : 'primary'}
                  size="md"
                  style={styles.actionFlex}
                  onPress={() => resolveConfirm(true)}
                />
              </View>
            ),
          })}
        </Pressable>
      </Modal>

      <Modal
        visible={!!actionState}
        transparent
        animationType="fade"
        onRequestClose={() => resolveAction(null)}
      >
        <Pressable style={styles.overlay} onPress={() => resolveAction(null)}>
          {renderDialogChrome({
            title: actionState?.title,
            message: actionState?.message,
            children: (
              <View style={styles.actionsCol}>
                {(actionState?.buttons || []).map((btn) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';
                  return (
                    <Button
                      key={btn.text}
                      title={btn.text}
                      type={isDestructive ? 'danger' : isCancel ? 'secondary' : 'primary'}
                      variant={isCancel ? 'outline' : 'solid'}
                      size="md"
                      fullWidth
                      onPress={() => resolveAction(btn)}
                    />
                  );
                })}
              </View>
            ),
          })}
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
    borderRadius: BORDERS.radius.modal.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    padding: SPACING.lg,
    alignItems: 'stretch',
    ...SHADOWS.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.error[50],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  message: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.sm,
  },
  actionsCol: {
    gap: SPACING.sm,
  },
  actionFlex: {
    flex: 1,
  },
});

export default PlatformAlertHost;
