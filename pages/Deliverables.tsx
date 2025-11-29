import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Deliverable, DeliverableVersion, Tarea, Usuario } from '../types';
import { Button, Input, Select, Modal, Badge, ConfirmationModal } from '../components/UI';
import {
  Package, Upload, Download, CheckCircle, XCircle, Clock, FileText,
  Code, Image as ImageIcon, BookOpen, AlertCircle, ChevronDown, ChevronUp, History
} from 'lucide-react';
import { showSuccess, showError, handleSupabaseError } from '../utils/notifications';
import { validateForm, validationSchemas } from '../utils/validation';

export const Deliverables: React.FC = () => {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [tasks, setTasks] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [deliverableToDelete, setDeliverableToDelete] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tarea_id: '',
    tipo_entregable: 'Documento',
    fecha_entrega: ''
  });

  // Approval form
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComments, setApprovalComments] = useState('');

  // File upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Versions
  const [versions, setVersions] = useState<DeliverableVersion[]>([]);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTask, setFilterTask] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(userData as Usuario);
    }

    // Fetch deliverables with relations
    const { data: delivData, error: delivError } = await supabase
      .from('deliverables')
      .select(`
        *,
        tareas(nombre, proyecto_id, proyectos(nombre, empresas(nombre))),
        creador:creado_por(nombre),
        aprobador:aprobado_por(nombre)
      `)
      .order('created_at', { ascending: false });

    if (delivError) {
      handleSupabaseError(delivError);
    } else {
      setDeliverables(delivData as any);
    }

    // Fetch tasks for dropdown
    const { data: tasksData } = await supabase
      .from('tareas')
      .select('id, nombre, proyecto_id, proyectos(nombre)')
      .neq('estado', 'completada')
      .order('created_at', { ascending: false });

    if (tasksData) setTasks(tasksData as any);

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validation = validateForm(formData, validationSchemas.entregable());
    if (!validation.isValid) {
      showError('Error de validación', validation.errors[0].message);
      return;
    }

    if (!selectedFile) {
      showError('Error', 'Debes seleccionar un archivo para subir');
      return;
    }

    setLoading(true);

    try {
      // 1. Create deliverable record
      const { data: newDeliverable, error: createError } = await supabase
        .from('deliverables')
        .insert([{
          ...formData,
          creado_por: currentUser?.id,
          estado: 'Pendiente',
          fecha_entrega: formData.fecha_entrega || null
        }])
        .select()
        .single();

      if (createError) throw createError;

      // 2. Upload file to Supabase Storage
      const fileName = `${newDeliverable.id}/${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('deliverables')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // 3. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('deliverables')
        .getPublicUrl(fileName);

      // 4. Update deliverable with file info
      await supabase
        .from('deliverables')
        .update({
          archivo_url: publicUrl,
          archivo_nombre: selectedFile.name,
          archivo_tamano: selectedFile.size
        })
        .eq('id', newDeliverable.id);

      showSuccess('Entregable creado', 'El entregable se ha registrado correctamente');
      setIsCreateModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      handleSupabaseError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async () => {
    if (!selectedDeliverable) return;

    if (approvalAction === 'reject' && !approvalComments.trim()) {
      showError('Error', 'Debes proporcionar comentarios al rechazar un entregable');
      return;
    }

    setLoading(true);

    try {
      const updates: any = {
        estado: approvalAction === 'approve' ? 'Aprobado' : 'Rechazado',
        comentarios_cliente: approvalComments || null,
        aprobado_por: currentUser?.id
      };

      if (approvalAction === 'approve') {
        updates.fecha_aprobacion = new Date().toISOString();
      }

      const { error } = await supabase
        .from('deliverables')
        .update(updates)
        .eq('id', selectedDeliverable.id);

      if (error) throw error;

      showSuccess(
        approvalAction === 'approve' ? 'Entregable aprobado' : 'Entregable rechazado',
        approvalAction === 'approve'
          ? 'El entregable ha sido marcado como aprobado'
          : 'El equipo ha sido notificado de las correcciones necesarias'
      );

      setIsApprovalModalOpen(false);
      setApprovalComments('');
      fetchData();
    } catch (error) {
      handleSupabaseError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkForReview = async (deliverableId: string) => {
    try {
      const { error } = await supabase
        .from('deliverables')
        .update({ estado: 'En Revisión' })
        .eq('id', deliverableId);

      if (error) throw error;

      showSuccess('Enviado a revisión', 'El cliente ha sido notificado para revisar el entregable');
      fetchData();
    } catch (error) {
      handleSupabaseError(error);
    }
  };

  const handleDelete = async () => {
    if (!deliverableToDelete) return;

    setLoading(true);
    try {
      // Delete from storage first
      const deliverable = deliverables.find(d => d.id === deliverableToDelete);
      if (deliverable?.archivo_url) {
        const fileName = deliverable.archivo_url.split('/').pop();
        await supabase.storage.from('deliverables').remove([`${deliverableToDelete}/${fileName}`]);
      }

      // Delete from database
      const { error } = await supabase
        .from('deliverables')
        .delete()
        .eq('id', deliverableToDelete);

      if (error) throw error;

      showSuccess('Entregable eliminado', 'El entregable ha sido eliminado correctamente');
      setDeliverableToDelete(null);
      fetchData();
    } catch (error) {
      handleSupabaseError(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVersionHistory = async (deliverableId: string) => {
    const { data, error } = await supabase
      .from('deliverable_versions')
      .select('*, usuarios(nombre)')
      .eq('deliverable_id', deliverableId)
      .order('created_at', { ascending: false });

    if (error) {
      handleSupabaseError(error);
    } else {
      setVersions(data as any);
    }
  };

  const openApprovalModal = (deliverable: Deliverable, action: 'approve' | 'reject') => {
    setSelectedDeliverable(deliverable);
    setApprovalAction(action);
    setIsApprovalModalOpen(true);
  };

  const openVersionHistory = (deliverable: Deliverable) => {
    setSelectedDeliverable(deliverable);
    fetchVersionHistory(deliverable.id);
    setIsVersionHistoryOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      tarea_id: '',
      tipo_entregable: 'Documento',
      fecha_entrega: ''
    });
    setSelectedFile(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Código': return <Code size={20} />;
      case 'Diseño': return <ImageIcon size={20} />;
      case 'Manual': return <BookOpen size={20} />;
      default: return <FileText size={20} />;
    }
  };

  const getStatusBadge = (estado: string) => {
    const statusConfig = {
      'Pendiente': { color: 'gray' as const, icon: <Clock size={14} /> },
      'En Revisión': { color: 'blue' as const, icon: <AlertCircle size={14} /> },
      'Aprobado': { color: 'green' as const, icon: <CheckCircle size={14} /> },
      'Rechazado': { color: 'red' as const, icon: <XCircle size={14} /> },
      'En Corrección': { color: 'yellow' as const, icon: <AlertCircle size={14} /> }
    };

    const config = statusConfig[estado as keyof typeof statusConfig] || statusConfig['Pendiente'];

    return (
      <Badge color={config.color}>
        <span className="flex items-center gap-1">
          {config.icon}
          {estado}
        </span>
      </Badge>
    );
  };

  const filteredDeliverables = deliverables.filter(d => {
    const matchesStatus = filterStatus ? d.estado === filterStatus : true;
    const matchesTask = filterTask ? d.tarea_id === filterTask : true;
    return matchesStatus && matchesTask;
  });

  const isClient = currentUser?.rol === 'cliente';
  const canApprove = isClient;
  const canCreate = !isClient;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Entregables del Proyecto</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de documentos, código y archivos entregables con sistema de aprobación
          </p>
        </div>

        {canCreate && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Upload size={18} className="mr-2" /> Nuevo Entregable
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          options={[
            { value: '', label: 'Todos los estados' },
            { value: 'Pendiente', label: 'Pendiente' },
            { value: 'En Revisión', label: 'En Revisión' },
            { value: 'Aprobado', label: 'Aprobado' },
            { value: 'Rechazado', label: 'Rechazado' }
          ]}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="w-48"
        />

        <Select
          options={[
            { value: '', label: 'Todas las tareas' },
            ...tasks.map(t => ({ value: t.id, label: t.nombre }))
          ]}
          value={filterTask}
          onChange={e => setFilterTask(e.target.value)}
          className="w-64"
        />
      </div>

      {/* Deliverables Grid */}
      {loading && filteredDeliverables.length === 0 ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDeliverables.map(deliverable => (
            <DeliverableCard
              key={deliverable.id}
              deliverable={deliverable}
              isClient={isClient}
              canApprove={canApprove}
              onApprove={() => openApprovalModal(deliverable, 'approve')}
              onReject={() => openApprovalModal(deliverable, 'reject')}
              onMarkForReview={() => handleMarkForReview(deliverable.id)}
              onDelete={() => setDeliverableToDelete(deliverable.id)}
              onViewHistory={() => openVersionHistory(deliverable)}
              getTypeIcon={getTypeIcon}
              getStatusBadge={getStatusBadge}
            />
          ))}

          {filteredDeliverables.length === 0 && (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <Package className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-500">No se encontraron entregables</p>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Nuevo Entregable">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre del Entregable"
            value={formData.nombre}
            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="ej. Manual de usuario v1.0"
            required
          />

          <Select
            label="Tipo"
            options={[
              { value: 'Documento', label: 'Documento' },
              { value: 'Código', label: 'Código' },
              { value: 'Diseño', label: 'Diseño' },
              { value: 'Manual', label: 'Manual' },
              { value: 'Otro', label: 'Otro' }
            ]}
            value={formData.tipo_entregable}
            onChange={e => setFormData({ ...formData, tipo_entregable: e.target.value })}
          />

          <Select
            label="Tarea Asociada"
            options={[
              { value: '', label: 'Seleccionar tarea' },
              ...tasks.map(t => ({ value: t.id, label: t.nombre }))
            ]}
            value={formData.tarea_id}
            onChange={e => setFormData({ ...formData, tarea_id: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              value={formData.descripcion}
              onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripción detallada del entregable..."
            />
          </div>

          <Input
            type="date"
            label="Fecha de Entrega Estimada"
            value={formData.fecha_entrega}
            onChange={e => setFormData({ ...formData, fecha_entrega: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Archivo</label>
            <input
              type="file"
              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary-50 file:text-primary-700
                hover:file:bg-primary-100"
              required
            />
            {selectedFile && (
              <p className="text-xs text-gray-500 mt-1">
                Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={loading}>
              Crear Entregable
            </Button>
          </div>
        </form>
      </Modal>

      {/* Approval Modal */}
      <Modal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        title={approvalAction === 'approve' ? 'Aprobar Entregable' : 'Rechazar Entregable'}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {approvalAction === 'approve'
              ? '¿Confirmas que este entregable cumple con los requisitos y lo apruebas?'
              : 'Por favor indica las correcciones necesarias para este entregable.'}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comentarios {approvalAction === 'reject' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              rows={4}
              value={approvalComments}
              onChange={e => setApprovalComments(e.target.value)}
              placeholder={
                approvalAction === 'approve'
                  ? 'Comentarios opcionales...'
                  : 'Describe las correcciones necesarias...'
              }
              required={approvalAction === 'reject'}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsApprovalModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={approvalAction === 'approve' ? 'primary' : 'danger'}
              onClick={handleApproval}
              isLoading={loading}
            >
              {approvalAction === 'approve' ? 'Aprobar' : 'Rechazar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Version History Modal */}
      <Modal
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        title="Historial de Versiones"
      >
        <div className="space-y-3">
          {versions.length > 0 ? (
            versions.map(version => (
              <div key={version.id} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-sm">Versión {version.version}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(version.created_at).toLocaleString()}
                    </p>
                  </div>
                  <a
                    href={version.archivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-800"
                  >
                    <Download size={16} />
                  </a>
                </div>
                {version.notas_version && (
                  <p className="text-sm text-gray-600">{version.notas_version}</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">No hay versiones anteriores</p>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!deliverableToDelete}
        onClose={() => setDeliverableToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar Entregable"
        message="¿Estás seguro de eliminar este entregable? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        isLoading={loading}
      />
    </div>
  );
};

// Deliverable Card Component
interface DeliverableCardProps {
  deliverable: Deliverable;
  isClient: boolean;
  canApprove: boolean;
  onApprove: () => void;
  onReject: () => void;
  onMarkForReview: () => void;
  onDelete: () => void;
  onViewHistory: () => void;
  getTypeIcon: (type: string) => JSX.Element;
  getStatusBadge: (estado: string) => JSX.Element;
}

const DeliverableCard: React.FC<DeliverableCardProps> = ({
  deliverable,
  isClient,
  canApprove,
  onApprove,
  onReject,
  onMarkForReview,
  onDelete,
  onViewHistory,
  getTypeIcon,
  getStatusBadge
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-primary-50 text-primary-600 rounded-lg shrink-0">
            {getTypeIcon(deliverable.tipo_entregable)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{deliverable.nombre}</h3>
            <p className="text-xs text-gray-500">
              {/* @ts-ignore */}
              {deliverable.tareas?.proyectos?.nombre} • {deliverable.tareas?.nombre}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="mb-3">{getStatusBadge(deliverable.estado)}</div>

        {/* Description */}
        {deliverable.descripcion && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{deliverable.descripcion}</p>
        )}

        {/* Metadata */}
        <div className="text-xs text-gray-500 space-y-1 mb-4">
          <p>Versión: {deliverable.version}</p>
          {deliverable.fecha_entrega && (
            <p>Entrega: {new Date(deliverable.fecha_entrega).toLocaleDateString()}</p>
          )}
          {deliverable.archivo_tamano && (
            <p>Tamaño: {(deliverable.archivo_tamano / 1024).toFixed(2)} KB</p>
          )}
        </div>

        {/* Comments (if rejected) */}
        {deliverable.estado === 'Rechazado' && deliverable.comentarios_cliente && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-md">
            <p className="text-xs font-semibold text-red-900 mb-1">Comentarios del cliente:</p>
            <p className="text-xs text-red-700">{deliverable.comentarios_cliente}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {deliverable.archivo_url && (
            <a
              href={deliverable.archivo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded-md hover:bg-primary-100"
            >
              <Download size={14} className="mr-1" /> Descargar
            </a>
          )}

          {canApprove && deliverable.estado === 'En Revisión' && (
            <>
              <button
                onClick={onApprove}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100"
              >
                <CheckCircle size={14} className="mr-1" /> Aprobar
              </button>
              <button
                onClick={onReject}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
              >
                <XCircle size={14} className="mr-1" /> Rechazar
              </button>
            </>
          )}

          {!isClient && deliverable.estado === 'Pendiente' && (
            <button
              onClick={onMarkForReview}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
            >
              Enviar a Revisión
            </button>
          )}

          <button
            onClick={onViewHistory}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100"
          >
            <History size={14} className="mr-1" /> Historial
          </button>

          {!isClient && (
            <button
              onClick={onDelete}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 ml-auto"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
