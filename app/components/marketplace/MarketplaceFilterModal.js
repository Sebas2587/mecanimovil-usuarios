import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';

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
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={COLORS.text.primary} />
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
                                        placeholderTextColor={COLORS.text.disabled}
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
                                        placeholderTextColor={COLORS.text.disabled}
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
                                        placeholderTextColor={COLORS.text.disabled}
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
                                        placeholderTextColor={COLORS.text.disabled}
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
                                        placeholderTextColor={COLORS.text.disabled}
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
                                        placeholderTextColor={COLORS.text.disabled}
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
        backgroundColor: COLORS.background.overlay,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.background.paper,
        borderTopLeftRadius: BORDERS.radius.xl,
        borderTopRightRadius: BORDERS.radius.xl,
        maxHeight: '90%',
        minHeight: '50%',
        width: '100%',
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        overflow: 'hidden',
        ...SHADOWS.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: BORDERS.width.thin,
        borderBottomColor: COLORS.border.light,
        zIndex: 2,
    },
    closeButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text.primary,
    },
    clearText: {
        fontSize: 14,
        color: COLORS.primary[600],
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
        color: COLORS.text.primary,
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
        color: COLORS.text.tertiary,
        marginBottom: 6,
    },
    input: {
        height: 48,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        borderRadius: BORDERS.radius.md,
        paddingHorizontal: 12,
        backgroundColor: COLORS.neutral.gray[100],
        fontSize: 14,
        color: COLORS.text.primary,
    },
    footer: {
        padding: 20,
        borderTopWidth: BORDERS.width.thin,
        borderTopColor: COLORS.border.light,
        zIndex: 2,
    },
    applyButton: {
        backgroundColor: COLORS.primary[500],
        height: 50,
        borderRadius: BORDERS.radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyButtonText: {
        color: COLORS.text.onPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default MarketplaceFilterModal;
