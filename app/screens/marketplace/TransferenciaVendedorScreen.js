import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Alert,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { Clock, ScanLine, ShieldCheck, Share2, Check } from 'lucide-react-native';
import AppHeader from '../../components/navigation/AppHeader';
import Button from '../../components/base/Button/Button';
import Modal from '../../components/feedback/Modal/Modal';
import PrimaryGradientFill from '../../components/base/PrimaryGradientFill/PrimaryGradientFill';
import TransferenciaService from '../../services/transferenciaService';
import { shareTransferCode } from '../../utils/shareTransferCode';
import { buildTransferClaimUrl } from '../../config/publicListing';
import { ROUTES } from '../../utils/constants';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS } from '../../design-system/tokens';

const TransferenciaVendedorScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { vehicleId, offerId, vehicle } = route.params || {};

    const [loading, setLoading] = useState(true);
    const [tokenData, setTokenData] = useState(null);
    const [error, setError] = useState(null);
    const [sharing, setSharing] = useState(false);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [acceptShareRisks, setAcceptShareRisks] = useState(false);
    const pollingInterval = useRef(null);

    const vehicleLabel = useMemo(() => {
        const marca = vehicle?.marca?.nombre || vehicle?.marca_nombre || vehicle?.marca || '';
        const modelo = vehicle?.modelo?.nombre || vehicle?.modelo_nombre || vehicle?.modelo || '';
        const year = vehicle?.year || '';
        const base = [marca, modelo].filter(Boolean).join(' ');
        return year ? `${base} ${year}`.trim() : base || 'el vehículo';
    }, [vehicle]);

    const claimUrl = useMemo(() => {
        if (!tokenData?.token) return null;
        return buildTransferClaimUrl(tokenData.token);
    }, [tokenData?.token]);

    const stopPolling = useCallback(() => {
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
        }
    }, []);

    const startPolling = useCallback((transferId) => {
        stopPolling();
        if (!transferId) return;

        pollingInterval.current = setInterval(async () => {
            try {
                const status = await TransferenciaService.getTransferStatus(transferId);
                if (status.estado === 'COMPLETADO') {
                    stopPolling();
                    const vName = status.vehicle_name || [
                        vehicle?.marca?.nombre || vehicle?.marca_nombre,
                        vehicle?.modelo?.nombre || vehicle?.modelo_nombre,
                    ].filter(Boolean).join(' ') || 'Vehículo';
                    const vYear = status.vehicle_year || vehicle?.year || '';
                    navigation.replace(ROUTES.TRANSFERENCIA_EXITO, {
                        vehicleId: status.vehicle_id || vehicleId,
                        vehicleName: vYear ? `${vName} ${vYear}` : vName,
                        newOwner: status.new_owner || 'Nuevo dueño',
                    });
                }
            } catch (err) {
                console.log('Error polling transfer status:', err);
            }
        }, 5000);
    }, [navigation, stopPolling, vehicle, vehicleId]);

    useEffect(() => {
        let cancelled = false;

        const generateToken = async () => {
            try {
                if (!vehicleId && !offerId) {
                    throw new Error('ID de vehículo no proporcionado');
                }
                const data = await TransferenciaService.generateToken({ vehicleId, offerId });
                if (cancelled) return;
                setTokenData(data);
                startPolling(data.transfer_id);
            } catch (err) {
                console.error(err);
                if (cancelled) return;
                const message = err.message || 'Error generando el código de entrega';
                setError(message);
                Alert.alert('Error', 'No se pudo generar el código de transferencia. ' + message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        generateToken();

        return () => {
            cancelled = true;
            stopPolling();
        };
    }, [vehicleId, offerId, startPolling, stopPolling]);

    const handleCancel = () => {
        stopPolling();
        navigation.goBack();
    };

    const openShareModal = useCallback(() => {
        if (!tokenData?.token) return;
        setAcceptShareRisks(false);
        setShareModalVisible(true);
    }, [tokenData?.token]);

    const closeShareModal = useCallback(() => {
        if (sharing) return;
        setShareModalVisible(false);
        setAcceptShareRisks(false);
    }, [sharing]);

    const confirmShare = useCallback(async () => {
        if (!tokenData?.token || sharing || !acceptShareRisks) return;
        setSharing(true);
        try {
            await shareTransferCode(tokenData.token, vehicleLabel);
            setShareModalVisible(false);
            setAcceptShareRisks(false);
        } finally {
            setSharing(false);
        }
    }, [acceptShareRisks, sharing, tokenData?.token, vehicleLabel]);

    if (loading) {
        return (
            <SafeAreaView style={styles.focusRoot} edges={['top', 'bottom']}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary[500]} />
                    <Text style={[TYPOGRAPHY.styles.body, styles.loadingText]}>
                        Generando código seguro...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.focusRoot} edges={['top', 'bottom']}>
                <AppHeader title="Entrega Digital" onBack={handleCancel} />
                <View style={styles.centerContainer}>
                    <Text style={[TYPOGRAPHY.styles.body, styles.errorText]}>{error}</Text>
                    <Button
                        title="Volver"
                        onPress={handleCancel}
                        style={{ marginTop: SPACING.lg }}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.focusRoot} edges={['top', 'bottom']}>
            <AppHeader title="Entrega Digital" onBack={handleCancel} />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={[TYPOGRAPHY.styles.h2, styles.title]}>
                    Código de entrega
                </Text>
                <Text style={[TYPOGRAPHY.styles.body, styles.subtitle]}>
                    Muéstralo o compártelo por WhatsApp. Quien lo use con su cuenta recibe el historial.
                </Text>

                <View style={[styles.qrCard, SHADOWS.sm]}>
                    {claimUrl ? (
                        <View style={styles.qrContainer}>
                            <QRCode
                                value={claimUrl}
                                size={220}
                                color={COLORS.primary[500]}
                                backgroundColor={COLORS.background.paper}
                            />
                        </View>
                    ) : null}

                    <View style={styles.expiryRow}>
                        <Clock size={16} color={COLORS.text.secondary} strokeWidth={2} />
                        <Text style={[TYPOGRAPHY.styles.caption, styles.expiryText]}>
                            El código expira en 15 minutos
                        </Text>
                    </View>
                </View>

                <Button
                    title="Compartir por WhatsApp"
                    onPress={openShareModal}
                    disabled={!tokenData?.token}
                    fullWidth
                    style={styles.shareBtn}
                    iconNode={<Share2 size={18} color={COLORS.base.white} strokeWidth={2} />}
                />

                <View style={styles.instructions}>
                    <View style={styles.step}>
                        <View style={styles.stepIcon}>
                            <ScanLine size={18} color={COLORS.primary[500]} strokeWidth={2} />
                        </View>
                        <Text style={[TYPOGRAPHY.styles.body, styles.stepText]}>
                            El comprador puede escanear el QR en la app o abrir el enlace que le envíes.
                        </Text>
                    </View>
                    <View style={styles.step}>
                        <View style={styles.stepIcon}>
                            <ShieldCheck size={18} color={COLORS.primary[500]} strokeWidth={2} />
                        </View>
                        <Text style={[TYPOGRAPHY.styles.body, styles.stepText]}>
                            Confirma el pago antes de compartir. El enlace es como el QR: cualquiera con él puede reclamar el auto en esos 15 minutos.
                        </Text>
                    </View>
                </View>

                <Button
                    title="Cancelar"
                    variant="ghost"
                    onPress={handleCancel}
                    style={styles.cancelBtn}
                />
            </ScrollView>

            <Modal
                visible={shareModalVisible}
                onClose={closeShareModal}
                title="Antes de compartir"
                size="md"
                dismissible={!sharing}
                footer={(
                    <View style={styles.modalFooter}>
                        <Button
                            title="Cancelar"
                            variant="ghost"
                            onPress={closeShareModal}
                            disabled={sharing}
                            fullWidth
                        />
                        <Button
                            title={sharing ? 'Abriendo…' : 'Compartir enlace'}
                            onPress={confirmShare}
                            disabled={!acceptShareRisks || sharing}
                            isLoading={sharing}
                            fullWidth
                            style={styles.modalConfirmBtn}
                        />
                    </View>
                )}
            >
                <Text style={[TYPOGRAPHY.styles.body, styles.modalBody]}>
                    El enlace y el QR son equivalentes a una llave temporal. Quien lo abra con una cuenta
                    MecaniMovil distinta a la tuya puede recibir el historial de {vehicleLabel} mientras
                    el código esté vigente (15 minutos).
                </Text>
                <Text style={[TYPOGRAPHY.styles.caption, styles.modalHint]}>
                    Compártelo solo con el comprador y solo después de confirmar el pago.
                </Text>

                <TouchableOpacity
                    style={styles.acceptRow}
                    onPress={() => setAcceptShareRisks((v) => !v)}
                    activeOpacity={0.7}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: acceptShareRisks }}
                >
                    <View style={[styles.checkbox, acceptShareRisks && styles.checkboxCheckedWrap]}>
                        {acceptShareRisks ? (
                            <PrimaryGradientFill style={styles.checkboxFill}>
                                <Check size={14} color={COLORS.text.inverse} strokeWidth={2.5} />
                            </PrimaryGradientFill>
                        ) : null}
                    </View>
                    <Text style={[TYPOGRAPHY.styles.body, styles.acceptText]}>
                        Acepto los riesgos y confirmo que compartiré este código solo con el comprador.
                    </Text>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    focusRoot: {
        flex: 1,
        backgroundColor: COLORS.background.default,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    scrollContent: {
        paddingHorizontal: SPACING.container.horizontal,
        paddingBottom: SPACING.xl,
        alignItems: 'center',
    },
    title: {
        color: COLORS.text.primary,
        textAlign: 'center',
        marginTop: SPACING.md,
        marginBottom: SPACING.xs,
    },
    subtitle: {
        color: COLORS.text.secondary,
        textAlign: 'center',
        marginBottom: SPACING.lg,
        paddingHorizontal: SPACING.sm,
    },
    qrCard: {
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.card.lg,
        padding: SPACING.lg,
        alignItems: 'center',
        width: '100%',
        maxWidth: 340,
    },
    qrContainer: {
        padding: SPACING.sm,
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.md,
    },
    expiryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginTop: SPACING.lg,
    },
    expiryText: {
        color: COLORS.text.secondary,
    },
    shareBtn: {
        marginTop: SPACING.lg,
        width: '100%',
        maxWidth: 340,
    },
    instructions: {
        width: '100%',
        marginTop: SPACING.lg,
        gap: SPACING.md,
    },
    step: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.sm,
    },
    stepIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepText: {
        flex: 1,
        color: COLORS.text.secondary,
        lineHeight: 22,
        paddingTop: SPACING.xxs,
    },
    cancelBtn: {
        marginTop: SPACING.xl,
        width: '100%',
    },
    loadingText: {
        color: COLORS.text.secondary,
        marginTop: SPACING.md,
    },
    errorText: {
        color: COLORS.error.main,
        textAlign: 'center',
    },
    modalBody: {
        color: COLORS.text.primary,
        lineHeight: 22,
        marginBottom: SPACING.sm,
    },
    modalHint: {
        color: COLORS.text.secondary,
        lineHeight: 18,
        marginBottom: SPACING.md,
    },
    acceptRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.sm,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: COLORS.border.dark,
        backgroundColor: COLORS.background.paper,
        overflow: 'hidden',
        marginTop: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxCheckedWrap: {
        borderColor: COLORS.primary[500],
        padding: 0,
    },
    checkboxFill: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptText: {
        flex: 1,
        color: COLORS.text.primary,
        lineHeight: 20,
    },
    modalFooter: {
        width: '100%',
        gap: SPACING.xs,
    },
    modalConfirmBtn: {
        marginTop: SPACING.xxs,
    },
});

export default TransferenciaVendedorScreen;
