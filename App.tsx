import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Tasks } from './pages/Tasks';
import { TimeTracking } from './pages/TimeTracking';
import { Users } from './pages/Users';
import { Companies } from './pages/Companies';
import { Auth } from './pages/Auth';
import { Card } from './components/UI';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

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
      const { data } = await supabase.from('usuarios').select('rol').eq('id', uid).single();
      setUserRole(data?.rol || 'cliente');
      setLoading(false);
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  if (!session) {
    return <Auth />;
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
      case 'empresas':
        return <Companies />;
      case 'usuarios':
        return <Users />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout 
      activePage={currentPage} 
      onNavigate={setCurrentPage}
      userName={session.user.email}
      userRole={userRole} 
    >
      {renderPage()}
    </Layout>
  );
};

export default App;