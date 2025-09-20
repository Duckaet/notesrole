/**
 * Login Page Component
 * 
 * Provides login interface with test account selection
 * for easy switching between different user roles and tenants.
 */

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

// Test accounts for development
const TEST_ACCOUNTS = {
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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTestAccount, setSelectedTestAccount] = useState('');

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAccountSelect = (accountKey: string) => {
    if (accountKey && TEST_ACCOUNTS[accountKey as keyof typeof TEST_ACCOUNTS]) {
      const account = TEST_ACCOUNTS[accountKey as keyof typeof TEST_ACCOUNTS];
      setEmail(account.email);
      setPassword(account.password);
      setSelectedTestAccount(accountKey);
    } else {
      setEmail('');
      setPassword('');
      setSelectedTestAccount('');
    }
  };

  const quickLogin = async (accountKey: keyof typeof TEST_ACCOUNTS) => {
    const account = TEST_ACCOUNTS[accountKey];
    setIsLoading(true);
    setError('');

    try {
      const result = await login(account.email, account.password);
      
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Notes App</h1>
          <p className="mt-2 text-sm text-gray-600">Multi-tenant SaaS Notes Application</p>
        </div>
        
        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Test Login</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => quickLogin('ACME_ADMIN')}
                disabled={isLoading}
                className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Acme Admin
              </button>
              <button
                onClick={() => quickLogin('ACME_MEMBER')}
                disabled={isLoading}
                className="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
              >
                Acme Member
              </button>
              <button
                onClick={() => quickLogin('GLOBEX_ADMIN')}
                disabled={isLoading}
                className="bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
              >
                Globex Admin
              </button>
              <button
                onClick={() => quickLogin('GLOBEX_MEMBER')}
                disabled={isLoading}
                className="bg-purple-500 text-white px-3 py-2 rounded text-sm hover:bg-purple-600 disabled:opacity-50"
              >
                Globex Member
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Or login manually</h3>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="text-sm text-red-600">{error}</div>
                </div>
              )}

              <div>
                <label htmlFor="testAccount" className="block text-sm font-medium text-gray-700">
                  Test Account
                </label>
                <select
                  id="testAccount"
                  value={selectedTestAccount}
                  onChange={(e) => handleTestAccountSelect(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a test account...</option>
                  <option value="ACME_ADMIN">Acme Admin (Free Plan)</option>
                  <option value="ACME_MEMBER">Acme Member (Free Plan)</option>
                  <option value="GLOBEX_ADMIN">Globex Admin (Pro Plan)</option>
                  <option value="GLOBEX_MEMBER">Globex Member (Pro Plan)</option>
                </select>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            <p className="font-medium mb-2">Test Account Details:</p>
            <ul className="space-y-1">
              <li><strong>Acme Corp:</strong> Free plan (3 notes max)</li>
              <li><strong>Globex Corp:</strong> Pro plan (unlimited notes)</li>
              <li><strong>Admin:</strong> Can manage all tenant notes</li>
              <li><strong>Member:</strong> Can only manage own notes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}