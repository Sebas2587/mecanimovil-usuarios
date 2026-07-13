import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { Clock, ScanLine, ShieldCheck } from 'lucide-react-native';
import AppHeader from '../../components/navigation/AppHeader';
import Button from '../../components/base/Button/Button';
import TransferenciaService from '../../services/transferenciaService';
import { ROUTES } from '../../utils/constants';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS } from '../../design-system/tokens';

const TransferenciaVendedorScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { vehicleId, offerId, vehicle } = route.params || {};

    const [loading, setLoading] = useState(true);
    const [tokenData, setTokenData] = useState(null);
    const [error, setError] = useState(null);
    const pollingInterval = useRef(null);

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
                    Muestra este código al comprador para transferir el vehículo e historial.
                </Text>

                <View style={[styles.qrCard, SHADOWS.sm]}>
                    {tokenData ? (
                        <View style={styles.qrContainer}>
                            <QRCode
                                value={tokenData.token}
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

                <View style={styles.instructions}>
                    <View style={styles.step}>
                        <View style={styles.stepIcon}>
                            <ScanLine size={18} color={COLORS.primary[500]} strokeWidth={2} />
                        </View>
                        <Text style={[TYPOGRAPHY.styles.body, styles.stepText]}>
                            El comprador debe escanear este código desde su App (Transferir vehículo → Escanear QR).
                        </Text>
                    </View>
                    <View style={styles.step}>
                        <View style={styles.stepIcon}>
                            <ShieldCheck size={18} color={COLORS.primary[500]} strokeWidth={2} />
                        </View>
                        <Text style={[TYPOGRAPHY.styles.body, styles.stepText]}>
                            Confirma que has recibido el pago antes de mostrar este código.
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
});

export default TransferenciaVendedorScreen;
