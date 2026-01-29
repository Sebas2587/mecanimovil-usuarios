import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';

/**
 * OfferCreationModal
 * 
 * Modal for a buyer to initiate an offer on a vehicle.
 * Allows choosing between the published price or entering a counter-offer.
 * 
 * @param {boolean} visible - Visibility state of the modal
 * @param {Function} onClose - Function to close the modal
 * @param {Function} onSubmit - Function called with the offer amount
 * @param {number} vehiclePrice - The published price of the vehicle
 * @param {string} vehicleName - The name/title of the vehicle
 */
const OfferCreationModal = ({
    visible,
    onClose,
    onSubmit,
    vehiclePrice,
    vehicleName
}) => {
    const theme = useTheme();
    const colors = theme.colors || {};
    const typography = theme.typography || {};
    const borders = theme.borders || {};
    const spacing = theme.spacing || {};

    const [option, setOption] = useState('published'); // 'published' | 'counter'
    const [offerAmount, setOfferAmount] = useState('');
    const [error, setError] = useState('');

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setOption('published');
            setOfferAmount('');
            setError('');
        }
    }, [visible]);

    const handleCustomAmountChange = (text) => {
        // Only allow numbers
        const numericValue = text.replace(/[^0-9]/g, '');
        setOfferAmount(numericValue);
        if (error) setError('');
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
    };

    const handleSubmit = () => {
        if (option === 'published') {
            onSubmit(vehiclePrice);
        } else {
            if (!offerAmount) {
                setError('Ingresa un monto válido');
                return;
            }
            const amount = parseInt(offerAmount, 10);
            if (isNaN(amount) || amount <= 0) {
                setError('El monto debe ser mayor a 0');
                return;
            }

            // Basic validation: warn if offer is too low (e.g., < 50% of price)
            // For now just submit
            onSubmit(amount);
        }
        onClose();
    };

    const RadioCard = ({ type, title, subtitle, selected, onSelect }) => {
        const isSelected = selected === type;
        const borderColor = isSelected ? (colors.primary?.main || '#003459') : (colors.border?.default || '#E5E7EB');
        const bkgColor = isSelected ? 'rgba(0, 52, 89, 0.03)' : (colors.background?.paper || '#FFF');

        return (
            <TouchableOpacity
                style={[
                    styles.radioCard,
                    {
                        borderColor,
                        backgroundColor: bkgColor,
                        borderRadius: borders.radius?.md || 8
                    }
                ]}
                onPress={() => onSelect(type)}
                activeOpacity={0.7}
            >
                <View style={styles.radioContainer}>
                    <View style={[
                        styles.radioOuter,
                        { borderColor: isSelected ? (colors.primary?.main || '#003459') : (colors.text?.disabled || '#9CA3AF') }
                    ]}>
                        {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary?.main || '#003459' }]} />}
                    </View>
                </View>
                <View style={styles.radioContent}>
                    <Text style={[
                        styles.radioTitle,
                        {
                            color: isSelected ? (colors.primary?.main || '#003459') : (colors.text?.primary || '#111827'),
                            fontSize: typography.fontSize?.md || 16,
                            fontWeight: isSelected ? '700' : '500'
                        }
                    ]}>
                        {title}
                    </Text>
                    {subtitle && (
                        <Text style={[
                            styles.radioSubtitle,
                            { color: colors.text?.secondary || '#6B7280', fontSize: typography.fontSize?.sm || 14 }
                        ]}>
                            {subtitle}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.overlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.keyboardAvoidingView}
                    >
                        <View style={[
                            styles.modalContainer,
                            {
                                backgroundColor: colors.background?.paper || '#FFF',
                                borderTopLeftRadius: borders.radius?.xl || 20,
                                borderTopRightRadius: borders.radius?.xl || 20,
                            }
                        ]}>
                            {/* Header handle */}
                            <View style={styles.handleContainer}>
                                <View style={[styles.handleBar, { backgroundColor: colors.neutral?.gray?.[300] || '#D1D5DB' }]} />
                            </View>

                            <View style={[styles.content, { paddingHorizontal: spacing.md || 20, paddingBottom: spacing.lg || 32 }]}>
                                {/* Header */}
                                <View style={[styles.header, { marginBottom: spacing.lg || 24 }]}>
                                    <Text style={[
                                        styles.title,
                                        { color: colors.text?.primary || '#111827', fontSize: typography.fontSize?.xl || 20 }
                                    ]}>
                                        Realizar Oferta
                                    </Text>
                                    <Text style={[
                                        styles.subtitle,
                                        { color: colors.text?.secondary || '#6B7280', fontSize: typography.fontSize?.sm || 14 }
                                    ]}>
                                        {vehicleName}
                                    </Text>
                                </View>

                                {/* Published Price Display */}
                                <View style={[
                                    styles.priceBox,
                                    {
                                        backgroundColor: colors.neutral?.surface || '#F3F4F6',
                                        borderRadius: borders.radius?.md || 8,
                                        marginBottom: spacing.md || 16
                                    }
                                ]}>
                                    <Text style={{ color: colors.text?.secondary || '#6B7280', fontSize: 12 }}>Precio Publicado</Text>
                                    <Text style={{
                                        color: colors.text?.primary || '#111827',
                                        fontSize: 24,
                                        fontWeight: 'bold'
                                    }}>
                                        {formatCurrency(vehiclePrice)}
                                    </Text>
                                </View>

                                {/* Options */}
                                <View style={{ marginBottom: 24 }}>
                                    <RadioCard
                                        type="published"
                                        title="Aceptar precio publicado"
                                        subtitle="Comprar sin negociar"
                                        selected={option}
                                        onSelect={setOption}
                                    />
                                    <View style={{ height: 12 }} />
                                    <RadioCard
                                        type="counter"
                                        title="Hacer una contraoferta"
                                        subtitle=""
                                        selected={option}
                                        onSelect={setOption}
                                    />
                                </View>

                                {/* Counter Offer Input */}
                                {option === 'counter' && (
                                    <View style={{ marginBottom: 24 }}>
                                        <Text style={{
                                            marginBottom: 8,
                                            fontWeight: '600',
                                            color: colors.text?.primary || '#111827'
                                        }}>
                                            Tu oferta:
                                        </Text>
                                        <View style={[
                                            styles.inputContainer,
                                            {
                                                borderColor: error ? (colors.error?.main || '#EF4444') : (colors.border?.default || '#E5E7EB'),
                                                backgroundColor: colors.input?.background || '#F9FAFB',
                                                borderRadius: borders.radius?.md || 8
                                            }
                                        ]}>
                                            <Text style={{ fontSize: 18, color: colors.text?.secondary || '#9CA3AF', marginRight: 8 }}>$</Text>
                                            <TextInput
                                                style={[styles.input, { color: colors.text?.primary || '#111827' }]}
                                                value={offerAmount}
                                                onChangeText={handleCustomAmountChange}
                                                keyboardType="numeric"
                                                placeholder="0"
                                                placeholderTextColor={colors.text?.disabled || '#D1D5DB'}
                                                autoFocus
                                            />
                                        </View>
                                        {error ? (
                                            <Text style={{ color: colors.error?.main || '#EF4444', fontSize: 12, marginTop: 4 }}>
                                                {error}
                                            </Text>
                                        ) : null}
                                    </View>
                                )}

                                {/* Action Buttons */}
                                <View style={styles.footer}>
                                    <TouchableOpacity
                                        style={[styles.btn, styles.ghostBtn]}
                                        onPress={onClose}
                                    >
                                        <Text style={{ color: colors.text?.secondary || '#6B7280', fontWeight: '600' }}>Cancelar</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.btn,
                                            styles.primaryBtn,
                                            { backgroundColor: colors.primary?.main || '#003459', borderRadius: borders.radius?.md || 8 }
                                        ]}
                                        onPress={handleSubmit}
                                    >
                                        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Enviar Oferta</Text>
                                        <Ionicons name="send" size={16} color="#FFF" style={{ marginLeft: 8 }} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    keyboardAvoidingView: {
        width: '100%',
    },
    modalContainer: {
        width: '100%',
        paddingTop: 12,
    },
    handleContainer: {
        alignItems: 'center',
        marginBottom: 8,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    content: {
        // padding set in render
    },
    header: {
        alignItems: 'center',
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        textAlign: 'center',
    },
    priceBox: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderWidth: 1,
    },
    radioContainer: {
        marginRight: 12,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    radioContent: {
        flex: 1,
    },
    radioTitle: {
        marginBottom: 2,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 50,
        borderWidth: 1,
    },
    input: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        height: '100%',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    btn: {
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    ghostBtn: {
        width: '30%',
    },
    primaryBtn: {
        width: '65%',
        flexDirection: 'row',
    },
});

export default OfferCreationModal;
