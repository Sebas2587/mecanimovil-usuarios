import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BLUR_I = Platform.OS === 'ios' ? 40 : 0;

const MarketplaceFilterModal = ({ visible, onClose, onApply, currentFilters }) => {
    const insets = useSafeAreaInsets();

    const [filters, setFilters] = useState({
        priceMin: '',
        priceMax: '',
        yearMin: '',
        yearMax: '',
        kmMin: '',
        kmMax: '',
    });

    useEffect(() => {
        if (visible) {
            setFilters({
                priceMin: currentFilters?.priceMin || '',
                priceMax: currentFilters?.priceMax || '',
                yearMin: currentFilters?.yearMin || '',
                yearMax: currentFilters?.yearMax || '',
                kmMin: currentFilters?.kmMin || '',
                kmMax: currentFilters?.kmMax || '',
            });
        }
    }, [visible, currentFilters]);

    const formatCurrency = (value) => {
        if (!value) return '';
        const num = value.replace(/\D/g, '');
        if (!num) return '';
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const parseCurrency = (value) => {
        if (!value) return '';
        return value.replace(/\./g, '');
    };

    const handlePriceMinChange = (text) => {
        const raw = text.replace(/\D/g, '');
        const formatted = formatCurrency(raw);
        setFilters(prev => ({ ...prev, priceMin: formatted }));
    };

    const handlePriceMaxChange = (text) => {
        const raw = text.replace(/\D/g, '');
        const formatted = formatCurrency(raw);
        setFilters(prev => ({ ...prev, priceMax: formatted }));
    };

    const handleApply = () => {
        const cleanFilters = {
            ...filters,
            priceMin: parseCurrency(filters.priceMin),
            priceMax: parseCurrency(filters.priceMax),
        };
        onApply(cleanFilters);
        onClose();
    };

    const handleClear = () => {
        const cleared = {
            priceMin: '',
            priceMax: '',
            yearMin: '',
            yearMax: '',
            kmMin: '',
            kmMax: '',
        };
        setFilters(cleared);
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContent}
                >
                    <View style={styles.sheetBase} pointerEvents="none" />
                    {Platform.OS === 'ios' && (
                        <BlurView intensity={BLUR_I} tint="dark" style={StyleSheet.absoluteFill} />
                    )}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#F9FAFB" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Filtros</Text>
                        <TouchableOpacity onPress={handleClear}>
                            <Text style={styles.clearText}>Limpiar</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Precio ($)</Text>
                            <View style={styles.row}>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Mínimo</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0"
                                        placeholderTextColor="rgba(255,255,255,0.35)"
                                        keyboardType="numeric"
                                        value={filters.priceMin}
                                        onChangeText={handlePriceMinChange}
                                        maxLength={15}
                                    />
                                </View>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Máximo</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Sin límite"
                                        placeholderTextColor="rgba(255,255,255,0.35)"
                                        keyboardType="numeric"
                                        value={filters.priceMax}
                                        onChangeText={handlePriceMaxChange}
                                        maxLength={15}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Año</Text>
                            <View style={styles.row}>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Desde</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="ej. 2015"
                                        placeholderTextColor="rgba(255,255,255,0.35)"
                                        keyboardType="numeric"
                                        maxLength={4}
                                        value={filters.yearMin}
                                        onChangeText={(t) => setFilters(prev => ({ ...prev, yearMin: t }))}
                                    />
                                </View>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Hasta</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="ej. 2024"
                                        placeholderTextColor="rgba(255,255,255,0.35)"
                                        keyboardType="numeric"
                                        maxLength={4}
                                        value={filters.yearMax}
                                        onChangeText={(t) => setFilters(prev => ({ ...prev, yearMax: t }))}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Kilometraje (km)</Text>
                            <View style={styles.row}>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Mínimo</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0"
                                        placeholderTextColor="rgba(255,255,255,0.35)"
                                        keyboardType="numeric"
                                        value={filters.kmMin}
                                        onChangeText={(t) => setFilters(prev => ({ ...prev, kmMin: t }))}
                                    />
                                </View>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Máximo</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Sin límite"
                                        placeholderTextColor="rgba(255,255,255,0.35)"
                                        keyboardType="numeric"
                                        value={filters.kmMax}
                                        onChangeText={(t) => setFilters(prev => ({ ...prev, kmMax: t }))}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>

                    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                            <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#0a0f1a',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        minHeight: '50%',
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
    },
    sheetBase: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10,15,26,0.94)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        zIndex: 2,
    },
    closeButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F9FAFB',
    },
    clearText: {
        fontSize: 14,
        color: '#93C5FD',
        fontWeight: '600',
    },
    scrollContent: {
        padding: 20,
        zIndex: 2,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F9FAFB',
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    inputContainer: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.45)',
        marginBottom: 6,
    },
    input: {
        height: 48,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        borderRadius: 12,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        fontSize: 14,
        color: '#F9FAFB',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        zIndex: 2,
    },
    applyButton: {
        backgroundColor: 'rgba(16,185,129,0.85)',
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    applyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default MarketplaceFilterModal;
