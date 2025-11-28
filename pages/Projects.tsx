
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Proyecto, Empresa } from '../types';
import { Button, Input, Select, Modal, Card, Badge } from '../components/UI';
import { Plus, Edit2, Trash2, Calendar, Filter } from 'lucide-react';

export const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Proyecto[]>([]);
  const [companies, setCompanies] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Proyecto | null>(null);
  
  // Filter State
  const [filterStatus, setFilterStatus] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    empresa_id: '',
    estado: 'pendiente',
    fecha_inicio: '',
    fecha_fin: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: projData } = await supabase.from('proyectos').select('*, empresas(nombre)').order('created_at', { ascending: false });
    const { data: compData } = await supabase.from('empresas').select('*');
    
    if (projData) setProjects(projData as Proyecto[]);
    if (compData) setCompanies(compData as Empresa[]);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const payload = {
      ...formData,
      empresa_id: formData.empresa_id || null,
      fecha_inicio: formData.fecha_inicio || null,
      fecha_fin: formData.fecha_fin || null,
    };

    if (editingProject) {
      await supabase.from('proyectos').update(payload).eq('id', editingProject.id);
    } else {
      await supabase.from('proyectos').insert([payload]);
    }

    setIsModalOpen(false);
    setEditingProject(null);
    setFormData({ nombre: '', descripcion: '', empresa_id: '', estado: 'pendiente', fecha_inicio: '', fecha_fin: '' });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este proyecto?')) {
      await supabase.from('proyectos').delete().eq('id', id);
      fetchData();
    }
  };

  const openModal = (proj?: Proyecto) => {
    if (proj) {
      setEditingProject(proj);
      setFormData({
        nombre: proj.nombre,
        descripcion: proj.descripcion || '',
        empresa_id: proj.empresa_id || '',
        estado: proj.estado,
        fecha_inicio: proj.fecha_inicio || '',
        fecha_fin: proj.fecha_fin || ''
      });
    } else {
      setEditingProject(null);
      setFormData({ nombre: '', descripcion: '', empresa_id: '', estado: 'pendiente', fecha_inicio: '', fecha_fin: '' });
    }
    setIsModalOpen(true);
  };

  // Filter Logic
  const filteredProjects = projects.filter(proj => {
    if (!filterStatus) return true;
    return proj.estado === filterStatus;
  });

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h2 className="text-xl font-semibold text-gray-800">Gestión de Proyectos</h2>
           <p className="text-sm text-gray-500">Administra y monitorea el progreso de tus contratos.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-stretch sm:items-center">
            <div className="w-full sm:w-48">
              <Select 
                options={[
                  { value: '', label: 'Todos los estados' },
                  { value: 'pendiente', label: 'Pendiente' },
                  { value: 'en_progreso', label: 'En Progreso' },
                  { value: 'pausado', label: 'Pausado' },
                  { value: 'completado', label: 'Completado' },
                ]}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              />
            </div>
            <Button onClick={() => openModal()} className="whitespace-nowrap">
                <Plus size={18} className="mr-2" /> Nuevo Proyecto
            </Button>
        </div>
      </div>

      {loading && !isModalOpen ? (
         <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((proj) => (
            <Card key={proj.id} className="hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                   <h3 className="text-lg font-medium text-gray-900 line-clamp-1">{proj.nombre}</h3>
                   <p className="text-sm text-gray-500">{proj.empresas?.nombre || 'Sin Cliente'}</p>
                </div>
                <Badge color={
                   proj.estado === 'completado' ? 'green' : 
                   proj.estado === 'en_progreso' ? 'blue' : 
                   proj.estado === 'pausado' ? 'yellow' : 'gray'
                }>
                  {proj.estado.replace('_', ' ')}
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                {proj.descripcion || 'Sin descripción'}
              </p>

              <div className="flex items-center text-xs text-gray-500 mb-4 space-x-4">
                <div className="flex items-center">
                  <Calendar size={14} className="mr-1" />
                  {proj.fecha_inicio || '--'}
                </div>
                <span>→</span>
                <div className="flex items-center">
                  <Calendar size={14} className="mr-1" />
                  {proj.fecha_fin || '--'}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100 space-x-2">
                <Button variant="ghost" className="p-2" onClick={() => openModal(proj)}>
                  <Edit2 size={16} className="text-gray-600" />
                </Button>
                <Button variant="ghost" className="p-2" onClick={() => handleDelete(proj.id)}>
                  <Trash2 size={16} className="text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
          
          {filteredProjects.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
               <div className="flex justify-center mb-2">
                 <Filter className="text-gray-300 h-10 w-10" />
               </div>
               <p className="text-gray-500">No se encontraron proyectos con este criterio.</p>
               {filterStatus && (
                 <button 
                   onClick={() => setFilterStatus('')}
                   className="text-sm text-primary-600 hover:text-primary-800 mt-2 font-medium"
                 >
                   Limpiar filtros
                 </button>
               )}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Nombre del Proyecto" 
            value={formData.nombre} 
            onChange={e => setFormData({...formData, nombre: e.target.value})}
            required
          />
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              rows={3}
              value={formData.descripcion}
              onChange={e => setFormData({...formData, descripcion: e.target.value})}
            />
          </div>
          <Select
            label="Cliente / Empresa"
            options={[{value: '', label: 'Seleccione empresa'}, ...companies.map(c => ({ value: c.id, label: c.nombre }))]}
            value={formData.empresa_id}
            onChange={e => setFormData({...formData, empresa_id: e.target.value})}
          />
          <Select
            label="Estado"
            options={[
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'en_progreso', label: 'En Progreso' },
              { value: 'pausado', label: 'Pausado' },
              { value: 'completado', label: 'Completado' },
            ]}
            value={formData.estado}
            onChange={e => setFormData({...formData, estado: e.target.value as any})}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              type="date"
              label="Fecha Inicio"
              value={formData.fecha_inicio}
              onChange={e => setFormData({...formData, fecha_inicio: e.target.value})}
            />
            <Input 
              type="date"
              label="Fecha Fin"
              value={formData.fecha_fin}
              onChange={e => setFormData({...formData, fecha_fin: e.target.value})}
            />
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit">{editingProject ? 'Guardar Cambios' : 'Crear Proyecto'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
