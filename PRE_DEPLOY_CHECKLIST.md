# ✅ Checklist Pre-Deployment DateNova v2.0.0

## 🔒 Seguridad

- [x] Credenciales NO están hardcodeadas en el código
- [x] `.env.local` está en `.gitignore`
- [x] `.env.example` creado como referencia
- [x] `.env.production.example` creado para Vercel
- [ ] Variables de entorno configuradas en Vercel Dashboard
- [ ] RLS ejecutado en Supabase (revisar `supabase_migrations.sql`)
- [ ] Bucket de Storage "deliverables" creado en Supabase

## 🗄️ Base de Datos

- [ ] Migraciones SQL ejecutadas en Supabase (`supabase_migrations.sql`)
- [ ] Verificar que tablas existan:
  ```sql
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('deliverables', 'deliverable_versions', 'task_comments', 'audit_log')
  ORDER BY table_name;
  ```
- [ ] Verificar que RLS esté habilitado:
  ```sql
  SELECT tablename, rowsecurity FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN ('proyectos', 'tareas', 'registro_horas', 'deliverables', 'task_comments', 'empresas');
  ```
- [ ] Al menos 1 usuario de prueba creado en tabla `usuarios`
- [ ] Al menos 1 empresa de prueba creada en tabla `empresas`

## 🎨 Frontend

- [x] Build de producción exitoso (`npm run build`)
- [x] No hay errores de TypeScript
- [x] Toast notifications funcionan
- [x] Validaciones implementadas
- [x] Página de Entregables agregada al menú
- [ ] Testing manual en local completado

## 📦 Vercel

- [ ] Cuenta de Vercel creada
- [ ] Repositorio conectado a Vercel
- [ ] Variables de entorno configuradas:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_APP_NAME`
  - [ ] `VITE_APP_VERSION`
- [ ] Build settings verificados:
  - Framework: Vite
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Install Command: `npm install`

## 🧪 Testing

### Antes del Deploy
- [ ] Login funciona en local
- [ ] Dashboard carga correctamente
- [ ] Crear proyecto funciona
- [ ] Crear tarea funciona
- [ ] Registro de horas funciona
- [ ] Notificaciones toast aparecen

### Después del Deploy en Vercel
- [ ] Login funciona en producción
- [ ] Dashboard carga sin errores
- [ ] No hay errores en consola del navegador (F12)
- [ ] RLS funciona (cliente no ve datos de otras empresas)
- [ ] Crear entregable funciona (si está en el menú)
- [ ] Upload de archivo funciona
- [ ] Descargar archivo funciona

## 📊 Supabase Storage

- [ ] Bucket "deliverables" creado
- [ ] Configuración del bucket:
  - Public: ✅ Sí
  - File size limit: 50 MB
  - Allowed MIME types: (vacío - permite todos)
- [ ] Políticas RLS de Storage aplicadas (ver `supabase_migrations.sql`)

## 🌐 Dominio (Opcional)

- [ ] Dominio personalizado adquirido
- [ ] DNS configurado en Vercel
- [ ] SSL activo (automático en Vercel)

## 📝 Documentación

- [x] `SETUP.md` actualizado
- [x] `DEPLOY_VERCEL.md` creado
- [x] `CHANGELOG.md` actualizado
- [x] `.env.production.example` creado
- [x] `vercel.json` configurado

## 🎯 Post-Deploy

### Primera Hora
- [ ] Crear usuario administrador de prueba
- [ ] Crear empresa de prueba
- [ ] Crear proyecto de prueba
- [ ] Crear tarea de prueba
- [ ] Probar flujo completo end-to-end

### Primera Semana
- [ ] Monitorear logs en Vercel
- [ ] Monitorear queries lentos en Supabase
- [ ] Verificar uso de Storage
- [ ] Recolectar feedback de usuarios iniciales

## 🚨 Rollback Plan

Si algo falla en producción:

```bash
# Opción 1: Rollback en Vercel Dashboard
# Deployments → ... (del deployment anterior) → Promote to Production

# Opción 2: Rollback via CLI
vercel rollback <deployment-url>

# Opción 3: Redeploy commit anterior
git revert HEAD
git push
# Vercel auto-desplegará
```

## 📞 Contactos de Emergencia

- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/docs
- **Equipo Development**: [tu email]

---

## ✨ Comandos Rápidos

```bash
# Build local
npm run build

# Type check
npm run type-check

# Preview build local
npm run preview

# Deploy a Vercel (CLI)
vercel --prod

# Ver logs en tiempo real
vercel logs --follow

# Rollback
vercel rollback <url>
```

---

## 🎉 ¡Todo Listo!

Cuando todos los checkboxes estén marcados ✅, estás listo para:

1. **Push a GitHub**: `git push origin main`
2. **Vercel auto-desplegará** (si conectaste el repo)
3. **Verificar deployment** en Vercel Dashboard
4. **Testing en producción** según checklist
5. **Compartir URL** con equipo interno primero
6. **Recolectar feedback** antes de enviar a clientes

---

**Versión**: 2.0.0
**Última actualización**: Enero 2025
