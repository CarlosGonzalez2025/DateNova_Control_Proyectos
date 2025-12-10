import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { Projects } from '../pages/Projects';
import { Tasks } from '../pages/Tasks';
import { TimeTracking } from '../pages/TimeTracking';
import { Users } from '../pages/Users';
import { Companies } from '../pages/Companies';
import { Deliverables } from '../pages/Deliverables';
import { Auth } from '../pages/Auth';
import { ActivateAccount } from '../pages/ActivateAccount';
import { Layout } from './Layout';

interface RouterProps {
  session: any;
  needsActivation: boolean;
  userRole: string;
  loading: boolean;
  userName: string;
}

const AppRouter: React.FC<RouterProps> = ({ session, needsActivation, userRole, loading, userName }) => {
  if (loading) {
    return <div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  if (!session) {
    return <Auth />;
  }

  if (needsActivation) {
    return <ActivateAccount />;
  }

  const router = createBrowserRouter([
    {
      path: "/",
      element: (
        <Layout userName={userName} userRole={userRole}>
          <Dashboard />
        </Layout>
      ),
    },
    {
      path: "/proyectos",
      element: (
        <Layout userName={userName} userRole={userRole}>
          <Projects />
        </Layout>
      ),
    },
    {
      path: "/tareas",
      element: (
        <Layout userName={userName} userRole={userRole}>
          <Tasks />
        </Layout>
      ),
    },
    {
      path: "/registro_horas",
      element: (
        <Layout userName={userName} userRole={userRole}>
          <TimeTracking currentUserId={session?.user?.id} />
        </Layout>
      ),
    },
    {
      path: "/entregables",
      element: (
        <Layout userName={userName} userRole={userRole}>
          <Deliverables />
        </Layout>
      ),
    },
    {
      path: "/empresas",
      element: (
        <Layout userName={userName} userRole={userRole}>
          <Companies />
        </Layout>
      ),
    },
    {
      path: "/usuarios",
      element: (
        <Layout userName={userName} userRole={userRole}>
          <Users />
        </Layout>
      ),
    },
    {
      path: "/auth",
      element: <Auth />,
    },
    {
      path: "/activate-account",
      element: <ActivateAccount />,
    },
    {
      path: "*",
      element: <Navigate to="/" />,
    }
  ]);

  return <RouterProvider router={router} />;
};

export default AppRouter;
