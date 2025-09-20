'use client';

import { useState, useEffect } from 'react';
import { useAuth, useAuthenticatedFetch } from '@/contexts/AuthContext';

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  invitedBy: string;
}

interface InvitationResponse {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  tenantName: string;
  invitedBy: string;
  invitationToken: string;
  invitationLink: string;
}

export default function InvitationManager() {
  const { user } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    role: 'MEMBER'
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadInvitations();
    }
  }, [user]);

  const loadInvitations = async () => {
    try {
      const response = await authenticatedFetch('/api/users/invite');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load invitations');
      }

      setInvitations(data.invitations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await authenticatedFetch('/api/users/invite', {
        method: 'POST',
        body: JSON.stringify(formData),
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
          throw new Error(data.error || 'Failed to send invitation');
        }
        return;
      }

      const invitation: InvitationResponse = data.invitation;
      setSuccess(`Invitation sent to ${invitation.email}! Invitation link: ${invitation.invitationLink}`);
      setShowInviteForm(false);
      setFormData({ email: '', role: 'MEMBER' });
      
      // Reload invitations
      loadInvitations();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'PENDING':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'ACCEPTED':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'EXPIRED':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'CANCELLED':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">Only administrators can manage invitations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">User Invitations</h2>
        <button
          onClick={() => setShowInviteForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Invite User
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Invite New User</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    formErrors.email ? 'border-red-300' : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="user@example.com"
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Sending...' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteForm(false);
                    setFormData({ email: '', role: 'MEMBER' });
                    setFormErrors({});
                    setError('');
                  }}
                  className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invitations List */}
      <div className="bg-white rounded-lg border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading invitations...</p>
          </div>
        ) : invitations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No invitations found. Click &quot;Invite User&quot; to send your first invitation.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invited By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invitation.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invitation.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(invitation.status)}>
                        {invitation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invitation.invitedBy}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}