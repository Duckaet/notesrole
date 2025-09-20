import { NextRequest } from 'next/server';
import { createApiResponse, createApiError } from '@/lib/api-response';
import { getCurrentUser, isTokenExpired, getTokenExpirationTime } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get token from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createApiError('No token provided', 401);
    }

    const token = authHeader.substring(7);
    
    // Check if token is expired
    if (isTokenExpired(token)) {
      return createApiError('Token has expired', 401);
    }

    // Get current user info
    const user = await getCurrentUser(request);
    
    if (!user) {
      return createApiError('Invalid token', 401);
    }

    // Get token expiration time
    const expirationTime = getTokenExpirationTime(token);

    return createApiResponse({
      message: 'Token is valid',
      valid: true,
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantSlug: user.tenantSlug,
      },
      token: {
        expiresAt: expirationTime?.toISOString(),
        isExpired: false,
      },
    });

  } catch (error) {
    console.error('Token validation error:', error);
    return createApiError('Token validation failed', 401);
  }
}