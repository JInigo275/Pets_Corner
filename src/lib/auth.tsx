import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  loyalty_card_number: string | null;
  loyalty_points: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    setProfile(profileData);

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    const hasAdminRole = roleData?.some(r => r.role === 'admin') ?? false;
    setIsAdmin(hasAdminRole);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          setTimeout(() => fetchProfile(currentSession.user.id), 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName, ...(phone && { phone }) }
        }
      });
      if (error) {
        console.error('Sign up error:', error);
        const friendlyError = getFriendlyError(error.message);
        return { error: new Error(friendlyError) };
      }
      return { error: null };
    } catch (err) {
      console.error('Sign up exception:', err);
      const friendlyError = getFriendlyError((err as Error).message);
      return { error: new Error(friendlyError) };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Sign in error:', error);
        const friendlyError = getFriendlyError(error.message);
        return { error: new Error(friendlyError) };
      }
      return { error: null };
    } catch (err) {
      console.error('Sign in exception:', err);
      const friendlyError = getFriendlyError((err as Error).message);
      return { error: new Error(friendlyError) };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  };

  const getFriendlyError = (message: string): string => {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('rate') && lowerMsg.includes('exceed')) {
      return 'Email rate limit exceeded (1000/hour). Please wait 1 hour before trying again or contact support.';
    }
    if (lowerMsg.includes('too many requests') || lowerMsg.includes('limit')) {
      return 'Too many requests (1000 emails/hour). Please wait before trying again.';
    }
    if (lowerMsg.includes('email')) {
      return 'There was an issue with your email. Please check and try again.';
    }
    if (lowerMsg.includes('password')) {
      return 'Invalid password. Please try again.';
    }
    return message;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      isAdmin, 
      isLoading, 
      signUp, 
      signIn, 
      signOut,
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
