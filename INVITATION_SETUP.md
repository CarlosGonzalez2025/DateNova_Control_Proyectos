# 📧 Configuración de Sistema de Invitaciones

Este documento explica cómo configurar el envío automático de emails de invitación usando Supabase Auth.

---

## 🎯 Cómo Funciona

1. **Admin invita usuario** → Sistema crea usuario en Supabase Auth
2. **Supabase envía email automáticamente** → Usuario recibe email con link
3. **Usuario hace click en link** → Redirige a tu app para confirmar cuenta
4. **Usuario establece contraseña** → Cuenta activada ✅

---

## ⚙️ Configuración en Supabase Dashboard

### **Paso 1: Configurar Email Templates**

1. **Ve a Supabase Dashboard** → Tu proyecto → **Authentication**

2. **Click en "Email Templates"** en el menú lateral

3. **Selecciona "Invite user"** (Invitar usuario)

4. **Personaliza la plantilla**:

```html
<h2>¡Bienvenido a DateNova!</h2>

<p>Hola,</p>

<p>Has sido invitado a unirte al equipo de <strong>DateNova</strong>, nuestra plataforma de gestión de proyectos.</p>

<p>Para activar tu cuenta y establecer tu contraseña, haz click en el siguiente botón:</p>

<p><a href="{{ .ConfirmationURL }}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Activar mi cuenta</a></p>

<p>O copia y pega este enlace en tu navegador:</p>
<p>{{ .ConfirmationURL }}</p>

<p><strong>Nota:</strong> Este enlace expira en 24 horas.</p>

<p>Si no solicitaste esta invitación, puedes ignorar este email.</p>

<p>Saludos,<br>El equipo de DateNova</p>
```

5. **Click en "Save"** (Guardar)

---

### **Paso 2: Configurar URL de Redirección**

1. **En Authentication**, ve a **URL Configuration**

2. **En "Site URL"**, agrega tu dominio de producción:
   ```
   https://date-nova-control-proyectos.vercel.app
   ```

3. **En "Redirect URLs"**, agrega estas URLs:
   ```
   https://date-nova-control-proyectos.vercel.app/activate-account
   https://date-nova-control-proyectos.vercel.app/auth/callback
   http://localhost:5173/activate-account
   http://localhost:5173/auth/callback
   ```

4. **Click en "Save"**

---

### **Paso 3: Configurar Confirmación de Email**

1. **En Authentication**, ve a **Settings** → **Email Auth**

2. **Asegúrate que estas opciones estén configuradas**:

   - ✅ **Enable email confirmations** → **ACTIVADO**
     - Esto hace que Supabase envíe un email cuando se crea un usuario

   - ✅ **Secure email change** → **ACTIVADO**
     - Requiere confirmación para cambios de email

   - ⏱️ **Email confirmation expiry** → **86400 segundos** (24 horas)
     - Tiempo antes de que expire el link de activación

3. **Click en "Save"**

---

### **Paso 4: Configurar Proveedor de Email (Opcional pero Recomendado)**

Por defecto, Supabase usa su servicio de email gratuito con límites:
- ✅ **50,000 emails/mes gratis**
- ⚠️ Los emails pueden llegar a spam

**Para producción, se recomienda configurar tu propio proveedor:**

#### **Opción A: SendGrid (Recomendado)**

1. Ve a **Project Settings** → **Auth** → **SMTP Settings**

2. Selecciona **"Enable Custom SMTP"**

3. Configura con tus credenciales de SendGrid:
   ```
   Host: smtp.sendgrid.net
   Port: 587
   Username: apikey
   Password: [TU_SENDGRID_API_KEY]
   Sender Email: noreply@tudomain.com
   Sender Name: DateNova
   ```

4. **Click en "Save"**

#### **Opción B: Resend (Alternativa Moderna)**

