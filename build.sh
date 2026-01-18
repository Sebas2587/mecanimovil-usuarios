#!/bin/bash

# Script para facilitar la creación de builds con EAS
# Uso: ./build.sh [android|ios] [preview|production]

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 MecaniMóvil - EAS Build Helper${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "app.json" ]; then
    echo -e "${RED}❌ Error: No se encontró app.json${NC}"
    echo "Ejecuta este script desde el directorio mecanimovil-app"
    exit 1
fi

# Verificar que EAS CLI esté instalado
if ! command -v eas &> /dev/null; then
    echo -e "${RED}❌ EAS CLI no está instalado${NC}"
    echo "Instala con: npm install -g eas-cli"
    exit 1
fi

# Verificar que esté logueado
if ! eas whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  No estás logueado en Expo${NC}"
    echo "Iniciando sesión..."
    eas login
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Error al iniciar sesión${NC}"
        exit 1
    fi
fi

# Verificar que el proyecto EAS esté inicializado
if [ ! -f ".easrc" ] && [ ! -f "eas.json" ]; then
    echo -e "${YELLOW}⚠️  Proyecto EAS no inicializado${NC}"
    echo "Inicializando proyecto EAS..."
    eas init --non-interactive || eas init
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Error al inicializar proyecto EAS${NC}"
        exit 1
    fi
fi

# Parámetros
PLATFORM=${1:-android}
PROFILE=${2:-preview}

# Validar plataforma
if [[ ! "$PLATFORM" =~ ^(android|ios|all)$ ]]; then
    echo -e "${RED}❌ Plataforma inválida: $PLATFORM${NC}"
    echo "Usa: android, ios, o all"
    exit 1
fi

# Validar perfil
if [[ ! "$PROFILE" =~ ^(development|preview|production)$ ]]; then
    echo -e "${RED}❌ Perfil inválido: $PROFILE${NC}"
    echo "Usa: development, preview, o production"
    exit 1
fi

# Mostrar información
echo -e "${GREEN}✅ Configuración:${NC}"
echo "   📱 Plataforma: $PLATFORM"
echo "   🎯 Perfil: $PROFILE"
echo ""

# Confirmar
read -p "¿Deseas continuar con el build? (s/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    echo "Build cancelado"
    exit 0
fi

# Crear build
echo -e "${BLUE}📦 Iniciando build...${NC}"
echo ""

if [ "$PLATFORM" == "all" ]; then
    eas build --platform android --profile $PROFILE
    eas build --platform ios --profile $PROFILE
else
    eas build --platform $PLATFORM --profile $PROFILE
fi

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Build completado exitosamente${NC}"
    echo ""
    echo -e "${BLUE}📋 Próximos pasos:${NC}"
    echo "   1. Ve a: https://expo.dev para ver tus builds"
    echo "   2. Descarga el APK/IPA cuando esté listo"
    echo "   3. Comparte el link o archivo con otros usuarios"
    echo ""
    echo -e "${YELLOW}💡 Tip: Usa 'eas build:list' para ver todos tus builds${NC}"
else
    echo ""
    echo -e "${RED}❌ Error durante el build${NC}"
    echo "Revisa los logs arriba para más detalles"
    exit 1
fi

