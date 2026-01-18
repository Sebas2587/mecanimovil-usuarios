# 📱 Guía para Generar Build iOS (IPA) - MecaniMóvil App Usuarios

## ⚠️ Nota Importante

**APK es solo para Android.** Para iOS necesitas generar un **IPA**, que es el formato de instalación de iOS.

---

## 📋 Requisitos Previos

Para generar un build de iOS que puedas instalar en tu dispositivo, necesitas:

1. ⚠️ **Cuenta de Apple Developer Program** ($99 USD/año)
   - **REQUERIDA** para builds instalables en dispositivos físicos
   - O puedes usar **alternativas gratuitas** (ver abajo)
   - Regístrate en: https://developer.apple.com/programs/

### ⚠️ **Error Común: "You have no team associated with your Apple account"**

Si recibes este error significa que:
- Tienes un Apple ID, pero **NO** tienes una cuenta de Apple Developer Program activa
- Necesitas **$99 USD/año** para generar builds instalables en iOS
- O puedes usar las **opciones gratuitas** listadas abajo

2. ✅ **EAS CLI instalado** (ya está instalado)
   ```bash
   eas --version
   ```

3. ✅ **Logueado en Expo** (ya estás logueado como `sebas2587`)
   ```bash
   eas whoami
   ```

---

## 🆓 Opción 1: Expo Go (GRATIS - Recomendado para Desarrollo)

**Esta es la mejor opción si NO tienes cuenta de Apple Developer Program ($99 USD/año).**

Esta opción permite probar tu app en tu iPhone **sin generar un IPA**, usando la app Expo Go.

### Pasos:

1. **Instala Expo Go en tu iPhone:**
   - Abre App Store
   - Busca "Expo Go"
   - Instala la app

2. **Ejecuta el proyecto:**
   ```bash
   cd mecanimovil-frontend/mecanimovil-app
   npm start
   ```

3. **Escanea el QR code:**
   - Abre Expo Go en tu iPhone
   - Toca "Scan QR Code"
   - Escanea el código QR que aparece en tu terminal
   - La app se cargará en tu iPhone

**Ventajas:**
- ✅ **100% GRATIS** - No requiere cuenta de pago
- ✅ Muy rápido - carga en segundos
- ✅ Perfecto para desarrollo y testing
- ✅ Recarga automática cuando cambias el código

**Desventajas:**
- ❌ Requiere conexión a internet
- ❌ No es una app "standalone" instalada

---

## 🚀 Opción 2: Build con EAS (Requiere Apple Developer Program - $99 USD/año)

Esta opción genera el IPA en la nube y te permite descargarlo e instalarlo en tu iPhone como una app real.

### ⚠️ Requisito Previo: Cuenta de Apple Developer Program

**ANTES de continuar, necesitas:**
1. Una cuenta de **Apple Developer Program** activa ($99 USD/año)
2. Regístrate en: https://developer.apple.com/programs/
3. Espera a que se active tu cuenta (puede tomar 24-48 horas)

### Paso 1: Configurar Credenciales de Apple

Una vez que tengas tu cuenta de Apple Developer Program activa:

```bash
cd mecanimovil-frontend/mecanimovil-app
eas credentials
```

**Selecciona:**
1. `iOS` (plataforma)
2. `preview` (profile)
3. `Set up a new Apple account` o `Use existing Apple account`
4. Ingresa tus credenciales de Apple Developer Program cuando se solicite

**Si ves el error "You have no team associated with your Apple account":**
- Significa que tu Apple ID NO tiene una cuenta de Apple Developer Program activa
- Necesitas registrarte y pagar $99 USD/año en https://developer.apple.com/programs/
- O usar Expo Go (Opción 1) que es GRATIS

EAS configurará automáticamente:
- Certificados de desarrollo
- Provisioning profiles
- Todos los archivos necesarios

### Paso 2: Generar el Build

Una vez configuradas las credenciales:

```bash
eas build --platform ios --profile preview
```

**¿Qué pasará?**
1. EAS subirá tu código a sus servidores
2. Compilará la app en la nube (10-20 minutos para iOS)
3. Te dará un link para descargar el **IPA**
4. También generará un QR code para instalación directa

### Paso 3: Instalar en tu iPhone

**Método 1: Usando el QR Code**
1. Abre la cámara de tu iPhone
2. Escanea el QR code que genera EAS
3. Se abrirá Safari y descargará el IPA
4. Ve a Ajustes → General → Gestión de VPN y Dispositivos
5. Confía en el certificado de desarrollador
6. Abre la app desde el home screen

**Método 2: Usando el archivo IPA**
1. Descarga el archivo `.ipa` desde el dashboard de Expo
2. Conecta tu iPhone a tu Mac
3. Abre Finder
4. Selecciona tu iPhone en la barra lateral
5. Arrastra el archivo IPA a la sección de apps
6. Sincroniza (se instalará automáticamente)

---

## 🔨 Opción 3: Build Local con Xcode (Alternativa - Requiere Mac y Xcode)

**Esta opción puede funcionar con Apple ID gratuito, pero con limitaciones.**

Si tienes Xcode instalado y prefieres compilar localmente:

### Paso 1: Verificar Xcode

```bash
xcode-select -p
# Debería mostrar: /Applications/Xcode.app/Contents/Developer
```

### Paso 2: Instalar Dependencias iOS

```bash
cd mecanimovil-frontend/mecanimovil-app/ios
pod install
cd ..
```

### Paso 3: Abrir en Xcode

```bash
open ios/mecanimovilapp.xcworkspace
```

### Paso 4: Configurar Signing en Xcode

