/**
 * Subscription Middleware
 * 
 * Provides middleware functions for enforcing subscription limits
 * and validating feature access based on tenant subscription plans.
 */

import { createApiError } from '@/lib/api-response';
import { getSubscriptionStatus, checkNoteLimit } from '@/lib/subscription';
import { Plan } from '@/types';

export interface SubscriptionContext {
  tenantId: string;
  plan: Plan;
  noteCount: number;
  canCreateNote: boolean;
  isProPlan: boolean;
}

/**
 * Middleware to check subscription limits before note creation
 */
export async function requireSubscriptionAccess(
  tenantId: string,
  action: 'CREATE_NOTE' | 'BULK_IMPORT' | 'ADVANCED_FEATURES'
): Promise<SubscriptionContext> {
  try {
    // Get tenant subscription status
    const subscriptionStatus = await getSubscriptionStatus(tenantId);
    
    if (!subscriptionStatus) {
      throw new Error('Tenant subscription not found');
    }

    const plan = subscriptionStatus.plan;
    const noteCount = subscriptionStatus.usage.currentNotes;
    // Fix: PRO plan has unlimited notes, FREE plan checks remaining
    const canCreateNote = plan === Plan.PRO || subscriptionStatus.remaining.notes > 0;
    
    // Check specific action permissions
    switch (action) {
      case 'CREATE_NOTE':
        if (!canCreateNote) {
          throw new Error(`Note limit reached. Free plan allows maximum 3 notes. Upgrade to Pro for unlimited notes.`);
        }
        break;
        
      case 'BULK_IMPORT':
        if (plan !== Plan.PRO) {
          throw new Error('Bulk import is only available for Pro plan subscribers');
        }
        break;
        
      case 'ADVANCED_FEATURES':
        if (plan !== Plan.PRO) {
          throw new Error('Advanced features are only available for Pro plan subscribers');
        }
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return {
      tenantId,
      plan,
      noteCount,
      canCreateNote,
      isProPlan: plan === Plan.PRO
    };
  } catch (error) {
    throw new Error(`Subscription access denied: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Middleware function to validate note creation limits
 */
export async function validateNoteCreation(tenantId: string): Promise<void> {
  const limitCheck = await checkNoteLimit(tenantId);
  
  if (!limitCheck.canCreate) {
    throw new Error(limitCheck.reason || 'Note creation limit reached. Upgrade to Pro plan for unlimited notes.');
  }
}

/**
 * Get subscription context for API routes
 */
export async function getSubscriptionContext(tenantId: string): Promise<SubscriptionContext> {
  const subscriptionStatus = await getSubscriptionStatus(tenantId);
  
  if (!subscriptionStatus) {
    throw new Error('Subscription status not found');
  }

  const plan = subscriptionStatus.plan;
  const noteCount = subscriptionStatus.usage.currentNotes;
  // Fix: PRO plan has unlimited notes, FREE plan checks remaining
  const canCreateNote = plan === Plan.PRO || subscriptionStatus.remaining.notes > 0;
  
  return {
    tenantId,
    plan,
    noteCount,
    canCreateNote,
    isProPlan: plan === Plan.PRO
  };
}

/**
 * Subscription headers for API responses
 */
export function addSubscriptionHeaders(
  context: SubscriptionContext,
  headers: Headers = new Headers()
): Headers {
  headers.set('X-Subscription-Plan', context.plan);
  headers.set('X-Note-Count', context.noteCount.toString());
  headers.set('X-Can-Create-Note', context.canCreateNote.toString());
  headers.set('X-Is-Pro-Plan', context.isProPlan.toString());
  
  return headers;
}

/**
 * Helper to create subscription error responses
 */
export function createSubscriptionError(message: string, statusCode: number = 403) {
  return createApiError(message, statusCode);
}