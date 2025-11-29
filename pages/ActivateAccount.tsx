import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { InvitationService } from '../services/invitations';
import { showSuccess, showError } from '../utils/notifications';
import { Button, Input } from '../components/UI';
import { CheckCircle, Mail, Lock, User } from 'lucide-react';

export const ActivateAccount: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);

  useEffect(() => {
    checkInvitationFromToken();
  }, []);

  const checkInvitationFromToken = async () => {
    try {
      // Obtener el usuario actual de la sesión (después de click en email)
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email || '');

        // Buscar la invitación pendiente para este usuario
        const { data: invData } = await supabase
          .from('invitations')
          .select('*')
          .eq('email', user.email)
          .in('status', ['pending', 'sent'])
          .single();

        if (invData) {
          setInvitation(invData);
        }
      }
    } catch (error) {
      console.error('Error checking invitation:', error);
    }
  };

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showError('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (password.length < 8) {
      showError('Error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (!nombre.trim()) {
      showError('Error', 'Por favor ingresa tu nombre completo');
      return;
    }

    setIsActivating(true);

    try {
      // 1. Actualizar la contraseña del usuario
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password
      });

      if (passwordError) throw passwordError;

      // 2. Obtener el ID del usuario
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // 3. Completar el proceso de invitación (crear perfil en tabla usuarios)
      await InvitationService.completeInvitation(user.id);

      // 4. Actualizar el nombre del usuario
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ nombre: nombre.trim() })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating name:', updateError);
      }

      setIsActivated(true);
      showSuccess(
        '¡Cuenta Activada!',
        'Tu cuenta ha sido activada exitosamente. Redirigiendo al sistema...'
      );

      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (error: any) {
      console.error('Error activating account:', error);
      showError(
        'Error de Activación',
        error.message || 'No se pudo activar la cuenta. Por favor contacta al administrador.'
      );
    } finally {
      setIsActivating(false);
    }
  };

  if (isActivated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Cuenta Activada!</h2>
          <p className="text-gray-600 mb-4">
            Tu cuenta ha sido configurada exitosamente.
          </p>
          <p className="text-sm text-gray-500">
            Redirigiendo al sistema...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
            <span className="text-white text-2xl font-bold">D</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">¡Bienvenido a DateNova!</h1>
          <p className="text-gray-600">
            Activa tu cuenta para comenzar a trabajar
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {invitation && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Mail className="text-blue-600 mt-0.5" size={20} />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Has sido invitado como <span className="font-bold capitalize">{invitation.rol}</span>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Configura tu contraseña para activar tu cuenta
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleActivation} className="space-y-6">
            {/* Email (readonly) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="text-gray-400" size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Nombre Completo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-gray-400" size={18} />
                </div>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre completo"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Usa al menos 8 caracteres con letras y números
              </p>
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Contraseña *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={18} />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  required
                  minLength={8}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isActivating}
              className={`
                w-full py-3 px-4 rounded-lg font-medium text-white transition-all
                ${isActivating
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'
                }
              `}
            >
              {isActivating ? 'Activando cuenta...' : 'Activar mi Cuenta'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              ¿Tienes problemas?{' '}
              <a href="mailto:soporte@datenova.com" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Contacta a soporte
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
