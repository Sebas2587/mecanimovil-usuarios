#!/bin/bash
# Script para iniciar Expo con Node.js 20

# Cargar nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Usar Node.js 20
nvm use 20

# Verificar versión
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Iniciar Expo
npx expo start -c "$@"

