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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const GLASS_BG = Platform.select({
    ios: 'rgba(255,255,255,0.06)',
    android: 'rgba(255,255,255,0.10)',
    default: 'rgba(255,255,255,0.08)',
});
const BLUR_I = Platform.OS === 'ios' ? 45 : 0;

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
                            <View style={styles.modalBase} pointerEvents="none" />
                            {Platform.OS === 'ios' && (
                                <BlurView intensity={BLUR_I} tint="dark" style={StyleSheet.absoluteFill} />
                            )}
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
                                                placeholderTextColor="rgba(255,255,255,0.35)"
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
                                        style={[styles.btn, styles.primaryBtnWrap]}
                                        onPress={handleSubmit}
                                        activeOpacity={0.85}
                                    >
                                        <LinearGradient
                                            colors={['#007EA7', '#00A8E8']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.primaryGradient}
                                        >
                                            <Text style={styles.primaryBtnText}>Enviar Oferta</Text>
                                            <Ionicons name="send" size={16} color="#FFF" style={{ marginLeft: 8 }} />
                                        </LinearGradient>
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
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    keyboardAvoidingView: {
        width: '100%',
    },
    modalOuter: {
        width: '100%',
        paddingTop: 12,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: '#0a0f1a',
    },
    modalBase: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10,15,26,0.94)',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
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
        backgroundColor: 'rgba(255,255,255,0.2)',
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
        color: '#F9FAFB',
    },
    subtitle: {
        textAlign: 'center',
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
    },
    priceBox: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: GLASS_BG,
        borderRadius: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    priceLabel: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 12,
        marginBottom: 4,
    },
    priceValue: {
        color: '#93C5FD',
        fontSize: 24,
        fontWeight: '800',
    },
    radioCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        borderRadius: 14,
        backgroundColor: GLASS_BG,
    },
    radioCardSelected: {
        borderColor: 'rgba(147,197,253,0.45)',
        backgroundColor: 'rgba(147,197,253,0.08)',
    },
    radioContainer: {
        marginRight: 12,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioOuterSelected: {
        borderColor: '#93C5FD',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#00A8E8',
    },
    radioContent: {
        flex: 1,
    },
    radioTitle: {
        marginBottom: 2,
        fontSize: 16,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.85)',
    },
    radioTitleSelected: {
        color: '#F9FAFB',
        fontWeight: '700',
    },
    radioSubtitle: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 14,
    },
    inputLabel: {
        marginBottom: 8,
        fontWeight: '600',
        color: '#F9FAFB',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 52,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    inputContainerError: {
        borderColor: 'rgba(248,113,113,0.8)',
    },
    inputPrefix: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.45)',
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        height: '100%',
        color: '#F9FAFB',
    },
    errorText: {
        color: '#FCA5A5',
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
        borderRadius: 12,
    },
    ghostBtn: {
        width: '30%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    ghostBtnText: {
        color: 'rgba(255,255,255,0.65)',
        fontWeight: '600',
    },
    primaryBtnWrap: {
        width: '65%',
        overflow: 'hidden',
        borderRadius: 12,
        minHeight: 50,
    },
    primaryGradient: {
        minHeight: 50,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    primaryBtnText: {
        color: '#FFF',
        fontWeight: '700',
    },
});

export default OfferCreationModal;
