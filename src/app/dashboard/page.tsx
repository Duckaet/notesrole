/**
 * Notes Dashboard Component
 * 
 * Main dashboard for managing notes with CRUD operations,
 * subscription status display, and responsive design.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, useAuthenticatedFetch } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import InvitationManager from '@/components/InvitationManager';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    email: string;
    role: string;
  };
}

interface SubscriptionInfo {
  plan: string;
  notesUsed: number;
  notesLimit: number;
  notesRemaining: number;
}

export default function Notesdashboard() {
  const { user, tenant, logout } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination and search
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Tab state for admin users
  const [activeTab, setActiveTab] = useState<'notes' | 'invitations'>('notes');

  useEffect(() => {
    if (activeTab === 'notes') {
      loadNotes();
    }
  }, [currentPage, search, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(search && { search }),
      });

      const response = await authenticatedFetch(`/api/notes?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to load notes');
      }

      const data = await response.json();
      
      if (data.success) {
        setNotes(data.data.notes);
        setSubscription(data.data.subscription);
        setTotalPages(data.data.pagination.totalPages);
      } else {
        throw new Error(data.error || 'Failed to load notes');
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      setError(error instanceof Error ? error.message : 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    try {
      setIsSubmitting(true);
      setError('');

      const response = await authenticatedFetch('/api/notes', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Note created successfully!');
        setFormData({ title: '', content: '' });
        setShowCreateForm(false);
        loadNotes(); // Reload notes
      } else {
        throw new Error(data.error || 'Failed to create note');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !formData.title.trim() || !formData.content.trim()) return;

    try {
      setIsSubmitting(true);
      setError('');

      const response = await authenticatedFetch(`/api/notes/${editingNote.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Note updated successfully!');
        setEditingNote(null);
        setFormData({ title: '', content: '' });
        loadNotes(); // Reload notes
      } else {
        throw new Error(data.error || 'Failed to update note');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      setError('');

      const response = await authenticatedFetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Note deleted successfully!');
        loadNotes(); // Reload notes
      } else {
        throw new Error(data.error || 'Failed to delete note');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete note');
    }
  };

  const startEditNote = (note: Note) => {
    setEditingNote(note);
    setFormData({ title: note.title, content: note.content });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingNote(null);
    setFormData({ title: '', content: '' });
  };

  // Can create note logic: PRO plan = unlimited, FREE plan = check remaining
  const canCreateNote = subscription && (
    subscription.plan === 'PRO' || subscription.notesRemaining > 0
  );
  const canEditNote = (note: Note) => user && (user.role === 'ADMIN' || note.author.id === user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Notes Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                {tenant?.name} - {user?.role} - {subscription?.plan} Plan
              </p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Subscription Status */}
        {subscription && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Subscription Status</h2>
                <p className="text-sm text-gray-500">
                  {subscription.plan} Plan - {subscription.notesUsed}/{subscription.notesLimit === Infinity ? '∞' : subscription.notesLimit} notes used
                </p>
                {subscription.notesRemaining <= 0 && subscription.plan === 'FREE' && (
                  <p className="text-sm text-red-600 mt-1">
                    You&apos;ve reached your note limit. Upgrade to Pro for unlimited notes.
                  </p>
                )}
              </div>
              {subscription.plan === 'FREE' && user?.role === 'ADMIN' && (
                <button
                  onClick={() => router.push('/upgrade')}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Upgrade to Pro
                </button>
              )}
            </div>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${subscription.plan === 'PRO' ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{
                  width: subscription.notesLimit === Infinity 
                    ? '100%' 
                    : `${Math.min((subscription.notesUsed / subscription.notesLimit) * 100, 100)}%`
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Admin Tabs */}
        {user?.role === 'ADMIN' && (
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'notes'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Notes
                </button>
                <button
                  onClick={() => setActiveTab('invitations')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'invitations'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  User Invitations
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'invitations' && user?.role === 'ADMIN' ? (
          <InvitationManager />
        ) : (
          // Notes content (existing code)
          <div>
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

        {/* Create/Edit Form */}
        {(showCreateForm || editingNote) && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingNote ? 'Edit Note' : 'Create New Note'}
            </h3>
            <form onSubmit={editingNote ? handleUpdateNote : handleCreateNote} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  Content
                </label>
                <textarea
                  id="content"
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : (editingNote ? 'Update Note' : 'Create Note')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    cancelEdit();
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
          <div className="flex gap-3">
            {canCreateNote && !showCreateForm && !editingNote && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Note
              </button>
            )}
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Notes List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No notes found</p>
            {canCreateNote && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Create Your First Note
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{note.title}</h3>
                    <p className="text-gray-600 mt-2 whitespace-pre-wrap">{note.content}</p>
                    <div className="mt-4 text-sm text-gray-500">
                      <span>By {note.author.email}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      {note.updatedAt !== note.createdAt && (
                        <>
                          <span className="mx-2">•</span>
                          <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {canEditNote(note) && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => startEditNote(note)}
                        className="text-blue-600 hover:text-blue-700 px-3 py-1 rounded border border-blue-600 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-red-600 hover:text-red-700 px-3 py-1 rounded border border-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
          </div>
        )}
      </main>
    </div>
  );
}