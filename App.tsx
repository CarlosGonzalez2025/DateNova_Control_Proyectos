import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { ToastContainer } from './components/Toast';
import AppRouter from './components/Router';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [needsActivation, setNeedsActivation] = useState(false);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session) fetchUserRole(session.user.id);
        else setLoading(false);
      })
      .catch((err) => {
        console.warn("Error checking session:", err);
        setSession(null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (uid: string) => {
      const { data, error } = await supabase.from('usuarios').select('rol, nombre').eq('id', uid).single();

      // Si no existe el perfil en usuarios, significa que necesita activar su cuenta
      if (error || !data) {
        setNeedsActivation(true);
        setLoading(false);
        return;
      }

      setUserRole(data?.rol || 'cliente');
      setNeedsActivation(false);
      setLoading(false);
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  if (!session) {
    return <Auth />;
  }

  if (needsActivation) {
    return (
      <>
        <ToastContainer />
        <ActivateAccount />
      </>
    );
  }

  return (
    <>
      <ToastContainer />
      <AppRouter
        session={session}
        needsActivation={needsActivation}
        userRole={userRole}
        loading={loading}
        userName={session?.user?.email || ''}
      />
    </>
  );
};

export default App;