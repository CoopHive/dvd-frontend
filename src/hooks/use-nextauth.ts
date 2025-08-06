import { useSession, signOut } from 'next-auth/react';
import { useCallback } from 'react';

interface User {
  email: string;
}

interface NextAuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Hook that wraps NextAuth's useSession with the same interface as useJWTAuth
 * This provides a drop-in replacement for the custom JWT auth hook
 */
export function useNextAuth() {
  const { data: session, status } = useSession();
  
  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated' && !!session?.user?.email;
  const user = session?.user?.email ? { email: session.user.email } : null;

  const logout = useCallback(async (): Promise<void> => {
    try {
      await signOut({ redirect: false });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  // For compatibility with existing code, we'll keep the checkAuth method
  // but it's not needed with NextAuth since useSession handles this automatically
  const checkAuth = useCallback(async () => {
    // NextAuth handles this automatically, so this is a no-op
    console.log('🔄 NextAuth handles authentication checking automatically');
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    logout,
    checkAuth, // For compatibility
  } satisfies NextAuthState & { logout: () => Promise<void>; checkAuth: () => Promise<void> };
}