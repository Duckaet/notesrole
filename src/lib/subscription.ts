import { Plan } from '@/types';
import { prisma } from '@/lib/prisma';

export const SUBSCRIPTION_LIMITS = {
  FREE: {
    maxNotes: 3,
    maxUsers: 5,
    features: {
      basicNotes: true,
      advancedEditor: false,
      apiAccess: false,
      customIntegrations: false,
      prioritySupport: false,
    },
  },
  PRO: {
    maxNotes: Infinity,
    maxUsers: Infinity,
    features: {
      basicNotes: true,
      advancedEditor: true,
      apiAccess: true,
      customIntegrations: true,
      prioritySupport: true,
    },
  },
} as const;

export interface SubscriptionStatus {
  plan: Plan;
  limits: {
    maxNotes: number;
    maxUsers: number;
  };
  usage: {
    currentNotes: number;
    currentUsers: number;
  };
  remaining: {
    notes: number;
    users: number;
  };
  features: Record<string, boolean>;
  canUpgrade: boolean;
}

export function canCreateNote(plan: Plan, currentNoteCount: number): boolean {
  const limit = SUBSCRIPTION_LIMITS[plan].maxNotes;
  return currentNoteCount < limit;
}

export function canInviteUser(plan: Plan, currentUserCount: number): boolean {
  const limit = SUBSCRIPTION_LIMITS[plan].maxUsers;
  return currentUserCount < limit;
}

export function getRemainingNotes(plan: Plan, currentNoteCount: number): number {
  if (plan === Plan.PRO) {
    return Infinity;
  }
  const limit = SUBSCRIPTION_LIMITS[plan].maxNotes;
  return Math.max(0, limit - currentNoteCount);
}

export function getRemainingUsers(plan: Plan, currentUserCount: number): number {
  if (plan === Plan.PRO) {
    return Infinity;
  }
  const limit = SUBSCRIPTION_LIMITS[plan].maxUsers;
  return Math.max(0, limit - currentUserCount);
}

export function getPlanDisplayName(plan: Plan): string {
  return plan === Plan.FREE ? 'Free Plan' : 'Pro Plan';
}

export function canUpgradePlan(currentPlan: Plan): boolean {
  return currentPlan === Plan.FREE;
}

export function hasFeature(plan: Plan, feature: string): boolean {
  const planFeatures = SUBSCRIPTION_LIMITS[plan].features;
  return planFeatures[feature as keyof typeof planFeatures] || false;
}

export async function getSubscriptionStatus(tenantId: string): Promise<SubscriptionStatus> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      _count: {
        select: {
          notes: true,
          users: true,
        },
      },
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const plan = tenant.plan as Plan;
  const limits = SUBSCRIPTION_LIMITS[plan];
  
  const currentNotes = tenant._count.notes;
  const currentUsers = tenant._count.users;

  return {
    plan,
    limits: {
      maxNotes: limits.maxNotes,
      maxUsers: limits.maxUsers,
    },
    usage: {
      currentNotes,
      currentUsers,
    },
    remaining: {
      notes: getRemainingNotes(plan, currentNotes),
      users: getRemainingUsers(plan, currentUsers),
    },
    features: limits.features,
    canUpgrade: canUpgradePlan(plan),
  };
}

export async function checkNoteLimit(tenantId: string): Promise<{
  canCreate: boolean;
  reason?: string;
  currentCount: number;
  limit: number;
}> {
  const status = await getSubscriptionStatus(tenantId);
  
  const canCreate = canCreateNote(status.plan, status.usage.currentNotes);
  
  return {
    canCreate,
    reason: canCreate ? undefined : `Note limit reached. Current plan allows ${status.limits.maxNotes} notes.`,
    currentCount: status.usage.currentNotes,
    limit: status.limits.maxNotes,
  };
}

export async function checkUserLimit(tenantId: string): Promise<{
  canInvite: boolean;
  reason?: string;
  currentCount: number;
  limit: number;
}> {
  const status = await getSubscriptionStatus(tenantId);
  
  const canInvite = canInviteUser(status.plan, status.usage.currentUsers);
  
  return {
    canInvite,
    reason: canInvite ? undefined : `User limit reached. Current plan allows ${status.limits.maxUsers} users.`,
    currentCount: status.usage.currentUsers,
    limit: status.limits.maxUsers,
  };
}

export interface UpgradeResult {
  success: boolean;
  oldPlan: Plan;
  newPlan: Plan;
  timestamp: Date;
  benefits: {
    notesUnlocked: boolean;
    usersUnlocked: boolean;
    featuresUnlocked: string[];
  };
}

export async function upgradeTenant(tenantId: string): Promise<UpgradeResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const oldPlan = tenant.plan as Plan;
  
  if (oldPlan === Plan.PRO) {
    throw new Error('Tenant is already on PRO plan');
  }

  // Perform the upgrade
  const updatedTenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { plan: Plan.PRO },
  });

  const newFeatures = Object.entries(SUBSCRIPTION_LIMITS.PRO.features)
    .filter(([feature, enabled]) => enabled && !SUBSCRIPTION_LIMITS.FREE.features[feature as keyof typeof SUBSCRIPTION_LIMITS.FREE.features])
    .map(([feature]) => feature);

  return {
    success: true,
    oldPlan,
    newPlan: updatedTenant.plan as Plan,
    timestamp: new Date(),
    benefits: {
      notesUnlocked: SUBSCRIPTION_LIMITS.FREE.maxNotes < SUBSCRIPTION_LIMITS.PRO.maxNotes,
      usersUnlocked: SUBSCRIPTION_LIMITS.FREE.maxUsers < SUBSCRIPTION_LIMITS.PRO.maxUsers,
      featuresUnlocked: newFeatures,
    },
  };
}

// Subscription event types for logging/analytics
export type SubscriptionEvent = 
  | 'limit_reached'
  | 'upgrade_requested'
  | 'upgrade_completed'
  | 'feature_accessed'
  | 'limit_checked';

export interface SubscriptionEventData {
  tenantId: string;
  userId: string;
  event: SubscriptionEvent;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export function logSubscriptionEvent(data: Omit<SubscriptionEventData, 'timestamp'>): void {
  // In a production system, this would log to analytics/monitoring
  console.log(`[SUBSCRIPTION] ${data.event}:`, {
    ...data,
    timestamp: new Date().toISOString(),
  });
}