import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import { ToastContainer } from './components/Toast';
import { Auth } from './pages/Auth';
import { ActivateAccount } from './pages/ActivateAccount';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Tasks } from './pages/Tasks';
import { TimeTracking } from './pages/TimeTracking';
import { Users } from './pages/Users';
import { Companies } from './pages/Companies';
import { Deliverables } from './pages/Deliverables';

const AppContent: React.FC = () => {
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
    <Layout
      userName={session.user.email}
      userRole={userRole}
    >
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/proyectos" element={<Projects />} />
        <Route path="/tareas" element={<Tasks />} />
        <Route path="/registro_horas" element={<TimeTracking currentUserId={session.user.id} />} />
        <Route path="/entregables" element={<Deliverables />} />
        <Route path="/empresas" element={<Companies />} />
        <Route path="/usuarios" element={<Users />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => (
  <Router>
    <ToastContainer />
    <AppContent />
  </Router>
);

export default App;