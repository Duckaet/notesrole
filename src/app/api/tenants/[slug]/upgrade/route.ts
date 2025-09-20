import { NextRequest } from 'next/server';
import { createApiResponse, createApiError, createForbiddenError } from '@/lib/api-response';
import { getUserContextFromToken } from '@/lib/jwt';
import { requirePermission } from '@/lib/authorization';
import { upgradeTenant, logSubscriptionEvent } from '@/lib/subscription';
import { prisma } from '@/lib/prisma';
import { Plan } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Get user context from JWT token
    const context = getUserContextFromToken(request);
    
    // Validate admin role for tenant upgrades
    try {
      requirePermission(context, 'UPGRADE_SUBSCRIPTION');
    } catch {
      return createForbiddenError();
    }

    // Get current tenant by slug
    const { slug } = await params;
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            users: true,
            notes: true,
          },
        },
      },
    });
    
    if (!tenant) {
      return createApiError('Tenant not found', 404);
    }

    // Validate that the user belongs to this tenant
    if (tenant.id !== context.tenantId) {
      console.log(`Upgrade attempt: User ${context.email} tried to upgrade tenant ${slug} but belongs to different tenant`);
      return createForbiddenError();
    }

    // Log upgrade request
    logSubscriptionEvent({
      tenantId: context.tenantId,
      userId: context.userId,
      event: 'upgrade_requested',
      metadata: {
        tenantSlug: slug,
        currentPlan: tenant.plan,
        requestedBy: context.email,
      },
    });

    // Attempt the upgrade
    try {
      const upgradeResult = await upgradeTenant(tenant.id);

      // Log successful upgrade
      logSubscriptionEvent({
        tenantId: context.tenantId,
        userId: context.userId,
        event: 'upgrade_completed',
        metadata: {
          tenantSlug: slug,
          oldPlan: upgradeResult.oldPlan,
          newPlan: upgradeResult.newPlan,
          benefits: upgradeResult.benefits,
        },
      });

      console.log(`Tenant upgrade successful: ${slug} (${tenant.name}) upgraded from ${upgradeResult.oldPlan} to ${upgradeResult.newPlan} by ${context.email}`);

      return createApiResponse({
        message: 'Tenant successfully upgraded to PRO plan',
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          plan: upgradeResult.newPlan,
        },
        upgrade: {
          from: upgradeResult.oldPlan,
          to: upgradeResult.newPlan,
          timestamp: upgradeResult.timestamp.toISOString(),
          upgradedBy: {
            userId: context.userId,
            email: context.email,
          },
          benefits: upgradeResult.benefits,
        },
        limits: {
          before: {
            notes: upgradeResult.oldPlan === 'FREE' ? 3 : Infinity,
            users: upgradeResult.oldPlan === 'FREE' ? 5 : Infinity,
          },
          after: {
            notes: 'unlimited',
            users: 'unlimited',
          },
        },
        currentUsage: {
          notes: tenant._count.notes,
          users: tenant._count.users,
        },
      }, 'Upgrade completed successfully');

    } catch (upgradeError) {
      console.error('Tenant upgrade error:', upgradeError);
      
      if (upgradeError instanceof Error) {
        if (upgradeError.message.includes('already on PRO plan')) {
          return createApiError('Tenant is already on PRO plan', 400);
        }
        return createApiError(upgradeError.message, 400);
      }
      
      return createApiError('Failed to upgrade tenant', 500);
    }

  } catch (error) {
    console.error('Upgrade endpoint error:', error);
    
    if (error instanceof Error && error.message.includes('Missing user context')) {
      return createApiError('Authentication required', 401);
    }
    
    return createApiError('Internal server error during upgrade', 500);
  }
}

// GET method to check upgrade eligibility
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Get user context from JWT token
    const context = getUserContextFromToken(request);
    
    // Get current tenant by slug
    const { slug } = await params;
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            users: true,
            notes: true,
          },
        },
      },
    });
    
    if (!tenant) {
      return createApiError('Tenant not found', 404);
    }

    // Validate that the user belongs to this tenant
    if (tenant.id !== context.tenantId) {
      return createForbiddenError();
    }

    const { canUpgradePlan, getPlanDisplayName } = await import('@/lib/subscription');
    const tenantPlan = tenant.plan as Plan;
    const canUpgrade = canUpgradePlan(tenantPlan);

    return createApiResponse({
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
        planDisplayName: getPlanDisplayName(tenantPlan),
      },
      upgrade: {
        eligible: canUpgrade,
        currentPlan: tenant.plan,
        targetPlan: canUpgrade ? 'PRO' : tenant.plan,
        reason: canUpgrade ? undefined : 'Tenant is already on the highest plan',
      },
      currentUsage: {
        notes: tenant._count.notes,
        users: tenant._count.users,
      },
      limits: {
        current: {
          notes: tenant.plan === 'FREE' ? 3 : 'unlimited',
          users: tenant.plan === 'FREE' ? 5 : 'unlimited',
        },
        afterUpgrade: {
          notes: 'unlimited',
          users: 'unlimited',
        },
      },
    });

  } catch (error) {
    console.error('Upgrade eligibility check error:', error);
    return createApiError('Failed to check upgrade eligibility', 500);
  }
}