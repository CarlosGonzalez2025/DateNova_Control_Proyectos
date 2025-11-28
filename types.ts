
export interface Empresa {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  created_at?: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'cliente' | 'asesor' | 'apoyo' | 'superadmin' | 'desarrollador';
  empresa_id: string | null;
  tarifa_hora?: number; // Costo Interno (Nómina)
  billable_rate?: number; // Tarifa de Venta (Facturable al cliente)
  avatar_url?: string;
  created_at?: string;
  // Joins
  empresas?: Empresa;
}

export interface Invitation {
  id: string;
  email: string;
  rol: 'cliente' | 'asesor' | 'apoyo' | 'superadmin' | 'desarrollador';
  empresa_id: string | null;
  tarifa_hora?: number;
  billable_rate?: number;
  status: 'pending' | 'accepted';
  created_at?: string;
}

export interface Proyecto {
  id: string;
  nombre: string;
  descripcion: string | null;
  empresa_id: string | null;
  estado: 'pendiente' | 'en_progreso' | 'completado' | 'pausado';
  fecha_inicio: string | null;
  fecha_fin: string | null;
  budget?: number; // Presupuesto financiero del proyecto
  created_at?: string;
  // Joins
  empresas?: Empresa;
}

export interface Tarea {
  id: string;
  nombre: string;
  descripcion: string | null;
  proyecto_id: string;
  responsable_id: string | null; // Deprecated in favor of assignments, kept for backward compat
  prioridad: 'baja' | 'media' | 'alta';
  estado: 'pendiente' | 'en_progreso' | 'completada';
  horas_estimadas: number;
  horas_reales: number;
  fecha_vencimiento: string | null;
  created_at?: string;
  // Joins
  proyectos?: Proyecto;
  usuarios?: Usuario; // Legacy join
  assignees?: Usuario[]; // Computed property for frontend
}

export interface RegistroHora {
  id: string;
  tarea_id: string;
  usuario_id: string | null;
  fecha: string;
  horas: number;
  descripcion: string | null;
  created_at?: string;
  // Joins
  tareas?: Tarea;
  usuarios?: Usuario;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  role_in_task: string;
}

export interface Comment {
    id: string;
    task_id?: string;
    project_id?: string;
    user_id: string;
    content: string;
    is_internal: boolean;
    created_at: string;
    // Joins
    usuarios?: Usuario;
}

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'assignment' | 'status_change' | 'comment' | 'mention' | 'info';
    link?: string;
    read: boolean;
    created_at: string;
}

export interface MetricData {
  name: string;
  value: number;
}