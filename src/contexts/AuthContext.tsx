/**
 * Authentication Context and State Management
 * 
 * Provides client-side authentication state management,
 * JWT token handling, and tenant context management.
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  tenantId: string;
  tenantSlug: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan: 'FREE' | 'PRO';
}

export interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Test accounts for easy development access
export const TEST_ACCOUNTS = {
  ACME_ADMIN: {
    email: 'admin@acme.test',
    password: 'password',
    name: 'Acme Admin',
    tenant: 'Acme Corp',
    plan: 'FREE' as const,
  },
  ACME_MEMBER: {
    email: 'user@acme.test',
    password: 'password',
    name: 'Acme User',
    tenant: 'Acme Corp',
    plan: 'FREE' as const,
  },
  GLOBEX_ADMIN: {
    email: 'admin@globex.test',
    password: 'password',
    name: 'Globex Admin',
    tenant: 'Globex Industries',
    plan: 'FREE' as const,
  },
  GLOBEX_MEMBER: {
    email: 'user@globex.test',
    password: 'password',
    name: 'Globex User',
    tenant: 'Globex Industries',
    plan: 'FREE' as const,
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    tenant: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('user_data');
        const tenantData = localStorage.getItem('tenant_data');

        if (token && userData && tenantData) {
          const user = JSON.parse(userData);
          const tenant = JSON.parse(tenantData);

          // Verify token is still valid
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            setAuthState({
              user,
              tenant,
              token,
              isLoading: false,
              isAuthenticated: true,
            });
            return;
          }
        }

        // Clear invalid auth data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('tenant_data');
      } catch (error) {
        console.error('Auth initialization error:', error);
      }

      setAuthState(prev => ({
        ...prev,
        isLoading: false,
      }));
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Login failed',
        };
      }

      const { token, user, tenant } = data.data;

      // Store auth data
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
      localStorage.setItem('tenant_data', JSON.stringify(tenant));

      setAuthState({
        user,
        tenant,
        token,
        isLoading: false,
        isAuthenticated: true,
      });

      return { success: true };
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('tenant_data');

    setAuthState({
      user: null,
      tenant: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });

    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const refreshAuth = async () => {
    // Implement token refresh if needed
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        refreshAuth,
      }}
    >
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

// Helper hook for authenticated API calls
export function useAuthenticatedFetch() {
  const { token, logout } = useAuth();

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    if (!token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Handle token expiration
    if (response.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    return response;
  };

  return authenticatedFetch;
}