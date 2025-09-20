/**
 * Upgrade Page Component
 * 
 * Handles subscription upgrade from Free to Pro plan
 * with clear pricing information and upgrade workflow.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth, useAuthenticatedFetch } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface SubscriptionStatus {
  plan: string;
  notesUsed: number;
  notesLimit: number;
  notesRemaining: number;
  canUpgrade: boolean;
}

export default function UpgradePage() {
  const { user, tenant } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const router = useRouter();
  const hasLoadedRef = useRef(false);

  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Check if user is admin
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    // Only load once when we have required data and haven't loaded yet
    if (tenant?.slug && user && !hasLoadedRef.current) {
      hasLoadedRef.current = true; // Mark as loading to prevent duplicate calls
      
      const loadData = async () => {
        try {
          setIsLoading(true);
          setError('');

          const response = await authenticatedFetch(`/api/tenants/${tenant.slug}/upgrade`, {
            method: 'GET',
          });

          const data = await response.json();

          if (data.success) {
            setSubscriptionStatus({
              plan: data.data.tenant.plan,
              notesUsed: 0, // This would come from actual subscription data
              notesLimit: data.data.tenant.plan === 'PRO' ? Infinity : 3,
              notesRemaining: data.data.tenant.plan === 'PRO' ? Infinity : 3,
              canUpgrade: data.data.tenant.plan === 'FREE',
            });
          } else {
            throw new Error(data.error || 'Failed to load subscription status');
          }
        } catch (error) {
          console.error('Error loading subscription status:', error);
          setError(error instanceof Error ? error.message : 'Failed to load subscription status');
        } finally {
          setIsLoading(false);
        }
      };

      loadData();
    }
  }, []); // Empty dependency array - only run once

  // Separate function for manual reload (used after upgrade)
  const reloadSubscriptionStatus = async () => {
    if (!tenant?.slug) return;
    
    try {
      setIsLoading(true);
      setError('');

      const response = await authenticatedFetch(`/api/tenants/${tenant.slug}/upgrade`, {
        method: 'GET',
      });

      const data = await response.json();

      if (data.success) {
        setSubscriptionStatus({
          plan: data.data.tenant.plan,
          notesUsed: 0,
          notesLimit: data.data.tenant.plan === 'PRO' ? Infinity : 3,
          notesRemaining: data.data.tenant.plan === 'PRO' ? Infinity : 3,
          canUpgrade: data.data.tenant.plan === 'FREE',
        });
      } else {
        throw new Error(data.error || 'Failed to load subscription status');
      }
    } catch (error) {
      console.error('Error loading subscription status:', error);
      setError(error instanceof Error ? error.message : 'Failed to load subscription status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      setIsUpgrading(true);
      setError('');

      const response = await authenticatedFetch(`/api/tenants/${tenant?.slug}/upgrade`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Successfully upgraded to Pro plan! 🎉');
        // Reload subscription status
        setTimeout(() => {
          reloadSubscriptionStatus();
        }, 1000);
      } else {
        throw new Error(data.error || 'Upgrade failed');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      setError(error instanceof Error ? error.message : 'Upgrade failed');
    } finally {
      setIsUpgrading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                {tenant?.name} - Current Plan: {subscriptionStatus?.plan}
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <div className="text-sm text-green-600">{success}</div>
          </div>
        )}

        {/* Current Plan Status */}
        {subscriptionStatus && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Subscription</h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    subscriptionStatus.plan === 'PRO' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {subscriptionStatus.plan} Plan
                  </span>
                  {subscriptionStatus.plan === 'PRO' && (
                    <span className="text-green-600 font-medium">✓ Active</span>
                  )}
                </div>
                <p className="text-gray-600 mt-2">
                  {subscriptionStatus.plan === 'PRO' 
                    ? 'Unlimited notes and advanced features'
                    : `${subscriptionStatus.notesUsed}/${subscriptionStatus.notesLimit} notes used`
                  }
                </p>
              </div>
              {subscriptionStatus.plan === 'PRO' && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-600">$0/month</p>
                  <p className="text-sm text-gray-500">Demo pricing</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pricing Comparison */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Free Plan */}
          <div className={`bg-white rounded-lg shadow p-6 border-2 ${
            subscriptionStatus?.plan === 'FREE' ? 'border-blue-500' : 'border-gray-200'
          }`}>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900">Free Plan</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-500">/month</span>
              </div>
            </div>
            
            <ul className="mt-6 space-y-4">
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Up to 3 notes
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Basic note management
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Search functionality
              </li>
              <li className="flex items-center text-gray-400">
                <svg className="h-5 w-5 text-gray-300 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                No bulk operations
              </li>
            </ul>

            {subscriptionStatus?.plan === 'FREE' && (
              <div className="mt-6 text-center">
                <span className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                  Current Plan
                </span>
              </div>
            )}
          </div>

          {/* Pro Plan */}
          <div className={`bg-white rounded-lg shadow p-6 border-2 ${
            subscriptionStatus?.plan === 'PRO' ? 'border-purple-500' : 'border-purple-200'
          } relative`}>
            {subscriptionStatus?.canUpgrade && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Recommended
                </span>
              </div>
            )}

            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900">Pro Plan</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold text-purple-600">$0</span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Demo pricing - normally $19/month</p>
            </div>
            
            <ul className="mt-6 space-y-4">
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Unlimited notes
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Advanced search & filters
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Bulk import/export
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Priority support
              </li>
            </ul>

            <div className="mt-6">
              {subscriptionStatus?.plan === 'PRO' ? (
                <div className="text-center">
                  <span className="inline-block px-4 py-2 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium">
                    Current Plan
                  </span>
                </div>
              ) : subscriptionStatus?.canUpgrade ? (
                <button
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
                >
                  {isUpgrading ? 'Upgrading...' : 'Upgrade to Pro'}
                </button>
              ) : (
                <div className="text-center">
                  <span className="text-gray-500 text-sm">Upgrade not available</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-900">What happens to my existing notes when I upgrade?</h3>
              <p className="text-gray-600 mt-1">All your existing notes remain unchanged. You&apos;ll simply be able to create unlimited new notes.</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">Can I downgrade later?</h3>
              <p className="text-gray-600 mt-1">This is a demo application. In a real scenario, you could downgrade, but you&apos;d need to reduce your notes to 3 or fewer.</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">Is this a real payment?</h3>
              <p className="text-gray-600 mt-1">No, this is a demonstration. No actual payment is processed. The upgrade is instant and free for testing purposes.</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">Who can upgrade the subscription?</h3>
              <p className="text-gray-600 mt-1">Only tenant administrators can upgrade the subscription. This affects all users in your organization.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}