import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';
import Avatar from '../base/Avatar/Avatar';

/**
 * OfferNegotiationCard
 * 
 * Card to display negotiation offers in the marketplace.
 * Distinguishes between sent and received offers, shows status, and provides actions.
 * 
 * @param {Object} offer - The offer object containing details
 * @param {Function} onAccept - Callback for accepting the offer
 * @param {Function} onReject - Callback for rejecting the offer
 * @param {Function} onChat - Callback for navigating to chat
 */
const OfferNegotiationCard = ({
    offer,
    onAccept,
    onReject,
    onChat,
    onTransfer,
    onReceive
}) => {
    const theme = useTheme();
    const colors = theme.colors || {};
    const typography = theme.typography || {};
    const spacing = theme.spacing || {};
    const borders = theme.borders || {};

    // Destructure offer data (mock structure based on requirements)
    // Assuming offer structure: { id, type: 'sent'|'received', status: 'pending'|'accepted'|'rejected', amount, vehicle: { name, image }, counterpart: { name, avatar }, createdAt }
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
    const isRejected = status === 'rejected';
    const isCompleted = status === 'completed';

    // formatting currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
    };

    // Status Badge Configuration
    const getStatusConfig = () => {
        switch (status) {
            case 'accepted':
                return {
                    label: 'ACEPTADA',
                    bgColor: colors.success?.light || '#DCFCE7',
                    textColor: colors.success?.main || '#16A34A',
                    icon: 'checkmark-circle'
                };
            case 'rejected':
                return {
                    label: 'RECHAZADA',
                    bgColor: colors.error?.light || '#FEE2E2',
                    textColor: colors.error?.main || '#DC2626',
                    icon: 'close-circle'
                };
            case 'completed':
                return {
                    label: isReceived ? 'VENDIDO' : 'COMPRADO',
                    bgColor: colors.primary?.light || '#E0F2FE',
                    textColor: colors.primary?.main || '#003459',
                    icon: isReceived ? 'pricetag' : 'car'
                };
            default:
                return {
                    label: 'PENDIENTE',
                    bgColor: colors.warning?.light || '#FEF3C7',
                    textColor: colors.warning?.main || '#D97706',
                    icon: 'time'
                };
        }
    };

    const statusConfig = getStatusConfig();

    // Header Colors based on type
    const headerBgColor = isReceived
        ? (colors.neutral?.surface || '#F3F4F6') // Gray for Selling (Received offer)
        : 'rgba(0, 52, 89, 0.05)'; // Blue tint for Buying (Sent offer)

    const headerLabel = isReceived ? 'Oferta Recibida' : 'Oferta Enviada';

    return (
        <View style={[
            styles.card,
            {
                backgroundColor: colors.background?.paper || '#FFF',
                borderColor: colors.border?.default || '#E5E7EB',
                borderRadius: borders.radius?.lg || 12
            }
        ]}>
            {/* Header */}
            <View style={[
                styles.header,
                {
                    backgroundColor: headerBgColor,
                    borderTopLeftRadius: borders.radius?.lg || 12,
                    borderTopRightRadius: borders.radius?.lg || 12,
                    borderBottomWidth: 1,
                    borderColor: colors.border?.default || '#E5E7EB'
                }
            ]}>
                <View style={styles.offerTypeContainer}>
                    <Ionicons
                        name={isReceived ? "arrow-down-circle-outline" : "arrow-up-circle-outline"}
                        size={16}
                        color={colors.text?.secondary || '#6B7280'}
                    />
                    <Text style={[
                        styles.offerTypeLabel,
                        {
                            color: colors.text?.secondary || '#6B7280',
                            fontSize: typography.fontSize?.xs || 12
                        }
                    ]}>
                        {headerLabel}
                    </Text>
                </View>

                <View style={[
                    styles.statusBadge,
                    { backgroundColor: statusConfig.bgColor }
                ]}>
                    <Ionicons name={statusConfig.icon} size={12} color={statusConfig.textColor} style={{ marginRight: 4 }} />
                    <Text style={[
                        styles.statusText,
                        {
                            color: statusConfig.textColor,
                            fontSize: typography.fontSize?.xs || 12,
                            fontWeight: typography.fontWeight?.bold || '600'
                        }
                    ]}>
                        {statusConfig.label}
                    </Text>
                </View>
            </View>

            {/* Body */}
            <View style={[styles.body, { padding: spacing.md || 16 }]}>

                {/* Vehicle Info */}
                <View style={styles.vehicleRow}>
                    <Image
                        source={vehicle.image ? { uri: vehicle.image } : null}
                        style={[styles.vehicleThumb, { borderRadius: borders.radius?.md || 8, backgroundColor: colors.neutral?.gray?.[200] || '#E5E7EB' }]}
                        contentFit="cover"
                    />
                    <View style={styles.vehicleInfo}>
                        <Text style={[
                            styles.vehicleName,
                            {
                                color: colors.text?.primary || '#111827',
                                fontSize: typography.fontSize?.md || 16,
                                fontWeight: typography.fontWeight?.semibold || '600'
                            }
                        ]}>
                            {vehicle.name || 'Vehículo sin nombre'}
                        </Text>

                        {/* Counterpart Info */}
                        <View style={styles.counterpartContainer}>
                            <Avatar
                                source={counterpart.avatar}
                                name={counterpart.name}
                                size="xs"
                                style={{ marginRight: 6 }}
                            />
                            <Text style={[
                                styles.counterpartName,
                                { color: colors.text?.secondary || '#4B5563', fontSize: typography.fontSize?.sm || 14 }
                            ]}>
                                {counterpart.name || 'Usuario'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Amount */}
                <View style={[
                    styles.amountContainer,
                    {
                        backgroundColor: colors.background?.default || '#F9FAFB',
                        borderRadius: borders.radius?.md || 8,
                        borderColor: colors.border?.default || '#E5E7EB'
                    }
                ]}>
                    <Text style={[
                        styles.amountLabel,
                        { color: colors.text?.secondary || '#6B7280', fontSize: typography.fontSize?.xs || 12 }
                    ]}>
                        Monto Ofertado
                    </Text>
                    <Text style={[
                        styles.amountValue,
                        {
                            color: colors.text?.primary || '#111827',
                            fontSize: typography.fontSize?.xl || 20,
                            fontWeight: typography.fontWeight?.bold || '700'
                        }
                    ]}>
                        {formatCurrency(amount || 0)}
                    </Text>
                </View>
            </View>

            {/* Actions Footer */}
            {(isPending || isAccepted) && (
                <View style={[
                    styles.footer,
                    {
                        padding: spacing.md || 16,
                        paddingTop: 0
                    }
                ]}>
                    {isPending && isReceived && (
                        <View style={styles.pendingActions}>
                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    styles.rejectButton,
                                    { borderColor: colors.error?.main || '#EF4444' }
                                ]}
                                onPress={onReject}
                            >
                                <Text style={[styles.buttonText, { color: colors.error?.main || '#EF4444' }]}>Rechazar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    styles.acceptButton,
                                    { backgroundColor: colors.success?.main || '#10B981' }
                                ]}
                                onPress={onAccept}
                            >
                                <Text style={[styles.buttonText, { color: '#FFF' }]}>Aceptar</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {isAccepted && (
                        <View style={{ gap: 8 }}>
                            {/* Chat Button - Always visible */}
                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    styles.chatButton,
                                    { backgroundColor: colors.primary?.main || '#003459' }
                                ]}
                                onPress={onChat}
                            >
                                <Ionicons name="chatbubbles-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={[styles.buttonText, { color: '#FFF' }]}>Ir al Chat de Negocios</Text>
                            </TouchableOpacity>

                            {/* Transfer Actions */}
                            {isReceived ? (
                                // Seller View -> Show "Entregar Vehículo"
                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        { backgroundColor: colors.secondary?.main || '#007EA7', marginTop: 8 }
                                    ]}
                                    onPress={onTransfer}
                                >
                                    <Ionicons name="qr-code-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={[styles.buttonText, { color: '#FFF' }]}>Entregar Vehículo (QR)</Text>
                                </TouchableOpacity>
                            ) : (
                                // Buyer View -> Show "Recibir Vehículo"
                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        { backgroundColor: colors.secondary?.main || '#007EA7', marginTop: 8 }
                                    ]}
                                    onPress={onReceive}
                                >
                                    <Ionicons name="scan-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={[styles.buttonText, { color: '#FFF' }]}>Recibir Vehículo (Escanear)</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Pending && User is Sender (Buying) -> Cancel option could be here, but not in requirements */}
                    {isPending && !isReceived && (
                        <View style={styles.waitingContainer}>
                            <Text style={{ color: colors.text?.secondary || '#6B7280', fontSize: 13, fontStyle: 'italic' }}>
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
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
        marginBottom: 16,
        overflow: 'hidden'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    offerTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    offerTypeLabel: {
        marginLeft: 6,
        fontWeight: '500',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    body: {
        // padding set in render
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
    },
    vehicleInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    vehicleName: {
        marginBottom: 4,
    },
    counterpartContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    amountContainer: {
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    amountLabel: {
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
        height: 44,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rejectButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
    },
    acceptButton: {
        // color set in render
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
    }
});

export default OfferNegotiationCard;
