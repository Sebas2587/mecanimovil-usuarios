import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Dimensions, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../design-system/theme/useTheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const SEARCH_BAR_HEIGHT = 60;

// MOCK DATA
const MOCK_VEHICLES = [
    { id: 'all', label: 'Todos', active: true },
    { id: '1', label: 'Mazda CX-5' },
    { id: '2', label: 'Toyota Corolla' },
];

const CATEGORIES = [
    { id: '1', name: 'Mantención', icon: 'construct-outline', color: '#3B82F6' },
    { id: '2', name: 'Frenos', icon: 'disc-outline', color: '#EF4444' },
    { id: '3', name: 'Diagnóstico', icon: 'pulse-outline', color: '#10B981' },
    { id: '4', name: 'Batería', icon: 'battery-charging-outline', color: '#F59E0B' },
    { id: '5', name: 'Aceite', icon: 'color-fill-outline', color: '#8B5CF6' },
    { id: '6', name: 'Suspensión', icon: 'car-sport-outline', color: '#6366F1' },
];

const RECENT_REQUESTS = [
    {
        id: '101',
        service: 'Cambio de Aceite',
        vehicle: 'Mazda CX-5',
        date: 'Hoy',
        status: 'active',
        statusLabel: 'En Curso'
    },
    {
        id: '102',
        service: 'Revisión Frenos',
        vehicle: 'Toyota Corolla',
        date: 'Ayer',
        status: 'completed',
        statusLabel: 'Finalizado'
    },
    {
        id: '103',
        service: 'Diagnóstico General',
        vehicle: 'Mazda CX-5',
        date: '12 Oct',
        status: 'completed',
        statusLabel: 'Finalizado'
    },
];

