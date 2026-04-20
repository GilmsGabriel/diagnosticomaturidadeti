import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Building2, FileQuestion, ClipboardCheck, LogOut, Shield,
  Menu, X, Users, ClipboardList, ShieldAlert, BarChart3, Compass, Wrench,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem { to: string; label: string; icon: typeof LayoutDashboard; }
interface NavGroup { title: string; subtitle: string; items: NavItem[]; }

const navGroups: NavGroup[] = [
  {
    title: 'Geral',
    subtitle: '',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/companies', label: 'Empresas', icon: Building2 },
    ],
  },
  {
    title: 'Governança (EDM)',
    subtitle: 'Avaliar · Dirigir · Monitorar',
    items: [
      { to: '/assessments', label: 'Avaliações', icon: ClipboardCheck },
      { to: '/questions', label: 'Banco de Questões', icon: FileQuestion },
      { to: '/risks', label: 'Riscos', icon: ShieldAlert },
    ],
  },
  {
    title: 'Gestão (APO · BAI · DSS · MEA)',
    subtitle: 'Alinhar · Construir · Operar · Monitorar',
    items: [
      { to: '/raci', label: 'Matriz RACI', icon: Users },
      { to: '/action-plans', label: 'Planos de Ação', icon: ClipboardList },
      { to: '/kpis', label: 'KPIs (MEA)', icon: BarChart3 },
    ],
  },
];

const groupIcon = (title: string) => {
  if (title.startsWith('Governança')) return Compass;
  if (title.startsWith('Gestão')) return Wrench;
  return null;
};

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200
        lg:relative lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-lg font-bold text-foreground">IT Maturity</h1>
                <p className="text-xs text-muted-foreground">COBIT · ITIL · ISO 27001</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
            {navGroups.map(group => {
              const GIcon = groupIcon(group.title);
              return (
                <div key={group.title}>
                  <div className="px-3 mb-2">
                    <div className="flex items-center gap-1.5">
                      {GIcon && <GIcon className="h-3 w-3 text-primary/70" />}
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                        {group.title}
                      </p>
                    </div>
                    {group.subtitle && (
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{group.subtitle}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    {group.items.map(item => {
                      const active = location.pathname.startsWith(item.to);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileOpen(false)}
                          className={`
                            flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
                            ${active
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                            }
                          `}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2 mb-3 px-3">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                {user?.email?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{user?.email}</p>
                {isAdmin && (
                  <span className="text-[10px] font-medium text-accent">Admin</span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <main className="flex-1 min-w-0">
        <header className="lg:hidden flex items-center gap-3 p-4 border-b border-border">
          <button onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">IT Maturity</span>
        </header>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
