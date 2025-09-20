import { Role } from '@/types';
import { NextRequest } from 'next/server';

export interface UserContext {
  userId: string;
  email: string;
  role: Role;
  tenantId: string;
  tenantSlug: string;
}

export function getUserContextFromHeaders(request: NextRequest): UserContext {
  const userId = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  const role = request.headers.get('x-user-role') as Role;
  const tenantId = request.headers.get('x-tenant-id');
  const tenantSlug = request.headers.get('x-tenant-slug');

  if (!userId || !email || !role || !tenantId || !tenantSlug) {
    throw new Error('Missing user context in request headers');
  }

  return {
    userId,
    email,
    role,
    tenantId,
    tenantSlug,
  };
}

export function requireAdmin(context: UserContext): void {
  if (context.role !== Role.ADMIN) {
    throw new Error('Admin role required for this action');
  }
}

export function requireMemberOrAdmin(context: UserContext): void {
  if (context.role !== Role.ADMIN && context.role !== Role.MEMBER) {
    throw new Error('Member or Admin role required for this action');
  }
}

export function canAccessResource(context: UserContext, resourceUserId: string): boolean {
  // Admins can access any resource within their tenant
  if (context.role === Role.ADMIN) {
    return true;
  }
  
  // Members can only access their own resources
  return context.userId === resourceUserId;
}

export function requireResourceAccess(context: UserContext, resourceUserId: string): void {
  if (!canAccessResource(context, resourceUserId)) {
    throw new Error('Insufficient permissions to access this resource');
  }
}

// Permissions matrix for different operations
export const PERMISSIONS = {
  // Note operations
  CREATE_NOTE: [Role.ADMIN, Role.MEMBER],
  READ_OWN_NOTES: [Role.ADMIN, Role.MEMBER],
  READ_ALL_NOTES: [Role.ADMIN], // Admin can read all notes in tenant
  UPDATE_OWN_NOTES: [Role.ADMIN, Role.MEMBER],
  UPDATE_ALL_NOTES: [Role.ADMIN], // Admin can update any note in tenant
  DELETE_OWN_NOTES: [Role.ADMIN, Role.MEMBER],
  DELETE_ALL_NOTES: [Role.ADMIN], // Admin can delete any note in tenant
  
  // User operations
  INVITE_USERS: [Role.ADMIN],
  LIST_USERS: [Role.ADMIN],
  UPDATE_USER_ROLES: [Role.ADMIN],
  DELETE_USERS: [Role.ADMIN],
  
  // Tenant operations
  UPGRADE_SUBSCRIPTION: [Role.ADMIN],
  VIEW_TENANT_STATS: [Role.ADMIN],
  MANAGE_TENANT_SETTINGS: [Role.ADMIN],
} as const satisfies Record<string, Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission] as Role[];
  return allowedRoles.some(allowedRole => allowedRole === role);
}

export function requirePermission(context: UserContext, permission: Permission): void {
  if (!hasPermission(context.role, permission)) {
    throw new Error(`Permission '${permission}' required. Current role: ${context.role}`);
  }
}

// Helper to check if user can perform action on specific resource
export function canPerformAction(
  context: UserContext, 
  permission: Permission, 
  resourceOwnerId?: string
): boolean {
  // Check if user has the base permission
  if (!hasPermission(context.role, permission)) {
    return false;
  }

  // If no resource owner specified, permission check is sufficient
  if (!resourceOwnerId) {
    return true;
  }

  // For resource-specific actions, check ownership unless admin
  if (context.role === Role.ADMIN) {
    return true; // Admins can perform actions on any resource in their tenant
  }

  // Members can only perform actions on their own resources
  return context.userId === resourceOwnerId;
}

export function requireAction(
  context: UserContext, 
  permission: Permission, 
  resourceOwnerId?: string
): void {
  if (!canPerformAction(context, permission, resourceOwnerId)) {
    const message = resourceOwnerId 
      ? `Cannot perform '${permission}' on resource owned by ${resourceOwnerId}`
      : `Permission '${permission}' required`;
    throw new Error(message);
  }
}