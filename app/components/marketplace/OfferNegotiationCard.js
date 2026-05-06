import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../base/Avatar/Avatar';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';

/**
 * OfferNegotiationCard
 *
 * Card to display negotiation offers in the marketplace.
 */
const OfferNegotiationCard = ({
    offer,
    onAccept,
    onReject,
    onChat,
    onTransfer,
    onReceive,
    onRequestInspection,
    inspectionDisabled = false,
    inspectionDisabledReason,
}) => {
    const {
        type = 'received',
        status = 'pending',
        amount,
        vehicle = {},
        counterpart = {}
    } = offer || {};

    const isReceived = type === 'received';
    const isPending = status === 'pending';
    const isAccepted = status === 'accepted';

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
    };

    const getStatusConfig = () => {
        switch (status) {
            case 'accepted':
                return {
                    label: 'ACEPTADA',
                    bgColor: COLORS.success[100],
                    textColor: COLORS.success[700],
                    icon: 'checkmark-circle'
                };
            case 'rejected':
                return {
                    label: 'RECHAZADA',
                    bgColor: COLORS.error[100],
                    textColor: COLORS.error[600],
                    icon: 'close-circle'
                };
            case 'completed':
                return {
                    label: isReceived ? 'VENDIDO' : 'COMPRADO',
                    bgColor: COLORS.primary[100],
                    textColor: COLORS.primary[700],
                    icon: isReceived ? 'pricetag' : 'car'
                };
            default:
                return {
                    label: 'PENDIENTE',
                    bgColor: COLORS.warning[100],
                    textColor: COLORS.warning[800],
                    icon: 'time'
                };
        }
    };

    const statusConfig = getStatusConfig();

    const headerBgColor = isReceived
        ? COLORS.neutral.gray[100]
        : COLORS.primary[50];

    const headerLabel = isReceived ? 'Oferta Recibida' : 'Oferta Enviada';

    return (
        <View style={styles.card}>
            <View style={[styles.header, { backgroundColor: headerBgColor }]}>
                <View style={styles.offerTypeContainer}>
                    <Ionicons
                        name={isReceived ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                        size={16}
                        color={COLORS.text.tertiary}
                    />
                    <Text style={styles.offerTypeLabel}>{headerLabel}</Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                    <Ionicons name={statusConfig.icon} size={12} color={statusConfig.textColor} style={{ marginRight: 4 }} />
                    <Text style={[styles.statusText, { color: statusConfig.textColor }]}>
                        {statusConfig.label}
                    </Text>
                </View>
            </View>

            <View style={styles.body}>
                <View style={styles.vehicleRow}>
                    <Image
                        source={vehicle.image ? { uri: vehicle.image } : null}
                        style={styles.vehicleThumb}
                        contentFit="cover"
                    />
                    <View style={styles.vehicleInfo}>
                        <Text style={styles.vehicleName}>
                            {vehicle.name || 'Vehículo sin nombre'}
                        </Text>
                        <View style={styles.counterpartContainer}>
                            <Avatar
                                source={counterpart.avatar}
                                name={counterpart.name}
                                size="xs"
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.counterpartName}>
                                {counterpart.name || 'Usuario'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.amountContainer}>
                    <Text style={styles.amountLabel}>Monto Ofertado</Text>
                    <Text style={styles.amountValue}>{formatCurrency(amount || 0)}</Text>
                </View>
            </View>

            {(isPending || isAccepted) && (
                <View style={styles.footer}>
                    {isPending && isReceived && (
                        <View style={styles.pendingActions}>
                            <TouchableOpacity
                                style={[styles.button, styles.rejectButton]}
                                onPress={onReject}
                            >
                                <Text style={styles.rejectButtonText}>Rechazar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.acceptButton]}
                                onPress={onAccept}
                            >
                                <Text style={[styles.buttonText, { color: COLORS.text.onPrimary }]}>Aceptar</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {isAccepted && (
                        <View style={{ gap: 8 }}>
                            <TouchableOpacity
                                style={[styles.button, styles.chatButton, styles.primaryBlue]}
                                onPress={onChat}
                            >
                                <Ionicons name="chatbubbles-outline" size={18} color={COLORS.text.onPrimary} style={{ marginRight: 8 }} />
                                <Text style={[styles.buttonText, { color: COLORS.text.onPrimary }]}>Ir al Chat de Negocios</Text>
                            </TouchableOpacity>

                            {isReceived ? (
                                <TouchableOpacity
                                    style={[styles.button, styles.chatButton, styles.secondaryCyan, { marginTop: 8 }]}
                                    onPress={onTransfer}
                                >
                                    <Ionicons name="qr-code-outline" size={18} color={COLORS.text.onPrimary} style={{ marginRight: 8 }} />
                                    <Text style={[styles.buttonText, { color: COLORS.text.onPrimary }]}>Entregar Vehículo (QR)</Text>
                                </TouchableOpacity>
                            ) : (
                                <>
                                    {onRequestInspection && (
                                        <TouchableOpacity
                                            style={[
                                                styles.button,
                                                styles.chatButton,
                                                styles.inspectionButton,
                                                inspectionDisabled && styles.inspectionButtonDisabled,
                                                { marginTop: 8 },
                                            ]}
                                            activeOpacity={inspectionDisabled ? 1 : 0.7}
                                            onPress={() => {
                                                if (inspectionDisabled) {
                                                    Alert.alert(
                                                        'Inspección ya solicitada',
                                                        inspectionDisabledReason ||
                                                            'Ya tienes una inspección pre-compra activa para este vehículo. Revisa Mis solicitudes o espera a que finalice o expire.'
                                                    );
                                                    return;
                                                }
                                                onRequestInspection();
                                            }}
                                        >
                                            <Ionicons
                                                name="shield-checkmark-outline"
                                                size={18}
                                                color={inspectionDisabled ? COLORS.text.disabled : COLORS.text.onPrimary}
                                                style={{ marginRight: 8 }}
                                            />
                                            <Text
                                                style={[
                                                    styles.buttonText,
                                                    {
                                                        color: inspectionDisabled ? COLORS.text.disabled : COLORS.text.onPrimary,
                                                    },
                                                ]}
                                            >
                                                Solicitar Inspección Pre-Compra
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={[styles.button, styles.chatButton, styles.secondaryCyan, { marginTop: 8 }]}
                                        onPress={onReceive}
                                    >
                                        <Ionicons name="scan-outline" size={18} color={COLORS.text.onPrimary} style={{ marginRight: 8 }} />
                                        <Text style={[styles.buttonText, { color: COLORS.text.onPrimary }]}>Recibir Vehículo (Escanear)</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    )}

                    {isPending && !isReceived && (
                        <View style={styles.waitingContainer}>
                            <Text style={styles.waitingText}>
                                Esperando respuesta del vendedor...
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.lg,
        marginBottom: 16,
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: BORDERS.width.thin,
        borderBottomColor: COLORS.border.light,
    },
    offerTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    offerTypeLabel: {
        marginLeft: 6,
        fontWeight: '500',
        fontSize: 12,
        color: COLORS.text.secondary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BORDERS.radius.badge.sm,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    body: {
        padding: 16,
    },
    vehicleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    vehicleThumb: {
        width: 60,
        height: 60,
        marginRight: 12,
        borderRadius: BORDERS.radius.md,
        backgroundColor: COLORS.neutral.gray[200],
    },
    vehicleInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    vehicleName: {
        marginBottom: 4,
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text.primary,
    },
    counterpartContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    counterpartName: {
        color: COLORS.text.secondary,
        fontSize: 14,
    },
    amountContainer: {
        padding: 12,
        alignItems: 'center',
        borderWidth: BORDERS.width.thin,
        borderStyle: 'dashed',
        borderColor: COLORS.primary[200],
        borderRadius: BORDERS.radius.md,
        backgroundColor: COLORS.primary[50],
    },
    amountLabel: {
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontSize: 12,
        color: COLORS.text.tertiary,
    },
    amountValue: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.primary[700],
    },
    footer: {
        padding: 16,
        paddingTop: 0,
    },
    pendingActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 12,
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        height: 46,
        borderRadius: BORDERS.radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rejectButton: {
        backgroundColor: 'transparent',
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.error[300],
    },
    rejectButtonText: {
        color: COLORS.error[600],
        fontSize: 14,
        fontWeight: '600',
    },
    acceptButton: {
        backgroundColor: COLORS.success[500],
    },
    primaryBlue: {
        backgroundColor: COLORS.primary[500],
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.primary[600],
    },
    secondaryCyan: {
        backgroundColor: COLORS.primary[600],
    },
    inspectionButton: {
        backgroundColor: COLORS.success[500],
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.success[600],
    },
    inspectionButtonDisabled: {
        backgroundColor: COLORS.neutral.gray[100],
        borderColor: COLORS.border.light,
    },
    chatButton: {
        width: '100%',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    waitingContainer: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    waitingText: {
        color: COLORS.text.tertiary,
        fontSize: 13,
        fontStyle: 'italic',
    },
});

export default OfferNegotiationCard;
