# ✅ Guía Definitiva: Vercel Deploy Hook

## 🎯 Problema Resuelto

El Deploy Hook **SÍ funciona**, pero necesita el header `Content-Type: application/json`.

### ❌ Comando Incorrecto (falla con "Unsupported Media Type")
```bash
curl -X POST https://api.vercel.com/v1/integrations/deploy/prj_onu4rpYmXcplOPOmS29auXoG4kZj/ppYbhmkdgZ
```

### ✅ Comando Correcto
```bash
curl -X POST https://api.vercel.com/v1/integrations/deploy/prj_onu4rpYmXcplOPOmS29auXoG4kZj/ppYbhmkdgZ \
  -H "Content-Type: application/json"
```

**Respuesta exitosa:**
```json
{
  "job": {
    "id": "Z2gg6AACEuEdk2ssR7Tx",
    "state": "PENDING",
    "createdAt": 1769115905098
  }
}
```

---

## 🚀 Uso del Deploy Hook

### Opción 1: Deployment Manual desde Terminal
```bash
# Desde la carpeta del proyecto
cd /Users/sebastianm/Documents/apps/app-mecanimovil\ 11-05-2025/mecanimovil-frontend/mecanimovil-app

# Trigger deployment
curl -X POST https://api.vercel.com/v1/integrations/deploy/prj_onu4rpYmXcplOPOmS29auXoG4kZj/ppYbhmkdgZ \
  -H "Content-Type: application/json"
```

### Opción 2: Crear un Script NPM
Agrega esto a `package.json`:

```json
"scripts": {
  "deploy:vercel": "curl -X POST https://api.vercel.com/v1/integrations/deploy/prj_onu4rpYmXcplOPOmS29auXoG4kZj/ppYbhmkdgZ -H 'Content-Type: application/json'"
}
```

Luego ejecuta:
```bash
npm run deploy:vercel
```

### Opción 3: Automatizar con Git Hooks (Opcional)
Si deseas deployment automático en cada push:

1. Crear `.git/hooks/post-push`:
```bash
#!/bin/bash
curl -X POST https://api.vercel.com/v1/integrations/deploy/prj_onu4rpYmXcplOPOmS29auXoG4kZj/ppYbhmkdgZ \
  -H "Content-Type: application/json" &
```

2. Dar permisos de ejecución:
```bash
chmod +x .git/hooks/post-push
```

> ⚠️ **Nota:** Los hooks de Git NO se versionan (están en `.git/hooks/`), por lo que cada desarrollador debe configurarlos localmente.

---

## 📊 Verificar Estado del Deployment

1. **Dashboard de Vercel**: https://vercel.com/dashboard
2. **Ver logs en tiempo real**: Haz clic en el deployment activo
3. **URL de producción**: https://mecanimovil-app-a33d4xztt-mecanimovil-app.vercel.app/

---

## 🔍 ¿Por Qué No Funcionaba el Auto-Deploy?

Los auto-deploys de Vercel desde Git fallan cuando:

1. **"Ignored Build Step"** está configurado como "Automatic" y Vercel decide que el cambio "no es importante" (ej. solo archivos `.md` o de configuración)
2. **permisos de Git** no coinciden con el team de Vercel
3. **`.vercelignore`** está bloqueando archivos críticos

**Solución Temporal:** Usar el Deploy Hook manualmente cada vez que quieras deployar.

**Solución Permanente:** Necesitas contactar soporte de Vercel o configurar `exit 1` en "Ignored Build Step" para forzar builds siempre (pero esto puede causar fallos si no hay cambios reales).

---

## 🎯 Estado Actual

- ✅ Deploy Hook configurado y funcionando
- ✅ `vercel.json` configurado con `buildCommand`
- ✅ `.vercelignore` excluyendo archivos innecesarios
- ⚠️ Auto-deploys desde Git aún no funcionan (requiere configuración manual en Vercel Dashboard o usar Deploy Hook)

---

## 📝 Recomendación

**Para development actual:** Usa el Deploy Hook manualmente cuando necesites deployar:

```bash
npm run deploy:vercel
# o
curl -X POST https://api.vercel.com/v1/integrations/deploy/prj_onu4rpYmXcplOPOmS29auXoG4kZj/ppYbhmkdgZ -H "Content-Type: application/json"
```

**Para futuro:** Contacta soporte de Vercel para resolver el problema de auto-deploy desde Git, o considera migrar a una plataforma con mejor integración CI/CD como Netlify o GitHub Pages.
