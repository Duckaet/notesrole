import { NextRequest } from 'next/server';
import { Plan } from '@/types';
import { checkNoteLimit, logSubscriptionEvent, SubscriptionEvent } from '@/lib/subscription';
import { getUserContextFromHeaders } from '@/lib/authorization';

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limit: number;
  planRequired?: Plan;
}

export class SubscriptionLimitEnforcer {
  
  /**
   * Check if user can create a note based on their tenant's subscription
   */
  static async checkNoteCreationLimit(request: NextRequest): Promise<LimitCheckResult> {
    try {
      const context = getUserContextFromHeaders(request);
      
      const limitCheck = await checkNoteLimit(context.tenantId);
      
      // Log the limit check event
      logSubscriptionEvent({
        tenantId: context.tenantId,
        userId: context.userId,
        event: 'limit_checked' as SubscriptionEvent,
        metadata: {
          resource: 'note',
          currentCount: limitCheck.currentCount,
          limit: limitCheck.limit,
          allowed: limitCheck.canCreate,
        },
      });

      if (!limitCheck.canCreate) {
        // Log limit reached event
        logSubscriptionEvent({
          tenantId: context.tenantId,
          userId: context.userId,
          event: 'limit_reached' as SubscriptionEvent,
          metadata: {
            resource: 'note',
            currentCount: limitCheck.currentCount,
            limit: limitCheck.limit,
          },
        });
      }

      return {
        allowed: limitCheck.canCreate,
        reason: limitCheck.reason,
        currentUsage: limitCheck.currentCount,
        limit: limitCheck.limit,
        planRequired: limitCheck.canCreate ? undefined : Plan.PRO,
      };

    } catch (error) {
      console.error('Error checking note creation limit:', error);
      return {
        allowed: false,
        reason: 'Unable to verify subscription limits',
        currentUsage: 0,
        limit: 0,
      };
    }
  }

  /**
   * Enforce note creation limits
   */
  static async enforceNoteCreationLimit(request: NextRequest): Promise<void> {
    const limitCheck = await this.checkNoteCreationLimit(request);
    
    if (!limitCheck.allowed) {
      throw new SubscriptionLimitError(
        limitCheck.reason || 'Note creation limit exceeded',
        'NOTE_LIMIT_EXCEEDED',
        {
          currentUsage: limitCheck.currentUsage,
          limit: limitCheck.limit,
          planRequired: limitCheck.planRequired,
        }
      );
    }
  }

  /**
   * Check if user can access a premium feature
   */
  static async checkFeatureAccess(
    request: NextRequest, 
    feature: string
  ): Promise<LimitCheckResult> {
    try {
      const context = getUserContextFromHeaders(request);
      
      // Get current subscription status (this would be cached in production)
      const { getSubscriptionStatus } = await import('@/lib/subscription');
      const status = await getSubscriptionStatus(context.tenantId);
      
      const hasAccess = status.features[feature] || false;

      // Log feature access attempt
      logSubscriptionEvent({
        tenantId: context.tenantId,
        userId: context.userId,
        event: 'feature_accessed' as SubscriptionEvent,
        metadata: {
          feature,
          hasAccess,
          plan: status.plan,
        },
      });

      return {
        allowed: hasAccess,
        reason: hasAccess ? undefined : `Feature '${feature}' requires PRO plan`,
        currentUsage: 0,
        limit: 1,
        planRequired: hasAccess ? undefined : Plan.PRO,
      };

    } catch (error) {
      console.error('Error checking feature access:', error);
      return {
        allowed: false,
        reason: 'Unable to verify feature access',
        currentUsage: 0,
        limit: 0,
      };
    }
  }

  /**
   * Enforce feature access limits
   */
  static async enforceFeatureAccess(request: NextRequest, feature: string): Promise<void> {
    const accessCheck = await this.checkFeatureAccess(request, feature);
    
    if (!accessCheck.allowed) {
      throw new SubscriptionLimitError(
        accessCheck.reason || `Feature '${feature}' not available`,
        'FEATURE_ACCESS_DENIED',
        {
          feature,
          planRequired: accessCheck.planRequired,
        }
      );
    }
  }

  /**
   * Get comprehensive limit status for a tenant
   */
  static async getLimitStatus(request: NextRequest) {
    try {
      const context = getUserContextFromHeaders(request);
      const { getSubscriptionStatus } = await import('@/lib/subscription');
      
      return await getSubscriptionStatus(context.tenantId);

    } catch (error) {
      console.error('Error getting limit status:', error);
      throw new Error('Unable to retrieve subscription status');
    }
  }
}

/**
 * Custom error class for subscription limit violations
 */
export class SubscriptionLimitError extends Error {
  public readonly code: string;
  public readonly metadata: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    metadata: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'SubscriptionLimitError';
    this.code = code;
    this.metadata = metadata;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      metadata: this.metadata,
    };
  }
}

/**
 * Middleware helper to check limits before processing requests
 */
export async function withSubscriptionLimits<T>(
  request: NextRequest,
  checks: Array<() => Promise<void>>,
  handler: () => Promise<T>
): Promise<T> {
  // Run all limit checks
  for (const check of checks) {
    await check();
  }
  
  // If all checks pass, execute the handler
  return handler();
}

/**
 * Common limit check functions for easy use
 */
export const LimitChecks = {
  noteCreation: (request: NextRequest) => 
    SubscriptionLimitEnforcer.enforceNoteCreationLimit(request),
    
  advancedEditor: (request: NextRequest) => 
    SubscriptionLimitEnforcer.enforceFeatureAccess(request, 'advancedEditor'),
    
  apiAccess: (request: NextRequest) => 
    SubscriptionLimitEnforcer.enforceFeatureAccess(request, 'apiAccess'),
    
  customIntegrations: (request: NextRequest) => 
    SubscriptionLimitEnforcer.enforceFeatureAccess(request, 'customIntegrations'),
};