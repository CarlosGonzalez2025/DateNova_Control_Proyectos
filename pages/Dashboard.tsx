
import React, { useEffect, useState } from 'react';
import { Badge, ProgressBar } from '../components/UI';
import { supabase } from '../services/supabase';
import { Proyecto, Tarea, Usuario } from '../types';
import { AlertCircle, DollarSign, TrendingUp, Users, Wallet, CheckCircle } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState({
    revenue: 0,
    cost: 0,
    profit: 0
  });
  const [stats, setStats] = useState({
    activeProjects: 0,
    pendingTasks: 0,
    urgentTasks: 0,
    efficiency: 0
  });
  
  const [activeProjects, setActiveProjects] = useState<Proyecto[]>([]);
  const [criticalTasks, setCriticalTasks] = useState<Tarea[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [users, setUsers] = useState<Usuario[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Core Data
      const { data: projectsData } = await supabase.from('proyectos').select('*, empresas(nombre)');
      const { data: tasksData } = await supabase.from('tareas').select('*, proyectos(nombre), usuarios(nombre, avatar_url)');
      const { data: logsData } = await supabase.from('registro_horas').select('*, usuarios(tarifa_hora, billable_rate)');
      const { data: usersData } = await supabase.from('usuarios').select('*');

      if (projectsData && tasksData && logsData && usersData) {
        
        // --- Financial Logic (The Money Engine) ---
        let totalRevenue = 0;
        let totalCost = 0;

        logsData.forEach((log: any) => {
           const hours = Number(log.horas) || 0;
           const userCostRate = Number(log.usuarios?.tarifa_hora) || 0;
           const userBillRate = Number(log.usuarios?.billable_rate) || 0;

           totalCost += hours * userCostRate;
           totalRevenue += hours * userBillRate;
        });

        setFinancials({
            revenue: totalRevenue,
            cost: totalCost,
            profit: totalRevenue - totalCost
        });

        // --- Operational Stats ---
        const pending = tasksData.filter(t => t.estado !== 'completada');
        const completed = tasksData.filter(t => t.estado === 'completada');
        const urgent = pending.filter(t => t.prioridad === 'alta');
        
        // Efficiency: Tasks completed vs total
        const efficiency = tasksData.length > 0 ? (completed.length / tasksData.length) * 100 : 0;

        setStats({
            activeProjects: projectsData.filter(p => p.estado === 'en_progreso').length,
            pendingTasks: pending.length,
            urgentTasks: urgent.length,
            efficiency
        });

        setActiveProjects(projectsData.filter(p => p.estado === 'en_progreso').slice(0, 5) as Proyecto[]);
        setCriticalTasks(urgent.slice(0, 4) as Tarea[]);
        setUsers(usersData as Usuario[]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  // Chart Data Preparation
  const profitMargin = financials.revenue > 0 ? (financials.profit / financials.revenue) * 100 : 0;
  
  return (
    <div className="space-y-8">
      
      {/* 1. Header & Welcome */}
      <div className="flex justify-between items-end">
         <div>
             <h2 className="text-2xl font-bold text-slate-900">Dashboard General</h2>
             <p className="text-slate-500 mt-1">Vista general del rendimiento operativo y financiero.</p>
         </div>
         <div className="hidden md:flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
             <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
             <span className="text-sm font-medium text-slate-700">Sistema en línea</span>
         </div>
      </div>

      {/* 2. Financial Widgets (Revenue, Cost, Profit) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
             <div className="flex justify-between items-start z-10 relative">
                <div>
                   <p className="text-sm font-medium text-slate-500 mb-1">Facturación Total</p>
                   <h3 className="text-3xl font-bold text-slate-800">${financials.revenue.toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                   <TrendingUp size={24} />
                </div>
             </div>
             <p className="text-xs text-green-600 mt-4 font-medium flex items-center z-10 relative">
                 + Base facturable calculada
             </p>
             {/* Decorative BG */}
             <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-green-50 rounded-full opacity-50"></div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
             <div className="flex justify-between items-start z-10 relative">
                <div>
                   <p className="text-sm font-medium text-slate-500 mb-1">Costo Operativo</p>
                   <h3 className="text-3xl font-bold text-slate-800">${financials.cost.toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                   <Wallet size={24} />
                </div>
             </div>
             <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5 z-10 relative">
                 <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${Math.min((financials.cost / (financials.revenue || 1)) * 100, 100)}%` }}></div>
             </div>
             <p className="text-xs text-slate-400 mt-2 z-10 relative">Gasto en nómina vs Ingreso</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
             <div className="flex justify-between items-start z-10 relative">
                <div>
                   <p className="text-sm font-medium text-slate-500 mb-1">Margen Neto</p>
                   <h3 className={`text-3xl font-bold ${financials.profit >= 0 ? 'text-indigo-900' : 'text-red-600'}`}>
                       ${financials.profit.toLocaleString()}
                   </h3>
                </div>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                   <DollarSign size={24} />
                </div>
             </div>
             <p className="text-xs text-indigo-600 mt-4 font-medium z-10 relative">
                 {profitMargin.toFixed(1)}% de Rentabilidad
             </p>
          </div>
      </div>

      {/* 3. Operational Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* Main Project List */}
         <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold text-lg text-slate-800">Proyectos Activos</h3>
                <Badge color="blue">{stats.activeProjects} En curso</Badge>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Proyecto</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Equipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeProjects.map((project) => (
                      <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800">{project.nombre}</p>
                          <p className="text-xs text-slate-500">{project.empresas?.nombre || 'Interno'}</p>
                        </td>
                        <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                En Progreso
                            </span>
                        </td>
                        <td className="px-6 py-4">
                           {/* Team Avatar Mockup - In real generic listing, we might show generic avatars or fetch assignees */}
                           <div className="flex -space-x-2">
                               {[1, 2].map(i => (
                                   <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs text-slate-500">
                                       <Users size={14} />
                                   </div>
                               ))}
                           </div>
                        </td>
                      </tr>
                    ))}
                    {activeProjects.length === 0 && (
                        <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No hay proyectos activos actualmente.</td></tr>
                    )}
                  </tbody>
                </table>
            </div>
         </div>

         {/* Critical Tasks & Efficiency */}
         <div className="space-y-6">
             <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-semibold text-lg text-slate-800 mb-4 flex items-center gap-2">
                    <AlertCircle size={20} className="text-red-500" />
                    Atención Requerida
                </h3>
                <div className="space-y-4">
                    {criticalTasks.map(task => (
                        <div key={task.id} className="p-3 rounded-lg border border-red-100 bg-red-50/20 hover:bg-red-50/50 transition-colors cursor-pointer">
                            <div className="flex justify-between mb-2">
                                <h4 className="font-medium text-slate-800 text-sm line-clamp-1">{task.nombre}</h4>
                                <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded uppercase">Alta</span>
                            </div>
                            <p className="text-xs text-slate-500 mb-2">{task.proyectos?.nombre}</p>
                            <ProgressBar 
                                current={task.horas_reales || 0} 
                                max={task.horas_estimadas || 0} 
                                showText={true} 
                            />
                        </div>
                    ))}
                    {criticalTasks.length === 0 && (
                        <div className="text-center py-4 text-slate-400 text-sm">
                            <CheckCircle size={24} className="mx-auto mb-2 text-green-400" />
                            Todo bajo control
                        </div>
                    )}
                </div>
             </div>

             <div className="bg-indigo-900 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
                 <div className="relative z-10">
                    <h3 className="font-bold text-lg mb-1">Eficiencia Global</h3>
                    <p className="text-indigo-200 text-sm mb-4">Tasa de finalización de órdenes</p>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold">{Math.round(stats.efficiency)}%</span>
                        <span className="text-sm text-indigo-300 mb-1">completado</span>
                    </div>
                 </div>
                 <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
                     <CheckCircle size={120} />
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};
