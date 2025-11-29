import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Tasks } from './pages/Tasks';
import { TimeTracking } from './pages/TimeTracking';
import { Users } from './pages/Users';
import { Companies } from './pages/Companies';
import { Deliverables } from './pages/Deliverables';
import { Auth } from './pages/Auth';
import { ActivateAccount } from './pages/ActivateAccount';
import { ToastContainer } from './components/Toast';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
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

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'proyectos':
        return <Projects />;
      case 'tareas':
        return <Tasks />;
      case 'registro_horas':
        return <TimeTracking currentUserId={session.user.id} />;
      case 'entregables':
        return <Deliverables />;
      case 'empresas':
        return <Companies />;
      case 'usuarios':
        return <Users />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      <ToastContainer />
      <Layout
        activePage={currentPage}
        onNavigate={setCurrentPage}
        userName={session.user.email}
        userRole={userRole}
      >
        {renderPage()}
      </Layout>
    </>
  );
};

export default App;