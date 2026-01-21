#!/bin/bash

# Script para actualizar múltiples screens de ScrollView a ScrollContainer
# Este script busca y reemplaza automáticamente en las pantallas especificadas

# Directorio base
BASE_DIR="/Users/sebastianm/Documents/apps/app-mecanimovil 11-05-2025/mecanimovil-frontend/mecanimovil-app/app/screens"

# Lista de archivos a actualizar
FILES=(
  "vehicles/MisVehiculosScreen.js"
  "vehicles/VehicleHealthScreen.js"
  "vehicles/VehicleProfileScreen.js"
  "solicitudes/MisSolicitudesScreen.js"
  "solicitudes/CrearSolicitudScreen.js"
  "solicitudes/DetalleSolicitudScreen.js"
  "booking/BookingCartScreen.js"
  "payment/OpcionesPagoScreen.js"
  "support/SupportScreen.js"
)

IMPORT_LINE="import ScrollContainer from '../../components/base/ScrollContainer';"

echo "🔧 Iniciando actualización de pantallas..."

for file in "${FILES[@]}"; do
  FULL_PATH="$BASE_DIR/$file"
  
  if [ ! -f "$FULL_PATH" ]; then
    echo "⏭️  Saltando $file (no existe)"
    continue
  fi
  
  echo "📝 Procesando: $file"
  
  # 1. Agregar import si no existe
  if ! grep -q "ScrollContainer" "$FULL_PATH"; then
    # Buscar la última línea de import y agregar después
    sed -i '' "/^import.*from.*$/a\\
$IMPORT_LINE
" "$FULL_PATH"
    echo "  ✅ Import agregado"
  else
    echo "  ⏭️  Import ya existe"
  fi
  
  # 2. Reemplazar <ScrollView con <ScrollContainer
  sed -i '' 's/<ScrollView/<ScrollContainer/g' "$FULL_PATH"
  
  # 3. Reemplazar </ScrollView> con </ScrollContainer>
  sed -i '' 's/<\/ScrollView>/<\/ScrollContainer>/g' "$FULL_PATH"
  
  # 4. Remover style={styles.content} de ScrollContainer ya que se maneja internamente
  sed -i '' 's/style={styles\.content}//g' "$FULL_PATH"
  
  echo "  ✅ Reemplazos completados"
done

echo ""
echo "✅ Actualización completada!"
echo "📋 Archivos procesados: ${#FILES[@]}"
echo ""
echo "⚠️  IMPORTANTE: Revisar manualmente cada archivo para:"
echo "  - Verificar que los imports estén en el lugar correcto"
echo"  - Confirmar que no se rompió la sintaxis"
echo "  - Probar en web, iOS y Android"
