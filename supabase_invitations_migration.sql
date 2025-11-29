-- =====================================================
-- MIGRATION: Sistema de Invitaciones de Usuarios
-- Versión: 2.1.0
-- Fecha: 2025-11-29
-- =====================================================

-- Crear tabla de invitaciones si no existe
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL CHECK (rol IN ('superadmin', 'asesor', 'desarrollador', 'apoyo', 'cliente')),
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  tarifa_hora DECIMAL(10, 2) DEFAULT 0,
  billable_rate DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'cancelled', 'expired')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(email, status) -- No permitir múltiples invitaciones pendientes para el mismo email
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_user_id ON invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_empresa_id ON invitations(empresa_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_invitations_updated_at ON invitations;
CREATE TRIGGER trigger_update_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_invitations_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Solo superadmins pueden ver invitaciones
DROP POLICY IF EXISTS "superadmin_select_invitations" ON invitations;
CREATE POLICY "superadmin_select_invitations" ON invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol = 'superadmin'
    )
  );

-- Policy: Solo superadmins pueden crear invitaciones
DROP POLICY IF EXISTS "superadmin_insert_invitations" ON invitations;
CREATE POLICY "superadmin_insert_invitations" ON invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol = 'superadmin'
    )
  );

-- Policy: Solo superadmins pueden actualizar invitaciones
DROP POLICY IF EXISTS "superadmin_update_invitations" ON invitations;
CREATE POLICY "superadmin_update_invitations" ON invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol = 'superadmin'
    )
  );

-- Policy: Solo superadmins pueden eliminar invitaciones
DROP POLICY IF EXISTS "superadmin_delete_invitations" ON invitations;
CREATE POLICY "superadmin_delete_invitations" ON invitations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol = 'superadmin'
    )
  );

-- =====================================================
-- FUNCIÓN PARA LIMPIAR INVITACIONES EXPIRADAS
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE invitations
  SET status = 'expired'
  WHERE status IN ('pending', 'sent')
    AND expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Opcional: Crear un cron job para limpiar invitaciones expiradas automáticamente
-- Nota: Requiere extensión pg_cron (no siempre disponible en Supabase free tier)
-- SELECT cron.schedule('cleanup-expired-invitations', '0 0 * * *', $$SELECT cleanup_expired_invitations()$$);

-- =====================================================
-- DATOS DE EJEMPLO (OPCIONAL - COMENTAR EN PRODUCCIÓN)
-- =====================================================

-- Ejemplo de invitación (descomenta para testing)
-- INSERT INTO invitations (email, rol, status, invited_at)
-- VALUES ('test@example.com', 'desarrollador', 'pending', CURRENT_TIMESTAMP)
-- ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que la tabla se creó correctamente
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
    RAISE NOTICE 'Tabla invitations creada exitosamente';
  ELSE
    RAISE EXCEPTION 'Error: Tabla invitations no fue creada';
  END IF;
END $$;

-- Verificar RLS
DO $$
BEGIN
  IF (SELECT rowsecurity FROM pg_tables WHERE tablename = 'invitations') THEN
    RAISE NOTICE 'RLS habilitado en invitations';
  ELSE
    RAISE WARNING 'RLS NO está habilitado en invitations';
  END IF;
END $$;

COMMENT ON TABLE invitations IS 'Gestión de invitaciones de usuarios al sistema';
COMMENT ON COLUMN invitations.status IS 'Estado de la invitación: pending (creada), sent (email enviado), accepted (usuario activado), cancelled (cancelada por admin), expired (expirada)';
COMMENT ON COLUMN invitations.expires_at IS 'Fecha de expiración de la invitación (7 días por defecto)';
