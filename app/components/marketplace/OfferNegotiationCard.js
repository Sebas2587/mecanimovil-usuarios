import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../base/Avatar/Avatar';

const GLASS_BG = Platform.select({
    ios: 'rgba(255,255,255,0.06)',
    android: 'rgba(255,255,255,0.10)',
    default: 'rgba(255,255,255,0.08)',
});

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
    onReceive
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
                    bgColor: 'rgba(16,185,129,0.18)',
                    textColor: '#6EE7B7',
                    icon: 'checkmark-circle'
                };
            case 'rejected':
                return {
                    label: 'RECHAZADA',
                    bgColor: 'rgba(248,113,113,0.15)',
                    textColor: '#FCA5A5',
                    icon: 'close-circle'
                };
            case 'completed':
                return {
                    label: isReceived ? 'VENDIDO' : 'COMPRADO',
                    bgColor: 'rgba(147,197,253,0.15)',
                    textColor: '#93C5FD',
                    icon: isReceived ? 'pricetag' : 'car'
                };
            default:
                return {
                    label: 'PENDIENTE',
                    bgColor: 'rgba(245,158,11,0.18)',
                    textColor: '#FCD34D',
                    icon: 'time'
                };
        }
    };

    const statusConfig = getStatusConfig();

    const headerBgColor = isReceived
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(147,197,253,0.08)';

    const headerLabel = isReceived ? 'Oferta Recibida' : 'Oferta Enviada';

    return (
        <View style={styles.card}>
            <View style={[styles.header, { backgroundColor: headerBgColor }]}>
                <View style={styles.offerTypeContainer}>
                    <Ionicons
                        name={isReceived ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                        size={16}
                        color="rgba(255,255,255,0.55)"
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
                                <Text style={[styles.buttonText, { color: '#FFF' }]}>Aceptar</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {isAccepted && (
                        <View style={{ gap: 8 }}>
                            <TouchableOpacity
                                style={[styles.button, styles.chatButton, styles.primaryBlue]}
                                onPress={onChat}
                            >
                                <Ionicons name="chatbubbles-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={[styles.buttonText, { color: '#FFF' }]}>Ir al Chat de Negocios</Text>
                            </TouchableOpacity>

                            {isReceived ? (
                                <TouchableOpacity
                                    style={[styles.button, styles.chatButton, styles.secondaryCyan, { marginTop: 8 }]}
                                    onPress={onTransfer}
                                >
                                    <Ionicons name="qr-code-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={[styles.buttonText, { color: '#FFF' }]}>Entregar Vehículo (QR)</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.button, styles.chatButton, styles.secondaryCyan, { marginTop: 8 }]}
                                    onPress={onReceive}
                                >
                                    <Ionicons name="scan-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={[styles.buttonText, { color: '#FFF' }]}>Recibir Vehículo (Escanear)</Text>
                                </TouchableOpacity>
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
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: GLASS_BG,
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    offerTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    offerTypeLabel: {
        marginLeft: 6,
        fontWeight: '500',
        fontSize: 12,
        color: 'rgba(255,255,255,0.55)',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
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
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    vehicleInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    vehicleName: {
        marginBottom: 4,
        fontSize: 16,
        fontWeight: '600',
        color: '#F9FAFB',
    },
    counterpartContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    counterpartName: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 14,
    },
    amountContainer: {
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(147,197,253,0.35)',
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    amountLabel: {
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontSize: 12,
        color: 'rgba(255,255,255,0.45)',
    },
    amountValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#93C5FD',
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
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rejectButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(248,113,113,0.55)',
    },
    rejectButtonText: {
        color: '#FCA5A5',
        fontSize: 14,
        fontWeight: '600',
    },
    acceptButton: {
        backgroundColor: 'rgba(16,185,129,0.85)',
    },
    primaryBlue: {
        backgroundColor: 'rgba(30,58,138,0.9)',
        borderWidth: 1,
        borderColor: 'rgba(147,197,253,0.25)',
    },
    secondaryCyan: {
        backgroundColor: 'rgba(8,145,178,0.85)',
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
        color: 'rgba(255,255,255,0.45)',
        fontSize: 13,
        fontStyle: 'italic',
    },
});

export default OfferNegotiationCard;
