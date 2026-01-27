import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import RequestCard from './RequestCard';
import { ROUTES } from '../../utils/constants';

const ActiveRequestsCarousel = ({ requests = [] }) => {
    const navigation = useNavigation();

    const handlePress = (request) => {
        navigation.navigate(ROUTES.DETALLE_SOLICITUD, { solicitudId: request.id });
    };

    const handleNewRequest = () => {
        navigation.navigate(ROUTES.CREAR_SOLICITUD);
    };

    if (!requests || requests.length === 0) {
        // Option: Don't show anything, or show a call to action if no requests?
        // Per spec, we just render the carousel if we have data or maybe just the "New" card if empty?
        // Let's assume we always show the "New Request" card at least.
        // return null; 
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Solicitudes Activas</Text>
                <TouchableOpacity onPress={() => navigation.navigate(ROUTES.MIS_SOLICITUDES)}>
                    <Text style={styles.seeAll}>Ver todas</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                snapToInterval={280 + 16} // Card width + margin
                decelerationRate="fast"
                snapToAlignment="start"
            >
                {requests.map((req) => (
                    <RequestCard
                        key={req.id}
                        request={req}
                        onPress={() => handlePress(req)}
                    />
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    seeAll: {
        fontSize: 14,
        fontWeight: '500',
        color: '#003459',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 8, // For shadow clipping
    },
    newRequestCard: {
        width: 140,
        height: 170, // Match RequestCard height
        backgroundColor: '#2563EB', // Blue 600
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    newRequestText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 20,
    }
});

export default ActiveRequestsCarousel;
