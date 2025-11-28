
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Proyecto, Tarea, Usuario } from '../types';
import { Button, Input, Select, Modal, Card, Badge, ProgressBar } from '../components/UI';
import { Plus, Edit2, Trash2, Clock, UserCheck, Search, X } from 'lucide-react';

export const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Tarea[]>([]);
  const [projects, setProjects] = useState<Proyecto[]>([]);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Tarea | null>(null);
  
  // Filters
  const [filterProject, setFilterProject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Current user info to check permissions
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    proyecto_id: '',
    responsable_id: '',
    prioridad: 'media',
    estado: 'pendiente',
    horas_estimadas: 0,
    fecha_vencimiento: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Get Current User Info
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase.from('usuarios').select('*').eq('id', user.id).single();
      setCurrentUser(userData as Usuario);
    }

    const { data: taskData } = await supabase
      .from('tareas')
      .select('*, proyectos(nombre), usuarios(nombre)')
      .order('created_at', { ascending: false });
      
    const { data: projData } = await supabase.from('proyectos').select('*');
    const { data: usrData } = await supabase.from('usuarios').select('*');

    if (taskData) setTasks(taskData as Tarea[]);
    if (projData) setProjects(projData as Proyecto[]);
    if (usrData) setUsers(usrData as Usuario[]);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.proyecto_id) return alert('Debes seleccionar un proyecto');

    setLoading(true);
    
    // If client, force responsibly to be null initially (Admin assigns later)
    const isClient = currentUser?.rol === 'cliente';
    
    const payload = {
      ...formData,
      responsable_id: isClient ? (editingTask?.responsable_id || null) : (formData.responsable_id || null),
      fecha_vencimiento: formData.fecha_vencimiento || null,
    };

    if (editingTask) {
      await supabase.from('tareas').update(payload).eq('id', editingTask.id);
    } else {
      await supabase.from('tareas').insert([payload]);
    }

    setIsModalOpen(false);
    setEditingTask(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Eliminar orden de servicio?')) {
      await supabase.from('tareas').delete().eq('id', id);
      fetchData();
    }
  };

  const openModal = (task?: Tarea) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        nombre: task.nombre,
        descripcion: task.descripcion || '',
        proyecto_id: task.proyecto_id,
        responsable_id: task.responsable_id || '',
        prioridad: task.prioridad as any,
        estado: task.estado as any,
        horas_estimadas: task.horas_estimadas || 0,
        fecha_vencimiento: task.fecha_vencimiento || ''
      });
    } else {
      setEditingTask(null);
      setFormData({ 
        nombre: '', descripcion: '', proyecto_id: filterProject || '', responsable_id: '', 
        prioridad: 'media', estado: 'pendiente', horas_estimadas: 0, fecha_vencimiento: '' 
      });
    }
    setIsModalOpen(true);
  };

  // Logic: Can assign users? (Only Admin, Asesor, Superadmin)
  const canAssign = currentUser?.rol === 'superadmin' || currentUser?.rol === 'asesor';

  // Combined Filtering Logic
  const filteredTasks = tasks.filter(task => {
      // 1. Filter by Project
      const matchesProject = filterProject ? task.proyecto_id === filterProject : true;
      
      // 2. Filter by Search Query (Name or Description)
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        task.nombre.toLowerCase().includes(query) || 
        (task.descripcion && task.descripcion.toLowerCase().includes(query));

      return matchesProject && matchesSearch;
  });

  return (
    <div>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Órdenes de Servicio</h2>
          <p className="text-sm text-gray-500">Gestión de tickets, solicitudes y asignaciones.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto items-stretch md:items-center">
          
          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="pl-9 pr-8 block w-full border rounded-md px-3 py-2 text-sm border-gray-300 focus:ring-primary-500 focus:border-primary-500 outline-none transition-shadow"
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Project Filter */}
          <select 
            className="border rounded-md px-3 py-2 text-sm w-full md:w-48 border-gray-300 focus:ring-primary-500 focus:border-primary-500 outline-none"
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
          >
            <option value="">Todos los proyectos</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          
          <Button onClick={() => openModal()} className="whitespace-nowrap">
            <Plus size={18} className="mr-2" /> Nueva Orden
          </Button>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orden / Tarea</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Proyecto / Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad/Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Horas</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{task.nombre}</div>
                    <div className="text-xs text-gray-500 md:hidden">{task.proyectos?.nombre}</div>
                    <div className="flex items-center mt-1">
                        {task.usuarios ? (
                            <div className="flex items-center text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">
                                <UserCheck size={12} className="mr-1"/> {task.usuarios.nombre}
                            </div>
                        ) : (
                            <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">Sin Asignar</span>
                        )}
                    </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                    <div className="text-sm text-gray-600 font-medium">{task.proyectos?.nombre}</div>
                    </td>
                    <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 items-start">
                        <Badge color={task.prioridad === 'alta' ? 'red' : task.prioridad === 'media' ? 'yellow' : 'blue'}>
                        {task.prioridad}
                        </Badge>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        task.estado === 'completada' ? 'border-green-200 text-green-700' : 
                        task.estado === 'en_progreso' ? 'border-blue-200 text-blue-700' : 
                        'border-gray-200 text-gray-600'
                        }`}>
                        {task.estado.replace('_', ' ')}
                        </span>
                    </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                    <div className="w-32">
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                            <Clock size={14} className="mr-1 text-gray-400" />
                            <span>{task.horas_reales || 0} / {task.horas_estimadas} h</span>
                        </div>
                        <ProgressBar 
                            current={task.horas_reales || 0} 
                            max={task.horas_estimadas || 0} 
                            showText={false}
                        />
                    </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                    <button onClick={() => openModal(task)} className="text-primary-600 hover:text-primary-900 mr-3">
                        <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(task.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 size={16} />
                    </button>
                    </td>
                </tr>
                ))
            ) : (
                <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No se encontraron órdenes que coincidan con tu búsqueda.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask ? 'Editar Orden' : 'Nueva Orden de Servicio'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Título de la Orden" 
            placeholder="Ej. Revisión mensual, Bugfix login..."
            value={formData.nombre} 
            onChange={e => setFormData({...formData, nombre: e.target.value})}
            required
          />
          <Select
            label="Proyecto / Cliente"
            options={[{value: '', label: 'Seleccionar...'}, ...projects.map(p => ({ value: p.id, label: p.nombre }))]}
            value={formData.proyecto_id}
            onChange={e => setFormData({...formData, proyecto_id: e.target.value})}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Prioridad"
              options={[{ value: 'baja', label: 'Baja' }, { value: 'media', label: 'Media' }, { value: 'alta', label: 'Alta' }]}
              value={formData.prioridad}
              onChange={e => setFormData({...formData, prioridad: e.target.value as any})}
            />
            <Select
              label="Estado"
              options={[{ value: 'pendiente', label: 'Pendiente' }, { value: 'en_progreso', label: 'En Progreso' }, { value: 'completada', label: 'Completada' }]}
              value={formData.estado}
              onChange={e => setFormData({...formData, estado: e.target.value as any})}
            />
          </div>
          
          {/* Asignación solo visible para roles administrativos */}
          {canAssign && (
              <Select
                label="Asignar Responsable (Desarrollador/Asesor)"
                options={[{value: '', label: 'Sin asignar'}, ...users.map(u => ({ value: u.id, label: `${u.nombre} (${u.rol})` }))]}
                value={formData.responsable_id}
                onChange={e => setFormData({...formData, responsable_id: e.target.value})}
              />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input 
              type="number" step="0.5"
              label="Horas Estimadas"
              value={formData.horas_estimadas}
              onChange={e => setFormData({...formData, horas_estimadas: parseFloat(e.target.value)})}
            />
            <Input 
              type="date"
              label="Fecha Entrega Deseada"
              value={formData.fecha_vencimiento}
              onChange={e => setFormData({...formData, fecha_vencimiento: e.target.value})}
            />
          </div>
           <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción Detallada</label>
            <textarea
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              rows={3}
              value={formData.descripcion}
              onChange={e => setFormData({...formData, descripcion: e.target.value})}
              placeholder="Detalles del requerimiento..."
            />
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Guardar Orden</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
