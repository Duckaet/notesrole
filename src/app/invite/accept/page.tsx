'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface InvitationData {
  email: string;
  role: string;
  tenantName: string;
  invitedBy: string;
  expiresAt: string;
}

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    const validateInvitation = async () => {
      try {
        const response = await fetch(`/api/users/invite/accept?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to validate invitation');
        }

        setInvitationData(data.invitation);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invitation');
      } finally {
        setLoading(false);
      }
    };

    validateInvitation();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitting(true);

    try {
      const response = await fetch('/api/users/invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          // Handle validation errors
          const errors: Record<string, string> = {};
          data.details.forEach((detail: { field: string; message: string }) => {
            errors[detail.field] = detail.message;
          });
          setFormErrors(errors);
        } else {
          throw new Error(data.error || 'Failed to accept invitation');
        }
        return;
      }

      setSuccess(true);
      
      // Redirect to login page after a delay
      setTimeout(() => {
        router.push('/login?message=Account created successfully. Please log in.');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="mt-6 text-xl font-medium text-gray-900">
              Validating invitation...
            </h2>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invitationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-red-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Invalid Invitation
            </h2>
            <p className="mt-2 text-sm text-red-600">
              {error || 'This invitation link is invalid or has expired.'}
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Return to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-green-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Account Created!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your account has been created successfully. You will be redirected to the login page shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Accept Invitation
          </h2>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900">Invitation Details</h3>
            <div className="mt-2 text-sm text-blue-800">
              <p><strong>Organization:</strong> {invitationData.tenantName}</p>
              <p><strong>Email:</strong> {invitationData.email}</p>
              <p><strong>Role:</strong> {invitationData.role}</p>
              <p><strong>Invited by:</strong> {invitationData.invitedBy}</p>
              <p><strong>Expires:</strong> {new Date(invitationData.expiresAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Create Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className={`mt-1 relative block w-full px-3 py-2 border ${
                  formErrors.password ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Enter your password"
              />
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`mt-1 relative block w-full px-3 py-2 border ${
                  formErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Confirm your password"
              />
              {formErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-500 text-sm font-medium"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}