const ServicesScreen = () => {
    const navigation = useNavigation();
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    // Design Tokens
    const colors = theme?.colors || {};
    const typography = theme?.typography || {};
    const spacing = theme?.spacing || {};
    const borders = theme?.borders || {};

    const styles = getStyles(colors, typography, spacing, borders);

    const [selectedVehicle, setSelectedVehicle] = useState('all');

    const renderCategoryItem = ({ item }) => (
        <TouchableOpacity style={styles.categoryCard} activeOpacity={0.7}>
            <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={28} color={item.color} />
            </View>
            <Text style={styles.categoryName}>{item.name}</Text>
        </TouchableOpacity>
    );

    const renderRequestItem = (item) => {
        const isActive = item.status === 'active';
        return (
            <TouchableOpacity
                key={item.id}
                style={[styles.requestCard, isActive && styles.activeRequestCard]}
                activeOpacity={0.7}
            >
                {isActive && <View style={styles.activeIndicator} />}
                <View style={[styles.requestContent, isActive && { paddingLeft: 12 }]}>
                    <View style={styles.requestHeader}>
                        <Text style={[styles.requestTitle, isActive && styles.activeTitle]}>{item.service}</Text>
                        <View style={[
                            styles.statusBadge,
                            isActive ? styles.statusActive : styles.statusCompleted
                        ]}>
                            <Text style={[
                                styles.statusText,
                                isActive ? styles.statusTextActive : styles.statusTextCompleted
                            ]}>
                                {item.statusLabel}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.requestSubtitle}>{item.vehicle} • {item.date}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text?.tertiary || '#9CA3AF'} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background?.default} />

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Servicios</Text>
                    <Text style={styles.headerSubtitle}>Gestiona el mantenimiento de tus vehículos</Text>
                </View>

                {/* Filters */}
                <View style={styles.filterSection}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterList}
                    >
                        {MOCK_VEHICLES.map(v => (
                            <TouchableOpacity
                                key={v.id}
                                style={[
                                    styles.filterPill,
                                    selectedVehicle === v.id && styles.filterPillActive
                                ]}
                                onPress={() => setSelectedVehicle(v.id)}
                            >
                                <Text style={[
                                    styles.filterText,
                                    selectedVehicle === v.id && styles.filterTextActive
                                ]}>
                                    {v.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Categories Grid */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Categorías</Text>
                    <FlatList
                        data={CATEGORIES}
                        renderItem={renderCategoryItem}
                        keyExtractor={item => item.id}
                        numColumns={3}
                        scrollEnabled={false}
                        columnWrapperStyle={styles.gridRow}
                        contentContainerStyle={styles.gridContainer}
                    />
                </View>

                {/* Recent Requests */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Solicitudes Recientes</Text>
                    <View style={styles.requestsList}>
                        {RECENT_REQUESTS.map(renderRequestItem)}
                    </View>
                </View>

            </ScrollView>
        </View>
    );
};

const getStyles = (colors, typography, spacing, borders) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background?.default || '#F9FAFB',
    },
    scrollContent: {
        paddingBottom: spacing.xl || 32,
    },
    header: {
        paddingHorizontal: spacing.md || 16,
        marginBottom: spacing.md || 16,
        marginTop: spacing.sm || 8,
    },
    headerTitle: {
        fontSize: typography.fontSize?.['3xl'] || 28,
        fontWeight: typography.fontWeight?.bold || '700',
        color: colors.text?.primary || '#111827',
    },
    headerSubtitle: {
        fontSize: typography.fontSize?.md || 16,
        color: colors.text?.secondary || '#6B7280',
        marginTop: 4,
    },
    filterSection: {
        marginBottom: spacing.lg || 24,
    },
    filterList: {
        paddingHorizontal: spacing.md || 16,
    },
    filterPill: {
        paddingHorizontal: spacing.md || 16,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: colors.background?.paper || '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.border?.light || '#E5E7EB',
        marginRight: spacing.sm || 8,
    },
    filterPillActive: {
        backgroundColor: colors.primary?.main || '#003459',
        borderColor: colors.primary?.main || '#003459',
    },
    filterText: {
        fontSize: typography.fontSize?.sm || 14,
        fontWeight: typography.fontWeight?.medium || '500',
        color: colors.text?.secondary || '#374151',
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
    section: {
        marginBottom: spacing.xl || 32,
    },
    sectionTitle: {
        fontSize: typography.fontSize?.lg || 18,
        fontWeight: typography.fontWeight?.bold || '700',
        color: colors.text?.primary || '#111827',
        marginLeft: spacing.md || 16,
        marginBottom: spacing.md || 16,
    },
    gridContainer: {
        paddingHorizontal: spacing.sm || 8,
    },
    gridRow: {
        justifyContent: 'flex-start',
    },
    categoryCard: {
        flex: 1 / 3, // 3 columns
        alignItems: 'center',
        marginBottom: spacing.md || 16,
        paddingHorizontal: 4,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryName: {
        fontSize: typography.fontSize?.xs || 12,
        fontWeight: typography.fontWeight?.medium || '500',
        color: colors.text?.secondary || '#374151',
        textAlign: 'center',
    },
    requestsList: {
        paddingHorizontal: spacing.md || 16,
    },
    requestCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background?.paper || '#FFFFFF',
        padding: spacing.md || 16,
        borderRadius: borders.radius?.md || 12,
        marginBottom: spacing.sm || 12,
        borderWidth: 1,
        borderColor: colors.border?.light || '#F3F4F6',
        position: 'relative',
        overflow: 'hidden',
    },
    activeRequestCard: {
        borderColor: colors.info?.light || '#EFF6FF',
        backgroundColor: '#FFFFFF',
        shadowColor: colors.info?.main,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: colors.info?.main || '#2563EB',
    },
    requestContent: {
        flex: 1,
        marginRight: spacing.sm || 8,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    requestTitle: {
        fontSize: typography.fontSize?.base || 14,
        fontWeight: typography.fontWeight?.semibold || '600',
        color: colors.text?.primary || '#111827',
    },
    activeTitle: {
        color: colors.text?.primary || '#111827',
    },
    requestSubtitle: {
        fontSize: 12,
        color: colors.text?.tertiary || '#9CA3AF',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 99,
    },
    statusActive: {
        backgroundColor: colors.info?.light || '#EFF6FF',
    },
    statusCompleted: {
        backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    statusTextActive: {
        color: colors.info?.dark || '#1D4ED8',
    },
    statusTextCompleted: {
        color: colors.text?.tertiary || '#6B7280',
    },
});

export default ServicesScreen;
