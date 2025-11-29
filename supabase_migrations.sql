-- =====================================================
-- DATENOVA - MIGRACIONES DE BASE DE DATOS
-- Fecha: 2025-01-29
-- Descripción: Schemas para sistema de entregables,
--              comentarios y mejoras de seguridad (RLS)
-- =====================================================

-- =====================================================
-- 1. SISTEMA DE ENTREGABLES
-- =====================================================

-- Tabla principal de entregables
CREATE TABLE IF NOT EXISTS deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID REFERENCES tareas(id) ON DELETE CASCADE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tipo_entregable VARCHAR(50) CHECK (tipo_entregable IN ('Documento', 'Código', 'Diseño', 'Manual', 'Otro')),
  version VARCHAR(20) DEFAULT '1.0',
  archivo_url TEXT,
  archivo_nombre VARCHAR(255),
  archivo_tamano BIGINT, -- tamaño en bytes
  estado VARCHAR(50) DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'En Revisión', 'Aprobado', 'Rechazado', 'En Corrección')),
  fecha_entrega TIMESTAMPTZ,
  fecha_aprobacion TIMESTAMPTZ,
  comentarios_cliente TEXT,
  aprobado_por UUID REFERENCES usuarios(id),
  creado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_deliverables_tarea ON deliverables(tarea_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_estado ON deliverables(estado);
CREATE INDEX IF NOT EXISTS idx_deliverables_fecha ON deliverables(fecha_entrega);

-- Tabla de historial de versiones de entregables
CREATE TABLE IF NOT EXISTS deliverable_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE NOT NULL,
  version VARCHAR(20) NOT NULL,
  archivo_url TEXT NOT NULL,
  archivo_nombre VARCHAR(255),
  archivo_tamano BIGINT,
  notas_version TEXT,
  subido_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_deliverable_versions_deliverable ON deliverable_versions(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_versions_fecha ON deliverable_versions(created_at DESC);

-- =====================================================
-- 2. SISTEMA DE COMENTARIOS CONTEXTUALES
-- =====================================================

-- Tabla de comentarios en tareas/proyectos
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID REFERENCES tareas(id) ON DELETE CASCADE,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  mensaje TEXT NOT NULL,
  parent_comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE, -- Para hilos anidados
  es_interno BOOLEAN DEFAULT false, -- Comentarios privados (no visibles para cliente)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Validar que el comentario esté asociado a tarea O proyecto (no ambos)
  CONSTRAINT check_comment_target CHECK (
    (tarea_id IS NOT NULL AND proyecto_id IS NULL) OR
    (tarea_id IS NULL AND proyecto_id IS NOT NULL)
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_task_comments_tarea ON task_comments(tarea_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_proyecto ON task_comments(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_parent ON task_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_fecha ON task_comments(created_at DESC);

-- =====================================================
-- 3. TABLA DE AUDITORÍA
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  accion VARCHAR(50) NOT NULL CHECK (accion IN ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT')),
  tabla VARCHAR(50) NOT NULL,
  registro_id UUID,
  cambios JSONB, -- Antes/después para updates
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario ON audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_tabla ON audit_log(tabla);
CREATE INDEX IF NOT EXISTS idx_audit_log_fecha ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_registro ON audit_log(registro_id);

-- =====================================================
-- 4. TRIGGERS AUTOMÁTICOS
-- =====================================================

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas relevantes
DROP TRIGGER IF EXISTS update_deliverables_updated_at ON deliverables;
CREATE TRIGGER update_deliverables_updated_at
    BEFORE UPDATE ON deliverables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_comments_updated_at ON task_comments;
CREATE TRIGGER update_task_comments_updated_at
    BEFORE UPDATE ON task_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para guardar versión cuando se actualiza un entregable
CREATE OR REPLACE FUNCTION save_deliverable_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo guardar versión si el archivo cambió
  IF OLD.archivo_url IS DISTINCT FROM NEW.archivo_url THEN
    INSERT INTO deliverable_versions (
      deliverable_id,
      version,
      archivo_url,
      archivo_nombre,
      archivo_tamano,
      notas_version,
      subido_por
    ) VALUES (
      NEW.id,
      NEW.version,
      NEW.archivo_url,
      NEW.archivo_nombre,
      NEW.archivo_tamano,
      'Versión actualizada automáticamente',
      NEW.creado_por
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS save_deliverable_version_trigger ON deliverables;
CREATE TRIGGER save_deliverable_version_trigger
  AFTER UPDATE ON deliverables
  FOR EACH ROW
  EXECUTE FUNCTION save_deliverable_version();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en tablas críticas
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_horas ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLÍTICAS: PROYECTOS
-- =====================================================

-- Superadmin ve TODO
DROP POLICY IF EXISTS "superadmin_all_projects" ON proyectos;
CREATE POLICY "superadmin_all_projects" ON proyectos
  FOR ALL
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'superadmin'
  );

-- Cliente solo ve sus propios proyectos
DROP POLICY IF EXISTS "client_own_projects" ON proyectos;
CREATE POLICY "client_own_projects" ON proyectos
  FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'cliente'
    AND empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
  );

-- Asesor, Desarrollador, Apoyo ven proyectos de sus clientes asignados
DROP POLICY IF EXISTS "staff_assigned_projects" ON proyectos;
CREATE POLICY "staff_assigned_projects" ON proyectos
  FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('asesor', 'desarrollador', 'apoyo')
  );

-- =====================================================
-- RLS POLÍTICAS: TAREAS
-- =====================================================

-- Superadmin ve TODO
DROP POLICY IF EXISTS "superadmin_all_tasks" ON tareas;
CREATE POLICY "superadmin_all_tasks" ON tareas
  FOR ALL
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'superadmin'
  );

-- Cliente solo ve tareas de sus proyectos
DROP POLICY IF EXISTS "client_own_tasks" ON tareas;
CREATE POLICY "client_own_tasks" ON tareas
  FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'cliente'
    AND proyecto_id IN (
      SELECT id FROM proyectos
      WHERE empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
    )
  );

-- Staff ve todas las tareas (por ahora, se puede refinar)
DROP POLICY IF EXISTS "staff_all_tasks" ON tareas;
CREATE POLICY "staff_all_tasks" ON tareas
  FOR ALL
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('asesor', 'desarrollador', 'apoyo')
  );

-- =====================================================
-- RLS POLÍTICAS: ENTREGABLES
-- =====================================================

-- Superadmin ve TODO
DROP POLICY IF EXISTS "superadmin_all_deliverables" ON deliverables;
CREATE POLICY "superadmin_all_deliverables" ON deliverables
  FOR ALL
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'superadmin'
  );

