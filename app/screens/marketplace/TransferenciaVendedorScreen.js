import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../design-system/theme/useTheme';
import Container from '../../components/layout/Container/Container'; // Adjusted path based on structure
import Button from '../../components/base/Button/Button'; // Adjusted path based on structure
import TransferenciaService from '../../services/transferenciaService';
import { getOfferById } from '../../services/vehicle';
import { ROUTES } from '../../utils/constants'; // Assuming ROUTES exists

const TransferenciaVendedorScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const route = useRoute();
    const { offerId } = route.params || {};

    const [loading, setLoading] = useState(true);
    const [tokenData, setTokenData] = useState(null);
    const [error, setError] = useState(null);
    const pollingInterval = useRef(null);

    const colors = theme.colors;
    const typography = theme.typography;
    const spacing = theme.spacing;

    // 1. Generar Token al montar
    useEffect(() => {
        const generateToken = async () => {
            try {
                if (!offerId) {
                    throw new Error('ID de oferta no proporcionado');
                }
                const data = await TransferenciaService.generateToken(offerId);
                setTokenData(data);
                startPolling();
            } catch (err) {
                console.error(err);
                setError(err.message || 'Error generando el código de entrega');
                Alert.alert('Error', 'No se pudo generar el código de transferencia. ' + (err.message || ''));
            } finally {
                setLoading(false);
            }
        };

        generateToken();

        return () => stopPolling();
    }, [offerId]);

    // 2. Polling para verificar estado de la oferta
    const startPolling = () => {
        stopPolling();
        pollingInterval.current = setInterval(async () => {
            try {
                const offer = await getOfferById(offerId);
                if (offer.estado === 'completada' || offer.estado === 'vendido') {
                    stopPolling();
                    navigation.replace(ROUTES.TRANSFERENCIA_EXITO || 'TransferenciaExito', {
                        vehicleId: offer.vehiculo?.id,
                        vehicleName: `${offer.vehiculo?.marca?.nombre} ${offer.vehiculo?.modelo?.nombre}`,
                        newOwner: offer.comprador?.username || 'Comprador'
                    });
                }
            } catch (err) {
                console.log('Error polling offer status:', err);
            }
        }, 6000); // Check every 6 seconds
    };

    const stopPolling = () => {
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
        }
    };

    const handleCancel = () => {
        stopPolling();
        navigation.goBack();
    };

    if (loading) {
        return (
            <Container style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
                <Text style={[styles.loadingText, { color: colors.text.secondary, marginTop: spacing.md }]}>
                    Generando código seguro...
                </Text>
            </Container>
        );
    }

    if (error) {
        return (
            <Container style={styles.centerContainer}>
                <Text style={[styles.errorText, { color: colors.error.main }]}>{error}</Text>
                <Button
                    title="Volver"
                    onPress={handleCancel}
                    style={{ marginTop: spacing.lg }}
                />
            </Container>
        );
    }

    return (
        <Container safeArea>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text.primary, fontSize: typography.fontSize['2xl'] }]}>
                        Entrega Digital
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.text.secondary, fontSize: typography.fontSize.md }]}>
                        Muestra este código al comprador para transferir el vehículo instantáneamente.
                    </Text>
                </View>

                <View style={[styles.card, {
                    backgroundColor: colors.background.paper,
                    borderRadius: theme.borders.radius.card.lg,
                    padding: spacing.xl,
                    shadowColor: colors.text.primary,
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                    elevation: 5
                }]}>
                    {tokenData && (
                        <View style={styles.qrContainer}>
                            <QRCode
                                value={tokenData.token} // En este caso el backend espera el token en complete_transfer
                                size={220}
                                color={colors.primary[500]}
                                backgroundColor="white"
                            />
                        </View>
                    )}

                    <Text style={[styles.codeInstruction, { color: colors.text.secondary, marginTop: spacing.lg }]}>
                        El código expira en 15 minutos
                    </Text>
                </View>

                <View style={styles.instructions}>
                    <View style={styles.step}>
                        <View style={[styles.stepBadge, { backgroundColor: colors.primary[100] }]}>
                            <Text style={[styles.stepNumber, { color: colors.primary[700] }]}>1</Text>
                        </View>
                        <Text style={[styles.stepText, { color: colors.text.secondary }]}>
                            El comprador debe escanear este código desde su App.
                        </Text>
                    </View>
                    <View style={styles.step}>
                        <View style={[styles.stepBadge, { backgroundColor: colors.primary[100] }]}>
                            <Text style={[styles.stepNumber, { color: colors.primary[700] }]}>2</Text>
                        </View>
                        <Text style={[styles.stepText, { color: colors.text.secondary }]}>
                            Confirma que has recibido el pago antes de mostrar este código.
                        </Text>
                    </View>
                </View>

                <Button
                    title="Cancelar / Volver"
                    variant="ghost"
                    onPress={handleCancel}
                    style={{ marginTop: spacing.xl }}
                />
            </ScrollView>
        </Container>
    );
};

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    scrollContent: {
        padding: 20,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    card: {
        alignItems: 'center',
        width: '100%',
        maxWidth: 340,
    },
    qrContainer: {
        padding: 10,
        backgroundColor: 'white',
        borderRadius: 10,
    },
    codeInstruction: {
        fontSize: 14,
        fontWeight: '500',
    },
    instructions: {
        width: '100%',
        marginTop: 30,
    },
    step: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    stepBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    stepNumber: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    stepText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
});

export default TransferenciaVendedorScreen;
