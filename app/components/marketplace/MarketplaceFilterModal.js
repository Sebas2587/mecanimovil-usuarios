import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MarketplaceFilterModal = ({ visible, onClose, onApply, currentFilters }) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const colors = theme?.colors || {};

    // Local state for filters
    const [filters, setFilters] = useState({
        priceMin: '',
        priceMax: '',
        yearMin: '',
        yearMax: '',
        kmMin: '',
        kmMax: '',
    });

    // Load current filters when modal opens
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
        // Remove non-numeric characters first
        const num = value.replace(/\D/g, '');
        if (!num) return '';
        // Format with thousands separator
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const parseCurrency = (value) => {
        if (!value) return '';
        // Return raw number string
        return value.replace(/\./g, '');
    };

    // Handlers for Price Input Changes
    const handlePriceMinChange = (text) => {
        // We only allow numeric input (and dots if pasting, but we strip them to re-format)
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
        // Send raw numbers to parent
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
        // Important: Pass cleared values back to parent so they apply immediately or at least clear the parent state
        // If we want "Apply" to confirm, we shouldn't call onApply here.
        // But usually "Clear" immediately resets the selection.
        // Let's reset local state only, so user has to click apply?
        // Actually user request implies the filter wasn't working well.
        // Let's make "Clear" just clear inputs. User clicks Apply to confirm.
        // But for better UX, if I click "Limpiar", I expect filters to be gone.
        // I will make it clear local state only.
    };

    const styles = getStyles(colors, insets);

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalContent}
                >
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.text?.primary || '#111827'} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Filtros</Text>
                        <TouchableOpacity onPress={handleClear}>
                            <Text style={styles.clearText}>Limpiar</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

                        {/* Price Range */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Precio ($)</Text>
                            <View style={styles.row}>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Mínimo</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0"
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
                                        keyboardType="numeric"
                                        value={filters.priceMax}
                                        onChangeText={handlePriceMaxChange}
                                        maxLength={15}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Year Range */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Año</Text>
                            <View style={styles.row}>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Desde</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="ej. 2015"
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
                                        keyboardType="numeric"
                                        maxLength={4}
                                        value={filters.yearMax}
                                        onChangeText={(t) => setFilters(prev => ({ ...prev, yearMax: t }))}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Mileage Range */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Kilometraje (km)</Text>
                            <View style={styles.row}>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Mínimo</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0"
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

const getStyles = (colors, insets) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        minHeight: '50%',
        width: '100%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    closeButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text?.primary || '#111827',
    },
    clearText: {
        fontSize: 14,
        color: colors.primary?.main || '#003459',
        fontWeight: '600',
    },
    scrollContent: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text?.primary || '#111827',
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
        color: '#6B7280',
        marginBottom: 6,
    },
    input: {
        height: 48,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 12,
        backgroundColor: '#F9FAFB',
        fontSize: 14,
        color: '#111827',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    applyButton: {
        backgroundColor: colors.primary?.main || '#003459',
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default MarketplaceFilterModal;
