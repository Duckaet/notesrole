import { NextRequest } from 'next/server';

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  userRole: string;
}

export function getTenantContext(request: NextRequest): TenantContext {
  const tenantId = request.headers.get('x-tenant-id');
  const tenantSlug = request.headers.get('x-tenant-slug');
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  if (!tenantId || !tenantSlug || !userId || !userRole) {
    throw new Error('Missing tenant context in request headers');
  }

  return {
    tenantId,
    tenantSlug,
    userId,
    userRole,
  };
}

export function validateAdminRole(context: TenantContext): void {
  if (context.userRole !== 'ADMIN') {
    throw new Error('Admin role required');
  }
}

export function validateUserAccess(context: TenantContext, resourceUserId: string): void {
  // Users can only access their own resources unless they're admin
  if (context.userRole !== 'ADMIN' && context.userId !== resourceUserId) {
    throw new Error('Insufficient permissions to access resource');
  }
}