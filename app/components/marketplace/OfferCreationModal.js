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
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';

/**
 * OfferCreationModal
 *
 * Modal for a buyer to initiate an offer on a vehicle.
 * Allows choosing between the published price or entering a counter-offer.
 */
const OfferCreationModal = ({
    visible,
    onClose,
    onSubmit,
    vehiclePrice,
    vehicleName
}) => {
    const [option, setOption] = useState('published'); // 'published' | 'counter'
    const [offerAmount, setOfferAmount] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (visible) {
            setOption('published');
            setOfferAmount('');
            setError('');
        }
    }, [visible]);

    const handleCustomAmountChange = (text) => {
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
            onSubmit(amount);
        }
        onClose();
    };

    const RadioCard = ({ type, title, subtitle, selected, onSelect }) => {
        const isSelected = selected === type;
        return (
            <TouchableOpacity
                style={[
                    styles.radioCard,
                    isSelected ? styles.radioCardSelected : null,
                ]}
                onPress={() => onSelect(type)}
                activeOpacity={0.75}
            >
                <View style={styles.radioContainer}>
                    <View style={[
                        styles.radioOuter,
                        isSelected ? styles.radioOuterSelected : null,
                    ]}>
                        {isSelected && <View style={styles.radioInner} />}
                    </View>
                </View>
                <View style={styles.radioContent}>
                    <Text style={[styles.radioTitle, isSelected && styles.radioTitleSelected]}>
                        {title}
                    </Text>
                    {subtitle ? (
                        <Text style={styles.radioSubtitle}>{subtitle}</Text>
                    ) : null}
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
                        <View style={styles.modalOuter}>
                            <View style={styles.handleContainer}>
                                <View style={styles.handleBar} />
                            </View>

                            <View style={styles.content}>
                                <View style={styles.header}>
                                    <Text style={styles.title}>Realizar Oferta</Text>
                                    <Text style={styles.subtitle}>{vehicleName}</Text>
                                </View>

                                <View style={styles.priceBox}>
                                    <Text style={styles.priceLabel}>Precio Publicado</Text>
                                    <Text style={styles.priceValue}>{formatCurrency(vehiclePrice)}</Text>
                                </View>

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

                                {option === 'counter' && (
                                    <View style={{ marginBottom: 24 }}>
                                        <Text style={styles.inputLabel}>Tu oferta:</Text>
                                        <View style={[
                                            styles.inputContainer,
                                            error ? styles.inputContainerError : null,
                                        ]}>
                                            <Text style={styles.inputPrefix}>$</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={offerAmount}
                                                onChangeText={handleCustomAmountChange}
                                                keyboardType="numeric"
                                                placeholder="0"
                                                placeholderTextColor={COLORS.text.disabled}
                                                autoFocus
                                            />
                                        </View>
                                        {error ? (
                                            <Text style={styles.errorText}>{error}</Text>
                                        ) : null}
                                    </View>
                                )}

                                <View style={styles.footer}>
                                    <TouchableOpacity
                                        style={[styles.btn, styles.ghostBtn]}
                                        onPress={onClose}
                                    >
                                        <Text style={styles.ghostBtnText}>Cancelar</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.btn, styles.primaryBtn]}
                                        onPress={handleSubmit}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.primaryBtnText}>Enviar Oferta</Text>
                                        <Ionicons name="send" size={16} color={COLORS.text.onPrimary} style={{ marginLeft: 8 }} />
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
        backgroundColor: COLORS.background.overlay,
        justifyContent: 'flex-end',
    },
    keyboardAvoidingView: {
        width: '100%',
    },
    modalOuter: {
        width: '100%',
        paddingTop: 12,
        borderTopLeftRadius: BORDERS.radius.lg,
        borderTopRightRadius: BORDERS.radius.lg,
        overflow: 'hidden',
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        backgroundColor: COLORS.background.paper,
        ...SHADOWS.lg,
    },
    handleContainer: {
        alignItems: 'center',
        marginBottom: 8,
        zIndex: 2,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.neutral.gray[300],
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 32,
        zIndex: 2,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontWeight: '700',
        marginBottom: 4,
        fontSize: 20,
        color: COLORS.text.primary,
    },
    subtitle: {
        textAlign: 'center',
        fontSize: 14,
        color: COLORS.text.secondary,
    },
    priceBox: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.neutral.gray[100],
        borderRadius: BORDERS.radius.md,
        marginBottom: 16,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
    },
    priceLabel: {
        color: COLORS.text.tertiary,
        fontSize: 12,
        marginBottom: 4,
    },
    priceValue: {
        color: COLORS.primary[600],
        fontSize: 24,
        fontWeight: '800',
    },
    radioCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        borderRadius: BORDERS.radius.md,
        backgroundColor: COLORS.background.paper,
    },
    radioCardSelected: {
        borderColor: COLORS.primary[400],
        backgroundColor: COLORS.primary[50],
    },
    radioContainer: {
        marginRight: 12,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: COLORS.neutral.gray[400],
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioOuterSelected: {
        borderColor: COLORS.primary[500],
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primary[500],
    },
    radioContent: {
        flex: 1,
    },
    radioTitle: {
        marginBottom: 2,
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.text.secondary,
    },
    radioTitleSelected: {
        color: COLORS.text.primary,
        fontWeight: '700',
    },
    radioSubtitle: {
        color: COLORS.text.tertiary,
        fontSize: 14,
    },
    inputLabel: {
        marginBottom: 8,
        fontWeight: '600',
        color: COLORS.text.primary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 52,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        borderRadius: BORDERS.radius.md,
        backgroundColor: COLORS.neutral.gray[100],
    },
    inputContainerError: {
        borderColor: COLORS.error[400],
    },
    inputPrefix: {
        fontSize: 18,
        color: COLORS.text.tertiary,
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        height: '100%',
        color: COLORS.text.primary,
    },
    errorText: {
        color: COLORS.error[600],
        fontSize: 12,
        marginTop: 4,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    btn: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: BORDERS.radius.md,
    },
    ghostBtn: {
        width: '30%',
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        backgroundColor: COLORS.neutral.gray[100],
    },
    ghostBtnText: {
        color: COLORS.text.secondary,
        fontWeight: '600',
    },
    primaryBtn: {
        width: '65%',
        minHeight: 50,
        flexDirection: 'row',
        backgroundColor: COLORS.primary[500],
        paddingHorizontal: 12,
    },
    primaryBtnText: {
        color: COLORS.text.onPrimary,
        fontWeight: '700',
    },
});

export default OfferCreationModal;
