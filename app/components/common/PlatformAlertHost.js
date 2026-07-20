import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { AlertTriangle, LogOut } from 'lucide-react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
import { lucideSafeProps } from '../../design-system/icons/lucideDefaults';
import { registerPlatformAlertHost } from '../../utils/platformAlert';
import Button from '../base/Button/Button';

/**
 * Un solo Modal para alert / confirm / choose.
 * Montar UNA vez en App.js — evita el “doble diseño” al cerrar (varios hosts o Modals apilados).
 */
const PlatformAlertHost = () => {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);
  const hostIdRef = useRef(null);

  const closeWith = useCallback((payload) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setDialog(null);
    resolve?.(payload);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;

    const id = registerPlatformAlertHost({
      alert: ({ title, message, buttonText = 'Entendido' }) =>
        new Promise((resolve) => {
          resolverRef.current = resolve;
          setDialog({
            mode: 'alert',
            title,
            message,
            buttonText,
          });
        }),
      confirm: ({
        title,
        message,
        confirmText = 'Aceptar',
        cancelText = 'Cancelar',
        destructive = false,
      }) =>
        new Promise((resolve) => {
          resolverRef.current = resolve;
          setDialog({
            mode: 'confirm',
            title,
            message,
            confirmText,
            cancelText,
            destructive,
          });
        }),
      choose: ({ title, message, buttons = [] }) =>
        new Promise((resolve) => {
          resolverRef.current = resolve;
          setDialog({
            mode: 'choose',
            title,
            message,
            buttons,
          });
        }),
    });
    hostIdRef.current = id;

    return () => registerPlatformAlertHost(null, hostIdRef.current);
  }, []);

  if (Platform.OS !== 'web') return null;

  const isLogoutConfirm = Boolean(
    dialog?.mode === 'confirm'
    && dialog?.destructive
    && /sesi[oó]n|salir|logout/i.test(
      `${dialog?.title || ''} ${dialog?.confirmText || ''}`,
    ),
  );

  const paragraphs = dialog?.message
    ? String(dialog.message)
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  const renderActions = () => {
    if (!dialog) return null;

    if (dialog.mode === 'alert') {
      return (
        <View style={styles.actionsCol}>
          <Button
            title={dialog.buttonText || 'Entendido'}
            type="primary"
            size="md"
            fullWidth
            onPress={() => closeWith(undefined)}
          />
        </View>
      );
    }

    if (dialog.mode === 'confirm') {
      if (dialog.destructive) {
        return (
          <View style={styles.actionsCol}>
            <Button
              title={dialog.cancelText || 'Cancelar'}
              type="secondary"
              variant="outline"
              size="md"
              fullWidth
              onPress={() => closeWith(false)}
            />
            <Button
              title={dialog.confirmText || 'Aceptar'}
              type="danger"
              variant="outline"
              size="md"
              fullWidth
              onPress={() => closeWith(true)}
            />
          </View>
        );
      }
      return (
        <View style={styles.actionsRow}>
          <Button
            title={dialog.cancelText || 'Cancelar'}
            type="secondary"
            variant="outline"
            size="md"
            style={styles.actionFlex}
            onPress={() => closeWith(false)}
          />
          <Button
            title={dialog.confirmText || 'Aceptar'}
            type="primary"
            size="md"
            style={styles.actionFlex}
            onPress={() => closeWith(true)}
          />
        </View>
      );
    }

    if (dialog.mode === 'choose') {
      return (
        <View style={styles.actionsCol}>
          {(dialog.buttons || []).map((btn) => {
            const isCancel = btn.style === 'cancel';
            const isDestructive = btn.style === 'destructive';
            return (
              <Button
                key={btn.text}
                title={btn.text}
                type={isDestructive ? 'danger' : isCancel ? 'secondary' : 'primary'}
                variant={isCancel || isDestructive ? 'outline' : 'solid'}
                size="md"
                fullWidth
                onPress={() => closeWith(btn)}
              />
            );
          })}
        </View>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={!!dialog}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (dialog?.mode === 'confirm') closeWith(false);
        else if (dialog?.mode === 'choose') closeWith(null);
        else closeWith(undefined);
      }}
    >
      <Pressable
        style={styles.overlay}
        onPress={() => {
          if (dialog?.mode === 'confirm') closeWith(false);
          else if (dialog?.mode === 'choose') closeWith(null);
          else closeWith(undefined);
        }}
      >
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation?.()}>
          {dialog?.mode === 'confirm' && dialog.destructive ? (
            <View
              style={[
                styles.iconWrap,
                isLogoutConfirm ? styles.iconWrapWarn : styles.iconWrapDanger,
              ]}
            >
              {isLogoutConfirm ? (
                <LogOut size={22} color={COLORS.icon.active} strokeWidth={1.75} {...lucideSafeProps()} />
              ) : (
                <AlertTriangle size={22} color={COLORS.error.main} strokeWidth={1.75} {...lucideSafeProps()} />
              )}
            </View>
          ) : null}

          {dialog?.title ? <Text style={styles.title}>{dialog.title}</Text> : null}

          {paragraphs.length <= 1 ? (
            dialog?.message ? <Text style={styles.message}>{dialog.message}</Text> : null
          ) : (
            <View style={styles.messageBlock}>
              {paragraphs.map((p) => (
                <Text key={p.slice(0, 48)} style={styles.messageParagraph}>
                  {p}
                </Text>
              ))}
            </View>
          )}

          {renderActions()}
        </Pressable>
      </Pressable>
    </Modal>
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    padding: SPACING.xl,
    alignItems: 'stretch',
    ...SHADOWS.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: BORDERS.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  iconWrapDanger: {
    backgroundColor: COLORS.background.error,
  },
  iconWrapWarn: {
    backgroundColor: COLORS.selection.background,
  },
  title: {
    ...TYPOGRAPHY.styles.h3,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    textAlign: 'left',
    marginBottom: SPACING.sm,
  },
  message: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    textAlign: 'left',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  messageBlock: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  messageParagraph: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    textAlign: 'left',
    lineHeight: 22,
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