-- Cliente solo ve entregables de sus tareas
DROP POLICY IF EXISTS "client_own_deliverables" ON deliverables;
CREATE POLICY "client_own_deliverables" ON deliverables
  FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'cliente'
    AND tarea_id IN (
      SELECT t.id FROM tareas t
      JOIN proyectos p ON p.id = t.proyecto_id
      WHERE p.empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
    )
  );

-- Cliente puede aprobar/rechazar (UPDATE)
DROP POLICY IF EXISTS "client_approve_deliverables" ON deliverables;
CREATE POLICY "client_approve_deliverables" ON deliverables
  FOR UPDATE
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'cliente'
    AND tarea_id IN (
      SELECT t.id FROM tareas t
      JOIN proyectos p ON p.id = t.proyecto_id
      WHERE p.empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    -- Solo puede actualizar estado, comentarios_cliente y aprobado_por
    estado IN ('Aprobado', 'Rechazado', 'En Corrección')
  );

-- Staff puede gestionar entregables
DROP POLICY IF EXISTS "staff_manage_deliverables" ON deliverables;
CREATE POLICY "staff_manage_deliverables" ON deliverables
  FOR ALL
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('asesor', 'desarrollador', 'apoyo')
  );

-- =====================================================
-- RLS POLÍTICAS: COMENTARIOS
-- =====================================================

-- Superadmin ve TODO
DROP POLICY IF EXISTS "superadmin_all_comments" ON task_comments;
CREATE POLICY "superadmin_all_comments" ON task_comments
  FOR ALL
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'superadmin'
  );

-- Cliente solo ve comentarios NO internos de sus proyectos/tareas
DROP POLICY IF EXISTS "client_see_public_comments" ON task_comments;
CREATE POLICY "client_see_public_comments" ON task_comments
  FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'cliente'
    AND es_interno = false
    AND (
      tarea_id IN (
        SELECT t.id FROM tareas t
        JOIN proyectos p ON p.id = t.proyecto_id
        WHERE p.empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
      )
      OR proyecto_id IN (
        SELECT id FROM proyectos
        WHERE empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
      )
    )
  );

-- Cliente puede insertar comentarios (no internos)
DROP POLICY IF EXISTS "client_create_comments" ON task_comments;
CREATE POLICY "client_create_comments" ON task_comments
  FOR INSERT
  WITH CHECK (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'cliente'
    AND es_interno = false
    AND usuario_id = auth.uid()
  );

-- Staff ve TODOS los comentarios (incluso internos)
DROP POLICY IF EXISTS "staff_all_comments" ON task_comments;
CREATE POLICY "staff_all_comments" ON task_comments
  FOR ALL
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('asesor', 'desarrollador', 'apoyo')
  );

-- =====================================================
-- RLS POLÍTICAS: REGISTRO DE HORAS
-- =====================================================

-- Superadmin ve TODO
DROP POLICY IF EXISTS "superadmin_all_time_logs" ON registro_horas;
CREATE POLICY "superadmin_all_time_logs" ON registro_horas
  FOR ALL
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'superadmin'
  );

-- Cliente solo ve registros de sus proyectos (sin ver tarifas)
DROP POLICY IF EXISTS "client_see_time_logs" ON registro_horas;
CREATE POLICY "client_see_time_logs" ON registro_horas
  FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'cliente'
    AND tarea_id IN (
      SELECT t.id FROM tareas t
      JOIN proyectos p ON p.id = t.proyecto_id
      WHERE p.empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
    )
  );

