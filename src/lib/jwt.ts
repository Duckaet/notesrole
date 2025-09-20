/**
 * JWT Token Utilities
 * 
 * Utilities for extracting and verifying JWT tokens directly in API routes
 */

import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { Role } from '@/types';

export interface JWTUser {
  userId: string;
  email: string;
  role: Role;
  tenantId: string;
  tenantSlug: string;
}

export function extractUserFromToken(request: NextRequest): JWTUser {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    throw new Error('Authentication token required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTUser;
    return decoded;
  } catch {
    throw new Error('Invalid or expired token');
  }
}

export function getUserContextFromToken(request: NextRequest) {
  const user = extractUserFromToken(request);
  return {
    userId: user.userId,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
  };
}