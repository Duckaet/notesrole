/**
 * Global Loading Component
 * 
 * Provides consistent loading states across the application
 * for authentication and other async operations.
 */

'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'purple' | 'gray' | 'white';
  className?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'blue',
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const colorClasses = {
    blue: 'border-blue-600',
    purple: 'border-purple-600',
    gray: 'border-gray-600',
    white: 'border-white',
  };

  return (
    <div 
      className={`animate-spin rounded-full border-2 border-t-transparent ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface FullPageLoadingProps {
  message?: string;
}

export function FullPageLoading({ message = 'Loading...' }: FullPageLoadingProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" color="purple" className="mx-auto" />
        <p className="mt-4 text-gray-600 text-lg">{message}</p>
      </div>
    </div>
  );
}

interface InlineLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function InlineLoading({ message = 'Loading...', size = 'md' }: InlineLoadingProps) {
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <LoadingSpinner size={size} color="purple" />
      <span className="text-gray-600">{message}</span>
    </div>
  );
}

interface ButtonLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export function ButtonWithLoading({
  isLoading,
  children,
  loadingText = 'Loading...',
  className = '',
  disabled = false,
  onClick,
  type = 'button',
}: ButtonLoadingProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`relative flex items-center justify-center gap-2 ${className} ${
        (disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {isLoading && (
        <LoadingSpinner size="sm" color="white" />
      )}
      <span>{isLoading ? loadingText : children}</span>
    </button>
  );
}

interface CardLoadingProps {
  message?: string;
  height?: string;
}

export function CardLoading({ message = 'Loading...', height = 'h-48' }: CardLoadingProps) {
  return (
    <div className={`bg-white rounded-lg shadow ${height} flex items-center justify-center`}>
      <div className="text-center">
        <LoadingSpinner size="md" color="purple" className="mx-auto" />
        <p className="mt-2 text-gray-600">{message}</p>
      </div>
    </div>
  );
}

// Loading skeleton for notes
export function NoteCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-lg shadow animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
      <div className="flex justify-between items-center">
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
        <div className="flex gap-2">
          <div className="h-8 bg-gray-200 rounded w-16"></div>
          <div className="h-8 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    </div>
  );
}

// Multiple note skeletons
export function NotesListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <NoteCardSkeleton key={index} />
      ))}
    </div>
  );
}