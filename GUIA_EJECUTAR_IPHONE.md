# 📱 Guía para Ejecutar el Proyecto en iPhone

## Opción 1: Usar Expo Go (Recomendado para Desarrollo) ⚡

Esta es la forma más rápida y fácil para probar la app en tu iPhone.

### Pasos:

1. **Instala Expo Go en tu iPhone:**
   - Abre la App Store
   - Busca "Expo Go"
   - Instala la app

2. **Asegúrate de que tu iPhone y tu Mac estén en la misma red WiFi**

3. **Ejecuta el proyecto:**
   ```bash
   cd mecanimovil-frontend/mecanimovil-app
   npm start
   ```
   
   O si tienes el script:
   ```bash
   npm run start
   ```

4. **Escanea el QR code:**
   - Se abrirá una ventana en tu terminal/browser con un QR code
   - Abre la app Expo Go en tu iPhone
   - Toca "Scan QR Code" 
   - Escanea el código QR
   - La app se cargará en tu iPhone

### Ventajas:
- ✅ No requiere Xcode
- ✅ Muy rápido de configurar
- ✅ Perfecto para desarrollo y testing
- ✅ Recarga automática cuando cambias el código

---

## Opción 2: Development Build (App Nativa) 🔨

Esta opción construye la app nativa e la instala directamente en tu iPhone. Requiere Xcode.

### Prerrequisitos:
- ✅ Xcode instalado
- ✅ Tu iPhone conectado por USB a tu Mac
- ✅ Confiar en este computador (en el iPhone)
- ✅ Tu cuenta de Apple Developer configurada en Xcode

### Pasos:

1. **Conecta tu iPhone a tu Mac por USB**

2. **Confía en tu computador:**
   - En tu iPhone, cuando aparezca el mensaje, toca "Confiar en este computador"
   - Ingresa tu código de desbloqueo si es necesario

3. **Selecciona tu iPhone como dispositivo de desarrollo en Xcode:**
   - Abre Xcode
   - Ve a Window → Devices and Simulators
   - Selecciona tu iPhone
   - Si aparece un error de "Untrusted Developer", ve a: iPhone → Ajustes → General → Gestión de VPN y Dispositivos → Toca tu cuenta → Confía

4. **Navega al directorio del proyecto:**
   ```bash
   cd mecanimovil-frontend/mecanimovil-app
   ```

5. **Instala las dependencias si no lo has hecho:**
   ```bash
   npm install
   ```

6. **Ejecuta en tu iPhone:**
   ```bash
   npm run ios:device
   ```
   
   O directamente:
   ```bash
   expo run:ios --device
   ```

7. **Espera a que compile y se instale:**
   - La primera vez puede tomar varios minutos
   - La app se instalará automáticamente en tu iPhone
   - Se abrirá automáticamente

### Ventajas:
- ✅ App nativa (mejor rendimiento)
- ✅ Acceso a todas las funcionalidades nativas
- ✅ No requiere Expo Go

### Desventajas:
- ❌ Requiere Xcode y configuración
- ❌ Tarda más en compilar
- ❌ Requiere Apple Developer account (gratuita para desarrollo)

---

## Solución de Problemas Comunes 🔧

### Si Expo Go no se conecta:
1. Asegúrate de que ambos dispositivos estén en la misma WiFi
2. Prueba usando la IP directamente: `expo start --tunnel`
3. Verifica que el firewall no esté bloqueando la conexión

### Si `expo run:ios --device` falla:
1. Verifica que Xcode esté instalado: `xcode-select -p`
2. Asegúrate de que CocoaPods esté instalado: `pod --version`
3. Si no está instalado CocoaPods: `sudo gem install cocoapods`
4. Instala las dependencias iOS: `cd ios && pod install && cd ..`
5. Verifica que tu iPhone esté seleccionado como dispositivo en Xcode

### Si aparece error de certificado:
1. Abre el proyecto en Xcode: `open ios/mecanimovilapp.xcodeproj`
2. Selecciona el proyecto en el navegador izquierdo
3. Ve a "Signing & Capabilities"
4. Selecciona tu Team (cuenta de Apple)
5. Xcode generará los certificados automáticamente

---

## Recomendación 💡

**Para desarrollo diario:** Usa **Expo Go** (Opción 1) - es mucho más rápido y fácil.

**Para testing de funcionalidades nativas o antes de un release:** Usa **Development Build** (Opción 2).
