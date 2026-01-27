import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const StickyFooter = ({ onChatPress, onQuotePress }) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.content}>
                <TouchableOpacity style={styles.chatButton} onPress={onChatPress}>
                    <Ionicons name="chatbubble-outline" size={24} color={COLORS.text.secondary} />
                    <Text style={styles.chatText}>Chat</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.quoteButton} onPress={onQuotePress}>
                    <Text style={styles.quoteText}>Cotizar Servicio</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.base.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.neutral.gray[200],
        paddingTop: 16,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    chatButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.neutral.gray[300],
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatText: {
        marginLeft: 8,
        fontWeight: '600',
        color: COLORS.text.secondary,
    },
    quoteButton: {
        flex: 1,
        backgroundColor: COLORS.primary[500],
        borderRadius: 12,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    quoteText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
    },
});

export default StickyFooter;
