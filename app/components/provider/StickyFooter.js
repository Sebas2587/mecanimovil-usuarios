import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

const GLASS_BG = Platform.select({
    ios: 'rgba(255,255,255,0.06)',
    android: 'rgba(255,255,255,0.10)',
    default: 'rgba(255,255,255,0.08)',
});

const StickyFooter = ({ onChatPress, onQuotePress }) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {Platform.OS === 'ios' && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />}
            <View style={styles.content}>
                <TouchableOpacity style={styles.chatButton} onPress={onChatPress}>
                    <Ionicons name="chatbubble-outline" size={22} color="#93C5FD" />
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
        backgroundColor: Platform.OS === 'ios' ? 'rgba(3,7,18,0.65)' : 'rgba(3,7,18,0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.10)',
        paddingTop: 16,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
        elevation: 16,
        overflow: 'hidden',
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
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: GLASS_BG,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatText: {
        marginLeft: 8,
        fontWeight: '600',
        color: '#F9FAFB',
    },
    quoteButton: {
        flex: 1,
        backgroundColor: '#059669',
        borderRadius: 12,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(110,231,183,0.35)',
    },
    quoteText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
    },
});

export default StickyFooter;
