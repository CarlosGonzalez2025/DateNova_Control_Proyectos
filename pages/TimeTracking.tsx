import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Tarea, RegistroHora, Usuario } from '../types';
import { Button, Input, Select, Card } from '../components/UI';
import { Plus, Clock } from 'lucide-react';

export const TimeTracking: React.FC<{ currentUserId?: string }> = ({ currentUserId }) => {
  const [entries, setEntries] = useState<RegistroHora[]>([]);
  const [tasks, setTasks] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    tarea_id: '',
    horas: 1,
    fecha: new Date().toISOString().split('T')[0],
    descripcion: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: logData } = await supabase
      .from('registro_horas')
      .select('*, tareas(nombre, proyecto_id), usuarios(nombre)')
      .order('created_at', { ascending: false })
      .limit(50);
      
    const { data: taskData } = await supabase
      .from('tareas')
      .select('id, nombre, proyecto_id, horas_reales')
      .neq('estado', 'completada'); // Only show active tasks

    if (logData) setEntries(logData as RegistroHora[]);
    if (taskData) setTasks(taskData as Tarea[]);
    setLoading(false);
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tarea_id) return;
    setLoading(true);

    try {
      // 1. Insert Log
      const { error } = await supabase.from('registro_horas').insert([{
        ...formData,
        usuario_id: currentUserId || null // In real app, this comes from auth context
      }]);

      if (error) throw error;

      // 2. Update Task "Real Hours" (Trigger usually handles this, but we do it manually for this frontend-heavy demo)
      const task = tasks.find(t => t.id === formData.tarea_id);
      if (task) {
        const newTotal = (Number(task.horas_reales) || 0) + Number(formData.horas);
        await supabase.from('tareas').update({ horas_reales: newTotal }).eq('id', task.id);
      }

      setFormData({ ...formData, descripcion: '', horas: 1, tarea_id: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error al registrar horas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form Section */}
      <div className="lg:col-span-1">
        <Card title="Registrar Tiempo" className="sticky top-6">
          <form onSubmit={handleAddLog} className="space-y-4">
            <Select
              label="Tarea"
              options={[{value: '', label: 'Seleccionar Tarea'}, ...tasks.map(t => ({ value: t.id, label: t.nombre }))]}
              value={formData.tarea_id}
              onChange={e => setFormData({...formData, tarea_id: e.target.value})}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                type="date"
                label="Fecha"
                value={formData.fecha}
                onChange={e => setFormData({...formData, fecha: e.target.value})}
                required
              />
              <Input 
                type="number" step="0.25"
                label="Horas"
                value={formData.horas}
                onChange={e => setFormData({...formData, horas: parseFloat(e.target.value)})}
                required
              />
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del trabajo</label>
              <textarea
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                value={formData.descripcion}
                onChange={e => setFormData({...formData, descripcion: e.target.value})}
                placeholder="¿Qué realizaste?"
                required
              />
            </div>
            <Button type="submit" className="w-full" isLoading={loading}>
              <Plus size={18} className="mr-2" /> Registrar
            </Button>
          </form>
        </Card>
      </div>

      {/* History List */}
      <div className="lg:col-span-2">
        <Card title="Historial Reciente">
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="mb-2 sm:mb-0">
                  <h4 className="text-sm font-semibold text-gray-900">{entry.tareas?.nombre}</h4>
                  <p className="text-sm text-gray-600">{entry.descripcion}</p>
                  <div className="text-xs text-gray-400 mt-1">
                    {entry.usuarios?.nombre || 'Usuario'} • {entry.fecha}
                  </div>
                </div>
                <div className="flex items-center text-primary-600 font-medium">
                  <Clock size={16} className="mr-2" />
                  {entry.horas} hrs
                </div>
              </div>
            ))}
            {entries.length === 0 && (
              <p className="text-center text-gray-500 py-6">No hay registros recientes.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};