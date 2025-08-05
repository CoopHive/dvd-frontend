import { useState, useEffect, useCallback } from 'react';

interface User {
  email: string;
}

interface JWTAuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useJWTAuth() {
  const [state, setState] = useState<JWTAuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const validateToken = useCallback(async (): Promise<User | null> => {
    try {
      console.log('🔍 Validating access token...');
      const response = await fetch('/api/auth/validate', {
        method: 'GET',
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Access token valid for user:', data.email);
        return { email: data.email };
      }
      
      console.log('❌ Access token validation failed:', response.status);
      return null;
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<User | null> => {
    try {
      console.log('🔄 Attempting to refresh token...');
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Token refreshed successfully for user:', data.email);
        return { email: data.email };
      }
      
      console.log('❌ Token refresh failed:', response.status);
      return null;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const checkAuth = useCallback(async () => {
    console.log('🚀 Starting authentication check...');
    setState(prev => ({ ...prev, isLoading: true }));

    // First, try to validate the current access token
    let user = await validateToken();
    
    if (!user) {
      // If validation fails, try to refresh the token
      user = await refreshToken();
    }

    console.log('🎯 Final auth state:', { user: user?.email || 'none', isAuthenticated: !!user });
    setState({
      user,
      isLoading: false,
      isAuthenticated: !!user,
    });
  }, [validateToken, refreshToken]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...state,
    logout,
    checkAuth,
  };
}