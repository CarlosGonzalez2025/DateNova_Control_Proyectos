
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Proyecto, Tarea, Usuario } from '../types';
import { Button, Input, Select, Modal, Badge, ProgressBar, ConfirmationModal } from '../components/UI';
import { Plus, Edit2, Trash2, Clock, Search, X, Check, Users as UsersIcon, Filter } from 'lucide-react';

export const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Tarea[]>([]);
  const [projects, setProjects] = useState<Proyecto[]>([]);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Tarea | null>(null);
  
  // Delete Modal State
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  
  // Filters
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUsers, setFilterUsers] = useState<string[]>([]); // New Multi-user filter state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Current user info to check permissions
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    proyecto_id: '',
    // responsable_id: '', // Deprecated for UI, kept for backend compatibility if needed
    prioridad: 'media',
    estado: 'pendiente',
    horas_estimadas: 0,
    fecha_vencimiento: ''
  });

  // Multi-select state
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

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

    // Fetch tasks including joined data for projects, legacy responsible user, and new assignments
    const { data: taskData } = await supabase
      .from('tareas')
      .select(`
        *, 
        proyectos(nombre), 
        usuarios(nombre, avatar_url),
        task_assignments(
          usuarios(id, nombre, avatar_url, rol)
        )
      `)
      .order('created_at', { ascending: false });
      
    const { data: projData } = await supabase.from('proyectos').select('*');
    const { data: usrData } = await supabase.from('usuarios').select('*');

    if (taskData) {
      // Map the nested task_assignments to the flat assignees array
      const mappedTasks = taskData.map((t: any) => ({
        ...t,
        assignees: t.task_assignments?.map((ta: any) => ta.usuarios) || []
      }));
      setTasks(mappedTasks as Tarea[]);
    }
    
    if (projData) setProjects(projData as Proyecto[]);
    if (usrData) setUsers(usrData as Usuario[]);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.proyecto_id) return alert('Debes seleccionar un proyecto');

    setLoading(true);
    
    const isClient = currentUser?.rol === 'cliente';
    // If client, keep existing assignments/responsable logic minimal
    // For admin/asesor, use the selectedAssignees
    
    // Compatibility: Set responsable_id to the first selected user or null
    const primaryResponsable = selectedAssignees.length > 0 ? selectedAssignees[0] : null;

    const payload = {
      ...formData,
      responsable_id: isClient ? (editingTask?.responsable_id || null) : primaryResponsable,
      fecha_vencimiento: formData.fecha_vencimiento || null,
    };

    let taskId = editingTask?.id;

    if (editingTask) {
      // Update Task
      await supabase.from('tareas').update(payload).eq('id', editingTask.id);
    } else {
      // Insert Task
      const { data, error } = await supabase.from('tareas').insert([payload]).select().single();
      if (error) {
        alert('Error creando tarea');
        setLoading(false);
        return;
      }
      taskId = data.id;
    }

    // Handle Assignments (Only if not client, or if client created it initially empty)
    if (!isClient && taskId) {
       // 1. Delete existing assignments
       await supabase.from('task_assignments').delete().eq('task_id', taskId);

       // 2. Insert new assignments
       if (selectedAssignees.length > 0) {
         const assignmentsToInsert = selectedAssignees.map(userId => ({
           task_id: taskId,
           user_id: userId,
           role_in_task: 'collaborator'
         }));
         await supabase.from('task_assignments').insert(assignmentsToInsert);
       }
    }

    setIsModalOpen(false);
    setEditingTask(null);
    fetchData();
  };

  const handleDelete = (id: string) => {
    setTaskToDelete(id);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    setIsDeleteLoading(true);
    try {
      await supabase.from('tareas').delete().eq('id', taskToDelete);
      await fetchData();
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setIsDeleteLoading(false);
      setTaskToDelete(null);
    }
  };

  const openModal = (task?: Tarea) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        nombre: task.nombre,
        descripcion: task.descripcion || '',
        proyecto_id: task.proyecto_id,
        prioridad: task.prioridad as any,
        estado: task.estado as any,
        horas_estimadas: task.horas_estimadas || 0,
        fecha_vencimiento: task.fecha_vencimiento || ''
      });
      // Pre-select assignees
      if (task.assignees) {
        setSelectedAssignees(task.assignees.map(u => u.id));
      } else if (task.responsable_id) {
        setSelectedAssignees([task.responsable_id]);
      } else {
        setSelectedAssignees([]);
      }
    } else {
      setEditingTask(null);
      setFormData({ 
        nombre: '', descripcion: '', proyecto_id: filterProject || '', 
        prioridad: 'media', estado: 'pendiente', horas_estimadas: 0, fecha_vencimiento: '' 
      });
      setSelectedAssignees([]);
    }
    setIsModalOpen(true);
  };

  const toggleAssignee = (userId: string) => {
      setSelectedAssignees(prev => 
          prev.includes(userId) 
            ? prev.filter(id => id !== userId)
            : [...prev, userId]
      );
  };

  // Logic: Can assign users? (Only Admin, Asesor, Superadmin)
  const canAssign = currentUser?.rol === 'superadmin' || currentUser?.rol === 'asesor' || currentUser?.rol === 'desarrollador';

  // Filter out clients from assignee list
  const assignableUsers = users.filter(u => u.rol !== 'cliente');

  // Filter Helpers
  const addFilterUser = (userId: string) => {
      if (!userId || filterUsers.includes(userId)) return;
      setFilterUsers([...filterUsers, userId]);
  };

  const removeFilterUser = (userId: string) => {
      setFilterUsers(filterUsers.filter(id => id !== userId));
  };

  // Combined Filtering Logic
  const filteredTasks = tasks.filter(task => {
      // 1. Filter by Project
      const matchesProject = filterProject ? task.proyecto_id === filterProject : true;
      
      // 2. Filter by Status
      const matchesStatus = filterStatus ? task.estado === filterStatus : true;

      // 3. Filter by Search Query (Name or Description)
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        task.nombre.toLowerCase().includes(query) || 
        (task.descripcion && task.descripcion.toLowerCase().includes(query));
        
      // 4. Filter by Users (Assignees)
      const matchesUsers = filterUsers.length === 0 || (
          task.assignees && task.assignees.some(assignee => filterUsers.includes(assignee.id))
      );

      return matchesProject && matchesStatus && matchesSearch && matchesUsers;
  });

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Órdenes de Servicio</h2>
          <p className="text-sm text-gray-500">Gestión de tickets, solicitudes y asignaciones.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto items-stretch md:items-center flex-wrap">
          
          {/* Search Input */}
          <div className="relative w-full md:w-56">
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

          {/* Status Filter */}
          <select 
            className="border rounded-md px-3 py-2 text-sm w-full md:w-40 border-gray-300 focus:ring-primary-500 focus:border-primary-500 outline-none"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_progreso">En Progreso</option>
            <option value="completada">Completada</option>
          </select>

          {/* Project Filter */}
          <select 
            className="border rounded-md px-3 py-2 text-sm w-full md:w-48 border-gray-300 focus:ring-primary-500 focus:border-primary-500 outline-none"
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
          >
            <option value="">Todos los proyectos</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>

           {/* User Filter (Multi-select trigger) */}
           <div className="relative w-full md:w-48">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <UsersIcon size={16} className="text-gray-400" />
              </div>
              <select 
                className="pl-9 block w-full border rounded-md px-3 py-2 text-sm border-gray-300 focus:ring-primary-500 focus:border-primary-500 outline-none"
                value=""
                onChange={e => addFilterUser(e.target.value)}
              >
                <option value="">Filtrar por usuario...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id} disabled={filterUsers.includes(u.id)}>
                    {u.nombre}
                  </option>
                ))}
              </select>
          </div>
          
          <Button onClick={() => openModal()} className="whitespace-nowrap">
            <Plus size={18} className="mr-2" /> Nueva Orden
          </Button>
        </div>
      </div>

      {/* Active User Filters Tags */}
      {filterUsers.length > 0 && (
         <div className="flex flex-wrap gap-2 mb-4 items-center bg-gray-50 p-2 rounded-md border border-gray-100">
             <span className="text-xs text-gray-500 font-medium flex items-center">
                 <Filter size={12} className="mr-1" /> Filtros activos:
             </span>
             {filterUsers.map(userId => {
                 const user = users.find(u => u.id === userId);
                 return (
                     <span key={userId} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                         {user?.nombre || 'Usuario'}
                         <button onClick={() => removeFilterUser(userId)} className="ml-1 text-indigo-500 hover:text-indigo-900 focus:outline-none">
                             <X size={12} />
                         </button>
                     </span>
                 );
             })}
             <button 
                onClick={() => setFilterUsers([])} 
                className="text-xs text-gray-500 underline hover:text-red-500 ml-auto"
            >
                Limpiar filtros
            </button>
         </div>
      )}

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
                    <div className="mt-2">
                        {/* Logic to display multiple assignees or fallback to legacy single user */}
                        {(task.assignees && task.assignees.length > 0) ? (
                           <div className="flex -space-x-2 overflow-hidden items-center">
                              {task.assignees.map(user => (
                                  <div key={user.id} className="relative group">
                                     {user.avatar_url ? (
                                        <img 
                                            src={user.avatar_url} 
                                            alt={user.nombre} 
                                            className="w-6 h-6 rounded-full border border-white object-cover"
                                            title={user.nombre}
                                        />
                                     ) : (
                                        <div 
                                          className="w-6 h-6 rounded-full bg-indigo-100 border border-white flex items-center justify-center text-[10px] font-bold text-indigo-700"
                                          title={user.nombre}
                                        >
                                            {getInitials(user.nombre)}
                                        </div>
                                     )}
                                  </div>
                              ))}
                              {task.assignees.length === 1 && <span className="text-xs text-gray-500 ml-3 self-center">{task.assignees[0].nombre}</span>}
                           </div>
                        ) : task.usuarios ? (
                            <div className="flex items-center gap-2">
                                {task.usuarios.avatar_url ? (
                                    <img 
                                        src={task.usuarios.avatar_url} 
                                        alt={task.usuarios.nombre} 
                                        className="w-6 h-6 rounded-full border border-gray-200 object-cover"
                                    />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-[10px] font-bold text-indigo-700">
                                        {getInitials(task.usuarios.nombre)}
                                    </div>
                                )}
                                <span className="text-xs font-medium text-gray-600">{task.usuarios.nombre}</span>
                            </div>
                        ) : (
                            <div className="flex items-center text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-200 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
                                Sin Asignar
                            </div>
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

      {/* Edit/Create Modal */}
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
          
          {/* Asignación Múltiple (Equipo) */}
          {canAssign && (
             <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Equipo Asignado</label>
                <div className="border border-gray-300 rounded-md max-h-40 overflow-y-auto divide-y divide-gray-100">
                    {assignableUsers.length > 0 ? assignableUsers.map(user => (
                        <div 
                            key={user.id} 
                            className={`flex items-center p-2 cursor-pointer transition-colors ${selectedAssignees.includes(user.id) ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                            onClick={() => toggleAssignee(user.id)}
                        >
                            <div className={`w-4 h-4 mr-3 flex items-center justify-center border rounded ${selectedAssignees.includes(user.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                {selectedAssignees.includes(user.id) && <Check size={12} className="text-white" />}
                            </div>
                            <div className="flex items-center flex-1">
                                {user.avatar_url ? (
                                    <img src={user.avatar_url} className="w-6 h-6 rounded-full mr-2 object-cover" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 mr-2">
                                        {getInitials(user.nombre)}
                                    </div>
                                )}
                                <div className="text-sm text-gray-700">
                                    {user.nombre} <span className="text-xs text-gray-400 ml-1 capitalize">({user.rol})</span>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="p-3 text-sm text-gray-500 text-center">No hay usuarios internos disponibles</div>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Selecciona uno o más responsables para esta tarea.</p>
             </div>
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal 
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar Orden de Servicio"
        message="¿Estás seguro de que deseas eliminar esta orden? Se perderán todos los registros de horas asociados."
        confirmText="Eliminar"
        isLoading={isDeleteLoading}
      />
    </div>
  );
};
