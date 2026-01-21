import React from 'react';
import { ScrollView, StyleSheet, Platform } from 'react-native';

/**
 * ScrollContainer - Wrapper de ScrollView que funciona correctamente en todas las plataformas
 * 
 * En React Native Web, ScrollView necesita height explícita para scroll.
 * Este componente usa una combinación de flex y height para máxima compatibilidad.
 * 
 * Uso:
 * <ScrollContainer contentContainerStyle={styles.contentContainer}>
 *   {children}
 * </ScrollContainer>
 */
const ScrollContainer = ({
    children,
    style,
    contentContainerStyle,
    ...props
}) => {
    return (
        <ScrollView
            style={[styles.scrollView, style]}
            contentContainerStyle={contentContainerStyle}
            {...props}
        >
            {children}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        // En web, necesitamos height explícita Y maxHeight para que funcione el scroll
        ...Platform.select({
            web: {
                height: '100%',
                maxHeight: '100vh',
            },
        }),
    },
});

export default ScrollContainer;
