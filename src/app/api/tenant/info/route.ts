import { NextRequest } from 'next/server';
import { createApiResponse, createApiError } from '@/lib/api-response';
import { getTenantContext } from '@/lib/tenant-context';
import { getRepositoryFromHeaders } from '@/lib/tenant-repository';

export async function GET(request: NextRequest) {
  try {
    // Get tenant context from middleware headers
    const context = getTenantContext(request);
    
    // Get tenant-aware repository
    const repository = getRepositoryFromHeaders(request.headers);
    
    // Get tenant information
    const tenant = await repository.getTenant();
    
    if (!tenant) {
      return createApiError('Tenant not found', 404);
    }

    // Get tenant statistics
    const [userCount, noteCount, remainingNotes] = await Promise.all([
      repository.listUsers().then(users => users.length),
      repository.countNotes(),
      repository.getRemainingNotes(),
    ]);

    return createApiResponse({
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
      },
      context: {
        userId: context.userId,
        userRole: context.userRole,
      },
      statistics: {
        users: userCount,
        notes: noteCount,
        remainingNotes: remainingNotes === Infinity ? 'unlimited' : remainingNotes,
      },
      isolation: {
        message: 'This data is completely isolated to your tenant',
        tenantId: context.tenantId,
      },
    });

  } catch (error) {
    console.error('Tenant info error:', error);
    return createApiError(
      error instanceof Error ? error.message : 'Failed to get tenant information',
      500
    );
  }
}