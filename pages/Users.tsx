import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Usuario, Empresa, Invitation } from '../types';
import { Button, Input, Select, Modal, Badge, ConfirmationModal } from '../components/UI';
import { Edit2, UserPlus, Mail, Trash2, Send } from 'lucide-react';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [companies, setCompanies] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  
  // Delete Modal State
  const [itemToDelete, setItemToDelete] = useState<{ type: 'user' | 'invitation', id: string } | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    rol: 'asesor',
    empresa_id: '',
    tarifa_hora: 0,
    billable_rate: 0
  });

  const [inviteData, setInviteData] = useState({
    email: '',
    rol: 'asesor',
    empresa_id: '',
    tarifa_hora: 0,
    billable_rate: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: userData } = await supabase.from('usuarios').select('*, empresas(nombre)').order('created_at', { ascending: false });
    const { data: compData } = await supabase.from('empresas').select('*');
    const { data: invData } = await supabase.from('invitations').select('*').eq('status', 'pending');

    if (userData) setUsers(userData as Usuario[]);
    if (compData) setCompanies(compData as Empresa[]);
    if (invData) setInvitations(invData as Invitation[]);
    setLoading(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setLoading(true);
    try {
        const payload = {
          nombre: formData.nombre,
          rol: formData.rol,
          empresa_id: formData.empresa_id || null,
          tarifa_hora: formData.tarifa_hora || 0,
          billable_rate: formData.billable_rate || 0
        };
    
        const { error } = await supabase.from('usuarios').update(payload).eq('id', editingUser.id);
        if (error) throw error;
        
        setIsModalOpen(false);
        setEditingUser(null);
        fetchData();
    } catch (err: any) {
        alert('Error al actualizar: ' + err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('invitations').insert([{
        email: inviteData.email,
        rol: inviteData.rol,
        empresa_id: inviteData.empresa_id || null,
        tarifa_hora: inviteData.tarifa_hora,
        billable_rate: inviteData.billable_rate,
        status: 'pending'
      }]);

      if (error) throw error;
      
      alert('Invitación creada exitosamente.\n\nIMPORTANTE: Ahora debes enviar el correo al usuario haciendo clic en el botón "Enviar" en la lista de invitaciones.');
      setIsInviteModalOpen(false);
      setInviteData({ email: '', rol: 'asesor', empresa_id: '', tarifa_hora: 0, billable_rate: 0 });
      fetchData();
    } catch (err: any) {
      alert('Error al invitar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvitation = (id: string) => {
    setItemToDelete({ type: 'invitation', id });
  };

  const handleDeleteUser = (id: string) => {
    setItemToDelete({ type: 'user', id });
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleteLoading(true);
    
    try {
      if (itemToDelete.type === 'invitation') {
        await supabase.from('invitations').delete().eq('id', itemToDelete.id);
      } else if (itemToDelete.type === 'user') {
        // Warning: Deleting from public.usuarios does NOT delete from auth.users.
        // In a real app with backend, we would call Admin API.
        // Here we just delete the profile, which effectively removes them from the app UI.
        await supabase.from('usuarios').delete().eq('id', itemToDelete.id);
      }
      await fetchData();
    } catch (error: any) {
      console.error('Error deleting:', error);
      alert('Error al eliminar: ' + error.message);
    } finally {
      setIsDeleteLoading(false);
      setItemToDelete(null);
    }
  };

  const sendInvitationEmail = (email: string, role: string) => {
    const subject = "Invitación a colaborar en Datenova";
    const body = `Hola,\n\nTe hemos invitado a unirte al equipo de Datenova con el rol de ${role.toUpperCase()}.\n\nPara activar tu cuenta, por favor regístrate usando este correo electrónico (${email}) en el siguiente enlace:\n\n${window.location.origin}\n\n¡Bienvenido!`;
    
    // Prompt the user to copy link if mailto fails or for testing
    const link = window.location.origin;
    const msg = `Enlace de registro para enviar a ${email}:\n${link}`;
    // We use a prompt so user can copy it manually if needed
    if(!window.confirm(`Se abrirá tu cliente de correo.\n\nSi prefieres copiar el enlace manualmente, cancela y usa este:\n${link}\n\n¿Abrir correo?`)) {
       prompt("Copia este enlace y envíalo al usuario:", link);
       return; 
    }

    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const openModal = (user: Usuario) => {
    setEditingUser(user);
    setFormData({
      nombre: user.nombre || '',
      rol: user.rol,
      empresa_id: user.empresa_id || '',
      tarifa_hora: user.tarifa_hora || 0,
      billable_rate: user.billable_rate || 0
    });
    setIsModalOpen(true);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Equipo y Usuarios</h2>
            <p className="text-sm text-gray-500">Administra roles, accesos y estructura de costos.</p>
        </div>
        <Button onClick={() => setIsInviteModalOpen(true)}>
            <UserPlus size={18} className="mr-2" /> Invitar / Nuevo Usuario
        </Button>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Empresa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarifas (Costo / Venta)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-3 border border-indigo-200">
                        {user.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-gray-900">{user.nombre || 'Sin nombre'}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                    <Badge color={
                        user.rol === 'superadmin' ? 'red' : 
                        user.rol === 'desarrollador' || user.rol === 'apoyo' ? 'blue' : 
                        user.rol === 'cliente' ? 'green' : 'yellow'
                    }>
                        {user.rol === 'apoyo' ? 'ASESOR TÉCNICO' : user.rol.toUpperCase()}
                    </Badge>
                </td>
                <td className="px-6 py-4 hidden md:table-cell">
                   <div className="text-sm text-gray-600">
                       {/* @ts-ignore */}
                       {user.empresas?.nombre || 'Interno (Staff)'}
                   </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-center text-gray-500" title="Costo Interno (Nómina)">
                       <span className="w-16 text-xs">Costo:</span>
                       <span className="font-mono text-xs">${user.tarifa_hora || 0}</span>
                    </div>
                    <div className="flex items-center text-green-700 font-medium" title="Precio de Venta al Cliente">
                       <span className="w-16 text-xs">Venta:</span>
                       <span className="font-mono text-xs">${user.billable_rate || 0}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button 
                        onClick={() => openModal(user)} 
                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded-full hover:bg-indigo-100 transition-colors"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={() => handleDeleteUser(user.id)} 
                        className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-full hover:bg-red-100 transition-colors"
                        title="Eliminar usuario"
                    >
                        <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {invitations.length > 0 && (
        <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Mail size={20} /> Invitaciones Pendientes
            </h3>
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-yellow-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-yellow-800 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-yellow-800 uppercase">Rol Asignado</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-yellow-800 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {invitations.map(inv => (
                            <tr key={inv.id}>
                                <td className="px-6 py-4 text-sm text-gray-900">{inv.email}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 capitalize">{inv.rol === 'apoyo' ? 'Asesor Técnico' : inv.rol}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => sendInvitationEmail(inv.email, inv.rol)} 
                                            className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 rounded-md transition-colors"
                                            title="Enviar email de invitación"
                                        >
                                            <Send size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteInvitation(inv.id)} 
                                            className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 rounded-md transition-colors"
                                            title="Eliminar invitación"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Modal Editar Usuario Existente */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Configuración de Usuario">
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input 
            label="Nombre Completo" 
            value={formData.nombre} 
            onChange={e => setFormData({...formData, nombre: e.target.value})}
          />
          
          <Select
            label="Rol del Sistema"
            options={[
              { value: 'cliente', label: 'Cliente (Acceso Externo)' },
              { value: 'asesor', label: 'Asesor (Project Manager)' },
              { value: 'apoyo', label: 'Asesor Técnico (Apoyo)' },
              { value: 'desarrollador', label: 'Desarrollador (Técnico)' },
              { value: 'superadmin', label: 'Super Admin (Dueño)' },
            ]}
            value={formData.rol}
            onChange={e => setFormData({...formData, rol: e.target.value})}
          />

          <Select
            label="Empresa (Solo para Clientes)"
            options={[{value: '', label: 'Ninguna / Staff Interno'}, ...companies.map(c => ({ value: c.id, label: c.nombre }))]}
            value={formData.empresa_id}
            onChange={e => setFormData({...formData, empresa_id: e.target.value})}
          />

          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
             <div>
                <Input 
                    type="number" 
                    label="Costo Hora (Interno)" 
                    placeholder="0.00"
                    value={formData.tarifa_hora}
                    onChange={e => setFormData({...formData, tarifa_hora: parseFloat(e.target.value)})}
                    step="0.01"
                />
                <p className="text-[10px] text-gray-500 mt-1">Lo que pagas al empleado.</p>
             </div>
             <div>
                <Input 
                    type="number" 
                    label="Tarifa Venta (Cliente)" 
                    placeholder="0.00"
                    value={formData.billable_rate}
                    onChange={e => setFormData({...formData, billable_rate: parseFloat(e.target.value)})}
                    step="0.01"
                />
                <p className="text-[10px] text-gray-500 mt-1">Lo que cobras al cliente.</p>
             </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Guardar Cambios</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Invitar Nuevo Usuario */}
      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Invitar Nuevo Usuario">
        <form onSubmit={handleInvite} className="space-y-4">
          <p className="text-sm text-gray-500 mb-4 bg-blue-50 p-3 rounded-md border border-blue-100">
             Configura los permisos para el nuevo usuario. Cuando la persona se registre con este email, 
             el sistema le asignará automáticamente estos roles y tarifas.
          </p>
          <Input 
            type="email"
            label="Correo Electrónico" 
            placeholder="ejemplo@correo.com"
            value={inviteData.email} 
            onChange={e => setInviteData({...inviteData, email: e.target.value})}
            required
          />
          
          <Select
            label="Rol Asignado"
            options={[
              { value: 'cliente', label: 'Cliente' },
              { value: 'asesor', label: 'Asesor (Project Manager)' },
              { value: 'apoyo', label: 'Asesor Técnico (Apoyo)' },
              { value: 'desarrollador', label: 'Desarrollador' },
              { value: 'superadmin', label: 'Super Admin' },
            ]}
            value={inviteData.rol}
            onChange={e => setInviteData({...inviteData, rol: e.target.value})}
          />

          {(inviteData.rol !== 'cliente') && (
               <Select
                label="Asignar a Empresa (Opcional)"
                options={[{value: '', label: 'Personal Interno'}, ...companies.map(c => ({ value: c.id, label: c.nombre }))]}
                value={inviteData.empresa_id}
                onChange={e => setInviteData({...inviteData, empresa_id: e.target.value})}
              />
          )}

          {(inviteData.rol === 'desarrollador' || inviteData.rol === 'asesor' || inviteData.rol === 'apoyo') && (
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div>
                    <Input 
                        type="number" 
                        label="Costo Hora (Interno)" 
                        value={inviteData.tarifa_hora}
                        onChange={e => setInviteData({...inviteData, tarifa_hora: parseFloat(e.target.value)})}
                        step="0.01"
                    />
                </div>
                <div>
                    <Input 
                        type="number" 
                        label="Tarifa Venta (Cliente)" 
                        value={inviteData.billable_rate}
                        onChange={e => setInviteData({...inviteData, billable_rate: parseFloat(e.target.value)})}
                        step="0.01"
                    />
                </div>
            </div>
          )}

          <div className="pt-4 flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setIsInviteModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Generar Invitación</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal 
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
        title={itemToDelete?.type === 'user' ? 'Eliminar Usuario' : 'Cancelar Invitación'}
        message={itemToDelete?.type === 'user' 
            ? '¿Estás seguro de eliminar este usuario? Perderá acceso inmediato al sistema.' 
            : '¿Deseas cancelar esta invitación pendiente?'}
        confirmText={itemToDelete?.type === 'user' ? 'Eliminar Usuario' : 'Cancelar Invitación'}
        isLoading={isDeleteLoading}
      />
    </div>
  );
};