1. Crea cuenta en [resend.com](https://resend.com)
2. Obtén tu API Key
3. Configura SMTP:
   ```
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: [TU_RESEND_API_KEY]
   Sender Email: invitations@tudomain.com
   Sender Name: DateNova
   ```

#### **Opción C: Gmail (Solo para desarrollo)**

⚠️ **NO recomendado para producción** (límite de 500 emails/día)

```
Host: smtp.gmail.com
Port: 587
Username: tu-email@gmail.com
Password: [App Password - requiere 2FA habilitado]
```

---

## 🧪 Probar el Sistema

### **1. Probar Invitación en Local**

1. Inicia tu app localmente: `npm run dev`
2. Ve a la página **Usuarios**
3. Click en **"Invitar / Nuevo Usuario"**
4. Completa el formulario:
   - Email: tu-email-de-prueba@gmail.com
   - Rol: Desarrollador
5. Click en **"Enviar Invitación"**

### **2. Verificar Email Recibido**

1. Revisa tu bandeja de entrada (y spam)
2. Deberías recibir un email de Supabase
3. El email debe tener:
   - ✅ Asunto personalizado
   - ✅ Botón "Activar mi cuenta"
   - ✅ Link funcional

### **3. Activar Cuenta**

1. Haz click en el botón del email
2. Deberías ser redirigido a: `http://localhost:5173/activate-account`
3. Establece tu contraseña
4. Inicia sesión ✅

---

## 🔍 Troubleshooting

### **Problema 1: No llegan los emails**

**Solución:**
1. Ve a **Authentication** → **Logs** en Supabase Dashboard
2. Busca errores relacionados con email
3. Verifica que "Enable email confirmations" esté activado
4. Revisa la carpeta de spam

### **Problema 2: Error "Email not allowed"**

**Solución:**
1. Ve a **Authentication** → **Providers** → **Email**
2. Asegúrate que **"Enable Email provider"** esté activado
3. Verifica que no hay restricciones de dominio

### **Problema 3: Link de activación no funciona**

**Solución:**
1. Verifica que la URL de redirección esté configurada correctamente
2. Asegúrate que `/activate-account` esté en "Redirect URLs"
3. Revisa que el link no haya expirado (24 horas por defecto)

### **Problema 4: Usuario recibe "User already registered"**

**Solución:**
Este email ya existe en Supabase Auth. Opciones:
1. Eliminar el usuario desde **Authentication** → **Users**
2. O usar la función "Reenviar invitación" si ya existe

---

## 📊 Monitoreo

### **Ver estadísticas de emails**

1. **Supabase Dashboard** → **Authentication** → **Logs**
   - Filtra por "email" para ver emails enviados
   - Revisa errores de entrega

2. **Si usas SendGrid/Resend**:
   - Ve a su dashboard para estadísticas detalladas
   - Tasa de apertura
   - Tasa de clicks
   - Emails rebotados

---

## 🎨 Personalización Avanzada

### **Personalizar Email con Logo**

En la plantilla de email, agrega tu logo:

```html
<div style="text-align: center; margin-bottom: 24px;">
  <img src="https://tu-domain.com/logo.png" alt="DateNova" width="120">
</div>
```

### **Cambiar colores del botón**

Edita el estilo del botón:

```html
style="background-color: #4f46e5; color: white; padding: 12px 24px; ..."
```

Cambia `#4f46e5` por el color de tu marca.

---

## 🚀 Flujo Completo de Invitación

```
1. Admin → Click "Invitar Usuario"
           ↓
2. Sistema → Crea usuario en Supabase Auth
           ↓
3. Sistema → Guarda invitación en tabla "invitations"
           ↓
4. Supabase → Envía email automáticamente
           ↓
5. Usuario → Recibe email → Click en link
           ↓
6. App → Redirige a /activate-account
           ↓
7. Usuario → Establece contraseña
           ↓
8. Sistema → Crea perfil en tabla "usuarios"
           ↓
9. Usuario → Inicia sesión ✅
```

---

## 📝 Notas Importantes

- ✅ Los emails se envían **automáticamente** - no necesitas código adicional
- ✅ Los tokens son **seguros** y expiran en 24 horas
- ✅ Supabase maneja **toda la seguridad** del proceso
- ⚠️ Configura tu propio SMTP para producción (mejor deliverability)
- ⚠️ Personaliza las plantillas con tu branding

---

## ✅ Checklist de Configuración

- [ ] Email Templates personalizadas
- [ ] Site URL configurada
- [ ] Redirect URLs agregadas
- [ ] Email confirmations habilitadas
- [ ] SMTP personalizado configurado (producción)
- [ ] Plantilla de email probada
- [ ] Flujo completo testeado

---

¿Tienes dudas? Revisa la [documentación oficial de Supabase Auth](https://supabase.com/docs/guides/auth/auth-email).
