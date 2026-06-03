import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'assessor';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  roles: [],
  isAdmin: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);

  const fetchRoles = async (userId: string): Promise<AppRole[]> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[auth] fetchRoles', error);
      return [];
    }
    return (data || []).map(r => r.role as AppRole);
  };

  useEffect(() => {
    let mounted = true;

    const apply = async (s: Session | null) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Defer the network call so we don't block the auth callback,
        // but await it before clearing the loading flag so admin routes
        // see the correct role on first render.
        const r = await fetchRoles(s.user.id);
        if (!mounted) return;
        setRoles(r);
      } else {
        setRoles([]);
      }
      if (mounted) setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => { void apply(session); }
    );

    supabase.auth.getSession().then(({ data: { session } }) => { void apply(session); });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      roles,
      isAdmin: roles.includes('admin'),
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
