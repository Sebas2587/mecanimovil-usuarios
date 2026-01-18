#!/bin/bash
# Script para limpiar completamente la caché y reiniciar

echo "🧹 Limpiando caché de React Native/Expo..."

# Limpiar caché de Metro
rm -rf node_modules/.cache
rm -rf .expo
rm -rf .expo-shared

# Limpiar caché de npm
npm cache clean --force

# Limpiar watchman (si está instalado)
if command -v watchman &> /dev/null; then
    watchman watch-del-all
fi

# Limpiar caché de React Native
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*

echo "✅ Caché limpiada"
echo ""
echo "📦 Reinstalando dependencias..."
npm install

echo ""
echo "🚀 Iniciando servidor con caché limpia..."
echo "Ejecuta: npm start -- --reset-cache"
echo "O si usas Expo: npx expo start --clear"
