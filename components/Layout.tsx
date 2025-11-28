
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  CheckSquare, 
  Building2, 
  Users, 
  Clock, 
  LogOut,
  Menu,
  X,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Notification } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  userRole?: string;
  userName?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate, userRole, userName }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    setupRealtimeSubscription();

    // Close notifications when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      supabase.channel('notifications-channel').unsubscribe();
    };
  }, []);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
    }
  };

  const setupRealtimeSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          // Optional: Play a sound
        }
      )
      .subscribe();
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length === 0) return;

      await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Define Menu Items
  let navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'proyectos', label: 'Proyectos', icon: Briefcase },
    { id: 'tareas', label: 'Órdenes', icon: CheckSquare },
    { id: 'registro_horas', label: 'Tiempos', icon: Clock },
  ];

  if (userRole === 'superadmin' || userRole === 'asesor') {
      navItems.push({ id: 'empresas', label: 'Clientes', icon: Building2 });
  }

  if (userRole === 'superadmin') {
      navItems.push({ id: 'usuarios', label: 'Usuarios', icon: Users });
  }

  const getInitials = (name?: string) => name ? name.substring(0, 2).toUpperCase() : 'US';

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Desktop & Mobile */}
      <aside 
        className={`
            fixed lg:static inset-y-0 left-0 z-30 bg-slate-900 text-white transition-all duration-300 flex flex-col h-full
            ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
            ${sidebarOpen ? 'lg:w-64' : 'lg:w-20'}
        `}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
            {sidebarOpen ? (
                <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">D</div>
                    <span>Datenova</span>
                </div>
            ) : (
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mx-auto">D</div>
            )}
            <button 
                className="lg:hidden text-slate-400 hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
            >
                <X size={20} />
            </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-6 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                  ${!sidebarOpen && 'justify-center px-2'}
                `}
                title={!sidebarOpen ? item.label : ''}
              >
                <Icon size={20} className="shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-800">
           <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
              <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {getInitials(userName)}
              </div>
              {sidebarOpen && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">{userName}</p>
                  <p className="text-xs text-slate-500 truncate capitalize">{userRole}</p>
                </div>
              )}
              {sidebarOpen && (
                  <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors">
                      <LogOut size={16} />
                  </button>
              )}
           </div>
           {!sidebarOpen && (
               <div className="mt-4 flex justify-center">
                   <button onClick={handleLogout} className="text-slate-500 hover:text-red-400">
                       <LogOut size={18} />
                   </button>
               </div>
           )}
        </div>
        
        {/* Toggle Button for Desktop */}
        <button 
            className="hidden lg:flex absolute top-1/2 -right-3 w-6 h-6 bg-indigo-600 text-white rounded-full items-center justify-center shadow-md hover:bg-indigo-700 transition-colors z-40"
            onClick={() => setSidebarOpen(!sidebarOpen)}
        >
            {sidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Universal Header (Mobile & Desktop for Notifications) */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 lg:px-8 justify-between z-20 sticky top-0">
            <div className="flex items-center gap-3 lg:hidden">
                <button 
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                    onClick={() => setIsMobileMenuOpen(true)}
                >
                    <Menu size={24} />
                </button>
                <span className="font-bold text-gray-800">Datenova</span>
            </div>
            
            <div className="flex-1 hidden lg:block">
                 <h2 className="text-lg font-semibold text-gray-800 capitalize">{activePage.replace('_', ' ')}</h2>
            </div>

            <div className="flex items-center gap-4" ref={notificationRef}>
                {/* Notification Bell */}
                <div className="relative">
                    <button 
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors relative"
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                            <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="text-sm font-semibold text-gray-700">Notificaciones</h3>
                                {unreadCount > 0 && (
                                    <button 
                                        onClick={markAllAsRead} 
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                    >
                                        Marcar leídas
                                    </button>
                                )}
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map((notif) => (
                                        <div 
                                            key={notif.id} 
                                            className={`p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.read ? 'bg-indigo-50/50' : ''}`}
                                            onClick={() => {
                                                markAsRead(notif.id);
                                                if (notif.link) onNavigate(notif.link.replace('/', ''));
                                            }}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!notif.read ? 'bg-indigo-500' : 'bg-transparent'}`}></div>
                                                <div>
                                                    <p className={`text-sm ${!notif.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'}`}>
                                                        {notif.title}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1">
                                                        {new Date(notif.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-400 text-sm">
                                        No tienes notificaciones
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
             {children}
          </div>
        </div>
      </main>
    </div>
  );
};
