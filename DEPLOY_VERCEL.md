# 🚀 Guía de Despliegue en Vercel - DateNova

## ✅ Pre-requisitos

Antes de desplegar, asegúrate de tener:

- [x] Cuenta en [Vercel](https://vercel.com)
- [x] Cuenta en [Supabase](https://supabase.com) con proyecto configurado
- [x] Migraciones de base de datos ejecutadas (`supabase_migrations.sql`)
- [x] Bucket de Storage "deliverables" creado en Supabase
- [x] Código pusheado a GitHub/GitLab/Bitbucket

---

## 📋 Paso 1: Preparar Supabase

### 1.1 Ejecutar Migraciones

Ve a tu proyecto en Supabase → **SQL Editor** y ejecuta:

```bash
# Copia todo el contenido de:
supabase_migrations.sql
```

### 1.2 Crear Bucket de Storage

1. Ve a **Storage** en Supabase
2. Click en **New Bucket**
3. Configuración:
   - Name: `deliverables`
   - Public bucket: ✅ **Sí**
   - File size limit: 50 MB (ajustar según necesidad)
   - Allowed MIME types: Dejar en blanco (permite todos)

4. Click **Create Bucket**

### 1.3 Obtener Credenciales

Ve a **Settings → API** y copia:
- ✅ **Project URL**: `https://xxxxx.supabase.co`
- ✅ **anon public key**: `eyJhbGci...` (clave pública, segura para frontend)

⚠️ **NUNCA uses la `service_role` key en el frontend**

---

## 📋 Paso 2: Desplegar en Vercel

### Opción A: Deploy desde GitHub (Recomendado)

1. **Conectar Repositorio**
   - Ve a [Vercel Dashboard](https://vercel.com/dashboard)
   - Click en **Add New → Project**
   - Importa tu repositorio de GitHub
   - Selecciona el repositorio `DateNova_Control_Proyectos`

2. **Configurar Proyecto**
   ```
   Framework Preset: Vite
   Root Directory: ./
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

3. **Configurar Variables de Entorno**

   Antes de hacer deploy, agrega las variables de entorno:

   - Click en **Environment Variables**
   - Agrega cada variable:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Production, Preview, Development |
   | `VITE_APP_NAME` | `DateNova` | Production, Preview, Development |
   | `VITE_APP_VERSION` | `2.0.0` | Production, Preview, Development |

   ⚠️ **IMPORTANTE**:
   - Las variables deben empezar con `VITE_` para ser accesibles en el cliente
   - Marca los 3 ambientes (Production, Preview, Development)

4. **Deploy**
   - Click en **Deploy**
   - Espera 1-2 minutos
   - ✅ Tu app estará en: `https://tu-proyecto.vercel.app`

### Opción B: Deploy desde CLI

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# 4. Seguir prompts:
# - Set up and deploy? Y
# - Which scope? (tu cuenta)
# - Link to existing project? N
# - What's your project's name? datenova-control-proyectos
# - In which directory is your code located? ./
# - Override settings? N

# 5. Agregar variables de entorno
vercel env add VITE_SUPABASE_URL production
# Pegar tu URL de Supabase

vercel env add VITE_SUPABASE_ANON_KEY production
# Pegar tu anon key

# 6. Deploy a producción
vercel --prod
```

---

## 📋 Paso 3: Verificar Deploy

### 3.1 Checklist Post-Deploy

Visita tu app en Vercel y verifica:

- [ ] La página de login carga correctamente
- [ ] Puedes hacer login con un usuario existente
- [ ] El dashboard muestra datos (si tienes datos en Supabase)
- [ ] No hay errores en la consola del navegador
- [ ] Las notificaciones toast funcionan
- [ ] Puedes navegar entre páginas

### 3.2 Testing de Entregables

Si ya agregaste la página de Entregables al menú:

- [ ] Puedes crear un entregable
- [ ] Puedes subir un archivo
- [ ] El archivo se guarda en Supabase Storage
- [ ] Puedes descargar el archivo
- [ ] El flujo de aprobación funciona (si tienes usuario cliente)

### 3.3 Verificar RLS (Row Level Security)

1. Abre la consola del navegador (F12)
2. Ve a **Network** tab
3. Intenta acceder a datos de otra empresa (si eres cliente)
4. Deberías ver:
   - ✅ Query exitoso pero sin datos (filtrado por RLS)
   - ❌ Si ves datos de otras empresas, RLS NO está funcionando

---

## 🔧 Configuración Avanzada (Opcional)

### Custom Domain

1. Ve a tu proyecto en Vercel
2. **Settings → Domains**
3. Agrega tu dominio personalizado: `app.tuempresa.com`
4. Configura DNS según instrucciones de Vercel
5. Espera propagación (5-10 minutos)

### CORS en Supabase

Si tienes problemas de CORS:

1. Ve a Supabase → **Settings → API**
2. En **CORS Allowed Origins** agrega:
   ```
   https://tu-proyecto.vercel.app
   https://app.tudominio.com
   ```

### Variables de Entorno por Branch

Para preview deployments:

```bash
# Preview (branches que no son main)
vercel env add VITE_SUPABASE_URL preview
vercel env add VITE_SUPABASE_ANON_KEY preview

# Development (vercel dev)
vercel env add VITE_SUPABASE_URL development
vercel env add VITE_SUPABASE_ANON_KEY development
```

---

## 🐛 Troubleshooting

### Error: "Missing Supabase environment variables"

**Causa**: Variables de entorno no configuradas en Vercel

**Solución**:
1. Ve a Vercel → Settings → Environment Variables
2. Verifica que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` existan
3. Asegúrate de marcar "Production"
4. Redeploy: **Deployments → ... → Redeploy**

### Error: "Failed to fetch" o CORS

**Causa**: Dominio de Vercel no permitido en Supabase

**Solución**:
1. Ve a Supabase → Settings → API → CORS
2. Agrega tu URL de Vercel
3. Espera 1-2 minutos

### Build Falla en Vercel

**Causa**: Dependencias o configuración incorrecta

**Solución**:
```bash
# Localmente, verifica que el build funcione
npm run build

# Si funciona local pero falla en Vercel:
# 1. Verifica Node version en package.json
# 2. Limpia cache en Vercel:
#    Deployments → ... → Redeploy → Clear cache
```

### RLS Bloquea Todo

**Causa**: Políticas muy restrictivas o usuario sin rol

**Solución**:
1. Verifica que el usuario tenga un registro en tabla `usuarios`
2. Verifica que `rol` no sea NULL
3. En Supabase SQL Editor:
   ```sql
   SELECT * FROM usuarios WHERE id = 'tu-user-id';
   ```

### Archivos no se suben a Storage

**Causa**: Bucket no existe o políticas RLS incorrectas

**Solución**:
1. Verifica que bucket `deliverables` exista
2. Ejecuta política RLS de storage del archivo `supabase_migrations.sql`
3. Verifica que el bucket sea público

---

## 📊 Monitoreo Post-Deploy

### Vercel Analytics (Gratis)

1. Ve a tu proyecto en Vercel
2. **Analytics** tab
3. Activa **Web Analytics**
4. Monitorea:
   - Page views
   - Performance (Web Vitals)
   - Top pages

### Supabase Logs

1. Ve a Supabase → **Logs**
2. Monitorea:
   - Database queries (lentitud)
   - Storage uploads (errores)
   - Auth events (logins fallidos)

### Sentry (Opcional - para errores)

```bash
npm install @sentry/react

# En main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_APP_ENV,
});
```

Agregar en Vercel:
```
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

---

## 🚀 Despliegues Automáticos

### Configuración (ya está activa por defecto)

Cada vez que hagas `git push` a tu rama principal:
1. Vercel detecta el cambio
2. Ejecuta build automáticamente
3. Despliega a producción
4. Notifica en Slack/Email (configurable)

### Preview Deployments

Cada Pull Request genera un deployment preview:
- URL única: `https://datenova-xxxx.vercel.app`
- Puedes testar cambios antes de mergear
- Variables de "Preview" environment se aplican

---

## 📋 Checklist Final

Antes de compartir la URL con clientes:

- [ ] Todas las migraciones SQL ejecutadas
- [ ] Bucket de Storage creado y configurado
- [ ] Variables de entorno configuradas en Vercel
- [ ] Deploy exitoso (sin errores)
- [ ] Login funciona correctamente
- [ ] RLS probado (clientes no ven datos de otros)
- [ ] Entregables funcionales (crear, subir, aprobar)
- [ ] Custom domain configurado (opcional)
- [ ] Analytics activado
- [ ] Al menos 2 usuarios de prueba creados

---

## 🎯 URLs Importantes

Después del deploy, guarda estas URLs:

```
Aplicación: https://tu-proyecto.vercel.app
Vercel Dashboard: https://vercel.com/tu-usuario/tu-proyecto
Supabase Dashboard: https://app.supabase.com/project/tu-proyecto
Supabase API Docs: https://tu-proyecto.supabase.co/rest/v1/
```

---

## 👨‍💻 Comandos Rápidos

```bash
# Ver logs en tiempo real
vercel logs --follow

# Redeploy actual commit
vercel --prod

# Rollback a deployment anterior
vercel rollback <deployment-url>

# Ver dominios configurados
vercel domains ls

# Ejecutar localmente como producción
vercel dev
```

---

## 📞 Soporte

**Problemas con Vercel**: https://vercel.com/support
**Problemas con Supabase**: https://supabase.com/docs
**Problemas con DateNova**: Crear issue en GitHub

---

**¡Listo!** Tu aplicación DateNova ahora está en producción 🎉

**Siguiente paso**: Compartir URL con equipo para testing antes de enviar a clientes.
