
import React, { useState } from 'react';
import { supabase, updateSupabaseClient, checkSupabaseConfig } from '../services/supabase';
import { Button, Input } from '../components/UI';
import { CheckCircle2, ArrowRight, LayoutDashboard, ShieldCheck, Zap } from 'lucide-react';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  
  // Setup state for demo purposes if env vars are missing
  const [needsSetup, setNeedsSetup] = useState(!checkSupabaseConfig());
  const [setupUrl, setSetupUrl] = useState('');
  const [setupKey, setSetupKey] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Registro exitoso! Revisa tu email para confirmar.');
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if(setupUrl && setupKey) {
        updateSupabaseClient(setupUrl, setupKey);
        setNeedsSetup(false);
    }
  };

  // --- VISTA DE CONFIGURACIÓN (Solo si faltan credenciales) ---
  if (needsSetup) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Configuración Inicial</h2>
            <p className="mt-2 text-sm text-gray-500">
             Ingresa tus credenciales de Supabase para conectar la demo.
            </p>
          </div>
          <form onSubmit={handleSetup} className="space-y-5">
            <Input label="Supabase URL" value={setupUrl} onChange={e => setSetupUrl(e.target.value)} placeholder="https://xyz.supabase.co" required />
            <Input label="Supabase Anon Key" value={setupKey} onChange={e => setSetupKey(e.target.value)} type="password" required />
            <Button type="submit" className="w-full h-11 text-base">Conectar Sistema</Button>
          </form>
        </div>
      </div>
    )
  }

  // --- VISTA PRINCIPAL (LOGIN / REGISTRO) ---
  return (
    <div className="min-h-screen flex bg-white font-sans">
      
      {/* SECCIÓN IZQUIERDA - FORMULARIO */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-20 relative">
        <div className="w-full max-w-sm space-y-8">
          
          {/* Header del Formulario */}
          <div className="text-center lg:text-left">
            <img 
              src="https://i.postimg.cc/dtrs3sSP/logo2-copia.png" 
              alt="Datenova Logo" 
              className="h-20 mx-auto lg:mx-0 mb-8 object-contain" 
            />
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {isLogin ? 'Bienvenido de nuevo' : 'Crear cuenta nueva'}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {isLogin 
                ? 'Ingresa tus credenciales para acceder al panel.' 
                : 'Comienza a gestionar tus proyectos hoy mismo.'}
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required
                  className="block w-full px-4 py-3 rounded-lg border border-gray-300 text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="ejemplo@empresa.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                className="block w-full px-4 py-3 rounded-lg border border-gray-300 text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full h-11 text-base shadow-lg shadow-primary-500/20" isLoading={loading}>
              {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          {/* Toggle Login/Registro */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              {isLogin ? '¿Aún no tienes cuenta?' : '¿Ya tienes una cuenta?'}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 font-semibold text-primary-600 hover:text-primary-500 transition-colors"
              >
                {isLogin ? 'Regístrate gratis' : 'Inicia sesión'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer simple */}
        <div className="absolute bottom-6 text-xs text-slate-400">
          © {new Date().getFullYear()} Datenova Systems. Todos los derechos reservados.
        </div>
      </div>

      {/* SECCIÓN DERECHA - BRANDING / VISUAL */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-16 text-white">
        
        {/* Decoración de Fondo (Círculos abstractos) */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

        <div className="relative z-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-slate-700 bg-slate-800/50 backdrop-blur-sm text-xs font-medium text-primary-300 mb-6">
            <Zap size={12} className="mr-2" />
            Nueva Versión 2.0 Disponible
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Transforma la gestión de tus <span className="text-primary-400">Servicios Tecnológicos</span>.
          </h1>
          <p className="text-slate-400 text-lg max-w-md">
            Un CRM avanzado diseñado para conectar empresas, asesores y desarrolladores en un solo flujo de trabajo eficiente.
          </p>
        </div>

        {/* Lista de Características */}
        <div className="relative z-10 space-y-6">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-800/40 backdrop-blur-sm border border-slate-700/50">
            <div className="p-2 bg-primary-500/20 rounded-lg text-primary-400">
              <LayoutDashboard size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-white">Gestión Centralizada</h3>
              <p className="text-sm text-slate-400">Control total sobre proyectos, órdenes de servicio y asignaciones.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-800/40 backdrop-blur-sm border border-slate-700/50">
            <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-white">Control Financiero</h3>
              <p className="text-sm text-slate-400">Monitoreo de horas, tarifas por rol y rentabilidad en tiempo real.</p>
            </div>
          </div>
        </div>

        {/* Testimonio / Footer Visual */}
        <div className="relative z-10 pt-8 border-t border-slate-800">
           <div className="flex items-center gap-2 mb-2">
             {[1,2,3,4,5].map(i => (
               <svg key={i} className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
             ))}
           </div>
           <p className="text-sm font-medium text-white">"La plataforma definitiva para escalar operaciones de servicios."</p>
        </div>
      </div>
    </div>
  );
};