1. Selecciona el proyecto en el navegador izquierdo
2. Ve a "Signing & Capabilities"
3. Marca "Automatically manage signing"
4. Selecciona tu **Team** (cuenta de Apple Developer)
5. Xcode generará los certificados automáticamente

### Paso 5: Generar Build Local

```bash
eas build --platform ios --profile preview --local
```

O usa Expo directamente:

```bash
expo run:ios --device
```

Este comando compilará e instalará directamente en tu iPhone conectado.

---

## 📱 Opción 4: Build para Simulador iOS (GRATIS - Solo Simulador)

Si tienes un Mac con Xcode, puedes generar un build para el simulador de iOS sin cuenta de pago.

Si solo necesitas probar la app rápidamente sin generar un IPA:

### Pasos:

1. **Instala Expo Go en tu iPhone:**
   - Abre App Store
   - Busca "Expo Go"
   - Instala la app

2. **Ejecuta el proyecto:**
   ```bash
   cd mecanimovil-frontend/mecanimovil-app
   npm start
   ```

3. **Escanea el QR code:**
   - Abre Expo Go en tu iPhone
   - Escanea el QR code
   - La app se cargará

**Ventajas:**
- ✅ No requiere credenciales de Apple
- ✅ Muy rápido
- ✅ Perfecto para desarrollo

**Desventajas:**
- ❌ Requiere conexión a internet
- ❌ No es una app "standalone"

---

## ⚙️ Configuración Actual

El archivo `eas.json` ya está configurado con:

**Perfil Preview (iOS):**
```json
"preview": {
  "ios": {
    "simulator": false,
    "distribution": "internal"
  }
}
```

Esto generará un IPA para instalación en dispositivos físicos.

**Bundle Identifier:** `com.mecanimovil.app` (configurado en `app.json`)

---

## 🔍 Verificar Estado del Build

Para ver tus builds en progreso:

```bash
eas build:list
```

Para ver detalles de un build específico:

```bash
eas build:view [BUILD_ID]
```

También puedes verlos en el dashboard:
https://expo.dev/accounts/sebas2587/projects/mecanimovil-app/builds

---

## 🚨 Solución de Problemas

### ❌ Error: "You have no team associated with your Apple account"

**Este es el error más común.** Significa que:

- ✅ Tienes un **Apple ID** (p. ej. `sebastianmar2587@gmail.com`)
- ❌ **NO** tienes una cuenta de **Apple Developer Program** activa

**Soluciones:**

1. **Opción GRATIS (Recomendada):** Usa **Expo Go** (ver Opción 1 arriba)
   - No requiere cuenta de pago
   - Funciona perfectamente para desarrollo y testing
   - Solo ejecuta: `npm start` y escanea el QR con Expo Go

2. **Opción PAGO:** Obtén una cuenta de **Apple Developer Program**
   - Costo: **$99 USD/año**
   - Regístrate en: https://developer.apple.com/programs/
   - Puede tomar 24-48 horas en activarse
   - Una vez activa, podrás usar `eas credentials` sin problemas

3. **Opción ALTERNATIVA:** Build local con Xcode (si tienes Mac)
   - Puede funcionar con Apple ID gratuito
   - Pero los builds tienen limitaciones (certs temporales, app puede expirar)
   - Ver Opción 3 arriba para más detalles

### Error: "Apple account credentials required"

**Solución:** Ejecuta `eas credentials` y proporciona tus credenciales de Apple Developer Program.

### Error: "No provisioning profile found"

**Solución:** EAS puede generar uno automáticamente si tienes cuenta de pago. Ejecuta:
```bash
eas credentials
# Selecciona iOS → preview → Configure credentials
```

### Error: "Device not registered"

**Solución:** 
1. Ve a Apple Developer Portal (requiere cuenta de pago)
2. Agrega tu dispositivo UDID
3. O usa distribución ad-hoc (EAS puede hacerlo automáticamente)

---

## ✅ Checklist Antes de Build iOS

### Para Build con EAS (IPA instalable):
- [ ] **Tienes cuenta de Apple Developer Program ($99 USD/año)** ⚠️ REQUERIDO
- [ ] EAS CLI instalado (`eas --version`)
- [ ] Logueado en Expo (`eas whoami`)
- [ ] `eas.json` configurado (ya está ✅)
- [ ] `app.json` con `bundleIdentifier` configurado (ya está ✅)
- [ ] Credenciales de Apple configuradas (`eas credentials`)

### Para Expo Go (GRATIS):
- [ ] Expo Go instalado en tu iPhone (desde App Store)
- [ ] iPhone y Mac en la misma red WiFi
- [ ] Proyecto ejecutándose (`npm start`)

---

## 📚 Recursos Adicionales

- [Documentación EAS Build iOS](https://docs.expo.dev/build/ios-builds/)
- [Guía de Credenciales iOS](https://docs.expo.dev/app-signing/app-credentials/)
- [Apple Developer Portal](https://developer.apple.com)

---

## 🎯 Recomendación

**Para instalar en tu dispositivo iOS AHORA (sin pagar $99 USD/año):**

### ✅ **Usa Expo Go (100% GRATIS):**

```bash
cd mecanimovil-frontend/mecanimovil-app
npm start
```

1. Instala **Expo Go** en tu iPhone (desde App Store)
2. Escanea el QR code que aparece en tu terminal
3. ¡Listo! La app se cargará en tu iPhone

**Esta es la mejor opción para desarrollo y testing sin costo.**

---

**Si necesitas un IPA instalable (app standalone):**

Necesitas pagar **$99 USD/año** por una cuenta de Apple Developer Program:
1. Regístrate en: https://developer.apple.com/programs/
2. Espera activación (24-48 horas)
3. Luego ejecuta: `eas credentials` (ya funcionará)
4. Genera el build: `eas build --platform ios --profile preview`