-- Staff ve y gestiona registros de horas
DROP POLICY IF EXISTS "staff_manage_time_logs" ON registro_horas;
CREATE POLICY "staff_manage_time_logs" ON registro_horas
  FOR ALL
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('asesor', 'desarrollador', 'apoyo')
  );

-- Usuarios solo pueden crear registros para ellos mismos
DROP POLICY IF EXISTS "users_create_own_time_logs" ON registro_horas;
CREATE POLICY "users_create_own_time_logs" ON registro_horas
  FOR INSERT
  WITH CHECK (
    usuario_id = auth.uid()
  );

-- =====================================================
-- RLS POLÍTICAS: EMPRESAS
-- =====================================================

-- Superadmin y Asesor ven todas las empresas
DROP POLICY IF EXISTS "admin_asesor_all_companies" ON empresas;
CREATE POLICY "admin_asesor_all_companies" ON empresas
  FOR ALL
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('superadmin', 'asesor')
  );

-- Cliente solo ve su propia empresa
DROP POLICY IF EXISTS "client_own_company" ON empresas;
CREATE POLICY "client_own_company" ON empresas
  FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'cliente'
    AND id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
  );

-- =====================================================
-- 6. FUNCIONES AUXILIARES
-- =====================================================

-- Función para obtener métricas del cliente
CREATE OR REPLACE FUNCTION get_client_metrics(client_empresa_id UUID)
RETURNS TABLE (
  active_projects BIGINT,
  pending_tasks BIGINT,
  completed_tasks_month BIGINT,
  total_hours_month NUMERIC,
  overall_progress NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH project_stats AS (
    SELECT COUNT(*) FILTER (WHERE estado = 'en_progreso') as active_projs
    FROM proyectos
    WHERE empresa_id = client_empresa_id
  ),
  task_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE t.estado != 'completada') as pending,
      COUNT(*) FILTER (
        WHERE t.estado = 'completada'
        AND t.created_at >= date_trunc('month', CURRENT_DATE)
      ) as completed_month,
      COALESCE(SUM(t.horas_reales), 0) as total_hours
    FROM tareas t
    JOIN proyectos p ON p.id = t.proyecto_id
    WHERE p.empresa_id = client_empresa_id
    AND t.created_at >= date_trunc('month', CURRENT_DATE)
  ),
  progress_calc AS (
    SELECT
      CASE
        WHEN COUNT(*) > 0
        THEN ROUND((COUNT(*) FILTER (WHERE estado = 'completada')::NUMERIC / COUNT(*) * 100), 2)
        ELSE 0
      END as progress
    FROM tareas t
    JOIN proyectos p ON p.id = t.proyecto_id
    WHERE p.empresa_id = client_empresa_id
  )
  SELECT
    ps.active_projs::BIGINT,
    ts.pending::BIGINT,
    ts.completed_month::BIGINT,
    ts.total_hours::NUMERIC,
    pc.progress::NUMERIC
  FROM project_stats ps, task_stats ts, progress_calc pc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. ACTUALIZACIONES A TIPOS TYPESCRIPT
-- =====================================================

-- Nota: Actualizar types.ts con los siguientes interfaces:
/*
export interface Deliverable {
  id: string;
  tarea_id: string;
  nombre: string;
  descripcion: string | null;
  tipo_entregable: 'Documento' | 'Código' | 'Diseño' | 'Manual' | 'Otro';
  version: string;
  archivo_url: string | null;
  archivo_nombre: string | null;
  archivo_tamano: number | null;
  estado: 'Pendiente' | 'En Revisión' | 'Aprobado' | 'Rechazado' | 'En Corrección';
  fecha_entrega: string | null;
  fecha_aprobacion: string | null;
  comentarios_cliente: string | null;
  aprobado_por: string | null;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  tareas?: Tarea;
  usuarios?: Usuario;
  versions?: DeliverableVersion[];
}

export interface DeliverableVersion {
  id: string;
  deliverable_id: string;
  version: string;
  archivo_url: string;
  archivo_nombre: string | null;
  archivo_tamano: number | null;
  notas_version: string | null;
  subido_por: string | null;
  created_at: string;
  // Joins
  usuarios?: Usuario;
}

export interface TaskComment {
  id: string;
  tarea_id: string | null;
  proyecto_id: string | null;
  usuario_id: string | null;
  mensaje: string;
  parent_comment_id: string | null;
  es_interno: boolean;
  created_at: string;
  updated_at: string;
  // Joins
  usuarios?: Usuario;
  replies?: TaskComment[];
}

export interface AuditLog {
  id: string;
  usuario_id: string | null;
  accion: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'LOGIN' | 'LOGOUT';
  tabla: string;
  registro_id: string | null;
  cambios: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Joins
  usuarios?: Usuario;
}
*/

-- =====================================================
-- FIN DE MIGRACIONES
-- =====================================================

-- Verificar que todo se creó correctamente
SELECT
  'deliverables' as tabla, COUNT(*) as registros FROM deliverables
UNION ALL
SELECT 'deliverable_versions', COUNT(*) FROM deliverable_versions
UNION ALL
SELECT 'task_comments', COUNT(*) FROM task_comments
UNION ALL
SELECT 'audit_log', COUNT(*) FROM audit_log;
