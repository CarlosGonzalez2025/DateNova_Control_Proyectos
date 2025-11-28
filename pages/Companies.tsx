import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Empresa } from '../types';
import { Button, Input, Modal, Card, ConfirmationModal } from '../components/UI';
import { Plus, Edit2, Trash2, Search, Building2, MapPin, Phone, Mail, X } from 'lucide-react';

export const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Empresa | null>(null);

  // Delete Modal State
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('empresas').select('*').order('created_at', { ascending: false });
    if (data) setCompanies(data as Empresa[]);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      nombre: formData.nombre,
      email: formData.email || null,
      telefono: formData.telefono || null,
      direccion: formData.direccion || null
    };

    if (editingCompany) {
      await supabase.from('empresas').update(payload).eq('id', editingCompany.id);
    } else {
      await supabase.from('empresas').insert([payload]);
    }

    setIsModalOpen(false);
    setEditingCompany(null);
    setFormData({ nombre: '', email: '', telefono: '', direccion: '' });
    fetchData();
  };

  const handleDelete = (id: string) => {
    setCompanyToDelete(id);
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;
    setIsDeleteLoading(true);
    try {
      await supabase.from('empresas').delete().eq('id', companyToDelete);
      await fetchData();
    } catch (error) {
      console.error('Error deleting company:', error);
    } finally {
      setIsDeleteLoading(false);
      setCompanyToDelete(null);
    }
  };

  const openModal = (company?: Empresa) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        nombre: company.nombre,
        email: company.email || '',
        telefono: company.telefono || '',
        direccion: company.direccion || ''
      });
    } else {
      setEditingCompany(null);
      setFormData({ nombre: '', email: '', telefono: '', direccion: '' });
    }
    setIsModalOpen(true);
  };

  const filteredCompanies = companies.filter(c => 
    c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Cartera de Clientes</h2>
          <p className="text-sm text-gray-500">Administra las empresas y contactos externos.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
             </div>
             <input
                type="text"
                className="pl-9 pr-8 block w-full border rounded-md px-3 py-2 text-sm border-gray-300 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="Buscar empresa..."
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
          <Button onClick={() => openModal()} className="whitespace-nowrap">
            <Plus size={18} className="mr-2" /> Nueva Empresa
          </Button>
        </div>
      </div>

      {loading && !isModalOpen ? (
         <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Building2 size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{company.nombre}</h3>
                        <p className="text-xs text-gray-500">ID: ...{company.id.slice(-4)}</p>
                    </div>
                 </div>
                 <div className="flex gap-1">
                    <button onClick={() => openModal(company)} className="text-gray-400 hover:text-indigo-600 p-1">
                        <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(company.id)} className="text-gray-400 hover:text-red-600 p-1">
                        <Trash2 size={16} />
                    </button>
                 </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                 {company.direccion && (
                     <div className="flex items-start gap-2">
                        <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                        <span>{company.direccion}</span>
                     </div>
                 )}
                 {company.email && (
                     <div className="flex items-center gap-2">
                        <Mail size={16} className="text-gray-400 shrink-0" />
                        <a href={`mailto:${company.email}`} className="hover:text-indigo-600 hover:underline">{company.email}</a>
                     </div>
                 )}
                 {company.telefono && (
                     <div className="flex items-center gap-2">
                        <Phone size={16} className="text-gray-400 shrink-0" />
                        <span>{company.telefono}</span>
                     </div>
                 )}
                 {(!company.direccion && !company.email && !company.telefono) && (
                     <p className="text-gray-400 italic">Sin datos de contacto adicionales.</p>
                 )}
              </div>
            </Card>
          ))}
          
          {filteredCompanies.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
               <p className="text-gray-500">No se encontraron empresas.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit/Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Nombre Comercial" 
            placeholder="Ej. Tech Solutions Inc."
            value={formData.nombre} 
            onChange={e => setFormData({...formData, nombre: e.target.value})}
            required
          />
          <Input 
            type="email"
            label="Correo de Contacto" 
            placeholder="contacto@empresa.com"
            value={formData.email} 
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
          <Input 
            type="tel"
            label="Teléfono" 
            placeholder="+1 234 567 890"
            value={formData.telefono} 
            onChange={e => setFormData({...formData, telefono: e.target.value})}
          />
           <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Fiscal / Física</label>
            <textarea
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              rows={3}
              value={formData.direccion}
              onChange={e => setFormData({...formData, direccion: e.target.value})}
              placeholder="Calle, Número, Ciudad..."
            />
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Guardar Empresa</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal 
        isOpen={!!companyToDelete}
        onClose={() => setCompanyToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar Empresa"
        message="¿Estás seguro? Esta acción podría afectar a todos los proyectos y usuarios vinculados a esta empresa."
        confirmText="Eliminar"
        isLoading={isDeleteLoading}
      />
    </div>
  );
};