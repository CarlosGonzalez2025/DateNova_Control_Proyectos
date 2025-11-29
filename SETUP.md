# 🚀 DateNova - Guía de Instalación y Configuración

## 📋 Requisitos Previos

- Node.js v18 o superior
- Cuenta activa en [Supabase](https://supabase.com)
- Editor de código (VS Code recomendado)

---

## 🔧 Instalación Inicial

### 1. Clonar el Repositorio

```bash
git clone <tu-repositorio>
cd DateNova_Control_Proyectos
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Copia el archivo de ejemplo y configura tus credenciales:

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales de Supabase:

```env
VITE_SUPABASE_URL=tu_url_de_supabase_aqui
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
VITE_APP_NAME=DateNova
VITE_APP_VERSION=2.0.0
```

**¿Dónde encontrar las credenciales?**
1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Haz clic en ⚙️ **Settings** → **API**
3. Copia:
   - **URL**: Campo `Project URL`
   - **ANON KEY**: Campo `anon public`

---

## 🗄️ Configuración de Base de Datos

### 1. Ejecutar Migraciones en Supabase

Sigue estos pasos para configurar el schema de la base de datos:

#### Opción A: Usando SQL Editor (Recomendado)

1. Ve a tu proyecto en Supabase
2. Haz clic en **SQL Editor** en el menú lateral
3. Crea una nueva query
4. Copia todo el contenido del archivo `supabase_migrations.sql`
5. Pega el contenido y haz clic en **Run**

#### Opción B: Usando Supabase CLI

```bash
# Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# Inicializar Supabase
supabase init

# Ejecutar migración
supabase db push --db-url postgresql://[TU_CONNECTION_STRING]
```

### 2. Verificar que las Tablas se Crearon

Ejecuta esta query en SQL Editor para verificar:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('deliverables', 'deliverable_versions', 'task_comments', 'audit_log')
ORDER BY table_name;
```

Deberías ver 4 tablas nuevas:
- ✅ audit_log
- ✅ deliverable_versions
- ✅ deliverables
- ✅ task_comments

### 3. Verificar Row Level Security (RLS)

Ejecuta esta query para confirmar que RLS está habilitado:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('proyectos', 'tareas', 'registro_horas', 'deliverables', 'task_comments', 'empresas');
```

Todas deben mostrar `rowsecurity = true`.

---

## 🏃 Ejecución del Proyecto

### Modo Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: http://localhost:3000

### Modo Producción

```bash
# Build
npm run build

# Preview
npm run preview
```

---

## 📦 Nuevas Funcionalidades Implementadas

### 1. Sistema de Entregables

Permite gestionar documentos, código y archivos entregables con:
- ✅ Versionamiento automático
- ✅ Flujo de aprobación cliente
- ✅ Historial completo de cambios
- ✅ Comentarios del cliente en rechazos

**Uso:**
- Los desarrolladores suben entregables
- El asesor marca como "En Revisión"
- El cliente aprueba o rechaza con comentarios
- Se guarda historial de todas las versiones

### 2. Sistema de Comentarios Contextuales

Comentarios thread-based (hilos de conversación) directamente en tareas y proyectos:
- ✅ Conversaciones anidadas (replies)
- ✅ Comentarios internos (no visibles para cliente)
- ✅ Notificaciones en tiempo real
- ✅ Historial completo por tarea/proyecto

### 3. Row Level Security (RLS)

Seguridad a nivel de fila para proteger datos sensibles:
- ✅ Clientes solo ven sus propios proyectos
- ✅ Staff no puede ver tarifas si es cliente
- ✅ Comentarios internos ocultos para clientes
- ✅ Registro de horas protegido

### 4. Auditoría Completa

Sistema de auditoría automático que registra:
- ✅ Quién hizo qué acción
- ✅ Cuándo se realizó
- ✅ Qué cambió (antes/después)
- ✅ IP y User Agent

---

## 🔒 Seguridad - Cambios Importantes

### ⚠️ CRÍTICO: Credenciales Ahora en Variables de Entorno

**Antes** (❌ INSEGURO):
```typescript
const supabaseUrl = 'https://...';  // Hardcodeado
const supabaseKey = 'eyJhbGc...';   // Hardcodeado
```

**Ahora** (✅ SEGURO):
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

**NUNCA subas al repositorio:**
- ❌ `.env.local`
- ❌ Archivos con credenciales

**SÍ puedes subir:**
- ✅ `.env.example` (solo con placeholders)

---

## 🎯 Próximos Pasos de Desarrollo

### Fase 1: UI de Entregables (Próximo)
- [ ] Crear componente `Deliverables.tsx`
- [ ] Integrar con Supabase Storage para subir archivos
- [ ] Implementar flujo de aprobación visual
- [ ] Agregar vista de historial de versiones

### Fase 2: UI de Comentarios (Próximo)
- [ ] Crear componente `TaskComments.tsx`
- [ ] Implementar UI de hilos (threads)
- [ ] Agregar editor rico de texto (opcional)
- [ ] Integrar notificaciones en tiempo real

### Fase 3: Dashboard Cliente Mejorado
- [ ] Métricas visuales (gráficos)
- [ ] Vista de progreso de proyectos
- [ ] Alertas de hitos próximos
- [ ] Exportar reportes a PDF

### Fase 4: PWA (Progressive Web App)
- [ ] Configurar manifest.json
- [ ] Implementar service worker
- [ ] Soporte offline básico
- [ ] Notificaciones push

---

## 🐛 Solución de Problemas

### Error: "Missing Supabase environment variables"

**Causa**: No existe el archivo `.env.local` o las variables no están configuradas.

**Solución**:
```bash
cp .env.example .env.local
# Editar .env.local con tus credenciales
```

### Error: "relation deliverables does not exist"

**Causa**: Las migraciones no se ejecutaron en Supabase.

**Solución**: Ejecuta `supabase_migrations.sql` en el SQL Editor de Supabase.

### Build falla con errores de TypeScript

**Causa**: Tipos desactualizados o importaciones faltantes.

**Solución**:
```bash
# Limpiar cache
rm -rf node_modules package-lock.json
npm install
npm run build
```

### RLS bloquea queries en desarrollo

**Causa**: RLS está habilitado pero no estás autenticado.

**Solución temporal para desarrollo**:
```sql
-- ⚠️ SOLO EN DESARROLLO - Deshabilitar RLS temporalmente
ALTER TABLE proyectos DISABLE ROW LEVEL SECURITY;
ALTER TABLE tareas DISABLE ROW LEVEL SECURITY;
-- Etc...
```

**NO OLVIDES RE-HABILITAR EN PRODUCCIÓN**

---

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Vite](https://vitejs.dev)
- [Documentación de React](https://react.dev)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

## 👨‍💻 Equipo de Desarrollo

Para preguntas o soporte técnico, contacta al equipo de desarrollo.

**Versión**: 2.0.0
**Última actualización**: Enero 2025
