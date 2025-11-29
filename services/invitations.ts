import { supabase } from './supabase';
import { showSuccess, showError } from '../utils/notifications';

interface InvitationData {
  email: string;
  rol: string;
  empresa_id?: string;
  tarifa_hora?: number;
  billable_rate?: number;
}

/**
 * Sistema de invitaciones con Supabase Auth
 *
 * IMPORTANTE: Para que este sistema funcione completamente, necesitas configurar
 * los emails en Supabase Dashboard. Ver INVITATION_SETUP.md para instrucciones.
 */
export class InvitationService {

  /**
   * Crea una invitación y envía email automáticamente via Supabase
   *
   * MÉTODO 1: Usando signUp con auto-confirmación deshabilitada
   * Supabase enviará automáticamente un email de confirmación al usuario
   */
  static async inviteUser(data: InvitationData): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Guardar la invitación pendiente en nuestra tabla
      const { data: invitation, error: invError } = await supabase
        .from('invitations')
        .insert([{
          email: data.email,
          rol: data.rol,
          empresa_id: data.empresa_id || null,
          tarifa_hora: data.tarifa_hora || 0,
          billable_rate: data.billable_rate || 0,
          status: 'pending',
          invited_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (invError) {
        throw invError;
      }

      // 2. Crear usuario pre-registrado en Supabase Auth
      // El email de confirmación se envía automáticamente si está configurado
      const redirectUrl = `${window.location.origin}/activate-account`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: this.generateTemporaryPassword(), // Contraseña temporal que el usuario cambiará
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            invitation_id: invitation.id,
            rol: data.rol,
            empresa_id: data.empresa_id,
            invited: true
          }
        }
      });

      if (authError) {
        // Si falla la creación en Auth, eliminar la invitación
        await supabase.from('invitations').delete().eq('id', invitation.id);
        throw authError;
      }

      // 3. Actualizar invitación con user_id
      if (authData.user) {
        await supabase
          .from('invitations')
          .update({
            user_id: authData.user.id,
            status: 'sent'
          })
          .eq('id', invitation.id);
      }

      showSuccess(
        'Invitación Enviada',
        `Se ha enviado un email de invitación a ${data.email}. El usuario recibirá instrucciones para activar su cuenta.`
      );

      return { success: true };

    } catch (error: any) {
      console.error('Error inviting user:', error);

      let errorMessage = 'Error al enviar la invitación';

      if (error.message?.includes('already registered')) {
        errorMessage = 'Este email ya está registrado en el sistema';
      } else if (error.message?.includes('email')) {
        errorMessage = 'Error al enviar el email. Verifica la configuración de Supabase.';
      }

      showError('Error de Invitación', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Reenvía una invitación existente
   */
  static async resendInvitation(invitationId: string): Promise<{ success: boolean }> {
    try {
      const { data: invitation, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (error || !invitation) {
        throw new Error('Invitación no encontrada');
      }

      // Reenviar usando el mismo método
      return await this.inviteUser({
        email: invitation.email,
        rol: invitation.rol,
        empresa_id: invitation.empresa_id,
        tarifa_hora: invitation.tarifa_hora,
        billable_rate: invitation.billable_rate
      });

    } catch (error: any) {
      showError('Error', 'No se pudo reenviar la invitación');
      return { success: false };
    }
  }

  /**
   * Completa el proceso de invitación cuando el usuario se registra
   * Esta función se llama después de que el usuario confirma su email
   */
  static async completeInvitation(userId: string): Promise<void> {
    try {
      // Buscar la invitación pendiente para este usuario
      const { data: invitation } = await supabase
        .from('invitations')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'sent')
        .single();

      if (!invitation) {
        return;
      }

      // Crear el perfil del usuario en la tabla usuarios
      const { error: profileError } = await supabase
        .from('usuarios')
        .insert([{
          id: userId,
          email: invitation.email,
          nombre: invitation.email.split('@')[0], // Temporal, el usuario lo cambiará
          rol: invitation.rol,
          empresa_id: invitation.empresa_id,
          tarifa_hora: invitation.tarifa_hora || 0,
          billable_rate: invitation.billable_rate || 0,
          created_at: new Date().toISOString()
        }]);

      if (profileError && !profileError.message.includes('duplicate')) {
        throw profileError;
      }

      // Marcar invitación como aceptada
      await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

    } catch (error) {
      console.error('Error completing invitation:', error);
    }
  }

  /**
   * Cancela una invitación pendiente
   */
  static async cancelInvitation(invitationId: string): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      showSuccess('Invitación Cancelada', 'La invitación ha sido cancelada');
      return { success: true };

    } catch (error) {
      showError('Error', 'No se pudo cancelar la invitación');
      return { success: false };
    }
  }

  /**
   * Genera una contraseña temporal aleatoria
   * El usuario la cambiará al activar su cuenta
   */
  private static generateTemporaryPassword(): string {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  /**
   * Obtiene todas las invitaciones pendientes
   */
  static async getPendingInvitations() {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .in('status', ['pending', 'sent'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return [];
    }

    return data || [];
  }
}
