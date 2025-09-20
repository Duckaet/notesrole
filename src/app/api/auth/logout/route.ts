import { NextRequest } from 'next/server';
import { createApiResponse, createApiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get current user to validate token
    const user = await getCurrentUser(request);
    
    if (!user) {
      return createApiError('Not authenticated', 401);
    }

    console.log(`Logout successful for user: ${user.email}`);

    // For JWT tokens, logout is handled client-side by removing the token
    // In a more complex system, we might maintain a blacklist of invalidated tokens
    return createApiResponse({
      message: 'Logout successful',
      loggedOut: true,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Logout error:', error);
    return createApiError('Internal server error during logout', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Validate current session/token
    const user = await getCurrentUser(request);
    
    if (!user) {
      return createApiError('Invalid or expired token', 401);
    }

    return createApiResponse({
      message: 'Token is valid',
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantSlug: user.tenantSlug,
      },
      valid: true,
    });

  } catch (error) {
    console.error('Token validation error:', error);
    return createApiError('Internal server error during token validation', 500);
  }
}