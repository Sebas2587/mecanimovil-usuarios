import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS, withOpacity } from '../../design-system/tokens';
import RequestCard from './RequestCard';
import { ROUTES } from '../../utils/constants';
import { prefetchRequestDetail } from '../../hooks/useRequests';
import Icon from '../base/Icon/Icon';

const ActiveRequestsCarousel = ({ requests = [] }) => {
    const navigation = useNavigation();
    const queryClient = useQueryClient();

    const handlePress = (request) => {
        if (request?.id) void prefetchRequestDetail(queryClient, request.id);
        navigation.navigate(ROUTES.DETALLE_SOLICITUD, { solicitudId: request.id });
    };

    if (!requests || requests.length === 0) {
        // Option: Don't show anything, or show a call to action if no requests?
        // Per spec, we just render the carousel if we have data or maybe just the "New" card if empty?
        // Let's assume we always show the "New Request" card at least.
        // return null; 
    }

    return (
        <View style={styles.container}>
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
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 8, // For shadow clipping
    },
    newRequestCard: {
        width: 140,
        height: 170, // Match RequestCard height
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        overflow: 'hidden',
        shadowColor: COLORS.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: withOpacity(COLORS.base.white, 0.2),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    newRequestText: {
        color: COLORS.text.inverse,
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 20,
    }
});

export default ActiveRequestsCarousel;
